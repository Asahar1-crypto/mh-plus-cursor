-- =============================================================
-- Cron: Fetch CPI index from CBS on 15th of each month
-- (2026-03-03)
--
-- The CBS publishes the CPI around 18:30. This runs at 19:00 Israel
-- (17:00 UTC) to fetch and store in cpi_history.
-- =============================================================

SELECT cron.schedule(
  'fetch-cpi-index',
  '0 17 15 * *',
  $$
  SELECT
    net.http_post(
      url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/fetch-cpi-index',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', (SELECT setting_value FROM public.system_settings WHERE setting_key = 'cron_secret')
      ),
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
