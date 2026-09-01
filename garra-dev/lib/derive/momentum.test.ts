import { momentumPoints, momentumSeries } from './momentum';
import type { ArcMosaicGoal } from './arcMosaic';
import type { ProgressEntry } from './progress';

const ARC_START = '2026-09-01';

function dailyGoal(id: string): ArcMosaicGoal {
  return { id, cadence: { mode: 'daily', anchorDate: ARC_START, weekAnchorDate: ARC_START } };
}

function entries(...dayKeys: string[]): ProgressEntry[] {
  return dayKeys.map((dayKey) => ({ dayKey, value: null, skipped: false }));
}

function daysFrom(start: string, count: number): string[] {
  const MS = 86_400_000;
  const base = Date.parse(`${start}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(base + i * MS).toISOString().slice(0, 10),
  );
}

describe('momentumSeries', () => {
  it('a perfectly logged arc reads 1.0 throughout', () => {
    const logged = daysFrom(ARC_START, 10);
    const { series, headline } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map([['a', entries(...logged)]]),
      startKey: ARC_START,
      todayKey: '2026-09-10',
    });
    expect(series).toHaveLength(10);
    expect(series.every((v) => v === 1)).toBe(true);
    expect(headline).toBe(1);
  });

  it('a completely missed arc reads 0', () => {
    const { series, headline } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map(),
      startKey: ARC_START,
      todayKey: '2026-09-10',
    });
    expect(series.every((v) => v === 0)).toBe(true);
    expect(headline).toBe(0);
  });

  it('the window clamps to the arc start — day 2 of a perfect arc is 1.0, not 2/7', () => {
    // Without the clamp this would read 0.29 and make every new arc look like a failure.
    const { series } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map([['a', entries('2026-09-01', '2026-09-02')]]),
      startKey: ARC_START,
      todayKey: '2026-09-02',
    });
    expect(series).toEqual([1, 1]);
  });

  it('a day that asked nothing does not drag the average down', () => {
    // A Mon/Wed/Fri goal across Sep 1–5 (Tue–Sat): due Wed and Fri only, both logged. Counting
    // the three rest days as zeros would report 2/5 for a perfect week.
    const goals: ArcMosaicGoal[] = [
      {
        id: 'a',
        cadence: {
          mode: 'specific_days',
          daysOfWeek: [1, 3, 5],
          anchorDate: ARC_START,
          weekAnchorDate: ARC_START,
        },
      },
    ];
    const { headline } = momentumSeries({
      goals,
      entriesByGoal: new Map([['a', entries('2026-09-02', '2026-09-04')]]),
      startKey: ARC_START,
      todayKey: '2026-09-05',
    });
    expect(headline).toBe(1);
  });

  it('a window where nothing was ever due reports 1, not 0 — nothing owed, nothing missed', () => {
    const { headline } = momentumSeries({
      goals: [],
      entriesByGoal: new Map(),
      startKey: ARC_START,
      todayKey: '2026-09-05',
    });
    expect(headline).toBe(1);
  });

  it('headline always equals the last value of series', () => {
    const { series, headline } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map([['a', entries('2026-09-01', '2026-09-02')]]),
      startKey: ARC_START,
      todayKey: '2026-09-04',
    });
    expect(headline).toBe(series[series.length - 1]);
  });

  it('an arc that has not started yields an empty series and a 0 headline, not NaN', () => {
    const { series, headline } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map(),
      startKey: '2026-09-10',
      todayKey: '2026-09-05', // today precedes the start
    });
    expect(series).toEqual([]);
    expect(headline).toBe(0);
    expect(Number.isNaN(headline)).toBe(false);
  });

  it('only the trailing 7 days count — an old bad streak stops mattering', () => {
    // Sep 1–3 missed, Sep 4–12 logged. By Sep 12 the window holds only logged days.
    const { headline } = momentumSeries({
      goals: [dailyGoal('a')],
      entriesByGoal: new Map([['a', entries(...daysFrom('2026-09-04', 9))]]),
      startKey: ARC_START,
      todayKey: '2026-09-12',
    });
    expect(headline).toBe(1);
  });
});

describe('momentumPoints', () => {
  it('maps a series into the chart box, with higher values sitting higher on screen', () => {
    const points = momentumPoints([0, 1]);
    expect(points[0]![0]).toBe(0);
    expect(points[1]![0]).toBe(342);
    // y is inverted in screen space: 1.0 must be *above* 0.
    expect(points[1]![1]).toBeLessThan(points[0]![1]);
  });

  it('a single-point series renders as a flat line rather than one dot', () => {
    const points = momentumPoints([0.5]);
    expect(points).toHaveLength(2);
    expect(points[0]![1]).toBe(points[1]![1]);
  });

  it('an empty series yields no points rather than NaN coordinates', () => {
    expect(momentumPoints([])).toEqual([]);
  });
});
