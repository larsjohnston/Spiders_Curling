import MePanel from "./MePanel";
import { getPlayers } from "@/lib/data";

export default async function MePage() {
  const players = await getPlayers();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Me</h1>
      <MePanel players={players} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </div>
  );
}
