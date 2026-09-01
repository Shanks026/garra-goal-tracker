import {
  currentValue,
  isLoggedOn,
  isSkippedOn,
  loggedCountInRange,
  valueOn,
  type ProgressEntry,
} from './progress';

function entry(dayKey: string, value: number | null, skipped = false): ProgressEntry {
  return { dayKey, value, skipped };
}

describe('currentValue', () => {
  it('accumulate sums entry values', () => {
    const total = currentValue({
      type: 'accumulate',
      entries: [entry('2026-09-01', 12.4), entry('2026-09-02', 31.8)],
    });
    expect(total).toBeCloseTo(44.2, 5);
  });

  it('accumulate adds startingValue for a mid-flight goal', () => {
    const total = currentValue({
      type: 'accumulate',
      entries: [entry('2026-09-01', 10)],
      startingValue: 150,
    });
    expect(total).toBe(160);
  });

  it('accumulate ignores skipped entries — a skip is an absence, not a zero', () => {
    const total = currentValue({
      type: 'accumulate',
      entries: [entry('2026-09-01', 10), entry('2026-09-02', null, true)],
    });
    expect(total).toBe(10);
  });

  it('accumulate treats a null value as 0, never NaN', () => {
    const total = currentValue({
      type: 'accumulate',
      entries: [entry('2026-09-01', null), entry('2026-09-02', 5)],
    });
    expect(total).toBe(5);
    expect(Number.isNaN(total)).toBe(false);
  });

  it('ship counts entries rather than summing values (a ship logs an event, not a quantity)', () => {
    const total = currentValue({
      type: 'ship',
      entries: [entry('2026-09-01', null), entry('2026-09-02', null), entry('2026-09-03', null)],
    });
    expect(total).toBe(3);
  });

  it('habit counts completed days, not summed values', () => {
    const total = currentValue({
      type: 'habit',
      entries: [entry('2026-09-01', 45), entry('2026-09-02', 30)],
    });
    expect(total).toBe(2);
  });

  it('habit and ship both ignore skipped days', () => {
    const entries = [entry('2026-09-01', null), entry('2026-09-02', null, true)];
    expect(currentValue({ type: 'habit', entries })).toBe(1);
    expect(currentValue({ type: 'ship', entries })).toBe(1);
  });

  it('milestone uses checkpointsHit and ignores entries entirely', () => {
    const total = currentValue({
      type: 'milestone',
      entries: [entry('2026-09-01', 99), entry('2026-09-02', 99)],
      checkpointsHit: 3,
    });
    expect(total).toBe(3);
  });

  it('milestone with no checkpoints hit is 0, not undefined', () => {
    expect(currentValue({ type: 'milestone', entries: [] })).toBe(0);
  });

  it('an empty entry list is 0 for every type', () => {
    for (const type of ['habit', 'accumulate', 'ship', 'milestone'] as const) {
      expect(currentValue({ type, entries: [] })).toBe(0);
    }
  });
});

describe('isLoggedOn / isSkippedOn', () => {
  const entries = [entry('2026-09-01', 10), entry('2026-09-02', null, true)];

  it('a logged day is logged and not skipped', () => {
    expect(isLoggedOn(entries, '2026-09-01')).toBe(true);
    expect(isSkippedOn(entries, '2026-09-01')).toBe(false);
  });

  it('a day whose only entry is skipped is NOT logged', () => {
    expect(isLoggedOn(entries, '2026-09-02')).toBe(false);
    expect(isSkippedOn(entries, '2026-09-02')).toBe(true);
  });

  it('an untouched day is neither', () => {
    expect(isLoggedOn(entries, '2026-09-03')).toBe(false);
    expect(isSkippedOn(entries, '2026-09-03')).toBe(false);
  });
});

describe('valueOn', () => {
  it('returns the logged value for that day', () => {
    expect(valueOn([entry('2026-09-01', 12.4)], '2026-09-01')).toBe(12.4);
  });

  it('returns null for an unlogged or skipped day', () => {
    expect(valueOn([entry('2026-09-01', 12.4)], '2026-09-02')).toBeNull();
    expect(valueOn([entry('2026-09-01', null, true)], '2026-09-01')).toBeNull();
  });
});

describe('loggedCountInRange', () => {
  const entries = [
    entry('2026-09-01', null),
    entry('2026-09-03', null),
    entry('2026-09-05', null, true),
    entry('2026-09-09', null),
  ];

  it('counts only non-skipped days inside the inclusive range', () => {
    expect(loggedCountInRange(entries, '2026-09-01', '2026-09-07')).toBe(2);
  });

  it('includes both endpoints', () => {
    expect(loggedCountInRange(entries, '2026-09-03', '2026-09-09')).toBe(2);
  });

  it('an empty range counts nothing', () => {
    expect(loggedCountInRange(entries, '2026-09-06', '2026-09-08')).toBe(0);
  });
});
