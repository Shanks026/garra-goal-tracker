import { dayKey } from '@/lib/date';
import { isDueOn, type CadenceConfig } from './schedule';

/**
 * The five states a mosaic cell can be in (rules/01-design-system.md §4.3). Lives here, not in
 * the chart component, because it's a domain type produced by this module and consumed by the
 * renderer (rules/06-conventions.md §1) — and because `lib/derive/` must never import from a
 * module that pulls in Skia, which is unloadable under Jest (00-index.md standing rule #14).
 * `components/charts/Mosaic.tsx` re-exports it so existing importers are unaffected.
 *
 * `'rest'` is the one amendment to the canvas's approved four-state spec, added in Phase 7.1 with
 * the user's sign-off. It exists because "the schedule asked nothing of you" and "you missed it"
 * were previously the same cell, which made a Mon/Wed/Fri goal's Tuesday look like a failure.
 */
export type MosaicCellState = 'future' | 'hit' | 'partial' | 'rest' | 'miss';

const MS_PER_DAY = 86400000;

function dayNumberFromDateString(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00.000Z`) / MS_PER_DAY);
}

function dayStringFromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

type MosaicEntry = { dayKey: string; value: number | null; target?: number };

export function mosaicCells(input: {
  cadence: CadenceConfig | null; // null for Accumulate/Ship/Milestone (no daily cadence concept)
  entries: MosaicEntry[];
  startDate: string;
  totalDays: number;
  now: Date;
  timezone: string;
}): MosaicCellState[] {
  const { cadence, entries, startDate, totalDays, now, timezone } = input;
  const entryMap = new Map(entries.map((e) => [e.dayKey, e]));
  const startDay = dayNumberFromDateString(startDate);
  const todayDayNumber = dayNumberFromDateString(dayKey(now, timezone));
  const daysElapsed = Math.max(0, Math.min(totalDays, todayDayNumber - startDay));

  const cells: MosaicCellState[] = [];
  for (let i = 0; i < totalDays; i++) {
    if (i >= daysElapsed) {
      cells.push('future');
      continue;
    }

    const dayNum = startDay + i;
    const entry = entryMap.get(dayStringFromDayNumber(dayNum));

    if (entry) {
      const isPartial = entry.target != null && entry.value != null && entry.value < entry.target;
      cells.push(isPartial ? 'partial' : 'hit');
      continue;
    }

    if (cadence && cadence.mode === 'n_per_week') {
      cells.push(nPerWeekCellState(cadence, dayNum, entryMap, todayDayNumber));
    } else if (cadence) {
      // The gap Phase 3 documented and Phase 7 closed: a day this cadence never asked for is
      // 'rest', not 'miss'. Only a day that *was* due and went unlogged is a miss.
      cells.push(isDueOn(cadence, dayStringFromDayNumber(dayNum)) ? 'miss' : 'rest');
    } else {
      // No cadence at all (Accumulate/Ship): the goal was always available to log, so nothing
      // ever rested — an unlogged past day is a genuine miss.
      cells.push('miss');
    }
  }

  return cells;
}

/**
 * n_per_week has no fixed due days, so an unlogged day is never individually a "miss" by itself.
 * A day renders 'miss' only if it's the LAST day of a fully completed week whose weekly target
 * wasn't met — one marker per short week, landing on the week's final day, rather than guessing
 * which of the seven days should carry the blame.
 *
 * Every other unlogged n_per_week day is `'rest'`. Before Phase 7 this had to return `'future'`
 * as the least-misleading of only four available states; the fifth state now says what was
 * actually meant, so a genuine rest day no longer borrows the "hasn't happened yet" look.
 */
function nPerWeekCellState(
  cadence: CadenceConfig,
  dayNum: number,
  entryMap: Map<string, MosaicEntry>,
  todayDayNumber: number,
): MosaicCellState {
  // Week boundaries come from the arc, not the goal, so every goal's weeks align with each
  // other and with the arc-level mosaic grid (06-home-and-logging.md §5.0.3). The goal's own
  // anchor still gates days before it existed.
  const weekAnchor = dayNumberFromDateString(cadence.weekAnchorDate ?? cadence.anchorDate);
  const anchor = dayNumberFromDateString(cadence.anchorDate);
  if (dayNum < anchor) return 'rest'; // the goal didn't exist yet, so it asked nothing

  const weekIndex = Math.floor((dayNum - weekAnchor) / 7);
  const weekStart = weekAnchor + weekIndex * 7;
  const weekEnd = weekStart + 6;
  const isLastDayOfWeek = dayNum === weekEnd;
  const weekIsComplete = weekEnd < todayDayNumber;

  if (isLastDayOfWeek && weekIsComplete) {
    let hitCount = 0;
    for (let d = weekStart; d <= weekEnd; d++) {
      if (entryMap.has(dayStringFromDayNumber(d))) hitCount++;
    }
    if (hitCount < (cadence.timesPerWeek ?? 0)) return 'miss';
  }

  return 'rest';
}
