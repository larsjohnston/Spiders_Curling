import { describe, expect, it } from "vitest";
import { endTotals, parseEnds } from "./ends";

const row = (us = "", them = "") => ({ us, them });

describe("parseEnds", () => {
  it("drops untouched rows after the last end played and treats blanks as 0", () => {
    const r = parseEnds([row("2"), row("", "1"), row(), row("3"), row(), row(), row(), row()]);
    expect(r).toEqual({
      ends: [
        { us: 2, them: 0 },
        { us: 0, them: 1 },
        { us: 0, them: 0 },
        { us: 3, them: 0 },
      ],
    });
  });

  it("returns no ends when nothing was typed", () => {
    expect(parseEnds(Array.from({ length: 8 }, () => row()))).toEqual({ ends: [] });
  });

  it("rejects more than eight in an end, both teams scoring, and too many ends", () => {
    expect(parseEnds([row("9")])).toEqual({ error: "End 1: scores are 0–8" });
    expect(parseEnds([row("1"), row("1", "2")])).toEqual({ error: "End 2: only one team can score in an end" });
    expect(parseEnds([row("1.5")])).toEqual({ error: "End 1: scores are 0–8" });
    expect(parseEnds(Array.from({ length: 11 }, () => row("1")))).toEqual({ error: "No more than 10 ends" });
  });
});

describe("endTotals", () => {
  it("adds up both sides", () => {
    expect(
      endTotals([
        { us: 2, them: 0 },
        { us: 0, them: 3 },
        { us: 1, them: 0 },
      ]),
    ).toEqual({ us: 3, them: 3 });
  });
});
