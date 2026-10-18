"use client";

import { useState, useTransition } from "react";
import { syncLeagueNow, type FormState } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await syncLeagueNow()))}
        className="btn-ghost py-1 text-xs"
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
