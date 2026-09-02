// Query keys are arrays, hierarchical, and centralised here (03-state-and-data.md §3) so
// invalidation-by-prefix stays consistent across every hook. A log invalidates the `['today']`
// prefix and the arc's goals — never an enumerated list of exact keys.
export const qk = {
  activeArc: ['arc', 'active'] as const,
  draftArc: ['arc', 'draft'] as const,
  goals: (arcId: string) => ['goals', arcId] as const,
  entries: (goalId: string) => ['entries', goalId] as const,
  /** Every entry in the arc, for the day-keyed Today list and the Arc rows. */
  arcEntries: (arcId: string) => ['entries', 'arc', arcId] as const,
  today: (arcId: string, dayKey: string) => ['today', arcId, dayKey] as const,
  checkpoints: (goalId: string) => ['checkpoints', goalId] as const,
  localProfile: ['localProfile'] as const,
  /** Sync's own state — the one Settings row (rules/03 §2 lists sync status as query state). */
  syncStatus: ['syncStatus'] as const,
};
