-- ================================================================
-- Feature: Editable recurring expense templates with approval flow
-- (2026-04-13)
--
-- When a user edits a recurring template that is already approved:
--   1. The old values are saved in pending_changes (JSONB)
--   2. The template goes back to 'pending' status
--   3. The other user must approve or reject the changes
--   4. On approval: pending_changes is cleared, new values stick
--   5. On rejection: old values are restored (rollback), status → approved
--   6. While pending, the cron uses the OLD values from pending_changes
-- ================================================================

-- Step 1: Add new columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS pending_changes JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS edited_by_id UUID REFERENCES auth.users(id) DEFAULT NULL;

COMMENT ON COLUMN public.expenses.pending_changes IS
  'Stores the original field values before a template edit, used for rollback on rejection';
COMMENT ON COLUMN public.expenses.edited_by_id IS
  'The user who last edited this template (for self-approval check on edits)';

-- Step 2: Update enforce_expense_rules trigger to allow template edits
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
      -- Allow this transition - template edit flow
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
    -- Restore original values from pending_changes
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
    -- Restore to approved state
    NEW.status := 'approved';
    NEW.pending_changes := NULL;
    NEW.edited_by_id := NULL;
    -- Keep the original approval info
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
  -- EXCEPTION: when transitioning approved→pending for template edit (handled above)
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

-- Step 3: Update self-approval trigger to check edited_by_id
CREATE OR REPLACE FUNCTION public.check_expense_self_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_slug TEXT;
  v_initiator UUID;
BEGIN
  -- Only enforce when status is transitioning TO 'approved'
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN

    -- Personal-plan accounts are single-user; self-approval is intentional there
    SELECT plan_slug INTO v_plan_slug
    FROM public.accounts
    WHERE id = NEW.account_id;

    IF v_plan_slug IS DISTINCT FROM 'personal' THEN
      -- Determine who initiated: if this is a template edit, use edited_by_id
      -- Otherwise use created_by_id (the original creator)
      v_initiator := COALESCE(NEW.edited_by_id, NEW.created_by_id);

      IF NEW.approved_by IS NOT NULL AND NEW.approved_by = v_initiator THEN
        RAISE EXCEPTION 'self_approval_not_allowed'
          USING DETAIL = 'A user cannot approve an expense they created or edited.',
                HINT   = 'Have the other account member approve this expense.';
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Step 4: Update generate_recurring_expenses to handle pending templates
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

  -- CPI linking
  v_amount_to_use    DECIMAL(10,2);
  v_base_idx         DECIMAL(10,5);
  v_curr_idx         DECIMAL(10,5);
  v_calc_period      TEXT;
  v_curr_amount      DECIMAL(15,5);

  -- Template edit support
  v_description_to_use TEXT;
  v_category_to_use    TEXT;
  v_paid_by_to_use     UUID;
  v_split_equally_to_use BOOLEAN;
  v_created_by_to_use  UUID;

  v_total_generated  INTEGER := 0;
  v_total_skipped   INTEGER := 0;
  v_total_errors    INTEGER := 0;
BEGIN
  v_is_backfill  := (p_month IS NOT NULL AND p_year IS NOT NULL);
  v_target_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  v_target_year  := COALESCE(p_year,  EXTRACT(YEAR  FROM CURRENT_DATE)::INTEGER);
  v_today_day    := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

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
        -- Include both approved AND pending templates (pending = edit awaiting approval)
        AND status IN ('approved', 'pending')
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

      -- ── Determine field values ─────────────────────────────────
      -- If template is pending with pending_changes, use the OLD values
      IF v_expense.status = 'pending' AND v_expense.pending_changes IS NOT NULL THEN
        v_description_to_use := COALESCE(
          v_expense.pending_changes->>'description', v_expense.description);
        v_category_to_use := COALESCE(
          v_expense.pending_changes->>'category', v_expense.category);
        v_paid_by_to_use := COALESCE(
          (v_expense.pending_changes->>'paid_by_id')::uuid, v_expense.paid_by_id);
        v_split_equally_to_use := COALESCE(
          (v_expense.pending_changes->>'split_equally')::boolean, v_expense.split_equally);
        v_created_by_to_use := v_expense.created_by_id;
      ELSE
        v_description_to_use := v_expense.description;
        v_category_to_use := v_expense.category;
        v_paid_by_to_use := v_expense.paid_by_id;
        v_split_equally_to_use := v_expense.split_equally;
        v_created_by_to_use := v_expense.created_by_id;
      END IF;

      -- ── Determine amount (CPI or fixed) ─────────────────────────
      IF v_expense.status = 'pending' AND v_expense.pending_changes IS NOT NULL
         AND v_expense.pending_changes ? 'amount'
      THEN
        -- Use the OLD amount from pending_changes
        v_amount_to_use := (v_expense.pending_changes->>'amount')::numeric;
      ELSIF (v_expense.is_index_linked = TRUE)
         AND v_expense.base_amount IS NOT NULL
         AND v_expense.base_index_period IS NOT NULL
      THEN
        -- Resolve current period by index_update_frequency
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
