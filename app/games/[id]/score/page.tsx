import { notFound } from "next/navigation";
import ScoreForm from "./ScoreForm";
import GameLineup from "@/components/GameLineup";
import { getGame, getPlayers } from "@/lib/data";
import { TIMEZONE } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/time";

// Open to everyone (no PIN): anyone on the team can report a score.
export default async function ScorePage({ params }: PageProps<"/games/[id]/score">) {
  const { id } = await params;
  const [game, players] = await Promise.all([getGame(id), getPlayers()]);
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
        story={game.story ?? ""}
      />
      <GameLineup game={game} players={players} canMarkAway={false} />
    </div>
  );
}
