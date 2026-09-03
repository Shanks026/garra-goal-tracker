import { useMemo } from 'react';
import { asc, eq } from 'drizzle-orm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { db } from '@/lib/db/client';
import { newId } from '@/lib/db/ids';
import { checkpoints as checkpointsTable, entries, goals, rescopes } from '@/lib/db/schema';
import { dayKey, daysBetweenKeysInclusive } from '@/lib/date';
import { qk } from '@/lib/queryKeys';
import { formatAmount, formatDayKeyShort } from '@/lib/format';
import { cadenceForGoal } from '@/lib/derive/cadence';
import { occurrencesInRange } from '@/lib/derive/schedule';
import { currentValue, type ProgressEntry } from '@/lib/derive/progress';
import { cumulativeSeries, weekBars, type WeekBarState } from '@/lib/derive/series';
import { mosaicCells, type MosaicCellState } from '@/lib/derive/mosaic';
import { shouldOfferRescope, suggestedTarget } from '@/lib/derive/rescope';
import { pace, type PaceStatus } from '@/lib/derive/pace';
import { enqueueUpsert } from '@/lib/sync/outbox';
import { useActiveArc } from './useArcBuilder';
import { useNow } from './useNow';

// One hook for the whole goal-detail screen, same reasoning as useHomeData: the hero, the
// burn-up, the mosaic, the week bars, the recent list, and the status pill are all views of one
// goal's one dataset. Every derivation is *called* from here, never inlined (04-hooks.md §6).

type GoalRow = typeof goals.$inferSelect;
type EntryRow = typeof entries.$inferSelect;
type CheckpointRow = typeof checkpointsTable.$inferSelect;

export type GoalDetail = {
  goal: GoalRow;
  arcTitle: string;
  todayKey: string;
  /** Header label, e.g. "CYCLING · 800 KM". */
  label: string;
  /** The big number, and the small word after it. */
  value: string;
  valueSuffix: string;
  status: PaceStatus;
  statusLabelKind: 'slipping' | 'cooked' | 'neutral';
  requiredRate: number;
  requiredRateLabel: string | null;
  /** Burn-up points in chart coordinates, plus the window it covers. */
  burnUp: { points: [number, number][]; win: number; day: number } | null;
  /** Habit/Ship hero fractions, straight from pace(). */
  p: number;
  t: number;
  mosaic: MosaicCellState[];
  week: { height: number; state: WeekBarState }[];
  recent: {
    dayKey: string;
    label: string;
    value: string;
    title: string | null;
    link: string | null;
  }[];
  checkpoints: { id: string; label: string; meta: string; status: 'done' | 'current' | 'future' }[];
  /** The rescope offer — a heuristic, see lib/derive/rescope.ts. */
  offerRescope: boolean;
  suggestion: number;
  target: number;
};

const BURNUP_WINDOW_DAYS = 40; // the visible window the chart's y-ceiling scales to
const BURNUP_W = 342;
const BURNUP_H = 112;
const RECENT_LIMIT = 8;

