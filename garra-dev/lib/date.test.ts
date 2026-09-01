import { dayKey } from './date';

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
