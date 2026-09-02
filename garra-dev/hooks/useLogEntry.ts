import { and, eq, inArray } from 'drizzle-orm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { db } from '@/lib/db/client';
import { newId } from '@/lib/db/ids';
import { entries } from '@/lib/db/schema';
import { isWithinBackfillWindow } from '@/lib/derive/backfill';
import { qk } from '@/lib/queryKeys';
import { copy } from '@/lib/copy';
import { useToastStore } from '@/lib/stores/toast';
import { enqueueDelete, enqueueUpsert } from '@/lib/sync/outbox';

// The most important mutation in the product. Every rule in 04-hooks.md §3 and
// 02-ui-components.md §4 applies here at once: optimistic, haptic in onMutate, prefix
// invalidation, no spinner, no confirm, no network on the path.

export type LogInput = {
  goalId: string;
  arcId: string;
  /** The day this belongs to, already through dayKey(). Never `format(new Date(), ...)`. */
  dayKey: string;
  /** Today's key, for the backfill-window check and the `backfilled` flag. */
  todayKey: string;
  /** null for a binary Habit log; a number for a value goal. */
  value?: number | null;
  /**
   * How to combine with an existing same-day entry. 'add' for an Accumulate goal logging a
   * second ride; 'replace' when correcting a value. Ignored when no entry exists yet.
   */
  mode?: 'add' | 'replace';
  /** Ship metadata (optional even when the goal asks for it — skippable by design). */
  title?: string;
  link?: string;
};

export class BackfillWindowError extends Error {
  constructor() {
    super('That day is outside the 2-day backfill window.');
    this.name = 'BackfillWindowError';
  }
}

export function useLogEntry() {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);

  return useMutation({
    mutationFn: async (input: LogInput) => {
      if (!isWithinBackfillWindow(input.dayKey, input.todayKey)) {
        // Enforced in the derivation/mutation layer *and* intended at the DB level
        // (03-state-and-data.md §5); SQLite needs a trigger for the latter, noted for Phase 8.
        throw new BackfillWindowError();
      }

      // Upsert, not insert. The partial unique index is (goal_id, day_key) WHERE skipped = 0, and
      // 05-database.md §1 is explicit: a second ride today aggregates into the single row's
      // value rather than adding a row, which is also what keeps sync replay idempotent.
      const existing = await db
        .select()
        .from(entries)
        .where(and(eq(entries.goalId, input.goalId), eq(entries.dayKey, input.dayKey)))
        .limit(1);

      const previous = existing[0];
      const loggedAt = new Date().toISOString();
      const backfilled = input.dayKey !== input.todayKey;

      if (previous && !previous.skipped) {
        const nextValue =
          input.value == null
            ? previous.value
            : input.mode === 'replace'
              ? input.value
              : (previous.value ?? 0) + input.value;
        await db
          .update(entries)
          .set({
            value: nextValue,
            loggedAt,
            backfilled,
            title: input.title ?? previous.title,
            link: input.link ?? previous.link,
            updatedAt: loggedAt,
          })
          .where(eq(entries.id, previous.id));
        return previous.id;
      }

      // A previously *skipped* day being logged: clear the skip rather than leaving two rows,
      // so the day has one truthful state.
      if (previous?.skipped) {
        await db
          .update(entries)
          .set({
            skipped: false,
            skipReason: null,
            value: input.value ?? null,
            loggedAt,
            backfilled,
            updatedAt: loggedAt,
          })
          .where(eq(entries.id, previous.id));
        return previous.id;
      }

      const id = newId();
      await db.insert(entries).values({
        id,
        goalId: input.goalId,
        dayKey: input.dayKey,
        loggedAt,
        value: input.value ?? null,
        backfilled,
        title: input.title ?? null,
        link: input.link ?? null,
      });
      return id;
    },

    onMutate: async (input) => {
      // Haptic fires here, not on success — the user gets feedback in the same frame as their
      // tap. Waiting for a DB round-trip makes a one-tap action feel like a 200ms action.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const todayKey = qk.today(input.arcId, input.dayKey);
      const arcEntriesKey = qk.arcEntries(input.arcId);
      await qc.cancelQueries({ queryKey: arcEntriesKey });

      const previousToday = qc.getQueryData(todayKey);
      const previousEntries = qc.getQueryData<EntryRow[]>(arcEntriesKey);

      // The optimistic patch IS the feedback (04-hooks.md §3: never show a spinner on a log).
      if (previousEntries) {
        const withoutDay = previousEntries.filter(
          (e) => !(e.goalId === input.goalId && e.dayKey === input.dayKey),
        );
        const priorSameDay = previousEntries.find(
          (e) => e.goalId === input.goalId && e.dayKey === input.dayKey && !e.skipped,
        );
        const optimisticValue =
          input.value == null
            ? (priorSameDay?.value ?? null)
            : input.mode === 'replace'
              ? input.value
              : (priorSameDay?.value ?? 0) + input.value;
        qc.setQueryData<EntryRow[]>(arcEntriesKey, [
          ...withoutDay,
          {
            id: priorSameDay?.id ?? `optimistic-${input.goalId}-${input.dayKey}`,
            goalId: input.goalId,
            dayKey: input.dayKey,
            value: optimisticValue,
            skipped: false,
            skipReason: null,
            backfilled: input.dayKey !== input.todayKey,
          },
        ]);
      }

      return { previousToday, previousEntries, todayKey, arcEntriesKey };
    },

    onError: (error, _input, context) => {
      if (context?.previousEntries) {
        qc.setQueryData(context.arcEntriesKey, context.previousEntries);
      }
      if (context?.previousToday !== undefined) {
        qc.setQueryData(context.todayKey, context.previousToday);
      }
      pushToast({
        message: error instanceof BackfillWindowError ? error.message : copy.log.failed,
      });
    },

    onSettled: (id, err, input) => {
      // By prefix, never an enumerated list (03-state-and-data.md §3).
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });

      // Outbox — fire and forget, never awaited (rules/04 §3). Guarded on `err` because a failed
      // write (a backfill outside the window, say) has no row for the drain to read.
      if (!err && id) enqueueUpsert('entries', id);
    },
  });
}

