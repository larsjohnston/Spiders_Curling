import Link from "next/link";
import { getGames, getPlayers } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { TIMEZONE } from "@/lib/config";
import { formatDay } from "@/lib/time";
import { resultOf, type Game } from "@/lib/types";
import GameCard, { RESULT_STYLE } from "@/components/GameCard";

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
      <section>
        <div className="text-sm text-muted">Record</div>
        <div className="text-3xl font-bold tabular-nums">
          {record.W}–{record.L}
          {record.T > 0 && `–${record.T}`}
        </div>
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
  const result = resultOf(game);
  return (
    <li>
      <Link href={`/games/${game.id}`} className="flex items-center gap-4 px-4 py-3 active:bg-line/50">
        <span className="flex-1 font-medium">{formatDay(new Date(game.starts_at), TIMEZONE)}</span>
        {result ? (
          <>
            <span className={`w-6 text-center text-xl font-black ${RESULT_STYLE[result]}`}>{result}</span>
            <span className="w-14 text-right font-semibold tabular-nums">
              {game.our_score}–{game.their_score}
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
