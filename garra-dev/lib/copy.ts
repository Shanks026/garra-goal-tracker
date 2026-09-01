// Every user-facing slang string lives here (01-design-system.md §8), so the app can be
// re-voiced in one commit. DB tables and code identifiers stay neutral (arcs, goals,
// entries) — never rename those to match this file.
//
// Only the core lexicon lives here so far. Screen-specific strings (empty states,
// celebrations, error copy) get added by the phase that introduces the screen using them —
// don't pre-populate this with strings nothing renders yet.
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
} as const;
