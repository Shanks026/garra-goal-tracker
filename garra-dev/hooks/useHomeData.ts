import { useMemo } from 'react';
import { eq, inArray } from 'drizzle-orm';
import { useQuery } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { checkpoints as checkpointsTable, entries, goals } from '@/lib/db/schema';
import { TZDate } from '@date-fns/tz';

import { addDaysToKey, dayKey, daysBetweenKeysInclusive } from '@/lib/date';
import { qk } from '@/lib/queryKeys';
import { formatAmount, formatGoalValue } from '@/lib/format';
import { cadenceForGoal } from '@/lib/derive/cadence';
import { isDueOn, occurrencesInRange, type CadenceConfig } from '@/lib/derive/schedule';
import { currentValue, isLoggedOn, isSkippedOn, valueOn } from '@/lib/derive/progress';
import { pace, type PaceStatus } from '@/lib/derive/pace';
import { useActiveArc } from './useArcBuilder';
import { useNow } from './useNow';

// Home's two halves (garra-index.md §7.3): Today (execution) and The Arc (trajectory). Both
// read SQLite through TanStack Query, then hand plain data to lib/derive/ — the math is never
// inlined here (04-hooks.md §2/§6), and every hook returns null while loading so no chart can
// ever receive NaN.

type GoalRow = typeof goals.$inferSelect;
type EntryRow = typeof entries.$inferSelect;
type CheckpointRow = typeof checkpointsTable.$inferSelect;

/** Every goal in the arc that's still live. */
function useArcGoals(arcId: string | undefined) {
  return useQuery({
    queryKey: qk.goals(arcId ?? ''),
    queryFn: () => db.select().from(goals).where(eq(goals.arcId, arcId!)),
    enabled: !!arcId,
  });
}

/** Every entry across the arc's goals — one query, so Today and The Arc don't each fetch. */
function useArcEntries(arcId: string | undefined, goalIds: string[]) {
  return useQuery({
    queryKey: qk.arcEntries(arcId ?? ''),
    queryFn: (): Promise<EntryRow[]> =>
      goalIds.length === 0
        ? Promise.resolve([])
        : db.select().from(entries).where(inArray(entries.goalId, goalIds)),
    enabled: !!arcId && goalIds.length > 0,
  });
}

function useArcCheckpoints(goalIds: string[]) {
  return useQuery({
    queryKey: ['checkpoints', 'arc', ...goalIds],
    queryFn: (): Promise<CheckpointRow[]> =>
      goalIds.length === 0
        ? Promise.resolve([])
        : db.select().from(checkpointsTable).where(inArray(checkpointsTable.goalId, goalIds)),
    enabled: goalIds.length > 0,
  });
}

/**
 * Whether a goal belongs on today's list.
 *
 * `isDueOn()` throws for `n_per_week` by design — the user picks freely which days, so there is
 * no per-day answer. Resolution (06-home-and-logging.md §5.1.4): an `n_per_week` goal shows
 * every day **until its week's target is met**, then drops off for the rest of that week. A goal
 * with no cadence at all (Accumulate/Ship) is always available to log, so it always shows.
 */
export function isOnTodayList(input: {
  cadence: CadenceConfig | null;
  todayKey: string;
  entries: EntryRow[];
}): boolean {
  const { cadence, todayKey, entries: goalEntries } = input;
  if (!cadence) return true;

  if (cadence.mode === 'n_per_week') {
    const target = cadence.timesPerWeek ?? 0;
    const { weekStart, weekEnd } = weekWindowFor(todayKey, cadence);
    const hits = goalEntries.filter(
      (e) => !e.skipped && e.dayKey >= weekStart && e.dayKey <= weekEnd,
    ).length;
    return hits < target;
  }

  return isDueOn(cadence, todayKey);
}

