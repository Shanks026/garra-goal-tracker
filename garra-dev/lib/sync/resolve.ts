import { parseTimestamp } from './mapping';
import type { SyncOp, SyncTable } from './tables';

// The sync reducer. Pure by design — rules/06 §3 names "the sync reducer — replay idempotency" as
// mandatory test coverage, and that is only honest if the decisions live somewhere a test can
// reach without a database or a network. `engine.ts` does the I/O and calls into here for every
// judgement call.

export type QueuedOp = {
  id: string;
  tableName: SyncTable;
  rowId: string;
  op: SyncOp;
};

export type PlannedOp = {
  /** Every queue row this collapses, so the engine dequeues all of them on success. */
  queueIds: string[];
  tableName: SyncTable;
  rowId: string;
  op: 'upsert' | 'delete';
};

/**
 * Collapse the raw queue into the minimum set of remote operations.
 *
 * This is what makes replay idempotent (rules/05 §5). The insert-time guard in `outbox.ts` also
 * dedupes, but it races: two mutations landing in the same tick can both miss the guard. Doing it
 * again here — purely, on the drained snapshot — means correctness doesn't depend on that timing.
 *
 * Rules, in order of precedence:
 *
 *  1. **A later delete wins over earlier upserts.** A row created and then undone in one offline
 *     session should never touch the remote at all beyond the delete. Pushing the upsert first
 *     would briefly resurrect it and, worse, leave it there if the delete then failed.
 *  2. **An upsert after a delete wins.** Re-logging a day whose entry was undone is a real
 *     sequence (undo, change your mind, log again), and the row exists locally again.
 *  3. Repeated upserts collapse to one, because the engine reads current state at push time.
 *
 * Input order is significant and must be the queue's own `created_at` order.
 */
export function collapseQueue(queued: QueuedOp[]): PlannedOp[] {
  const byRow = new Map<string, PlannedOp>();

  for (const item of queued) {
    const key = `${item.tableName}:${item.rowId}`;
    const op: 'upsert' | 'delete' = item.op === 'delete' ? 'delete' : 'upsert';
    const existing = byRow.get(key);

    if (!existing) {
      byRow.set(key, {
        queueIds: [item.id],
        tableName: item.tableName,
        rowId: item.rowId,
        op,
      });
      continue;
    }

    // Later op wins outright; earlier queue ids ride along so they're all cleared together.
    existing.queueIds.push(item.id);
    existing.op = op;
  }

  return [...byRow.values()];
}

export type ConflictSide = { updatedAt: string | null | undefined };

export type Resolution = 'remote' | 'local' | 'equal';

/**
 * Last-write-wins on the **client-authored** `updated_at` (rules/05 §5).
 *
 * This only works because Phase 8.0 retargeted the `moddatetime` trigger to `synced_at`. While
 * the trigger still stamped `updated_at`, a stale device's push was rewritten to `now()` and so
 * always appeared newest — see 10-auth-and-sync.md.
 *
 * A missing or unparseable local timestamp loses: the remote row is at least known-good, and
 * refusing to decide would strand the row forever. A missing *remote* timestamp loses for the
 * same reason, which is why the NaN checks are ordered rather than symmetric.
 */
export function resolveConflict(local: ConflictSide | null, remote: ConflictSide): Resolution {
  if (!local) return 'remote';

  const localMs = parseTimestamp(local.updatedAt);
  const remoteMs = parseTimestamp(remote.updatedAt);

  if (Number.isNaN(localMs)) return 'remote';
  if (Number.isNaN(remoteMs)) return 'local';
  if (remoteMs > localMs) return 'remote';
  if (localMs > remoteMs) return 'local';
  return 'equal';
}

/**
 * The next pull watermark: the greatest `synced_at` observed this cycle, or the previous
 * watermark if nothing newer arrived.
 *
 * Advanced **only after a fully clean cycle** — a partial advance would skip the rows that
 * failed. `synced_at` is server-owned, so it is monotonic with respect to the server clock;
 * deriving the watermark from a client-supplied timestamp would let a device with a slow clock
 * write rows stamped older than the watermark and never be pulled.
 */
export function nextWatermark(previous: string | null, seen: (string | null | undefined)[]): string | null {
  let bestMs = parseTimestamp(previous);
  let best = previous;

  for (const candidate of seen) {
    const ms = parseTimestamp(candidate);
    if (Number.isNaN(ms)) continue;
    if (Number.isNaN(bestMs) || ms > bestMs) {
      bestMs = ms;
      best = new Date(ms).toISOString();
    }
  }

  return best;
}
