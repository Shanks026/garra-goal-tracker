import { addDaysToKey, daysBetweenKeysInclusive } from '@/lib/date';
import { isDueOn, type CadenceConfig } from './schedule';
import type { ProgressEntry } from './progress';

// Time series for the goal-detail charts. Both functions are pure and take an explicit day-key
// range — no `now`, no clock — so they're testable at any point in an arc.

export type WeekBarState = 'done' | 'missed' | 'none';

/**
 * Cumulative total per day across an inclusive range — the burn-up's actual line.
 *
 * Flat, never broken: a day with no entry repeats the previous total, and a **skipped** day does
 * the same. A skip is a recorded absence, so the line holds steady rather than dipping (which
 * would imply the total went down) or jumping (which would imply credit).
 */
export function cumulativeSeries(input: {
  entries: ProgressEntry[];
  startKey: string;
  endKey: string;
  startingValue?: number | null;
  /** 'sum' for Accumulate; 'count' for Ship/Habit — mirrors currentValue()'s own split. */
  mode: 'sum' | 'count';
}): number[] {
  const { entries, startKey, endKey, startingValue, mode } = input;
  const days = daysBetweenKeysInclusive(startKey, endKey);
  if (days <= 0) return [];

  const byDay = new Map<string, ProgressEntry>();
  for (const entry of entries) {
    if (!entry.skipped) byDay.set(entry.dayKey, entry);
  }

  const series: number[] = [];
  let total = startingValue ?? 0;
  for (let i = 0; i < days; i++) {
    const entry = byDay.get(addDaysToKey(startKey, i));
    if (entry) {
      total += mode === 'count' ? 1 : (entry.value ?? 0);
    }
    series.push(total);
  }
  return series;
}

/**
 * The seven bars for the week containing `dayKey` (rules/01 §4.5):
 *
 * - completed → `'done'`, filled with the goal's accent
 * - scheduled but missed → `'missed'`, which the chart draws as a **hollow stub** — the miss is
 *   honest without being an accusation
 * - not scheduled, or not yet happened → `'none'`, height 0, renders as nothing
 *
 * A due day in the *future* is `'none'`, never `'missed'`: a Wednesday that hasn't arrived yet is
 * not a failure. `n_per_week` never marks an individual day missed at all, because no per-day
 * answer exists for that cadence (`isDueOn` throws for it by design).
 */
export function weekBars(input: {
  cadence: CadenceConfig | null;
  entries: ProgressEntry[];
  /** The day whose week is being shown — usually today. */
  dayKey: string;
  sessionTarget?: number | null;
}): { height: number; state: WeekBarState }[] {
  const { cadence, entries, dayKey, sessionTarget } = input;

  const weekStart = weekStartFor(dayKey, cadence);
  const byDay = new Map<string, ProgressEntry>();
  for (const entry of entries) {
    if (!entry.skipped) byDay.set(entry.dayKey, entry);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(weekStart, i);
    const entry = byDay.get(key);

    if (entry) {
      return { height: barHeight(entry.value, sessionTarget), state: 'done' as const };
    }

    const isFuture = key > dayKey;
    if (isFuture) return { height: 0, state: 'none' as const };

    // No per-day expectation exists for n_per_week or for a goal with no cadence, so an unlogged
    // day is simply nothing — not a miss it never agreed to.
    if (!cadence || cadence.mode === 'n_per_week') {
      return { height: 0, state: 'none' as const };
    }

    return isDueOn(cadence, key)
      ? { height: 1, state: 'missed' as const }
      : { height: 0, state: 'none' as const };
  });
}

/** The arc-aligned start of the week containing `dayKey`. */
function weekStartFor(dayKey: string, cadence: CadenceConfig | null): string {
  // Without a cadence there's no arc anchor to align to, so fall back to the day's own week
  // starting Sunday — matching how weekdays are numbered everywhere else (0 = Sunday).
  if (!cadence) {
    const weekday = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay();
    return addDaysToKey(dayKey, -weekday);
  }
  const anchor = cadence.weekAnchorDate ?? cadence.anchorDate;
  const offset = daysBetweenKeysInclusive(anchor, dayKey) - 1;
  const weekIndex = Math.floor(offset / 7);
  return addDaysToKey(anchor, weekIndex * 7);
}

/**
 * Bar height 0–1. A binary goal's hit is full height. A value goal's is its share of the session
 * target, floored so a small-but-real value still reads as a bar rather than as nothing.
 */
const MIN_VISIBLE_HEIGHT = 0.18;

function barHeight(value: number | null, sessionTarget?: number | null): number {
  if (value == null || !sessionTarget || sessionTarget <= 0) return 1;
  const share = value / sessionTarget;
  if (share >= 1) return 1;
  return Math.max(MIN_VISIBLE_HEIGHT, share);
}
