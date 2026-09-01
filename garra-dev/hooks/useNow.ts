import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { TZDate } from '@date-fns/tz';

import { DAY_ROLLOVER_HOUR } from '@/lib/date';

/**
 * The app's clock (04-hooks.md §4). Ticks on **mount**, on **app foreground**, and at the next
 * **04:00 rollover** in the arc's timezone. Nothing else — no interval.
 *
 * Time-derived values (the day counter, pace, "88 days left") need a clock, but re-rendering the
 * whole app every second is waste and battery. And a derivation must never read the clock itself:
 * `now` is passed in, which is what makes `lib/derive/` testable at arbitrary points in an arc.
 */
export function useNow(timezone: string): Date {
  const [now, setNow] = useState(() => new Date());

  // Foreground: a phone that sat in a pocket overnight must not still believe it's yesterday.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  // Rollover: one timeout, re-armed each time it fires. Not an interval — the only moment a
  // day-derived value changes on its own is 04:00.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const arm = () => {
      const delay = msUntilNextRollover(new Date(), timezone);
      timeout = setTimeout(() => {
        setNow(new Date());
        arm();
      }, delay);
    };

    arm();
    return () => clearTimeout(timeout);
  }, [timezone]);

  return now;
}

/**
 * Milliseconds from `from` until the next `DAY_ROLLOVER_HOUR` in `timezone`. Exported for tests;
 * uses `TZDate` for the same reason `dayKey()` does — a plain `Date`'s getters would read the
 * device's own timezone instead of the arc's.
 */
export function msUntilNextRollover(from: Date, timezone: string): number {
  const zoned = new TZDate(from, timezone);
  const next = new TZDate(from, timezone);
  next.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0);
  if (next.getTime() <= zoned.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  // Guard against a zero/negative delay turning setTimeout into a tight loop.
  return Math.max(1000, next.getTime() - zoned.getTime());
}
