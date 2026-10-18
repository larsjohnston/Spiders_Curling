import { describe, expect, it } from "vitest";
import { availabilityMessage, gamesDueForReminder, reminderMessage, resultMessage } from "./reminder";
import { dateToLocalInput, localInputToDate, tomorrowKey } from "./time";
import type { Game } from "./types";

const TZ = "America/Edmonton";
const player = (id: string, name: string) => ({ id, name, sort_order: 0, active: true, photo_url: null });

describe("time helpers", () => {
  it("converts Edmonton wall time to UTC across DST", () => {
    expect(localInputToDate("2026-10-20T19:00", TZ).toISOString()).toBe("2026-10-21T01:00:00.000Z"); // MDT
    // Winter cases use 2025: tzdata 2026c+ has Alberta staying on UTC−6 from Nov 2026, older data
    // doesn't, and these tests shouldn't depend on which version the machine has.
    expect(localInputToDate("2025-12-01T19:00", TZ).toISOString()).toBe("2025-12-02T02:00:00.000Z"); // MST
  });

  it("round-trips to the datetime-local format", () => {
    expect(dateToLocalInput(new Date("2025-12-02T02:00:00Z"), TZ)).toBe("2025-12-01T19:00");
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
    const winter = [game("2025-12-03T21:00")];
    expect(gamesDueForReminder(winter, new Date("2025-12-03T01:00:00Z"))).toHaveLength(0); // 6pm MST
    expect(gamesDueForReminder(winter, new Date("2025-12-03T02:00:00Z"))).toHaveLength(1); // 7pm MST
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

  it("adds the opponent's league record when known", () => {
    expect(reminderMessage(g, "t", "1–1–1").title).toBe("Tomorrow 7:00pm vs Smith (1–1–1)");
  });
});

describe("availabilityMessage", () => {
  const g = {
    starts_at: localInputToDate("2026-10-20T18:45", TZ).toISOString(),
    opponent: "Kuzma, C.",
    lineup: [
      { position: "skip" as const, player: player("l", "Lars") },
      { position: "vice" as const, player: player("e", "Egg") },
    ],
  };

  it("flags a starter dropping out and a short-handed team", () => {
    expect(availabilityMessage(g, { id: "e", name: "Egg" }, true, 3, 6)).toEqual({
      title: "Egg can't make it: Tue, Oct 20 6:45pm vs Kuzma, C.",
      body: "3 of 6 available · was in the lineup, needs a sub · short-handed (need 4)",
    });
  });

  it("leads with the excuse when there is one", () => {
    expect(availabilityMessage(g, { id: "t", name: "Tup" }, true, 5, 6, "🐱 Wife said no. I'm a pussy.").body).toBe(
      `"🐱 Wife said no. I'm a pussy." · 5 of 6 available`,
    );
  });

  it("keeps it short for a sub, and for coming back in", () => {
    expect(availabilityMessage(g, { id: "t", name: "Tup" }, true, 5, 6).body).toBe("5 of 6 available");
    expect(availabilityMessage(g, { id: "t", name: "Tup" }, false, 6, 6)).toEqual({
      title: "Tup is back in: Tue, Oct 20 6:45pm vs Kuzma, C.",
      body: "6 of 6 available",
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

  it("brags about the jugs in the title", () => {
    expect(resultMessage({ ...g, jugs: 3 }).title).toBe("Win 9–8 vs Patel, R. 🍺×3");
    expect(resultMessage({ ...g, jugs: 0 }).title).toBe("Win 9–8 vs Patel, R.");
  });

  it("falls back to who played, and trims long stories", () => {
    expect(resultMessage({ ...g, our_score: 3, their_score: 7 })).toEqual({
      title: "Loss 3–7 vs Patel, R.",
      body: "Played: Ostash, Egg",
    });
    expect(resultMessage({ ...g, story: "x".repeat(500) }).body).toHaveLength(180);
  });
});
