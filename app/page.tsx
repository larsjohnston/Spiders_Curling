import Link from "next/link";
import { getGames, getLeagueSnapshot, getPlayers, type LeagueSnapshot } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { LEAGUE, TIMEZONE } from "@/lib/config";
import { formatDay, localDateKey, localInputToDate } from "@/lib/time";
import { effectiveResult, resultOf, type Game } from "@/lib/types";
import GameCard, { RESULT_STYLE } from "@/components/GameCard";
import SyncButton from "@/components/SyncButton";

// A game counts as "upcoming" until 3 hours after its start so a game in progress stays on top.
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;

export default async function SchedulePage() {
  const [games, players, unlocked, league] = await Promise.all([
    getGames(),
    getPlayers(),
    isUnlocked(),
    getLeagueSnapshot(),
  ]);
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = games.filter((g) => new Date(g.starts_at).getTime() + GAME_LENGTH_MS > now);
  const past = games.filter((g) => !upcoming.includes(g)).reverse();
  const today = localDateKey(new Date(now), TIMEZONE);
  const byes = (league?.byes ?? []).filter((d) => d >= today);

  // Upcoming games and bye weeks, in date order.
  const agenda = [
    ...upcoming.map((g) => ({ date: localDateKey(new Date(g.starts_at), TIMEZONE), game: g })),
    ...byes.map((date) => ({ date, game: null })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const nextId = upcoming[0]?.id;

  const record = { W: 0, L: 0, T: 0 };
  for (const g of games) {
    const r = effectiveResult(g);
    if (r) record[r]++;
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="text-sm text-muted">Record</div>
        <div className="text-3xl font-bold tabular-nums">
          {record.W}–{record.L}
          {record.T > 0 && `–${record.T}`}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Upcoming</h2>
        {agenda.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
            No games scheduled.{" "}
            {unlocked ? (
              <Link href="/games/new" className="text-stone-blue underline">
                Add one
              </Link>
            ) : (
              <Link href="/unlock?next=/games/new" className="text-stone-blue underline">
                Unlock to add one
              </Link>
            )}
          </p>
        )}
        {agenda.map(({ date, game }) =>
          game ? (
            <GameCard key={game.id} game={game} players={players} next={game.id === nextId} unlocked={unlocked} now={now} />
          ) : (
            <div key={date} className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              <span className="font-medium text-ink">{formatDay(localInputToDate(`${date}T12:00`, TIMEZONE), TIMEZONE)}</span> ·
              Bye week
            </div>
          ),
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Previous games</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {past.map((g) => (
              <PastRow key={g.id} game={g} />
            ))}
          </ul>
        </section>
      )}

      {league && <Standings league={league} unlocked={unlocked} />}
    </div>
  );
}

function PastRow({ game }: { game: Game }) {
  const result = effectiveResult(game);
  const scored = resultOf(game) !== null;
  return (
    <li>
      <Link href={`/games/${game.id}`} className="flex items-center gap-4 px-4 py-3 active:bg-line/50">
        <span className="flex-1 font-medium">{formatDay(new Date(game.starts_at), TIMEZONE)}</span>
        {result ? (
          <>
            <span className={`w-6 text-center text-xl font-black ${RESULT_STYLE[result]}`}>{result}</span>
            <span className={`w-14 text-right tabular-nums ${scored ? "font-semibold" : "text-xs text-muted"}`}>
              {scored ? `${game.our_score}–${game.their_score}` : "league"}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">No score</span>
        )}
        <span aria-hidden className="text-muted">
          ›
        </span>
      </Link>
    </li>
  );
}

function Standings({ league, unlocked }: { league: LeagueSnapshot; unlocked: boolean }) {
  const synced = new Date(league.syncedAt).toLocaleString("en-CA", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Division {LEAGUE.division} standings</h2>
      <table className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pl-4 text-left font-medium">Team</th>
            <th className="w-10 font-medium">W</th>
            <th className="w-10 font-medium">L</th>
            <th className="w-10 font-medium">T</th>
            <th className="w-14 pr-4 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {league.standings.map((t, i) => {
            const us = t.team === LEAGUE.team;
            return (
              <tr key={t.team} className={`border-b border-line last:border-0 ${us ? "bg-stone-blue/10 font-semibold" : ""}`}>
                <td className="py-2 pl-4">
                  <span className="mr-2 inline-block w-4 text-muted">{i + 1}</span>
                  {us ? "Spiders" : t.team}
                </td>
                <td className="text-center">{t.wins}</td>
                <td className="text-center">{t.losses}</td>
                <td className="text-center">{t.ties}</td>
                <td className="pr-4 text-right">{t.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-start justify-between gap-3 text-xs text-muted">
        <p>
          League sheet{league.asOf ? ` as of ${league.asOf}` : ""} · synced {synced}. Win 10 · Tie 6 · Loss 2 pts.
        </p>
        {unlocked && <SyncButton />}
      </div>
    </section>
  );
}
