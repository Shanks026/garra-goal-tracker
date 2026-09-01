import { useMemo } from 'react';
import { eq } from 'drizzle-orm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { newId } from '@/lib/db/ids';
import { arcs, checkpoints, goals, localProfile } from '@/lib/db/schema';
import { deviceTimezone } from '@/lib/date';
import { seasonalArcTitle } from '@/lib/arcNaming';
import { qk } from '@/lib/queryKeys';
import { loadCheck } from '@/lib/derive/load';
import type { CadenceConfig } from '@/lib/derive/schedule';
import { ACCENT_ORDER, ACCENTS } from '@/theme/tokens';

// All facets of the same in-progress-draft concern — one file because they're tightly coupled,
// not a god hook: each export below is still single-purpose (04-hooks.md §1/§5).

export type DraftOrActiveArc = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'archived';
};

async function selectArcByStatus(status: 'draft' | 'active'): Promise<DraftOrActiveArc | null> {
  const rows = await db.select().from(arcs).where(eq(arcs.status, status)).limit(1);
  return rows[0] ?? null;
}

export function useDraftArc() {
  return useQuery({
    queryKey: qk.draftArc,
    queryFn: () => selectArcByStatus('draft'),
  });
}

export function useActiveArc() {
  return useQuery({
    queryKey: qk.activeArc,
    queryFn: () => selectArcByStatus('active'),
  });
}

export function useLocalProfileName() {
  return useQuery({
    queryKey: qk.localProfile,
    queryFn: async () => {
      const rows = await db.select().from(localProfile).where(eq(localProfile.id, 'local'));
      return rows[0]?.name ?? null;
    },
  });
}

export function useSetLocalProfileName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const existing = await db.select().from(localProfile).where(eq(localProfile.id, 'local'));
      if (existing[0]) {
        await db.update(localProfile).set({ name }).where(eq(localProfile.id, 'local'));
      } else {
        await db.insert(localProfile).values({ id: 'local', name });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.localProfile }),
  });
}

export function useSetArcWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startsAt: string; endsAt: string }) => {
      const draft = await selectArcByStatus('draft');
      if (draft) {
        await db
          .update(arcs)
          .set({ startsAt: input.startsAt, endsAt: input.endsAt })
          .where(eq(arcs.id, draft.id));
        return draft.id;
      }
      const id = newId();
      await db.insert(arcs).values({
        id,
        title: seasonalArcTitle(new Date()),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'draft',
        timezone: deviceTimezone(),
      });
      return id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.draftArc }),
  });
}

export type AddGoalInput = {
  arcId: string;
  type: 'habit' | 'accumulate' | 'ship' | 'milestone';
  title: string;
  icon: string;
  targetAmount?: number;
  unit?: string;
  itemNoun?: string;
  startingValue?: number;
  cadenceMode?: 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';
  timesPerWeek?: number;
  daysOfWeek?: number[];
  intervalDays?: number;
  sessionTarget?: number;
  estMinutes?: number;
  paceBasis?: 'even' | 'weekdays_only' | 'custom_weekly';
  quickAdd?: number[];
  endsAt?: string;
  /** Omit to use the "first two accepted" auto-Mains rule (see feature doc gap #2). */
  isMain?: boolean;
  /** Milestone goals only — inserted as real `checkpoints` rows, ordered by array position. */
  checkpoints?: { title: string }[];
  /** Omit to auto-assign the next unused accent. The manual goal form (screen 08) lets the
      user pick one explicitly via AccentPicker — this is what makes that choice stick. */
  accent?: string;
};

const ACCENT_HEXES = ACCENT_ORDER.map((key) => ACCENTS[key]);

export function useAddGoalToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddGoalInput) => {
      const existing = await db.select().from(goals).where(eq(goals.arcId, input.arcId));
      const usedAccents = new Set(existing.map((g) => g.accent));
      const accent =
        input.accent ??
        ACCENT_HEXES.find((hex) => !usedAccents.has(hex)) ??
        ACCENT_HEXES[existing.length % ACCENT_HEXES.length] ??
        ACCENTS.coral;
      const isMain = input.isMain ?? existing.length < 2;

      const id = newId();
      await db.insert(goals).values({
        id,
        arcId: input.arcId,
        type: input.type,
        title: input.title,
        accent,
        icon: input.icon,
        isMain,
        targetAmount: input.targetAmount ?? null,
        unit: input.unit ?? null,
        itemNoun: input.itemNoun ?? null,
        startingValue: input.startingValue ?? null,
        cadenceMode: input.cadenceMode ?? null,
        timesPerWeek: input.timesPerWeek ?? null,
        daysOfWeek: input.daysOfWeek ?? null,
        intervalDays: input.intervalDays ?? null,
        sessionTarget: input.sessionTarget ?? null,
        estMinutes: input.estMinutes ?? null,
        paceBasis: input.paceBasis ?? null,
        quickAdd: input.quickAdd ?? null,
        endsAt: input.endsAt ?? null,
      });

      if (input.checkpoints?.length) {
        for (let position = 0; position < input.checkpoints.length; position++) {
          await db.insert(checkpoints).values({
            id: newId(),
            goalId: id,
            title: input.checkpoints[position]!.title,
            position,
          });
        }
      }

      return id;
    },
    onSettled: (_id, _err, input) => qc.invalidateQueries({ queryKey: qk.goals(input.arcId) }),
  });
}

export function useGoalsForArc(arcId: string | undefined) {
  return useQuery({
    queryKey: qk.goals(arcId ?? ''),
    queryFn: () => db.select().from(goals).where(eq(goals.arcId, arcId!)),
    enabled: !!arcId,
  });
}

// Query kind (04-hooks.md §2): wires real goal rows to the pure loadCheck() function, called
// from the hook rather than inlined in the load-check screen, and memoized so the chart/screen
// consuming it doesn't re-render on every unrelated tick.
export function useDraftLoadCheck(arcId: string | undefined) {
  const goalsQuery = useGoalsForArc(arcId);

  return useMemo(() => {
    if (!goalsQuery.data) return null;
    const inputGoals = goalsQuery.data.map((g) => {
      const cadence: CadenceConfig | null = g.cadenceMode
        ? {
            mode: g.cadenceMode as CadenceConfig['mode'],
            timesPerWeek: g.timesPerWeek ?? undefined,
            daysOfWeek: g.daysOfWeek ?? undefined,
            intervalDays: g.intervalDays ?? undefined,
            anchorDate: g.createdAt.slice(0, 10),
          }
        : null;
      return { id: g.id, estMinutes: g.estMinutes ?? 0, cadence };
    });
    return { ...loadCheck({ goals: inputGoals }), goals: goalsQuery.data };
  }, [goalsQuery.data]);
}

export function useActivateArc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const draft = await selectArcByStatus('draft');
      if (!draft) return;
      await db.update(arcs).set({ status: 'active' }).where(eq(arcs.id, draft.id));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.draftArc });
      qc.invalidateQueries({ queryKey: qk.activeArc });
    },
  });
}
