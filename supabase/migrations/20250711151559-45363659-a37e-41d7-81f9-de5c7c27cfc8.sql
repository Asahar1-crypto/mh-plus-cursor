-- מוחק את כל ההוצאות הקשורות למשתמש ariel.sahar1@gmail.com
-- ראשית, מוצא את המשתמש לפי האימייל

WITH target_user AS (
  SELECT id as user_id 
  FROM auth.users 
  WHERE email = 'ariel.sahar1@gmail.com'
),
target_accounts AS (
  SELECT DISTINCT account_id 
  FROM public.account_members am
  JOIN target_user tu ON am.user_id = tu.user_id
)

-- מוחק את הקשרים בין הוצאות לילדים
DELETE FROM public.expense_children 
WHERE expense_id IN (
  SELECT e.id 
  FROM public.expenses e
  JOIN target_accounts ta ON e.account_id = ta.account_id
);

-- מוחק את כל ההוצאות של החשבונות שקשורים למשתמש
DELETE FROM public.expenses 
WHERE account_id IN (
  SELECT account_id FROM target_accounts
);