-- עדכון המשתמש הראשון להיות Super Admin (זמנית למטרות פיתוח)
UPDATE profiles 
SET is_super_admin = true 
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);