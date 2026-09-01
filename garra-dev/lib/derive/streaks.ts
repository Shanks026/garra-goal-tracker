import { dayKey } from '@/lib/date';
import { isDueOn, type CadenceConfig } from './schedule';

const MS_PER_DAY = 86400000;

function dayNumberFromDateString(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00.000Z`) / MS_PER_DAY);
}

function dayStringFromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

export type ArcStreakResult = { current: number; longest: number };

/**
 * The forgiving, app-level streak: did you log *anything* (any goal) that day. Not
 * schedule-aware on purpose — garra-index.md §4.4 calls this "very forgiving," the only
 * streak notifications defend.
 */
export function arcStreak(input: {
  entryDayKeys: string[];
  now: Date;
  timezone: string;
}): ArcStreakResult {
  const { entryDayKeys, now, timezone } = input;
  const days = new Set(entryDayKeys);
  const today = dayKey(now, timezone);

  // Longest: scan sorted unique days for the longest consecutive-calendar-day run.
  const sortedDayNumbers = [...days].map(dayNumberFromDateString).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const dayNumber of sortedDayNumbers) {
    run = prev !== null && dayNumber === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = dayNumber;
  }

  // Current: walk backward from today. Today not yet having an entry doesn't break the
  // streak — the day isn't over yet — so start from yesterday in that case.
  let current = 0;
  let cursor = dayNumberFromDateString(today);
  if (!days.has(today)) cursor -= 1;
  while (days.has(dayStringFromDayNumber(cursor))) {
    current += 1;
    cursor -= 1;
  }

  return { current, longest };
}

export type GoalStreakResult = {
  current: number;
  longest: number;
  freezesConsumed: number;
  freezesRemaining: number;
};

/**
 * Schedule-aware, freeze-consuming. daily/specific_days/every_n_days count consecutive DUE
 * days only (non-due days are skipped, never counted as a miss). n_per_week counts consecutive
 * WEEKS that met their target instead of days, since "which days" is undefined for that mode
 * (see schedule.ts). `longest` is computed from raw hit/miss history only, without freeze
 * credit — a historically accurate freeze-aware reconstruction would need the full freeze
 * earn/consume log as an input, which this signature deliberately doesn't take (only a
 * point-in-time `freezesAvailable` bank, matching 03-state-and-data.md §4's `pace()` precedent
 * of taking only what's needed, not a full audit trail).
 */
export function goalStreak(input: {
  cadence: CadenceConfig;
  entryDayKeys: string[];
  freezesAvailable: number;
  now: Date;
  timezone: string;
}): GoalStreakResult {
  const { cadence, entryDayKeys, freezesAvailable, now, timezone } = input;
  const days = new Set(entryDayKeys);
  const today = dayKey(now, timezone);
  const anchorDayNumber = dayNumberFromDateString(cadence.anchorDate);

  if (cadence.mode === 'n_per_week') {
    return goalStreakWeekly({ cadence, days, today, anchorDayNumber, freezesAvailable });
  }
  return goalStreakDaily({ cadence, days, today, anchorDayNumber, freezesAvailable });
}

function goalStreakDaily(args: {
  cadence: CadenceConfig;
  days: Set<string>;
  today: string;
  anchorDayNumber: number;
  freezesAvailable: number;
}): GoalStreakResult {
  const { cadence, days, today, anchorDayNumber, freezesAvailable } = args;

  // Longest: scan every due day from the anchor to today, no freeze credit.
  let longest = 0;
  let run = 0;
  const todayDayNumber = dayNumberFromDateString(today);
  for (let d = anchorDayNumber; d <= todayDayNumber; d++) {
    const dayStr = dayStringFromDayNumber(d);
    if (!isDueOn(cadence, dayStr)) continue;
    run = days.has(dayStr) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  // Current: walk backward from today, skipping non-due days, consuming freezes on a miss.
  let current = 0;
  let freezesConsumed = 0;
  let cursor = todayDayNumber;
  // Today itself, if due but not yet logged, doesn't break anything — the day isn't over.
  if (isDueOn(cadence, today) && !days.has(today)) cursor -= 1;

  while (cursor >= anchorDayNumber) {
    const dayStr = dayStringFromDayNumber(cursor);
    if (isDueOn(cadence, dayStr)) {
      if (days.has(dayStr)) {
        current += 1;
      } else if (freezesConsumed < freezesAvailable) {
        freezesConsumed += 1;
        current += 1;
      } else {
        break;
      }
    }
    cursor -= 1;
  }

  return {
    current,
    longest,
    freezesConsumed,
    freezesRemaining: freezesAvailable - freezesConsumed,
  };
}

function goalStreakWeekly(args: {
  cadence: CadenceConfig;
  days: Set<string>;
  today: string;
  anchorDayNumber: number;
  freezesAvailable: number;
}): GoalStreakResult {
  const { cadence, days, today, anchorDayNumber, freezesAvailable } = args;
  const todayDayNumber = dayNumberFromDateString(today);

  // Walk backward one full week at a time, starting from the most recently *completed* week
  // (the current, still-in-progress week is never evaluated — it hasn't had its chance yet).
  const weeklyTargetCount = cadence.timesPerWeek!;
  let current = 0;
  let freezesConsumed = 0;
  let longest = 0;
  let run = 0;

  // Build week boundaries from anchor to today for the `longest` scan (oldest to newest).
  const weekStarts: number[] = [];
  for (let w = anchorDayNumber; w <= todayDayNumber; w += 7) weekStarts.push(w);

  for (const weekStart of weekStarts) {
    const weekEnd = Math.min(weekStart + 6, todayDayNumber);
    if (weekEnd - weekStart < 6) break; // an incomplete trailing week is never evaluated
    let hitCount = 0;
    for (let d = weekStart; d <= weekEnd; d++) {
      if (days.has(dayStringFromDayNumber(d))) hitCount++;
    }
    run = hitCount >= weeklyTargetCount ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  // Current: walk backward week by week from the most recent completed week.
  let cursorWeekEnd = todayDayNumber - ((todayDayNumber - anchorDayNumber) % 7) - 1;
  while (cursorWeekEnd - 6 >= anchorDayNumber) {
    const weekStart = cursorWeekEnd - 6;
    let hitCount = 0;
    for (let d = weekStart; d <= cursorWeekEnd; d++) {
      if (days.has(dayStringFromDayNumber(d))) hitCount++;
    }
    const shortfall = weeklyTargetCount - hitCount;
    if (shortfall <= 0) {
      current += 1;
    } else if (shortfall === 1 && freezesConsumed < freezesAvailable) {
      // One freeze covers being short by exactly one session that week — not unlimited
      // forgiveness (garra-index.md §4.4: "earn 1, consume 1" bank semantics).
      freezesConsumed += 1;
      current += 1;
    } else {
      break;
    }
    cursorWeekEnd -= 7;
  }

  return {
    current,
    longest,
    freezesConsumed,
    freezesRemaining: freezesAvailable - freezesConsumed,
  };
}
