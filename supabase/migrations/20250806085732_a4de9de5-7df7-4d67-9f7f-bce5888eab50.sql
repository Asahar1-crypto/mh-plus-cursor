-- Add missing columns for recurring expenses functionality
ALTER TABLE public.expenses 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN frequency TEXT,
ADD COLUMN recurring_parent_id UUID REFERENCES public.expenses(id);

-- Add index for better performance on recurring expenses queries
CREATE INDEX idx_expenses_recurring ON public.expenses(is_recurring, frequency) WHERE is_recurring = TRUE;
CREATE INDEX idx_expenses_recurring_parent ON public.expenses(recurring_parent_id) WHERE recurring_parent_id IS NOT NULL;

-- Create function to generate recurring expenses
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
    -- Get current month and year
    target_month := EXTRACT(MONTH FROM current_date_val);
    target_year := EXTRACT(YEAR FROM current_date_val);
    
    -- Loop through all recurring expenses
    FOR recurring_expense IN 
        SELECT * FROM public.expenses 
        WHERE is_recurring = TRUE 
        AND (end_date IS NULL OR end_date >= current_date_val)
    LOOP
        -- Calculate next occurrence based on frequency
        CASE recurring_expense.frequency
            WHEN 'monthly' THEN
                -- For monthly, check if expense exists for current month
                next_date := date_trunc('month', current_date_val)::date;
                
                -- Check if expense already exists for this month
                IF NOT EXISTS (
                    SELECT 1 FROM public.expenses 
                    WHERE recurring_parent_id = recurring_expense.id
                    AND EXTRACT(MONTH FROM date) = target_month
                    AND EXTRACT(YEAR FROM date) = target_year
                ) THEN
                    -- Insert new expense for current month
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
                        recurring_parent_id
                    ) VALUES (
                        recurring_expense.account_id,
                        recurring_expense.amount,
                        recurring_expense.description || ' (חודשי)',
                        next_date,
                        recurring_expense.category,
                        recurring_expense.paid_by_id,
                        recurring_expense.created_by_id,
                        'pending',
                        recurring_expense.split_equally,
                        FALSE,
                        NULL,
                        FALSE, -- The generated expense is not recurring itself
                        NULL,
                        recurring_expense.id
                    );
                    
                    RAISE NOTICE 'Generated monthly expense for %: % (amount: %)', 
                        recurring_expense.description, next_date, recurring_expense.amount;
                END IF;
                
            WHEN 'weekly' THEN
                -- For weekly expenses (implement if needed)
                next_date := current_date_val;
                
            WHEN 'yearly' THEN
                -- For yearly expenses (implement if needed)
                next_date := current_date_val;
        END CASE;
    END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_recurring_expenses() TO authenticated;