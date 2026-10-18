import Link from "next/link";
import { getGames } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { resultOf, type Game } from "@/lib/types";
import Lineup from "@/components/Lineup";

// A game counts as "upcoming" until 3 hours after its start so a game in progress stays on top.
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;

export default async function SchedulePage() {
  const [games, unlocked] = await Promise.all([getGames(), isUnlocked()]);
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = games.filter((g) => new Date(g.starts_at).getTime() + GAME_LENGTH_MS > now);
  const past = games.filter((g) => !upcoming.includes(g)).reverse();

  const record = { W: 0, L: 0, T: 0 };
  for (const g of games) {
    const r = resultOf(g);
    if (r) record[r]++;
  }

  return (
    <div className="space-y-6">
      <section className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted">Record</div>
          <div className="text-3xl font-bold tabular-nums">
            {record.W}–{record.L}
            {record.T > 0 && `–${record.T}`}
          </div>
        </div>
        {unlocked && (
          <Link href="/games/new" className="btn">
            + Add game
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Upcoming</h2>
        {upcoming.length === 0 && (
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
        {upcoming.map((g, i) => (
          <UpcomingCard key={g.id} game={g} next={i === 0} unlocked={unlocked} now={now} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Results</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {past.map((g) => (
              <PastRow key={g.id} game={g} unlocked={unlocked} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UpcomingCard({ game, next, unlocked, now }: { game: Game; next: boolean; unlocked: boolean; now: number }) {
  const start = new Date(game.starts_at);
  return (
    <article className={`rounded-xl border bg-card p-4 ${next ? "border-stone-blue" : "border-line"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">
            {formatDay(start, TIMEZONE)} · {formatTime(start, TIMEZONE)}
            {game.sheet && ` · Sheet ${game.sheet}`}
          </div>
          <div className="text-lg font-semibold">vs {game.opponent}</div>
          {game.notes && <p className="mt-1 text-sm text-muted">{game.notes}</p>}
        </div>
        {next && <span className="rounded-full bg-stone-blue px-2 py-0.5 text-xs font-semibold text-white">Next</span>}
      </div>
      <Lineup lineup={game.lineup} />
      {unlocked && (
        <div className="mt-3 flex gap-2 text-sm">
          <Link href={`/games/${game.id}/edit`} className="btn-ghost py-1.5">
            Edit
          </Link>
          {start.getTime() <= now && (
            <Link href={`/games/${game.id}/score`} className="btn-ghost py-1.5">
              Enter score
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function PastRow({ game, unlocked }: { game: Game; unlocked: boolean }) {
  const start = new Date(game.starts_at);
  const result = resultOf(game);
  const color = result === "W" ? "bg-green-600" : result === "L" ? "bg-stone-red" : "bg-slate-500";
  const body = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          result ? color : "bg-line text-muted"
        }`}
      >
        {result ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">vs {game.opponent}</div>
        <div className="text-xs text-muted">{formatDay(start, TIMEZONE)}</div>
        <Lineup lineup={game.lineup} compact />
      </div>
      <div className="text-right text-lg font-semibold tabular-nums">
        {result ? `${game.our_score}–${game.their_score}` : <span className="text-sm text-stone-blue">Add score</span>}
      </div>
    </div>
  );
  return <li>{unlocked ? <Link href={`/games/${game.id}/score`}>{body}</Link> : body}</li>;
}
