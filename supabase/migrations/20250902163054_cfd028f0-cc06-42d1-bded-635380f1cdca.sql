-- Update Supabase auth configuration to disable automatic emails
-- This should be done via Supabase Dashboard -> Authentication -> Settings -> Email Templates
-- For now, we'll add a system setting to track this configuration

INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES 
  ('auth_email_disabled', 'true', 'Whether Supabase automatic auth emails are disabled')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;