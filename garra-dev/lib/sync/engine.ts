import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { arcs, checkpoints, entries, freezes, goals, rescopes } from '@/lib/db/schema';
import { supabase } from '@/lib/supabase';
import { fromRemote, toRemote, type Row } from './mapping';
import { collapseQueue, nextWatermark, resolveConflict } from './resolve';
import { dequeue, dropQueuedFor, pendingRows, recordAttempt } from './outbox';
import { readSyncState, writeSyncState } from './state';
import { SYNC_TABLES, type SyncTable } from './tables';

// The only place SQLite and Supabase meet. rules/03 §7: sync is never on the critical path of a
// user action, and a broken sync leaves the app fully working. Nothing here throws — every
// failure lands in `sync_state.lastError` and the next cycle retries.
//
// The cycle is `pull → resolve → push`, and that ORDER is the conflict resolution: a local edit
// that loses is dropped from the outbox during resolve, so push can be a plain `.upsert()` with
// no conditional SQL, no RPC, and no dynamic-SQL whitelist. See 10-auth-and-sync.md.

const TABLES = { arcs, goals, entries, checkpoints, rescopes, freezes } as const;

export type SyncResult = {
  status: 'ok' | 'skipped' | 'error';
  /** Why it was skipped or what failed — surfaced only as a quiet Settings line. */
  reason?: string;
  pulled: number;
  pushed: number;
  /** True when local rows changed, so the caller can invalidate the query cache. */
  changedLocally: boolean;
};

const SKIPPED = (reason: string): SyncResult => ({
  status: 'skipped',
  reason,
  pulled: 0,
  pushed: 0,
  changedLocally: false,
});

// A single in-flight cycle. Sign-in, app foreground, and a settling mutation can all fire at
// once; two concurrent drains would double-push and race the watermark.
let inFlight: Promise<SyncResult> | null = null;

export function syncNow(): Promise<SyncResult> {
  inFlight ??= runCycle().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Coalesces a burst of mutations into one cycle. "Log everything" on a ten-goal day settles ten
// mutations in well under a second; without this each one would ask for a drain. The delay is
// after the *last* write, so nothing about it sits on the log path.
const SETTLE_DELAY_MS = 2_000;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync(): void {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    void syncNow();
  }, SETTLE_DELAY_MS);
}

async function runCycle(): Promise<SyncResult> {
  let pulled = 0;
  let pushed = 0;
  let changedLocally = false;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id ?? null;

    // No account yet. The outbox keeps accumulating, and that accumulation IS the local-to-remote
    // upsert that runs on first sign-in (rules/05 §5). Not an error.
    if (!userId) return SKIPPED('signed out');

    const state = await readSyncState();

    // A different account signing in on a device that already holds someone's arc. Merging would
    // silently move one user's data into another's account, so refuse rather than guess. §8.4
    // makes sign-in itself reject this case; this is the backstop.
    if (state.userId && state.userId !== userId) {
      const reason = 'local data belongs to a different account';
      await writeSyncState({ lastError: reason });
      return SKIPPED(reason);
    }

    // First sign-in after local-only use: push only, never pull first. Pulling would let an empty
    // remote overwrite a real local arc — the exact failure rules/05 §5 calls out, and the one
    // that would make "Keep it on this phone" a lie at account creation.
    const isFirstSignIn = state.userId === null;

    let watermark = state.watermark;

    if (!isFirstSignIn) {
      const seen: (string | null)[] = [];

      for (const table of SYNC_TABLES) {
        let query = supabase.from(table).select('*').order('synced_at', { ascending: true });
        if (watermark) query = query.gt('synced_at', watermark);

        const { data, error } = await query;
        if (error) throw new Error(`pull ${table}: ${error.message}`);

        for (const remoteRow of data ?? []) {
          const row = remoteRow as Row;
          seen.push((row.synced_at as string | null) ?? null);

          const applied = await applyPulledRow(table, row);
          if (applied) {
            pulled += 1;
            changedLocally = true;
          }
        }
      }

      watermark = nextWatermark(watermark, seen);
    }

    // --- Push ---------------------------------------------------------------------------------
    // collapseQueue is what makes replay idempotent: three edits to one row become one upsert of
    // its current state, and a create-then-undo becomes a single delete.
    const planned = collapseQueue(await pendingRows());
    let cleanCycle = true;

    for (const item of planned) {
      try {
        if (item.op === 'delete') {
          const { error } = await supabase.from(item.tableName).delete().eq('id', item.rowId);
          if (error) throw new Error(error.message);
        } else {
          const local = await readLocalRow(item.tableName, item.rowId);
          // Gone locally without a delete queued — nothing to push, and the queue rows should
          // still clear or they retry forever.
          if (local) {
            const payload = toRemote(item.tableName, local);
            const { error } =
              item.tableName === 'entries'
                ? // The partial unique index (goal_id, day_key) WHERE skipped = false is the
                  // natural key here, not the primary key: two devices logging the same day
                  // generate different ids for what is one entry, and conflicting on `id` would
                  // violate that index instead of merging.
                  await supabase
                    .from('entries')
                    .upsert(payload, { onConflict: 'goal_id,day_key', ignoreDuplicates: false })
                : await supabase.from(item.tableName).upsert(payload);
            if (error) throw new Error(error.message);
          }
        }

        await dequeue(item.queueIds);
        pushed += 1;
      } catch (error) {
        cleanCycle = false;
        const message = error instanceof Error ? error.message : String(error);
        for (const queueId of item.queueIds) await recordAttempt(queueId, message);
      }
    }

    // The watermark advances ONLY after a fully clean cycle. A partial advance would permanently
    // skip the rows that failed.
    await writeSyncState({
      userId,
      watermark: cleanCycle ? watermark : state.watermark,
      lastSyncedAt: new Date().toISOString(),
      lastError: cleanCycle ? null : 'some rows did not sync',
    });

    return {
      status: cleanCycle ? 'ok' : 'error',
      reason: cleanCycle ? undefined : 'some rows did not sync',
      pulled,
      pushed,
      changedLocally,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Deliberately swallowed. A sync failure is invisible to the user except as a quiet line in
    // Settings (rules/03 §7) — never a banner, never a thrown error reaching a component.
    await writeSyncState({ lastError: message }).catch(() => {});
    return { status: 'error', reason: message, pulled, pushed, changedLocally };
  }
}

