import { describe, expect, it } from "vitest";
import type { Division, LeagueSchedule } from "./league";
import { planSync } from "./leagueSync";
import { localInputToDate } from "./time";

const TZ = "America/Edmonton";
const at = (local: string) => localInputToDate(local, TZ).toISOString();
const now = new Date(at("2026-10-18T12:00"));

const schedule: LeagueSchedule = {
  games: [
    { date: "2026-10-06", time: "18:45", sheet: "8", opponent: "Pullan, E." },
    { date: "2026-10-13", time: "21:00", sheet: "2", opponent: "Lind, S." },
    { date: "2026-10-20", time: "18:45", sheet: "6", opponent: "Kuzma, C." },
    { date: "2026-11-03", time: "18:45", sheet: "7", opponent: "Lacey, S." },
  ],
  byes: ["2026-10-27"],
};
const division: Division = {
  asOf: "Oct 13, 2026",
  teams: [
    {
      team: "Johnston, L.",
      games: 2,
      wins: 1,
      losses: 1,
      ties: 0,
      points: 12,
      results: { "Pullan, E.": "W", "Lind, S.": "L" },
    },
  ],
};
const game = (id: string, local: string, opponent: string, extra: object = {}) => ({
  id,
  starts_at: at(local),
  opponent,
  sheet: null as string | null,
  our_score: null as number | null,
  their_score: null as number | null,
  league_result: null as "W" | "L" | "T" | null,
  ...extra,
});

describe("planSync", () => {
  it("does nothing when the app already matches the league", () => {
    const plan = planSync(
      [
        game("p", "2026-10-06T18:45", "Pullan, E.", { sheet: "8", our_score: 9, their_score: 5, league_result: "W" }),
        game("l", "2026-10-13T21:00", "Lind, S.", { sheet: "2", our_score: 3, their_score: 7, league_result: "L" }),
        game("k", "2026-10-20T18:45", "Kuzma, C.", { sheet: "6" }),
        game("y", "2026-11-03T18:45", "Lacey, S.", { sheet: "7" }),
      ],
      schedule,
      division,
      "Johnston, L.",
      now,
    );
    expect(plan).toMatchObject({ inserts: [], updates: [], results: [], pushes: [] });
  });

  it("adds missing games and applies time/sheet changes, re-arming the reminder", () => {
    const plan = planSync(
      [game("k", "2026-10-20T21:00", "Kuzma, C.", { sheet: "5" })],
      { ...schedule, games: schedule.games.slice(2) },
      division,
      "Johnston, L.",
      now,
    );
    expect(plan.inserts).toEqual([{ starts_at: at("2026-11-03T18:45"), opponent: "Lacey, S.", sheet: "7" }]);
    expect(plan.updates).toEqual([
      { id: "k", patch: { starts_at: at("2026-10-20T18:45"), reminder_sent_at: null, sheet: "6" } },
    ]);
  });

  it("records a league result with no score and tells the team", () => {
    const plan = planSync(
      [game("p", "2026-10-06T18:45", "Pullan, E.", { sheet: "8" })],
      { ...schedule, games: schedule.games.slice(0, 1) },
      division,
      "Johnston, L.",
      now,
    );
    expect(plan.results).toEqual([{ id: "p", league_result: "W", clearScore: false }]);
    expect(plan.pushes[0].title).toBe("Win vs Pullan, E. (league result)");
  });

  it("lets the league win a disagreement, clears our score and says why", () => {
    const plan = planSync(
      [game("l", "2026-10-13T21:00", "Lind, S.", { sheet: "2", our_score: 6, their_score: 5 })],
      { ...schedule, games: schedule.games.slice(1, 2) },
      division,
      "Johnston, L.",
      now,
    );
    expect(plan.results).toEqual([{ id: "l", league_result: "L", clearScore: true }]);
    expect(plan.pushes).toEqual([
      {
        title: "Result changed: league has a Loss vs Lind, S.",
        body: "The app had a Win 6–5. Going with the league and clearing the score. Skip, please check which is right.",
        url: "/games/l",
      },
    ]);
  });

  it("stays quiet when the league agrees with our score", () => {
    const plan = planSync(
      [game("l", "2026-10-13T21:00", "Lind, S.", { sheet: "2", our_score: 3, their_score: 7 })],
      { ...schedule, games: schedule.games.slice(1, 2) },
      division,
      "Johnston, L.",
      now,
    );
    expect(plan.results).toEqual([{ id: "l", league_result: "L", clearScore: false }]);
    expect(plan.pushes).toEqual([]);
  });
});
