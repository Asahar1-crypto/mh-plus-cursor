-- ================================================================
-- Fix: recurring templates incorrectly marked 'paid', cron in Israel TZ
-- (2026-05-03)
--
-- Three problems addressed:
--
-- 1. DATA: All 14 recurring templates had status='paid' because the
--    "close month" / "mark all paid" frontend flow was including
--    templates in its bulk update. Templates are not real expenses
--    and should never be 'paid'.
--
-- 2. FUNCTION: Migration 20260413125646 added
--    `AND status IN ('approved','pending')` to generate_recurring_expenses,
--    which silently excluded ALL the (incorrectly-) 'paid' templates.
--    From May 1 2026 onward, ZERO recurring instances were generated.
--
-- 3. TIMING: Cron ran at 00:01 UTC = 03:00 Israel time. We want it
--    to run right after midnight in the user's local (Israel) day
--    so a "billing day = 1" account gets its expenses on the morning
--    of the 1st in Israel time. New schedule: 22:01 UTC daily, with
--    today_day computed in Asia/Jerusalem TZ inside the function.
-- ================================================================

-- ── Step 1: Update enforce_expense_rules ────────────────────────
--   • Block templates from being marked 'paid' (root cause prevention)
--   • Allow one-way recovery: template paid → approved (data fix path)
CREATE OR REPLACE FUNCTION public.enforce_expense_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Super admins can do anything
  SELECT is_super_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF v_is_admin = true THEN
    RETURN NEW;
  END IF;

  -- Templates are not real expenses → cannot be 'paid'
  IF NEW.is_recurring = TRUE
     AND NEW.recurring_parent_id IS NULL
     AND NEW.status = 'paid'
     AND (OLD.status IS NULL OR OLD.status <> 'paid')
  THEN
    RAISE EXCEPTION 'recurring_template_cannot_be_paid'
      USING DETAIL = 'תבנית הוצאה חוזרת אינה הוצאה אמיתית ולא ניתן לסמן אותה כשולמה.';
  END IF;

  -- C3: Enforce valid status transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- SPECIAL CASE: recurring template edit (approved → pending with pending_changes)
    IF OLD.is_recurring = TRUE
       AND OLD.recurring_parent_id IS NULL
       AND OLD.status = 'approved'
       AND NEW.status = 'pending'
       AND NEW.pending_changes IS NOT NULL
       AND NEW.edited_by_id IS NOT NULL
    THEN
      RETURN NEW;
    END IF;

    -- SPECIAL CASE: recovery of accidentally-paid templates
    -- (one-way: paid → approved for templates only)
    IF OLD.is_recurring = TRUE
       AND OLD.recurring_parent_id IS NULL
       AND OLD.status = 'paid'
       AND NEW.status = 'approved'
    THEN
      RETURN NEW;
    END IF;

    IF NOT (
      (OLD.status = 'pending'  AND NEW.status = 'approved') OR
      (OLD.status = 'pending'  AND NEW.status = 'rejected') OR
      (OLD.status = 'approved' AND NEW.status = 'paid')     OR
      (OLD.status = 'rejected' AND NEW.status = 'pending')
    ) THEN
      RAISE EXCEPTION 'מעבר סטטוס לא חוקי: % → %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- SPECIAL CASE: rejection of template edit → rollback
  IF OLD.is_recurring = TRUE
     AND OLD.recurring_parent_id IS NULL
     AND OLD.status = 'pending'
     AND NEW.status = 'rejected'
     AND OLD.pending_changes IS NOT NULL
  THEN
    IF OLD.pending_changes ? 'amount' THEN
      NEW.amount := (OLD.pending_changes->>'amount')::numeric;
    END IF;
    IF OLD.pending_changes ? 'description' THEN
      NEW.description := OLD.pending_changes->>'description';
    END IF;
    IF OLD.pending_changes ? 'category' THEN
      NEW.category := OLD.pending_changes->>'category';
    END IF;
    IF OLD.pending_changes ? 'paid_by_id' THEN
      NEW.paid_by_id := (OLD.pending_changes->>'paid_by_id')::uuid;
    END IF;
    IF OLD.pending_changes ? 'split_equally' THEN
      NEW.split_equally := (OLD.pending_changes->>'split_equally')::boolean;
    END IF;
    NEW.status := 'approved';
    NEW.pending_changes := NULL;
    NEW.edited_by_id := NULL;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
    RETURN NEW;
  END IF;

  -- SPECIAL CASE: approval of template edit → clear pending_changes
  IF OLD.is_recurring = TRUE
     AND OLD.recurring_parent_id IS NULL
     AND OLD.status = 'pending'
     AND NEW.status = 'approved'
     AND OLD.pending_changes IS NOT NULL
  THEN
    NEW.pending_changes := NULL;
    NEW.edited_by_id := NULL;
    RETURN NEW;
  END IF;

  -- C4: Lock financial fields when expense is not pending
  IF OLD.status <> 'pending' THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      RAISE EXCEPTION 'לא ניתן לשנות סכום של הוצאה שכבר אושרה או שולמה';
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      RAISE EXCEPTION 'לא ניתן לשנות תיאור של הוצאה שכבר אושרה או שולמה';
    END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN
      RAISE EXCEPTION 'לא ניתן לשנות קטגוריה של הוצאה שכבר אושרה או שולמה';
    END IF;
    IF NEW.paid_by_id IS DISTINCT FROM OLD.paid_by_id THEN
      RAISE EXCEPTION 'לא ניתן לשנות משלם של הוצאה שכבר אושרה או שולמה';
    END IF;
    IF NEW.split_equally IS DISTINCT FROM OLD.split_equally THEN
      RAISE EXCEPTION 'לא ניתן לשנות פיצול של הוצאה שכבר אושרה או שולמה';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ── Step 2: Recover all accidentally-paid templates ─────────────
