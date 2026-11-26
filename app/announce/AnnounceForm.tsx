"use client";

import { useActionState } from "react";
import { announce } from "@/app/actions";
import { submitWithoutReset } from "@/components/submitWithoutReset";
import FormMessage from "@/components/FormMessage";

export default function AnnounceForm() {
  const [state, action, pending] = useActionState(announce, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input id="title" name="title" required maxLength={80} className="input" placeholder="New schedule is up" />
      </div>
      <div>
        <label className="label" htmlFor="body">
          Message
        </label>
        <textarea id="body" name="body" rows={4} maxLength={300} className="input" placeholder="Check the games…" />
      </div>
      <div>
        <label className="label" htmlFor="url">
          Opens
        </label>
        <select id="url" name="url" defaultValue="/" className="input">
          <option value="/">Schedule</option>
          <option value="/league">League</option>
          <option value="/calendar">Calendar sync</option>
        </select>
      </div>
      <FormMessage state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Sending…" : "Send to the team"}
      </button>
    </form>
  );
}