export function useGoalDetail(goalId: string): GoalDetail | null {
  const arcQuery = useActiveArc();
  const arc = arcQuery.data ?? null;
  const now = useNow(arc?.timezone ?? 'UTC');

  const goalQuery = useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const rows = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
      return rows[0] ?? null;
    },
  });

  const entriesQuery = useQuery({
    queryKey: qk.entries(goalId),
    queryFn: (): Promise<EntryRow[]> => db.select().from(entries).where(eq(entries.goalId, goalId)),
  });

  const checkpointsQuery = useQuery({
    queryKey: qk.checkpoints(goalId),
    queryFn: (): Promise<CheckpointRow[]> =>
      db
        .select()
        .from(checkpointsTable)
        .where(eq(checkpointsTable.goalId, goalId))
        .orderBy(asc(checkpointsTable.position)),
  });

  const goal = goalQuery.data ?? null;
  const entryRows = entriesQuery.data;
  const checkpointRows = checkpointsQuery.data;

  return useMemo(() => {
    if (!arc || !goal || !entryRows || !checkpointRows) return null;

    const todayKey = dayKey(now, arc.timezone);
    const startKey = goal.startsAt ?? arc.startsAt;
    const endKey = goal.endsAt ?? arc.endsAt;
    const cadence = cadenceForGoal(goal, { startsAt: arc.startsAt, timezone: arc.timezone });

    const progressEntries: ProgressEntry[] = entryRows.map((e) => ({
      dayKey: e.dayKey,
      value: e.value,
      skipped: e.skipped,
    }));

    const checkpointsHit = checkpointRows.filter((c) => c.hitAt != null).length;
    const current = currentValue({
      type: goal.type,
      entries: progressEntries,
      startingValue: goal.startingValue,
      checkpointsHit,
    });

    const target = goal.type === 'milestone' ? checkpointRows.length : (goal.targetAmount ?? 0);

    const result = pace({
      target: target > 0 ? target : 1, // never divide by zero; a target-less goal shows 0 progress
      current,
      startDate: startKey,
      endDate: endKey,
      now,
      basis: (goal.paceBasis as 'even' | 'weekdays_only' | 'custom_weekly') ?? 'even',
    });

    const totalDays = daysBetweenKeysInclusive(startKey, endKey);
    const elapsed = Math.max(0, Math.min(totalDays, daysBetweenKeysInclusive(startKey, todayKey)));

    // --- The hero's value line, by type ---
    const unit = goal.unit ?? '';
    const label =
      goal.type === 'accumulate'
        ? `${goal.title} · ${formatAmount(target)} ${unit}`.toUpperCase()
        : `${goal.title} · ${goal.type}`.toUpperCase();
    const value = formatAmount(current);
    const valueSuffix =
      goal.type === 'accumulate'
        ? unit
        : goal.type === 'ship'
          ? `of ${formatAmount(target)} ${goal.itemNoun ?? ''}`.trim()
          : goal.type === 'milestone'
            ? `of ${target}`
            : `of ${Math.round(dueSoFarFor(cadence, startKey, todayKey))} days`;

    // --- Burn-up: the last BURNUP_WINDOW_DAYS of cumulative progress ---
    const windowStart =
      elapsed > BURNUP_WINDOW_DAYS ? shiftKey(startKey, elapsed - BURNUP_WINDOW_DAYS) : startKey;
    const series = cumulativeSeries({
      entries: progressEntries,
      startKey: windowStart,
      endKey: todayKey,
      startingValue: goal.startingValue,
      mode: goal.type === 'accumulate' ? 'sum' : 'count',
    });
    const burnUp =
      goal.type === 'accumulate' && series.length > 1
        ? {
            points: toChartPoints(series, target, totalDays),
            win: BURNUP_WINDOW_DAYS,
            day: elapsed,
          }
        : null;

    // --- History sections ---
    const mosaic = mosaicCells({
      cadence,
      entries: entryRows.map((e) => ({
        dayKey: e.dayKey,
        value: e.value,
        target: goal.sessionTarget ?? undefined,
      })),
      startDate: startKey,
      totalDays,
      now,
      timezone: arc.timezone,
    });

    const week = weekBars({
      cadence,
      entries: progressEntries,
      dayKey: todayKey,
      sessionTarget: goal.sessionTarget,
    });

    const recent = [...entryRows]
      .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1))
      .slice(0, RECENT_LIMIT)
      .map((e) => ({
        dayKey: e.dayKey,
        label: relativeDayLabel(e.dayKey, todayKey),
        value: e.skipped
          ? 'Skipped'
          : e.value != null
            ? `${formatAmount(e.value)}${unit ? ` ${unit}` : ''}`
            : 'Done',
        title: e.title,
        link: e.link,
      }));

    // --- Checkpoints: the first unhit one is 'current', the rest are 'future' ---
    const firstUnhit = checkpointRows.findIndex((c) => c.hitAt == null);
    const spine = checkpointRows.map((c, i) => ({
      id: c.id,
      label: c.title,
      meta: c.hitAt
        ? formatDayKeyShort(c.hitAt.slice(0, 10))
        : i === firstUnhit
          ? 'in progress'
          : 'planned',
      status: (c.hitAt ? 'done' : i === firstUnhit ? 'current' : 'future') as
        'done' | 'current' | 'future',
    }));

    // --- The rescope offer ---
    const bestDailyRate = bestDailyRateOf(progressEntries, goal.type);
    const offerRescope = shouldOfferRescope({
      status: result.status,
      requiredRate: result.requiredRate,
      bestDailyRate,
    });

    return {
      goal,
      arcTitle: arc.title,
      todayKey,
      label,
      value,
      valueSuffix,
      status: result.status,
      statusLabelKind:
        result.status === 'slipping'
          ? 'slipping'
          : result.status === 'cooked'
            ? 'cooked'
            : 'neutral',
      requiredRate: result.requiredRate,
      requiredRateLabel:
        result.requiredRate > 0
          ? `${formatAmount(result.requiredRate)}${unit ? ` ${unit}` : ''}/day`
          : null,
      burnUp,
      p: result.fractionDone,
      t: result.fractionExpected,
      mosaic,
      week,
      recent,
      checkpoints: spine,
      offerRescope,
      suggestion: suggestedTarget({
        current,
        daysElapsed: elapsed,
        daysTotal: totalDays,
        originalTarget: target,
      }),
      target,
    };
  }, [arc, goal, entryRows, checkpointRows, now]);
}

