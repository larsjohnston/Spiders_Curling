import GameForm from "@/components/GameForm";
import BackLink from "@/components/BackLink";
import { getPlayers } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";

export default async function NewGamePage() {
  await unlockedOrRedirect("/games/new");
  const players = await getPlayers();
  return (
    <div className="space-y-4">
      <BackLink />
      <h1 className="text-xl font-bold">Add game</h1>
      <GameForm players={players} initial={{ startsAtLocal: "", opponent: "", sheet: "", notes: "", status: {} }} />
    </div>
  );
}
