-- Add recurring_active for parent recurring expenses (is_recurring=true, recurring_parent_id IS NULL)
-- When false: template is paused, generate_recurring_expenses will skip it
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_active boolean DEFAULT true;

-- Backfill: existing parent recurring expenses are active
UPDATE public.expenses 
SET recurring_active = true 
WHERE is_recurring = true 
  AND recurring_parent_id IS NULL 
  AND recurring_active IS NULL;

COMMENT ON COLUMN public.expenses.recurring_active IS 'When false, this recurring template is paused - no new instances will be generated';

-- Update generate_recurring_expenses to skip inactive templates
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recurring_expense RECORD;
    next_date DATE;
    current_date_val DATE := CURRENT_DATE;
    target_month INTEGER;
    target_year INTEGER;
BEGIN
    target_month := EXTRACT(MONTH FROM current_date_val);
    target_year := EXTRACT(YEAR FROM current_date_val);
    
    FOR recurring_expense IN 
        SELECT * FROM public.expenses 
        WHERE is_recurring = TRUE 
        AND recurring_parent_id IS NULL
        AND (recurring_active IS NULL OR recurring_active = true)
        AND (end_date IS NULL OR end_date >= current_date_val)
    LOOP
        CASE recurring_expense.frequency
            WHEN 'monthly' THEN
                next_date := date_trunc('month', current_date_val)::date;
                
                IF NOT EXISTS (
                    SELECT 1 FROM public.expenses 
                    WHERE recurring_parent_id = recurring_expense.id
                    AND EXTRACT(MONTH FROM date) = target_month
                    AND EXTRACT(YEAR FROM date) = target_year
                ) THEN
                    INSERT INTO public.expenses (
                        account_id, amount, description, date, category, paid_by_id, created_by_id,
                        status, split_equally, has_end_date, end_date, is_recurring, frequency, recurring_parent_id
                    ) VALUES (
                        recurring_expense.account_id, recurring_expense.amount,
                        recurring_expense.description || ' (חודשי)', next_date, recurring_expense.category,
                        recurring_expense.paid_by_id, recurring_expense.created_by_id, 'pending',
                        recurring_expense.split_equally, FALSE, NULL, FALSE, NULL, recurring_expense.id
                    );
                    RAISE NOTICE 'Generated monthly expense for %: % (amount: %)', 
                        recurring_expense.description, next_date, recurring_expense.amount;
                END IF;
            WHEN 'weekly' THEN
                next_date := current_date_val;
            WHEN 'yearly' THEN
                next_date := current_date_val;
        END CASE;
    END LOOP;
END;
$$;
