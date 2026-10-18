import { POSITIONS, REMINDER_HOUR, TIMEZONE } from "./config";
import { formatTime, localDateKey, localHour, tomorrowKey } from "./time";
import { resultOf, type Game } from "./types";

type PushText = { title: string; body: string };

/**
 * Games on tomorrow's date (team timezone) that haven't been reminded yet, once it's
 * REMINDER_HOUR or later locally. The job runs hourly, so this fires at 7pm on the dot.
 */
export function gamesDueForReminder<T extends Pick<Game, "starts_at" | "reminder_sent_at">>(
  games: T[],
  now: Date,
): T[] {
  if (localHour(now, TIMEZONE) < REMINDER_HOUR) return [];
  const target = tomorrowKey(now, TIMEZONE);
  return games.filter(
    (g) => !g.reminder_sent_at && localDateKey(new Date(g.starts_at), TIMEZONE) === target,
  );
}

function playingNames(game: Pick<Game, "lineup">, except?: string): string[] {
  return [...game.lineup]
    .sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position))
    .filter((s) => s.player.id !== except)
    .map((s) => s.player.name);
}

/** Night-before reminder for one of the players in the lineup. */
export function reminderMessage(
  game: Pick<Game, "starts_at" | "opponent" | "sheet" | "lineup">,
  playerId: string,
): PushText {
  const time = formatTime(new Date(game.starts_at), TIMEZONE);
  const teammates = playingNames(game, playerId);
  const parts = [
    game.sheet ? `Sheet ${game.sheet}` : null,
    teammates.length ? `Playing with ${teammates.join(", ")}` : null,
  ].filter(Boolean);
  return { title: `Tomorrow ${time} vs ${game.opponent}`, body: parts.join(" · ") };
}

const STORY_PUSH_LIMIT = 180;

/** Result push for the whole team: score line in the title, story (or who played) in the body. */
export function resultMessage(
  game: Pick<Game, "opponent" | "our_score" | "their_score" | "lineup" | "story">,
): PushText {
  const r = resultOf(game);
  const word = r === "W" ? "Win" : r === "L" ? "Loss" : "Tie";
  const title = `${word} ${game.our_score}–${game.their_score} vs ${game.opponent}`;
  const story = game.story?.trim();
  if (story) {
    return { title, body: story.length > STORY_PUSH_LIMIT ? `${story.slice(0, STORY_PUSH_LIMIT - 1)}…` : story };
  }
  const names = playingNames(game);
  return { title, body: names.length ? `Played: ${names.join(", ")}` : "Tap to see the game." };
}
