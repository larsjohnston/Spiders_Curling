import "server-only";
import { db } from "./db";
import type { Game, LineupSpot, Player } from "./types";
import type { Position } from "./config";

const GAME_SELECT =
  "id, starts_at, opponent, sheet, notes, our_score, their_score, reminder_sent_at, game_players(position, players(id, name, sort_order, active))";

type GameRow = Omit<Game, "lineup"> & {
  game_players: { position: Position; players: Player }[];
};

function toGame(row: GameRow): Game {
  const { game_players, ...rest } = row;
  const lineup: LineupSpot[] = game_players.map((gp) => ({ position: gp.position, player: gp.players }));
  return { ...rest, lineup };
}

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  let q = db().from("players").select("id, name, sort_order, active").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getGames(): Promise<Game[]> {
  const { data, error } = await db().from("games").select(GAME_SELECT).order("starts_at");
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await db().from("games").select(GAME_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as unknown as GameRow) : null;
}

/** Unreminded games starting in the next two days; the caller narrows to "tomorrow". */
export async function getUpcomingUnreminded(now: Date): Promise<Game[]> {
  const until = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const { data, error } = await db()
    .from("games")
    .select(GAME_SELECT)
    .is("reminder_sent_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString());
  if (error) throw error;
  return (data as unknown as GameRow[]).map(toGame);
}
