import { addDaysToKey, dayKey, daysBetweenKeysInclusive, endOfYearKey } from './date';

describe('dayKey', () => {
  it('a timestamp at noon is unambiguous', () => {
    expect(dayKey(new Date('2026-05-01T12:00:00Z'), 'UTC')).toBe('2026-05-01');
  });

  it('midnight local belongs to the previous day', () => {
    expect(dayKey(new Date('2026-05-01T00:00:00Z'), 'UTC')).toBe('2026-04-30');
  });

  it('03:59 local belongs to the previous day; 04:00 exactly belongs to the new one', () => {
    expect(dayKey(new Date('2026-05-01T03:59:00Z'), 'UTC')).toBe('2026-04-30');
    expect(dayKey(new Date('2026-05-01T04:00:00Z'), 'UTC')).toBe('2026-05-01');
  });

  it('handles the DST spring-forward day (America/New_York, clocks skip 2am-3am)', () => {
    // 2026-03-08: US DST starts. From 3:00am onward local time is EDT (UTC-4).
    expect(dayKey(new Date('2026-03-08T07:59:00Z'), 'America/New_York')).toBe('2026-03-07'); // 03:59 EDT
    expect(dayKey(new Date('2026-03-08T08:00:00Z'), 'America/New_York')).toBe('2026-03-08'); // 04:00 EDT
  });

  it('handles the DST fall-back day (America/New_York, clocks repeat 1am-2am)', () => {
    // 2026-11-01: US DST ends. By 04:00 local time is solidly EST (UTC-5) again.
    expect(dayKey(new Date('2026-11-01T08:59:00Z'), 'America/New_York')).toBe('2026-10-31'); // 03:59 EST
    expect(dayKey(new Date('2026-11-01T09:00:00Z'), 'America/New_York')).toBe('2026-11-01'); // 04:00 EST
  });

  it('handles a non-DST, half-hour-offset timezone (Asia/Kolkata, UTC+5:30)', () => {
    expect(dayKey(new Date('2026-01-14T22:29:00Z'), 'Asia/Kolkata')).toBe('2026-01-14'); // 03:59 IST
    expect(dayKey(new Date('2026-01-14T22:30:00Z'), 'Asia/Kolkata')).toBe('2026-01-15'); // 04:00 IST
  });

  it('produces different day keys for the same instant in different timezones', () => {
    const instant = new Date('2026-06-15T23:30:00Z');
    expect(dayKey(instant, 'America/New_York')).toBe('2026-06-15'); // 19:30 EDT
    expect(dayKey(instant, 'Asia/Kolkata')).toBe('2026-06-16'); // 05:00 IST next day, past rollover
  });
});

describe('day-key arithmetic', () => {
  it('addDaysToKey moves forward and backward, crossing month and year boundaries', () => {
    expect(addDaysToKey('2026-09-01', 1)).toBe('2026-09-02');
    expect(addDaysToKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2026-09-01', -1)).toBe('2026-08-31');
    expect(addDaysToKey('2026-09-01', 0)).toBe('2026-09-01');
  });

  it('addDaysToKey is immune to DST — a spring-forward week is still 7 keys', () => {
    // US DST begins 2026-03-08. UTC-anchored arithmetic must not lose or gain a day.
    expect(addDaysToKey('2026-03-05', 7)).toBe('2026-03-12');
  });

  it('daysBetweenKeysInclusive counts both endpoints (rules/03 §5: Sep 1 → Dec 31 = 122)', () => {
    expect(daysBetweenKeysInclusive('2026-09-01', '2026-12-31')).toBe(122);
    expect(daysBetweenKeysInclusive('2026-09-01', '2026-09-01')).toBe(1);
    expect(daysBetweenKeysInclusive('2026-09-01', '2026-09-30')).toBe(30);
  });

  it('daysBetweenKeysInclusive spans a leap day correctly', () => {
    expect(daysBetweenKeysInclusive('2028-02-01', '2028-03-01')).toBe(30); // 29 days in Feb 2028
  });

  it('endOfYearKey returns Dec 31 of the key’s own year', () => {
    expect(endOfYearKey('2026-09-02')).toBe('2026-12-31');
    expect(endOfYearKey('2026-12-31')).toBe('2026-12-31');
  });
});
