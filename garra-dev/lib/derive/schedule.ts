// Cadence expansion — the single source of truth for "is this goal due on day X" and "how many
// occurrences fall in a range." streaks.ts, mosaic.ts, and load.ts all build on this rather
// than each re-interpreting cadence_mode independently. See 04-pace-engine.md's Context section
// for why n_per_week is handled so differently from the other three modes: the user picks
// freely which days to hit their weekly count, so only a *weekly* question is well-defined
// for it, never a per-day one.

export type CadenceMode = 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';

export type CadenceConfig = {
  mode: CadenceMode;
  timesPerWeek?: number; // required if mode === 'n_per_week'
  daysOfWeek?: number[]; // required if mode === 'specific_days'; 0=Sunday..6=Saturday
  intervalDays?: number; // required if mode === 'every_n_days'
  anchorDate: string; // 'YYYY-MM-DD' — the goal's own start; every_n_days counts from here
  /**
   * 'YYYY-MM-DD' — where n_per_week's week boundaries fall, normally the *arc's* start so that
   * every goal in an arc shares week boundaries (and they line up with the arc-level mosaic
   * grid). Falls back to `anchorDate` when absent, which is why adding it broke no existing
   * caller. Produced by `cadenceForGoal()`; see 06-home-and-logging.md §5.0.3.
   */
  weekAnchorDate?: string;
};

const MS_PER_DAY = 86400000;

function dayNumberFromDateString(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00.000Z`) / MS_PER_DAY);
}

function weekdayOf(dayNumber: number): number {
  // dayNumber is days since the Unix epoch (1970-01-01, a Thursday). Returns 0=Sunday..6=Saturday.
  return (dayNumber + 4) % 7;
}

/**
 * Well-defined for daily/specific_days/every_n_days. Throws for n_per_week — callers must route
 * n_per_week through weeklyTarget()/occurrencesInRange() instead. Throwing (not silently
 * guessing) makes a misuse of the API loud immediately.
 */
export function isDueOn(config: CadenceConfig, dayKey: string): boolean {
  const day = dayNumberFromDateString(dayKey);

  switch (config.mode) {
    case 'daily':
      return true;
    case 'specific_days': {
      if (!config.daysOfWeek) {
        throw new Error('isDueOn: specific_days requires daysOfWeek');
      }
      return config.daysOfWeek.includes(weekdayOf(day));
    }
    case 'every_n_days': {
      if (!config.intervalDays || config.intervalDays <= 0) {
        throw new Error('isDueOn: every_n_days requires a positive intervalDays');
      }
      const anchor = dayNumberFromDateString(config.anchorDate);
      const offset = day - anchor;
      // A day before the anchor is never due; otherwise due every intervalDays from anchor.
      return offset >= 0 && offset % config.intervalDays === 0;
    }
    case 'n_per_week':
      throw new Error(
        'isDueOn: n_per_week has no per-day answer — use weeklyTarget() or occurrencesInRange() instead',
      );
  }
}

/**
 * Well-defined only for n_per_week (the weekly count target). Returns null for the other three
 * modes — they don't have a "times per week" concept distinct from counting due days directly.
 */
export function weeklyTarget(config: CadenceConfig): number | null {
  if (config.mode !== 'n_per_week') return null;
  if (!config.timesPerWeek) {
    throw new Error('weeklyTarget: n_per_week requires timesPerWeek');
  }
  return config.timesPerWeek;
}

/**
 * Well-defined for ALL modes — the expected occurrence count over an inclusive day-key range.
 * For daily/specific_days/every_n_days: counts actual due days via isDueOn. For n_per_week:
 * prorates (timesPerWeek * rangeDays / 7), a real number, not rounded, since callers (load.ts)
 * need the precise average.
 */
export function occurrencesInRange(
  config: CadenceConfig,
  startDayKey: string,
  endDayKey: string,
): number {
  const startDay = dayNumberFromDateString(startDayKey);
  const endDay = dayNumberFromDateString(endDayKey);
  if (endDay < startDay) return 0;
  const rangeDays = endDay - startDay + 1;

  if (config.mode === 'n_per_week') {
    const target = weeklyTarget(config)!;
    return (target * rangeDays) / 7;
  }

  let count = 0;
  for (let d = startDay; d <= endDay; d++) {
    const dayStr = new Date(d * MS_PER_DAY).toISOString().slice(0, 10);
    if (isDueOn(config, dayStr)) count++;
  }
  return count;
}
