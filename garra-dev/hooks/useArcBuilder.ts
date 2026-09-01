import { useMemo } from 'react';
import { and, eq } from 'drizzle-orm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { newId } from '@/lib/db/ids';
import { arcs, checkpoints, goals, localProfile } from '@/lib/db/schema';
import { deviceTimezone } from '@/lib/date';
import { seasonalArcTitle } from '@/lib/arcNaming';
import { qk } from '@/lib/queryKeys';
import { loadCheck } from '@/lib/derive/load';
import { cadenceForGoal } from '@/lib/derive/cadence';
import { nextUnusedAccent } from '@/lib/accents';

// All facets of the same in-progress-draft concern — one file because they're tightly coupled,
// not a god hook: each export below is still single-purpose (04-hooks.md §1/§5).

export type DraftOrActiveArc = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'draft' | 'active' | 'archived';
};

/** ISO timestamp for `updated_at`. SQLite has no moddatetime trigger, so every update sets it
    by hand — last-write-wins sync (Phase 8) is impossible without it (05-database.md §5). */
function nowIso(): string {
  return new Date().toISOString();
}

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
        await db
          .update(localProfile)
          .set({ name, updatedAt: nowIso() })
          .where(eq(localProfile.id, 'local'));
      } else {
        await db.insert(localProfile).values({ id: 'local', name });
      }
    },
    // Optimistic (04-hooks.md §3): the name is echoed back on the very next screen, so waiting
    // on the write would make a text field feel laggy for no reason.
    onMutate: async (name) => {
      const previous = qc.getQueryData<string | null>(qk.localProfile);
      qc.setQueryData(qk.localProfile, name);
      return { previous };
    },
    onError: (_err, _name, context) => {
      qc.setQueryData(qk.localProfile, context?.previous ?? null);
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
          .set({ startsAt: input.startsAt, endsAt: input.endsAt, updatedAt: nowIso() })
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
    onMutate: async (input) => {
      const previous = qc.getQueryData<DraftOrActiveArc | null>(qk.draftArc);
      if (previous) {
        qc.setQueryData(qk.draftArc, { ...previous, ...input });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous !== undefined) qc.setQueryData(qk.draftArc, context.previous);
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
  /** Defaults to the arc's own start. Null-in-DB means the same thing; set explicitly for a
      goal added mid-arc so pace() judges it against its own window. */
  startsAt?: string;
  endsAt?: string;
  /** Omit to use the "first two accepted" auto-Mains rule. */
  isMain?: boolean;
  /** Milestone goals only — inserted as real `checkpoints` rows, ordered by array position. */
  checkpoints?: { title: string }[];
  /** Omit to auto-assign the next unused accent. */
  accent?: string;
};

export function useAddGoalToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddGoalInput) => {
      // Idempotency guard: navigating back into Recommended goals and tapping "Start the arc"
      // again used to re-insert every proposal. A goal is identified by (arc, title) here —
      // there is no natural key on `goals`, and two goals with the same name in one arc are
      // indistinguishable to the user anyway.
      const duplicate = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.arcId, input.arcId), eq(goals.title, input.title)))
        .limit(1);
      if (duplicate[0]) return duplicate[0].id;

      const existing = await db.select().from(goals).where(eq(goals.arcId, input.arcId));
      const accent = input.accent ?? nextUnusedAccent(existing.map((g) => g.accent));
      const isMain = input.isMain ?? existing.length < 2;

      const arcRows = await db.select().from(arcs).where(eq(arcs.id, input.arcId)).limit(1);
      const arcStartsAt = arcRows[0]?.startsAt ?? null;

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
        // pace() requires a basis for value goals, and 'even' is the only one implemented
        // (04-pace-engine.md). Habit/Milestone goals don't use it.
        paceBasis:
          input.paceBasis ??
          (input.type === 'accumulate' || input.type === 'ship' ? 'even' : null),
        quickAdd: input.quickAdd ?? null,
        startsAt: input.startsAt ?? arcStartsAt,
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
  const draftArc = useDraftArc();
  const goalsQuery = useGoalsForArc(arcId);

  return useMemo(() => {
    if (!goalsQuery.data || !draftArc.data) return null;
    const arc = { startsAt: draftArc.data.startsAt, timezone: draftArc.data.timezone };
    const inputGoals = goalsQuery.data.map((g) => ({
      id: g.id,
      estMinutes: g.estMinutes ?? 0,
      // One shared producer of CadenceConfig — never derived inline (06-home-and-logging.md §5.0.3).
      cadence: cadenceForGoal(g, arc),
    }));
    return { ...loadCheck({ goals: inputGoals }), goals: goalsQuery.data };
  }, [goalsQuery.data, draftArc.data]);
}

export function useActivateArc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const draft = await selectArcByStatus('draft');
      if (!draft) return;
      await db
        .update(arcs)
        .set({ status: 'active', updatedAt: nowIso() })
        .where(eq(arcs.id, draft.id));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.draftArc });
      qc.invalidateQueries({ queryKey: qk.activeArc });
    },
  });
}
