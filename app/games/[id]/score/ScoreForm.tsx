"use client";

import { useActionState, useState } from "react";
import { saveScore } from "@/app/actions";
import FormMessage from "@/components/FormMessage";

const JUG_QUIPS = [
  "Dry? Who are you people.",
  "One jug. Responsible. Boring.",
  "Two jugs. Respectable.",
  "Three jugs. Now we're curling.",
  "Four jugs. Someone's calling a cab.",
];

export default function ScoreForm({
  id,
  ours,
  theirs,
  opponent,
  story,
  jugs: initialJugs,
}: {
  id: string;
  ours: string;
  theirs: string;
  opponent: string;
  story: string;
  jugs: number | null;
}) {
  const [state, action, pending] = useActionState(saveScore, {});
  const [jugs, setJugs] = useState<number | null>(initialJugs);
  const quip = jugs === null ? "How many jugs did we put away?" : (JUG_QUIPS[jugs] ?? "🚨 Legendary. Hydrate.");

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

      <div className="rounded-xl border border-line bg-card p-3">
        <div className="label">Jugs of beer 🍺</div>
        <input type="hidden" name="jugs" value={jugs ?? ""} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="One less jug"
            onClick={() => setJugs((j) => (j === null || j === 0 ? 0 : j - 1))}
            className="h-12 w-12 shrink-0 rounded-full border border-line text-2xl font-bold"
          >
            −
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-3xl leading-tight" aria-live="polite">
              {jugs ? "🍺".repeat(Math.min(jugs, 8)) : <span className="opacity-30">🍺</span>}
              {jugs !== null && jugs > 8 && <span className="ml-1 text-xl font-black">×{jugs}</span>}
            </div>
            <div className="text-sm font-semibold tabular-nums">{jugs ?? "–"}</div>
          </div>
          <button
            type="button"
            aria-label="One more jug"
            onClick={() => setJugs((j) => Math.min((j ?? 0) + 1, 99))}
            className="h-12 w-12 shrink-0 rounded-full bg-amber-500 text-2xl font-bold text-white"
          >
            +
          </button>
        </div>
        <p className="mt-1 text-center text-xs text-muted">{quip}</p>
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
