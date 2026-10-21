"use client";

import { useActionState, useState } from "react";
import { saveScore } from "@/app/actions";
import { submitWithoutReset } from "@/components/submitWithoutReset";
import FormMessage from "@/components/FormMessage";
import { DEFAULT_ENDS, MAX_ENDS, MAX_PER_END, type EndInput } from "@/lib/ends";
import type { End } from "@/lib/types";

const shortName = (team: string) => team.split(",")[0];

function initialRows(ends: End[] | null): EndInput[] {
  const rows = (ends ?? []).map((e) => ({ us: String(e.us), them: String(e.them) }));
  while (rows.length < DEFAULT_ENDS) rows.push({ us: "", them: "" });
  return rows;
}

/** Sum of a column, or null when nothing in it has been typed yet. */
function total(rows: EndInput[], side: keyof EndInput): number | null {
  if (rows.every((r) => r.us === "" && r.them === "")) return null;
  return rows.reduce((n, r) => n + (Number(r[side]) || 0), 0);
}

export default function ScoreForm({
  id,
  ours,
  theirs,
  opponent,
  story,
  ends: initialEnds,
}: {
  id: string;
  ours: string;
  theirs: string;
  opponent: string;
  story: string;
  ends: End[] | null;
}) {
  const [state, action, pending] = useActionState(saveScore, {});
  const [byEnd, setByEnd] = useState((initialEnds?.length ?? 0) > 0);
  const [rows, setRows] = useState<EndInput[]>(() => initialRows(initialEnds));
  const setCell = (i: number, side: keyof EndInput, value: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [side]: value } : r)));
  const usTotal = total(rows, "us");
  const themTotal = total(rows, "them");

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div className="flex rounded-lg border border-line p-0.5 text-sm font-semibold">
        {(
          [
            [false, "Final score"],
            [true, "End by end"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={byEnd === mode}
            onClick={() => setByEnd(mode)}
            className={`flex-1 rounded-md py-1.5 ${byEnd === mode ? "bg-navy text-white dark:bg-stone-blue" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {byEnd ? (
        <div className="rounded-xl border border-line bg-card p-3">
          {/* The ends travel as JSON; the totals are worked out on the server from them. */}
          <input type="hidden" name="ends" value={JSON.stringify(rows)} />
          {usTotal === null && (
            <>
              {/* Nothing typed yet: keep whatever final score was already saved. */}
              <input type="hidden" name="our_score" value={ours} />
              <input type="hidden" name="their_score" value={theirs} />
            </>
          )}
          <div className="grid grid-cols-[3rem_1fr_1fr] items-center gap-x-3 gap-y-2">
            <div className="label mb-0">End</div>
            <div className="label mb-0 text-center">Us</div>
            <div className="label mb-0 truncate text-center">{shortName(opponent)}</div>
            {rows.map((row, i) => (
              <div key={i} className="contents">
                <div className="text-sm font-semibold text-muted tabular-nums">{i + 1}</div>
                {(["us", "them"] as const).map((side) => (
                  <input
                    key={side}
                    aria-label={`End ${i + 1}, ${side === "us" ? "us" : opponent}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_PER_END}
                    value={row[side]}
                    onChange={(e) => setCell(i, side, e.target.value)}
                    placeholder="0"
                    className="input py-1.5 text-center text-lg font-semibold"
                  />
                ))}
              </div>
            ))}
            <div className="border-t border-line pt-2 text-sm font-bold">Total</div>
            <div className="border-t border-line pt-2 text-center text-2xl font-black tabular-nums">{usTotal ?? "–"}</div>
            <div className="border-t border-line pt-2 text-center text-2xl font-black tabular-nums">{themTotal ?? "–"}</div>
          </div>
          {rows.length < MAX_ENDS && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { us: "", them: "" }])}
              className="btn-ghost mt-3 w-full py-1.5 text-sm"
            >
              + Extra end
            </button>
          )}
        </div>
      ) : (
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
      )}

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
