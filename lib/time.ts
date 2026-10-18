// Timezone helpers built on Intl so we don't need a date library.

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-20T19:00" (wall time in `timeZone`) -> UTC Date. */
export function localInputToDate(value: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error(`Invalid date/time: ${value}`);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let result = guess - offsetMs(new Date(guess), timeZone);
  // Re-check once in case the guess and the result straddle a DST change.
  result = guess - offsetMs(new Date(result), timeZone);
  return new Date(result);
}

/** UTC Date -> "2026-10-20T19:00" wall time in `timeZone`, for <input type="datetime-local">. */
export function dateToLocalInput(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Calendar date ("YYYY-MM-DD") of `date` in `timeZone`. */
export function localDateKey(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Hour of day (0–23) of `date` in `timeZone`. */
export function localHour(date: Date, timeZone: string): number {
  return parts(date, timeZone).hour;
}

/** Calendar date of the day after `now` in `timeZone`. */
export function tomorrowKey(now: Date, timeZone: string): string {
  const p = parts(now, timeZone);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatDay(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date, timeZone: string): string {
  return date
    .toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .replace(" AM", "am")
    .replace(" PM", "pm");
}
