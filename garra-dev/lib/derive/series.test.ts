import { currentValue, type ProgressEntry } from './progress';
import { cumulativeSeries, weekBars } from './series';
import type { CadenceConfig } from './schedule';

function entry(dayKey: string, value: number | null, skipped = false): ProgressEntry {
  return { dayKey, value, skipped };
}

describe('cumulativeSeries', () => {
  const entries = [entry('2026-09-01', 10), entry('2026-09-03', 5), entry('2026-09-04', 2)];

  it('is monotonically non-decreasing', () => {
    const series = cumulativeSeries({
      entries,
      startKey: '2026-09-01',
      endKey: '2026-09-05',
      mode: 'sum',
    });
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!).toBeGreaterThanOrEqual(series[i - 1]!);
    }
  });

  it('repeats the previous total on a day with no entry — flat, never broken', () => {
    const series = cumulativeSeries({
      entries,
      startKey: '2026-09-01',
      endKey: '2026-09-05',
      mode: 'sum',
    });
    // Sep 1: 10, Sep 2: no entry → 10, Sep 3: +5 → 15, Sep 4: +2 → 17, Sep 5: none → 17
    expect(series).toEqual([10, 10, 15, 17, 17]);
  });

  it('its last value equals currentValue() for the same entries', () => {
    // The burn-up must never disagree with the number printed above it.
    const series = cumulativeSeries({
      entries,
      startKey: '2026-09-01',
      endKey: '2026-09-05',
      mode: 'sum',
    });
    const total = currentValue({ type: 'accumulate', entries });
    expect(series[series.length - 1]).toBe(total);
  });

  it('a skipped day carries the previous total forward — no dip, no jump', () => {
    const withSkip = [entry('2026-09-01', 10), entry('2026-09-02', null, true)];
    const series = cumulativeSeries({
      entries: withSkip,
      startKey: '2026-09-01',
      endKey: '2026-09-03',
      mode: 'sum',
    });
    expect(series).toEqual([10, 10, 10]);
  });

  it('startingValue offsets the whole series, not just day 1', () => {
    const series = cumulativeSeries({
      entries: [entry('2026-09-02', 5)],
      startKey: '2026-09-01',
      endKey: '2026-09-03',
      startingValue: 100,
      mode: 'sum',
    });
    expect(series).toEqual([100, 105, 105]);
  });

  it("mode 'count' counts entries rather than summing values", () => {
    const series = cumulativeSeries({
      entries: [entry('2026-09-01', null), entry('2026-09-02', null)],
      startKey: '2026-09-01',
      endKey: '2026-09-03',
      mode: 'count',
    });
    expect(series).toEqual([1, 2, 2]);
  });

  it("mode 'sum' treats a null value as 0, never NaN", () => {
    const series = cumulativeSeries({
      entries: [entry('2026-09-01', null), entry('2026-09-02', 4)],
      startKey: '2026-09-01',
      endKey: '2026-09-02',
      mode: 'sum',
    });
    expect(series).toEqual([0, 4]);
    expect(series.some(Number.isNaN)).toBe(false);
  });

  it('an inverted range yields an empty series rather than throwing', () => {
    expect(
      cumulativeSeries({ entries, startKey: '2026-09-05', endKey: '2026-09-01', mode: 'sum' }),
    ).toEqual([]);
  });
});

