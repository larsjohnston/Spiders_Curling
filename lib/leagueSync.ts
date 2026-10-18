import { TIMEZONE } from "./config";
import type { Division, LeagueSchedule } from "./league";
import { localDateKey, localInputToDate } from "./time";
import { resultOf, type Game, type Result } from "./types";

type GameFields = { starts_at: string; opponent: string; sheet: string };
const WORD: Record<Result, string> = { W: "Win", L: "Loss", T: "Tie" };

export type SyncPlan = {
  inserts: GameFields[];
  updates: { id: string; patch: Partial<GameFields> & { reminder_sent_at?: null } }[];
  results: { id: string; league_result: Result; clearScore: boolean }[];
  pushes: { title: string; body: string; url: string }[];
  log: string[];
};

/**
 * Work out what the league sheet changes. Games are matched by calendar date (one game a week).
 * The league owns date/time/sheet/opponent and the W/L/T; lineups, availability and stories are ours.
 * If the league's result disagrees with the score entered in the app, the league wins: the score is
 * cleared and the team is told so the skip can sort it out.
 */
export function planSync(
  games: Pick<Game, "id" | "starts_at" | "opponent" | "sheet" | "our_score" | "their_score" | "league_result">[],
  schedule: LeagueSchedule,
  division: Division,
  team: string,
  now: Date,
): SyncPlan {
  const plan: SyncPlan = { inserts: [], updates: [], results: [], pushes: [], log: [] };
  const byDate = new Map(games.map((g) => [localDateKey(new Date(g.starts_at), TIMEZONE), g]));
  const ours = division.teams.find((t) => t.team === team)?.results ?? {};

  for (const lg of schedule.games) {
    const startsAt = localInputToDate(`${lg.date}T${lg.time}`, TIMEZONE).toISOString();
    const game = byDate.get(lg.date);
    if (!game) {
      plan.inserts.push({ starts_at: startsAt, opponent: lg.opponent, sheet: lg.sheet });
      plan.log.push(`Added ${lg.date} vs ${lg.opponent}`);
      continue;
    }

    const patch: SyncPlan["updates"][number]["patch"] = {};
    if (new Date(game.starts_at).toISOString() !== startsAt) Object.assign(patch, { starts_at: startsAt, reminder_sent_at: null });
    if (game.opponent !== lg.opponent) patch.opponent = lg.opponent;
    if ((game.sheet ?? "") !== lg.sheet) patch.sheet = lg.sheet;
    if (Object.keys(patch).length) {
      plan.updates.push({ id: game.id, patch });
      plan.log.push(`Updated ${lg.date}: ${Object.keys(patch).filter((k) => k !== "reminder_sent_at").join(", ")}`);
    }

    const league = ours[lg.opponent];
    if (!league || league === game.league_result || new Date(startsAt) > now) continue;
    const app = resultOf(game);
    const url = `/games/${game.id}`;
    const clearScore = app !== null && app !== league;
    plan.results.push({ id: game.id, league_result: league, clearScore });
    plan.log.push(`League result ${lg.date} vs ${lg.opponent}: ${league}${clearScore ? ` (app had ${app}, score cleared)` : ""}`);
    if (clearScore) {
      plan.pushes.push({
        title: `Result changed: league has a ${WORD[league]} vs ${lg.opponent}`,
        body: `The app had a ${WORD[app!]} ${game.our_score}–${game.their_score}. Going with the league and clearing the score. Skip, please check which is right.`,
        url,
      });
    } else if (app === null) {
      plan.pushes.push({
        title: `${WORD[league]} vs ${lg.opponent} (league result)`,
        body: "No score in the app yet. Tap to add the score and a Game Story.",
        url,
      });
    }
  }
  return plan;
}
