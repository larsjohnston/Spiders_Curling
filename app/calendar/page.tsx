import { headers } from "next/headers";
import { getPlayers } from "@/lib/data";
import CalendarLinks from "./CalendarLinks";

export default async function CalendarPage() {
  const [h, players] = await Promise.all([headers(), getPlayers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "spiders-curling.vercel.app";
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Calendar sync</h1>
        <p className="text-sm text-muted">
          Puts every game in your phone or Outlook calendar, and keeps it updated when times, sheets or lineups change.
        </p>
      </div>
      <CalendarLinks host={host} players={players.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
