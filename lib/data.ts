import "server-only";
import { db } from "./db";
import type { Game, LineupSpot, Player } from "./types";
import { T, type Position } from "./config";

const GAME_SELECT =
  "id, starts_at, opponent, sheet, notes, our_score, their_score, story, reminder_sent_at, curling_game_players(position, curling_players(id, name, sort_order, active, photo_url)), curling_away(player_id)";

type GameRow = Omit<Game, "lineup"> & {
  curling_game_players: { position: Position; curling_players: Player }[];
  curling_away: { player_id: string }[];
};

function toGame(row: GameRow): Game {
  const { curling_game_players, curling_away, ...rest } = row;
  const lineup: LineupSpot[] = curling_game_players.map((gp) => ({ position: gp.position, player: gp.curling_players }));
  return { ...rest, lineup, away: curling_away.map((a) => a.player_id) };
}

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  let q = db().from(T.players).select("id, name, sort_order, active, photo_url").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getGames(): Promise<Game[]> {
  const { data, error } = await db().from(T.games).select(GAME_SELECT).order("starts_at");
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await db().from(T.games).select(GAME_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as unknown as GameRow) : null;
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
