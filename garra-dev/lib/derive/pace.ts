// Signature ported verbatim from .claude/rules/03-state-and-data.md §4 — this is the product;
// see .claude/features/04-pace-engine.md for the full rationale behind every judgment call
// below (the on-track tolerance band, the custom_weekly fallback).

export type PaceBasis = 'even' | 'weekdays_only' | 'custom_weekly';
export type PaceStatus = 'locked_in' | 'on_track' | 'slipping' | 'cooked';

export type PaceInput = {
  target: number;
  current: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  now: Date;
  basis: PaceBasis;
};

export type PaceResult = {
  expected: number;
  deficit: number;
  requiredRate: number;
  fractionDone: number;
  fractionExpected: number;
  status: PaceStatus;
};

const MS_PER_DAY = 86400000;

// UTC epoch-day number for a 'YYYY-MM-DD' string — deliberately UTC-anchored, never the
// runtime's local timezone (the same discipline lib/date.ts's dayKey() uses).
function dayNumberFromDateString(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00.000Z`) / MS_PER_DAY);
}

// UTC epoch-day number for `now` — there is no timezone parameter in this signature (matching
// 03-state-and-data.md §4 exactly), so `now`'s calendar day is read via its UTC getters,
// consistently, rather than the runtime's local timezone.
function dayNumberFromNow(now: Date): number {
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / MS_PER_DAY,
  );
}

function isWeekday(dayNumber: number): boolean {
  // dayNumber is a count of days since the Unix epoch (1970-01-01, a Thursday = day 0).
  const weekday = (dayNumber + 4) % 7; // 0=Sunday..6=Saturday, matching Date#getUTCDay()
  return weekday >= 1 && weekday <= 5;
}

function countWeekdaysInclusive(startDay: number, endDayInclusive: number): number {
  if (endDayInclusive < startDay) return 0;
  let count = 0;
  for (let d = startDay; d <= endDayInclusive; d++) {
    if (isWeekday(d)) count++;
  }
  return count;
}

export function pace(input: PaceInput): PaceResult {
  const { target, current, startDate, endDate, now, basis } = input;

  const startDay = dayNumberFromDateString(startDate);
  const endDay = dayNumberFromDateString(endDate);
  const nowDay = dayNumberFromNow(now);

  const daysTotal = endDay - startDay + 1; // inclusive, e.g. Sep 1 -> Dec 31 = 122
  const daysElapsed = Math.max(0, Math.min(daysTotal, nowDay - startDay));
  const daysRemaining = daysTotal - daysElapsed;

  let fractionExpected: number;
  if (basis === 'weekdays_only') {
    const weekdaysTotal = countWeekdaysInclusive(startDay, endDay);
    const weekdaysElapsed =
      daysElapsed === 0 ? 0 : countWeekdaysInclusive(startDay, startDay + daysElapsed - 1);
    // A window with zero weekdays (pathological, but don't divide by zero) has no meaningful
    // weekday-based pace — fall back to the day-based fraction.
    fractionExpected =
      weekdaysTotal > 0 ? weekdaysElapsed / weekdaysTotal : daysElapsed / daysTotal;
  } else {
    // 'even' and 'custom_weekly' (documented fallback — see feature doc) share this formula.
    fractionExpected = daysElapsed / daysTotal;
  }

  const fractionDone = current / target;
  const expected = target * fractionExpected;
  const deficit = current - expected;

  const isPastDeadline = daysRemaining <= 0;
  const isComplete = fractionDone >= 1;

  const requiredRate = isPastDeadline || isComplete ? 0 : (target - current) / daysRemaining;

  const onTrackBand = 1 / daysTotal;
  let status: PaceStatus;
  if (isPastDeadline && !isComplete) {
    status = 'cooked';
  } else if (fractionDone - fractionExpected > onTrackBand) {
    status = 'locked_in';
  } else if (fractionExpected - fractionDone > onTrackBand) {
    status = 'slipping';
  } else {
    status = 'on_track';
  }

  return { expected, deficit, requiredRate, fractionDone, fractionExpected, status };
}
