-- תיקון תהליך שינוי מייל - הוספת trigger לוודא שינוי מייל מתבצע כמו שצריך

-- יצירת טבלה לניהול בקשות שינוי מייל
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  token TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours')
);

-- הפעלת RLS
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- מדיניות RLS - משתמשים יכולים לראות רק את הבקשות שלהם
CREATE POLICY "Users can view their own email change requests" 
  ON public.email_change_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email change requests" 
  ON public.email_change_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- פונקציה לטיפול בשינוי מייל מוצלח
CREATE OR REPLACE FUNCTION public.handle_email_change_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- יצירת trigger על טבלת auth.users (אם אפשר)
-- זה יעבד רק אם יש לנו הרשאות על הסכמה auth
DO $$
BEGIN
  BEGIN
    CREATE TRIGGER email_change_confirmation_trigger
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_email_change_confirmation();
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- אם אין הרשאות, נתעלם מהשגיאה
      RAISE NOTICE 'Cannot create trigger on auth.users - insufficient privileges';
  END;
END $$;

-- פונקציה לרישום בקשת שינוי מייל משופרת
CREATE OR REPLACE FUNCTION public.log_email_change_request(
  p_user_id UUID,
  p_old_email TEXT,
  p_new_email TEXT
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  request_id UUID;
BEGIN
  -- בטל בקשות קודמות שעדיין ממתינות
  UPDATE public.email_change_requests 
  SET status = 'expired'
  WHERE user_id = p_user_id 
    AND status = 'pending'
    AND new_email != p_new_email;
  
  -- הוסף בקשה חדשה
  INSERT INTO public.email_change_requests (user_id, old_email, new_email)
  VALUES (p_user_id, p_old_email, p_new_email)
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

-- פונקציה לבדיקת סטטוס שינוי מייל
CREATE OR REPLACE FUNCTION public.get_email_change_status(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  old_email TEXT,
  new_email TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.old_email,
    r.new_email,
    r.status,
    r.created_at,
    r.confirmed_at
  FROM public.email_change_requests r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC
  LIMIT 10;
END;
$$;