import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUpcomingUnreminded } from "@/lib/data";
import { getSubscriptions, sendPush } from "@/lib/push";
import { gamesDueForReminder, reminderMessage } from "@/lib/reminder";

// Called daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = gamesDueForReminder(await getUpcomingUnreminded(now), now);
  if (due.length === 0) return NextResponse.json({ games: 0, sent: 0 });

  const subs = await getSubscriptions();
  let sent = 0;
  for (const game of due) {
    const results = await Promise.all(
      subs.map((sub) => sendPush(sub, { ...reminderMessage(game, sub.player_id), url: "/" })),
    );
    sent += results.filter(Boolean).length;
    await db().from("games").update({ reminder_sent_at: now.toISOString() }).eq("id", game.id);
  }
  return NextResponse.json({ games: due.length, sent });
}
