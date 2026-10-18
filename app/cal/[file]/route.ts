import type { NextRequest } from "next/server";
import { getGames, getPlayers } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";

// Subscribable calendar: /cal/spiders.ics for the team, /cal/<playerId>.ics personalised for one player.
// Phones and Outlook re-fetch it on their own, so league changes show up without anyone doing anything.
export async function GET(request: NextRequest, ctx: RouteContext<"/cal/[file]">) {
  const { file } = await ctx.params;
  const name = file.replace(/\.ics$/, "");
  const [games, players] = await Promise.all([getGames(), getPlayers()]);
  const playerId = players.some((p) => p.id === name) ? name : null;
  const body = buildCalendar(games, { siteUrl: new URL(request.url).origin, playerId });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${playerId ? "spiders-me" : "spiders"}.ics"`,
      // Calendar apps poll this; let Vercel's edge serve it for 15 min and refresh in the background.
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
