import Link from "next/link";
import { notFound } from "next/navigation";
import GameCard from "@/components/GameCard";
import { getGame, getLeagueConfig, getLeagueSnapshot, getPlayers, leagueRecord } from "@/lib/data";
import { scoutingReport } from "@/lib/scouting";
import { isUnlocked } from "@/lib/auth";

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const [game, players, unlocked, league, config] = await Promise.all([
    getGame(id),
    getPlayers(),
    isUnlocked(),
    getLeagueSnapshot(),
    getLeagueConfig(),
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
        scouting={scoutingReport(game.opponent, config.team, league)}
      />
    </div>
  );
}
