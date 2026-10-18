"use client";

import { useRef, useState } from "react";
import { previewSeason, startSeason, type SeasonState } from "../actions";
import type { LeagueConfig } from "@/lib/config";
import FormMessage from "@/components/FormMessage";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}

/** Paste a new league sheet link → check what it finds → start the new season. */
export default function SeasonForm({ current, suggestedName }: { current: LeagueConfig; suggestedName: string }) {
  // Actions are called by hand (not via <form action>) because React resets a form after a form action,
  // which would wipe the pasted link and the tab picks between "Check sheet" and "Start".
  const form = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState<SeasonState>({});
  const [started, setStarted] = useState<SeasonState>({});
  const [busy, setBusy] = useState<"check" | "start" | null>(null);
  const preview = checked.preview;
  const checking = busy === "check";
  const starting = busy === "start";

  async function run(kind: "check" | "start") {
    if (!form.current?.reportValidity()) return;
    if (kind === "start" && !confirm(`Start ${preview?.config.season}? The schedule switches to the new sheet.`)) return;
    setBusy(kind);
    const data = new FormData(form.current);
    if (kind === "check") {
      setStarted({});
      setChecked(await previewSeason({}, data));
    } else {
      setStarted(await startSeason({}, data));
    }
    setBusy(null);
  }

  const [f, setF] = useState({ sheetUrl: "", season: suggestedName, team: current.team, division: current.division });
  const field = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }),
  });
  const [tabs, setTabs] = useState<{ scheduleGid?: string; divisionGid?: string }>({});

  return (
    <form
      ref={form}
      className="space-y-4 rounded-xl border border-line bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(preview ? "start" : "check");
      }}
    >
      <h2 className="font-semibold">Start a new season</h2>
      <div>
        <label className="label" htmlFor="sheetUrl">
          League sheet link
        </label>
        <input
          id="sheetUrl"
          name="sheetUrl"
          required
          {...field("sheetUrl")}
          className="input text-sm"
          placeholder="https://docs.google.com/spreadsheets/d/e/…/pubhtml"
        />
      </div>
      <div>
        <label className="label" htmlFor="season">
          Season name
        </label>
        <input id="season" name="season" required {...field("season")} className="input" placeholder="e.g. 2026/27 2nd Square" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="team">
            Our team in the sheet
          </label>
          <input id="team" name="team" required {...field("team")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="division">
            Division
          </label>
          <input id="division" name="division" required {...field("division")} maxLength={2} className="input uppercase" />
        </div>
      </div>

      {preview && (
        <div className="space-y-3 rounded-lg bg-ice p-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="scheduleGid">
                Schedule tab
              </label>
              <select
                id="scheduleGid"
                name="scheduleGid"
                value={tabs.scheduleGid ?? preview.config.scheduleGid}
                onChange={(e) => setTabs({ ...tabs, scheduleGid: e.target.value })}
                className="input py-2 text-sm"
              >
                {preview.tabs.map((t) => (
                  <option key={t.gid} value={t.gid}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="divisionGid">
                Division tab
              </label>
              <select
                id="divisionGid"
                name="divisionGid"
                value={tabs.divisionGid ?? preview.config.divisionGid}
                onChange={(e) => setTabs({ ...tabs, divisionGid: e.target.value })}
                className="input py-2 text-sm"
              >
                {preview.tabs.map((t) => (
                  <option key={t.gid} value={t.gid}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="font-semibold">
              Found {preview.games.length} games for {preview.config.team}
              {preview.byes.length ? ` and ${preview.byes.length} bye${preview.byes.length > 1 ? "s" : ""}` : ""}:
            </div>
            <ul className="mt-1 space-y-0.5 text-muted">
              {preview.games.map((g) => (
                <li key={g.date}>
                  {prettyDate(g.date)} · {prettyTime(g.time)} · Sheet {g.sheet} · vs {g.opponent}
                </li>
              ))}
            </ul>
          </div>
          {!preview.divisionTeams.includes(preview.config.team) && (
            <p className="font-medium text-stone-red">
              Heads up: {preview.config.team} isn&apos;t in that division tab. Pick the right one above and check again.
            </p>
          )}
        </div>
      )}

      <FormMessage state={started.ok || started.error ? started : checked} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void run("check")}
          className={preview ? "btn-ghost" : "btn flex-1"}
          disabled={!!busy}
        >
          {checking ? "Checking…" : preview ? "Check again" : "Check sheet"}
        </button>
        {preview && (
          <button type="button" onClick={() => void run("start")} className="btn flex-1" disabled={!!busy}>
            {starting ? "Starting…" : `Start ${preview.config.season}`}
          </button>
        )}
      </div>
    </form>
  );
}
