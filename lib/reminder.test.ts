import { describe, expect, it } from "vitest";
import { gamesDueForReminder, reminderMessage, resultMessage } from "./reminder";
import { dateToLocalInput, localInputToDate, tomorrowKey } from "./time";
import type { Game } from "./types";

const TZ = "America/Edmonton";
const player = (id: string, name: string) => ({ id, name, sort_order: 0, active: true, photo_url: null });

describe("time helpers", () => {
  it("converts Edmonton wall time to UTC across DST", () => {
    expect(localInputToDate("2026-10-20T19:00", TZ).toISOString()).toBe("2026-10-21T01:00:00.000Z"); // MDT
    expect(localInputToDate("2026-12-01T19:00", TZ).toISOString()).toBe("2026-12-02T02:00:00.000Z"); // MST
  });

  it("round-trips to the datetime-local format", () => {
    expect(dateToLocalInput(new Date("2026-12-02T02:00:00Z"), TZ)).toBe("2026-12-01T19:00");
  });

  it("finds tomorrow in the team timezone, not UTC", () => {
    // 6pm Oct 18 in Edmonton is already Oct 19 in UTC.
    expect(tomorrowKey(new Date("2026-10-19T00:00:00Z"), TZ)).toBe("2026-10-19");
    expect(tomorrowKey(new Date("2026-12-31T20:00:00Z"), TZ)).toBe("2027-01-01");
  });
});

describe("gamesDueForReminder", () => {
  const now = new Date("2026-10-19T01:00:00Z"); // 7pm Oct 18 local (MDT)
  const game = (local: string, reminded: string | null = null) => ({
    starts_at: localInputToDate(local, TZ).toISOString(),
    reminder_sent_at: reminded,
  });

  it("waits until 7pm local, in summer and winter time", () => {
    const tomorrow = [game("2026-10-19T21:00")];
    expect(gamesDueForReminder(tomorrow, new Date("2026-10-19T00:59:00Z"))).toHaveLength(0); // 6:59pm MDT
    expect(gamesDueForReminder(tomorrow, now)).toHaveLength(1);
    const winter = [game("2026-12-02T21:00")];
    expect(gamesDueForReminder(winter, new Date("2026-12-02T01:00:00Z"))).toHaveLength(0); // 6pm MST
    expect(gamesDueForReminder(winter, new Date("2026-12-02T02:00:00Z"))).toHaveLength(1); // 7pm MST
  });

  it("picks only unreminded games on tomorrow's local date", () => {
    const due = gamesDueForReminder(
      [
        game("2026-10-19T09:00"),
        game("2026-10-19T21:30"),
        game("2026-10-19T19:00", "2026-10-18T00:00:00Z"),
        game("2026-10-18T21:00"),
        game("2026-10-20T19:00"),
      ],
      now,
    );
    expect(due.map((g) => g.starts_at)).toEqual([
      localInputToDate("2026-10-19T09:00", TZ).toISOString(),
      localInputToDate("2026-10-19T21:30", TZ).toISOString(),
    ]);
  });
});

describe("reminderMessage", () => {
  const g: Pick<Game, "starts_at" | "opponent" | "sheet" | "lineup"> = {
    starts_at: localInputToDate("2026-10-19T19:00", TZ).toISOString(),
    opponent: "Smith",
    sheet: "3",
    lineup: [
      { position: "lead", player: player("r", "Rob") },
      { position: "skip", player: player("d", "Dave") },
      { position: "vice", player: player("m", "Mike") },
      { position: "second", player: player("t", "Tom") },
    ],
  };

  it("gives opponent, time, sheet and the other three playing", () => {
    expect(reminderMessage(g, "t")).toEqual({
      title: "Tomorrow 7:00pm vs Smith",
      body: "Sheet 3 · Playing with Dave, Mike, Rob",
    });
  });
});

describe("resultMessage", () => {
  const g = {
    opponent: "Patel, R.",
    our_score: 9,
    their_score: 8,
    story: null as string | null,
    lineup: [
      { position: "skip" as const, player: player("o", "Ostash") },
      { position: "vice" as const, player: player("e", "Egg") },
    ],
  };

  it("puts the result in the title and the story in the body", () => {
    expect(resultMessage({ ...g, story: "Stole one in the 8th." })).toEqual({
      title: "Win 9–8 vs Patel, R.",
      body: "Stole one in the 8th.",
    });
  });

  it("falls back to who played, and trims long stories", () => {
    expect(resultMessage({ ...g, our_score: 3, their_score: 7 })).toEqual({
      title: "Loss 3–7 vs Patel, R.",
      body: "Played: Ostash, Egg",
    });
    expect(resultMessage({ ...g, story: "x".repeat(500) }).body).toHaveLength(180);
  });
});
