import { POSITIONS } from "./config";
import { effectiveResult, resultOf, type Game } from "./types";

const GAME_MINUTES = 120;

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 line folding: lines over 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = " ";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

/**
 * A subscribable calendar of the team's games. With `playerId`, each title says whether that person
 * is playing, a sub or out, so their phone calendar is personal.
 */
export function buildCalendar(
  games: Pick<Game, "id" | "starts_at" | "opponent" | "sheet" | "lineup" | "away" | "our_score" | "their_score" | "league_result">[],
  { siteUrl, playerId, now = new Date() }: { siteUrl: string; playerId?: string | null; now?: Date },
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spiders Curling//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Spiders Curling",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const g of games) {
    const start = new Date(g.starts_at);
    const end = new Date(start.getTime() + GAME_MINUTES * 60_000);
    const names = [...g.lineup]
      .sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position))
      .map((s) => s.player.name);
    const result = effectiveResult(g);
    const score = resultOf(g) ? ` ${g.our_score}–${g.their_score}` : "";

    let mine = "";
    if (playerId && !result) {
      if (g.away.includes(playerId)) mine = " (you're out)";
      else if (g.lineup.some((s) => s.player.id === playerId)) mine = " (you're playing)";
      else if (g.lineup.length) mine = " (sub)";
    }
    const summary = result ? `🥌 ${result}${score} vs ${g.opponent}` : `🥌 Spiders vs ${g.opponent}${mine}`;
    const url = `${siteUrl}/games/${g.id}`;
    const description = [names.length ? `Playing: ${names.join(", ")}` : "Lineup not set yet", url].join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${g.id}@spiders-curling`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(summary)}`,
      ...(g.sheet ? [`LOCATION:${escape(`Sheet ${g.sheet}`)}`] : []),
      `DESCRIPTION:${escape(description)}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
