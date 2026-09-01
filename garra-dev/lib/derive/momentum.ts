import { addDaysToKey, daysBetweenKeysInclusive } from '@/lib/date';
import { dayCompletion, type ArcMosaicGoal } from './arcMosaic';
import type { ProgressEntry } from './progress';

// The momentum curve (rules/01 §4.6, screen 15): rolling 7-day completion %, and today's headline.

export const MOMENTUM_WINDOW_DAYS = 7;

/**
 * A rolling completion ratio (0–1) per elapsed day, plus the latest value as the headline.
 *
 * Two decisions worth knowing:
 *
 * 1. **The window clamps to the arc's start.** On day 3, momentum averages 3 days — not 3 days
 *    against a denominator of 7. Otherwise every arc would look like it began badly, which is both
 *    false and the worst possible first impression for a screen meant to show progress.
 * 2. **A day that asked nothing is excluded, not counted as zero.** A rest day isn't a failure, so
 *    it must not drag the average down; a week with two scheduled rest days would otherwise cap at
 *    5/7 no matter how perfectly it went.
 */
export function momentumSeries(input: {
  goals: ArcMosaicGoal[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  startKey: string;
  todayKey: string;
}): { series: number[]; headline: number } {
  const { goals, entriesByGoal, startKey, todayKey } = input;

  const elapsed = daysBetweenKeysInclusive(startKey, todayKey);
  if (elapsed <= 0) return { series: [], headline: 0 };

  // Per-day completion first, so the rolling pass doesn't recompute the same day seven times.
  const daily = Array.from({ length: elapsed }, (_, i) =>
    dayCompletion({ goals, entriesByGoal, dayKey: addDaysToKey(startKey, i) }),
  );

  const series = daily.map((_, i) => {
    const from = Math.max(0, i - (MOMENTUM_WINDOW_DAYS - 1));
    let due = 0;
    let logged = 0;
    for (let d = from; d <= i; d++) {
      due += daily[d]!.due;
      logged += daily[d]!.logged;
    }
    // No day in the window asked for anything — that's not 0% completion, it's no data. Report
    // 1 rather than 0: nothing was owed and nothing was missed.
    if (due === 0) return 1;
    return Math.min(1, logged / due);
  });

  return { series, headline: series[series.length - 1] ?? 0 };
}

/** Momentum values → the chart's 342×96 coordinate space (rules/01 §4.6). */
export function momentumPoints(series: number[], W = 342, H = 96): [number, number][] {
  if (series.length === 0) return [];
  if (series.length === 1) {
    const y = H - series[0]! * (H - 8) - 4;
    return [
      [0, y],
      [W, y],
    ];
  }
  return series.map((value, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - value * (H - 8) - 4;
    return [x, y] as [number, number];
  });
}
