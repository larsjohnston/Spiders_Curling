"use client";

import { POSITIONS, POSITION_LABEL } from "@/lib/config";
import type { LineupSpot } from "@/lib/types";
import { useMe } from "./useMe";

export default function Lineup({ lineup, compact = false }: { lineup: LineupSpot[]; compact?: boolean }) {
  const [me] = useMe();
  const spots = [...lineup].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  const playing = me ? spots.some((s) => s.player.id === me) : null;

  if (spots.length === 0) return <p className="text-sm text-muted">Lineup not set yet</p>;

  return (
    <div>
      <ul className={compact ? "flex flex-wrap gap-x-3 gap-y-1 text-sm" : "grid grid-cols-2 gap-2"}>
        {spots.map((s) => {
          const isMe = s.player.id === me;
          return compact ? (
            <li key={s.position} className={isMe ? "font-semibold text-stone-blue" : "text-muted"}>
              {s.player.name}
            </li>
          ) : (
            <li
              key={s.position}
              className={`rounded-lg border px-3 py-2 ${isMe ? "border-stone-blue bg-stone-blue/10" : "border-line"}`}
            >
              <div className="text-xs uppercase tracking-wide text-muted">{POSITION_LABEL[s.position]}</div>
              <div className="font-medium">{s.player.name}</div>
            </li>
          );
        })}
      </ul>
      {!compact && playing !== null && (
        <p className={`mt-2 text-sm font-medium ${playing ? "text-stone-blue" : "text-muted"}`}>
          {playing ? "You're playing" : "You're sitting out"}
        </p>
      )}
    </div>
  );
}
