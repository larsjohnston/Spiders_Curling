import { POSITIONS, POSITION_SHORT, TIMEZONE } from "./config";
import { formatTime, localDateKey, tomorrowKey } from "./time";
import type { Game } from "./types";

/** Games that fall on tomorrow's date (team timezone) and haven't been reminded yet. */
export function gamesDueForReminder<T extends Pick<Game, "starts_at" | "reminder_sent_at">>(
  games: T[],
  now: Date,
): T[] {
  const target = tomorrowKey(now, TIMEZONE);
  return games.filter(
    (g) => !g.reminder_sent_at && localDateKey(new Date(g.starts_at), TIMEZONE) === target,
  );
}

export function lineupText(game: Pick<Game, "lineup">): string {
  const spots = [...game.lineup].sort(
    (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position),
  );
  if (spots.length === 0) return "Lineup not set";
  return spots.map((s) => `${s.player.name} (${POSITION_SHORT[s.position]})`).join(", ");
}

/** Notification for one recipient; `playerId` personalizes the title when known. */
export function reminderMessage(
  game: Pick<Game, "starts_at" | "opponent" | "sheet" | "lineup">,
  playerId: string | null,
): { title: string; body: string } {
  const time = formatTime(new Date(game.starts_at), TIMEZONE);
  const sheet = game.sheet ? ` — Sheet ${game.sheet}` : "";
  let title = `Game tomorrow ${time} vs ${game.opponent}`;
  if (playerId) {
    const playing = game.lineup.some((s) => s.player.id === playerId);
    title = playing ? `You're playing tomorrow ${time} vs ${game.opponent}` : `${title} (you're sitting out)`;
  }
  return { title, body: `${time} vs ${game.opponent}${sheet}. Playing: ${lineupText(game)}` };
}
