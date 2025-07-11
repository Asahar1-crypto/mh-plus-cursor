-- First, get the user IDs for the emails
-- Delete expense_children relationships first (foreign key constraint)
DELETE FROM public.expense_children 
WHERE expense_id IN (
  SELECT e.id 
  FROM public.expenses e 
  JOIN public.profiles p ON (e.paid_by_id = p.id OR e.created_by_id = p.id)
  JOIN auth.users u ON p.id = u.id 
  WHERE u.email IN ('ariel.sahar1@gmail.com', 'ariels@consist.co.il')
);

-- Delete all expenses related to these users (either as creator or payer)
DELETE FROM public.expenses 
WHERE id IN (
  SELECT e.id 
  FROM public.expenses e 
  JOIN public.profiles p ON (e.paid_by_id = p.id OR e.created_by_id = p.id)
  JOIN auth.users u ON p.id = u.id 
  WHERE u.email IN ('ariel.sahar1@gmail.com', 'ariels@consist.co.il')
);