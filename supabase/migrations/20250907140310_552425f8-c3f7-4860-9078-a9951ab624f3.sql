-- Update the email change confirmation handler to properly update email change requests
CREATE OR REPLACE FUNCTION public.handle_email_change_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- אם המייל השתנה, עדכן את הסטטוס של הבקשה
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.email_change_requests 
    SET 
      status = 'confirmed',
      confirmed_at = now()
    WHERE user_id = NEW.id 
      AND new_email = NEW.email 
      AND status = 'pending';
      
    -- גם עדכן את הפרופיל
    UPDATE public.profiles 
    SET updated_at = now()
    WHERE id = NEW.id;
    
    -- לוג לבדיקה
    RAISE NOTICE 'Email updated for user %: % -> %', NEW.id, OLD.email, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- עדכן או צור את הטריגר
DROP TRIGGER IF EXISTS handle_user_email_change ON auth.users;
CREATE TRIGGER handle_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_change_confirmation();