-- הגדרת קונפיגורציה לשינוי מייל - שליחה רק לכתובת החדשה
-- אין צורך לשלוח אישור לכתובת הישנה

-- עדכון הגדרות Auth להגביל שליחת מיילים רק לכתובת החדשה
-- זה יבוצע דרך dashboard של Supabase בנפרד

-- יצירת פונקציה לחסימת לינקים חשודים
CREATE OR REPLACE FUNCTION public.is_valid_email_confirmation_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- בדיקה שהלינק מגיע מ-Supabase בלבד
  RETURN url LIKE '%supabase.co%' OR url LIKE '%localhost%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הוספת לוג לפעולות שינוי מייל
CREATE TABLE IF NOT EXISTS public.email_change_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT,
  new_email TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- הפעלת RLS על הטבלה
ALTER TABLE public.email_change_logs ENABLE ROW LEVEL SECURITY;

-- מדיניות גישה לטבלת לוגי שינוי מייל
CREATE POLICY "Users can view their own email change logs" 
ON public.email_change_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- רק מנהלים יכולים לראות את כל הלוגים
CREATE POLICY "Super admins can view all email change logs" 
ON public.email_change_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- פונקציה לרישום שינוי מייל
CREATE OR REPLACE FUNCTION public.log_email_change_request(
  p_user_id UUID,
  p_old_email TEXT,
  p_new_email TEXT
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.email_change_logs (user_id, old_email, new_email)
  VALUES (p_user_id, p_old_email, p_new_email)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;