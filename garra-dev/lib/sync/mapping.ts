import type { SyncTable } from './tables';

// Pure. No I/O, no native modules, no `new Date()` without an argument — standing rule #20 (a
// pure rule must not live in a file importing a native module) is why this file imports neither
// `lib/db/client` nor `lib/supabase`, and why `lib/sync/engine.ts` is the only place they meet.
//
// Two schemas that rules/05 §3 calls "structurally identical" still differ in four ways that
// would each corrupt data silently:
//
//   1. Case      — camelCase locally, snake_case remotely.
//   2. Arrays    — `days_of_week`/`quick_add` are JSON *text* in SQLite, real int[]/numeric[] in
//                  Postgres.
//   3. user_id   — absent locally by design; omitted on push so `DEFAULT auth.uid()` fills it
//                  (rules/05 §1), stripped on pull.
//   4. Timestamps — the subtle one. See parseTimestamp below.

export type FieldKind =
  | 'text' // passthrough
  | 'number'
  | 'bool'
  | 'day' // 'YYYY-MM-DD' date, identical both sides
  | 'timestamp' // needs normalising — see parseTimestamp
  | 'numberArray'; // JSON text locally, real array remotely

type FieldSpec = { local: string; remote: string; kind: FieldKind };

/**
 * SQLite's `current_timestamp` produces `'2026-09-02 14:33:01'` — UTC, but with **no zone
 * marker and a space instead of a T**. Every `db.insert(...)` in the app omits `updated_at` and
 * so gets exactly that, while every `db.update(...)` sets it explicitly to
 * `new Date().toISOString()` → `'2026-09-02T14:33:01.123Z'`.
 *
 * So local `updated_at` has two formats in circulation, and they break both comparisons that
 * matter:
 *
 *   - **String compare** puts every space-form timestamp before every ISO one, because
 *     `' '` (0x20) < `'T'` (0x54). An inserted-never-updated row would always lose a conflict
 *     regardless of when it was written.
 *   - **`new Date('2026-09-02 14:33:01')`** is parsed as *local* time by JS, not UTC, silently
 *     shifting it by the device's offset — hours of drift on a value used to decide which edit
 *     survives.
 *
 * Everything therefore goes through here and comes out as epoch milliseconds for comparison, or
 * strict ISO-8601 for storage. Returns NaN for an unparseable value, and callers treat NaN as
 * "oldest possible" rather than crashing a sync over one bad row.
 */
export function parseTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN;

  // Already zoned (ISO with Z or ±hh:mm) — trust it.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return Date.parse(value);

  // Bare 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DDTHH:MM:SS' from SQLite: UTC by definition, so make
  // that explicit before parsing rather than letting JS assume local time.
  const normalised = value.includes('T') ? value : value.replace(' ', 'T');
  return Date.parse(`${normalised}Z`);
}

