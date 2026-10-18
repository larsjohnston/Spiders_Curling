import { describe, expect, it } from "vitest";
import { buildCalendar } from "./ics";

const p = (id: string) => ({ id, name: id, sort_order: 0, active: true, photo_url: null });
const base = {
  sheet: "6",
  away: [] as string[],
  our_score: null as number | null,
  their_score: null as number | null,
  league_result: null as "W" | "L" | "T" | null,
};
const games = [
  {
    ...base,
    id: "g1",
    starts_at: "2026-10-21T00:45:00Z",
    opponent: "Kuzma, C.",
    lineup: [
      { position: "skip" as const, player: p("Lars") },
      { position: "vice" as const, player: p("Mendy") },
    ],
    away: ["Egg"],
  },
  { ...base, id: "g0", starts_at: "2026-09-30T03:00:00Z", opponent: "Patel, R.", lineup: [], our_score: 9, their_score: 8 },
];
const opts = { siteUrl: "https://spiders.example", now: new Date("2026-10-18T12:00:00Z") };

describe("buildCalendar", () => {
  const ics = buildCalendar(games, opts);
  const unfolded = ics.replace(/\r\n /g, "");

  it("is a valid-looking iCalendar feed with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    expect(unfolded).toContain("DTSTART:20261021T004500Z");
    expect(unfolded).toContain("DTEND:20261021T024500Z");
    expect(unfolded).toContain("LOCATION:Sheet 6");
    expect(unfolded).toContain("UID:g1@spiders-curling");
  });

  it("escapes commas and shows results on past games", () => {
    expect(unfolded).toContain("SUMMARY:🥌 Spiders vs Kuzma\\, C.");
    expect(unfolded).toContain("SUMMARY:🥌 W 9–8 vs Patel\\, R.");
    expect(unfolded).toContain("DESCRIPTION:Playing: Lars\\, Mendy\\nhttps://spiders.example/games/g1");
  });

  it("personalizes titles for one player", () => {
    expect(buildCalendar(games, { ...opts, playerId: "Lars" })).toContain("vs Kuzma\\, C. (you're playing)");
    expect(buildCalendar(games, { ...opts, playerId: "Tup" })).toContain("vs Kuzma\\, C. (sub)");
    expect(buildCalendar(games, { ...opts, playerId: "Egg" })).toContain("vs Kuzma\\, C. (you're out)");
  });
});
