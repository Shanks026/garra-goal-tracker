import { occurrencesInRange, weeklyTarget, type CadenceConfig } from './schedule';

const MS_PER_DAY = 86400000;
// 12 weeks — a common multiple of 7 and every practical intervalDays value (2/3/4/6/7...),
// so the average weekly occurrence count for every_n_days/specific_days doesn't depend on
// which arbitrary window is sampled (a single 7-day window gives phase-dependent, sometimes
// wrong, results for intervals that don't divide evenly into 7 — e.g. "every 3 days").
const REFERENCE_WINDOW_DAYS = 84;

function addDays(dateStr: string, days: number): string {
  const ms = Date.parse(`${dateStr}T00:00:00.000Z`) + days * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

function weeklyOccurrences(cadence: CadenceConfig): number {
  const target = weeklyTarget(cadence);
  if (target !== null) return target; // n_per_week — the config value directly

  const endDate = addDays(cadence.anchorDate, REFERENCE_WINDOW_DAYS - 1);
  const total = occurrencesInRange(cadence, cadence.anchorDate, endDate);
  return (total / REFERENCE_WINDOW_DAYS) * 7;
}

/**
 * **Actual** weekly minutes, from real completions — the other half of the Arc tab's
 * planned-vs-actual (`IMPLEMENTATION.md` Phase 7's done-condition).
 *
 * This is `est_minutes × completions`: an estimate of an estimate, since no stopwatch ever ran.
 * The screen's copy says "logged" rather than implying measured time.
 *
 * Deliberately **not clamped** to planned. A 3×/week goal logged five times reports more than its
 * plan, because that is what happened — and a load screen that quietly caps actual at planned
 * would hide exactly the overcommitment it exists to reveal.
 */
export function actualLoad(input: {
  goals: { id: string; estMinutes: number }[];
  entriesByGoal: Map<string, { dayKey: string; skipped: boolean }[]>;
  /** Inclusive day-key range, normally the trailing 7 days. */
  fromKey: string;
  toKey: string;
}): { weeklyMinutesTotal: number; perGoal: { id: string; weeklyMinutes: number }[] } {
  const { goals, entriesByGoal, fromKey, toKey } = input;

  const perGoal = goals.map((goal) => {
    const completions = (entriesByGoal.get(goal.id) ?? []).filter(
      (e) => !e.skipped && e.dayKey >= fromKey && e.dayKey <= toKey,
    ).length;
    return { id: goal.id, weeklyMinutes: completions * (goal.estMinutes || 0) };
  });

  return {
    weeklyMinutesTotal: perGoal.reduce((sum, g) => sum + g.weeklyMinutes, 0),
    perGoal,
  };
}

export function loadCheck(input: {
  goals: { id: string; estMinutes: number; cadence: CadenceConfig | null }[];
}): {
  weeklyMinutesTotal: number;
  dailyAverageMinutes: number;
  perGoal: { id: string; weeklyMinutes: number }[];
} {
  const perGoal = input.goals.map((goal) => ({
    id: goal.id,
    // cadence === null (Accumulate/Ship/Milestone): garra-index.md §4.6's load check is a
    // Habit-goal concept ("sum est_minutes x cadence") — a goal with no weekly cadence
    // contributes nothing to it, not an error.
    weeklyMinutes: goal.cadence ? goal.estMinutes * weeklyOccurrences(goal.cadence) : 0,
  }));

  const weeklyMinutesTotal = perGoal.reduce((sum, g) => sum + g.weeklyMinutes, 0);

  return {
    weeklyMinutesTotal,
    dailyAverageMinutes: weeklyMinutesTotal / 7,
    perGoal,
  };
}