/** Canonical storage form. One format everywhere from here on. */
export function toIso(value: string | null | undefined): string | null {
  const ms = parseTimestamp(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const TIMESTAMPS: FieldSpec[] = [
  { local: 'createdAt', remote: 'created_at', kind: 'timestamp' },
  { local: 'updatedAt', remote: 'updated_at', kind: 'timestamp' },
];

export const TABLE_FIELDS: Record<SyncTable, FieldSpec[]> = {
  arcs: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'title', remote: 'title', kind: 'text' },
    { local: 'description', remote: 'description', kind: 'text' },
    { local: 'startsAt', remote: 'starts_at', kind: 'day' },
    { local: 'endsAt', remote: 'ends_at', kind: 'day' },
    { local: 'status', remote: 'status', kind: 'text' },
    { local: 'timezone', remote: 'timezone', kind: 'text' },
    ...TIMESTAMPS,
  ],
  goals: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'arcId', remote: 'arc_id', kind: 'text' },
    { local: 'type', remote: 'type', kind: 'text' },
    { local: 'title', remote: 'title', kind: 'text' },
    { local: 'direction', remote: 'direction', kind: 'text' },
    { local: 'accent', remote: 'accent', kind: 'text' },
    { local: 'icon', remote: 'icon', kind: 'text' },
    { local: 'isMain', remote: 'is_main', kind: 'bool' },
    { local: 'targetAmount', remote: 'target_amount', kind: 'number' },
    { local: 'unit', remote: 'unit', kind: 'text' },
    { local: 'startingValue', remote: 'starting_value', kind: 'number' },
    { local: 'cadenceMode', remote: 'cadence_mode', kind: 'text' },
    { local: 'timesPerWeek', remote: 'times_per_week', kind: 'number' },
    { local: 'daysOfWeek', remote: 'days_of_week', kind: 'numberArray' },
    { local: 'intervalDays', remote: 'interval_days', kind: 'number' },
    { local: 'sessionTarget', remote: 'session_target', kind: 'number' },
    { local: 'estMinutes', remote: 'est_minutes', kind: 'number' },
    { local: 'paceBasis', remote: 'pace_basis', kind: 'text' },
    { local: 'quickAdd', remote: 'quick_add', kind: 'numberArray' },
    { local: 'itemNoun', remote: 'item_noun', kind: 'text' },
    { local: 'startsAt', remote: 'starts_at', kind: 'day' },
    { local: 'endsAt', remote: 'ends_at', kind: 'day' },
    { local: 'status', remote: 'status', kind: 'text' },
    ...TIMESTAMPS,
  ],
  entries: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'goalId', remote: 'goal_id', kind: 'text' },
    { local: 'dayKey', remote: 'day_key', kind: 'text' },
    { local: 'loggedAt', remote: 'logged_at', kind: 'timestamp' },
    { local: 'value', remote: 'value', kind: 'number' },
    { local: 'skipped', remote: 'skipped', kind: 'bool' },
    { local: 'skipReason', remote: 'skip_reason', kind: 'text' },
    { local: 'backfilled', remote: 'backfilled', kind: 'bool' },
    { local: 'title', remote: 'title', kind: 'text' },
    { local: 'link', remote: 'link', kind: 'text' },
    ...TIMESTAMPS,
  ],
  checkpoints: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'goalId', remote: 'goal_id', kind: 'text' },
    { local: 'title', remote: 'title', kind: 'text' },
    { local: 'position', remote: 'position', kind: 'number' },
    { local: 'targetDate', remote: 'target_date', kind: 'day' },
    { local: 'hitAt', remote: 'hit_at', kind: 'timestamp' },
    { local: 'notes', remote: 'notes', kind: 'text' },
    ...TIMESTAMPS,
  ],
  rescopes: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'goalId', remote: 'goal_id', kind: 'text' },
    { local: 'fromTarget', remote: 'from_target', kind: 'number' },
    { local: 'toTarget', remote: 'to_target', kind: 'number' },
    { local: 'reason', remote: 'reason', kind: 'text' },
    ...TIMESTAMPS,
  ],
  freezes: [
    { local: 'id', remote: 'id', kind: 'text' },
    { local: 'arcId', remote: 'arc_id', kind: 'text' },
    { local: 'earnedForWeek', remote: 'earned_for_week', kind: 'text' },
    { local: 'consumedForDayKey', remote: 'consumed_for_day_key', kind: 'text' },
    ...TIMESTAMPS,
  ],
};

export type Row = Record<string, unknown>;

/** Local SQLite row → the payload pushed to Supabase. `user_id` is deliberately absent. */
export function toRemote(table: SyncTable, local: Row): Row {
  const out: Row = {};
  for (const field of TABLE_FIELDS[table]) {
    const value = local[field.local];
    if (value === undefined) continue;

    if (value === null) {
      out[field.remote] = null;
      continue;
    }

    switch (field.kind) {
      case 'timestamp':
        out[field.remote] = toIso(value as string);
        break;
      case 'bool':
        // SQLite stores 0/1; Drizzle's mode:'boolean' usually hands back a real boolean, but a
        // row read through a raw path can still carry the integer.
        out[field.remote] = value === true || value === 1;
        break;
      case 'numberArray':
        // Drizzle mode:'json' already parses to an array. A raw string can still arrive here.
        out[field.remote] = typeof value === 'string' ? safeParseArray(value) : value;
        break;
      default:
        out[field.remote] = value;
    }
  }
  return out;
}

/** A Supabase row → the shape SQLite stores. `user_id` and `synced_at` are dropped. */
export function fromRemote(table: SyncTable, remote: Row): Row {
  const out: Row = {};
  for (const field of TABLE_FIELDS[table]) {
    const value = remote[field.remote];
    if (value === undefined) continue;

    if (value === null) {
      out[field.local] = null;
      continue;
    }

    switch (field.kind) {
      case 'timestamp':
        out[field.local] = toIso(value as string);
        break;
      case 'bool':
        out[field.local] = value === true || value === 1;
        break;
      case 'numberArray':
        out[field.local] = typeof value === 'string' ? safeParseArray(value) : value;
        break;
      case 'number':
        // Postgres `numeric` comes back as a string over the wire to preserve precision; SQLite's
        // `real` needs an actual number, and a string here would poison every sum in
        // lib/derive/progress.ts.
        out[field.local] = typeof value === 'string' ? Number(value) : value;
        break;
      default:
        out[field.local] = value;
    }
  }
  return out;
}

function safeParseArray(value: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as number[]) : null;
  } catch {
    return null;
  }
}
