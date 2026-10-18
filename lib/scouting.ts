import type { Result } from "./types";

type Standing = { team: string; wins: number; losses: number; ties: number; games: number };
type League = {
  standings: Standing[];
  matrix?: { results: Record<string, Record<string, Result>> };
};

const last = (team: string) => team.split(",")[0];

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A one-line, mildly abusive scouting report on an opponent from the league data:
 * a verdict on their season, then who they've beaten, lost to and tied.
 */
export function scoutingReport(opponent: string, us: string, league: League | null): string | null {
  const standings = league?.standings ?? [];
  const idx = standings.findIndex((s) => s.team === opponent);
  if (idx < 0) return null;
  const t = standings[idx];
  const rank = idx + 1;
  const results = league?.matrix?.results[opponent] ?? {};
  const vsUs = results[us];
  const record = `${t.wins}–${t.losses}${t.ties ? `–${t.ties}` : ""}`;

  let verdict: string;
  if (vsUs === "W") verdict = "They already beat us once. Revenge game, boys.";
  else if (vsUs === "L") verdict = "We already beat them once. They remember.";
  else if (t.games === 0) verdict = "Haven't played yet. Total mystery.";
  else if (t.losses === 0 && t.ties === 0) verdict = `Undefeated at ${record}. Bring a helmet.`;
  else if (t.wins === 0 && t.ties === 0) verdict = `Winless at ${record}. Lose to these guys and we're buying every jug.`;
  else if (rank === 1) verdict = `First in the division at ${record}. Act natural.`;
  else if (rank === standings.length) verdict = `Dead last at ${record}. Don't screw this up.`;
  else if (t.ties > 0) verdict = `${record} with a tie. The Switzerland of the division.`;
  else if (t.wins > t.losses) verdict = `${record}. Winning record, so we'll actually have to try.`;
  else if (t.wins < t.losses) verdict = `${record}. Losing record. Shouldn't need the hammer.`;
  else verdict = `${record}. Perfectly mediocre.`;

  const others = Object.entries(results).filter(([team]) => team !== us);
  const by = (r: Result) => others.filter(([, v]) => v === r).map(([team]) => last(team));
  const facts = [
    by("W").length && `Beat ${list(by("W"))}`,
    by("L").length && `lost to ${list(by("L"))}`,
    by("T").length && `tied ${list(by("T"))}`,
  ].filter(Boolean) as string[];
  if (facts.length === 0) return verdict;
  const sentence = facts.join(", ");
  return `${verdict} ${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}
