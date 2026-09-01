// One source of truth for the fast path's progress indicators, so the "STEP n OF m" labels and
// the dot row can't drift apart the way they had (the audit found "STEP 1 OF 4" → "2 OF 4" →
// "3 OF 4" → "STEP 3 OF 3" → "STEP 4 OF 4", with the dots always showing 5).
//
// The Arc Builder keeps its own separate 1-of-3 numbering (window → goal type → load check),
// which is correct for the manual path; the load-check screen simply suppresses that label when
// it's being walked as part of onboarding, so the two systems never contradict on one journey.

export const ONBOARDING_STEPS = ['welcome', 'name', 'intent', 'recommended', 'signup'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Total dots in the progress row — every step in the fast path, welcome included. */
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/** 0-based position, for the dot row. */
export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

/**
 * The "STEP n OF m" label. Welcome has no label (it's the hook, not a form step), so the
 * numbering counts only the steps that ask for something — matching the canvas exactly.
 */
export function stepLabel(step: OnboardingStep): string | null {
  const index = stepIndex(step);
  if (index <= 0) return null;
  return `STEP ${index} OF ${ONBOARDING_STEP_COUNT - 1}`;
}
