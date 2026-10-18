"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { lock, requireUnlocked, unlock } from "@/lib/auth";
import { POSITIONS, TIMEZONE } from "@/lib/config";
import { localInputToDate } from "@/lib/time";
import { getGame } from "@/lib/data";
import { sendPush } from "@/lib/push";

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

  const lineup = POSITIONS.map((position) => ({ position, player_id: str(form, `pos_${position}`) })).filter(
    (s) => s.player_id,
  );
  if (new Set(lineup.map((s) => s.player_id)).size !== lineup.length) {
    return { error: "A player can only be in one position" };
  }

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
      .from("games")
      .update(moved ? { ...fields, reminder_sent_at: null } : fields)
      .eq("id", id);
    if (error) return { error: error.message };
    const del = await db().from("game_players").delete().eq("game_id", id);
    if (del.error) return { error: del.error.message };
  } else {
    const { data, error } = await db().from("games").insert(fields).select("id").single();
    if (error) return { error: error.message };
    gameId = data.id;
  }

  if (lineup.length) {
    const { error } = await db()
      .from("game_players")
      .insert(lineup.map((s) => ({ ...s, game_id: gameId })));
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteGame(id: string): Promise<void> {
  await requireUnlocked();
  const { error } = await db().from("games").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}

export async function saveScore(_: FormState, form: FormData): Promise<FormState> {
  await requireUnlocked();
  const id = str(form, "id");
  const ours = str(form, "our_score");
  const theirs = str(form, "their_score");
  const parse = (v: string) => (v === "" ? null : Number(v));
  const our = parse(ours);
  const their = parse(theirs);
  for (const v of [our, their]) {
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > 99)) return { error: "Scores must be whole numbers" };
  }
  if ((our === null) !== (their === null)) return { error: "Enter both scores (or clear both)" };

  const { error } = await db().from("games").update({ our_score: our, their_score: their }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/");
}

export async function saveRoster(_: FormState, form: FormData): Promise<FormState> {
  await requireUnlocked();
  const ids = form.getAll("id").map(String);
  for (const [i, id] of ids.entries()) {
    const name = str(form, `name_${id}`);
    if (!name) return { error: "Names can't be blank" };
    const { error } = await db()
      .from("players")
      .update({ name, active: form.get(`active_${id}`) === "on", sort_order: i + 1 })
      .eq("id", id);
    if (error) return { error: error.message };
  }
  const newName = str(form, "new_name");
  if (newName) {
    const { error } = await db().from("players").insert({ name: newName, sort_order: ids.length + 1 });
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: "Roster saved" };
}

type SubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function subscribe(sub: SubscriptionJSON, playerId: string | null): Promise<FormState> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Invalid subscription" };
  const { error } = await db()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, player_id: playerId || null },
      { onConflict: "endpoint" },
    );
  return error ? { error: error.message } : { ok: "Subscribed" };
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Sends a test push to just this device. */
export async function sendTest(endpoint: string): Promise<FormState> {
  const { data: sub, error } = await db()
    .from("push_subscriptions")
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
