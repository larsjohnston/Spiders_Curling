export const TEAM_NAME = "Spiders";
export const TIMEZONE = "America/Edmonton";

// The four playing spots. Positions rotate, so the app never shows these names;
// they're just stable slot keys (the DB column still uses the curling names).
export const POSITIONS = ["skip", "vice", "second", "lead"] as const;
export type Position = (typeof POSITIONS)[number];

// Tables are prefixed so the app can share a Supabase project with other apps.
export const T = {
  players: "curling_players",
  games: "curling_games",
  gamePlayers: "curling_game_players",
  subscriptions: "curling_push_subscriptions",
  away: "curling_away",
} as const;

export const PHOTO_BUCKET = "curling-photos";
