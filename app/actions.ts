"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { lock, requireUnlocked, unlock } from "@/lib/auth";
import { PHOTO_BUCKET, POSITIONS, T, TIMEZONE } from "@/lib/config";
import { localInputToDate } from "@/lib/time";
import { getGame, getLeagueConfig, getPlayers } from "@/lib/data";
import { getSubscriptions, sendPush } from "@/lib/push";
import { availabilityMessage, resultMessage } from "@/lib/reminder";
import { EXCUSE_MAX } from "@/lib/excuses";
import { availableCount, resultOf, type PlayerStatus } from "@/lib/types";
import { previewSheet, syncLeague, type SheetPreview } from "@/lib/leagueRun";
import { normalizeSheetUrl } from "@/lib/league";

export type FormState = { error?: string; ok?: string };

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function unlockAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await unlock(str(form, "pin")))) return { error: "Wrong PIN" };
  redirect(safeNext(str(form, "next")));
}

export async function lockAction(): Promise<void> {
  await lock();
  revalidatePath("/", "layout");
}

export async function saveGame(_: FormState, form: FormData): Promise<FormState> {
  await requireUnlocked();
  const id = str(form, "id");
  const opponent = str(form, "opponent");
  const when = str(form, "starts_at");
  if (!opponent) return { error: "Opponent is required" };
  if (!when) return { error: "Date and time are required" };

  let startsAt: Date;
  try {
    startsAt = localInputToDate(when, TIMEZONE);
  } catch {
    return { error: "Invalid date/time" };
  }

  // One status_<playerId> field per player: play | sub | away.
  const statuses = [...form.entries()]
    .filter(([key]) => key.startsWith("status_"))
    .map(([key, value]) => ({ player_id: key.slice("status_".length), status: String(value) }));
  const playing = statuses.filter((s) => s.status === "play").map((s) => s.player_id);
  const away = statuses.filter((s) => s.status === "away").map((s) => s.player_id);
  if (playing.length > POSITIONS.length) return { error: `Only ${POSITIONS.length} can play` };
  // Positions rotate, so slots are just filled in roster order.
  const lineup = playing.map((player_id, i) => ({ position: POSITIONS[i], player_id }));

  const fields = {
    opponent,
    starts_at: startsAt.toISOString(),
    sheet: str(form, "sheet") || null,
    notes: str(form, "notes") || null,
  };

  let gameId = id;
  if (id) {
    const existing = await getGame(id);
    if (!existing) return { error: "Game not found" };
    // Moving the game re-arms its day-before reminder.
    const moved = new Date(existing.starts_at).getTime() !== startsAt.getTime();
    const { error } = await db()
      .from(T.games)
      .update(moved ? { ...fields, reminder_sent_at: null } : fields)
      .eq("id", id);
    if (error) return { error: error.message };
    const del = await db().from(T.gamePlayers).delete().eq("game_id", id);
    if (del.error) return { error: del.error.message };
  } else {
    const { data, error } = await db().from(T.games).insert(fields).select("id").single();
    if (error) return { error: error.message };
    gameId = data.id;
  }

  if (lineup.length) {
    const { error } = await db()
      .from(T.gamePlayers)
      .insert(lineup.map((s) => ({ ...s, game_id: gameId })));
    if (error) return { error: error.message };
  }

  const clear = await db().from(T.away).delete().eq("game_id", gameId);
  if (clear.error) return { error: clear.error.message };
  if (away.length) {
    const { error } = await db()
      .from(T.away)
      .insert(away.map((player_id) => ({ game_id: gameId, player_id })));
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteGame(id: string): Promise<void> {
  await requireUnlocked();
  const { error } = await db().from(T.games).delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}

/** Anyone can enter a score (no PIN). A new or changed result is pushed to the whole team. */
export async function saveScore(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const story = str(form, "story").slice(0, 2000) || null;
  const ours = str(form, "our_score");
  const theirs = str(form, "their_score");
  const parse = (v: string) => (v === "" ? null : Number(v));
  const our = parse(ours);
  const their = parse(theirs);
  for (const v of [our, their]) {
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > 99)) return { error: "Scores must be whole numbers" };
  }
  if ((our === null) !== (their === null)) return { error: "Enter both scores (or clear both)" };
  const jugs = parse(str(form, "jugs"));
  if (jugs !== null && (!Number.isInteger(jugs) || jugs < 0 || jugs > 99)) return { error: "Jugs must be 0–99" };

  const before = await getGame(id);
  if (!before) return { error: "Game not found" };
  if (new Date(before.starts_at).getTime() > Date.now()) return { error: "This game hasn't started yet" };
  // The league sheet is the source of truth for W/L/T; don't let the app contradict it.
  const entered = resultOf({ our_score: our, their_score: their });
  if (entered && before.league_result && entered !== before.league_result) {
    const word = { W: "win", L: "loss", T: "tie" }[before.league_result];
    return { error: `The league has this game as a ${word}. Check the score with the skip.` };
  }

  const { error } = await db().from(T.games).update({ our_score: our, their_score: their, story, jugs }).eq("id", id);
  if (error) return { error: error.message };

  // Topping up the jug count alone doesn't re-announce the result.
  const changed = before.our_score !== our || before.their_score !== their || (before.story ?? null) !== story;
  if (changed && our !== null && their !== null) {
    const after = { ...before, our_score: our, their_score: their, story, jugs };
    const message = { ...resultMessage(after), url: `/games/${id}` };
    await Promise.all((await getSubscriptions()).map((sub) => sendPush(sub, message)));
  }

  revalidatePath("/");
  redirect(`/games/${id}`);
}

