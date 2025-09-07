-- יצירת trigger לעדכון פרופיל כשמייל משתנה
-- זה trigger חשוב לסנכרון הנתונים בין auth.users ל-profiles

-- ראשית, בואי נוודא שהפונקציה handle_new_user קיימת ומעודכנת
-- (הפונקציה כבר קיימת מהמיגרציה הקודמת)

-- עכשיו ניצור trigger לעדכון מייל בפרופיל
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- אם המייל השתנה, נעדכן גם בטבלת הפרופילים
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles 
    SET updated_at = now()
    WHERE id = NEW.id;
    
    -- לוג לבדיקה
    RAISE NOTICE 'Email updated for user %: % -> %', NEW.id, OLD.email, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- יצירת trigger על auth.users לעדכון מייל
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_change();

-- וידוא שיש לנו trigger לכל משתמש חדש
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();