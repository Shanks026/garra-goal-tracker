import { cadenceForGoal, type GoalCadenceFields } from './cadence';

const arc = { startsAt: '2026-09-01', timezone: 'America/Chicago' };

function goal(overrides: Partial<GoalCadenceFields> = {}): GoalCadenceFields {
  return {
    cadenceMode: 'every_n_days',
    timesPerWeek: null,
    daysOfWeek: null,
    intervalDays: 3,
    startsAt: null,
    createdAt: '2026-09-10 15:00:00',
    ...overrides,
  };
}

describe('cadenceForGoal', () => {
  it('uses an explicit startsAt verbatim as the goal’s own anchor', () => {
    const config = cadenceForGoal(goal({ startsAt: '2026-09-15' }), arc);
    expect(config?.anchorDate).toBe('2026-09-15');
  });

  it('falls back to createdAt converted through dayKey(), not a raw UTC slice', () => {
    // 2026-09-11T02:00Z is 21:00 on Sep 10 in Chicago (CDT, UTC−5). A `.slice(0, 10)` of the
    // stored UTC timestamp would say Sep 11 — a day the commitment did not yet exist. The
    // 04:00 rollover puts it on Sep 10, which is the bug this replaced.
    const config = cadenceForGoal(goal({ createdAt: '2026-09-11 02:00:00' }), arc);
    expect(config?.anchorDate).toBe('2026-09-10');
  });

  it('a createdAt before 04:00 local belongs to the previous day, per the rollover', () => {
    // 2026-09-11T07:00Z is 02:00 Sep 11 in Chicago — before the 04:00 rollover, so Sep 10.
    const config = cadenceForGoal(goal({ createdAt: '2026-09-11 07:00:00' }), arc);
    expect(config?.anchorDate).toBe('2026-09-10');
  });

  it('clamps an anchor that precedes the arc’s start up to the arc’s start', () => {
    const config = cadenceForGoal(goal({ startsAt: '2026-08-01' }), arc);
    expect(config?.anchorDate).toBe('2026-09-01');
  });

  it('weekAnchorDate is always the arc’s start, whatever the goal’s own anchor is', () => {
    const early = cadenceForGoal(goal({ startsAt: '2026-09-03' }), arc);
    const late = cadenceForGoal(goal({ startsAt: '2026-10-20' }), arc);
    expect(early?.weekAnchorDate).toBe('2026-09-01');
    expect(late?.weekAnchorDate).toBe('2026-09-01');
    // The whole point: two goals created weeks apart still agree on where a week starts.
    expect(early?.weekAnchorDate).toBe(late?.weekAnchorDate);
  });

  it('returns null for a goal with no cadence at all', () => {
    expect(cadenceForGoal(goal({ cadenceMode: null }), arc)).toBeNull();
  });

  it('returns null rather than an invalid config for an unrecognised cadence mode', () => {
    expect(cadenceForGoal(goal({ cadenceMode: 'weekly-ish' }), arc)).toBeNull();
  });

  it('carries the mode-specific fields through', () => {
    const config = cadenceForGoal(
      goal({ cadenceMode: 'n_per_week', timesPerWeek: 4, intervalDays: null }),
      arc,
    );
    expect(config?.mode).toBe('n_per_week');
    expect(config?.timesPerWeek).toBe(4);
    expect(config?.intervalDays).toBeUndefined();
  });
});
