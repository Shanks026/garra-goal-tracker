import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { syncQueue } from '@/lib/db/schema';
import { newId } from '@/lib/db/ids';

// The outbox. `sync_queue` has existed since Phase 1 with zero writers, so every row created in
// Phases 4–7 was invisible to sync; this module and the mutation call sites are what change that.
//
// rules/03 §7: local write → sync_queue row → background drain. Nothing in the UI knows sync
// exists, and `enqueueSync` is never awaited (rules/04 §3).

import type { SyncOp, SyncTable } from './tables';

export type { SyncOp, SyncTable };

// `local_profile`, `sync_state` and `sync_queue` are deliberately absent from SyncTable: the
// first is pre-account local state, the others are the sync machinery itself.
//
// Op vocabulary: because the drain reads the row fresh and pushes with `.upsert()`, 'insert' and
// 'update' are the *same remote action*. Collapsing them onto 'insert' is what lets the dedupe
// below actually fire — a goal created then edited three times leaves one queue row, not four.
// Use `enqueueUpsert` / `enqueueDelete` at call sites rather than passing an op by hand.

export type EnqueueInput = {
  table: SyncTable;
  rowId: string;
  op: SyncOp;
};

/**
 * Append a row to the outbox. Fire-and-forget: callers must NOT await this, and it never throws —
 * a log that fails to enqueue is a sync problem, not a user-facing one, and the next mutation on
 * the same row re-enqueues it anyway.
 *
 * No payload is stored. The drain reads the row fresh from SQLite, which means an entry logged
 * and then edited twice pushes its *current* state once rather than replaying a stale sequence,
 * and replay after a crash is idempotent for free. `sync_queue.payload` is NOT NULL, so it holds
 * `{}`; the column stays for a future op that genuinely needs a snapshot.
 */
export function enqueueSync(input: EnqueueInput): void {
  void (async () => {
    try {
      // Collapse repeats: one pending row per (table, rowId, op) is enough, since the drain reads
      // current state. Without this, "log everything" on a 10-goal day followed by three
      // corrections leaves 13 rows that all push the same handful of goals.
      const existing = await db
        .select({ id: syncQueue.id })
        .from(syncQueue)
        .where(
          and(
            eq(syncQueue.tableName, input.table),
            eq(syncQueue.rowId, input.rowId),
            eq(syncQueue.op, input.op),
          ),
        )
        .limit(1);

      if (existing.length > 0) return;

      await db.insert(syncQueue).values({
        id: newId(),
        tableName: input.table,
        rowId: input.rowId,
        op: input.op,
        payload: {},
        attempts: 0,
        lastError: null,
      });
    } catch {
      // Swallowed on purpose. See the doc comment: this must never surface to the user, and it
      // must never reject into a mutation's onSettled.
    }
  })();
}

/** "Make the remote row match the local one." The ergonomic form for every write path. */
export function enqueueUpsert(table: SyncTable, rowId: string): void {
  enqueueSync({ table, rowId, op: 'insert' });
}

/** "Remove this row remotely." The local row is already gone, so the drain cannot re-read it. */
export function enqueueDelete(table: SyncTable, rowId: string): void {
  enqueueSync({ table, rowId, op: 'delete' });
}

export type QueuedRow = {
  id: string;
  tableName: SyncTable;
  rowId: string;
  op: SyncOp;
  attempts: number;
};

/** Everything currently pending, oldest first — replay order matters for parent-before-child. */
export async function pendingRows(): Promise<QueuedRow[]> {
  const rows = await db.select().from(syncQueue).orderBy(syncQueue.createdAt);
  return rows.map((r) => ({
    id: r.id,
    tableName: r.tableName as SyncTable,
    rowId: r.rowId,
    op: r.op,
    attempts: r.attempts,
  }));
}

export async function pendingCount(): Promise<number> {
  return (await db.select({ id: syncQueue.id }).from(syncQueue)).length;
}

/** Remove drained rows. Called only after the remote write for them succeeded. */
export async function dequeue(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(syncQueue).where(inArray(syncQueue.id, ids));
}

/**
 * Drop every queued op for one row.
 *
 * Used by pull-side conflict resolution: when a pulled row's `updated_at` is newer than ours, our
 * queued local edit has *lost*, and pushing it afterwards would resurrect the stale value and
 * undo the merge. This is the step that lets the push side be a plain `.upsert()` with no
 * conditional SQL — see 10-auth-and-sync.md, "The sync cycle".
 */
export async function dropQueuedFor(table: SyncTable, rowId: string): Promise<void> {
  await db
    .delete(syncQueue)
    .where(and(eq(syncQueue.tableName, table), eq(syncQueue.rowId, rowId)));
}

export async function recordAttempt(id: string, error: string): Promise<void> {
  const rows = await db.select().from(syncQueue).where(eq(syncQueue.id, id)).limit(1);
  const current = rows[0];
  if (!current) return;
  await db
    .update(syncQueue)
    .set({ attempts: current.attempts + 1, lastError: error.slice(0, 500) })
    .where(eq(syncQueue.id, id));
}
