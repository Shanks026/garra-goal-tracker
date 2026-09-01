// Query keys are arrays, hierarchical, and centralised here (03-state-and-data.md §3) so
// invalidation-by-prefix stays consistent across every hook.
export const qk = {
  activeArc: ['arc', 'active'] as const,
  draftArc: ['arc', 'draft'] as const,
  goals: (arcId: string) => ['goals', arcId] as const,
  localProfile: ['localProfile'] as const,
};
