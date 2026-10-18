-- Game story (pushed out with the result) and an hourly job that pings the reminder endpoint.
-- The endpoint only sends at/after 7pm Calgary time the night before, so hourly gives an
-- on-the-dot 7pm reminder year-round (Vercel's Hobby cron is daily and imprecise).

alter table curling_games add column story text;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace <CRON_SECRET> with the value of CRON_SECRET in Vercel before running.
select cron.schedule(
  'spiders-curling-reminders',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://spiders-curling.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
