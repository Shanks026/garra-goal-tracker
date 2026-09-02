import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { syncState } from '@/lib/db/schema';

// One row, always. Lives in SQLite rather than MMKV because `lastError` is the one piece of sync
// machinery a human might need to read after the fact, and it should survive a cache clear.

const SINGLETON = 'singleton';

export type SyncState = {
  userId: string | null;
  watermark: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const EMPTY: SyncState = { userId: null, watermark: null, lastSyncedAt: null, lastError: null };

export async function readSyncState(): Promise<SyncState> {
  try {
    const rows = await db.select().from(syncState).where(eq(syncState.id, SINGLETON)).limit(1);
    const row = rows[0];
    if (!row) return EMPTY;
    return {
      userId: row.userId,
      watermark: row.watermark,
      lastSyncedAt: row.lastSyncedAt,
      lastError: row.lastError,
    };
  } catch {
    // A read failure must not take down whatever asked. Reporting "never synced" is safe: it
    // makes the next cycle a first-sign-in push, which is the conservative direction.
    return EMPTY;
  }
}

export async function writeSyncState(patch: Partial<SyncState>): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(syncState)
    .values({ id: SINGLETON, ...patch, updatedAt: now })
    .onConflictDoUpdate({
      target: syncState.id,
      set: { ...patch, updatedAt: now },
    });
}

/** Sign-out: forget the account and the watermark, keep every data row (rules/05 §5). */
export async function clearSyncState(): Promise<void> {
  await writeSyncState({ userId: null, watermark: null, lastSyncedAt: null, lastError: null });
}
