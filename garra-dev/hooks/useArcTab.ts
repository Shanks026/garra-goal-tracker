import { useMemo } from 'react';
import { eq, inArray } from 'drizzle-orm';
import { useQuery } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { entries, goals } from '@/lib/db/schema';
import { addDaysToKey, dayKey, daysBetweenKeysInclusive } from '@/lib/date';
import { qk } from '@/lib/queryKeys';
import { formatAmount, formatGoalValue, formatMinutes } from '@/lib/format';
import { cadenceForGoal } from '@/lib/derive/cadence';
import { occurrencesInRange } from '@/lib/derive/schedule';
import { currentValue, type ProgressEntry } from '@/lib/derive/progress';
import { arcMosaicCells } from '@/lib/derive/arcMosaic';
import { momentumPoints, momentumSeries } from '@/lib/derive/momentum';
import { actualLoad, loadCheck } from '@/lib/derive/load';
import { arcStreak } from '@/lib/derive/streaks';
import { pace } from '@/lib/derive/pace';
import type { MosaicCellState } from '@/lib/derive/mosaic';
import type { ArcRowData } from './useHomeData';
import { useActiveArc } from './useArcBuilder';
import { useNow } from './useNow';

// Screen 15, read-only — the first phase that writes nothing at all. One hook, same reasoning as
// useHomeData and useGoalDetail: the mosaic, the momentum curve, the load donut, the pace summary
// and the streaks are all views of one arc's one dataset.

type GoalRow = typeof goals.$inferSelect;
type EntryRow = typeof entries.$inferSelect;

export type ArcTabData = {
  title: string;
  windowLabel: string;
  mosaic: MosaicCellState[];
  momentum: { headline: number; points: [number, number][] };
  load: {
    plannedTotalLabel: string;
    actualTotalLabel: string;
    segments: { color: string; hours: number }[];
    rows: {
      id: string;
      title: string;
      accent: string;
      actualLabel: string;
      plannedLabel: string;
    }[];
  };
  paceRows: ArcRowData[];
  streak: { current: number; longest: number };
};

