select cron.unschedule('gs-auto-likes-cron');
select cron.schedule(
  'gs-auto-likes-cron',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://project--e048f54c-8bec-4d93-bd06-26f6c86a40a2.lovable.app/api/public/cron-likes',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);