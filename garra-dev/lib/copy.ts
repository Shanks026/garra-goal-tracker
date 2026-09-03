// Every user-facing slang string lives here (01-design-system.md §8), so the app can be
// re-voiced in one commit. DB tables and code identifiers stay neutral (arcs, goals,
// entries) — never rename those to match this file.
//
// Screen-specific strings get added by the phase that introduces the screen using them — don't
// pre-populate this with strings nothing renders yet.
export const copy = {
  /** The wordmark. Here rather than hardcoded so a rename is one edit like every other string. */
  brand: 'Garra',
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
    /** Nothing logged yet. Not a pace rung — see ArcRowData.notStarted. */
    notStarted: 'Not started',
  },

  // Human labels for the two domain enums. The DB and the code keep the neutral machine values
  // (`n_per_week`, `accumulate`) exactly as rules/05 §4 requires — these are the display side.
  //
  // Added because the raw keys were leaking into the UI: the inventory cards and the load check
  // were rendering "n_per_week" and "accumulate" straight from the row.
  goalType: {
    habit: 'Habit',
    accumulate: 'Total',
    ship: 'Ship',
    milestone: 'Milestone',
  },
  cadence: {
    daily: 'Every day',
    n_per_week: 'times a week',
    specific_days: 'Set days',
    every_n_days: 'Every few days',
    none: 'Any day',
  },

  // Onboarding (screens 01-05). Added Phase 5.0 — these were hardcoded in the screens, which
  // left this file with zero importers and the app un-revoiceable.
  onboarding: {
    // Screen 01 opens straight on this, as the canvas does. Two things that briefly lived here
    // are gone: `helloTitle`/`helloSubtitle` ("hello." / "let's make this one count") and the
    // typewriter cold-open's three lines. Deleted rather than kept — unused copy is dead code,
    // and the canvas remains the record of the original design.
    hookTitle: 'Every good run has a finish line.',
    hookBody:
      'Garra puts each goal inside an Arc — a window with a real end date — then tells you whether you’ll make it. No streaks to protect forever.',
    continueCta: 'Continue',
    buildCta: 'Build my arc',
    haveAccount: 'I already have an account',

    // Screen 1.5 — "how an Arc works". Not in the canvas; added because the flow asked users to
    // build an Arc before it had told them what one is.
    howTitle: 'How an Arc works',
    howBeats: [
      { label: 'Create your arc', body: 'One window. Everything you commit to lives inside it.' },
      { label: 'Set a deadline', body: 'A real end date. Not someday — a date on the calendar.' },
      { label: 'Do the work. Grind.', body: 'Log it in seconds. The app does the arithmetic.' },
      { label: 'See if you made it', body: "Garra tells you whether you're on pace, not just whether you showed up." },
    ],

    // The arc-creation screen. There's no name placeholder string here on purpose: the field's
    // placeholder comes from `seasonalArcTitle()` at runtime, so the auto-name is a visible
    // suggestion in an empty field rather than a silent decision made on the user's behalf.
    arcNewTitle: 'Name your arc.',
    arcNewBody: 'A window with a real end date. You can change any of this later.',
    arcNameLabel: 'ARC NAME',
    arcDescLabel: 'WHAT IS THIS RUN FOR?',
    arcDescPlaceholder: 'Optional. One line you can look back at.',
    arcWindowLabel: 'HOW LONG?',
    arcNewCta: 'Start this arc',
    nameTitle: 'What should we call you?',
    nameBody: 'Only shows up in your Sunday Reset and your Finale.',
    intentTitle: 'What do you keep putting off?',
    intentBody: "Pick a few. We'll shape them into goals with real numbers.",
    recommendedTitle: 'Your inventory',
    recommendedBody: 'Targets sized to your window. Tap any goal to set your own numbers.',
    /** The card's own action. Reads as a button because it is one. */
    customiseHint: 'Customize',
    /** Shown once a proposal has been customised, so the card admits it's been edited. */
    editGoalHint: 'Customized · tap to edit',
    startArcCta: 'Start the arc',
    addSomethingElse: '+ Add something else',
    /** Reassurance under the intent picker — the cap is on this screen, not on the arc. */
    intentAddMoreLater: 'You can add as many goals as you want later.',
    signupTitle: 'Right now, this arc lives on one phone.',
    signupBody:
      'Lose it and this run’s history goes with it. An account keeps the run — and the Finale at the end of it.',
    savedOnDeviceOnly: 'Saved on device only',
    keepOnPhone: 'Keep it on this phone',
  },

  // The auth screen. Was a bottom sheet with an email OTP; became a full screen with
  // email + password once email confirmation was switched off in Supabase — a form with four
  // fields and two modes is a screen, not a sheet (rules/02 §3: sheets are for quick,
  // single-purpose input the user dismisses in seconds).
  auth: {
    signUpTitle: 'Keep this arc safe.',
    signUpBody:
      'An account keeps this run — and the Finale at the end of it — if this phone ever goes missing.',
    logInTitle: 'Welcome back.',
    logInBody: 'Sign in and your arc comes with you.',
    nameLabel: 'YOUR NAME',
    emailLabel: 'EMAIL',
    passwordLabel: 'PASSWORD',
    confirmLabel: 'CONFIRM PASSWORD',
    namePlaceholder: 'Chris',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'At least 6 characters',
    createCta: 'Create account',
    logInCta: 'Log in',
    /** Mode switches. Phrased as what the user wants, not as a mode name. */
    toLogIn: 'I already have an account',
    toSignUp: 'Create an account instead',
    // Errors say what went wrong and how to fix it — no apologies (rules/02 §5).
    errNoEmail: 'Enter your email.',
    errNoPassword: 'Enter a password.',
    errShortPassword: 'Passwords need at least 6 characters.',
    errMismatch: 'Those passwords do not match.',
    errNoName: 'Enter your name.',
  },

  // Screen 09 — the honesty check before committing. These were hardcoded in the screen, which
  // is exactly what rules/01 §8 forbids: "Lock in" is slang and has to be re-voiceable here.
  loadCheck: {
    // Third pass on this line. "Load check" read as a systems term; "What this costs you" fixed
    // that but framed the arc as a bill — cost language makes the user weigh what they're losing
    // at the exact moment they're deciding to commit. This frames the same number as investment
    // rather than expense, which is the honest reading: the time isn't leaving, it's going
    // somewhere the user chose.
    title: "What you're putting in",
    /** The headline number is per *day*: that's the commitment people actually feel. */
    perDayLabel: 'EVERY DAY',
    /** Primary. Echoes the `locked_in` rung of the status ladder, so the word already means
        something in this app rather than being a generic confirm. */
    lockIn: 'Lock in',
    /** Secondary — the escape hatch. Always available: garra-index.md §7.2 step 5 is explicit
        that the point is making the user look, not gatekeeping them. */
    trim: 'Trim something',
    ambitious: 'Ambitious. Doable.',
    secondJob: 'This is a second job. Most people drop two of these by week 4.',
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
    // Was 'THE ARC', which duplicated the tab name and the hero title right above it. This
    // section is the goal list, so it says so.
    arcLabel: 'MY GOALS',
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
