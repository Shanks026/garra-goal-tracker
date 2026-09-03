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
import { enqueueDelete, enqueueUpsert } from '@/lib/sync/outbox';

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

/**
 * Creates or updates the draft arc.
 *
 * `title` and `description` are optional so the manual window-editing path can still change
 * just the dates. When a title is omitted on *creation* it falls back to `seasonalArcTitle()` —
 * that fallback used to be the only way an arc ever got named, which is what made the arc
 * invisible to the user. The `arc-new` screen now passes a real name, and offers the seasonal
 * one as placeholder text instead of applying it silently.
 */
export function useSetArcWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      startsAt: string;
      endsAt: string;
      title?: string;
      description?: string | null;
    }) => {
      const draft = await selectArcByStatus('draft');
      if (draft) {
        await db
          .update(arcs)
          .set({
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            // Only overwrite when the caller actually supplied one, so editing the window
            // later can't wipe a name the user chose.
            ...(input.title ? { title: input.title } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            updatedAt: nowIso(),
          })
          .where(eq(arcs.id, draft.id));
        return draft.id;
      }
      const id = newId();
      await db.insert(arcs).values({
        id,
        title: input.title?.trim() || seasonalArcTitle(new Date()),
        description: input.description ?? null,
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
    onSettled: (id, err) => {
      qc.invalidateQueries({ queryKey: qk.draftArc });

      // A draft arc is enqueued like any other row. Nothing leaves the device during onboarding
      // anyway — there is no session yet, so the drain no-ops and the queue simply accumulates
      // until first sign-in. That accumulation *is* the local-to-remote upsert (rules/05 §5).
      if (!err && id) enqueueUpsert('arcs', id);
    },
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
      // No checkpoints reported: this path wrote nothing, so re-enqueueing the goal is harmless
      // but its checkpoints already exist and were enqueued by the call that created them.
      if (duplicate[0]) return { goalId: duplicate[0].id, checkpointIds: [] as string[] };

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
          input.paceBasis ?? (input.type === 'accumulate' || input.type === 'ship' ? 'even' : null),
        quickAdd: input.quickAdd ?? null,
        startsAt: input.startsAt ?? arcStartsAt,
        endsAt: input.endsAt ?? null,
      });

      // Collected so onSettled can enqueue each one. A Milestone goal is nothing but its
      // checkpoints (05-database.md §1) — syncing the goal without them would push an empty
      // shell, which is worse than pushing nothing.
      const checkpointIds: string[] = [];
      if (input.checkpoints?.length) {
        for (let position = 0; position < input.checkpoints.length; position++) {
          const checkpointId = newId();
          await db.insert(checkpoints).values({
            id: checkpointId,
            goalId: id,
            title: input.checkpoints[position]!.title,
            position,
          });
          checkpointIds.push(checkpointId);
        }
      }

      return { goalId: id, checkpointIds };
    },
    onSettled: (result, err, input) => {
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });

      if (!err && result) {
        enqueueUpsert('goals', result.goalId);
        for (const checkpointId of result.checkpointIds) {
          enqueueUpsert('checkpoints', checkpointId);
        }
      }
    },
  });
}

/**
 * Removes a goal from the draft arc.
 *
 * Exists because the recommended-goals screen now creates a real row the moment a proposal is
 * accepted, rather than holding the selection in memory until "Start the arc". That change is
 * what makes the proposals *customisable* — `goal-form` edits by `goalId`, so a goal has to
 * exist before it can be edited — and it also means the selection survives the app being killed
 * mid-onboarding, like every other part of the draft. The cost is that declining has to delete.
 *
 * A hard delete, not an archive: this is a draft the user is still assembling, and an archived
 * row would surface in the arc as a paused goal they never agreed to. Checkpoints go with it via
 * `ON DELETE CASCADE` on both sides (rules/05 §1).
 */
export function useRemoveDraftGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goalId: string; arcId: string }) => {
      await db.delete(goals).where(eq(goals.id, input.goalId));
    },
    onSettled: (_r, err, input) => {
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });
      if (!err) enqueueDelete('goals', input.goalId);
    },
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
    mutationFn: async (): Promise<string | undefined> => {
      const draft = await selectArcByStatus('draft');
      if (!draft) return undefined;
      await db
        .update(arcs)
        .set({ status: 'active', updatedAt: nowIso() })
        .where(eq(arcs.id, draft.id));
      return draft.id;
    },
    onSettled: (arcId, err) => {
      qc.invalidateQueries({ queryKey: qk.draftArc });
      qc.invalidateQueries({ queryKey: qk.activeArc });

      if (!err && arcId) enqueueUpsert('arcs', arcId);
    },
  });
}
