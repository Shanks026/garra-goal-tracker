import { ACCENT_ORDER, ACCENTS } from '@/theme/tokens';

// One shared assignment rule, so a preview and the row it eventually writes can never disagree.
// Recommended goals used to color its dots by array index while the mutation assigned the next
// *unused* accent over accepted goals only — deselecting a middle proposal made the dots lie.

/** Every accent hex, in the fixed ACCENT_ORDER (rules/01 §1 — never reordered). */
export const ACCENT_HEXES: string[] = ACCENT_ORDER.map((key) => ACCENTS[key]);

/**
 * The next accent not already taken, per "a new goal takes the next unused accent in
 * ACCENT_ORDER. No two goals in the same arc share an accent." Wraps only once the palette is
 * exhausted (9+ goals in one arc), where duplication is unavoidable.
 */
export function nextUnusedAccent(used: string[]): string {
  const taken = new Set(used);
  return (
    ACCENT_HEXES.find((hex) => !taken.has(hex)) ??
    ACCENT_HEXES[used.length % ACCENT_HEXES.length] ??
    ACCENTS.coral
  );
}

/**
 * The accents a list of goals-to-be would receive, assigned in order — the preview counterpart
 * to calling `nextUnusedAccent` once per insert.
 */
export function assignAccents(count: number, alreadyUsed: string[] = []): string[] {
  const used = [...alreadyUsed];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const next = nextUnusedAccent(used);
    out.push(next);
    used.push(next);
  }
  return out;
}
