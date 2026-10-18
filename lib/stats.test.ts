import { describe, expect, it } from "vitest";
import { charmAndJinx, playerRecords, recordText } from "./stats";

const p = (id: string, sort_order: number) => ({ id, name: id, sort_order, active: true, photo_url: null });
const [lars, egg, mendy, tup] = [p("Lars", 1), p("Egg", 2), p("Mendy", 3), p("Tup", 4)];
const game = (players: (typeof lars)[], result: "W" | "L" | "T" | null, away: string[] = [], scored = false) => ({
  lineup: players.map((player) => ({ position: "skip" as const, player })),
  away,
  our_score: scored ? (result === "W" ? 7 : 3) : null,
  their_score: scored ? (result === "W" ? 3 : 7) : null,
  league_result: scored ? null : result,
});

describe("playerRecords", () => {
  const games = [
    game([lars, egg], "W"),
    game([lars, egg, mendy], "W", [], true),
    game([lars, mendy], "L"),
    game([lars, mendy, tup], "T"),
    game([egg, tup], null), // not played yet
    game([egg, tup], "L", ["Egg"]), // Egg was in the lineup but marked out
  ];
  const rows = playerRecords(games, [lars, egg, mendy, tup]);
  const by = (id: string) => rows.find((r) => r.player.id === id)!;

  it("counts only games each player actually played, with the league result when no score", () => {
    expect(recordText(by("Lars"))).toBe("2–1–1");
    expect(recordText(by("Egg"))).toBe("2–0");
    expect(recordText(by("Mendy"))).toBe("1–1–1");
    expect(recordText(by("Tup"))).toBe("0–1–1");
  });

  it("names the lucky charm and the jinx", () => {
    const { charm, jinx } = charmAndJinx(rows);
    expect(charm?.player.id).toBe("Egg");
    expect(jinx?.player.id).toBe("Tup");
  });

  it("hands out no titles when everyone's record is the same", () => {
    expect(charmAndJinx(playerRecords([game([lars, egg], "W")], [lars, egg]))).toEqual({ charm: null, jinx: null });
  });
});
