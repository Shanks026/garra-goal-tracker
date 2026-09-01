import { addDaysToKey } from '@/lib/date';
import { isDueOn, type CadenceConfig } from './schedule';
import type { MosaicCellState } from './mosaic';
import type { ProgressEntry } from './progress';

// The arc-level mosaic (screen 15) answers a different question from the per-goal one: not "did I
// do this goal today" but **"what share of what the day asked for got done?"** So it needs its own
// derivation rather than a reuse of mosaicCells().

export type ArcMosaicGoal = { id: string; cadence: CadenceConfig | null };

/**
 * How many of a day's goals were due, and how many were logged. Shared with the momentum curve,
 * which asks exactly the same question — one definition of "due today" across the whole app
 * rather than two that can drift.
 *
 * `n_per_week` counts as due every day **until its week's target is met**, matching the rule Home
 * already uses (`useHomeData`'s `isOnTodayList`). A goal with no cadence at all (Accumulate/Ship)
 * is always loggable, so it's always due.
 */
export function dayCompletion(input: {
  goals: ArcMosaicGoal[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  dayKey: string;
}): { due: number; logged: number } {
  const { goals, entriesByGoal, dayKey } = input;
  let due = 0;
  let logged = 0;

  for (const goal of goals) {
    const entries = entriesByGoal.get(goal.id) ?? [];
    if (!isDueOnDay(goal.cadence, dayKey, entries)) continue;
    due += 1;
    if (entries.some((e) => e.dayKey === dayKey && !e.skipped)) logged += 1;
  }

  return { due, logged };
}

function isDueOnDay(
  cadence: CadenceConfig | null,
  dayKey: string,
  entries: ProgressEntry[],
): boolean {
  if (!cadence) return true;
  // Before the goal existed it asked nothing of that day.
  if (dayKey < cadence.anchorDate) return false;

  if (cadence.mode === 'n_per_week') {
    const target = cadence.timesPerWeek ?? 0;
    const { weekStart, weekEnd } = weekWindow(dayKey, cadence);
    const hits = entries.filter(
      (e) => !e.skipped && e.dayKey >= weekStart && e.dayKey <= weekEnd,
    ).length;
    return hits < target;
  }

  return isDueOn(cadence, dayKey);
}

function weekWindow(dayKey: string, cadence: CadenceConfig) {
  const anchor = cadence.weekAnchorDate ?? cadence.anchorDate;
  const MS = 86_400_000;
  const offset = Math.round(
    (Date.parse(`${dayKey}T00:00:00.000Z`) - Date.parse(`${anchor}T00:00:00.000Z`)) / MS,
  );
  const weekIndex = Math.floor(offset / 7);
  const weekStart = addDaysToKey(anchor, weekIndex * 7);
  return { weekStart, weekEnd: addDaysToKey(weekStart, 6) };
}

/**
 * One cell per arc day, across every goal:
 *
 * - future day → `'future'`
 * - nothing due → `'rest'` (the fifth state, added Phase 7.1 — this is the case that made it
 *   necessary: an arc-wide rest day used to render as a hollow miss)
 * - everything due was logged → `'hit'`
 * - some → `'partial'`
 * - none → `'miss'`
 */
export function arcMosaicCells(input: {
  goals: ArcMosaicGoal[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  startKey: string;
  totalDays: number;
  todayKey: string;
}): MosaicCellState[] {
  const { goals, entriesByGoal, startKey, totalDays, todayKey } = input;

  return Array.from({ length: totalDays }, (_, i) => {
    const key = addDaysToKey(startKey, i);
    if (key > todayKey) return 'future';

    const { due, logged } = dayCompletion({ goals, entriesByGoal, dayKey: key });
    if (due === 0) return 'rest';
    if (logged >= due) return 'hit';
    if (logged > 0) return 'partial';
    return 'miss';
  });
}
