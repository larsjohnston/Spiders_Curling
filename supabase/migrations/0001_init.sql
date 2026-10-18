-- Spiders Curling schema. All access is server-side with the service role key;
-- RLS is enabled with no policies so the public anon key can read/write nothing.

create table curling_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table curling_games (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  opponent text not null,
  sheet text,
  notes text,
  our_score int check (our_score >= 0),
  their_score int check (their_score >= 0),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index curling_games_starts_at_idx on curling_games (starts_at);

create table curling_game_players (
  game_id uuid not null references curling_games (id) on delete cascade,
  player_id uuid not null references curling_players (id) on delete cascade,
  position text not null check (position in ('lead', 'second', 'vice', 'skip')),
  primary key (game_id, position),
  unique (game_id, player_id)
);

create table curling_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references curling_players (id) on delete set null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table curling_players enable row level security;
alter table curling_games enable row level security;
alter table curling_game_players enable row level security;
alter table curling_push_subscriptions enable row level security;

-- Placeholder roster; rename on the Roster page.
insert into curling_players (name, sort_order) values
  ('Player 1', 1), ('Player 2', 2), ('Player 3', 3),
  ('Player 4', 4), ('Player 5', 5), ('Player 6', 6);
