import type { End } from "./types";

/** Most ends a rec game can run to; the score page starts with eight. */
export const MAX_ENDS = 10;
export const DEFAULT_ENDS = 8;
/** The most one team can score in a single end. */
export const MAX_PER_END = 8;

/** What the score form sends: one row per end, either side blank if not typed. */
export type EndInput = { us: string; them: string };

/**
 * Turn the form's rows into saved ends. Blanks count as 0 (a blank end is 0–0), and rows after the
 * last one anyone typed in are dropped, so eight empty rows mean "no ends entered".
 */
export function parseEnds(rows: EndInput[]): { ends: End[] } | { error: string } {
  if (rows.length > MAX_ENDS) return { error: `No more than ${MAX_ENDS} ends` };
  let last = -1;
  rows.forEach((r, i) => {
    if (r.us.trim() !== "" || r.them.trim() !== "") last = i;
  });
  const ends: End[] = [];
  for (const [i, row] of rows.slice(0, last + 1).entries()) {
    const us = row.us.trim() === "" ? 0 : Number(row.us);
    const them = row.them.trim() === "" ? 0 : Number(row.them);
    for (const v of [us, them]) {
      if (!Number.isInteger(v) || v < 0 || v > MAX_PER_END) return { error: `End ${i + 1}: scores are 0–${MAX_PER_END}` };
    }
    if (us > 0 && them > 0) return { error: `End ${i + 1}: only one team can score in an end` };
    ends.push({ us, them });
  }
  return { ends };
}

/** Running totals of an end list. */
export function endTotals(ends: End[]): { us: number; them: number } {
  return ends.reduce((t, e) => ({ us: t.us + e.us, them: t.them + e.them }), { us: 0, them: 0 });
}
