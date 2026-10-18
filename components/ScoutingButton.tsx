"use client";

import { useState } from "react";

/** 🔎 next to the opponent's name; tap to read the scouting report, tap again to hide it. */
export default function ScoutingButton({ report }: { report: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Scouting report"
        className={`ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle text-base ${
          open ? "bg-stone-blue/15" : "active:bg-line"
        }`}
      >
        🔎
      </button>
      {open && (
        <span className="mt-1.5 block rounded-lg bg-ice px-3 py-2 text-sm font-normal whitespace-normal text-muted">
          <span className="font-semibold text-ink">Scouting:</span> {report}
        </span>
      )}
    </>
  );
}
