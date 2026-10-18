import Link from "next/link";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";
import { resultOf, type Game, type Player } from "@/lib/types";
import GameLineup from "./GameLineup";

export const RESULT_STYLE = { W: "text-green-600", L: "text-stone-red", T: "text-muted" } as const;

/** Full game card: when/where, big W/L once scored, who's playing, subs and away marks. */
export default function GameCard({
  game,
  players,
  next = false,
  unlocked,
  now,
}: {
  game: Game;
  players: Player[];
  next?: boolean;
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
        <div className="flex shrink-0 items-start gap-2">
          {result ? (
            <div className="text-center leading-none">
              <div className={`text-5xl font-black ${RESULT_STYLE[result]}`}>{result}</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-muted">
                {game.our_score}–{game.their_score}
              </div>
            </div>
          ) : next ? (
            <span className="rounded-full bg-stone-blue px-2 py-0.5 text-xs font-semibold text-white">Next</span>
          ) : null}
          {unlocked && (
            <Link
              href={`/games/${game.id}/edit`}
              aria-label="Edit game"
              className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted"
            >
              ✎
            </Link>
          )}
        </div>
      </div>
      {game.story && (
        <blockquote className="mb-3 border-l-4 border-stone-blue pl-3 text-sm whitespace-pre-line">{game.story}</blockquote>
      )}
      <GameLineup game={game} players={players} canMarkAway={!started} />
      {started && (
        <Link
          href={`/games/${game.id}/score`}
          className={`mt-3 w-full text-sm ${result ? "btn-ghost py-1.5" : "btn py-2"}`}
        >
          {result ? "Update score" : "Enter score"}
        </Link>
      )}
    </article>
  );
}
