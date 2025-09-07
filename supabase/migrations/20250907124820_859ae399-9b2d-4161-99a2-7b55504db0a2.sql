-- תיקון בעיות אבטחה - הוספת search_path לפונקציות
DROP FUNCTION IF EXISTS public.is_valid_email_confirmation_url(TEXT);
DROP FUNCTION IF EXISTS public.log_email_change_request(UUID, TEXT, TEXT);

-- יצירת פונקציה לחסימת לינקים חשודים עם search_path מסודר
CREATE OR REPLACE FUNCTION public.is_valid_email_confirmation_url(url TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- בדיקה שהלינק מגיע מ-Supabase בלבד
  RETURN url LIKE '%supabase.co%' OR url LIKE '%localhost%';
END;
$$;

-- פונקציה לרישום שינוי מייל עם search_path מסודר
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
  log_id UUID;
BEGIN
  INSERT INTO public.email_change_logs (user_id, old_email, new_email)
  VALUES (p_user_id, p_old_email, p_new_email)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;