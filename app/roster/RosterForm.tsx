"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveRoster } from "../actions";
import type { Player } from "@/lib/types";
import FormMessage from "@/components/FormMessage";
import { submitWithoutReset } from "@/components/submitWithoutReset";
import PhotoPicker from "./PhotoPicker";

export default function RosterForm({ players }: { players: Player[] }) {
  const [state, action, pending] = useActionState(saveRoster, {});
  const newName = useRef<HTMLInputElement>(null);

  // Keep edits on an error, but empty "Add a player" once it's saved so it can't be added twice.
  useEffect(() => {
    if (state.ok && newName.current) newName.current.value = "";
  }, [state]);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-3">
          <PhotoPicker player={p} />
          <input type="hidden" name="id" value={p.id} />
          <input name={`name_${p.id}`} defaultValue={p.name} className="input" aria-label="Name" />
          <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" name={`active_${p.id}`} defaultChecked={p.active} className="h-4 w-4" />
            Active
          </label>
        </div>
      ))}
      <input ref={newName} name="new_name" placeholder="Add a player…" className="input" />
      <FormMessage state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Saving…" : "Save roster"}
      </button>
    </form>
  );
}
