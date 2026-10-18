"use client";

import { useActionState, useState } from "react";
import { deleteGame, saveGame } from "@/app/actions";
import { POSITIONS } from "@/lib/config";
import type { Player, PlayerStatus } from "@/lib/types";
import Avatar from "./Avatar";
import { submitWithoutReset } from "@/components/submitWithoutReset";
import FormMessage from "./FormMessage";

const STATUSES: { value: PlayerStatus; symbol: string; label: string; on: string }[] = [
  { value: "play", symbol: "+", label: "Playing", on: "border-green-600 bg-green-600 text-white" },
  { value: "sub", symbol: '"', label: "Available, not playing", on: "border-stone-blue bg-stone-blue text-white" },
  { value: "away", symbol: "−", label: "Unavailable", on: "border-stone-red bg-stone-red text-white" },
];

type Initial = {
  id?: string;
  startsAtLocal: string;
  opponent: string;
  sheet: string;
  notes: string;
  status: Record<string, PlayerStatus>;
};

export default function GameForm({ players, initial }: { players: Player[]; initial: Initial }) {
  const [state, action, pending] = useActionState(saveGame, {});
  const [status, setStatus] = useState<Record<string, PlayerStatus>>(() =>
    Object.fromEntries(players.map((p) => [p.id, initial.status[p.id] ?? "sub"])),
  );
  const playingCount = Object.values(status).filter((s) => s === "play").length;
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="label" htmlFor="starts_at">
          Date &amp; time
        </label>
        <input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          required
          defaultValue={initial.startsAtLocal}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="opponent">
          Opponent
        </label>
        <input id="opponent" name="opponent" required defaultValue={initial.opponent} className="input" placeholder="e.g. Smith rink" />
      </div>
      <div>
        <label className="label" htmlFor="sheet">
          Sheet (optional)
        </label>
        <input id="sheet" name="sheet" defaultValue={initial.sheet} className="input" placeholder="e.g. 3" />
      </div>

      <fieldset className="space-y-2">
        <legend className="label">
          Who&apos;s playing ({playingCount}/{POSITIONS.length})
        </legend>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <input type="hidden" name={`status_${p.id}`} value={status[p.id]} />
              <Avatar player={p} size="sm" away={status[p.id] === "away"} />
              <span className="min-w-0 flex-1 font-medium">
                {p.name}
                {status[p.id] === "away" && (
                  <span className="ml-1 text-xs font-normal text-stone-red">(unavailable)</span>
                )}
              </span>
              <div className="flex gap-1" role="radiogroup" aria-label={p.name}>
                {STATUSES.map((s) => {
                  const on = status[p.id] === s.value;
                  const full = s.value === "play" && !on && playingCount >= POSITIONS.length;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={s.label}
                      disabled={full}
                      onClick={() => setStatus({ ...status, [p.id]: s.value })}
                      className={`h-10 w-10 rounded-lg border text-lg font-bold disabled:opacity-30 ${
                        on ? s.on : "border-line text-muted"
                      }`}
                    >
                      {s.symbol}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {STATUSES.map((s) => (
            <span key={s.value}>
              <b className="text-ink">{s.symbol}</b> {s.label}
            </span>
          ))}
        </p>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} defaultValue={initial.notes} className="input" />
      </div>

      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn flex-1" disabled={pending}>
          {pending ? "Saving…" : "Save game"}
        </button>
        {initial.id && (
          <button
            type="button"
            className="btn-ghost text-stone-red"
            onClick={() => {
              if (confirm("Delete this game?")) deleteGame(initial.id!);
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