/** The arc-aligned week a day falls in, using the shared weekAnchorDate from cadenceForGoal(). */
function weekWindowFor(dayKeyValue: string, cadence: CadenceConfig) {
  const anchor = cadence.weekAnchorDate ?? cadence.anchorDate;
  const offset = daysBetweenKeysInclusive(anchor, dayKeyValue) - 1;
  const weekIndex = Math.floor(offset / 7);
  const MS = 86_400_000;
  const anchorMs = Date.parse(`${anchor}T00:00:00.000Z`);
  const startMs = anchorMs + weekIndex * 7 * MS;
  return {
    weekStart: new Date(startMs).toISOString().slice(0, 10),
    weekEnd: new Date(startMs + 6 * MS).toISOString().slice(0, 10),
  };
}

export type TodayItem = {
  goalId: string;
  title: string;
  accent: string;
  icon: string;
  type: GoalRow['type'];
  isMain: boolean;
  isDone: boolean;
  isSkipped: boolean;
  /** True when tapping the row opens the log sheet instead of toggling a checkbox. */
  needsValue: boolean;
  /** Right-aligned detail: what was logged, or what's expected. */
  detail: string;
  unit: string | null;
  quickAdd: number[] | null;
  sessionTarget: number | null;
  itemNoun: string | null;
};

export type ArcRowData = {
  goalId: string;
  title: string;
  accent: string;
  p: number;
  t: number;
  status: PaceStatus;
  /**
   * Nothing logged yet. A brand-new arc reported "On track" on day 0, which is technically
   * true and reads as a lie — the pace ladder has no rung for "has not begun", so this is
   * carried alongside it rather than by bending pace() (its four rungs are spec, rules/01 §8).
   */
  notStarted: boolean;
  valueLabel: string;
  /** Spoken form for the ring's accessibilityLabel (rules/02 §8). */
  accessibilityLabel: string;
};

export type ArcProgress = {
  day: number;
  totalDays: number;
  daysLeft: number;
  p: number;
  title: string;
  /** Day keys. Rendered under the title so the window is visible without opening the Arc tab. */
  startsAt: string;
  endsAt: string;
};

/**
 * Everything Home renders, from one pass over the same rows. Deliberately a single hook rather
 * than three that each re-query: Today and The Arc are two views of one dataset, and splitting
 * them would mean three SQLite reads and three chances to disagree.
 */