/** The shape the arc-wide entries query caches — kept narrow so the optimistic patch can build one. */
export type EntryRow = {
  id: string;
  goalId: string;
  dayKey: string;
  value: number | null;
  skipped: boolean;
  skipReason: string | null;
  backfilled: boolean;
};

/**
 * Reverses a log — the 5-second undo toast's action. Deletes the row outright rather than
 * writing a compensating entry: `entries` is keyed (goal, day) and an undone log should leave no
 * trace, unlike a `rescopes` row which is deliberately an audit trail.
 */
export function useUndoEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entryId: string; arcId: string }) => {
      await db.delete(entries).where(eq(entries.id, input.entryId));
    },
    onSettled: (_r, err, input) => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });

      // A delete is the one op the drain can't reconstruct by reading the row — it's gone.
      if (!err) enqueueDelete('entries', input.entryId);
    },
  });
}

export type SkipReasonKey = keyof typeof copy.log.skipReasons;

/**
 * Swipe-left skip with a reason (02-ui-components.md §4). A skipped day is neither a hit nor an
 * untouched miss: `progress.ts` excludes it from totals, and the mosaic can mark it distinctly.
 */
export function useSkipDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      goalId: string;
      arcId: string;
      dayKey: string;
      reason: SkipReasonKey;
    }) => {
      const existing = await db
        .select()
        .from(entries)
        .where(and(eq(entries.goalId, input.goalId), eq(entries.dayKey, input.dayKey)))
        .limit(1);

      const now = new Date().toISOString();
      const previous = existing[0];

      if (previous) {
        await db
          .update(entries)
          .set({ skipped: true, skipReason: input.reason, value: null, updatedAt: now })
          .where(eq(entries.id, previous.id));
        return previous.id;
      }

      const id = newId();
      await db.insert(entries).values({
        id,
        goalId: input.goalId,
        dayKey: input.dayKey,
        loggedAt: now,
        skipped: true,
        skipReason: input.reason,
      });
      return id;
    },
    onMutate: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
    onSettled: (id, err, input) => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });

      if (!err && id) enqueueUpsert('entries', id);
    },
  });
}

/**
 * Marks every binary goal done in one tap — "Log everything" (02-ui-components.md §4). Value
 * goals aren't touched here; the caller queues those into the log sheet.
 */
export function useLogEverything() {
  const qc = useQueryClient();
  return useMutation({
    // Returns the ids of every entry actually written, so onSettled can enqueue each one. It
    // returned void before Phase 8; the outbox needs to know which rows moved, and a "log
    // everything" on a 10-goal day is the single largest batch the app ever produces.
    mutationFn: async (input: {
      arcId: string;
      goalIds: string[];
      dayKey: string;
    }): Promise<string[]> => {
      if (input.goalIds.length === 0) return [];
      const now = new Date().toISOString();
      const touched: string[] = [];

      const already = await db
        .select()
        .from(entries)
        .where(and(inArray(entries.goalId, input.goalIds), eq(entries.dayKey, input.dayKey)));
      const loggedGoalIds = new Set(already.filter((e) => !e.skipped).map((e) => e.goalId));

      for (const goalId of input.goalIds) {
        if (loggedGoalIds.has(goalId)) continue;
        const skippedRow = already.find((e) => e.goalId === goalId && e.skipped);
        if (skippedRow) {
          await db
            .update(entries)
            .set({ skipped: false, skipReason: null, loggedAt: now, updatedAt: now })
            .where(eq(entries.id, skippedRow.id));
          touched.push(skippedRow.id);
          continue;
        }
        const id = newId();
        await db.insert(entries).values({
          id,
          goalId,
          dayKey: input.dayKey,
          loggedAt: now,
        });
        touched.push(id);
      }
      return touched;
    },
    onMutate: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    onSettled: (touched, err, input) => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: qk.goals(input.arcId) });

      if (!err && touched) for (const id of touched) enqueueUpsert('entries', id);
    },
  });
}
