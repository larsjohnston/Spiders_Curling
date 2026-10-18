import { getLeagueConfig, getSeasonRecords } from "@/lib/data";
import { unlockedOrRedirect } from "@/lib/guard";
import { effectiveResult } from "@/lib/types";
import SeasonForm from "./SeasonForm";

/** "2026/27 1st Square" → "2026/27 2nd Square": a guess the manager can overwrite. */
function nextSeasonName(current: string): string {
  const order = ["1st", "2nd", "3rd", "4th", "5th"];
  const i = order.findIndex((o) => current.includes(o));
  return i >= 0 && i < order.length - 1 ? current.replace(order[i], order[i + 1]) : "";
}

export default async function SeasonPage() {
  await unlockedOrRedirect("/season");
  const [config, seasons] = await Promise.all([getLeagueConfig(), getSeasonRecords()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Season</h1>
        <p className="text-sm text-muted">
          Following <b>{config.season}</b> as <b>{config.team}</b> in Division {config.division}. When the league
          publishes the next square, paste its link here. The roster, photos and old seasons all carry over.
        </p>
      </div>

      <SeasonForm current={config} suggestedName={nextSeasonName(config.season)} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Seasons</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card text-sm">
          {seasons.map(({ season, games }) => {
            const r = { W: 0, L: 0, T: 0 };
            for (const g of games) {
              const res = effectiveResult(g);
              if (res) r[res]++;
            }
            const jugs = games.reduce((n, g) => n + (g.jugs ?? 0), 0);
            return (
              <li key={season} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">
                  {season}
                  {season === config.season && <span className="ml-2 text-xs text-stone-blue">current</span>}
                </span>
                <span className="text-muted tabular-nums">
                  {r.W}–{r.L}
                  {r.T ? `–${r.T}` : ""} · {games.length} games{jugs ? ` · 🍺 ${jugs}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
