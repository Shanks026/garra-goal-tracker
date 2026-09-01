import { TZDate } from '@date-fns/tz';
import { format, getHours, subDays } from 'date-fns';

// The day boundary is 04:00 local, not midnight — a session logged at 00:30 belongs to
// yesterday. Changing this silently reassigns historical entries; see rules/03 §5.
export const DAY_ROLLOVER_HOUR = 4;

/**
 * The day a moment belongs to, after the 04:00 local rollover — 'YYYY-MM-DD'.
 *
 * `TZDate` (not a plain `Date`) is required here: date-fns's own functions read a Date's
 * *local system* time via native getters, which would silently use this device's timezone
 * instead of the goal's `tz`. `TZDate` overrides those getters to reflect the given IANA
 * timezone's wall-clock time instead, so `getHours`/`subDays`/`format` all operate correctly
 * against `tz` regardless of what timezone this code happens to be running in.
 */
export function dayKey(d: Date, tz: string): string {
  const zoned = new TZDate(d, tz);
  const belongsToPreviousDay = getHours(zoned) < DAY_ROLLOVER_HOUR;
  const effective = belongsToPreviousDay ? subDays(zoned, 1) : zoned;
  return format(effective, 'yyyy-MM-dd');
}

/**
 * This device's IANA timezone (e.g. 'America/Chicago'), captured once at arc creation and
 * stored on `arcs.timezone` — everything else in this file takes `tz` as a parameter rather
 * than reading the device directly, so this is the one deliberate seam where it's read. Kept
 * here (not inlined at the call site) so it can be mocked the same way a passed-in `now` is.
 */
export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Day keys are calendar dates, so arithmetic on them is UTC-anchored on purpose: parsing
// 'YYYY-MM-DD' as UTC midnight keeps it immune to the runtime's own timezone and to DST, which
// is exactly why `dayKey()` produces the string in the first place. Never rebuild a day key by
// running `format()` over a fresh `Date` — that reintroduces the device's local midnight and
// bypasses the 04:00 rollover (rules/03 §5).
const MS_PER_DAY = 86_400_000;

/** A day key `days` after (or before, if negative) the given one. */
export function addDaysToKey(key: string, days: number): string {
  const ms = Date.parse(`${key}T00:00:00.000Z`) + days * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Inclusive day count between two keys — Sep 1 → Dec 31 is 122, per rules/03 §5. */
export function daysBetweenKeysInclusive(startKey: string, endKey: string): number {
  const ms = Date.parse(`${endKey}T00:00:00.000Z`) - Date.parse(`${startKey}T00:00:00.000Z`);
  return Math.round(ms / MS_PER_DAY) + 1;
}

/** December 31st of the year the given day key falls in — the "End of year" arc preset. */
export function endOfYearKey(key: string): string {
  return `${key.slice(0, 4)}-12-31`;
}
