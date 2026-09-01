export type Flag =
  | 'goals.max'
  | 'arcs.history'
  | 'charts.deep'
  | 'finale.poster'
  | 'freezes.max'
  | 'reminders.perGoal'
  | 'widgets.all';

// Every flag resolves to its Pro value until Phase 11 wires RevenueCat (held by explicit
// user decision — see IMPLEMENTATION.md's Design Deltas §3, which is still an open gating
// decision, not a coded limit). These are permissive placeholders, not the real free-tier
// numbers — no component should read PRO_VALUES directly; go through useFlag().
const PRO_VALUES: Record<Flag, unknown> = {
  'goals.max': Infinity,
  'arcs.history': true,
  'charts.deep': true,
  'finale.poster': true,
  'freezes.max': Infinity,
  'reminders.perGoal': true,
  'widgets.all': true,
};

export function useFlag<T>(flag: Flag): T {
  return PRO_VALUES[flag] as T;
}
