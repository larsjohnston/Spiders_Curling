import Link from "next/link";
import { notFound } from "next/navigation";
import ScoreForm from "./ScoreForm";
import Lineup from "@/components/Lineup";
import { getGame } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";

export default async function ScorePage({ params }: PageProps<"/games/[id]/score">) {
  const { id } = await params;
  await unlockedOrRedirect(`/games/${id}/score`);
  const game = await getGame(id);
  if (!game) notFound();
  const start = new Date(game.starts_at);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Score vs {game.opponent}</h1>
        <p className="text-sm text-muted">
          {formatDay(start, TIMEZONE)} · {formatTime(start, TIMEZONE)}
        </p>
      </div>
      <ScoreForm
        id={game.id}
        opponent={game.opponent}
        ours={game.our_score?.toString() ?? ""}
        theirs={game.their_score?.toString() ?? ""}
      />
      <Lineup lineup={game.lineup} />
      <Link href={`/games/${game.id}/edit`} className="block text-center text-sm text-muted underline">
        Edit game details
      </Link>
    </div>
  );
}
