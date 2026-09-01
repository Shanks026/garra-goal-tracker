import type { PaceStatus } from './pace';

// When to offer a rescope, and what to suggest. Both are judgment calls, so both are pure and
// tested rather than buried in a screen — see 08-goal-detail.md's Context section for the
// reasoning behind the heuristic.

/**
 * `cooked` alone is too late to be useful. Phase 3 defined it strictly — deadline passed and
 * target not reached — so by the time it's true the arc is over and rescoping is pointless.
 *
 * So the offer also fires when the required rate has become implausible **against the goal's own
 * demonstrated history**: more than twice the best daily rate it has actually achieved. Using the
 * goal's own history rather than an absolute threshold is what makes this work across a 5km-a-day
 * cyclist and a 50km-a-day one.
 *
 * A goal with no history yet never triggers: on day one nothing has been demonstrated to be
 * implausible against, and prompting a user to lower a target they haven't started is absurd.
 */
export const IMPLAUSIBLE_RATE_MULTIPLE = 2;

export function shouldOfferRescope(input: {
  status: PaceStatus;
  requiredRate: number;
  /** Best actual daily rate achieved so far, from the goal's own entries. */
  bestDailyRate: number;
}): boolean {
  const { status, requiredRate, bestDailyRate } = input;

  if (status === 'cooked') return true;
  if (bestDailyRate <= 0) return false;
  if (requiredRate <= 0) return false;

  return requiredRate > bestDailyRate * IMPLAUSIBLE_RATE_MULTIPLE;
}

/**
 * What the goal would actually reach at its current pace — the sheet's suggestion, and the honest
 * answer to "what's real?" (garra-index.md §7.6).
 *
 * Never suggests *more* than the original target: this flow exists to make a plan achievable, and
 * a suggestion to aim higher while slipping would be absurd. The caller passes the original as
 * the ceiling.
 */
export function suggestedTarget(input: {
  current: number;
  daysElapsed: number;
  daysTotal: number;
  originalTarget: number;
}): number {
  const { current, daysElapsed, daysTotal, originalTarget } = input;
  if (daysElapsed <= 0) return originalTarget;

  const projected = (current / daysElapsed) * daysTotal;
  // Rounded to something a human would choose, then capped at the original.
  const rounded = projected >= 100 ? Math.round(projected / 10) * 10 : Math.round(projected);
  return Math.min(Math.max(rounded, current), originalTarget);
}
