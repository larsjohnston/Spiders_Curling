import RosterForm from "./RosterForm";
import { getPlayers } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";

export default async function RosterPage() {
  await unlockedOrRedirect("/roster");
  const players = await getPlayers(true);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Roster</h1>
        <p className="text-sm text-muted">Inactive players are hidden from new lineups.</p>
      </div>
      <RosterForm players={players} />
    </div>
  );
}
