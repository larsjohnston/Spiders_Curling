"use client";

import { useActionState } from "react";
import { unlockAction } from "../actions";
import FormMessage from "@/components/FormMessage";

export default function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(unlockAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="label" htmlFor="pin">
        Team PIN
      </label>
      <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" className="input" autoFocus />
      <FormMessage state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
