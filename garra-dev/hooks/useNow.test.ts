import { msUntilNextRollover } from './useNow';

const HOUR = 3_600_000;

describe('msUntilNextRollover', () => {
  it('counts forward to 04:00 the same day when it is still before the rollover', () => {
    // 01:00 in Chicago (CST, UTC−6) on Jan 15 → 3 hours until 04:00.
    const ms = msUntilNextRollover(new Date('2026-01-15T07:00:00Z'), 'America/Chicago');
    expect(ms).toBeCloseTo(3 * HOUR, -4);
  });

  it('counts forward to tomorrow’s 04:00 when the rollover has already passed', () => {
    // 05:00 in Chicago → 23 hours until the next 04:00.
    const ms = msUntilNextRollover(new Date('2026-01-15T11:00:00Z'), 'America/Chicago');
    expect(ms).toBeCloseTo(23 * HOUR, -4);
  });

  it('never returns zero or negative, even exactly at the rollover', () => {
    // Exactly 04:00 in Chicago — the next tick must be tomorrow, not right now.
    const ms = msUntilNextRollover(new Date('2026-01-15T10:00:00Z'), 'America/Chicago');
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeCloseTo(24 * HOUR, -4);
  });

  it('respects the arc’s timezone rather than the runtime’s', () => {
    // The same instant is 01:00 in Chicago but 12:30 in Kolkata, so the waits differ.
    const instant = new Date('2026-01-15T07:00:00Z');
    const chicago = msUntilNextRollover(instant, 'America/Chicago');
    const kolkata = msUntilNextRollover(instant, 'Asia/Kolkata');
    expect(chicago).not.toBeCloseTo(kolkata, -6);
  });

  it('handles a half-hour-offset timezone without drifting off the hour boundary', () => {
    const ms = msUntilNextRollover(new Date('2026-01-14T22:30:00Z'), 'Asia/Kolkata'); // 04:00 IST
    expect(ms).toBeCloseTo(24 * HOUR, -4);
  });
});
