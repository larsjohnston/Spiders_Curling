import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { T } from "@/lib/config";
import { getUpcomingUnreminded } from "@/lib/data";
import { getSubscriptions, sendPush } from "@/lib/push";
import { gamesDueForReminder, reminderMessage } from "@/lib/reminder";
import { syncLeague } from "@/lib/leagueRun";

// Called hourly by a Supabase pg_cron job (see supabase/migrations/0003_story_and_hourly_cron.sql)
// with `Authorization: Bearer $CRON_SECRET`. Syncs the league sheet, then sends the 7pm night-before
// reminder to the lineup only.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ?dry=1: report what a league sync would change, without changing anything or sending reminders.
  if (new URL(request.url).searchParams.get("dry") === "1") {
    try {
      return NextResponse.json({ dryRun: true, league: await syncLeague(now, { dryRun: true }) });
    } catch (e) {
      return NextResponse.json({ dryRun: true, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  // Pull the league sheet first so reminders use the latest time/sheet. A sync failure (sheet down,
  // layout changed) is reported but never blocks reminders.
  let league: string[] | { error: string };
  try {
    league = await syncLeague(now);
  } catch (e) {
    console.error("League sync failed", e);
    league = { error: e instanceof Error ? e.message : String(e) };
  }

  // No lineup yet means nobody to remind; leave it unsent so it goes out once the lineup is set.
  const due = gamesDueForReminder(await getUpcomingUnreminded(now), now).filter((g) => g.lineup.length > 0);
  if (due.length === 0) return NextResponse.json({ games: 0, sent: 0, league });

  const subs = await getSubscriptions();
  let sent = 0;
  for (const game of due) {
    const playing = new Set(game.lineup.map((s) => s.player.id));
    const recipients = subs.filter((sub) => sub.player_id && playing.has(sub.player_id));
    const results = await Promise.all(
      recipients.map((sub) => sendPush(sub, { ...reminderMessage(game, sub.player_id!), url: `/games/${game.id}` })),
    );
    sent += results.filter(Boolean).length;
    await db().from(T.games).update({ reminder_sent_at: now.toISOString() }).eq("id", game.id);
  }
  return NextResponse.json({ games: due.length, sent, league });
}
