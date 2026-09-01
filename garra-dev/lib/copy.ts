// Every user-facing slang string lives here (01-design-system.md §8), so the app can be
// re-voiced in one commit. DB tables and code identifiers stay neutral (arcs, goals,
// entries) — never rename those to match this file.
//
// Screen-specific strings get added by the phase that introduces the screen using them — don't
// pre-populate this with strings nothing renders yet.
export const copy = {
  arc: 'Arc',
  mains: 'Mains',
  sides: 'Sides',
  checkpoints: 'Checkpoints',
  freeze: 'Freeze',
  sundayReset: 'Sunday Reset',
  theFinale: 'The Finale',
  status: {
    lockedIn: 'Locked in',
    onTrack: 'On track',
    slipping: 'Slipping',
    cooked: 'Cooked',
  },

  // Onboarding (screens 01-05). Added Phase 5.0 — these were hardcoded in the screens, which
  // left this file with zero importers and the app un-revoiceable.
  onboarding: {
    helloTitle: 'hello.',
    helloSubtitle: "let's make this one count",
    hookTitle: 'Every good run has a finish line.',
    hookBody:
      'Garra puts each goal inside an Arc — a window with a real end date — then tells you whether you’ll make it. No streaks to protect forever.',
    buildCta: 'Build my arc',
    haveAccount: 'I already have an account',
    nameTitle: 'What should we call you?',
    nameBody: 'Only shows up in your Sunday Reset and your Finale.',
    intentTitle: 'What do you keep putting off?',
    intentBody: "Pick a few. We'll shape them into goals with real numbers.",
    recommendedTitle: "Here's what that looks like",
    recommendedBody: 'Targets sized to your window. Change any number later.',
    startArcCta: 'Start the arc',
    addSomethingElse: '+ Add something else',
    signupTitle: 'Right now, this arc lives on one phone.',
    signupBody:
      'Lose it and this run’s history goes with it. An account keeps the run — and the Finale at the end of it.',
    savedOnDeviceOnly: 'Saved on device only',
    keepOnPhone: 'Keep it on this phone',
  },

  // The Arc tab (screen 15). Added Phase 7.
  arcTab: {
    title: 'The Arc',
    momentumLabel: 'MOMENTUM',
    momentumSub: '7-day completion',
    loadLabel: 'WEEKLY LOAD',
  },

  // Home & logging (screens 10-12). Added Phase 5.
  home: {
    todayLabel: 'TODAY',
    arcLabel: 'THE ARC',
    dayLabel: 'DAY',
    logEverything: 'Log everything',
    yesterday: 'Yesterday',
    emptyToday: 'Nothing due today.',
  },
  log: {
    undo: 'Undo',
    logged: 'Logged',
    failed: 'Could not save that. Tap to retry.',
    skipped: 'Skipped',
    // Swipe-left skip reasons (rules/02 §4) — exactly these four.
    skipReasons: {
      sick: 'Sick',
      travel: 'Travel',
      noTime: 'No time',
      choseNotTo: 'Chose not to',
    },
  },
} as const;
