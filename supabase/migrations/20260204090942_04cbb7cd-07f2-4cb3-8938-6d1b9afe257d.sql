
-- Drop the existing cron job
SELECT cron.unschedule(2);

-- Create new cron job with X-Cron-Secret header
SELECT cron.schedule(
  'generate-monthly-expenses',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/generate-recurring-expenses',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', current_setting('app.settings.cron_secret', true)
      ),
      body:='{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);
