// Types only, so `mapping.ts` and `resolve.ts` stay pure. `outbox.ts` and `engine.ts` import
// `lib/db/client`, which reaches `openDatabaseSync` — a native module that cannot load under
// Jest (standing rule #20). Anything importable from a test lives here or in mapping/resolve.

export type SyncTable = 'arcs' | 'goals' | 'entries' | 'checkpoints' | 'rescopes' | 'freezes';

/**
 * Push order. Parents before children, because remote foreign keys are real: an `entries` row
 * whose `goal_id` hasn't arrived yet is rejected, and on a first sign-in the entire arc pushes at
 * once. Pull uses the same order for the same reason.
 */
export const SYNC_TABLES: readonly SyncTable[] = [
  'arcs',
  'goals',
  'entries',
  'checkpoints',
  'rescopes',
  'freezes',
] as const;

/**
 * See `SyncOp` usage in `outbox.ts`: because the drain re-reads the row and pushes with
 * `.upsert()`, 'insert' and 'update' are the same remote action. 'delete' is the only distinct
 * one, since the local row is gone and cannot be re-read.
 */
export type SyncOp = 'insert' | 'update' | 'delete';
