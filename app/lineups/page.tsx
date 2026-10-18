import { getGames, getPlayers } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { statusesFor } from "@/lib/types";
import LineupMatrix from "./LineupMatrix";

export default async function LineupsPage() {
  await unlockedOrRedirect("/lineups");
  const [games, players] = await Promise.all([getGames(), getPlayers()]);
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = games
    .filter((g) => new Date(g.starts_at).getTime() > now)
    .map((g) => {
      const start = new Date(g.starts_at);
      return {
        id: g.id,
        label: formatDay(start, TIMEZONE).replace(/^\w+, /, ""), // "Oct 20"
        sub: `${formatTime(start, TIMEZONE)} ${g.opponent.split(",")[0]}`,
        status: statusesFor(g),
      };
    });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lineups</h1>
        <p className="text-sm text-muted">
          Tap a box to cycle it. Players can still mark themselves out, and the team gets a push when they do.
        </p>
      </div>
      <LineupMatrix games={upcoming} players={players} />
    </div>
  );
}
