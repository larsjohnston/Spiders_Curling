export const TEAM_NAME = "Spiders";
export const TIMEZONE = "America/Edmonton";

export const POSITIONS = ["skip", "vice", "second", "lead"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  skip: "Skip",
  vice: "Vice",
  second: "Second",
  lead: "Lead",
};

export const POSITION_SHORT: Record<Position, string> = {
  skip: "S",
  vice: "V",
  second: "2",
  lead: "L",
};

// Tables are prefixed so the app can share a Supabase project with other apps.
export const T = {
  players: "curling_players",
  games: "curling_games",
  gamePlayers: "curling_game_players",
  subscriptions: "curling_push_subscriptions",
  away: "curling_away",
} as const;

export const PHOTO_BUCKET = "curling-photos";
