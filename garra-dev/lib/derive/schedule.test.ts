import { isDueOn, occurrencesInRange, weeklyTarget, type CadenceConfig } from './schedule';

describe('isDueOn', () => {
  it('daily: every day in range is due', () => {
    const config: CadenceConfig = { mode: 'daily', anchorDate: '2026-09-01' };
    expect(isDueOn(config, '2026-09-01')).toBe(true);
    expect(isDueOn(config, '2026-09-07')).toBe(true);
    expect(isDueOn(config, '2026-12-31')).toBe(true);
  });

  it('specific_days: only the configured weekdays are due, across multiple weeks', () => {
    // 2026-09-01 is a Tuesday. Configure Mon(1)/Wed(3)/Fri(5).
    const config: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [1, 3, 5],
      anchorDate: '2026-09-01',
    };
    expect(isDueOn(config, '2026-09-01')).toBe(false); // Tuesday
    expect(isDueOn(config, '2026-09-02')).toBe(true); // Wednesday
    expect(isDueOn(config, '2026-09-04')).toBe(true); // Friday
    expect(isDueOn(config, '2026-09-07')).toBe(true); // Monday, next week
    expect(isDueOn(config, '2026-09-13')).toBe(false); // Sunday
  });

  it('every_n_days: due exactly every N days from anchorDate, offset correctly mid-range', () => {
    const config: CadenceConfig = {
      mode: 'every_n_days',
      intervalDays: 3,
      anchorDate: '2026-09-01',
    };
    expect(isDueOn(config, '2026-09-01')).toBe(true); // the anchor itself
    expect(isDueOn(config, '2026-09-04')).toBe(true); // +3
    expect(isDueOn(config, '2026-09-07')).toBe(true); // +6
    expect(isDueOn(config, '2026-09-02')).toBe(false); // +1, not a multiple of 3
    expect(isDueOn(config, '2026-09-10')).toBe(true); // +9, still a multiple of 3
  });

  it('every_n_days: anchorDate after the queried day returns false, does not crash', () => {
    const config: CadenceConfig = {
      mode: 'every_n_days',
      intervalDays: 3,
      anchorDate: '2026-09-15',
    };
    expect(() => isDueOn(config, '2026-09-01')).not.toThrow();
    expect(isDueOn(config, '2026-09-01')).toBe(false);
  });

  it('n_per_week has no per-day answer — throws rather than guessing', () => {
    const config: CadenceConfig = { mode: 'n_per_week', timesPerWeek: 4, anchorDate: '2026-09-01' };
    expect(() => isDueOn(config, '2026-09-01')).toThrow();
  });
});

describe('weeklyTarget', () => {
  it('returns null for daily/specific_days/every_n_days', () => {
    expect(weeklyTarget({ mode: 'daily', anchorDate: '2026-09-01' })).toBeNull();
    expect(
      weeklyTarget({ mode: 'specific_days', daysOfWeek: [1, 3, 5], anchorDate: '2026-09-01' }),
    ).toBeNull();
    expect(
      weeklyTarget({ mode: 'every_n_days', intervalDays: 3, anchorDate: '2026-09-01' }),
    ).toBeNull();
  });

  it('returns the configured number for n_per_week', () => {
    expect(weeklyTarget({ mode: 'n_per_week', timesPerWeek: 4, anchorDate: '2026-09-01' })).toBe(4);
  });
});

describe('occurrencesInRange', () => {
  it('n_per_week prorates correctly for a partial week', () => {
    const config: CadenceConfig = { mode: 'n_per_week', timesPerWeek: 4, anchorDate: '2026-09-01' };
    // 3 days of a 4x/week goal.
    const result = occurrencesInRange(config, '2026-09-01', '2026-09-03');
    expect(result).toBeCloseTo((4 * 3) / 7, 5);
  });

  it('specific_days matches the exact isDueOn count over the same range', () => {
    const config: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [1, 3, 5],
      anchorDate: '2026-09-01',
    };
    const start = '2026-09-01';
    const end = '2026-09-14'; // two full weeks

    let manualCount = 0;
    let d = new Date('2026-09-01T00:00:00.000Z');
    const endDate = new Date('2026-09-14T00:00:00.000Z');
    while (d <= endDate) {
      const dayStr = d.toISOString().slice(0, 10);
      if (isDueOn(config, dayStr)) manualCount++;
      d = new Date(d.getTime() + 86400000);
    }

    expect(occurrencesInRange(config, start, end)).toBe(manualCount);
  });

  it('empty/inverted range returns 0', () => {
    const config: CadenceConfig = { mode: 'daily', anchorDate: '2026-09-01' };
    expect(occurrencesInRange(config, '2026-09-10', '2026-09-01')).toBe(0);
  });
});
