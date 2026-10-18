import Link from "next/link";
import { getGames, getPlayers } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { resultOf, type Game, type Player } from "@/lib/types";
import GameLineup from "@/components/GameLineup";

// A game counts as "upcoming" until 3 hours after its start so a game in progress stays on top.
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;

export default async function SchedulePage() {
  const [games, players, unlocked] = await Promise.all([getGames(), getPlayers(), isUnlocked()]);
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
          <GameCard key={g.id} game={g} players={players} next={i === 0} unlocked={unlocked} now={now} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Results</h2>
          {past.map((g) => (
            <GameCard key={g.id} game={g} players={players} next={false} unlocked={unlocked} now={now} />
          ))}
        </section>
      )}
    </div>
  );
}

const RESULT_STYLE = { W: "text-green-600", L: "text-stone-red", T: "text-muted" } as const;

function GameCard({
  game,
  players,
  next,
  unlocked,
  now,
}: {
  game: Game;
  players: Player[];
  next: boolean;
  unlocked: boolean;
  now: number;
}) {
  const start = new Date(game.starts_at);
  const started = start.getTime() <= now;
  const result = resultOf(game);
  return (
    <article className={`rounded-xl border bg-card p-4 ${next ? "border-stone-blue" : "border-line"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted">
            {formatDay(start, TIMEZONE)} · {formatTime(start, TIMEZONE)}
            {game.sheet && ` · Sheet ${game.sheet}`}
          </div>
          <div className="truncate text-lg font-semibold">vs {game.opponent}</div>
          {game.notes && <p className="mt-1 text-sm text-muted">{game.notes}</p>}
        </div>
        {result ? (
          <div className="shrink-0 text-center leading-none">
            <div className={`text-5xl font-black ${RESULT_STYLE[result]}`}>{result}</div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-muted">
              {game.our_score}–{game.their_score}
            </div>
          </div>
        ) : next ? (
          <span className="rounded-full bg-stone-blue px-2 py-0.5 text-xs font-semibold text-white">Next</span>
        ) : null}
      </div>
      <GameLineup game={game} players={players} canMarkAway={!started} />
      {unlocked && (
        <div className="mt-3 flex gap-2 text-sm">
          <Link href={`/games/${game.id}/edit`} className="btn-ghost py-1.5">
            Edit
          </Link>
          {started && (
            <Link href={`/games/${game.id}/score`} className={result ? "btn-ghost py-1.5" : "btn py-1.5"}>
              {result ? "Change score" : "Enter score"}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
