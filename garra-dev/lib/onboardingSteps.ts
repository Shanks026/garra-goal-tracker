// One source of truth for the fast path's progress indicators, so the "STEP n OF m" labels and
// the dot row can't drift apart the way they had (the audit found "STEP 1 OF 4" → "2 OF 4" →
// "3 OF 4" → "STEP 3 OF 3" → "STEP 4 OF 4", with the dots always showing 5).
//
// The Arc Builder keeps its own separate 1-of-3 numbering (window → goal type → load check),
// which is correct for the manual path; the load-check screen simply suppresses that label when
// it's being walked as part of onboarding, so the two systems never contradict on one journey.

// Reworked for the arc-creation flow. Before this, there was no screen where the user built the
// arc: `recommended.tsx` conjured one in a useEffect with a default 90-day window and a title
// from `seasonalArcTitle()`. Two screens were inserted to close that — `how-it-works` explains
// what an Arc *is* before asking for a commitment, and `arc-new` is where the commitment is
// actually made (name, description, dates).
//
// `arc-new` sits before `intent`/`recommended` on purpose: the proposed goals size their targets
// to the arc's length, and doing that against a placeholder window meant "800 km" was scaled to
// a number the user had never agreed to.
// `how-it-works` is deliberately NOT in this list. It asks the user for nothing — it's an
// explainer between the hook and the first real question — so counting it as a step would
// inflate the progress indicator with a screen that isn't progress. Same reasoning that already
// excludes `welcome` from `stepLabel`, taken one step further: no dots at all on that screen.
export const ONBOARDING_STEPS = [
  'welcome',
  'name',
  'arcNew',
  'intent',
  'recommended',
  'signup',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Total dots in the progress row — every step in the fast path, welcome included. */
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/** 0-based position, for the dot row. */
export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

// `stepLabel()` is gone. It rendered "STEP n OF m" above each screen's title, which said exactly
// what the dot row in the footer already says — two progress indicators on one screen, disagreeing
// about the count the moment either changed. The dots are the single indicator now.
//
// The Arc Builder's own hardcoded "STEP n OF 3" labels are a separate system and stay: those
// screens carry no dots, so the text is their only progress cue.
