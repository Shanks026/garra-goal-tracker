// The intent -> goal template catalog. Picking an intent chip (onboarding screen 03) proposes
// a real, sized goal on screen 04 — this is what makes onboarding feel intelligent, per
// IMPLEMENTATION.md Phase 4's explicit callout that this is real work, not a stub.
//
// Sleep / Less scrolling / Weight are deliberately absent: those three imply the (post-v1) Limit
// type — see IMPLEMENTATION.md's Design Delta #2. A chip that produces a goal the app can't
// model is worse than a shorter list.

export type IntentKey =
  'cycling' | 'guitar' | 'writing' | 'language' | 'strength' | 'reading' | 'sideProject';

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

function scaleToWindow(base: number, totalDays: number): number {
  return Math.max(1, Math.round((base * totalDays) / REFERENCE_DAYS));
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
];
