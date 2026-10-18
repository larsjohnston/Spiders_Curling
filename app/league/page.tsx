import { getGames, getLeagueConfig, getLeagueSnapshot, getPlayers, type LeagueSnapshot } from "@/lib/data";
import { isUnlocked } from "@/lib/auth";
import { TIMEZONE, type LeagueConfig } from "@/lib/config";
import { RESULT_STYLE } from "@/components/GameCard";
import SyncButton from "@/components/SyncButton";
import LeagueSchedule from "./LeagueSchedule";
import LuckyCharms from "./LuckyCharms";

const heading = "text-sm font-semibold uppercase tracking-wide text-muted";
const short = (team: string) => team.split(",")[0].slice(0, 3);

export default async function LeaguePage() {
  const [league, unlocked, config, games, players] = await Promise.all([
    getLeagueSnapshot(),
    isUnlocked(),
    getLeagueConfig(),
    getGames(),
    getPlayers(),
  ]);
  if (!league) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-line p-6 text-center text-muted">
        <p>League data hasn&apos;t been pulled yet.</p>
        {unlocked && <SyncButton />}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <Standings league={league} config={config} />
      <LuckyCharms games={games} players={players} />
      {league.matrix && <Matrix matrix={league.matrix} config={config} />}
      {league.weeks && (
        <LeagueSchedule weeks={league.weeks} matrix={league.matrix} team={config.team} division={config.division} />
      )}
      <SyncFooter league={league} unlocked={unlocked} />
    </div>
  );
}

function Standings({ league, config }: { league: LeagueSnapshot; config: LeagueConfig }) {
  const display = (team: string) => (team === config.team ? "Spiders" : team);
  return (
    <section className="space-y-2">
      <h2 className={heading}>Division {config.division} standings</h2>
      <table className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pl-4 text-left font-medium">Team</th>
            <th className="w-9 font-medium">W</th>
            <th className="w-9 font-medium">L</th>
            <th className="w-9 font-medium">T</th>
            <th className="w-12 pr-4 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {league.standings.map((t, i) => (
            <tr
              key={t.team}
              className={`border-b border-line last:border-0 ${t.team === config.team ? "bg-stone-blue/10 font-semibold" : ""}`}
            >
              <td className="py-2 pl-4">
                <span className="mr-2 inline-block w-4 text-muted">{i + 1}</span>
                {display(t.team)}
              </td>
              <td className="text-center">{t.wins}</td>
              <td className="text-center">{t.losses}</td>
              <td className="text-center">{t.ties}</td>
              <td className="pr-4 text-right">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">Win 10 · Tie 6 · Loss 2 pts</p>
    </section>
  );
}

/** Head-to-head grid: row team's result against each column team. */
function Matrix({ matrix, config }: { matrix: NonNullable<LeagueSnapshot["matrix"]>; config: LeagueConfig }) {
  const display = (team: string) => (team === config.team ? "Spiders" : team);
  return (
    <section className="space-y-2">
      <h2 className={heading}>Results grid</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="text-sm tabular-nums">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="sticky left-0 bg-card py-2 pr-2 pl-3 text-left font-medium">vs →</th>
              {matrix.teams.map((t) => (
                <th
                  key={t}
                  title={t}
                  className={`w-9 px-1 font-medium ${t === config.team ? "bg-stone-blue/10 text-ink" : ""}`}
                >
                  {t === config.team ? "Spi" : short(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.teams.map((row) => {
              const us = row === config.team;
              return (
                <tr key={row} className={`border-b border-line last:border-0 ${us ? "bg-stone-blue/10 font-semibold" : ""}`}>
                  <td className={`sticky left-0 py-1.5 pr-2 pl-3 whitespace-nowrap ${us ? "bg-[color-mix(in_srgb,var(--blue)_10%,var(--card))]" : "bg-card"}`}>
                    {display(row)}
                  </td>
                  {matrix.teams.map((col) => {
                    const r = matrix.results[row]?.[col];
                    return (
                      <td
                        key={col}
                        className={`text-center font-bold ${row === col ? "bg-line/60" : ""} ${
                          col === config.team && !us ? "bg-stone-blue/10" : ""
                        } ${r ? RESULT_STYLE[r] : ""}`}
                      >
                        {r ?? ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Read across: each row is that team&apos;s result against the column team.</p>
    </section>
  );
}

function SyncFooter({ league, unlocked }: { league: LeagueSnapshot; unlocked: boolean }) {
  const synced = new Date(league.syncedAt).toLocaleString("en-CA", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="flex items-start justify-between gap-3 text-xs text-muted">
      <p>
        From the league sheet{league.asOf ? ` (results as of ${league.asOf})` : ""}. Checked hourly; last synced {synced}.
      </p>
      {unlocked && <SyncButton />}
    </div>
  );
}
