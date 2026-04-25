create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'gs-auto-likes-cron',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://project--' || current_setting('app.settings.project_id', true) || '.lovable.app/api/public/cron-likes',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);