-- Player photos (stored in the public `curling-photos` bucket) and per-game "away" marks.

alter table curling_players add column photo_url text;

create table curling_away (
  game_id uuid not null references curling_games (id) on delete cascade,
  player_id uuid not null references curling_players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);
alter table curling_away enable row level security;

-- Public bucket: photos are readable by URL; uploads go through the server with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curling-photos', 'curling-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;
