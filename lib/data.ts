import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { Game, LineupSpot, Player, Result } from "./types";
import type { LeagueWeek } from "./league";
import { DEFAULT_LEAGUE, T, type LeagueConfig, type Position } from "./config";

const GAME_SELECT =
  "id, season, starts_at, opponent, sheet, notes, our_score, their_score, story, jugs, ends, league_result, reminder_sent_at, curling_game_players(position, curling_players(id, name, sort_order, active, photo_url)), curling_away(player_id, excuse)";

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

// Every read below is wrapped in React's cache(), so the layout and the page (and anything else in
// the same request) share one database round trip per query instead of repeating it.

/** The two league rows (config + last sync snapshot) in one query; most pages need both. */
const getLeagueRows = cache(async (): Promise<Record<string, unknown>> => {
  const { data, error } = await db().from(T.league).select("key, data").in("key", ["config", "snapshot"]);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.key, r.data]));
});

/** Which league sheet and season the app is following (set on the Season page). */
export async function getLeagueConfig(): Promise<LeagueConfig> {
  const rows = await getLeagueRows();
  return { ...DEFAULT_LEAGUE, ...((rows.config as Partial<LeagueConfig> | undefined) ?? {}) };
}

/** Active players only unless asked; callers pass exactly `true` or nothing so the cache key is stable. */
export const getPlayers = cache(async (includeInactive?: true): Promise<Player[]> => {
  let q = db().from(T.players).select("id, name, sort_order, active, photo_url").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

/**
 * Every game the team has ever played, in one query. The table is tiny (one row a week), so one
 * round trip for all seasons beats a round trip to look up the season and then another for its games.
 */
const getAllGames = cache(async (): Promise<Game[]> => {
  const { data, error } = await db().from(T.games).select(GAME_SELECT).order("starts_at");
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
});

/** This season's games (or another season's, by name). */
export async function getGames(season?: string): Promise<Game[]> {
  const [games, s] = await Promise.all([getAllGames(), season ?? getLeagueConfig().then((c) => c.season)]);
  return games.filter((g) => g.season === s);
}

/** Record for every season, newest first, for the season history list. */
export async function getSeasonRecords(): Promise<{ season: string; games: Pick<Game, "our_score" | "their_score" | "league_result" | "jugs">[] }[]> {
  const bySeason = new Map<string, Game[]>();
  for (const g of [...(await getAllGames())].reverse()) {
    if (!bySeason.has(g.season)) bySeason.set(g.season, []);
    bySeason.get(g.season)!.push(g);
  }
  return [...bySeason].map(([season, games]) => ({ season, games }));
}

export const getGame = cache(async (id: string): Promise<Game | null> => {
  const { data, error } = await db().from(T.games).select(GAME_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as unknown as GameRow) : null;
});

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
  return ((await getLeagueRows()).snapshot as LeagueSnapshot | undefined) ?? null;
}

/** Same, but straight from the database: for code that runs after a sync in the same request. */
export async function getLeagueSnapshotFresh(): Promise<LeagueSnapshot | null> {
  const { data, error } = await db().from(T.league).select("data").eq("key", "snapshot").maybeSingle();
  if (error) throw error;
  return (data?.data as LeagueSnapshot | undefined) ?? null;
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
