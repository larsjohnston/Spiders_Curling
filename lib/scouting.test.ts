import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDivision } from "./league";
import { scoutingReport } from "./scouting";

const div = parseDivision(readFileSync(join(__dirname, "__fixtures__", "league-division-c.html"), "utf8"));
const league = {
  standings: [...div.teams].sort((a, b) => b.points - a.points || b.wins - a.wins),
  matrix: { results: Object.fromEntries(div.teams.map((t) => [t.team, t.results])) },
};
const US = "Johnston, L.";

describe("scoutingReport (real Division C data, Oct 13)", () => {
  it("roasts each kind of opponent", () => {
    expect(scoutingReport("Scott, J.", US, league)).toBe(
      "Undefeated at 3–0. Bring a helmet. Beat Fish, Dickson and Pullan.",
    );
    expect(scoutingReport("Kuzma, C.", US, league)).toBe(
      "1–1–1 with a tie. The Switzerland of the division. Beat Patel, lost to Dickson, tied Lacey.",
    );
    expect(scoutingReport("Lacey, S.", US, league)).toBe(
      "0–1–1 with a tie. The Switzerland of the division. Lost to Pullan, tied Kuzma.",
    );
  });

  it("brings up our own history with them first", () => {
    expect(scoutingReport("Lind, S.", US, league)).toMatch(/^They already beat us once\. Revenge game, boys\./);
    expect(scoutingReport("Patel, R.", US, league)).toMatch(/^We already beat them once\. They remember\./);
  });

  it("says nothing about teams it doesn't know", () => {
    expect(scoutingReport("Nobody, X.", US, league)).toBeNull();
    expect(scoutingReport("Scott, J.", US, null)).toBeNull();
  });
});
