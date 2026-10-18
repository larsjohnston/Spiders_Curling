import Link from "next/link";
import { getGames, getLeagueConfig, getLeagueSnapshot, getPlayers, leagueRecord } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { TIMEZONE } from "@/lib/config";
import { formatDay, localDateKey, localInputToDate } from "@/lib/time";
import { availableCount, effectiveResult, resultOf, TEAM_SIZE, type Game } from "@/lib/types";
import GameCard, { RESULT_STYLE } from "@/components/GameCard";
import BeerBadge from "@/components/BeerBadge";
import { scoutingReport } from "@/lib/scouting";

// A game counts as "upcoming" until 3 hours after its start so a game in progress stays on top.
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;

export default async function SchedulePage() {
  const [games, players, unlocked, league, config] = await Promise.all([
    getGames(),
    getPlayers(),
    isUnlocked(),
    getLeagueSnapshot(),
    getLeagueConfig(),
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
  const jugs = games.reduce((n, g) => n + (g.jugs ?? 0), 0);

  // Games that haven't started yet with fewer than four people still available.
  const shortGames = upcoming
    .filter((g) => new Date(g.starts_at).getTime() > now)
    .map((g) => ({ game: g, available: availableCount(g, players) }))
    .filter((s) => s.available < TEAM_SIZE);

  return (
    <div className="space-y-6">
      {shortGames.length > 0 && (
        <div role="status" className="space-y-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-white">
          {shortGames.map(({ game, available }) => (
            <Link key={game.id} href={`/games/${game.id}`} className="block">
              ⚠️ {formatDay(new Date(game.starts_at), TIMEZONE)} vs {game.opponent}: only {available} available, need{" "}
              {TEAM_SIZE}. ›
            </Link>
          ))}
        </div>
      )}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-muted">Record</div>
            <div className="text-3xl font-bold tabular-nums">
              {record.W}–{record.L}
              {record.T > 0 && `–${record.T}`}
            </div>
          </div>
          {jugs > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted">Jugs this season</div>
              <div className="text-3xl font-bold tabular-nums">🍺 {jugs}</div>
            </div>
          )}
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
            <GameCard
              key={game.id}
              game={game}
              players={players}
              next={game.id === nextId}
              unlocked={unlocked}
              now={now}
              opponentRecord={leagueRecord(league, game.opponent)}
              scouting={scoutingReport(game.opponent, config.team, league)}
            />
          ) : (
            <div
              key={date}
              className="flex items-center gap-4 rounded-xl border-2 border-stone-blue bg-stone-blue/10 px-4 py-4"
            >
              <span className="text-3xl" aria-hidden>
                🛋️
              </span>
              <div>
                <div className="text-sm font-medium text-muted">
                  {formatDay(localInputToDate(`${date}T12:00`, TIMEZONE), TIMEZONE)}
                </div>
                <div className="text-xl font-black tracking-wide text-stone-blue">BYE WEEK</div>
                <div className="text-sm text-muted">No game this week</div>
              </div>
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
            <span className="w-12 text-right">
              <BeerBadge jugs={game.jugs} size="sm" />
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
