import { effectiveResult, type Game, type Player } from "./types";

export type CharmRow = { player: Player; wins: number; losses: number; ties: number; games: number; pct: number };

/**
 * The team's record in games each player actually played (in the lineup, not marked out), using the
 * entered score or else the league's result. Ties count as half a win. Best first.
 */
export function playerRecords(games: Pick<Game, "lineup" | "away" | "our_score" | "their_score" | "league_result">[], players: Player[]): CharmRow[] {
  return players
    .map((player) => {
      const row = { player, wins: 0, losses: 0, ties: 0, games: 0, pct: 0 };
      for (const g of games) {
        const r = effectiveResult(g);
        if (!r || g.away.includes(player.id) || !g.lineup.some((s) => s.player.id === player.id)) continue;
        row.games++;
        if (r === "W") row.wins++;
        else if (r === "L") row.losses++;
        else row.ties++;
      }
      row.pct = row.games ? (row.wins + row.ties / 2) / row.games : 0;
      return row;
    })
    .sort((a, b) => b.pct - a.pct || b.games - a.games || a.player.sort_order - b.player.sort_order);
}

/** Best and worst record among players who've played; nobody gets a title until records differ. */
export function charmAndJinx(rows: CharmRow[]): { charm: CharmRow | null; jinx: CharmRow | null } {
  const played = rows.filter((r) => r.games > 0);
  if (played.length < 2 || played[0].pct === played[played.length - 1].pct) return { charm: null, jinx: null };
  return { charm: played[0], jinx: played[played.length - 1] };
}

export function recordText(r: Pick<CharmRow, "wins" | "losses" | "ties">): string {
  return `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ""}`;
}
