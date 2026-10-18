import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { Game, LineupSpot, Player, Result } from "./types";
import type { LeagueWeek } from "./league";
import { DEFAULT_LEAGUE, T, type LeagueConfig, type Position } from "./config";

const GAME_SELECT =
  "id, season, starts_at, opponent, sheet, notes, our_score, their_score, story, jugs, league_result, reminder_sent_at, curling_game_players(position, curling_players(id, name, sort_order, active, photo_url)), curling_away(player_id, excuse)";

type GameRow = Omit<Game, "lineup" | "away" | "excuses"> & {
  curling_game_players: { position: Position; curling_players: Player }[];
  curling_away: { player_id: string; excuse: string | null }[];
};

function toGame(row: GameRow): Game {
  const { curling_game_players, curling_away, ...rest } = row;
  const lineup: LineupSpot[] = curling_game_players.map((gp) => ({ position: gp.position, player: gp.curling_players }));
  const excuses = Object.fromEntries(curling_away.filter((a) => a.excuse).map((a) => [a.player_id, a.excuse!]));
  return { ...rest, lineup, away: curling_away.map((a) => a.player_id), excuses };
}

/** Which league sheet and season the app is following (set on the Season page). Cached per request. */
export const getLeagueConfig = cache(async (): Promise<LeagueConfig> => {
  const { data, error } = await db().from(T.league).select("data").eq("key", "config").maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_LEAGUE, ...((data?.data as Partial<LeagueConfig>) ?? {}) };
});

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  let q = db().from(T.players).select("id, name, sort_order, active, photo_url").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/** This season's games (or another season's, by name). */
export async function getGames(season?: string): Promise<Game[]> {
  const s = season ?? (await getLeagueConfig()).season;
  const { data, error } = await db().from(T.games).select(GAME_SELECT).eq("season", s).order("starts_at");
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
}

/** Record for every season, newest first, for the season history list. */
export async function getSeasonRecords(): Promise<{ season: string; games: Pick<Game, "our_score" | "their_score" | "league_result" | "jugs">[] }[]> {
  const { data, error } = await db()
    .from(T.games)
    .select("season, starts_at, our_score, their_score, league_result, jugs")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  const bySeason = new Map<string, Pick<Game, "our_score" | "their_score" | "league_result" | "jugs">[]>();
  for (const g of data) {
    if (!bySeason.has(g.season)) bySeason.set(g.season, []);
    bySeason.get(g.season)!.push(g);
  }
  return [...bySeason].map(([season, games]) => ({ season, games }));
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await db().from(T.games).select(GAME_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as unknown as GameRow) : null;
}

export type LeagueSnapshot = {
  asOf: string | null;
  syncedAt: string;
  /** Our bye weeks (YYYY-MM-DD). */
  byes: string[];
  standings: { team: string; games: number; wins: number; losses: number; ties: number; points: number }[];
  /** Division results grid: teams in sheet order, and each team's W/L/T against each opponent. */
  matrix?: { teams: string[]; results: Record<string, Record<string, Result>> };
  /** Every game in the league, week by week. */
  weeks?: LeagueWeek[];
};

/** Last league sync (standings, byes), or null before the first sync. */
export async function getLeagueSnapshot(): Promise<LeagueSnapshot | null> {
  const { data, error } = await db().from(T.league).select("data").eq("key", "snapshot").maybeSingle();
  if (error) throw error;
  return (data?.data as LeagueSnapshot) ?? null;
}

/** A team's league record as "W–L" (plus "–T" when they have ties), or null if they're not in the standings. */
export function leagueRecord(league: LeagueSnapshot | null, team: string): string | null {
  const t = league?.standings.find((s) => s.team === team);
  if (!t) return null;
  return `${t.wins}–${t.losses}${t.ties ? `–${t.ties}` : ""}`;
}

/** Unreminded games starting in the next two days; the caller narrows to "tomorrow". */
export async function getUpcomingUnreminded(now: Date): Promise<Game[]> {
  const until = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const { data, error } = await db()
    .from(T.games)
    .select(GAME_SELECT)
    .is("reminder_sent_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString());
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
}
