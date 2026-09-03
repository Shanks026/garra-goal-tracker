import { copy } from './copy';
// Pure display formatting. Kept out of lib/derive/ (these produce strings for humans, not
// numbers for math) and out of lib/copy.ts (that file holds the voice, not the arithmetic), so
// one value can't render two different ways on two different screens.

/** Trims a float to at most one decimal, without leaving a trailing ".0". */
export function formatAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** A signed amount, for a deficit or surplus: "−35 km", "+2 sessions". Uses a real minus sign. */
export function formatSigned(value: number, unit?: string | null): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  const magnitude = formatAmount(Math.abs(rounded));
  return unit ? `${sign}${magnitude} ${unit}` : `${sign}${magnitude}`;
}

/** "6h 30m" / "45m" / "2h" — the load-check and est-minutes shape. */
export function formatMinutes(total: number): string {
  const whole = Math.round(total);
  const hours = Math.floor(whole / 60);
  const minutes = whole % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export type ArcRowValueInput = {
  type: 'habit' | 'accumulate' | 'ship' | 'milestone';
  /** Where the goal actually is. */
  current: number;
  /** Where the goal should be today, from pace(). */
  expected: number;
  /** The goal's own target — the denominator. */
  target: number;
  unit?: string | null;
  itemNoun?: string | null;
  /** Habit only: how many days were due in the window so far. */
  dueSoFar?: number;
};

/**
 * The Arc row's right-hand value column, in the shapes the canvas uses (screen 10):
 * "−35 km" for an Accumulate goal behind pace, "5 / 7 days" for a Habit's hit ratio,
 * "+2 sessions" when ahead, "3 of 5" for Milestone checkpoints.
 *
 * Accumulate/Ship show the *deficit* rather than the raw total, because on this screen the
 * question is "am I going to make it", not "how far have I gone" — the ring already shows the
 * latter, and the goal detail screen (Phase 6) shows the absolute number.
 */
export function formatGoalValue(input: ArcRowValueInput): string {
  const { type, current, expected, target, unit, itemNoun, dueSoFar } = input;

  if (type === 'milestone') {
    return `${Math.round(current)} of ${Math.round(target)}`;
  }

  if (type === 'habit') {
    const due = dueSoFar ?? 0;
    return `${Math.round(current)} / ${Math.round(due)} days`;
  }

  // accumulate / ship — signed distance from where pace says they should be.
  const delta = current - expected;
  const label = type === 'ship' ? (itemNoun ?? null) : (unit ?? null);
  if (Math.abs(Math.round(delta * 10) / 10) === 0) {
    // Exactly on pace reads as the plain position, not "+0" — a zero with a sign looks like a bug.
    return label ? `${formatAmount(current)} ${label}` : formatAmount(current);
  }
  return formatSigned(delta, label);
}

// --- Dates -------------------------------------------------------------------------------
//
// Day keys are 'YYYY-MM-DD' everywhere internally — that's the DB format and what `dayKey()`
// produces, and it must never change (rules/03 §5). These are display-only.
//
// Both parse the key as **UTC** and format in UTC. A day key is a calendar label, not an
// instant: `new Date('2026-06-12')` in a negative-offset zone lands on the 11th, which would
// render the day before the one the user picked.

/** `'2026-06-12'` → `'June 12, 2026'`. The default for any user-facing date. */
export function formatDayKeyLong(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * `'2026-06-12'` → `'Jun 12'`. For places where two dates and a day count share one line and
 * the long form would wrap — the arc window label, entry rows, checkpoint dates.
 */
export function formatDayKeyShort(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return key;
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${date.getUTCDate()}`;
}

// --- Domain enum labels ------------------------------------------------------------------
//
// The DB and the derivation layer keep neutral machine values (`n_per_week`, `accumulate`) per
// rules/05 §4. These turn them into words. Added because the raw keys were reaching the screen:
// the inventory cards and the load check rendered "n_per_week" and "accumulate" verbatim.

/** `'n_per_week'` + 4 → `'4 times a week'`; `'daily'` → `'Every day'`; null → `'Any day'`. */
export function describeCadence(
  mode: string | null | undefined,
  timesPerWeek?: number | null,
  intervalDays?: number | null,
): string {
  if (!mode) return copy.cadence.none;
  if (mode === 'daily') return copy.cadence.daily;
  if (mode === 'n_per_week') {
    const n = timesPerWeek ?? 0;
    return n > 0 ? `${n} ${copy.cadence.n_per_week}` : copy.cadence.n_per_week;
  }
  if (mode === 'specific_days') return copy.cadence.specific_days;
  if (mode === 'every_n_days') {
    const n = intervalDays ?? 0;
    return n > 1 ? `Every ${n} days` : copy.cadence.every_n_days;
  }
  // Unknown mode: show nothing rather than a raw key.
  return '';
}

/** `'accumulate'` → `'Total'`. */
export function describeGoalType(type: string | null | undefined): string {
  if (!type) return '';
  return (copy.goalType as Record<string, string>)[type] ?? '';
}