export function useArcTab(): ArcTabData | null {
  const arcQuery = useActiveArc();
  const arc = arcQuery.data ?? null;
  const now = useNow(arc?.timezone ?? 'UTC');

  const goalsQuery = useQuery({
    queryKey: qk.goals(arc?.id ?? ''),
    queryFn: () => db.select().from(goals).where(eq(goals.arcId, arc!.id)),
    enabled: !!arc,
  });

  const goalRows = useMemo(
    () => (goalsQuery.data ?? []).filter((g) => g.status !== 'archived'),
    [goalsQuery.data],
  );
  const goalIds = useMemo(() => goalRows.map((g) => g.id), [goalRows]);

  const entriesQuery = useQuery({
    queryKey: qk.arcEntries(arc?.id ?? ''),
    queryFn: (): Promise<EntryRow[]> =>
      goalIds.length === 0
        ? Promise.resolve([])
        : db.select().from(entries).where(inArray(entries.goalId, goalIds)),
    enabled: !!arc && goalIds.length > 0,
  });

  // Memoised rather than a bare conditional: `goalIds.length === 0 ? [] : …` allocates a fresh
  // array every render, which would make the big useMemo below recompute the entire screen on
  // every tick of useNow — the exact thing the memo exists to prevent.
  const entryRows = useMemo(
    () => (goalIds.length === 0 ? [] : entriesQuery.data),
    [goalIds.length, entriesQuery.data],
  );

  return useMemo(() => {
    if (!arc || goalsQuery.data === undefined || entryRows === undefined) return null;

    const todayKey = dayKey(now, arc.timezone);
    const totalDays = daysBetweenKeysInclusive(arc.startsAt, arc.endsAt);
    const elapsed = Math.max(
      0,
      Math.min(totalDays, daysBetweenKeysInclusive(arc.startsAt, todayKey)),
    );

    const entriesByGoal = new Map<string, ProgressEntry[]>();
    for (const row of entryRows) {
      const mapped = { dayKey: row.dayKey, value: row.value, skipped: row.skipped };
      const list = entriesByGoal.get(row.goalId);
      if (list) list.push(mapped);
      else entriesByGoal.set(row.goalId, [mapped]);
    }

    const cadenceOf = (goal: GoalRow) =>
      cadenceForGoal(goal, { startsAt: arc.startsAt, timezone: arc.timezone });

    const mosaicGoals = goalRows.map((g) => ({ id: g.id, cadence: cadenceOf(g) }));

    // --- Mosaic: arc-level, so a day's cell is the share of what that day asked for ---
    const mosaic = arcMosaicCells({
      goals: mosaicGoals,
      entriesByGoal,
      startKey: arc.startsAt,
      totalDays,
      todayKey,
    });

    // --- Momentum: rolling 7-day completion ---
    const { series, headline } = momentumSeries({
      goals: mosaicGoals,
      entriesByGoal,
      startKey: arc.startsAt,
      todayKey,
    });

    // --- Load: planned vs actual over the trailing week ---
    const planned = loadCheck({
      goals: goalRows.map((g) => ({
        id: g.id,
        estMinutes: g.estMinutes ?? 0,
        cadence: cadenceOf(g),
      })),
    });
    const actual = actualLoad({
      goals: goalRows.map((g) => ({ id: g.id, estMinutes: g.estMinutes ?? 0 })),
      entriesByGoal,
      fromKey: addDaysToKey(todayKey, -6),
      toKey: todayKey,
    });

    // Segments show *planned* share — that's what the donut's geometry means. Actual lives in the
    // centre and the rows, which is the honest side-by-side (09-arc-tab.md's Context).
    const segments = goalRows
      .map((g) => ({
        color: g.accent,
        hours: (planned.perGoal.find((p) => p.id === g.id)?.weeklyMinutes ?? 0) / 60,
      }))
      .filter((s) => s.hours > 0);

    const rows = goalRows.map((g) => ({
      id: g.id,
      title: g.title,
      accent: g.accent,
      actualLabel: formatMinutes(actual.perGoal.find((p) => p.id === g.id)?.weeklyMinutes ?? 0),
      plannedLabel: formatMinutes(planned.perGoal.find((p) => p.id === g.id)?.weeklyMinutes ?? 0),
    }));

    // --- Pace summary: identical to Home's rows, from the same functions ---
    const paceRows: ArcRowData[] = [];
    for (const goal of goalRows) {
      const goalEntries = entriesByGoal.get(goal.id) ?? [];
      const target = goal.targetAmount ?? 0;
      if (target <= 0) continue; // Milestone goals have no numeric target here (Phase 6 shows them)

      const current = currentValue({
        type: goal.type,
        entries: goalEntries,
        startingValue: goal.startingValue,
      });
      const startKey = goal.startsAt ?? arc.startsAt;
      const result = pace({
        target,
        current,
        startDate: startKey,
        endDate: goal.endsAt ?? arc.endsAt,
        now,
        basis: (goal.paceBasis as 'even' | 'weekdays_only' | 'custom_weekly') ?? 'even',
      });

      const cadence = cadenceOf(goal);
      const dueSoFar =
        goal.type === 'habit' && cadence
          ? Math.round(occurrencesInRange(cadence, startKey, todayKey))
          : undefined;

      const valueLabel = formatGoalValue({
        type: goal.type,
        current,
        expected: result.expected,
        target,
        unit: goal.unit,
        itemNoun: goal.itemNoun,
        dueSoFar,
      });

      paceRows.push({
        goalId: goal.id,
        title: goal.title,
        accent: goal.accent,
        p: result.fractionDone,
        t: result.fractionExpected,
        status: result.status,
        valueLabel,
        accessibilityLabel: `${goal.title}, ${formatAmount(current)} of ${formatAmount(target)}${
          goal.unit ? ` ${goal.unit}` : ''
        }, ${valueLabel}`,
      });
    }

    // --- Streaks: arcStreak's first real caller since Phase 3 ---
    const allLoggedDays = [...new Set(entryRows.filter((e) => !e.skipped).map((e) => e.dayKey))];
    const streak = arcStreak({ entryDayKeys: allLoggedDays, now, timezone: arc.timezone });

    return {
      title: arc.title,
      windowLabel: `${shortDate(arc.startsAt)} → ${shortDate(arc.endsAt)} · day ${elapsed}`,
      mosaic,
      momentum: { headline, points: momentumPoints(series) },
      load: {
        plannedTotalLabel: formatMinutes(planned.weeklyMinutesTotal),
        actualTotalLabel: formatMinutes(actual.weeklyMinutesTotal),
        segments,
        rows,
      },
      paceRows,
      streak,
    };
  }, [arc, goalsQuery.data, entryRows, goalRows, now]);
}

function shortDate(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${date.getUTCDate()}`;
}
