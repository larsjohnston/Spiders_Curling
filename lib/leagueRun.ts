import "server-only";
import { T, type LeagueConfig } from "./config";
import { db } from "./db";
import { getGames, getLeagueConfig, type LeagueSnapshot } from "./data";
import { guessTabs, parseDivision, parseSchedule, parseTabs, parseWeeks, tabUrl, type LeagueGame } from "./league";
import { planSync } from "./leagueSync";
import { getSubscriptions, sendPush } from "./push";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`League sheet: HTTP ${res.status}`);
  return res.text();
}

/**
 * Pull the league sheet and apply it. Returns a human-readable log of what changed.
 * With `dryRun`, returns what would change (and the pushes it would send) without writing anything.
 */
export async function syncLeague(
  now = new Date(),
  { dryRun = false, config: given }: { dryRun?: boolean; config?: LeagueConfig } = {},
): Promise<string[]> {
  const config = given ?? (await getLeagueConfig());
  const [scheduleHtml, divisionHtml] = await Promise.all([
    fetchHtml(tabUrl(config.sheetUrl, config.scheduleGid)),
    fetchHtml(tabUrl(config.sheetUrl, config.divisionGid)),
  ]);
  const schedule = parseSchedule(scheduleHtml, config.team);
  const weeks = parseWeeks(scheduleHtml);
  const division = parseDivision(divisionHtml);
  // A layout change on the league's side shouldn't look like "every game was cancelled".
  if (schedule.games.length === 0) throw new Error(`No games for ${config.team} found in the league schedule`);
  if (!division.teams.some((t) => t.team === config.team)) throw new Error(`${config.team} missing from division grid`);

  let plan = planSync(await getGames(config.season), schedule, division, config.team, now);
  if (dryRun) return [...plan.log, ...plan.pushes.map((p) => `Would push: ${p.title}`)];
  if (plan.inserts.length) {
    const { error } = await db()
      .from(T.games)
      .insert(plan.inserts.map((g) => ({ ...g, season: config.season })));
    if (error) throw error;
    // Plan again so the new games also pick up their league results in this run.
    const again = planSync(await getGames(config.season), schedule, division, config.team, now);
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

export type SheetPreview = {
  config: LeagueConfig;
  tabs: { name: string; gid: string }[];
  games: LeagueGame[];
  byes: string[];
  divisionTeams: string[];
};

/**
 * Check a new league sheet before switching to it: find its tabs, guess the schedule and division tabs
 * (unless given), and read our games. Throws with a readable message if something's off.
 */
export async function previewSheet(input: {
  sheetUrl: string;
  season: string;
  team: string;
  division: string;
  scheduleGid?: string;
  divisionGid?: string;
}): Promise<SheetPreview> {
  const tabs = parseTabs(await fetchHtml(input.sheetUrl));
  if (tabs.length === 0) throw new Error("That link doesn't look like a published Google Sheet (no tabs found)");
  const guess = guessTabs(tabs, input.division);
  const scheduleGid = input.scheduleGid || guess.scheduleGid;
  const divisionGid = input.divisionGid || guess.divisionGid;
  if (!scheduleGid) throw new Error("Couldn't find the schedule tab. Pick it from the list.");
  if (!divisionGid) throw new Error(`Couldn't find the Division ${input.division} tab. Pick it from the list.`);

  const [scheduleHtml, divisionHtml] = await Promise.all([
    fetchHtml(tabUrl(input.sheetUrl, scheduleGid)),
    fetchHtml(tabUrl(input.sheetUrl, divisionGid)),
  ]);
  const { games, byes } = parseSchedule(scheduleHtml, input.team);
  const division = parseDivision(divisionHtml);
  if (games.length === 0) throw new Error(`No games for "${input.team}" in that schedule. Check the team name.`);
  return {
    config: { season: input.season, sheetUrl: input.sheetUrl, team: input.team, division: input.division, scheduleGid, divisionGid },
    tabs,
    games,
    byes,
    divisionTeams: division.teams.map((t) => t.team),
  };
}
