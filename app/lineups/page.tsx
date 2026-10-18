import { getGames, getLeagueSnapshot, getPlayers, leagueRecord } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { effectiveResult, statusesFor } from "@/lib/types";
import LineupMatrix from "./LineupMatrix";

export default async function LineupsPage() {
  await unlockedOrRedirect("/lineups");
  const [games, players, league] = await Promise.all([getGames(), getPlayers(), getLeagueSnapshot()]);
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // The whole season in date order; past games stay editable so who-played can be corrected.
  const rows = games.map((g) => {
    const start = new Date(g.starts_at);
    return {
      id: g.id,
      label: formatDay(start, TIMEZONE),
      time: formatTime(start, TIMEZONE),
      opponent: g.opponent,
      record: leagueRecord(league, g.opponent),
      past: start.getTime() <= now,
      result: effectiveResult(g),
      status: statusesFor(g),
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lineups</h1>
        <p className="text-sm text-muted">
          Tap a box to cycle it. Players can still mark themselves out, and the team gets a push when they do. Past
          games can be corrected too.
        </p>
      </div>
      <LineupMatrix games={rows} players={players} />
    </div>
  );
}
