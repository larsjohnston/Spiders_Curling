import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { guessTabs, normalizeSheetUrl, parseDivision, parseSchedule, parseTabs, parseWeeks } from "./league";

// Real pages saved from the league's published sheet (Oct 18, 2026).
const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parseSchedule", () => {
  const { games, byes } = parseSchedule(fixture("league-schedule.html"), "Johnston, L.");

  it("finds all of our games with date, draw time, sheet and opponent", () => {
    expect(games).toEqual([
      { date: "2026-09-29", time: "21:00", sheet: "3", opponent: "Patel, R." },
      { date: "2026-10-06", time: "18:45", sheet: "8", opponent: "Pullan, E." },
      { date: "2026-10-13", time: "21:00", sheet: "2", opponent: "Lind, S." },
      { date: "2026-10-20", time: "18:45", sheet: "6", opponent: "Kuzma, C." },
      { date: "2026-11-03", time: "18:45", sheet: "7", opponent: "Lacey, S." },
      { date: "2026-11-10", time: "21:00", sheet: "1", opponent: "Fish, M." },
      { date: "2026-11-17", time: "18:45", sheet: "7", opponent: "Dickson, J." },
      { date: "2026-11-24", time: "21:00", sheet: "2", opponent: "Scott, J." },
    ]);
  });

  it("finds our bye week", () => {
    expect(byes).toEqual(["2026-10-27"]);
  });
});

describe("parseWeeks", () => {
  const weeks = parseWeeks(fixture("league-schedule.html"));

  it("reads every week of the whole league", () => {
    expect(weeks.map((w) => w.date)).toEqual([
      "2026-09-29", "2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27",
      "2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24",
    ]);
    // 8 sheets × 2 draws, and 2 byes per draw.
    for (const w of weeks) {
      expect(w.games).toHaveLength(16);
      expect(w.byes).toHaveLength(4);
    }
  });

  it("keeps draw time, sheet and division for each game", () => {
    expect(weeks[0].games).toContainEqual({ time: "21:00", sheet: "3", division: "C", teams: ["Patel, R.", "Johnston, L."] });
    expect(weeks[0].games).toContainEqual({ time: "18:45", sheet: "1", division: "A", teams: ["Poon, J.", "Jones, D."] });
    expect(weeks[0].byes).toEqual(["Dubé, M.", "Macinnis, G.", "Lind, S.", "Edgerton, S."]);
  });
});

describe("parseDivision", () => {
  const div = parseDivision(fixture("league-division-c.html"));
  const us = div.teams.find((t) => t.team === "Johnston, L.")!;

  it("reads every team's totals", () => {
    expect(div.asOf).toBe("Oct 13, 2026");
    expect(div.teams).toHaveLength(9);
    expect(us).toMatchObject({ games: 3, wins: 2, losses: 1, ties: 0, points: 22 });
    expect(div.teams.find((t) => t.team === "Scott, J.")).toMatchObject({ wins: 3, points: 30 });
  });

  it("lines up results with the right opponents", () => {
    expect(us.results).toEqual({ "Lind, S.": "L", "Patel, R.": "W", "Pullan, E.": "W" });
    // Each result is mirrored in the opponent's row.
    expect(div.teams.find((t) => t.team === "Lind, S.")!.results["Johnston, L."]).toBe("W");
    // Kuzma's weeks 1–3 per the schedule: Lacey, Patel, Dickson.
    expect(div.teams.find((t) => t.team === "Kuzma, C.")!.results).toEqual({
      "Lacey, S.": "T",
      "Patel, R.": "W",
      "Dickson, J.": "L",
    });
  });

  it("is internally consistent: every result is mirrored by the opponent", () => {
    const flip = { W: "L", L: "W", T: "T" } as const;
    for (const t of div.teams) {
      for (const [opp, r] of Object.entries(t.results)) {
        expect(div.teams.find((o) => o.team === opp)!.results[t.team]).toBe(flip[r]);
      }
    }
  });
});

describe("new-season helpers", () => {
  const KEY = "2PACX-1vTUPsPnr8e_P6LHQ-SSmOfITHg5KsQyfs0TmuGvFiRDtL03U3BR0GCb2pqxvAPVcq2U4KglWAjc1lDx";
  const BASE = `https://docs.google.com/spreadsheets/d/e/${KEY}/pubhtml`;

  it("accepts any form of a published sheet link", () => {
    expect(normalizeSheetUrl(`${BASE}#gid=1235377529`)).toBe(BASE);
    expect(normalizeSheetUrl(`  ${BASE}/sheet?headers=false&gid=1418151424 `)).toBe(BASE);
    expect(normalizeSheetUrl(`https://docs.google.com/spreadsheets/d/e/${KEY}/pub?output=csv`)).toBe(BASE);
    expect(normalizeSheetUrl("https://example.com/schedule")).toBeNull();
  });

  it("lists the tabs and picks the schedule and our division", () => {
    const tabs = parseTabs(fixture("league-index.html"));
    expect(tabs.map((t) => t.name)).toEqual(["Sch-Sq1", "A-Sq1", "B-Sq1", "C-Sq1", "D-Sq1", "Stgs-Sq1", "TUE-Sch📺"]);
    expect(guessTabs(tabs, "C")).toEqual({ scheduleGid: "1418151424", divisionGid: "1235377529" });
    expect(guessTabs(tabs, "b")).toEqual({ scheduleGid: "1418151424", divisionGid: "474263792" });
  });
});
