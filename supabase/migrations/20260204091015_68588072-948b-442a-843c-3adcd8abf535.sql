
-- Store cron secret in system_settings (user will need to update the value)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('cron_secret', 'REPLACE_WITH_YOUR_CRON_SECRET', 'Secret for authenticating cron jobs to edge functions')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Update the cron job to read secret from system_settings
SELECT cron.unschedule('generate-monthly-expenses');

SELECT cron.schedule(
  'generate-monthly-expenses',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/generate-recurring-expenses',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', (SELECT setting_value FROM public.system_settings WHERE setting_key = 'cron_secret')
      ),
      body:='{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);
