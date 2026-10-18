import { describe, expect, it } from "vitest";
import { gamesDueForReminder, reminderMessage } from "./reminder";
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
  const now = new Date("2026-10-19T00:00:00Z"); // 6pm Oct 18 local
  const game = (local: string, reminded: string | null = null) => ({
    starts_at: localInputToDate(local, TZ).toISOString(),
    reminder_sent_at: reminded,
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

  it("lists the lineup skip-first with the opponent and sheet", () => {
    expect(reminderMessage(g, null)).toEqual({
      title: "Game tomorrow 7:00pm vs Smith",
      body: "7:00pm vs Smith — Sheet 3. Playing: Dave (S), Mike (V), Tom (2), Rob (L)",
    });
  });

  it("personalizes the title", () => {
    expect(reminderMessage(g, "t").title).toBe("You're playing tomorrow 7:00pm vs Smith");
    expect(reminderMessage(g, "x").title).toBe("Game tomorrow 7:00pm vs Smith (you're sitting out)");
  });
});
