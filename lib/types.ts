import type { Position } from "./config";

export type Player = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  photo_url: string | null;
};

export type LineupSpot = { position: Position; player: Player };

export type Game = {
  id: string;
  starts_at: string;
  opponent: string;
  sheet: string | null;
  notes: string | null;
  our_score: number | null;
  their_score: number | null;
  /** Free-text recap entered with the score; pushed out with the result. */
  story: string | null;
  /** W/L/T as posted on the league sheet (the league doesn't publish scores). */
  league_result: Result | null;
  reminder_sent_at: string | null;
  lineup: LineupSpot[];
  /** Players who said they can't make it. */
  away: string[];
};

/** Per-game status on the edit form: + playing, " available sub, − unavailable. */
export type PlayerStatus = "play" | "sub" | "away";

/** Status for each player in a game. Away wins over playing so a starter who dropped out is visible. */
export function statusesFor(game: Pick<Game, "lineup" | "away">): Record<string, PlayerStatus> {
  const out: Record<string, PlayerStatus> = {};
  for (const s of game.lineup) out[s.player.id] = "play";
  for (const id of game.away) out[id] = "away";
  return out;
}

export type Result = "W" | "L" | "T";

/** Result from the score we entered. */
export function resultOf(g: Pick<Game, "our_score" | "their_score">): Result | null {
  if (g.our_score == null || g.their_score == null) return null;
  if (g.our_score > g.their_score) return "W";
  if (g.our_score < g.their_score) return "L";
  return "T";
}

/** Our score's result if entered, otherwise whatever the league posted. */
export function effectiveResult(g: Pick<Game, "our_score" | "their_score" | "league_result">): Result | null {
  return resultOf(g) ?? g.league_result;
}
