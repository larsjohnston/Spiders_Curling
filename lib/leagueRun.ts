import "server-only";
import { LEAGUE, T } from "./config";
import { db } from "./db";
import { getGames, type LeagueSnapshot } from "./data";
import { parseDivision, parseSchedule, parseWeeks } from "./league";
import { planSync } from "./leagueSync";
import { getSubscriptions, sendPush } from "./push";

async function fetchTab(gid: string): Promise<string> {
  const res = await fetch(LEAGUE.sheetUrl + gid, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`League sheet tab ${gid}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Pull the league sheet and apply it. Returns a human-readable log of what changed.
 * With `dryRun`, returns what would change (and the pushes it would send) without writing anything.
 */
export async function syncLeague(now = new Date(), { dryRun = false } = {}): Promise<string[]> {
  const [scheduleHtml, divisionHtml] = await Promise.all([fetchTab(LEAGUE.scheduleGid), fetchTab(LEAGUE.divisionGid)]);
  const schedule = parseSchedule(scheduleHtml, LEAGUE.team);
  const weeks = parseWeeks(scheduleHtml);
  const division = parseDivision(divisionHtml);
  // A layout change on the league's side shouldn't look like "every game was cancelled".
  if (schedule.games.length === 0) throw new Error(`No games for ${LEAGUE.team} found in the league schedule`);
  if (!division.teams.some((t) => t.team === LEAGUE.team)) throw new Error(`${LEAGUE.team} missing from division grid`);

  let plan = planSync(await getGames(), schedule, division, LEAGUE.team, now);
  if (dryRun) return [...plan.log, ...plan.pushes.map((p) => `Would push: ${p.title}`)];
  if (plan.inserts.length) {
    const { error } = await db().from(T.games).insert(plan.inserts);
    if (error) throw error;
    // Plan again so the new games also pick up their league results in this run.
    const again = planSync(await getGames(), schedule, division, LEAGUE.team, now);
    plan = { ...again, log: [...plan.log.filter((l) => l.startsWith("Added ")), ...again.log] };
  }

  for (const { id, patch } of plan.updates) {
    const { error } = await db().from(T.games).update(patch).eq("id", id);
    if (error) throw error;
  }
  for (const { id, league_result, clearScore } of plan.results) {
    const patch = clearScore ? { league_result, our_score: null, their_score: null } : { league_result };
    const { error } = await db().from(T.games).update(patch).eq("id", id);
    if (error) throw error;
  }

  const snapshot: LeagueSnapshot = {
    asOf: division.asOf,
    syncedAt: now.toISOString(),
    byes: schedule.byes,
    standings: division.teams
      .map(({ team, games, wins, losses, ties, points }) => ({ team, games, wins, losses, ties, points }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins),
    matrix: {
      teams: division.teams.map((t) => t.team),
      results: Object.fromEntries(division.teams.map((t) => [t.team, t.results])),
    },
    weeks,
  };
  const { error } = await db()
    .from(T.league)
    .upsert({ key: "snapshot", data: snapshot, updated_at: now.toISOString() }, { onConflict: "key" });
  if (error) throw error;

  if (plan.pushes.length) {
    const subs = await getSubscriptions();
    for (const message of plan.pushes) await Promise.all(subs.map((sub) => sendPush(sub, message)));
  }
  return plan.log;
}
