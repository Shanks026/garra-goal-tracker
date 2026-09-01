import { arcMosaicCells, dayCompletion, type ArcMosaicGoal } from './arcMosaic';
import type { ProgressEntry } from './progress';

// Sep 1 2026 is a Tuesday. Weeks are arc-anchored to Sep 1 throughout.
const ARC_START = '2026-09-01';

function mwfGoal(id: string): ArcMosaicGoal {
  return {
    id,
    cadence: {
      mode: 'specific_days',
      daysOfWeek: [1, 3, 5], // Mon/Wed/Fri
      anchorDate: ARC_START,
      weekAnchorDate: ARC_START,
    },
  };
}

function dailyGoal(id: string): ArcMosaicGoal {
  return { id, cadence: { mode: 'daily', anchorDate: ARC_START, weekAnchorDate: ARC_START } };
}

function entries(...dayKeys: string[]): ProgressEntry[] {
  return dayKeys.map((dayKey) => ({ dayKey, value: null, skipped: false }));
}

describe('dayCompletion', () => {
  it('counts a goal as due only on its own scheduled days', () => {
    const goals = [mwfGoal('a')];
    const map = new Map<string, ProgressEntry[]>();
    // Sep 2 is a Wednesday (due); Sep 1 is a Tuesday (not).
    expect(dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-02' }).due).toBe(1);
    expect(dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-01' }).due).toBe(0);
  });

  it('does not count a goal as due before it existed', () => {
    const goals: ArcMosaicGoal[] = [
      { id: 'a', cadence: { mode: 'daily', anchorDate: '2026-09-10', weekAnchorDate: ARC_START } },
    ];
    const map = new Map<string, ProgressEntry[]>();
    expect(dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-05' }).due).toBe(0);
    expect(dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-10' }).due).toBe(1);
  });

  it('a goal with no cadence is always due — it was always loggable', () => {
    const goals: ArcMosaicGoal[] = [{ id: 'a', cadence: null }];
    const map = new Map<string, ProgressEntry[]>();
    expect(dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-01' }).due).toBe(1);
  });

  it('an n_per_week goal is due until its week target is met, then stops', () => {
    const goals: ArcMosaicGoal[] = [
      {
        id: 'a',
        cadence: {
          mode: 'n_per_week',
          timesPerWeek: 2,
          anchorDate: ARC_START,
          weekAnchorDate: ARC_START,
        },
      },
    ];
    // Week 1 is Sep 1–7. With two logged, it's no longer due on Sep 5.
    const met = new Map([['a', entries('2026-09-01', '2026-09-02')]]);
    expect(dayCompletion({ goals, entriesByGoal: met, dayKey: '2026-09-05' }).due).toBe(0);

    const notMet = new Map([['a', entries('2026-09-01')]]);
    expect(dayCompletion({ goals, entriesByGoal: notMet, dayKey: '2026-09-05' }).due).toBe(1);
  });

  it('a skipped entry does not count as logged', () => {
    const goals = [dailyGoal('a')];
    const map = new Map<string, ProgressEntry[]>([
      ['a', [{ dayKey: '2026-09-01', value: null, skipped: true }]],
    ]);
    const result = dayCompletion({ goals, entriesByGoal: map, dayKey: '2026-09-01' });
    expect(result.due).toBe(1);
    expect(result.logged).toBe(0);
  });
});

describe('arcMosaicCells', () => {
  const base = { startKey: ARC_START, totalDays: 5, todayKey: '2026-09-05' };

  it('a day nothing was due on is "rest", not "miss"', () => {
    // The case that made the fifth state necessary. Only Mon/Wed/Fri goals exist, so Tuesday
    // Sep 1 asked for nothing at all.
    const cells = arcMosaicCells({
      ...base,
      goals: [mwfGoal('a'), mwfGoal('b')],
      entriesByGoal: new Map(),
    });
    expect(cells[0]).toBe('rest'); // Tue Sep 1 — nothing due
    expect(cells[1]).toBe('miss'); // Wed Sep 2 — due for both, logged by neither
  });

  it('all due goals logged is "hit"; some is "partial"; none is "miss"', () => {
    const goals = [dailyGoal('a'), dailyGoal('b')];

    const allLogged = arcMosaicCells({
      ...base,
      goals,
      entriesByGoal: new Map([
        ['a', entries('2026-09-01')],
        ['b', entries('2026-09-01')],
      ]),
    });
    expect(allLogged[0]).toBe('hit');

    const someLogged = arcMosaicCells({
      ...base,
      goals,
      entriesByGoal: new Map([['a', entries('2026-09-01')]]),
    });
    expect(someLogged[0]).toBe('partial');

    const noneLogged = arcMosaicCells({ ...base, goals, entriesByGoal: new Map() });
    expect(noneLogged[0]).toBe('miss');
  });

  it('a future day is "future" regardless of what was due', () => {
    const cells = arcMosaicCells({
      startKey: ARC_START,
      totalDays: 10,
      todayKey: '2026-09-03',
      goals: [dailyGoal('a')],
      entriesByGoal: new Map(),
    });
    expect(cells[3]).toBe('future'); // Sep 4, tomorrow
    expect(cells[9]).toBe('future'); // Sep 10
  });

  it('an arc with no goals is all rest, and never divides by zero', () => {
    const cells = arcMosaicCells({ ...base, goals: [], entriesByGoal: new Map() });
    expect(cells.every((c) => c === 'rest')).toBe(true);
  });

  it('cell count always equals totalDays', () => {
    for (const totalDays of [1, 30, 122]) {
      const cells = arcMosaicCells({
        startKey: ARC_START,
        totalDays,
        todayKey: '2026-10-01',
        goals: [dailyGoal('a')],
        entriesByGoal: new Map(),
      });
      expect(cells).toHaveLength(totalDays);
    }
  });
});
