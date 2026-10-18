import Link from "next/link";
import { notFound } from "next/navigation";
import GameCard from "@/components/GameCard";
import { getGame, getLeagueSnapshot, getPlayers, leagueRecord } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const [game, players, unlocked, league] = await Promise.all([
    getGame(id),
    getPlayers(),
    isUnlocked(),
    getLeagueSnapshot(),
  ]);
  if (!game) notFound();
  // Server component rendered once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted">
        ‹ Schedule
      </Link>
      <GameCard
        game={game}
        players={players}
        unlocked={unlocked}
        now={now}
        opponentRecord={leagueRecord(league, game.opponent)}
      />
    </div>
  );
}
