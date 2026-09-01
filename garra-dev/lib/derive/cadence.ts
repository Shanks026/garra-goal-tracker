import { dayKey } from '@/lib/date';
import type { CadenceConfig, CadenceMode } from './schedule';

// The single producer of a CadenceConfig from a stored goal row. Before this existed, the only
// mapping lived inline in useDraftLoadCheck as `anchorDate: g.createdAt.slice(0, 10)` — and
// Home needs the identical mapping for pace, streaks, and mosaic cells, so three copies of that
// bug were about to exist. See 06-home-and-logging.md §5.0.3.

export type GoalCadenceFields = {
  cadenceMode: string | null;
  timesPerWeek: number | null;
  daysOfWeek: number[] | null;
  intervalDays: number | null;
  startsAt: string | null;
  createdAt: string;
};

export type ArcCadenceFields = {
  startsAt: string;
  timezone: string;
};

const VALID_MODES: CadenceMode[] = ['daily', 'n_per_week', 'specific_days', 'every_n_days'];

/**
 * `null` when the goal has no cadence at all (Accumulate/Ship goals logged opportunistically) —
 * `loadCheck()` already treats that as contributing zero, and the Today list treats it as
 * always-available.
 *
 * Two distinct anchors, because the old single `anchorDate` was doing two incompatible jobs:
 *
 * - `anchorDate` is the goal's **own** start, so `every_n_days` counts from the day the
 *   commitment began. A goal added on day 40 of an arc with a 3-day interval is due on day
 *   40/43/46 — not on a grid inherited from an arc it wasn't part of.
 * - `weekAnchorDate` is the **arc's** start, so every `n_per_week` goal in an arc shares week
 *   boundaries with every other one, and with the arc-level mosaic grid Phase 7 draws. Anchoring
 *   weeks to each goal's own creation weekday made no two goals agree on when a week ended.
 *
 * The goal's own anchor resolves as `startsAt` when set, else its `createdAt` converted through
 * `dayKey()` — `createdAt` is a UTC row-insert timestamp, so slicing 10 characters off it (what
 * this replaced) lands on the wrong calendar day for anyone logging late in a negative-offset
 * timezone. Clamped to the arc's start, since a goal cannot begin before its arc.
 */
export function cadenceForGoal(
  goal: GoalCadenceFields,
  arc: ArcCadenceFields,
): CadenceConfig | null {
  if (!goal.cadenceMode) return null;
  if (!VALID_MODES.includes(goal.cadenceMode as CadenceMode)) return null;

  const ownAnchor =
    goal.startsAt ?? dayKey(new Date(`${goal.createdAt.replace(' ', 'T')}Z`), arc.timezone);
  const anchorDate = ownAnchor < arc.startsAt ? arc.startsAt : ownAnchor;

  return {
    mode: goal.cadenceMode as CadenceMode,
    timesPerWeek: goal.timesPerWeek ?? undefined,
    daysOfWeek: goal.daysOfWeek ?? undefined,
    intervalDays: goal.intervalDays ?? undefined,
    anchorDate,
    weekAnchorDate: arc.startsAt,
  };
}
