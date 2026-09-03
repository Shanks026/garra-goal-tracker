// The intent -> goal template catalog. Picking an intent chip (onboarding screen 03) proposes
// a real, sized goal on screen 04 — this is what makes onboarding feel intelligent, per
// IMPLEMENTATION.md Phase 4's explicit callout that this is real work, not a stub.
//
// Sleep / Less scrolling / Weight are deliberately absent: those three imply the (post-v1) Limit
// type — see IMPLEMENTATION.md's Design Delta #2. A chip that produces a goal the app can't
// model is worse than a shorter list.

export type IntentKey =
  // The canvas's seven.
  | 'cycling'
  | 'guitar'
  | 'writing'
  | 'language'
  | 'strength'
  | 'reading'
  | 'sideProject'
  // Broadened past the canvas so the picker covers what people actually set out to do.
  | 'running'
  | 'walking'
  | 'swimming'
  | 'meditation'
  | 'yoga'
  | 'coding'
  | 'drawing'
  | 'photography'
  | 'piano'
  | 'drums'
  | 'singing'
  | 'cooking'
  | 'studying'
  | 'publicSpeaking'
  | 'content'
  | 'chess'
  | 'gardening'
  | 'stretching';

export type GoalProposal = {
  type: 'habit' | 'accumulate' | 'ship' | 'milestone';
  title: string;
  targetAmount?: number;
  unit?: string;
  itemNoun?: string;
  cadenceMode?: 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';
  timesPerWeek?: number;
  sessionTarget?: number;
  estMinutes: number;
  checkpoints?: { title: string }[];
  /** Accumulate only. `pace()` requires a basis, and 'even' is the one fully implemented
      (04-pace-engine.md's custom_weekly note). */
  paceBasis?: 'even' | 'weekdays_only' | 'custom_weekly';
  /** The three +chips on the log sheet (rules/01 §7). Sized from the proposal's own target so
      the common entry is one tap; the Log sheet has no other data source for these. */
  quickAdd?: number[];
};

// A sensible +chip triple for a value goal: roughly half, one, and two typical sessions' worth,
// rounded to something a human would recognise. Exported so the manual goal form derives its
// chips the same way the recommended goals do.
export function quickAddFor(perSession: number): number[] {
  const round = (n: number) => (n >= 10 ? Math.round(n / 5) * 5 : Math.max(1, Math.round(n)));
  return [round(perSession / 2), round(perSession), round(perSession * 2)];
}

export type IntentTemplate = {
  key: IntentKey;
  label: string;
  icon: string; // lucide-react-native icon name, matches GoalIcon's key space
  buildGoal: (arc: { totalDays: number }) => GoalProposal;
};

// The canvas's own examples (Cycling 800km, Guitar 5 songs, Writing 14 pieces) are sized for a
// 122-day arc — every proportional target below scales relative to that reference window, not a
// fixed number, so a 30-day arc doesn't propose an identical target to a 122-day one.
const REFERENCE_DAYS = 122;

/**
 * Scales a reference target to the arc's actual length, then rounds it to a number a human would
 * have chosen.
 *
 * The raw arithmetic is exact and useless: 800km over 30 days is 196.7, and proposing "197 km"
 * announces that a computer picked it. A target is an aspiration the user is being invited to
 * accept, so it has to look chosen — 200. Granularity scales with magnitude, because rounding
 * 14 pieces to the nearest 50 would destroy the proposal.
 */
function scaleToWindow(base: number, totalDays: number): number {
  const exact = (base * totalDays) / REFERENCE_DAYS;

  const step = exact >= 500 ? 50 : exact >= 100 ? 25 : exact >= 40 ? 10 : exact >= 10 ? 5 : 1;
  return Math.max(1, Math.round(exact / step) * step);
}

