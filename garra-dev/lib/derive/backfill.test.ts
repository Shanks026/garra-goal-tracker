import { isWithinBackfillWindow } from './backfill';

// The mutation that calls this needs live SQLite (expo-sqlite is a native module), so the rule
// itself lives in the derivation layer, pure and testable — which is also what
// 03-state-and-data.md §5 asks for when it says the UI must not be the only thing enforcing it.
describe('isWithinBackfillWindow', () => {
  const today = '2026-09-10';

  it('allows today', () => {
    expect(isWithinBackfillWindow(today, today)).toBe(true);
  });

  it('allows yesterday and the day before — the 2-day window', () => {
    expect(isWithinBackfillWindow('2026-09-09', today)).toBe(true);
    expect(isWithinBackfillWindow('2026-09-08', today)).toBe(true);
  });

  it('rejects three days back', () => {
    expect(isWithinBackfillWindow('2026-09-07', today)).toBe(false);
  });

  it('rejects the future — a day that hasn’t happened cannot be logged', () => {
    expect(isWithinBackfillWindow('2026-09-11', today)).toBe(false);
  });

  it('handles a month boundary', () => {
    expect(isWithinBackfillWindow('2026-08-31', '2026-09-01')).toBe(true);
    expect(isWithinBackfillWindow('2026-08-29', '2026-09-01')).toBe(false);
  });
});
