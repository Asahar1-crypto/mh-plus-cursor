-- =============================================================
-- Migration: Add daily cron job for trial reminders
-- =============================================================

-- Schedule daily trial reminders at 9:00 AM Israel time (7:00 UTC)
SELECT cron.schedule(
  'send-trial-reminders',
  '0 7 * * *',
  $$
  select
    net.http_post(
        url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/send-trial-reminders',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', (SELECT setting_value FROM public.system_settings WHERE setting_key = 'cron_secret')
        ),
        body:='{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);
