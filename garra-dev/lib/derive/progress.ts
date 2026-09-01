// The missing link between `entries` and `pace()`: pace() takes `current` as an input, and until
// now nothing computed it. Pure, so a hook can wire it without doing math itself
// (04-hooks.md §6 forbids inlining derivation in a hook).

export type ProgressEntry = {
  dayKey: string;
  value: number | null;
  skipped: boolean;
};

export type GoalKind = 'habit' | 'accumulate' | 'ship' | 'milestone';

/**
 * A goal's current total, by type:
 *
 * - **accumulate** — sums entry values, plus `startingValue` for a mid-flight goal.
 * - **ship** — counts entries. A ship's `value` may be null (the log is an event, not a
 *   quantity), so summing would read 0.
 * - **habit** — counts completed days, for the same reason.
 * - **milestone** — the checkpoints hit; entries are irrelevant.
 *
 * Skipped entries never contribute. A skip is an *absence*, deliberately recorded — counting it
 * as a zero would drag an average and counting it as a hit would be a lie.
 */
export function currentValue(input: {
  type: GoalKind;
  entries: ProgressEntry[];
  startingValue?: number | null;
  checkpointsHit?: number;
}): number {
  const { type, entries, startingValue, checkpointsHit } = input;

  if (type === 'milestone') return checkpointsHit ?? 0;

  const logged = entries.filter((e) => !e.skipped);

  if (type === 'accumulate') {
    const sum = logged.reduce((total, e) => total + (e.value ?? 0), 0);
    return sum + (startingValue ?? 0);
  }

  // ship / habit — the count is the measure.
  return logged.length;
}

/** Whether the goal is done for a given day — drives the Today list's checkbox state. */
export function isLoggedOn(entries: ProgressEntry[], dayKey: string): boolean {
  return entries.some((e) => e.dayKey === dayKey && !e.skipped);
}

/** Whether the day was explicitly skipped (distinct from both a hit and an untouched miss). */
export function isSkippedOn(entries: ProgressEntry[], dayKey: string): boolean {
  return entries.some((e) => e.dayKey === dayKey && e.skipped);
}

/** The value logged on a given day, if any — the Today row's detail column. */
export function valueOn(entries: ProgressEntry[], dayKey: string): number | null {
  const entry = entries.find((e) => e.dayKey === dayKey && !e.skipped);
  return entry?.value ?? null;
}

/**
 * How many of a goal's own logged days fall inside an inclusive day-key range — the numerator
 * for a Habit's "5 / 7 days" hit ratio.
 */
export function loggedCountInRange(
  entries: ProgressEntry[],
  startKey: string,
  endKey: string,
): number {
  return entries.filter((e) => !e.skipped && e.dayKey >= startKey && e.dayKey <= endKey).length;
}
