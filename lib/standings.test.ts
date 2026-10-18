import { describe, expect, it } from "vitest";
import { standingsMessage } from "./standings";

const US = "Johnston, L.";
const t = (team: string, points: number, wins = 0) => ({ team, points, wins });
const before = [t("Scott, J.", 30), t(US, 22), t("Dickson, J.", 22), t("Kuzma, C.", 18), t("Fish, M.", 14)];

describe("standingsMessage", () => {
  it("stays quiet on the first sync, when nothing moved, and when the teams changed", () => {
    expect(standingsMessage(undefined, before, US, "C")).toBeNull();
    expect(standingsMessage(before, before, US, "C")).toBeNull();
    const morePoints = before.map((s) => (s.team === US ? { ...s, points: 32 } : s));
    expect(standingsMessage(before, morePoints, US, "C")).toBeNull(); // still 2nd
    expect(standingsMessage(before, [t("Someone, X.", 50), ...before], US, "C")).toBeNull(); // new square
  });

  it("celebrates moving up, naming who we passed", () => {
    const after = [t(US, 32), t("Scott, J.", 30), t("Dickson, J.", 22), t("Kuzma, C.", 18), t("Fish, M.", 14)];
    expect(standingsMessage(before, after, US, "C")).toEqual({
      title: "Spiders take 1st in Division C 🥇",
      body: "32 pts. Passed Scott. Top of the table. Act like you've been there.",
    });
  });

  it("mourns moving down, naming who got by", () => {
    const after = [t("Scott, J.", 30), t("Dickson, J.", 32), t("Kuzma, C.", 28), t(US, 22), t("Fish, M.", 14)];
    expect(standingsMessage(before, after, US, "C")).toEqual({
      title: "Spiders slip to 4th in Division C",
      body: "22 pts. Dickson and Kuzma got by. They all walked past us. Awkward.",
    });
    const bottom = [t("Scott, J.", 30), t("Dickson, J.", 32), t("Kuzma, C.", 28), t("Fish, M.", 24), t(US, 22)];
    expect(standingsMessage(before, bottom, US, "C")?.title).toBe("Spiders drop to dead last in Division C");
  });
});
