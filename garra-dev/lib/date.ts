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
