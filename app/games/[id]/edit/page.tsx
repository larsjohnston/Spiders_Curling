import { notFound } from "next/navigation";
import GameForm from "@/components/GameForm";
import { getGame, getPlayers } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { TIMEZONE } from "@/lib/config";
import { dateToLocalInput } from "@/lib/time";

export default async function EditGamePage({ params }: PageProps<"/games/[id]/edit">) {
  const { id } = await params;
  await unlockedOrRedirect(`/games/${id}/edit`);
  const [game, players] = await Promise.all([getGame(id), getPlayers(true)]);
  if (!game) notFound();
  // Keep anyone already in this lineup selectable even if they've since been made inactive.
  const options = players.filter((p) => p.active || game.lineup.some((s) => s.player.id === p.id));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Edit game</h1>
      <GameForm
        players={options}
        initial={{
          id: game.id,
          startsAtLocal: dateToLocalInput(new Date(game.starts_at), TIMEZONE),
          opponent: game.opponent,
          sheet: game.sheet ?? "",
          notes: game.notes ?? "",
          lineup: Object.fromEntries(game.lineup.map((s) => [s.position, s.player.id])),
          away: game.away,
        }}
      />
    </div>
  );
}
