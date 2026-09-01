import { actualLoad, loadCheck } from './load';
import type { CadenceConfig } from './schedule';

describe('loadCheck', () => {
  it('a single daily goal: weeklyMinutes = estMinutes * 7', () => {
    const cadence: CadenceConfig = { mode: 'daily', anchorDate: '2026-09-01' };
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 30, cadence }] });
    expect(result.perGoal[0]!.weeklyMinutes).toBeCloseTo(30 * 7, 5);
  });

  it('a single specific_days goal (3 configured days): weeklyMinutes = estMinutes * 3', () => {
    const cadence: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [1, 3, 5],
      anchorDate: '2026-09-01',
    };
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 45, cadence }] });
    expect(result.perGoal[0]!.weeklyMinutes).toBeCloseTo(45 * 3, 5);
  });

  it('a single n_per_week goal: weeklyMinutes = estMinutes * timesPerWeek', () => {
    const cadence: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 4,
      anchorDate: '2026-09-01',
    };
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 60, cadence }] });
    expect(result.perGoal[0]!.weeklyMinutes).toBe(60 * 4);
  });

  it('an every_n_days goal (every 3 days): weeklyMinutes ≈ estMinutes * 7/3', () => {
    const cadence: CadenceConfig = {
      mode: 'every_n_days',
      intervalDays: 3,
      anchorDate: '2026-09-01',
    };
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 20, cadence }] });
    expect(result.perGoal[0]!.weeklyMinutes).toBeCloseTo(20 * (7 / 3), 2);
  });

  it('a goal with cadence: null (Accumulate/Ship/Milestone) contributes 0', () => {
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 60, cadence: null }] });
    expect(result.perGoal[0]!.weeklyMinutes).toBe(0);
  });

  it('multiple goals: weeklyMinutesTotal is the exact sum of perGoal weeklyMinutes', () => {
    const daily: CadenceConfig = { mode: 'daily', anchorDate: '2026-09-01' };
    const threeXWeek: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 3,
      anchorDate: '2026-09-01',
    };
    const result = loadCheck({
      goals: [
        { id: 'g1', estMinutes: 30, cadence: daily }, // 210/week
        { id: 'g2', estMinutes: 45, cadence: threeXWeek }, // 135/week
        { id: 'g3', estMinutes: 60, cadence: null }, // 0
      ],
    });
    const expectedTotal = result.perGoal.reduce((sum, g) => sum + g.weeklyMinutes, 0);
    expect(result.weeklyMinutesTotal).toBeCloseTo(expectedTotal, 8);
    expect(result.weeklyMinutesTotal).toBeCloseTo(210 + 135, 5);
  });

  it('dailyAverageMinutes is exactly weeklyMinutesTotal / 7', () => {
    const cadence: CadenceConfig = { mode: 'daily', anchorDate: '2026-09-01' };
    const result = loadCheck({ goals: [{ id: 'g1', estMinutes: 70, cadence }] });
    expect(result.dailyAverageMinutes).toBeCloseTo(result.weeklyMinutesTotal / 7, 8);
  });
});

describe('actualLoad', () => {
  const week = { fromKey: '2026-09-01', toKey: '2026-09-07' };

  function logged(...dayKeys: string[]) {
    return dayKeys.map((dayKey) => ({ dayKey, skipped: false }));
  }

  it('counts real completions × estMinutes', () => {
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 60 }],
      entriesByGoal: new Map([['a', logged('2026-09-01', '2026-09-03', '2026-09-05')]]),
      ...week,
    });
    expect(result.weeklyMinutesTotal).toBe(180);
  });

  it('a goal logged every day for a week reports estMinutes × 7', () => {
    const everyDay = logged(
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
      '2026-09-07',
    );
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 30 }],
      entriesByGoal: new Map([['a', everyDay]]),
      ...week,
    });
    expect(result.weeklyMinutesTotal).toBe(210);
  });

  it('ignores skipped days', () => {
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 60 }],
      entriesByGoal: new Map([
        [
          'a',
          [
            { dayKey: '2026-09-01', skipped: false },
            { dayKey: '2026-09-02', skipped: true },
          ],
        ],
      ]),
      ...week,
    });
    expect(result.weeklyMinutesTotal).toBe(60);
  });

  it('ignores entries outside the range', () => {
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 60 }],
      entriesByGoal: new Map([['a', logged('2026-08-25', '2026-09-03', '2026-09-20')]]),
      ...week,
    });
    expect(result.weeklyMinutesTotal).toBe(60);
  });

  it('lets actual exceed planned rather than clamping — the truth is the point', () => {
    // A 3×/week goal actually logged 5 times. A load screen that hid this would hide exactly the
    // overcommitment it exists to reveal.
    const planned = loadCheck({
      goals: [
        {
          id: 'a',
          estMinutes: 60,
          cadence: { mode: 'n_per_week', timesPerWeek: 3, anchorDate: '2026-09-01' },
        },
      ],
    });
    const actual = actualLoad({
      goals: [{ id: 'a', estMinutes: 60 }],
      entriesByGoal: new Map([
        ['a', logged('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05')],
      ]),
      ...week,
    });
    expect(planned.weeklyMinutesTotal).toBe(180);
    expect(actual.weeklyMinutesTotal).toBe(300);
    expect(actual.weeklyMinutesTotal).toBeGreaterThan(planned.weeklyMinutesTotal);
  });

  it('a goal with no estMinutes contributes 0, never NaN', () => {
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 0 }],
      entriesByGoal: new Map([['a', logged('2026-09-01')]]),
      ...week,
    });
    expect(result.weeklyMinutesTotal).toBe(0);
    expect(Number.isNaN(result.weeklyMinutesTotal)).toBe(false);
  });

  it('a goal with no entries at all contributes 0', () => {
    const result = actualLoad({
      goals: [{ id: 'a', estMinutes: 60 }],
      entriesByGoal: new Map(),
      ...week,
    });
    expect(result.perGoal[0]!.weeklyMinutes).toBe(0);
  });
});
