-- מוחק את כל ההוצאות הקשורות למשתמש ariel.sahar1@gmail.com
-- ראשית, מוצא את המשתמש לפי האימייל ואת החשבונות שלו

-- מוחק את הקשרים בין הוצאות לילדים
DELETE FROM public.expense_children 
WHERE expense_id IN (
  SELECT e.id 
  FROM public.expenses e
  JOIN public.account_members am ON e.account_id = am.account_id
  JOIN auth.users u ON am.user_id = u.id
  WHERE u.email = 'ariel.sahar1@gmail.com'
);

-- מוחק את כל ההוצאות של החשבונות שקשורים למשתמש
DELETE FROM public.expenses 
WHERE account_id IN (
  SELECT DISTINCT am.account_id 
  FROM public.account_members am
  JOIN auth.users u ON am.user_id = u.id
  WHERE u.email = 'ariel.sahar1@gmail.com'
);