export async function saveRoster(_: FormState, form: FormData): Promise<FormState> {
  await requireUnlocked();
  const ids = form.getAll("id").map(String);
  // Check everything before writing anything, so an error never leaves half the roster saved.
  if (ids.some((id) => !str(form, `name_${id}`))) return { error: "Names can't be blank" };
  for (const [i, id] of ids.entries()) {
    const name = str(form, `name_${id}`);
    const { error } = await db()
      .from(T.players)
      .update({ name, active: form.get(`active_${id}`) === "on", sort_order: i + 1 })
      .eq("id", id);
    if (error) return { error: error.message };
  }
  const newName = str(form, "new_name");
  if (newName) {
    const { error } = await db().from(T.players).insert({ name: newName, sort_order: ids.length + 1 });
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: "Roster saved" };
}

export type SeasonState = FormState & { preview?: SheetPreview };

function seasonInput(form: FormData) {
  return {
    season: str(form, "season"),
    sheetUrl: normalizeSheetUrl(str(form, "sheetUrl")),
    team: str(form, "team"),
    division: str(form, "division").toUpperCase(),
    scheduleGid: str(form, "scheduleGid") || undefined,
    divisionGid: str(form, "divisionGid") || undefined,
  };
}

/** Season page, step 1: read a new league sheet and show what the app would pull from it. */
export async function previewSeason(_: SeasonState, form: FormData): Promise<SeasonState> {
  await requireUnlocked();
  const input = seasonInput(form);
  if (!input.sheetUrl) return { error: "Paste the league's published Google Sheet link (docs.google.com/spreadsheets/d/e/…)" };
  if (!input.season || !input.team || !input.division) return { error: "Season name, team and division are required" };
  try {
    return { preview: await previewSheet({ ...input, sheetUrl: input.sheetUrl }) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Season page, step 2: switch to the new sheet. Old games keep their season label (history stays),
 * the roster and photos carry over, and the new schedule is pulled in right away.
 */
export async function startSeason(_: SeasonState, form: FormData): Promise<SeasonState> {
  await requireUnlocked();
  const input = seasonInput(form);
  if (!input.sheetUrl) return { error: "Missing sheet link" };
  const current = await getLeagueConfig();
  if (input.season === current.season) return { error: `"${input.season}" is the current season. Give the new one a new name.` };
  let preview: SheetPreview;
  try {
    preview = await previewSheet({ ...input, sheetUrl: input.sheetUrl });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  const saved = await db()
    .from(T.league)
    .upsert({ key: "config", data: preview.config, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (saved.error) return { error: saved.error.message };
  await db().from(T.league).delete().eq("key", "snapshot");
  try {
    const log = await syncLeague(new Date(), { config: preview.config });
    revalidatePath("/", "layout");
    return { ok: `${preview.config.season} started: ${log.filter((l) => l.startsWith("Added")).length} games added.` };
  } catch (e) {
    revalidatePath("/", "layout");
    return { error: `Season saved, but the first sync failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Pull the league sheet now instead of waiting for the hourly job. */
export async function syncLeagueNow(): Promise<FormState> {
  await requireUnlocked();
  try {
    const log = await syncLeague();
    revalidatePath("/");
    return { ok: log.length ? log.join(" · ") : "Already up to date" };
  } catch (e) {
    return { error: `Sync failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** A player marking themselves away (or back in) for one game. No PIN: it's their own availability. */
export async function setAway(
  gameId: string,
  playerId: string,
  away: boolean,
  excuse?: string | null,
): Promise<FormState> {
  const [game, players] = await Promise.all([getGame(gameId), getPlayers()]);
  if (!game) return { error: "Game not found" };
  if (game.away.includes(playerId) === away) return {}; // double tap: nothing changed, nothing to announce
  const why = excuse?.trim().slice(0, EXCUSE_MAX) || null;
  const { error } = away
    ? await db()
        .from(T.away)
        .upsert({ game_id: gameId, player_id: playerId, excuse: why }, { onConflict: "game_id,player_id" })
    : await db().from(T.away).delete().eq("game_id", gameId).eq("player_id", playerId);
  if (error) return { error: error.message };

  // Once the manager has set a lineup, the whole team hears about changes (except the person who made it).
  const player = players.find((p) => p.id === playerId);
  if (player && game.lineup.length > 0 && new Date(game.starts_at).getTime() > Date.now()) {
    const after = { ...game, away: away ? [...game.away, playerId] : game.away.filter((id) => id !== playerId) };
    const message = {
      ...availabilityMessage(game, player, away, availableCount(after, players), players.length, why),
      url: `/games/${gameId}`,
    };
    const others = (await getSubscriptions()).filter((sub) => sub.player_id !== playerId);
    await Promise.all(others.map((sub) => sendPush(sub, message)));
  }

  revalidatePath("/");
  return {};
}

/** Manager's lineup grid: set one player's status for one game (+ playing, " available, − unavailable). */
export async function setPlayerStatus(gameId: string, playerId: string, status: PlayerStatus): Promise<FormState> {
  await requireUnlocked();
  const game = await getGame(gameId);
  if (!game) return { error: "Game not found" };
  const spot = game.lineup.find((s) => s.player.id === playerId);

  if (status === "play" && !spot) {
    const taken = new Set(game.lineup.map((s) => s.position));
    const free = POSITIONS.find((p) => !taken.has(p));
    if (!free) return { error: `Already ${POSITIONS.length} playing` };
    const { error } = await db().from(T.gamePlayers).insert({ game_id: gameId, player_id: playerId, position: free });
    if (error) return { error: error.message };
  }
  if (status !== "play" && spot) {
    const { error } = await db().from(T.gamePlayers).delete().eq("game_id", gameId).eq("player_id", playerId);
    if (error) return { error: error.message };
  }
  const { error } =
    status === "away"
      ? await db().from(T.away).upsert({ game_id: gameId, player_id: playerId }, { onConflict: "game_id,player_id" })
      : await db().from(T.away).delete().eq("game_id", gameId).eq("player_id", playerId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

/** Expects a small JPEG already resized in the browser. */
export async function uploadPhoto(form: FormData): Promise<FormState> {
  await requireUnlocked();
  const id = str(form, "id");
  const file = form.get("photo");
  if (!id || !(file instanceof File) || file.size === 0) return { error: "No photo" };
  if (file.type !== "image/jpeg" || file.size > 1024 * 1024) return { error: "Photo must be a JPEG under 1 MB" };

  // New name each time so phones don't keep showing a cached old photo.
  const path = `${id}/${Date.now()}.jpg`;
  const storage = db().storage.from(PHOTO_BUCKET);
  const { error } = await storage.upload(path, file, { contentType: "image/jpeg" });
  if (error) return { error: error.message };

  const { data: old } = await db().from(T.players).select("photo_url").eq("id", id).single();
  const url = storage.getPublicUrl(path).data.publicUrl;
  const upd = await db().from(T.players).update({ photo_url: url }).eq("id", id);
  if (upd.error) return { error: upd.error.message };

  const oldPath = old?.photo_url?.split(`/${PHOTO_BUCKET}/`)[1];
  if (oldPath) await storage.remove([oldPath]);

  revalidatePath("/", "layout");
  return { ok: "Photo saved" };
}

type SubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function subscribe(sub: SubscriptionJSON, playerId: string | null): Promise<FormState> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Invalid subscription" };
  const { error } = await db()
    .from(T.subscriptions)
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, player_id: playerId || null },
      { onConflict: "endpoint" },
    );
  return error ? { error: error.message } : { ok: "Subscribed" };
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await db().from(T.subscriptions).delete().eq("endpoint", endpoint);
}

/** Sends a test push to just this device. */
export async function sendTest(endpoint: string): Promise<FormState> {
  const { data: sub, error } = await db()
    .from(T.subscriptions)
    .select("id, player_id, endpoint, p256dh, auth")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!sub) return { error: "This device isn't subscribed" };

  const ok = await sendPush(sub, {
    title: "Spiders notifications are on 🥌",
    body: "You'll get a reminder the evening before each game.",
    url: "/",
  });
  return ok ? { ok: "Sent — check your notifications" } : { error: "Push failed. Try turning notifications off and on." };
}