describe('weekBars', () => {
  // Mon/Wed/Fri. The arc starts Sunday 2026-08-30, so weeks run Sun→Sat.
  const cadence: CadenceConfig = {
    mode: 'specific_days',
    daysOfWeek: [1, 3, 5],
    anchorDate: '2026-08-30',
    weekAnchorDate: '2026-08-30',
  };

  it('always returns exactly 7 bars, for every cadence', () => {
    const cadences: (CadenceConfig | null)[] = [
      cadence,
      { mode: 'daily', anchorDate: '2026-08-30', weekAnchorDate: '2026-08-30' },
      {
        mode: 'n_per_week',
        timesPerWeek: 3,
        anchorDate: '2026-08-30',
        weekAnchorDate: '2026-08-30',
      },
      {
        mode: 'every_n_days',
        intervalDays: 3,
        anchorDate: '2026-08-30',
        weekAnchorDate: '2026-08-30',
      },
      null,
    ];
    for (const c of cadences) {
      expect(weekBars({ cadence: c, entries: [], dayKey: '2026-09-02' })).toHaveLength(7);
    }
  });

  it('a logged day is done, a past due-and-unlogged day is missed, a non-due day is none', () => {
    // Week of Aug 30 (Sun) – Sep 5 (Sat). Today is Fri Sep 4.
    const bars = weekBars({
      cadence,
      entries: [entry('2026-08-31', null)], // Monday logged
      dayKey: '2026-09-04',
    });
    expect(bars[1]!.state).toBe('done'); // Mon Aug 31 — logged
    expect(bars[2]!.state).toBe('none'); // Tue Sep 1 — not due
    expect(bars[3]!.state).toBe('missed'); // Wed Sep 2 — due, past, unlogged
    expect(bars[0]!.state).toBe('none'); // Sun Aug 30 — not due
  });

  it('a due day in the FUTURE is none, not missed', () => {
    // Today is Mon Aug 31; Wed Sep 2 and Fri Sep 4 are due but haven't happened.
    const bars = weekBars({ cadence, entries: [], dayKey: '2026-08-31' });
    expect(bars[3]!.state).toBe('none'); // Wed
    expect(bars[5]!.state).toBe('none'); // Fri
    expect(bars[1]!.state).toBe('missed'); // Mon — today, due, unlogged
  });

  it('n_per_week never marks an individual day missed — no per-day answer exists', () => {
    const bars = weekBars({
      cadence: {
        mode: 'n_per_week',
        timesPerWeek: 3,
        anchorDate: '2026-08-30',
        weekAnchorDate: '2026-08-30',
      },
      entries: [entry('2026-08-31', null)],
      dayKey: '2026-09-05',
    });
    expect(bars.filter((b) => b.state === 'missed')).toHaveLength(0);
    expect(bars[1]!.state).toBe('done');
  });

  it('a value below the session target gives a partial height above the visible floor', () => {
    const bars = weekBars({
      cadence,
      entries: [entry('2026-08-31', 5)],
      dayKey: '2026-09-04',
      sessionTarget: 20,
    });
    expect(bars[1]!.height).toBeGreaterThan(0.1);
    expect(bars[1]!.height).toBeLessThan(1);
  });

  it('a tiny value still reads as a bar rather than as nothing', () => {
    const bars = weekBars({
      cadence,
      entries: [entry('2026-08-31', 0.1)],
      dayKey: '2026-09-04',
      sessionTarget: 100,
    });
    expect(bars[1]!.height).toBeGreaterThan(0.1);
  });

  it('a value at or above the session target is full height', () => {
    const bars = weekBars({
      cadence,
      entries: [entry('2026-08-31', 25)],
      dayKey: '2026-09-04',
      sessionTarget: 20,
    });
    expect(bars[1]!.height).toBe(1);
  });

  it('a binary hit (no value, no target) is full height', () => {
    const bars = weekBars({ cadence, entries: [entry('2026-08-31', null)], dayKey: '2026-09-04' });
    expect(bars[1]!.height).toBe(1);
  });

  it('a skipped day is not counted as done', () => {
    const bars = weekBars({
      cadence,
      entries: [entry('2026-08-31', null, true)],
      dayKey: '2026-09-04',
    });
    expect(bars[1]!.state).not.toBe('done');
  });

  it('weeks are arc-aligned, so two goals in one arc agree on where the week starts', () => {
    const goalA = weekBars({ cadence, entries: [], dayKey: '2026-09-02' });
    const goalB = weekBars({
      cadence: { ...cadence, anchorDate: '2026-09-01' }, // created later, same arc
      entries: [],
      dayKey: '2026-09-02',
    });
    expect(goalA).toHaveLength(goalB.length);
    // Both weeks start Sunday Aug 30, so Tuesday sits at index 2 for both.
    expect(goalA[2]!.state).toBe('none');
    expect(goalB[2]!.state).toBe('none');
  });
});
