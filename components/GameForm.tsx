"use client";

import { useActionState } from "react";
import { deleteGame, saveGame } from "@/app/actions";
import { POSITIONS, POSITION_LABEL } from "@/lib/config";
import type { Player } from "@/lib/types";
import FormMessage from "./FormMessage";

type Initial = {
  id?: string;
  startsAtLocal: string;
  opponent: string;
  sheet: string;
  notes: string;
  lineup: Partial<Record<(typeof POSITIONS)[number], string>>;
};

export default function GameForm({ players, initial }: { players: Player[]; initial: Initial }) {
  const [state, action, pending] = useActionState(saveGame, {});
  return (
    <form action={action} className="space-y-4">
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
        <legend className="label">Who&apos;s playing</legend>
        {POSITIONS.map((pos) => (
          <div key={pos} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium">{POSITION_LABEL[pos]}</span>
            <select name={`pos_${pos}`} defaultValue={initial.lineup[pos] ?? ""} className="input">
              <option value="">—</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ))}
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
