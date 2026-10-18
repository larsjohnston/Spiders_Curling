export const TEAM_NAME = "Spiders";
export const TIMEZONE = "America/Edmonton";
/** Local hour (24h) the night-before reminder goes out. */
export const REMINDER_HOUR = 19;

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
  league: "curling_league",
} as const;

export const PHOTO_BUCKET = "curling-photos";

/** Which league sheet the app follows. Stored in the DB (Season page); this is the first season's. */
export type LeagueConfig = {
  season: string;
  /** Published sheet base, e.g. https://docs.google.com/spreadsheets/d/e/<key>/pubhtml */
  sheetUrl: string;
  team: string;
  division: string;
  scheduleGid: string;
  divisionGid: string;
};

export const DEFAULT_LEAGUE: LeagueConfig = {
  season: "2026/27 1st Square",
  sheetUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUPsPnr8e_P6LHQ-SSmOfITHg5KsQyfs0TmuGvFiRDtL03U3BR0GCb2pqxvAPVcq2U4KglWAjc1lDx/pubhtml",
  team: "Johnston, L.",
  division: "C",
  scheduleGid: "1418151424",
  divisionGid: "1235377529",
};
