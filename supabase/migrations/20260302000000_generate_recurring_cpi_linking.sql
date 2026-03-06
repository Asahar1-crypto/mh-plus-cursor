-- ================================================================
-- Update generate_recurring_expenses to support CPI-linked amounts
-- (2026-03-02)
--
-- When is_index_linked=true:
--   CurrentAmount = BaseAmount × (CurrentIndex / BaseIndex)
--   Round intermediate to 5 decimals, final to 2
--   If floor_enabled: CurrentAmount = max(CurrentAmount, BaseAmount)
-- ================================================================

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

      -- ── Determine amount (CPI or fixed) ─────────────────────────
      IF (v_expense.is_index_linked = TRUE)
         AND v_expense.base_amount IS NOT NULL
         AND v_expense.base_index_period IS NOT NULL
      THEN
        -- Resolve current period by index_update_frequency
        IF v_expense.index_update_frequency = 'quarterly' THEN
          v_calc_period := v_target_year || '-' ||
            LPAD((((v_target_month - 1) / 3 + 1) * 3)::TEXT, 2, '0');  -- 3,6,9,12
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
      ELSIF v_expense.paid_by_id = v_expense.created_by_id THEN
        v_is_auto_approved := TRUE;
        v_approved_by      := v_expense.created_by_id;
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
          v_expense.description || ' (חודשי)', v_expense_date, v_expense.category,
          v_expense.paid_by_id, v_expense.created_by_id,
          CASE WHEN v_is_auto_approved THEN 'approved' ELSE 'pending' END,
          v_expense.split_equally, FALSE, NULL, FALSE, NULL,
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
