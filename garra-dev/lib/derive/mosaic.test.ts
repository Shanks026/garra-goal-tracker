import { mosaicCells } from './mosaic';
import type { CadenceConfig } from './schedule';

describe('mosaicCells', () => {
  it('future days all render "future", regardless of cadence', () => {
    const cells = mosaicCells({
      cadence: null,
      entries: [],
      startDate: '2026-09-01',
      totalDays: 10,
      now: new Date('2026-09-05T12:00:00.000Z'), // daysElapsed = 4
      timezone: 'UTC',
    });
    expect(cells.slice(4)).toEqual(Array(6).fill('future'));
  });

  it('specific_days: a due day with an entry renders "hit"', () => {
    const cadence: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [2],
      anchorDate: '2026-09-01',
    }; // Tuesday
    const cells = mosaicCells({
      cadence,
      entries: [{ dayKey: '2026-09-01', value: 1 }],
      startDate: '2026-09-01',
      totalDays: 5,
      now: new Date('2026-09-02T12:00:00.000Z'), // daysElapsed = 1, only Sep 1 is past
      timezone: 'UTC',
    });
    expect(cells[0]).toBe('hit');
  });

  it('specific_days: a due day without an entry renders "miss"', () => {
    const cadence: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [2],
      anchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [],
      startDate: '2026-09-01',
      totalDays: 5,
      now: new Date('2026-09-02T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(cells[0]).toBe('miss');
  });

  it('specific_days: a non-due day without an entry also renders "miss" (documented gap)', () => {
    // Only Tuesday is due. Wednesday (Sep 2) is not, but the Mosaic has no "not scheduled"
    // cell state — this is 04-pace-engine.md's documented gap, asserted here explicitly so
    // it's provably intentional, not an accident someone "fixes" later without realizing it
    // was a deliberate call.
    const cadence: CadenceConfig = {
      mode: 'specific_days',
      daysOfWeek: [2],
      anchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [],
      startDate: '2026-09-01',
      totalDays: 5,
      now: new Date('2026-09-03T12:00:00.000Z'), // daysElapsed = 2 (Sep 1 Tue, Sep 2 Wed)
      timezone: 'UTC',
    });
    expect(cells[1]).toBe('miss'); // Sep 2, Wednesday, not due, but still renders miss
  });

  it('n_per_week: an unlogged rest day within a still-open week renders "future", not "miss"', () => {
    const cadence: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 3,
      anchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [{ dayKey: '2026-09-01', value: 1 }], // only 1 of 3 logged so far
      startDate: '2026-09-01',
      totalDays: 7,
      now: new Date('2026-09-08T12:00:00.000Z'), // week (Sep 1-7) has fully closed
      timezone: 'UTC',
    });
    expect(cells[0]).toBe('hit'); // Sep 1, logged
    expect(cells[1]).toBe('future'); // Sep 2, unlogged rest day, week not yet evaluated
    expect(cells[5]).toBe('future'); // Sep 6, same
  });

  it('n_per_week: the miss lands only on the last day of a week that closed short', () => {
    const cadence: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 3,
      anchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [{ dayKey: '2026-09-01', value: 1 }], // only 1 of 3 — the week is short
      startDate: '2026-09-01',
      totalDays: 7,
      now: new Date('2026-09-08T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(cells[6]).toBe('miss'); // Sep 7, the week's last day, week fell short
  });

  it('n_per_week: a week that met its target has no "miss" cells at all', () => {
    const cadence: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 3,
      anchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [
        { dayKey: '2026-09-01', value: 1 },
        { dayKey: '2026-09-03', value: 1 },
        { dayKey: '2026-09-05', value: 1 },
      ],
      startDate: '2026-09-01',
      totalDays: 7,
      now: new Date('2026-09-08T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(cells).not.toContain('miss');
  });

  it('a value below its day\'s target renders "partial"; at or above renders "hit"', () => {
    const below = mosaicCells({
      cadence: null,
      entries: [{ dayKey: '2026-09-01', value: 5, target: 10 }],
      startDate: '2026-09-01',
      totalDays: 3,
      now: new Date('2026-09-02T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(below[0]).toBe('partial');

    const atTarget = mosaicCells({
      cadence: null,
      entries: [{ dayKey: '2026-09-01', value: 10, target: 10 }],
      startDate: '2026-09-01',
      totalDays: 3,
      now: new Date('2026-09-02T12:00:00.000Z'),
      timezone: 'UTC',
    });
    expect(atTarget[0]).toBe('hit');
  });

  it('cadence === null (Accumulate/Ship/Milestone): every unlogged past day is "miss"', () => {
    const cells = mosaicCells({
      cadence: null,
      entries: [],
      startDate: '2026-09-01',
      totalDays: 5,
      now: new Date('2026-09-04T12:00:00.000Z'), // daysElapsed = 3
      timezone: 'UTC',
    });
    expect(cells.slice(0, 3)).toEqual(['miss', 'miss', 'miss']);
  });

  it('n_per_week week boundaries follow weekAnchorDate, aligning goals to the arc grid', () => {
    // A goal created on Sep 4 with weeks anchored to the arc (Sep 1) puts the first short-week
    // miss marker on Sep 7 — the arc's week boundary — not on Sep 10 (its own +6).
    const cadence: CadenceConfig = {
      mode: 'n_per_week',
      timesPerWeek: 3,
      anchorDate: '2026-09-04',
      weekAnchorDate: '2026-09-01',
    };
    const cells = mosaicCells({
      cadence,
      entries: [{ dayKey: '2026-09-04', value: null }],
      startDate: '2026-09-01',
      totalDays: 14,
      now: new Date('2026-09-14T12:00:00.000Z'),
      timezone: 'UTC',
    });
    // Index 6 is Sep 7 — the arc-aligned end of a week that only got 1 of 3.
    expect(cells[6]).toBe('miss');
    // Index 9 is Sep 10 (the goal's own +6), which must NOT carry the marker.
    expect(cells[9]).not.toBe('miss');
  });
});