UPDATE public.expenses
SET status = 'approved'
WHERE is_recurring = TRUE
  AND recurring_parent_id IS NULL
  AND status = 'paid';

-- ── Step 3: Rebuild generate_recurring_expenses ─────────────────
--   • today_day computed in Asia/Jerusalem so cron and function agree
--   • status filter relaxed to "anything except rejected" (templates
--     can never be 'paid' anymore — guarded by the trigger above)
DROP FUNCTION IF EXISTS public.generate_recurring_expenses(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.generate_recurring_expenses(
  p_month INTEGER DEFAULT NULL,
  p_year  INTEGER DEFAULT NULL
)
RETURNS TABLE(generated INTEGER, skipped INTEGER, errors INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_backfill      BOOLEAN;
  v_today_il         DATE;
  v_today_day        INTEGER;
  v_target_month     INTEGER;
  v_target_year      INTEGER;
  v_cycle_start      DATE;
  v_cycle_end        DATE;

  v_account          RECORD;
  v_billing_day      INTEGER;
  v_last_day         INTEGER;
  v_effective_day    INTEGER;
  v_expense_date     DATE;

  v_expense          RECORD;
  v_exists           BOOLEAN;
  v_is_auto_approved BOOLEAN;
  v_approved_by      UUID;
  v_new_expense_id   UUID;

  v_amount_to_use    DECIMAL(10,2);
  v_base_idx         DECIMAL(10,5);
  v_curr_idx         DECIMAL(10,5);
  v_calc_period      TEXT;
  v_curr_amount      DECIMAL(15,5);

  v_description_to_use TEXT;
  v_category_to_use    TEXT;
  v_paid_by_to_use     UUID;
  v_split_equally_to_use BOOLEAN;
  v_created_by_to_use  UUID;

  v_total_generated  INTEGER := 0;
  v_total_skipped    INTEGER := 0;
  v_total_errors     INTEGER := 0;
BEGIN
  v_is_backfill := (p_month IS NOT NULL AND p_year IS NOT NULL);

  -- Use Asia/Jerusalem so the calendar day matches the user's local day
  v_today_il     := (NOW() AT TIME ZONE 'Asia/Jerusalem')::DATE;
  v_target_month := COALESCE(p_month, EXTRACT(MONTH FROM v_today_il)::INTEGER);
  v_target_year  := COALESCE(p_year,  EXTRACT(YEAR  FROM v_today_il)::INTEGER);
  v_today_day    := EXTRACT(DAY FROM v_today_il)::INTEGER;

  v_cycle_start := MAKE_DATE(v_target_year, v_target_month, 1);
  v_cycle_end   := v_cycle_start + INTERVAL '1 month';
  v_last_day    := EXTRACT(DAY FROM (v_cycle_start + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;

  FOR v_account IN
    SELECT id, COALESCE(billing_cycle_start_day, 1) AS billing_day
    FROM public.accounts
  LOOP
    v_billing_day   := v_account.billing_day;
    v_effective_day := LEAST(v_billing_day, v_last_day);
    v_expense_date  := MAKE_DATE(v_target_year, v_target_month, v_effective_day);

    -- Cron-mode filter: only run for accounts whose billing day is today
    IF NOT v_is_backfill AND v_today_day <> v_effective_day THEN
      CONTINUE;
    END IF;

    FOR v_expense IN
      SELECT *
      FROM public.expenses
      WHERE account_id          = v_account.id
        AND is_recurring        = TRUE
        AND recurring_parent_id IS NULL
        AND frequency           = 'monthly'
        AND (recurring_active IS NULL OR recurring_active = TRUE)
        AND (end_date IS NULL OR end_date >= v_expense_date)
        -- Templates can never be 'paid' (enforced by enforce_expense_rules).
        -- Skip 'rejected' as a safety guard.
        AND status <> 'rejected'
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE recurring_parent_id = v_expense.id
          AND date >= v_cycle_start AND date < v_cycle_end
      ) INTO v_exists;

      IF v_exists THEN
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;

      -- Pending edit? Use OLD values from pending_changes
      IF v_expense.status = 'pending' AND v_expense.pending_changes IS NOT NULL THEN
        v_description_to_use := COALESCE(v_expense.pending_changes->>'description', v_expense.description);
        v_category_to_use    := COALESCE(v_expense.pending_changes->>'category',    v_expense.category);
        v_paid_by_to_use     := COALESCE((v_expense.pending_changes->>'paid_by_id')::uuid,    v_expense.paid_by_id);
        v_split_equally_to_use := COALESCE((v_expense.pending_changes->>'split_equally')::boolean, v_expense.split_equally);
        v_created_by_to_use  := v_expense.created_by_id;
      ELSE
        v_description_to_use := v_expense.description;
        v_category_to_use    := v_expense.category;
        v_paid_by_to_use     := v_expense.paid_by_id;
        v_split_equally_to_use := v_expense.split_equally;
        v_created_by_to_use  := v_expense.created_by_id;
      END IF;

      -- Amount: pending_changes > CPI > fixed
      IF v_expense.status = 'pending' AND v_expense.pending_changes IS NOT NULL
         AND v_expense.pending_changes ? 'amount'
      THEN
        v_amount_to_use := (v_expense.pending_changes->>'amount')::numeric;
      ELSIF (v_expense.is_index_linked = TRUE)
         AND v_expense.base_amount IS NOT NULL
         AND v_expense.base_index_period IS NOT NULL
      THEN
        IF v_expense.index_update_frequency = 'quarterly' THEN
          v_calc_period := v_target_year || '-' ||
            LPAD((((v_target_month - 1) / 3 + 1) * 3)::TEXT, 2, '0');
        ELSIF v_expense.index_update_frequency = 'yearly' THEN
          v_calc_period := v_target_year || '-12';
        ELSE
          v_calc_period := v_target_year || '-' || LPAD(v_target_month::TEXT, 2, '0');
        END IF;

        SELECT index_value INTO v_base_idx FROM public.cpi_history WHERE period = v_expense.base_index_period;
        SELECT index_value INTO v_curr_idx FROM public.cpi_history WHERE period = v_calc_period;

        IF v_base_idx IS NOT NULL AND v_base_idx > 0 AND v_curr_idx IS NOT NULL THEN
          v_curr_amount := (v_expense.base_amount * v_curr_idx / v_base_idx)::DECIMAL(15,5);
          IF (v_expense.floor_enabled IS NULL OR v_expense.floor_enabled = TRUE) THEN
            v_curr_amount := GREATEST(v_curr_amount, v_expense.base_amount);
          END IF;
          v_amount_to_use := ROUND(v_curr_amount, 2);
        ELSE
          v_amount_to_use := COALESCE(v_expense.last_calculated_amount, v_expense.base_amount, v_expense.amount);
        END IF;
      ELSE
        v_amount_to_use := v_expense.amount;
      END IF;

      -- Auto-approval
      IF v_expense.recurring_auto_approved = TRUE AND v_expense.recurring_approved_by IS NOT NULL THEN
        v_is_auto_approved := TRUE;
        v_approved_by      := v_expense.recurring_approved_by;
      ELSIF v_paid_by_to_use = v_created_by_to_use THEN
        v_is_auto_approved := TRUE;
        v_approved_by      := v_created_by_to_use;
      ELSE
        v_is_auto_approved := FALSE;
        v_approved_by      := NULL;
      END IF;

      BEGIN
        INSERT INTO public.expenses (
          account_id, amount, description, date, category,
          paid_by_id, created_by_id, status, split_equally,
          has_end_date, end_date, is_recurring, frequency,
          recurring_parent_id, approved_by, approved_at
        ) VALUES (
          v_expense.account_id, v_amount_to_use,
          v_description_to_use || ' (חודשי)', v_expense_date, v_category_to_use,
          v_paid_by_to_use, v_created_by_to_use,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END,
          v_split_equally_to_use, FALSE, NULL, FALSE, NULL,
          v_expense.id, v_approved_by,
          CASE WHEN v_is_auto_approved THEN NOW() ELSE NULL END
        )
        RETURNING id INTO v_new_expense_id;

        INSERT INTO public.expense_children (expense_id, child_id)
        SELECT v_new_expense_id, child_id
        FROM public.expense_children WHERE expense_id = v_expense.id;

        IF v_expense.is_index_linked = TRUE AND v_amount_to_use IS NOT NULL THEN
          UPDATE public.expenses SET last_calculated_amount = v_amount_to_use WHERE id = v_expense.id;
        END IF;

        v_total_generated := v_total_generated + 1;
      EXCEPTION WHEN OTHERS THEN
        v_total_errors := v_total_errors + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_total_generated, v_total_skipped, v_total_errors;
END;
$$;

-- ── Step 4: Reschedule cron to start of Israel-local day ────────
-- 22:01 UTC = 00:01 Israel winter (UTC+2) / 01:01 Israel summer (UTC+3).
-- Combined with today_day computed in Asia/Jerusalem, the function
-- always sees the new Israel calendar day right after midnight.
SELECT cron.unschedule('generate-monthly-recurring-expenses');

SELECT cron.schedule(
  'generate-monthly-recurring-expenses',
  '1 22 * * *',
  $cron$SELECT public.generate_recurring_expenses()$cron$
);
