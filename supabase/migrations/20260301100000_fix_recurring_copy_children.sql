-- ================================================================
-- Fix recurring expense generation – copy expense_children (2026-03-01)
--
-- Bug found: generate_recurring_expenses() inserts a new expense row
-- but never copies the expense_children associations from the template.
-- This means generated instances are never linked to children, so they
-- don't appear in child-filtered views and reports.
--
-- Fix:
--   1. Replace generate_recurring_expenses() with a version that uses
--      RETURNING to capture the new expense ID, then inserts matching
--      expense_children rows.
--   2. Re-run March 2026 backfill (idempotent – existing instances
--      are detected and skipped).
-- ================================================================

-- Drop old signature variants so there's no ambiguity
DROP FUNCTION IF EXISTS public.generate_recurring_expenses(INTEGER, INTEGER);
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
  v_account          RECORD;
  v_expense          RECORD;
  v_billing_day      INTEGER;
  v_last_day         INTEGER;
  v_actual_day       INTEGER;
  v_expense_date     DATE;
  v_target_month     INTEGER;
  v_target_year      INTEGER;
  v_cycle_start      DATE;
  v_cycle_end        DATE;
  v_exists           BOOLEAN;
  v_is_auto_approved BOOLEAN;
  v_approved_by      UUID;
  v_new_expense_id   UUID;
  v_total_generated  INTEGER := 0;
  v_total_skipped    INTEGER := 0;
  v_total_errors     INTEGER := 0;
BEGIN
  -- Default to current month/year when called by cron (no args)
  v_target_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  v_target_year  := COALESCE(p_year,  EXTRACT(YEAR  FROM CURRENT_DATE)::INTEGER);

  -- Calendar-month window used for duplicate detection
  v_cycle_start := MAKE_DATE(v_target_year, v_target_month, 1);
  v_cycle_end   := v_cycle_start + INTERVAL '1 month';

  RAISE NOTICE 'generate_recurring_expenses: target=%/%  (window: % to %)',
    v_target_month, v_target_year, v_cycle_start, v_cycle_end;

  -- ── Loop over every account ─────────────────────────────────────
  FOR v_account IN
    SELECT id, COALESCE(billing_cycle_start_day, 1) AS billing_day
    FROM public.accounts
  LOOP
    v_billing_day := v_account.billing_day;

    -- Clamp billing day to last valid day of the target month
    -- (billing_day=31 in Feb → 28 or 29)
    v_last_day   := EXTRACT(
                      DAY FROM (v_cycle_start + INTERVAL '1 month' - INTERVAL '1 day')
                    )::INTEGER;
    v_actual_day   := LEAST(v_billing_day, v_last_day);
    v_expense_date := MAKE_DATE(v_target_year, v_target_month, v_actual_day);

    RAISE NOTICE 'Account %: billing_day=%, expense_date=%',
      v_account.id, v_billing_day, v_expense_date;

    -- ── Loop over active monthly templates for this account ────────
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

      -- ── Skip if an instance already exists for this calendar month ─
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

      -- ── Auto-approval logic ───────────────────────────────────────
      -- Priority 1: template has "approve all future" flag set
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

      -- ── Insert the new expense instance ───────────────────────────
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
          FALSE,   -- generated instance is NOT itself a recurring template
          NULL,
          v_expense.id,
          v_approved_by,
          CASE WHEN v_is_auto_approved THEN NOW() ELSE NULL END
        )
        RETURNING id INTO v_new_expense_id;

        -- ── Copy expense_children from template to new instance ──────
        -- This is the fix: without this, child-linked expenses would
        -- never appear in child-filtered views for generated instances.
        INSERT INTO public.expense_children (expense_id, child_id)
        SELECT v_new_expense_id, child_id
        FROM public.expense_children
        WHERE expense_id = v_expense.id;

        RAISE NOTICE 'Generated: % (% ILS) on % [status=%, children copied=%]',
          v_expense.description,
          v_expense.amount,
          v_expense_date,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END,
          (SELECT COUNT(*) FROM public.expense_children WHERE expense_id = v_new_expense_id);

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
'Generates monthly recurring expense instances for all accounts.
 Respects billing_cycle_start_day per account, auto-approval rules,
 end-dates, recurring_active flag, and copies expense_children associations.
 Called by pg_cron on the 1st of every month; also callable from admin UI.
 Parameters: p_month / p_year (optional, default = current date).
 Fixed 2026-03-01: now copies expense_children rows to generated instances.';

-- ----------------------------------------------------------------
-- Re-schedule the cron (direct DB call – no HTTP, no auth needed)
-- This is idempotent: unschedule ignores the call if job is missing.
-- ----------------------------------------------------------------
SELECT cron.unschedule('generate-monthly-expenses');

SELECT cron.schedule(
  'generate-monthly-expenses',
  '0 6 1 * *',   -- 06:00 UTC on the 1st of every month
  $$SELECT public.generate_recurring_expenses()$$
);

-- ----------------------------------------------------------------
-- Backfill: generate March 2026 instances that were missed.
-- Idempotent – existing instances are detected and skipped.
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.generate_recurring_expenses(3, 2026);
  RAISE NOTICE 'March 2026 backfill: generated=%, skipped=%, errors=%',
    v_result.generated, v_result.skipped, v_result.errors;
END;
$$;
