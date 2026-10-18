"use client";

import { useState } from "react";
import type { LeagueWeek } from "@/lib/league";
import type { LeagueSnapshot } from "@/lib/data";

const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Noon UTC keeps the calendar date stable in any viewer timezone.
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}

/** Week-by-week league schedule; our division by default, every division on request. */
export default function LeagueSchedule({
  weeks,
  matrix,
  team,
  division,
}: {
  weeks: LeagueWeek[];
  matrix: LeagueSnapshot["matrix"];
  team: string;
  division: string;
}) {
  const [all, setAll] = useState(false);
  const name = (t: string) => (t === team ? "Spiders" : t);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={heading}>League schedule</h2>
        <div className="flex rounded-lg border border-line text-xs font-semibold" role="group">
          {[false, true].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setAll(v)}
              aria-pressed={all === v}
              className={`px-3 py-1.5 ${all === v ? "bg-navy text-white dark:bg-stone-blue" : "text-muted"}`}
            >
              {v ? "All divisions" : `Division ${division}`}
            </button>
          ))}
        </div>
      </div>

      {weeks.map((w, i) => {
        const games = all ? w.games : w.games.filter((g) => g.division === division);
        const ourBye = w.byes.includes(team);
        const divisionTeams = new Set(matrix?.teams ?? []);
        const byes = all ? w.byes : w.byes.filter((t) => divisionTeams.has(t));
        return (
          <article key={w.date} className="overflow-hidden rounded-xl border border-line bg-card">
            <header className="flex items-baseline justify-between border-b border-line px-4 py-2">
              <span className="font-semibold">{formatDate(w.date)}</span>
              <span className="text-xs text-muted">Week {i + 1}</span>
            </header>
            <ul className="divide-y divide-line text-sm">
              {games.map((g) => {
                const ours = g.teams.includes(team);
                const result = matrix?.results[g.teams[0]]?.[g.teams[1]];
                const winner = result === "W" ? 0 : result === "L" ? 1 : null;
                return (
                  <li
                    key={`${g.time}-${g.sheet}`}
                    className={`flex items-center gap-3 px-4 py-2 ${ours ? "bg-stone-blue/10 font-semibold" : ""}`}
                  >
                    <span className="w-10 shrink-0 text-xs text-muted tabular-nums">{formatTime(g.time)}</span>
                    <span className="w-8 shrink-0 text-xs text-muted">#{g.sheet}</span>
                    <span className="min-w-0 flex-1">
                      {g.teams.map((t, j) => (
                        <span key={t}>
                          {j === 1 && <span className="px-1 text-muted">vs</span>}
                          <span className={winner === j ? "font-bold text-green-600" : ""}>{name(t)}</span>
                        </span>
                      ))}
                      {result === "T" && <span className="ml-1 text-xs text-muted">(tie)</span>}
                    </span>
                    {all && <span className="text-xs text-muted">{g.division}</span>}
                  </li>
                );
              })}
            </ul>
            {byes.length > 0 && (
              <p className={`border-t border-line px-4 py-2 text-xs ${ourBye ? "font-semibold text-stone-blue" : "text-muted"}`}>
                Bye: {byes.map(name).join(", ")}
              </p>
            )}
          </article>
        );
      })}
      <p className="text-xs text-muted">Times are draw times (evening). Winners shown in green once results are in.</p>
    </section>
  );
}
