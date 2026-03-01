-- ================================================================
-- Recurring expenses: daily cron keyed to each account's billing day
-- (2026-03-01)
--
-- Design flaw fixed:
--   The previous cron ran on the 1st of every month and generated
--   expenses for ALL accounts on that day, regardless of their
--   billing_cycle_start_day. A family with billing_day=10 should
--   get their expenses on the 10th, not the 1st.
--
-- New design:
--   • Cron runs DAILY at 06:00 UTC.
--   • In "cron mode" (no params): only processes accounts whose
--     effective billing day equals today's day-of-month.
--   • In "backfill mode" (p_month + p_year provided): processes
--     ALL accounts for that month (admin / manual recovery).
--   • End-of-month clamping: billing_day=31 in February → runs
--     on the 28th (or 29th in a leap year).
-- ================================================================

-- ── Step 1: Drop existing function (all known signatures) ────────
DROP FUNCTION IF EXISTS public.generate_recurring_expenses(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.generate_recurring_expenses();

-- ── Step 2: Create the new function ─────────────────────────────
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

  v_total_generated  INTEGER := 0;
  v_total_skipped    INTEGER := 0;
  v_total_errors     INTEGER := 0;
BEGIN
  -- ── Determine mode ───────────────────────────────────────────────
  -- Backfill mode: both p_month and p_year are supplied (admin UI).
  -- Cron mode:     called without arguments → only run for accounts
  --                whose billing day matches today.
  v_is_backfill  := (p_month IS NOT NULL AND p_year IS NOT NULL);
  v_target_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  v_target_year  := COALESCE(p_year,  EXTRACT(YEAR  FROM CURRENT_DATE)::INTEGER);
  v_today_day    := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

  -- Calendar-month window for duplicate detection
  v_cycle_start := MAKE_DATE(v_target_year, v_target_month, 1);
  v_cycle_end   := v_cycle_start + INTERVAL '1 month';

  -- Last calendar day of the target month (for end-of-month clamping)
  v_last_day := EXTRACT(
                  DAY FROM (v_cycle_start + INTERVAL '1 month' - INTERVAL '1 day')
                )::INTEGER;

  RAISE NOTICE 'generate_recurring_expenses: mode=%, target=%/%, today_day=%',
    CASE WHEN v_is_backfill THEN 'backfill' ELSE 'cron' END,
    v_target_month, v_target_year, v_today_day;

  -- ── Loop over every account ──────────────────────────────────────
  FOR v_account IN
    SELECT id, COALESCE(billing_cycle_start_day, 1) AS billing_day
    FROM public.accounts
  LOOP
    v_billing_day   := v_account.billing_day;
    -- Clamp: billing_day=31 in Feb → 28/29; billing_day=31 in Apr → 30
    v_effective_day := LEAST(v_billing_day, v_last_day);
    v_expense_date  := MAKE_DATE(v_target_year, v_target_month, v_effective_day);

    -- ── Cron-mode filter ─────────────────────────────────────────
    -- Skip this account if it is not this account's billing day today.
    -- In backfill mode we always proceed (no day filter).
    IF NOT v_is_backfill AND v_today_day <> v_effective_day THEN
      RAISE NOTICE 'Account %: billing_day=% → effective_day=% ≠ today(%) – skipping',
        v_account.id, v_billing_day, v_effective_day, v_today_day;
      CONTINUE;
    END IF;

    RAISE NOTICE 'Account %: billing_day=%, effective_day=%, expense_date=%',
      v_account.id, v_billing_day, v_effective_day, v_expense_date;

    -- ── Loop over active monthly templates for this account ───────
    FOR v_expense IN
      SELECT *
      FROM public.expenses
      WHERE account_id          = v_account.id
        AND is_recurring        = TRUE
        AND recurring_parent_id IS NULL
        AND frequency           = 'monthly'
        AND (recurring_active IS NULL OR recurring_active = TRUE)
        AND (end_date IS NULL OR end_date >= v_expense_date)
    LOOP

      -- Skip if an instance already exists for this calendar month
      SELECT EXISTS (
        SELECT 1
        FROM public.expenses
        WHERE recurring_parent_id = v_expense.id
          AND date >= v_cycle_start
          AND date <  v_cycle_end
      ) INTO v_exists;

      IF v_exists THEN
        RAISE NOTICE 'Skipping (already exists): % for %/%',
          v_expense.description, v_target_month, v_target_year;
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;

      -- ── Auto-approval logic ────────────────────────────────────
      -- Priority 1: template has "approve all future" flag
      -- Priority 2: payer == creator (same person, no partner needed)
      IF v_expense.recurring_auto_approved = TRUE
         AND v_expense.recurring_approved_by IS NOT NULL
      THEN
        v_is_auto_approved := TRUE;
        v_approved_by      := v_expense.recurring_approved_by;
      ELSIF v_expense.paid_by_id = v_expense.created_by_id THEN
        v_is_auto_approved := TRUE;
        v_approved_by      := v_expense.created_by_id;
      ELSE
        v_is_auto_approved := FALSE;
        v_approved_by      := NULL;
      END IF;

      -- ── Insert new expense instance ────────────────────────────
      BEGIN
        INSERT INTO public.expenses (
          account_id,
          amount,
          description,
          date,
          category,
          paid_by_id,
          created_by_id,
          status,
          split_equally,
          has_end_date,
          end_date,
          is_recurring,
          frequency,
          recurring_parent_id,
          approved_by,
          approved_at
        ) VALUES (
          v_expense.account_id,
          v_expense.amount,
          v_expense.description || ' (חודשי)',
          v_expense_date,
          v_expense.category,
          v_expense.paid_by_id,
          v_expense.created_by_id,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END,
          v_expense.split_equally,
          FALSE,
          NULL,
          FALSE,
          NULL,
          v_expense.id,
          v_approved_by,
          CASE WHEN v_is_auto_approved THEN NOW() ELSE NULL END
        )
        RETURNING id INTO v_new_expense_id;

        -- Copy child associations from template to new instance
        INSERT INTO public.expense_children (expense_id, child_id)
        SELECT v_new_expense_id, child_id
        FROM public.expense_children
        WHERE expense_id = v_expense.id;

        RAISE NOTICE 'Generated: % (% ILS) on % [status=%]',
          v_expense.description, v_expense.amount, v_expense_date,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END;

        v_total_generated := v_total_generated + 1;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error generating instance for "%": %',
          v_expense.description, SQLERRM;
        v_total_errors := v_total_errors + 1;
      END;

    END LOOP; -- expenses
  END LOOP;   -- accounts

  RAISE NOTICE 'Done: generated=%, skipped=%, errors=%',
    v_total_generated, v_total_skipped, v_total_errors;

  RETURN QUERY SELECT v_total_generated, v_total_skipped, v_total_errors;
END;
$$;

COMMENT ON FUNCTION public.generate_recurring_expenses(INTEGER, INTEGER) IS
'Generates monthly recurring expense instances.

 CRON MODE (no arguments – called daily by pg_cron):
   Only processes accounts whose billing_cycle_start_day (clamped to the
   last valid day of the month) equals today''s day-of-month.
   Each family''s expenses are therefore created on their own billing day.

 BACKFILL MODE (p_month + p_year provided – called from admin UI):
   Processes all accounts for the given month, regardless of billing day.
   Use this to recover expenses for months where the cron was missed.

 In both modes:
   • Existing instances are detected and skipped (idempotent).
   • expense_children associations are copied from the template.
   • Auto-approval rules apply (recurring_auto_approved or same user).
   • End-dates and recurring_active flag are respected.';

-- ── Step 3: Replace cron with DAILY schedule ─────────────────────
-- Previously: '0 6 1 * *' (monthly on the 1st) – wrong for families
--             whose billing day is not the 1st.
-- Now:        '0 6 * * *' (daily at 06:00 UTC) – the function itself
--             decides whether today is the billing day for each account.
SELECT cron.unschedule('generate-monthly-expenses');

SELECT cron.schedule(
  'generate-monthly-recurring-expenses',   -- renamed to reflect daily nature
  '0 6 * * *',                             -- every day at 06:00 UTC
  $$SELECT public.generate_recurring_expenses()$$
);
