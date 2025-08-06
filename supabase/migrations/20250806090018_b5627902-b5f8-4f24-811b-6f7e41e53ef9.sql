-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the recurring expenses generation to run on the 1st of every month at 6:00 AM
SELECT cron.schedule(
  'generate-monthly-expenses',
  '0 6 1 * *', -- At 06:00 on day-of-month 1
  $$
  select
    net.http_post(
        url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/generate-recurring-expenses',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);