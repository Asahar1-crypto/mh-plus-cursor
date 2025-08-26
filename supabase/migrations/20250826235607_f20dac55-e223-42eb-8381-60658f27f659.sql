-- תיקון קטגוריות באנגלית לעברית
UPDATE expenses 
SET category = 'אחר' 
WHERE category = 'other';

UPDATE expenses 
SET category = 'פנאי' 
WHERE category = 'entertainment';