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
