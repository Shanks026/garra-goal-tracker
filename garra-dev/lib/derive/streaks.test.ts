import { arcStreak, goalStreak } from './streaks';
import type { CadenceConfig } from './schedule';

describe('arcStreak', () => {
  it('an unbroken run counts every day, including today if already logged', () => {
    const result = arcStreak({
      entryDayKeys: ['2026-09-01', '2026-09-02', '2026-09-03'],
      now: new Date('2026-09-03T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(result.current).toBe(3);
  });

  it('a single gap breaks the current streak', () => {
    const result = arcStreak({
      entryDayKeys: ['2026-09-01', '2026-09-03'], // Sep 2 missing
      now: new Date('2026-09-03T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(result.current).toBe(1); // only today (Sep 3) counts
  });

  it('today not yet logged does not break the streak — the day is not over', () => {
    const result = arcStreak({
      entryDayKeys: ['2026-09-01', '2026-09-02'],
      now: new Date('2026-09-03T12:00:00.000Z'), // today, Sep 3, has no entry yet
      timezone: 'UTC',
    });
    expect(result.current).toBe(2); // Sep 1 + Sep 2, unaffected by today
  });

  it('longest tracks the best run, independent of the current one', () => {
    const result = arcStreak({
      entryDayKeys: ['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06', '2026-09-07'],
      now: new Date('2026-09-07T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(result.longest).toBe(3); // Sep 5-7
    expect(result.current).toBe(3); // also 3, since today ends the longest run
  });
});

describe('goalStreak — specific_days (schedule-aware)', () => {
  // Mon(1)/Wed(3)/Fri(5). 2026-09-07 is a Monday.
  const cadence: CadenceConfig = {
    mode: 'specific_days',
    daysOfWeek: [1, 3, 5],
    anchorDate: '2026-08-01',
  };

  it('a missed non-scheduled day does not break the streak', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: ['2026-09-07', '2026-09-09', '2026-09-11'], // Mon/Wed/Fri all hit
      freezesAvailable: 0,
      now: new Date('2026-09-12T12:00:00.000Z'), // Saturday — not due, unlogged, irrelevant
      timezone: 'UTC',
    });
    expect(result.current).toBe(3);
  });

  it('a missed scheduled day breaks the streak when no freeze is available', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: ['2026-09-07', '2026-09-09'], // Mon/Wed hit, Fri (09-11) missed
      freezesAvailable: 0,
      now: new Date('2026-09-12T12:00:00.000Z'), // Saturday, so Friday is a completed miss
      timezone: 'UTC',
    });
    expect(result.current).toBe(0);
    expect(result.freezesConsumed).toBe(0);
  });

  it('a freeze covers exactly one missed scheduled day and the streak continues', () => {
    const result = goalStreak({
      cadence,
      // Mon 09-07 hit, Wed 09-09 MISSED, Fri 09-11 hit, Mon 09-14 hit.
      entryDayKeys: ['2026-09-07', '2026-09-11', '2026-09-14'],
      freezesAvailable: 1,
      now: new Date('2026-09-14T12:00:00.000Z'),
      timezone: 'UTC',
    });
    // Walking back from Mon 14 (hit) -> Fri 11 (hit) -> Wed 9 (missed, freeze covers it) ->
    // Mon 7 (hit) -> nothing before the anchor's relevant window in this test.
    expect(result.current).toBe(4);
    expect(result.freezesConsumed).toBe(1);
    expect(result.freezesRemaining).toBe(0);
  });

  it('freezes exhausted: the next missed scheduled day still breaks the streak', () => {
    const result = goalStreak({
      cadence,
      // Wed 09-09 MISSED, and the only freeze already spent (freezesAvailable: 0 here
      // simulates "already used elsewhere" — the function only sees what's left).
      entryDayKeys: ['2026-09-11', '2026-09-14'], // Fri + next Mon hit, but Wed gap unfrozen
      freezesAvailable: 0,
      now: new Date('2026-09-14T12:00:00.000Z'),
      timezone: 'UTC',
    });
    // Mon 14 hit -> Fri 11 hit -> Wed 9 missed, no freeze -> stop.
    expect(result.current).toBe(2);
    expect(result.freezesConsumed).toBe(0);
  });
});

describe('goalStreak — n_per_week (weekly evaluation)', () => {
  const cadence: CadenceConfig = { mode: 'n_per_week', timesPerWeek: 3, anchorDate: '2026-09-01' };

  it('a week meeting exactly the target extends the streak', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: ['2026-09-01', '2026-09-03', '2026-09-05'], // 3 in week 1 (Sep 1-7)
      freezesAvailable: 0,
      now: new Date('2026-09-08T12:00:00.000Z'), // week 2 just started, week 1 just closed
      timezone: 'UTC',
    });
    expect(result.current).toBe(1);
  });

  it('a week falling exactly one short, with a freeze available, extends the streak', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: ['2026-09-01', '2026-09-03'], // only 2 in week 1, short by 1
      freezesAvailable: 1,
      now: new Date('2026-09-08T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(result.current).toBe(1);
    expect(result.freezesConsumed).toBe(1);
    expect(result.freezesRemaining).toBe(0);
  });

  it('a week falling two or more short breaks the streak even with a freeze available', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: ['2026-09-01'], // only 1 in week 1, short by 2
      freezesAvailable: 1,
      now: new Date('2026-09-08T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(result.current).toBe(0);
    expect(result.freezesConsumed).toBe(0); // one freeze is not unlimited forgiveness
  });

  it('longest tracks a broken-then-rebuilt run; current resets but longest does not', () => {
    const result = goalStreak({
      cadence,
      entryDayKeys: [
        // Week 1 (Sep 1-7): meets target
        '2026-09-01',
        '2026-09-03',
        '2026-09-05',
        // Week 2 (Sep 8-14): meets target
        '2026-09-08',
        '2026-09-10',
        '2026-09-12',
        // Week 3 (Sep 15-21): misses badly (only 1)
        '2026-09-15',
        // Week 4 (Sep 22-28): meets target again
        '2026-09-22',
        '2026-09-24',
        '2026-09-26',
      ],
      freezesAvailable: 0,
      now: new Date('2026-09-29T12:00:00.000Z'), // week 4 has fully closed
      timezone: 'UTC',
    });
    expect(result.longest).toBe(2); // weeks 1-2
    expect(result.current).toBe(1); // only week 4, since week 3 broke it with no freeze
  });
});
