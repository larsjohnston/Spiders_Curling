// Parsers for the league's published Google Sheet (pubhtml pages). Pure functions, no I/O.
import type { Result } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TEAM_NAME = /^[A-Z][\p{L}'’.-]*(?:[ -][\p{L}'’.-]+)*, [A-Z]\.$/u; // "Johnston, L.", "Ramos-Strankman, L."

function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Cell text for every <tr> in a published sheet page (row-number <th> cells are skipped). */
export function tableRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decode(m[1]));
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function isoDate(text: string): string | null {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(text);
  if (!m || !MONTHS.includes(m[1])) return null;
  return `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** "6:45" → "18:45". All league draws are evening games. */
function eveningTime(text: string): string {
  const [h, m] = text.split(":").map(Number);
  return `${String(h < 12 ? h + 12 : h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type LeagueGame = { date: string; time: string; sheet: string; opponent: string };
export type LeagueSchedule = { games: LeagueGame[]; byes: string[] };

export type WeekGame = { time: string; sheet: string; division: string; teams: [string, string] };
export type LeagueWeek = { date: string; games: WeekGame[]; byes: string[] };

/**
 * The season schedule tab, every game in the league: date rows ("Sep 29, 2026"), a header row per draw
 * block ("Ice | Div | | 6:45"), then one row per sheet with both draws side by side
 * ("3 | C | Patel, R. | vs. | Johnston, L."), and a "Bye" row per draw.
 */
export function parseWeeks(html: string): LeagueWeek[] {
  const weeks: LeagueWeek[] = [];
  let week: LeagueWeek | null = null;
  let blocks: { col: number; time: string }[] = [];

  for (const row of tableRows(html)) {
    const d = row.map(isoDate).find(Boolean);
    if (d) {
      week = { date: d, games: [], byes: [] };
      weeks.push(week);
      blocks = [];
      continue;
    }
    if (row.includes("Ice") && row.includes("Div")) {
      blocks = row.flatMap((cell, col) => {
        if (cell !== "Ice") return [];
        const time = row.slice(col).find((c) => /^\d{1,2}:\d{2}$/.test(c));
        return time ? [{ col, time: eveningTime(time) }] : [];
      });
      continue;
    }
    if (!week) continue;
    for (const { col, time } of blocks) {
      const [ice, division, a, vs, b] = row.slice(col, col + 5);
      if (ice === "Bye") week.byes.push(...[a, b].filter((t) => t && TEAM_NAME.test(t)));
      else if (vs === "vs." && a && b) week.games.push({ time, sheet: ice, division, teams: [a, b] });
    }
  }
  return weeks;
}

/** Our games and bye weeks, from the full schedule. */
export function parseSchedule(html: string, team: string): LeagueSchedule {
  const weeks = parseWeeks(html);
  const games = weeks.flatMap(({ date, games }) =>
    games
      .filter((g) => g.teams.includes(team))
      .map((g) => ({ date, time: g.time, sheet: g.sheet, opponent: g.teams[0] === team ? g.teams[1] : g.teams[0] })),
  );
  const byes = weeks.filter((w) => w.byes.includes(team)).map((w) => w.date);
  return { games, byes };
}

export type StandingsRow = {
  team: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  results: Record<string, Result>;
};
export type Division = { asOf: string | null; teams: StandingsRow[] };

/**
 * The division results grid: one row per team, then one column per opponent in the same order as the
 * rows (a team's own column is blank), then games / wins / losses / ties / points.
 * The vertical header letters don't line up with the data columns, so columns are located from the
 * diagonal instead of the header.
 */
export function parseDivision(html: string): Division {
  const rows = tableRows(html);
  const asOf = rows.flat().map((c) => /^as of (.+)$/.exec(c)?.[1]).find(Boolean) ?? null;
  const teamRows = rows
    .map((cells) => ({ cells, at: cells.findIndex((c) => TEAM_NAME.test(c)) }))
    .filter((r) => r.at >= 0 && r.cells.slice(r.at + 1).some((c) => /^[WLT]$|^\d+$/.test(c)));
  const n = teamRows.length;
  if (n === 0) return { asOf, teams: [] };

  // First result column: the offset where every team's own (diagonal) cell is blank and every W/L/T
  // falls inside the n opponent columns.
  const nameCol = teamRows[0].at;
  const start = [1, 2, 3, 4].map((k) => nameCol + k).find((s) =>
    teamRows.every(({ cells }, i) => {
      if (cells[s + i]) return false;
      return cells.every((c, col) => !/^[WLT]$/.test(c) || (col >= s && col < s + n));
    }),
  );
  if (start === undefined) throw new Error("Couldn't line up the division grid columns");

  const names = teamRows.map((r) => r.cells[r.at]);
  const teams = teamRows.map(({ cells, at }) => {
    const results: Record<string, Result> = {};
    names.forEach((opp, j) => {
      const v = cells[start + j];
      if (v === "W" || v === "L" || v === "T") results[opp] = v;
    });
    const [games, wins, losses, ties, points] = cells.slice(start + n, start + n + 5).map((c) => Number(c) || 0);
    return { team: cells[at], games, wins, losses, ties, points, results };
  });
  return { asOf, teams };
}
