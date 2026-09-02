import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Local SQLite schema — the source of truth (03-state-and-data.md §1). No `user_id` column
// anywhere here: RLS has no meaning in a single-user local file, and the sync engine (Phase 8)
// attaches it on the way up to Supabase, not before. See 05-database.md §1 for the full
// column reference this mirrors.

export const arcs = sqliteTable('arcs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startsAt: text('starts_at').notNull(), // date, 'YYYY-MM-DD'
  endsAt: text('ends_at').notNull(),
  status: text('status', { enum: ['draft', 'active', 'archived'] })
    .notNull()
    .default('draft'),
  timezone: text('timezone').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  arcId: text('arc_id')
    .notNull()
    .references(() => arcs.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['habit', 'accumulate', 'ship', 'milestone'] }).notNull(),
  // Missing since Phase 1.5 — every goal needs a display name and nothing else in the schema
  // holds one. Found while wiring the first real goal-creation mutation in Phase 4; fixed here
  // rather than worked around (see 05-onboarding-arc-creation.md's Implementation Notes).
  title: text('title').notNull(),
  direction: text('direction', { enum: ['up', 'down'] })
    .notNull()
    .default('up'),
  accent: text('accent').notNull(),
  icon: text('icon').notNull(),
  isMain: integer('is_main', { mode: 'boolean' }).notNull().default(false),
  targetAmount: real('target_amount'),
  unit: text('unit'),
  startingValue: real('starting_value'),
  cadenceMode: text('cadence_mode'),
  timesPerWeek: integer('times_per_week'),
  daysOfWeek: text('days_of_week', { mode: 'json' }).$type<number[]>(),
  intervalDays: integer('interval_days'),
  sessionTarget: real('session_target'),
  estMinutes: integer('est_minutes'),
  paceBasis: text('pace_basis'),
  quickAdd: text('quick_add', { mode: 'json' }).$type<number[]>(),
  itemNoun: text('item_noun'),
  // Nullable: null means "starts with the arc". Mirrors endsAt's release-valve role — a goal
  // added on day 40 must not be judged against the whole arc's expected pace, and it anchors
  // its own every_n_days cadence. Added Phase 5.0; see 06-home-and-logging.md §5.0.2.
  startsAt: text('starts_at'),
  endsAt: text('ends_at'),
  status: text('status', { enum: ['active', 'paused', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    goalId: text('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    dayKey: text('day_key').notNull(),
    loggedAt: text('logged_at').notNull(),
    value: real('value'),
    skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
    skipReason: text('skip_reason'),
    backfilled: integer('backfilled', { mode: 'boolean' }).notNull().default(false),
    title: text('title'),
    link: text('link'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    uniqueIndex('entries_goal_day')
      .on(t.goalId, t.dayKey)
      .where(sql`${t.skipped} = 0`),
  ],
);

export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  targetDate: text('target_date'),
  hitAt: text('hit_at'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const rescopes = sqliteTable('rescopes', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  fromTarget: real('from_target'),
  toTarget: real('to_target'),
  reason: text('reason'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  // Remote `rescopes` has had `updated_at` since Phase 1.5; the local table didn't, and
  // last-write-wins sync keys on it (05-database.md §3 requires structural identity). Added
  // Phase 5.0 — the table is append-only in practice, but the column has to exist to match.
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const freezes = sqliteTable('freezes', {
  id: text('id').primaryKey(),
  arcId: text('arc_id')
    .notNull()
    .references(() => arcs.id, { onDelete: 'cascade' }),
  earnedForWeek: text('earned_for_week').notNull(),
  consumedForDayKey: text('consumed_for_day_key'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Local-only, never synced (05-onboarding-arc-creation.md §4.1.2): the display name captured
// in onboarding, before Phase 8's real `profiles` table (and a real account) exist. Always
// exactly one row, id fixed to 'local'.
export const localProfile = sqliteTable('local_profile', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Local only. The sync watermark could live in MMKV, but `lastError` wants to survive a cache
// clear — a sync that has been failing for three days is the one thing in this table a human
// might need to read. One row, id fixed to 'singleton'.
//
// There is deliberately NO local `synced_at` mirroring the remote column: it is server-owned
// (see 10-auth-and-sync.md, "The defect that has to be fixed first"), and a local copy would
// invite someone to read it as truth. The watermark below is the only place it lands.
export const syncState = sqliteTable('sync_state', {
  id: text('id').primaryKey(),
  // null = signed out. A mismatch against the current session means a *different* account is
  // signing in on this device, which must not merge the two datasets — see §8.4.
  userId: text('user_id'),
  // ISO-8601. Max remote `synced_at` seen across all tables in the last fully clean cycle.
  watermark: text('watermark'),
  lastSyncedAt: text('last_synced_at'),
  lastError: text('last_error'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  rowId: text('row_id').notNull(),
  op: text('op', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});