/**
 * Applies one pulled row if it wins the conflict. Returns whether local data actually changed.
 *
 * When remote wins, any queued local edit for that row is dropped: it has lost, and pushing it
 * afterwards would resurrect the stale value and undo the merge we just applied.
 */
async function applyPulledRow(table: SyncTable, remoteRow: Row): Promise<boolean> {
  const id = remoteRow.id as string | undefined;
  if (!id) return false;

  const local = await readLocalRow(table, id);
  const decision = resolveConflict(
    local ? { updatedAt: local.updatedAt as string | null } : null,
    { updatedAt: remoteRow.updated_at as string | null },
  );

  if (decision !== 'remote') return false;

  const mapped = fromRemote(table, remoteRow);
  await upsertLocalRow(table, mapped);
  await dropQueuedFor(table, id);
  return true;
}

async function readLocalRow(table: SyncTable, id: string): Promise<Row | null> {
  const target = TABLES[table];
  const rows = await db.select().from(target).where(eq(target.id, id)).limit(1);
  return (rows[0] as Row | undefined) ?? null;
}

async function upsertLocalRow(table: SyncTable, row: Row): Promise<void> {
  // One narrow cast per table rather than a single wide `as never`. Standing rule #19 exists
  // because a silencing cast here previously hid two real bugs (checkpoints never inserted, a
  // manual accent discarded) — so the cast asserts the *specific* insert type, and the column
  // names it depends on are verified by mapping.test.ts's round-trip, not by this line.
  switch (table) {
    case 'arcs':
      await db
        .insert(arcs)
        .values(row as typeof arcs.$inferInsert)
        .onConflictDoUpdate({ target: arcs.id, set: row as typeof arcs.$inferInsert });
      return;
    case 'goals':
      await db
        .insert(goals)
        .values(row as typeof goals.$inferInsert)
        .onConflictDoUpdate({ target: goals.id, set: row as typeof goals.$inferInsert });
      return;
    case 'entries':
      await db
        .insert(entries)
        .values(row as typeof entries.$inferInsert)
        .onConflictDoUpdate({ target: entries.id, set: row as typeof entries.$inferInsert });
      return;
    case 'checkpoints':
      await db
        .insert(checkpoints)
        .values(row as typeof checkpoints.$inferInsert)
        .onConflictDoUpdate({ target: checkpoints.id, set: row as typeof checkpoints.$inferInsert });
      return;
    case 'rescopes':
      await db
        .insert(rescopes)
        .values(row as typeof rescopes.$inferInsert)
        .onConflictDoUpdate({ target: rescopes.id, set: row as typeof rescopes.$inferInsert });
      return;
    case 'freezes':
      await db
        .insert(freezes)
        .values(row as typeof freezes.$inferInsert)
        .onConflictDoUpdate({ target: freezes.id, set: row as typeof freezes.$inferInsert });
      return;
  }
}

/**
 * First sign-in: mirror the display name captured in onboarding up to `profiles`.
 *
 * Separate from the row cycle because `profiles` is keyed on `auth.users.id`, not a local id, and
 * has no outbox entry — it isn't one of the synced tables.
 */
export async function pushProfileName(userId: string, name: string): Promise<void> {
  try {
    await supabase.from('profiles').upsert({ id: userId, name, updated_at: new Date().toISOString() });
  } catch {
    // Cosmetic. A missing display name must never block sign-in.
  }
}
