# Rule 05 — Database, Schema & Sync

Two databases, one schema shape. **SQLite (Drizzle) is the source of truth; Supabase mirrors
it.** Keep the two definitions structurally identical so the sync engine stays a dumb row
copier.

---

## 1. Tables

```
arcs        ─┬─ goals ─┬─ entries
             │         ├─ checkpoints
             │         └─ rescopes
             └─ freezes
sync_queue   (local only)
profiles     (Supabase only)
```

### Standard columns — every table

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
created_at  timestamptz NOT NULL DEFAULT now(),
updated_at  timestamptz NOT NULL DEFAULT now()   -- required here, unlike sibling projects
```

**`DEFAULT auth.uid()` on `user_id` is not optional.** Client mutations omit `user_id` from
the insert payload and rely on this default. A table without it inserts `NULL`, which the RLS
`WITH CHECK` correctly rejects — but the error surfaces as a misleading
`new row violates row-level security policy` rather than a NOT NULL violation. That is a
genuinely confusing thing to debug from the client. **Verify the column list against
`information_schema.columns` before applying a new table's SQL** — not from memory, not from
this doc alone.

**`updated_at` IS required on every table here.** Sibling projects omit it; Garra needs it
because last-write-wins sync is impossible without it.

⚠️ **`updated_at` is client-authoritative. Never put a trigger on it.** This rule said the
opposite until Phase 8, and the trigger it prescribed **inverted LWW**:

```
10:00  Device A edits a goal offline.          A.updated_at = 10:00
10:02  Device B edits it, pushes.              remote.updated_at = 10:02
10:30  A comes online and pushes its OLDER row → trigger stamps 10:30
10:31  B pulls, sees 10:30 > 10:02, and discards its own newer edit.
```

The stale device wins and the fresher edit is destroyed — and for a phone that was in a gym
with no signal, that's the *normal* path, not a rare race. Two columns, two owners:

| Column | Owner | Purpose |
|---|---|---|
| `updated_at` | the **client**, sent explicitly on every write | LWW conflict resolution |
| `synced_at` | the **server**, `DEFAULT now()` + trigger | the pull watermark |

```sql
-- synced_at, NOT updated_at
CREATE TRIGGER set_synced_at BEFORE UPDATE ON [table]
  FOR EACH ROW EXECUTE FUNCTION moddatetime(synced_at);
```

A server-owned watermark is also the only sound one: if the watermark read a client-supplied
timestamp, a device with a slow clock could write rows stamped *older* than the watermark and
they would never be pulled. `synced_at` is local-only-absent — it never enters SQLite, because
a local copy would invite someone to read it as truth.

Applied in `10-auth-and-sync.md` §8.0, which holds the full SQL.

### Key columns by table

| Table | Notable columns |
|---|---|
| `arcs` | `title`, `starts_at date`, `ends_at date`, `status` (`draft`/`active`/`archived`), `timezone` |
| `goals` | `arc_id`, `type` (`habit`/`accumulate`/`ship`/`milestone`), **`direction` (`up`/`down`)**, `accent`, `icon`, `is_main bool`, `target_amount numeric`, `unit`, `starting_value`, `cadence_mode`, `times_per_week`, `days_of_week int[]`, `interval_days`, `session_target`, `est_minutes`, `pace_basis`, `quick_add numeric[]`, `item_noun`, `ends_at date NULL`, `status` (`active`/`paused`/`archived`) |
| `entries` | `goal_id`, **`day_key text`** (`YYYY-MM-DD`, post-rollover), `logged_at timestamptz`, `value numeric NULL`, `skipped bool`, `skip_reason`, `backfilled bool`, `title`, `link` |
| `checkpoints` | `goal_id`, `title`, `position int`, `target_date NULL`, `hit_at NULL`, `notes` |
| `rescopes` | `goal_id`, `from_target`, `to_target`, `reason`, `created_at` — append-only audit |
| `freezes` | `arc_id`, `earned_for_week text`, `consumed_for_day_key NULL` |
| `sync_queue` | local only: `table_name`, `row_id`, `op`, `payload jsonb`, `attempts`, `last_error` |

### Three columns that exist purely to avoid a future migration

- **`goals.direction`** (`'up'` \| `'down'`, default `'up'`) — the ⊖ Limit goal type is
  post-v1, but retrofitting an inverted comparison across the whole derivation layer is
  expensive. Add the column now, ignore it in v1.
- **`goals.ends_at`** nullable — a goal may end before the arc does. This is the release valve
  that makes the one-active-arc constraint tolerable.
- **`checkpoints` on any goal type** — a Milestone goal is just a goal whose only content is
  checkpoints. Don't special-case the table by type.

### Uniqueness

```sql
CREATE UNIQUE INDEX entries_goal_day ON entries (goal_id, day_key)
  WHERE skipped = false;
```

One value entry per goal per day makes sync replay idempotent and makes the mosaic a simple
lookup. **Preserve this property** — if a feature needs multiple entries per day (e.g. two
rides), aggregate into the single row's `value` rather than adding rows.

---

## 2. RLS

**Enable RLS in the same migration that creates the table.** Never "add it later."

```sql
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own [records]"
  ON [table] FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
```

- Wrap `auth.uid()` in `(select ...)` in **both** clauses. The unwrapped form re-evaluates per
  row and Supabase's performance advisor flags it (`auth_rls_initplan`).
- Write `WITH CHECK` explicitly even though it duplicates `USING`. `USING` governs which rows
  are visible; `WITH CHECK` governs what a new or updated row may contain. `FOR ALL` silently
  reuses `USING` when `WITH CHECK` is absent — which works only while the two are identical,
  and desyncs the moment someone edits one.
- Child tables (`entries`, `checkpoints`) carry their own `user_id` and their own policy.
  **Do not rely on a join to the parent** — that's slower and breaks on orphan rows.
- Garra has **no public or unauthenticated read path**. Don't add a token-based policy unless
  sharing outside the app is genuinely required. The Finale shares a rendered image, not a row.

---

## 3. Migrations

- **Drizzle owns local migrations** — generated, committed, and applied on app boot.
- **Supabase SQL is written in full inside the feature doc**, then pasted into the SQL editor.
  There are no committed Supabase migration files, so *the feature doc's SQL block is the
  only durable record of that schema change.* Once applied, do not let it drift.
- `.claude/features/00-index.md` carries the running schema reference. Update it in the same
  change as the migration, not afterwards.
- Local and remote schemas must stay structurally identical. When they diverge, sync breaks in
  ways that look like data loss.

---

## 4. What never goes in the database

- Any derived number: current totals, streak counts, consistency %, status, required rate,
  load hours. All computed in `lib/derive/`. See `03-state-and-data.md` §1.
- Slang or user-facing copy. Tables and enums stay neutral (`arcs`, `goals`, `entries`,
  `status='slipping'`), and `lib/copy.ts` maps them to voice.
- Anything the client can recompute from `entries`.

---

## 5. Sync

- **Outbox only.** Local write → `sync_queue` row → background drain. The UI never awaits it.
- **Last-write-wins per row** on `updated_at`. Single user across their own devices; full CRDT
  machinery is unwarranted and should not be introduced.
- `entries` keyed on `(goal_id, day_key)` are idempotent on replay — this is why the unique
  index matters.
- On sign-in after local-only use, **upsert the local arc up to Supabase**; never pull-then-
  overwrite, or the "keep it on this phone" path loses data on account creation.
- `rescopes` and `entries` are append-mostly; prefer inserts over updates so replay stays safe.
- A failed sync is invisible to the user except as a quiet line in Settings. It is never a
  banner and never blocks an action.
