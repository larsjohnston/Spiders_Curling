"use client";

import { useActionState } from "react";
import { saveScore } from "@/app/actions";
import FormMessage from "@/components/FormMessage";

export default function ScoreForm({
  id,
  ours,
  theirs,
  opponent,
  story,
}: {
  id: string;
  ours: string;
  theirs: string;
  opponent: string;
  story: string;
}) {
  const [state, action, pending] = useActionState(saveScore, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="our_score">
            Us
          </label>
          <input id="our_score" name="our_score" type="number" inputMode="numeric" min={0} max={99} defaultValue={ours} className="input text-center text-2xl font-bold" />
        </div>
        <div>
          <label className="label truncate" htmlFor="their_score">
            {opponent}
          </label>
          <input id="their_score" name="their_score" type="number" inputMode="numeric" min={0} max={99} defaultValue={theirs} className="input text-center text-2xl font-bold" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="story">
          Game Story (optional)
        </label>
        <textarea
          id="story"
          name="story"
          rows={4}
          maxLength={2000}
          defaultValue={story}
          className="input"
          placeholder="Big hit in the 6th, stole two in the 8th…"
        />
      </div>
      <FormMessage state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Saving…" : "Save & notify team"}
      </button>
      <p className="text-center text-xs text-muted">Everyone with notifications on gets the result and story.</p>
    </form>
  );
}
