"use client";

import { useState } from "react";
import { setPlayerStatus } from "../actions";
import { TEAM_SIZE, type Player, type PlayerStatus } from "@/lib/types";
import Avatar from "@/components/Avatar";

type Row = { id: string; label: string; sub: string; status: Record<string, PlayerStatus> };

const LOOK: Record<PlayerStatus, { symbol: string; label: string; cls: string }> = {
  play: { symbol: "+", label: "Playing", cls: "bg-green-600 text-white border-green-600" },
  sub: { symbol: '"', label: "Available, not playing", cls: "bg-card text-stone-blue border-line" },
  away: { symbol: "−", label: "Unavailable", cls: "bg-stone-red text-white border-stone-red" },
};

/** Tap order: available → playing (if a spot is free) → unavailable → available. */
function nextStatus(current: PlayerStatus, playing: number): PlayerStatus {
  if (current === "sub") return playing < TEAM_SIZE ? "play" : "away";
  if (current === "play") return "away";
  return "sub";
}

export default function LineupMatrix({ games, players }: { games: Row[]; players: Player[] }) {
  const [rows, setRows] = useState(games);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function tap(gameId: string, playerId: string) {
    const row = rows.find((r) => r.id === gameId)!;
    const current = row.status[playerId] ?? "sub";
    const playing = players.filter((p) => row.status[p.id] === "play").length;
    const next = nextStatus(current, playing);
    const update = (s: PlayerStatus) =>
      setRows((rs) => rs.map((r) => (r.id === gameId ? { ...r, status: { ...r.status, [playerId]: s } } : r)));

    update(next); // optimistic
    setSaving(`${gameId}:${playerId}`);
    setError("");
    const res = await setPlayerStatus(gameId, playerId, next);
    setSaving(null);
    if (res.error) {
      update(current);
      setError(res.error);
    }
  }

  if (rows.length === 0) return <p className="text-muted">No upcoming games.</p>;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-card py-2 pl-2 text-left text-xs font-medium text-muted">Game</th>
              {players.map((p) => (
                <th key={p.id} className="px-0.5 py-2 font-medium">
                  <div className="flex flex-col items-center gap-0.5">
                    <Avatar player={p} size="xs" />
                    <span className="max-w-9 truncate text-[10px]">{p.name}</span>
                  </div>
                </th>
              ))}
              <th className="pr-2 pl-1 text-xs font-medium text-muted">In</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const playing = players.filter((p) => r.status[p.id] === "play").length;
              const available = players.filter((p) => r.status[p.id] !== "away").length;
              const short = available < TEAM_SIZE;
              return (
                <tr key={r.id} className={`border-b border-line last:border-0 ${short ? "bg-amber-500/10" : ""}`}>
                  <td className={`sticky left-0 z-10 py-2 pr-1 pl-2 ${short ? "bg-[color-mix(in_srgb,#f59e0b_10%,var(--card))]" : "bg-card"}`}>
                    <div className="text-sm font-semibold whitespace-nowrap">{r.label}</div>
                    <div className="max-w-20 truncate text-[11px] text-muted">{r.sub}</div>
                  </td>
                  {players.map((p) => {
                    const s = r.status[p.id] ?? "sub";
                    return (
                      <td key={p.id} className="px-0.5 text-center">
                        <button
                          type="button"
                          aria-label={`${p.name}, ${r.label}: ${LOOK[s].label}`}
                          onClick={() => void tap(r.id, p.id)}
                          className={`h-9 w-8 rounded-lg border text-base font-bold ${LOOK[s].cls} ${
                            saving === `${r.id}:${p.id}` ? "opacity-60" : ""
                          }`}
                        >
                          {LOOK[s].symbol}
                        </button>
                      </td>
                    );
                  })}
                  <td className={`pr-2 pl-1 text-center text-xs font-semibold tabular-nums ${playing === TEAM_SIZE ? "text-green-600" : short ? "text-amber-600" : "text-muted"}`}>
                    {playing}/{TEAM_SIZE}
                    {short && <div className="font-normal">only {available}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="text-sm font-medium text-stone-red">{error}</p>}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {(Object.keys(LOOK) as PlayerStatus[]).map((s) => (
          <span key={s}>
            <b className="text-ink">{LOOK[s].symbol}</b> {LOOK[s].label}
          </span>
        ))}
      </p>
    </div>
  );
}
