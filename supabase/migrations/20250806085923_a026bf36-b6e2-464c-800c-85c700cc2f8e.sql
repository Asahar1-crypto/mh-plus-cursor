-- Update the existing 4800 expense to be recurring
UPDATE public.expenses 
SET is_recurring = TRUE, frequency = 'monthly'
WHERE id = 'a72b2f3c-8d93-41c5-98ea-ca65709c8534';

-- Now run the function to generate this month's instance
SELECT public.generate_recurring_expenses();