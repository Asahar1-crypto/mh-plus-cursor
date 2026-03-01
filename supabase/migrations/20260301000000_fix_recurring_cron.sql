-- ================================================================
-- Fix recurring expense generation (2026-03-01)
--
-- Root cause: The cron job was calling the edge function via HTTP
-- but sending no auth header, so the edge function returned 403
-- on every invocation, silently. No expenses were ever generated.
--
-- Fix:
--   1. Replace the broken HTTP-based cron with a direct DB call
--   2. Rewrite generate_recurring_expenses() with full logic:
--      - per-account billing_cycle_start_day
--      - auto-approval (recurring_auto_approved OR same user)
--      - skip inactive templates (recurring_active = false)
--      - handle month-end edge cases (e.g., billing_day=31 in Feb)
--   3. Run immediately to generate March 2026 missing expenses
-- ================================================================

-- ----------------------------------------------------------------
-- Step 1: Remove the broken cron (HTTP call without auth header)
-- ----------------------------------------------------------------
SELECT cron.unschedule('generate-monthly-expenses');

-- ----------------------------------------------------------------
-- Step 2: Rewrite the PostgreSQL function with full logic
--
-- NOTE: The old version was RETURNS void with no parameters.
-- PostgreSQL treats different signatures as different functions,
-- so we must DROP the old void overload before replacing it,
-- otherwise "SELECT generate_recurring_expenses()" in the cron
-- would still match the old void function.
-- ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generate_recurring_expenses();

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
  v_account         RECORD;
  v_expense         RECORD;
  v_billing_day     INTEGER;
  v_last_day        INTEGER;
  v_actual_day      INTEGER;
  v_expense_date    DATE;
  v_target_month    INTEGER;
  v_target_year     INTEGER;
  v_cycle_start     DATE;
  v_cycle_end       DATE;
  v_exists          BOOLEAN;
  v_is_auto_approved BOOLEAN;
  v_approved_by     UUID;
  v_total_generated INTEGER := 0;
  v_total_skipped   INTEGER := 0;
  v_total_errors    INTEGER := 0;
BEGIN
  -- Use current month/year if not specified
  v_target_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  v_target_year  := COALESCE(p_year,  EXTRACT(YEAR  FROM CURRENT_DATE)::INTEGER);

  -- Calendar-month bounds for duplicate detection
  v_cycle_start := MAKE_DATE(v_target_year, v_target_month, 1);
  v_cycle_end   := v_cycle_start + INTERVAL '1 month';

  RAISE NOTICE 'generate_recurring_expenses: target=%/%', v_target_month, v_target_year;

  -- Loop over every account
  FOR v_account IN
    SELECT id, COALESCE(billing_cycle_start_day, 1) AS billing_day
    FROM public.accounts
  LOOP
    v_billing_day := v_account.billing_day;

    -- Clamp billing day to last valid day of the target month
    -- (e.g., billing_day=31 in February → 28/29)
    v_last_day   := EXTRACT(DAY FROM (v_cycle_start + INTERVAL '1 month - 1 day'))::INTEGER;
    v_actual_day := LEAST(v_billing_day, v_last_day);
    v_expense_date := MAKE_DATE(v_target_year, v_target_month, v_actual_day);

    RAISE NOTICE 'Account %: billing_day=%, expense_date=%',
      v_account.id, v_billing_day, v_expense_date;

    -- Loop over active monthly recurring templates for this account
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

      -- ── Auto-approval logic ──────────────────────────────────
      -- Priority 1: template was approved-all (recurring_auto_approved)
      -- Priority 2: payer == creator (same person, no approval needed)
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

      -- ── Insert the new expense instance ─────────────────────
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
        );

        RAISE NOTICE 'Generated: % (% ILS) on % [status=%]',
          v_expense.description, v_expense.amount, v_expense_date,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END;

        v_total_generated := v_total_generated + 1;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error generating %: %', v_expense.description, SQLERRM;
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
'Generates monthly recurring expense instances for all accounts.
 Respects billing_cycle_start_day, auto-approval rules, and end-dates.
 Called by pg_cron on the 1st of every month, and by the admin UI via RPC.
 Parameters: p_month / p_year (optional, default = current date).';

-- ----------------------------------------------------------------
-- Step 3: Reschedule the cron to call the DB function directly
--         (No HTTP round-trip, no auth headers needed)
-- ----------------------------------------------------------------
SELECT cron.schedule(
  'generate-monthly-expenses',
  '0 6 1 * *',  -- 06:00 UTC on the 1st of every month
  $$SELECT public.generate_recurring_expenses()$$
);

-- ----------------------------------------------------------------
-- Step 4: Generate March 2026 expenses NOW (backfill)
--         This is idempotent - existing instances are skipped
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.generate_recurring_expenses(3, 2026);
  RAISE NOTICE 'March 2026 backfill complete: generated=%, skipped=%, errors=%',
    v_result.generated, v_result.skipped, v_result.errors;
END;
$$;
