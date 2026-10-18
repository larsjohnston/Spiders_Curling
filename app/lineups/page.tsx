import { getGames, getLeagueSnapshot, getPlayers, leagueRecord } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { statusesFor } from "@/lib/types";
import LineupMatrix from "./LineupMatrix";

export default async function LineupsPage() {
  await unlockedOrRedirect("/lineups");
  const [games, players, league] = await Promise.all([getGames(), getPlayers(), getLeagueSnapshot()]);
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  // Games each player has already played: in the lineup of a game that's started, and not marked out of it.
  const played: Record<string, number> = {};
  for (const g of games.filter((g) => new Date(g.starts_at).getTime() <= now)) {
    for (const s of g.lineup) {
      if (!g.away.includes(s.player.id)) played[s.player.id] = (played[s.player.id] ?? 0) + 1;
    }
  }

  const upcoming = games
    .filter((g) => new Date(g.starts_at).getTime() > now)
    .map((g) => {
      const start = new Date(g.starts_at);
      return {
        id: g.id,
        label: formatDay(start, TIMEZONE),
        time: formatTime(start, TIMEZONE),
        opponent: g.opponent,
        record: leagueRecord(league, g.opponent),
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
      <LineupMatrix games={upcoming} players={players} played={played} />
    </div>
  );
}
