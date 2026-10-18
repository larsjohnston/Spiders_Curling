"use client";

import { useState } from "react";
import { setPlayerStatus } from "../actions";
import { TEAM_SIZE, type Player, type PlayerStatus } from "@/lib/types";
import Avatar from "@/components/Avatar";

type Row = {
  id: string;
  label: string;
  time: string;
  opponent: string;
  record: string | null;
  status: Record<string, PlayerStatus>;
};

const LOOK: Record<PlayerStatus, { symbol: string; label: string; cls: string }> = {
  play: { symbol: "+", label: "Playing", cls: "bg-green-600 text-white border-green-600" },
  sub: { symbol: '"', label: "Available, not playing", cls: "bg-card text-stone-blue border-line" },
  away: { symbol: "−", label: "Unavailable", cls: "bg-stone-red text-white border-stone-red" },
};

/** Per-player season totals so playing time can be kept even: played so far + booked (+) in upcoming games. */
function Totals({ players, rows, played }: { players: Player[]; rows: Row[]; played: Record<string, number> }) {
  const booked = (id: string) => rows.filter((r) => r.status[id] === "play").length;
  const totals = players.map((p) => (played[p.id] ?? 0) + booked(p.id));
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const label = "py-1 text-[10px] font-semibold uppercase tracking-wide text-muted";
  return (
    <tfoot className="border-t-2 border-line bg-ice/60 text-center tabular-nums">
      <tr>
        <td colSpan={players.length} className={`${label} pt-2`}>
          Played so far
        </td>
      </tr>
      <tr>
        {players.map((p) => (
          <td key={p.id} className="text-sm">
            {played[p.id] ?? 0}
          </td>
        ))}
      </tr>
      <tr>
        <td colSpan={players.length} className={label}>
          Booked (+)
        </td>
      </tr>
      <tr>
        {players.map((p) => (
          <td key={p.id} className="text-sm">
            {booked(p.id)}
          </td>
        ))}
      </tr>
      <tr>
        <td colSpan={players.length} className={label}>
          Season total
        </td>
      </tr>
      <tr>
        {players.map((p, i) => (
          <td key={p.id} className="px-1 pb-3">
            <span
              className={`inline-block min-w-8 rounded-lg px-1.5 py-1 text-lg font-black ${
                max > min && totals[i] === min
                  ? "bg-green-600 text-white"
                  : max > min && totals[i] === max
                    ? "bg-amber-500 text-white"
                    : ""
              }`}
            >
              {totals[i]}
            </span>
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

/** Tap order: available → playing (if a spot is free) → unavailable → available. */
function nextStatus(current: PlayerStatus, playing: number): PlayerStatus {
  if (current === "sub") return playing < TEAM_SIZE ? "play" : "away";
  if (current === "play") return "away";
  return "sub";
}

export default function LineupMatrix({
  games,
  players,
  played,
}: {
  games: Row[];
  players: Player[];
  /** Past games each player was in the lineup for. */
  played: Record<string, number>;
}) {
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
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-line">
              {players.map((p) => (
                <th key={p.id} className="py-2 font-medium">
                  <div className="flex flex-col items-center gap-0.5">
                    <Avatar player={p} size="sm" />
                    <span className="max-w-full truncate px-0.5 text-[11px]">{p.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {/* Each game: a full-width title line, then one button per player under their photo. */}
          {rows.map((r) => {
            const playing = players.filter((p) => r.status[p.id] === "play").length;
            const available = players.filter((p) => r.status[p.id] !== "away").length;
            const short = available < TEAM_SIZE;
            return (
              <tbody key={r.id} className={`border-b border-line last:border-0 ${short ? "bg-amber-500/10" : ""}`}>
                <tr>
                  <td colSpan={players.length} className="px-3 pt-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <b>{r.label}</b>
                        <span className="text-muted"> · {r.time} · vs </span>
                        <b>{r.opponent}</b>
                        {r.record && <span className="text-muted tabular-nums"> ({r.record})</span>}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold tabular-nums ${
                          playing === TEAM_SIZE ? "text-green-600" : short ? "text-amber-600" : "text-muted"
                        }`}
                      >
                        {short ? `only ${available} avail · ` : ""}
                        {playing}/{TEAM_SIZE}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  {players.map((p) => {
                    const s = r.status[p.id] ?? "sub";
                    return (
                      <td key={p.id} className="px-1 pt-1.5 pb-3 text-center">
                        <button
                          type="button"
                          aria-label={`${p.name}, ${r.label}: ${LOOK[s].label}`}
                          onClick={() => void tap(r.id, p.id)}
                          className={`h-10 w-full max-w-12 rounded-lg border text-lg font-bold ${LOOK[s].cls} ${
                            saving === `${r.id}:${p.id}` ? "opacity-60" : ""
                          }`}
                        >
                          {LOOK[s].symbol}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            );
          })}
          <Totals players={players} rows={rows} played={played} />
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
      <p className="text-xs text-muted">
        Season total = games played + games booked. <span className="font-semibold text-green-600">Green</span> is
        playing the least, <span className="font-semibold text-amber-600">amber</span> the most.
      </p>
    </div>
  );
}
