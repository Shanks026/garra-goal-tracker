import { dayKey } from '@/lib/date';
import { type CadenceConfig } from './schedule';

/**
 * The four states a mosaic cell can be in (rules/01-design-system.md §4.3). Lives here, not in
 * the chart component, because it's a domain type produced by this module and consumed by the
 * renderer (rules/06-conventions.md §1) — and because `lib/derive/` must never import from a
 * module that pulls in Skia, which is unloadable under Jest (00-index.md standing rule #14).
 * `components/charts/Mosaic.tsx` re-exports it so existing importers are unaffected.
 */
export type MosaicCellState = 'future' | 'hit' | 'partial' | 'miss';

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
    } else {
      // daily/specific_days/every_n_days, and cadence === null (no cadence at all): any past
      // day without an entry renders 'miss'. For non-due days under specific_days/every_n_days
      // this is a known, documented visual inaccuracy — see 04-pace-engine.md's Context section
      // ("the n_per_week gap") for why the Mosaic's 4-state model can't represent "not due"
      // cleanly, and why this wasn't silently special-cased differently without a design call.
      cells.push('miss');
    }
  }

  return cells;
}

/**
 * n_per_week has no fixed due days, so an unlogged day is never individually a "miss" by
 * itself. Interpretation used here (documented in 04-pace-engine.md, flagged for
 * reconsideration once a real screen makes this visible): a day only renders 'miss' if it's
 * the LAST day of a fully completed week whose weekly target wasn't met — one miss marker per
 * short week, landing on the week's final day, rather than guessing which of the 7 days should
 * carry it. Every other unlogged n_per_week day (a genuine rest day, a day in an on-track or
 * still-open week) renders with the 'future' style — the Mosaic has no neutral "rest day" cell
 * state, and 'future' (rules/01-design-system.md §4.3: faint fill, no stroke) is the least
 * misleading of the four available states, closer to "nothing to see here" than 'miss'
 * (a visible hollow outline) would be.
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
  if (dayNum < anchor) return 'future'; // the goal didn't exist yet this day

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

  return 'future';
}
