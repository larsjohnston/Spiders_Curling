-- Excuses for opting out, jugs of beer per game, and seasons (so a new league sheet starts a fresh
-- schedule while the roster, photos and past seasons stay).

alter table curling_away add column excuse text;

alter table curling_games add column jugs int check (jugs >= 0 and jugs <= 99);

alter table curling_games add column season text not null default '2026/27 1st Square';
create index curling_games_season_idx on curling_games (season, starts_at);