export const INTENTS: IntentTemplate[] = [
  {
    key: 'cycling',
    label: 'Cycling',
    icon: 'bike',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Cycling',
      unit: 'km',
      targetAmount: scaleToWindow(800, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 4,
      estMinutes: 90,
      paceBasis: 'even',
      // The canvas's own example chips for this goal (screen 12): +5 / +10 / +25.
      quickAdd: [5, 10, 25],
    }),
  },
  {
    key: 'guitar',
    label: 'Guitar',
    icon: 'music',
    buildGoal: () => ({
      // Checkpoint counts don't scale with window length the way a continuous target does —
      // "5 songs" is a fixed, discrete plan regardless of whether the arc is 60 or 180 days.
      type: 'milestone',
      title: 'Guitar',
      cadenceMode: 'n_per_week',
      timesPerWeek: 6,
      estMinutes: 30,
      checkpoints: [
        { title: 'Open chords' },
        { title: 'Barre chords' },
        { title: 'First full song' },
        { title: 'Song 3' },
        { title: 'Song 5' },
      ],
    }),
  },
  {
    key: 'writing',
    label: 'Writing',
    icon: 'pen-line',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Writing',
      itemNoun: 'pieces',
      targetAmount: scaleToWindow(14, totalDays),
      cadenceMode: 'daily',
      estMinutes: 45,
      // A ship logs +1 at a time, so the chips are counts, not amounts.
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'language',
    label: 'Language',
    icon: 'languages',
    buildGoal: () => ({
      type: 'habit',
      title: 'Language',
      cadenceMode: 'daily',
      sessionTarget: 20,
      unit: 'min',
      estMinutes: 20,
      quickAdd: quickAddFor(20),
    }),
  },
  {
    key: 'strength',
    label: 'Strength',
    icon: 'dumbbell',
    buildGoal: () => ({
      type: 'habit',
      title: 'Strength',
      cadenceMode: 'n_per_week',
      timesPerWeek: 3,
      estMinutes: 60,
    }),
  },
  {
    key: 'reading',
    label: 'Reading',
    icon: 'book-open',
    buildGoal: () => ({
      type: 'habit',
      title: 'Reading',
      cadenceMode: 'daily',
      sessionTarget: 20,
      unit: 'pages',
      estMinutes: 25,
      quickAdd: quickAddFor(20),
    }),
  },
  {
    key: 'sideProject',
    label: 'Side project',
    icon: 'rocket',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Side project',
      itemNoun: 'milestones',
      targetAmount: scaleToWindow(6, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 2,
      estMinutes: 90,
      quickAdd: [1, 2, 3],
    }),
  },

  // ── Broader catalog ────────────────────────────────────────────────────────────────────────
  //
  // The seven above are the canvas's own examples. These cover the pursuits people actually
  // set out to learn or build, so the picker isn't a list of whatever came up in one
  // conversation. Every one maps onto a type the app can genuinely model — habit, accumulate,
  // ship or milestone. Nothing here needs the post-v1 Limit type (no "quit", no "less",
  // no weight targets), because a chip that proposes a goal the engine can't score is worse
  // than no chip at all (Design Delta #2).

  {
    key: 'running',
    label: 'Running',
    icon: 'footprints',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Running',
      unit: 'km',
      targetAmount: scaleToWindow(250, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 4,
      estMinutes: 45,
      paceBasis: 'even',
      quickAdd: quickAddFor(5),
    }),
  },
  {
    key: 'walking',
    label: 'Walking',
    icon: 'mountain',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Walking',
      unit: 'km',
      targetAmount: scaleToWindow(500, totalDays),
      cadenceMode: 'daily',
      estMinutes: 40,
      paceBasis: 'even',
      quickAdd: quickAddFor(4),
    }),
  },
  {
    key: 'swimming',
    label: 'Swimming',
    icon: 'waves',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Swimming',
      unit: 'laps',
      targetAmount: scaleToWindow(600, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 3,
      estMinutes: 45,
      paceBasis: 'even',
      quickAdd: quickAddFor(20),
    }),
  },
  {
    key: 'meditation',
    label: 'Meditation',
    icon: 'brain',
    buildGoal: () => ({
      type: 'habit',
      title: 'Meditation',
      cadenceMode: 'daily',
      sessionTarget: 10,
      unit: 'min',
      estMinutes: 10,
      quickAdd: quickAddFor(10),
    }),
  },
  {
    key: 'yoga',
    label: 'Yoga',
    icon: 'person-standing',
    buildGoal: () => ({
      type: 'habit',
      title: 'Yoga',
      cadenceMode: 'n_per_week',
      timesPerWeek: 4,
      estMinutes: 35,
    }),
  },
  {
    key: 'coding',
    label: 'Coding',
    icon: 'code',
    buildGoal: () => ({
      type: 'habit',
      title: 'Coding',
      cadenceMode: 'daily',
      sessionTarget: 60,
      unit: 'min',
      estMinutes: 60,
      quickAdd: quickAddFor(60),
    }),
  },
  {
    key: 'drawing',
    label: 'Drawing',
    icon: 'palette',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Drawing',
      itemNoun: 'drawings',
      targetAmount: scaleToWindow(60, totalDays),
      cadenceMode: 'daily',
      estMinutes: 30,
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'photography',
    label: 'Photography',
    icon: 'camera',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Photography',
      itemNoun: 'shoots',
      targetAmount: scaleToWindow(20, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 2,
      estMinutes: 60,
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'piano',
    label: 'Piano',
    icon: 'piano',
    buildGoal: () => ({
      // Same reasoning as Guitar: a discrete plan, so the checkpoints don't scale with window
      // length the way a continuous target does.
      type: 'milestone',
      title: 'Piano',
      cadenceMode: 'n_per_week',
      timesPerWeek: 5,
      estMinutes: 30,
      checkpoints: [
        { title: 'Both hands together' },
        { title: 'Read sheet music' },
        { title: 'First full piece' },
        { title: 'Piece 3' },
        { title: 'Play from memory' },
      ],
    }),
  },
  {
    key: 'drums',
    label: 'Drums',
    icon: 'drum',
    buildGoal: () => ({
      type: 'habit',
      title: 'Drums',
      cadenceMode: 'n_per_week',
      timesPerWeek: 4,
      sessionTarget: 30,
      unit: 'min',
      estMinutes: 30,
      quickAdd: quickAddFor(30),
    }),
  },
  {
    key: 'singing',
    label: 'Singing',
    icon: 'mic',
    buildGoal: () => ({
      type: 'habit',
      title: 'Singing',
      cadenceMode: 'daily',
      sessionTarget: 20,
      unit: 'min',
      estMinutes: 20,
      quickAdd: quickAddFor(20),
    }),
  },
  {
    key: 'cooking',
    label: 'Cooking',
    icon: 'chef-hat',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Cooking',
      itemNoun: 'new recipes',
      targetAmount: scaleToWindow(24, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 2,
      estMinutes: 60,
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'studying',
    label: 'Studying',
    icon: 'graduation-cap',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Studying',
      unit: 'hours',
      targetAmount: scaleToWindow(150, totalDays),
      cadenceMode: 'daily',
      estMinutes: 90,
      paceBasis: 'even',
      quickAdd: quickAddFor(2),
    }),
  },
  {
    key: 'publicSpeaking',
    label: 'Public speaking',
    icon: 'briefcase',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Public speaking',
      itemNoun: 'talks',
      targetAmount: scaleToWindow(8, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 1,
      estMinutes: 60,
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'content',
    label: 'Video content',
    icon: 'video',
    buildGoal: ({ totalDays }) => ({
      type: 'ship',
      title: 'Video content',
      itemNoun: 'videos',
      targetAmount: scaleToWindow(16, totalDays),
      cadenceMode: 'n_per_week',
      timesPerWeek: 1,
      estMinutes: 120,
      quickAdd: [1, 2, 3],
    }),
  },
  {
    key: 'chess',
    label: 'Chess',
    icon: 'puzzle',
    buildGoal: ({ totalDays }) => ({
      type: 'accumulate',
      title: 'Chess',
      unit: 'puzzles',
      targetAmount: scaleToWindow(600, totalDays),
      cadenceMode: 'daily',
      estMinutes: 20,
      paceBasis: 'even',
      quickAdd: quickAddFor(5),
    }),
  },
  {
    key: 'gardening',
    label: 'Gardening',
    icon: 'sprout',
    buildGoal: () => ({
      type: 'habit',
      title: 'Gardening',
      cadenceMode: 'n_per_week',
      timesPerWeek: 3,
      estMinutes: 30,
    }),
  },
  {
    key: 'stretching',
    label: 'Mobility',
    icon: 'person-standing',
    buildGoal: () => ({
      type: 'habit',
      title: 'Mobility',
      cadenceMode: 'daily',
      sessionTarget: 15,
      unit: 'min',
      estMinutes: 15,
      quickAdd: quickAddFor(15),
    }),
  },
];