/** How many days were due between two keys — the Habit hero's denominator. */
function dueSoFarFor(
  cadence: ReturnType<typeof cadenceForGoal>,
  startKey: string,
  todayKey: string,
): number {
  if (!cadence) return daysBetweenKeysInclusive(startKey, todayKey);
  return occurrencesInRange(cadence, startKey, todayKey);
}

/** The goal's best single day so far — the denominator of the rescope heuristic. */
function bestDailyRateOf(entries: ProgressEntry[], type: GoalRow['type']): number {
  const logged = entries.filter((e) => !e.skipped);
  if (logged.length === 0) return 0;
  if (type === 'accumulate') {
    return Math.max(...logged.map((e) => e.value ?? 0));
  }
  // A count-based goal's best day is one unit; its rate is per-day by construction.
  return 1;
}

/** Cumulative values → BurnUp's chart coordinates. The y-ceiling scales to the visible window. */
function toChartPoints(series: number[], target: number, totalDays: number): [number, number][] {
  const ceiling = Math.max(1, (target * BURNUP_WINDOW_DAYS) / Math.max(1, totalDays));
  return series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * BURNUP_W;
    const y = BURNUP_H - Math.min(1, v / ceiling) * (BURNUP_H - 8) - 4;
    return [x, y] as [number, number];
  });
}

