import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { T } from "@/lib/config";
import { getUpcomingUnreminded } from "@/lib/data";
import { getSubscriptions, sendPush } from "@/lib/push";
import { gamesDueForReminder, reminderMessage } from "@/lib/reminder";

// Called hourly by a Supabase pg_cron job (see supabase/migrations/0003_story_and_hourly_cron.sql)
// with `Authorization: Bearer $CRON_SECRET`. Sends at 7pm local the night before, to the lineup only.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // No lineup yet means nobody to remind; leave it unsent so it goes out once the lineup is set.
  const due = gamesDueForReminder(await getUpcomingUnreminded(now), now).filter((g) => g.lineup.length > 0);
  if (due.length === 0) return NextResponse.json({ games: 0, sent: 0 });

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
  return NextResponse.json({ games: due.length, sent });
}
