"use client";

import { useState, useTransition } from "react";
import { setJugs } from "@/app/actions";

const JUG_QUIPS = [
  "Dry so far. Who are you people.",
  "One jug. Responsible. Boring.",
  "Two jugs. Respectable.",
  "Three jugs. Now we're curling.",
  "Four jugs. Someone's calling a cab.",
];

/** Jugs of beer for a game: tap − / + any time, before, during or after. Saves on every tap. */
export default function JugCounter({ gameId, jugs: initial }: { gameId: string; jugs: number | null }) {
  const [jugs, setLocal] = useState<number | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const quip = jugs === null ? "No jugs logged yet." : (JUG_QUIPS[jugs] ?? "🚨 Legendary. Hydrate.");

  const bump = (delta: number) => {
    const next = Math.max(0, Math.min(99, (jugs ?? 0) + delta));
    if (next === jugs) return;
    const previous = jugs;
    setLocal(next);
    setError(null);
    startTransition(async () => {
      const result = await setJugs(gameId, next);
      if ("error" in result) {
        setLocal(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-ice px-3 py-2">
      <button
        type="button"
        aria-label="One less jug"
        onClick={() => bump(-1)}
        disabled={!jugs}
        className="h-10 w-10 shrink-0 rounded-full border border-line text-xl font-bold disabled:opacity-30"
      >
        −
      </button>
      <div className="min-w-0 flex-1 text-center">
        <div className="text-sm font-semibold tabular-nums" aria-live="polite">
          🍺 {jugs ?? 0} jug{jugs === 1 ? "" : "s"}
          {pending && <span className="ml-1 text-xs font-normal text-muted">saving…</span>}
        </div>
        <div className="truncate text-xs text-muted">{error ?? quip}</div>
      </div>
      <button
        type="button"
        aria-label="One more jug"
        onClick={() => bump(1)}
        className="h-10 w-10 shrink-0 rounded-full bg-amber-500 text-xl font-bold text-white"
      >
        +
      </button>
    </div>
  );
}
