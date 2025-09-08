-- מעדכן את כל ההוצאות שנטלי הישנה שילמה עליהן
UPDATE expenses 
SET paid_by_id = 'f9e85c9a-4bff-4e37-9a7b-1de792667eb6'
WHERE paid_by_id = '839a460f-f7ac-486a-9cb3-1a388a9b3771'
  AND account_id = '223b0efc-94a0-4876-95c2-9904cb005343';

-- מעדכן את כל ההוצאות שנטלי הישנה יצרה
UPDATE expenses 
SET created_by_id = 'f9e85c9a-4bff-4e37-9a7b-1de792667eb6'
WHERE created_by_id = '839a460f-f7ac-486a-9cb3-1a388a9b3771'
  AND account_id = '223b0efc-94a0-4876-95c2-9904cb005343';

-- מעדכן את השדה approved_by במקרה שנטלי הישנה אישרה הוצאות
UPDATE expenses 
SET approved_by = 'f9e85c9a-4bff-4e37-9a7b-1de792667eb6'
WHERE approved_by = '839a460f-f7ac-486a-9cb3-1a388a9b3771'
  AND account_id = '223b0efc-94a0-4876-95c2-9904cb005343';