import { pace } from './pace';

// A 122-day arc, matching garra-index.md's own worked example (Sep 1 -> Dec 31).
const ARC_START = '2026-09-01';
const ARC_END = '2026-12-31';

describe('pace', () => {
  it('day 1: no elapsed time, no divide-by-zero', () => {
    const result = pace({
      target: 800,
      current: 0,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-09-01T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.fractionExpected).toBe(0);
    expect(result.expected).toBe(0);
    expect(Number.isFinite(result.requiredRate)).toBe(true);
    expect(result.requiredRate).toBeCloseTo(800 / 122, 5);
    expect(result.status).not.toBe('cooked');
  });

  it('the final day: not yet cooked, fractionExpected just under 1', () => {
    const result = pace({
      target: 800,
      current: 700,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-12-31T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.fractionExpected).toBeCloseTo(121 / 122, 5);
    expect(result.status).not.toBe('cooked');
  });

  it('the day after the end date, target not reached: cooked', () => {
    const result = pace({
      target: 800,
      current: 700,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2027-01-01T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.status).toBe('cooked');
    expect(result.requiredRate).toBe(0); // nothing achievable, not Infinity/NaN
  });

  it('the day after the end date, target exceeded in time: not cooked, locked_in', () => {
    // current=800 (exactly on target) would land exactly on fractionExpected too (both 1),
    // i.e. genuinely "on track", not "ahead" — using 850 to unambiguously test the
    // not-cooked-and-ahead case rather than the on-track boundary.
    const result = pace({
      target: 800,
      current: 850,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2027-01-01T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.status).not.toBe('cooked');
    expect(result.status).toBe('locked_in');
  });

  it('a goal whose ends_at is before the arc end just uses the shorter window', () => {
    const shortEnd = '2026-11-15'; // ends well before ARC_END
    const result = pace({
      target: 400,
      current: 100,
      startDate: ARC_START,
      endDate: shortEnd,
      now: new Date('2026-10-01T12:00:00.000Z'),
      basis: 'even',
    });
    // 2026-09-01 -> 2026-11-15 inclusive = 30 (Sep) + 31 (Oct) + 15 (Nov) = 76 days.
    const daysTotal = 76;
    const daysElapsed = 30; // Sep 1 -> Oct 1 exclusive of today = 30 full days elapsed
    expect(result.fractionExpected).toBeCloseTo(daysElapsed / daysTotal, 5);
  });

  it('a rescoped target mid-arc has no special-casing — just reflects the new target', () => {
    const shared = {
      current: 300,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-10-15T12:00:00.000Z'),
      basis: 'even' as const,
    };
    const before = pace({ ...shared, target: 800 });
    const after = pace({ ...shared, target: 1000 });
    expect(after.fractionDone).toBeCloseTo(300 / 1000, 5);
    expect(before.fractionDone).toBeCloseTo(300 / 800, 5);
    expect(after.fractionDone).toBeLessThan(before.fractionDone);
  });

  it('a backfilled entry changing current is just a different number, recomputed fully', () => {
    const shared = {
      target: 800,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-10-15T12:00:00.000Z'),
      basis: 'even' as const,
    };
    const beforeBackfill = pace({ ...shared, current: 200 });
    const afterBackfill = pace({ ...shared, current: 250 }); // a backfilled entry added 50
    expect(afterBackfill.deficit).toBeGreaterThan(beforeBackfill.deficit);
    expect(afterBackfill.fractionDone).toBeCloseTo(250 / 800, 5);
  });

  it('weekdays_only: a window spanning a full weekend does not move fractionExpected on those days', () => {
    // 2026-09-01 is a Tuesday, so Sat 2026-09-05 / Sun 2026-09-06 is the first weekend.
    // "now" = Saturday means Fri (the last weekday) has just fully elapsed; "now" = the
    // following Monday means Fri+Sat+Sun have calendar-elapsed but only Fri counts as a
    // weekday — both snapshots should therefore agree exactly.
    const saturday = pace({
      target: 100,
      current: 0,
      startDate: ARC_START,
      endDate: '2026-09-11',
      now: new Date('2026-09-05T12:00:00.000Z'),
      basis: 'weekdays_only',
    });
    const monday = pace({
      target: 100,
      current: 0,
      startDate: ARC_START,
      endDate: '2026-09-11',
      now: new Date('2026-09-07T12:00:00.000Z'),
      basis: 'weekdays_only',
    });
    // The Sat/Sun weekend in between contributed zero additional expected fraction.
    expect(monday.fractionExpected).toBeCloseTo(saturday.fractionExpected, 5);
    // And it's not trivially zero-vs-zero — confirm real progress was expected by this point.
    expect(saturday.fractionExpected).toBeGreaterThan(0);
  });

  it('custom_weekly falls back to identical output as even (documented gap, not a bug)', () => {
    const shared = {
      target: 800,
      current: 300,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-10-15T12:00:00.000Z'),
    };
    const even = pace({ ...shared, basis: 'even' });
    const customWeekly = pace({ ...shared, basis: 'custom_weekly' });
    expect(customWeekly).toEqual(even);
  });

  it('a target already exceeded returns fractionDone > 1, uncapped', () => {
    const result = pace({
      target: 800,
      current: 950,
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-10-15T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.fractionDone).toBeGreaterThan(1);
    expect(result.status).toBe('locked_in');
    expect(result.requiredRate).toBe(0); // already complete, nothing further required
  });

  it('status bands: ahead beyond the on-track tolerance is locked_in', () => {
    const result = pace({
      target: 122, // 1 unit/day expected pace, easy to reason about
      current: 50, // day 15: expected ~14, current 50 is way ahead
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-09-15T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.status).toBe('locked_in');
  });

  it('status bands: within the on-track tolerance is on_track', () => {
    const result = pace({
      target: 122,
      current: 14, // day 15: expected fraction = 14/122, current exactly matches
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-09-15T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.status).toBe('on_track');
  });

  it('status bands: behind beyond the on-track tolerance is slipping', () => {
    const result = pace({
      target: 122,
      current: 2, // day 15: expected ~14, current 2 is well behind
      startDate: ARC_START,
      endDate: ARC_END,
      now: new Date('2026-09-15T12:00:00.000Z'),
      basis: 'even',
    });
    expect(result.status).toBe('slipping');
  });
});
