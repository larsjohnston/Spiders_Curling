-- League sync: the league's posted W/L/T per game, plus a small key/value store for league data
-- that isn't per-game (division standings, bye weeks, last sync time).

alter table curling_games
  add column league_result text check (league_result in ('W', 'L', 'T'));

create table curling_league (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table curling_league enable row level security;