function shiftKey(key: string, days: number): string {
  const ms = Date.parse(`${key}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function relativeDayLabel(key: string, todayKey: string): string {
  const delta = daysBetweenKeysInclusive(key, todayKey) - 1;
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  return formatDayKeyShort(key);
}

// --- Mutations ---

function nowIso(): string {
  return new Date().toISOString();
}

/** Pause, resume, or archive. Pausing keeps the goal in The Arc but drops it from Today. */
export function useSetGoalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      goalId: string;
      arcId: string;
      status: 'active' | 'paused' | 'archived';
    }) => {
      await db
        .update(goals)
        .set({ status: input.status, updatedAt: nowIso() })
        .where(eq(goals.id, input.goalId));
    },
    onSettled: (_r, err, input) => {
      qc.invalidateQueries({ queryKey: ['goal', input.goalId] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });
      qc.invalidateQueries({ queryKey: ['today'] });

      if (!err) enqueueUpsert('goals', input.goalId);
    },
  });
}

/** One tap on a spine node (rules/02 §4 — no confirm, no sheet). */
export function useHitCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { checkpointId: string; goalId: string; hit: boolean }) => {
      await db
        .update(checkpointsTable)
        .set({ hitAt: input.hit ? nowIso() : null, updatedAt: nowIso() })
        .where(eq(checkpointsTable.id, input.checkpointId));
    },
    onMutate: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    onSettled: (_r, err, input) => {
      qc.invalidateQueries({ queryKey: qk.checkpoints(input.goalId) });
      qc.invalidateQueries({ queryKey: ['goal', input.goalId] });
      qc.invalidateQueries({ queryKey: ['today'] });

      if (!err) enqueueUpsert('checkpoints', input.checkpointId);
    },
  });
}

/** One goal row, for the form's edit mode. Returns undefined while loading, null if it's gone. */
export function useGoalRow(goalId: string | undefined) {
  const query = useQuery({
    queryKey: ['goal', goalId ?? ''],
    queryFn: async () => {
      const rows = await db.select().from(goals).where(eq(goals.id, goalId!)).limit(1);
      return rows[0] ?? null;
    },
    enabled: !!goalId,
  });
  return query.data ?? undefined;
}

export type UpdateGoalInput = {
  goalId: string;
  arcId: string;
  /**
   * Only pass this for a goal whose arc is still a **draft**.
   *
   * On an active arc a target change must go through `useRescopeGoal`, which writes the
   * `rescopes` audit row in the same transaction — a target that moved with no audit row makes
   * the history a lie, and the history is the feature (05-database.md §1). But a proposal being
   * tuned during onboarding has no history to protect: the arc hasn't started, so recording a
   * "rescope" for it would invent an event that never happened.
   */
  targetAmount?: number | null;
  title?: string;
  icon?: string;
  accent?: string;
  unit?: string | null;
  itemNoun?: string | null;
  cadenceMode?: string | null;
  timesPerWeek?: number | null;
  daysOfWeek?: number[] | null;
  intervalDays?: number | null;
  sessionTarget?: number | null;
  estMinutes?: number | null;
  quickAdd?: number[] | null;
};

/**
 * Edits an existing goal. Deliberately **not** a rescope: changing a target through this path
 * would skip the `rescopes` audit row, so the form routes a target change through
 * `useRescopeGoal()` instead and this handles everything else.
 */
export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, arcId: _arcId, ...fields }: UpdateGoalInput) => {
      await db
        .update(goals)
        .set({ ...fields, updatedAt: nowIso() })
        .where(eq(goals.id, goalId));
    },
    onSettled: (_r, err, input) => {
      qc.invalidateQueries({ queryKey: ['goal', input.goalId] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });
      qc.invalidateQueries({ queryKey: ['today'] });

      if (!err) enqueueUpsert('goals', input.goalId);
    },
  });
}

/**
 * Changes the target **and** appends the audit row, in one transaction. A target that changed
 * without a `rescopes` row would make the history a lie, and the history is the feature
 * (05-database.md §1: `rescopes` is append-only).
 */
export function useRescopeGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      goalId: string;
      arcId: string;
      fromTarget: number;
      toTarget: number;
      reason?: string;
    }): Promise<string> => {
      const rescopeId = newId();
      await db.transaction(async (tx) => {
        await tx
          .update(goals)
          .set({ targetAmount: input.toTarget, updatedAt: nowIso() })
          .where(eq(goals.id, input.goalId));
        await tx.insert(rescopes).values({
          id: rescopeId,
          goalId: input.goalId,
          fromTarget: input.fromTarget,
          toTarget: input.toTarget,
          reason: input.reason ?? null,
        });
      });
      // Returned so the outbox can enqueue the audit row too. Generated outside the transaction
      // rather than inside so it's still in scope after the commit.
      return rescopeId;
    },
    onSettled: (rescopeId, err, input) => {
      qc.invalidateQueries({ queryKey: ['goal', input.goalId] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });
      qc.invalidateQueries({ queryKey: ['today'] });

      // Both rows, or the remote history would show a changed target with no rescope explaining
      // it — exactly the lie this mutation's transaction exists to prevent, reintroduced at the
      // sync layer.
      if (!err && rescopeId) {
        enqueueUpsert('goals', input.goalId);
        enqueueUpsert('rescopes', rescopeId);
      }
    },
  });
}
