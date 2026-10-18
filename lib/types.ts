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
  reminder_sent_at: string | null;
  lineup: LineupSpot[];
  /** Players who said they can't make it. */
  away: string[];
};

export type Result = "W" | "L" | "T";

export function resultOf(g: Pick<Game, "our_score" | "their_score">): Result | null {
  if (g.our_score == null || g.their_score == null) return null;
  if (g.our_score > g.their_score) return "W";
  if (g.our_score < g.their_score) return "L";
  return "T";
}
