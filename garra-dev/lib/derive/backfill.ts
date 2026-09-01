import { addDaysToKey } from '@/lib/date';

// "Backfill window is 2 days. Enforce it in the derivation layer *and* at the DB level"
// (03-state-and-data.md §5). This is the derivation half — pure, so it's testable without the
// native SQLite module the mutation itself needs (00-index.md standing rule #14 is the same
// hazard: a pure rule must not live in a file that imports a native module).
export const BACKFILL_WINDOW_DAYS = 2;

/** Whether a day is loggable: today, or within the backfill window — never the future. */
export function isWithinBackfillWindow(dayKey: string, todayKey: string): boolean {
  if (dayKey > todayKey) return false; // a day that hasn't happened cannot be logged
  return dayKey >= addDaysToKey(todayKey, -BACKFILL_WINDOW_DAYS);
}
