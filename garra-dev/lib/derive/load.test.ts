import { loadCheck } from './load';
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
