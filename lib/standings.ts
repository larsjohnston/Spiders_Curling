type Standing = { team: string; points: number; wins: number };

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const ordinal = (n: number) => ORDINAL[n] ?? `${n}th`;
const last = (team: string) => team.split(",")[0];

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Team-wide push when the hourly sync sees our place in the division change.
 * Nothing on the first sync, nothing when only the points moved, and nothing if the roster of
 * teams changed (new square): only a real move up or down the table.
 */
export function standingsMessage(
  before: Standing[] | undefined,
  after: Standing[],
  team: string,
  division: string,
): { title: string; body: string } | null {
  if (!before?.length) return null;
  const was = before.findIndex((s) => s.team === team) + 1;
  const now = after.findIndex((s) => s.team === team) + 1;
  if (!was || !now || was === now) return null;
  const sameTeams = before.length === after.length && before.every((s) => after.some((t) => t.team === s.team));
  if (!sameTeams) return null;

  const us = after[now - 1];
  const record = `${us.points} pts`;
  if (now < was) {
    const passed = after.slice(now, was).map((s) => last(s.team));
    const title =
      now === 1
        ? `Spiders take 1st in Division ${division} 🥇`
        : `Spiders climb to ${ordinal(now)} in Division ${division}`;
    const snark =
      now === 1
        ? "Top of the table. Act like you've been there."
        : now === 2
          ? "Second place. Someone above us just felt a chill."
          : "Climbing. Don't look down.";
    return { title, body: `${record}. Passed ${list(passed)}. ${snark}` };
  }
  const passedBy = after.slice(was - 1, now - 1).map((s) => last(s.team));
  const title =
    now === after.length
      ? `Spiders drop to dead last in Division ${division}`
      : `Spiders slip to ${ordinal(now)} in Division ${division}`;
  const snark =
    now === after.length
      ? "The beer's still cold though."
      : passedBy.length > 1
        ? "They all walked past us. Awkward."
        : "Walked right past us. Awkward.";
  return { title, body: `${record}. ${list(passedBy)} got by. ${snark}` };
}