export function useHomeData() {
  const arcQuery = useActiveArc();
  const arc = arcQuery.data ?? null;
  const now = useNow(arc?.timezone ?? 'UTC');

  const goalsQuery = useArcGoals(arc?.id);
  const goalRows = useMemo(
    () => (goalsQuery.data ?? []).filter((g) => g.status === 'active'),
    [goalsQuery.data],
  );
  const goalIds = useMemo(() => goalRows.map((g) => g.id), [goalRows]);
  const entriesQuery = useArcEntries(arc?.id, goalIds);
  const checkpointsQuery = useArcCheckpoints(goalIds);

  const loading =
    !arc ||
    goalsQuery.data === undefined ||
    (goalIds.length > 0 && entriesQuery.data === undefined);

  return useMemo(() => {
    if (loading || !arc) {
      return {
        arc: null,
        progress: null,
        mains: null,
        sides: null,
        arcRows: null,
        todayKey: null,
        yesterdayKey: null,
        yesterdayUnlogged: null,
        showBackfillPrompt: false,
      };
    }

    const todayKey = dayKey(now, arc.timezone);
    const yesterdayKey = addDaysToKey(todayKey, -1);
    const allEntries = entriesQuery.data ?? [];
    const allCheckpoints = checkpointsQuery.data ?? [];
    const entriesByGoal = new Map<string, EntryRow[]>();
    for (const entry of allEntries) {
      const list = entriesByGoal.get(entry.goalId);
      if (list) list.push(entry);
      else entriesByGoal.set(entry.goalId, [entry]);
    }

    const totalDays = daysBetweenKeysInclusive(arc.startsAt, arc.endsAt);
    // Clamped: before the arc starts this is day 0, and after it ends it stops at the total
    // rather than counting past the finish line.
    const elapsed = daysBetweenKeysInclusive(arc.startsAt, todayKey);
    const day = Math.max(0, Math.min(totalDays, elapsed));
    const progress: ArcProgress = {
      day,
      totalDays,
      daysLeft: Math.max(0, totalDays - day),
      p: totalDays > 0 ? day / totalDays : 0,
      title: arc.title,
      startsAt: arc.startsAt,
      endsAt: arc.endsAt,
    };

    const todayItems: TodayItem[] = [];
    const yesterdayUnlogged: TodayItem[] = [];
    const arcRows: ArcRowData[] = [];

    for (const goal of goalRows) {
      const goalEntries = entriesByGoal.get(goal.id) ?? [];
      const cadence = cadenceForGoal(goal, { startsAt: arc.startsAt, timezone: arc.timezone });
      const progressEntries = goalEntries.map((e) => ({
        dayKey: e.dayKey,
        value: e.value,
        skipped: e.skipped,
      }));

      const goalCheckpoints = allCheckpoints.filter((c) => c.goalId === goal.id);
      const checkpointsHit = goalCheckpoints.filter((c) => c.hitAt != null).length;
      const current = currentValue({
        type: goal.type,
        entries: progressEntries,
        startingValue: goal.startingValue,
        checkpointsHit,
      });

      // --- Today ---
      if (isOnTodayList({ cadence, todayKey, entries: goalEntries })) {
        const isDone = isLoggedOn(progressEntries, todayKey);
        const loggedValue = valueOn(progressEntries, todayKey);
        const needsValue = goal.type === 'accumulate' || goal.sessionTarget != null;
        todayItems.push({
          goalId: goal.id,
          title: goal.title,
          accent: goal.accent,
          icon: goal.icon,
          type: goal.type,
          isMain: goal.isMain,
          isDone,
          isSkipped: isSkippedOn(progressEntries, todayKey),
          needsValue,
          detail: todayDetail({ goal, isDone, loggedValue }),
          unit: goal.unit,
          quickAdd: goal.quickAdd,
          sessionTarget: goal.sessionTarget,
          itemNoun: goal.itemNoun,
        });
      }

      // --- Yesterday, for the pre-10:00 backfill row ---
      const yesterdayInArc = yesterdayKey >= arc.startsAt;
      if (
        yesterdayInArc &&
        !isLoggedOn(progressEntries, yesterdayKey) &&
        !isSkippedOn(progressEntries, yesterdayKey) &&
        isOnTodayList({ cadence, todayKey: yesterdayKey, entries: goalEntries })
      ) {
        yesterdayUnlogged.push({
          goalId: goal.id,
          title: goal.title,
          accent: goal.accent,
          icon: goal.icon,
          type: goal.type,
          isMain: goal.isMain,
          isDone: false,
          isSkipped: false,
          needsValue: goal.type === 'accumulate' || goal.sessionTarget != null,
          detail: todayDetail({ goal, isDone: false, loggedValue: null }),
          unit: goal.unit,
          quickAdd: goal.quickAdd,
          sessionTarget: goal.sessionTarget,
          itemNoun: goal.itemNoun,
        });
      }

      // --- The Arc ---
      // A habit's denominator is how many days the schedule asks for across the whole arc.
      // `targetFor` returns 0 for a habit (it has no `targetAmount`), and the `target > 0`
      // guard below then dropped every habit goal out of The Arc section — while it still
      // appeared in Today, so the two halves of one screen disagreed about which goals exist.
      const target =
        goal.type === 'habit'
          ? Math.max(
              1,
              cadence
                ? Math.round(
                    occurrencesInRange(
                      cadence,
                      goal.startsAt ?? arc.startsAt,
                      goal.endsAt ?? arc.endsAt,
                    ),
                  )
                : daysBetweenKeysInclusive(goal.startsAt ?? arc.startsAt, goal.endsAt ?? arc.endsAt),
            )
          : targetFor(goal, goalCheckpoints.length);
      if (target > 0) {
        const result = pace({
          target,
          current,
          startDate: goal.startsAt ?? arc.startsAt,
          endDate: goal.endsAt ?? arc.endsAt,
          now,
          basis: (goal.paceBasis as 'even' | 'weekdays_only' | 'custom_weekly') ?? 'even',
        });

        // How many days the schedule has asked for *so far*. Before the arc starts that's zero,
        // which rendered "0 / 0 days" — a denominator of nothing, reading as broken rather than
        // as "not begun". Falling back to the arc's full target gives the row a real denominator
        // on day 0 ("0 / 30 days"), and it narrows to the elapsed count once the arc is running.
        const elapsedDue =
          goal.type === 'habit' && cadence
            ? Math.round(occurrencesInRange(cadence, goal.startsAt ?? arc.startsAt, todayKey))
            : 0;
        const dueSoFar = goal.type === 'habit' ? elapsedDue || target : undefined;

        const valueLabel = formatGoalValue({
          type: goal.type,
          current,
          expected: result.expected,
          target,
          unit: goal.unit,
          itemNoun: goal.itemNoun,
          dueSoFar,
        });

        arcRows.push({
          goalId: goal.id,
          title: goal.title,
          accent: goal.accent,
          p: result.fractionDone,
          t: result.fractionExpected,
          status: result.status,
          notStarted: current <= 0,
          valueLabel,
          // A habit's denominator counts **days**, not its session unit. Using `goal.unit` here
          // made Reading announce "0 of 30 pages" when 30 was the number of days the schedule
          // asks for — a number in the wrong dimension, spoken as fact to someone who can't see
          // the screen to catch it.
          accessibilityLabel: `${goal.title}, ${formatAmount(current)} of ${formatAmount(target)}${
            goal.type === 'habit' ? ' days' : goal.unit ? ` ${goal.unit}` : ''
          }, ${valueLabel}`,
        });
      }
    }

    return {
      arc,
      progress,
      todayKey,
      yesterdayKey,
      yesterdayUnlogged,
      // Only before 10:00 (rules/02 §4) — a backfill nudge at 21:00 is noise, not help. Read in
      // the arc's timezone, not the device's, for the same reason dayKey() is.
      showBackfillPrompt:
        yesterdayUnlogged.length > 0 && hourInTimezone(now, arc.timezone) < BACKFILL_PROMPT_HOUR,
      // Mains sit above the divider; position carries the meaning (rules/01 §7).
      mains: todayItems.filter((i) => i.isMain),
      sides: todayItems.filter((i) => !i.isMain),
      arcRows,
    };
  }, [loading, arc, goalRows, entriesQuery.data, checkpointsQuery.data, now]);
}

/** The Yesterday row is a morning affordance only (rules/02 §4). */
const BACKFILL_PROMPT_HOUR = 10;

/** Wall-clock hour in the given timezone — a plain Date's getHours() would read the device's. */
function hourInTimezone(now: Date, timezone: string): number {
  return new TZDate(now, timezone).getHours();
}

/** A goal's denominator, by type. Milestone counts its checkpoints. */
function targetFor(goal: GoalRow, checkpointCount: number): number {
  if (goal.type === 'milestone') return checkpointCount;
  return goal.targetAmount ?? 0;
}

/** The Today row's right-hand detail: what was logged if done, else what's expected. */
function todayDetail(input: {
  goal: GoalRow;
  isDone: boolean;
  loggedValue: number | null;
}): string {
  const { goal, isDone, loggedValue } = input;
  const unit = goal.unit ? ` ${goal.unit}` : '';

  if (isDone) {
    if (loggedValue != null) return `${formatAmount(loggedValue)}${unit} logged`;
    return goal.type === 'ship' ? 'Shipped' : 'Done';
  }
  if (goal.sessionTarget != null) return `${formatAmount(goal.sessionTarget)}${unit}`;
  if (goal.type === 'accumulate') return unit.trim() || 'Log a value';
  return '';
}
