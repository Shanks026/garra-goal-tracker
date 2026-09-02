# Feature 10 — Auth & Sync

**Roadmap phase**: 8 · **Status**: ✅ 8.0–8.5 complete (code) · 🔒 8.6 on hold
**Screens**: `05` Sign up (the designed one, finally wired). Everything else is a design gap —
see §Design.

---

## Context

Phases 0–7 built an app that never touches the network. That was deliberate
(`IMPLEMENTATION.md`: *"Auth is late, on purpose"*), and it means the local-first claim is
real rather than aspirational — there is no network code to accidentally depend on.

This phase adds the second half: **the arc survives a lost phone.** One Supabase project
provides both auth and the database. The guarantee that must not bend is the one from
`CLAUDE.md`: *no user action ever awaits the network.* Sync is a background process that the
UI cannot see, cannot block on, and cannot be broken by.

**The starting state, verified rather than assumed:**

| Fact | Verified how |
|---|---|
| `sync_queue` exists locally since Phase 1 and **has zero writers** | `grep` across `app hooks lib components` |
| Every row written in Phases 4–7 is therefore invisible to the outbox | same |
| Remote has all 6 tables, RLS enabled on each, 0 rows | `list_tables` |
| Remote has **no `profiles` table** despite `rules/05` §1 listing one | `list_tables` |
| `moddatetime` triggers stamp `updated_at` on all 6 tables | `pg_trigger` query |
| No local `user_id` column anywhere (by design — `schema.ts` header) | `schema.ts` |
| `expo-secure-store` 15.0.8 installed, plugin already in `app.config.ts` | `package.json` |
| `@supabase/supabase-js` 2.112.4 installed, never imported | `package.json` |
| `expo-auth-session` **not** installed | `package.json` |
| No `.env` file exists; `garra-dev/.env` is gitignored by the root `.gitignore` | `git check-ignore` |

So the work is: fix one schema defect, build the sync engine the outbox was always meant to
feed, and wire real auth — in that order.

---

## The defect that has to be fixed first

`moddatetime` on `updated_at` **inverts last-write-wins.** `rules/05` §2 mandates the trigger
and `rules/05` §5 mandates LWW on `updated_at`; the two rules are in direct conflict, and the
trigger wins at runtime.

```
10:00  Device A edits a goal offline.          A.updated_at = 10:00
10:02  Device B edits the same goal, pushes.   remote.updated_at = 10:02
10:30  Device A comes online and pushes.       trigger fires → remote.updated_at = 10:30
10:31  Device B pulls. 10:30 > 10:02, so it accepts A's 10:00 edit
       and discards its own newer 10:02 edit.
```

The stale device wins, silently, and the newer edit is gone. This is not a theoretical race —
it is the *normal* path for a phone that was in a gym with no signal, which is the exact
scenario this app is designed around.

**The fix is two columns with two different owners:**

| Column | Owner | Used for |
|---|---|---|
| `updated_at` | **the client**, always sent explicitly, never touched by a trigger | LWW conflict resolution |
| `synced_at` | **the server**, `DEFAULT now()` + trigger on update, never sent by a client | the pull watermark |

`moddatetime` isn't removed, it's **retargeted** to `synced_at`. This also fixes a second,
subtler bug that a single column cannot avoid: if the pull watermark read a
client-supplied timestamp, a device with a slow clock could write a row stamped *older* than
our watermark and we would never pull it. A server-owned `synced_at` is monotonic with respect
to the server, so the watermark is sound.

**Accepted risk:** LWW on client clocks means a device with a badly wrong clock wins its
conflicts. `rules/03` §7 explicitly sanctions LWW without CRDT machinery for a single-user
app, and clamping future timestamps adds a failure mode (a legitimately fast clock silently
losing writes) worse than the one it prevents. Not building it. Recorded here so it is a
decision rather than an oversight.

---

## The sync cycle, and why it needs no RPC

`pull → resolve → push`, in that order. The ordering *is* the conflict resolution:

1. **Pull** rows where `synced_at > watermark`.
2. **Resolve** locally: for each pulled row, compare `remote.updated_at` vs
   `local.updated_at`. Newer wins. If remote wins, write it locally **and drop any queued
   outbox row for it** — that queued edit has lost, and pushing it would resurrect stale data.
3. **Push** whatever outbox rows survive, via a plain `.upsert()`.

Because a losing local edit is discarded in step 2, step 3 never needs a conditional
`ON CONFLICT ... WHERE excluded.updated_at > t.updated_at`. That removes the need for a
Postgres function, dynamic SQL, or a whitelist — a straight `supabase.from(t).upsert(rows)` is
correct. `rules/03` §7 warns specifically against reaching for machinery here; this is that
warning honored.

The TOCTOU window between step 2 and step 3 is milliseconds wide, single-user, and self-heals
on the next cycle. It is not worth a transaction spanning a network call.

**Outbox rows do not snapshot the payload.** They store `(table_name, row_id, op)` and the
drain reads the row *fresh* from SQLite. Three consequences, all good:

- An entry logged and then edited twice yields three queue rows that dedupe to one push of the
  current state, rather than three pushes replaying a stale sequence.
- Replay after a crash is naturally idempotent — re-reading the same row produces the same
  upsert.
- A delete needs no payload at all, only the id.

`sync_queue.payload` is `NOT NULL`, so it holds `{}` for insert/update. The column stays for a
future op that genuinely needs it rather than being dropped in a migration.

---

## Database

### Supabase SQL — ✅ applied 2026-09-02

`rules/05` §3: there are no committed Supabase migration files, so **this block is the only
durable record of this change.** Applied via MCP `apply_migration`, name
`add_synced_at_and_profiles`, and verified by the two queries below it. Do not let it drift.

```sql
-- ── 1. synced_at: server-owned pull watermark, on all six synced tables ──────────
alter table public.arcs        add column synced_at timestamptz not null default now();
alter table public.goals       add column synced_at timestamptz not null default now();
alter table public.entries     add column synced_at timestamptz not null default now();
alter table public.checkpoints add column synced_at timestamptz not null default now();
alter table public.rescopes    add column synced_at timestamptz not null default now();
alter table public.freezes     add column synced_at timestamptz not null default now();

-- ── 2. Retarget moddatetime from updated_at to synced_at ─────────────────────────
-- updated_at becomes client-authoritative: LWW is impossible if the server rewrites it.
-- See "The defect that has to be fixed first" above for the exact data-loss sequence.
drop trigger if exists set_updated_at on public.arcs;
drop trigger if exists set_updated_at on public.goals;
drop trigger if exists set_updated_at on public.entries;
drop trigger if exists set_updated_at on public.checkpoints;
drop trigger if exists set_updated_at on public.rescopes;
drop trigger if exists set_updated_at on public.freezes;

create trigger set_synced_at before update on public.arcs
  for each row execute function moddatetime(synced_at);
create trigger set_synced_at before update on public.goals
  for each row execute function moddatetime(synced_at);
create trigger set_synced_at before update on public.entries
  for each row execute function moddatetime(synced_at);
create trigger set_synced_at before update on public.checkpoints
  for each row execute function moddatetime(synced_at);
create trigger set_synced_at before update on public.rescopes
  for each row execute function moddatetime(synced_at);
create trigger set_synced_at before update on public.freezes
  for each row execute function moddatetime(synced_at);

-- ── 3. Watermark indexes — every pull is `where synced_at > $1 order by synced_at` ─
create index arcs_synced_at_idx        on public.arcs        (user_id, synced_at);
create index goals_synced_at_idx       on public.goals       (user_id, synced_at);
create index entries_synced_at_idx     on public.entries     (user_id, synced_at);
create index checkpoints_synced_at_idx on public.checkpoints (user_id, synced_at);
create index rescopes_synced_at_idx    on public.rescopes    (user_id, synced_at);
create index freezes_synced_at_idx     on public.freezes     (user_id, synced_at);

-- ── 4. entries uniqueness must match SQLite, or replay breaks ────────────────────
-- Local has `uniqueIndex('entries_goal_day').on(goalId, dayKey).where(skipped = 0)`.
-- Without the same partial index remotely, `.upsert()` on conflict target (goal_id, day_key)
-- has nothing to conflict on and every replay inserts a duplicate row.
create unique index if not exists entries_goal_day
  on public.entries (goal_id, day_key) where skipped = false;

-- ── 5. profiles — rules/05 §1 lists it; it has never existed ─────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- `id` is the user key here, not a separate user_id — profiles is 1:1 with auth.users.
create policy "Users manage own profile"
  on public.profiles for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger set_synced_at before update on public.profiles
  for each row execute function moddatetime(synced_at);
```

**Verify after applying** (`rules/05` §1 says verify against `information_schema`, not from
memory):

```sql
select table_name, column_name from information_schema.columns
where table_schema='public' and column_name='synced_at' order by table_name;
-- expect 7 rows: arcs, checkpoints, entries, freezes, goals, profiles, rescopes

select c.relname, t.tgname, p.proname from pg_trigger t
join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not t.tgisinternal order by c.relname;
-- expect 7 × set_synced_at, and ZERO set_updated_at
```

### Local Drizzle migration

`synced_at` is **not** added locally. It is a server-owned column with no local meaning; the
pull watermark lives in MMKV (§8.3). Adding it to `schema.ts` would invite someone to read it
as truth.

One local table is added — the sync watermark and status could live in MMKV alone, but the
last-error string wants to survive a cache clear:

```ts
// lib/db/schema.ts — local only, never synced
export const syncState = sqliteTable('sync_state', {
  id: text('id').primaryKey(),            // fixed 'singleton'
  userId: text('user_id'),                // null = signed out
  watermark: text('watermark'),           // ISO; max synced_at seen across all tables
  lastSyncedAt: text('last_synced_at'),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});
```

⚠️ **Standing rule #21**: read the generated migration before running it. Drizzle regenerates
table-recreate SQL for SQLite when indexes are involved, and `0003` shipped two real defects
this way (a `SELECT` from the old table listing columns that didn't exist, and a mid-file
`PRAGMA foreign_keys=ON` landing before a `DROP TABLE`). A pure `CREATE TABLE` for a new table
should be safe, but confirm rather than assume.

---

## Design

Screen `05` (Sign up) is the only designed surface here, and it was built in Phase 4 as a
skippable stub. Everything else is a **design gap** — `rules/01` §9 governs: extend an existing
pattern, name it, don't invent a visual language.

| Surface | Pattern extended |
|---|---|
| OTP code entry | The **log sheet shell** (`sheets/`), like the rescope sheet in Phase 6. Six-digit code, not the numpad — this is text entry, not value entry, so the 10-second rule doesn't apply and the OS keyboard with `textContentType="oneTimeCode"` is *better* (iOS autofills it from the email). |
| Sign-in from Settings | Standard inset grouped list row (`ListGroup`/`ListRow`), same as every other settings row. |
| Sync status | **One quiet `ListRow` in Settings**, value column only. `rules/03` §7: never a banner, never a blocker. |
| Signed-in identity | A `ListRow` showing the email, with `Sign out` below it. |
| Disabled Google / Apple | The canvas's screen `05` draws both as outline buttons. They stay, `disabled`, using the `textQuaternary` token that `rules/01` §1 already designates for disabled. No "coming soon" badge — that's chrome inventing a new element for no data. |

**No new color.** Sync status is `textTertiary` text — not a green dot, not an amber dot. A
failed sync is not a warning state; amber means *slipping*, and conflating "your phone can't
reach the internet" with "you're behind on your goals" would be a direct violation of the
governing law. `rules/01` §0 corollary: color on non-data is a bug.

---

## Risks

| Risk | Handling |
|---|---|
| **SecureStore's ~2048-byte value limit** vs a Supabase session (access JWT + refresh token + user object, routinely 2–4 KB) | Chunked adapter, §8.1. This is the single most likely thing to fail silently — SecureStore warns rather than throws on Android. |
| **Stale chunks** when a new session needs fewer chunks than the old one | The manifest stores the count; the writer deletes indices `n..oldN` before writing. Classic bug in every hand-rolled chunker; called out so it's tested. |
| Local timestamps are SQLite `'YYYY-MM-DD HH:MM:SS'` (UTC, no zone marker); Postgres `timestamptz` parses them against the *session* zone | The mapper appends an explicit `Z`. Pure and unit-tested — a silent 5.5-hour shift here would corrupt every `updated_at` comparison and therefore every conflict. |
| `days_of_week` / `quick_add` are JSON **text** locally, real `int[]`/`numeric[]` remotely | Mapper converts both directions. Drizzle already hands back `number[]`, so push is a pass-through; pull must not store the array raw. |
| `expo-auth-session` is a **new native dependency** → new dev-client build | Confined to §8.6, which is gated on external config anyway. **§8.0–8.5 add no dependencies and run on the existing build.** |
| Supabase's built-in email sender is rate-limited (~2–3/hour, free tier) | Fine for testing. Production needs custom SMTP — out of scope, noted in §8.4. |
| A first sign-in that pulls before pushing destroys local-only data | `rules/05` §5. §8.4 makes the first cycle **push-only**, with an explicit test. |
| Sign-out wiping local data would make "keep it on this phone" a lie | Sign-out clears the session and the watermark, and leaves SQLite untouched. §8.4. |

**No dependency is added in §8.0–8.5.** `rules/06` §6 requires raising new deps in the doc;
the only one is `expo-auth-session` + `expo-web-browser` in §8.6, both already named by
`IMPLEMENTATION.md`'s Phase 8, so they are pre-approved rather than a new decision.

---

## Phases

### Phase 8.0 — Fix LWW at the schema level ✅ Complete

No app code. The schema change above, applied and verified.

- [x] Supabase SQL applied via MCP `apply_migration` (`add_synced_at_and_profiles`)
- [x] Both verification queries return the expected rows (7 × `synced_at`, 7 × `set_synced_at`, 0 × `set_updated_at`)
- [x] `entries_goal_day` partial unique index exists remotely and matches SQLite's predicate
- [x] `profiles` exists with RLS enabled and the `(select auth.uid()) = id` policy in both `USING` and `WITH CHECK`
- [x] `sync_state` added to `schema.ts`; migration `0004_eminent_goblin_queen.sql` generated and
      **read** (standing rule #21) — a clean `CREATE TABLE`, no table recreation, no stray PRAGMA
- [ ] Migration actually applied — **on-device, pending**. It runs through `useMigrations` at
      boot, which has never executed on hardware
- [x] `00-index.md` schema reference updated in the same change (`rules/05` §3)
- [x] `rules/05` §2 amended to record that `moddatetime` targets `synced_at`, not `updated_at`, and why — a rule that lags the code is worse than no rule

**Done when**: the remote schema can support correct LWW. Nothing user-visible.

---

### Phase 8.1 — Supabase client & chunked session storage ✅ Complete

- [x] `.env` created with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
      (the modern `sb_publishable_…` key, not the legacy anon JWT)
- [x] `.env.example` committed with placeholder values only — it is the one env file git tracks
- [x] `lib/secureSessionStore.ts` — chunked `SecureStore` adapter implementing
      `{ getItem, setItem, removeItem }`:
      - 1800-byte chunks (headroom under the 2048 limit)
      - manifest at `key` holds the chunk count; chunks at `key.0…key.n`
      - **`setItem` deletes stale chunks above the new count**
      - every read/write wrapped — a keychain miss returns `null`, never throws into auth
- [x] `lib/supabase.ts` — `createClient` with `{ auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }`
      (`detectSessionInUrl` must be `false` in React Native; the default is web-oriented)
- [x] `AppState` listener driving `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()` —
      without it the refresh timer runs in the background and burns battery, or dies and the
      session silently expires
- [x] `secureSessionStore.test.ts` — round-trips a 6 KB value; shrinking a 4-chunk value to
      1 chunk leaves no orphans
- [x] `tsc --noEmit` clean, `eslint .` clean

**Done when**: a session-sized string round-trips through SecureStore intact. No auth yet.

---

### Phase 8.2 — The outbox gets its writers ✅ Complete

The retrofit. `enqueueSync` is trivial; wiring it into **every** existing mutation is the work,
and `rules/04` §3 already specifies the call site — `onSettled`, fire-and-forget, never awaited.

- [x] `lib/sync/outbox.ts` — `enqueueSync({ table, rowId, op })`, `pendingCount()`,
      `dequeue(ids)`, `dropQueuedFor(table, rowId)` (used by pull-side resolution)
- [x] Wired into every mutation that writes a synced table:
      - [ ] `useArcBuilder` — arc, goals, checkpoints on commit
      - [ ] `useLogEntry` (insert **and** update paths — the upsert honoring `entries_goal_day`)
      - [ ] `useUndoEntry` (`op: 'delete'`)
      - [ ] `useSkipDay`
      - [ ] `useLogEverything` (one enqueue per goal touched)
      - [ ] `useSetGoalStatus`
      - [ ] `useHitCheckpoint`
      - [ ] `useUpdateGoal`
      - [ ] `useRescopeGoal` (goal update **and** the `rescopes` audit insert, in the same transaction)
- [x] `local_profile` and `sync_queue` are never enqueued
- [x] ~~Every mutation sets `updated_at` explicitly~~ — **superseded, see Implementation Notes.**
      Inserts still take SQLite's `current_timestamp` default, so local `updated_at` genuinely
      has two formats in circulation. Handled where it can't be missed: `parseTimestamp()`
      normalises both, with tests proving they resolve to the same instant
- [x] ~~`outbox.test.ts`~~ → **`resolve.test.ts`.** The dedupe *decision* moved into the pure
      `collapseQueue()` so it could be tested without mocking Drizzle (standing rule #20);
      `outbox.ts` is left as thin SQL
- [x] **No mutation awaits `enqueueSync`**, verified by reading each call site
- [x] `tsc`, `eslint`, `jest` clean

**Done when**: every write in the app appends to `sync_queue`. Still nothing leaves the device —
the queue just stops being a dead table.

---

### Phase 8.3 — The mapper and the drain ✅ Complete

- [x] `lib/sync/mapping.ts` — pure, no I/O, per-table `toRemote` / `fromRemote`:
      - `'YYYY-MM-DD HH:MM:SS'` ⇄ ISO-8601 with explicit `Z`
      - JSON-text arrays ⇄ real arrays (`days_of_week`, `quick_add`)
      - `user_id` **omitted** on push (relies on `DEFAULT auth.uid()`, `rules/05` §1) and
        stripped on pull
      - `synced_at` stripped on pull — it never enters SQLite
      - booleans (Drizzle `mode: 'boolean'` ⇄ Postgres `boolean`)
- [x] `lib/sync/state.ts` — watermark + status read/write over `sync_state`
- [x] `lib/sync/engine.ts` — `syncNow()`: pull → resolve → push, per §The sync cycle
      - pull each table `where synced_at > watermark order by synced_at`
      - LWW compare on `updated_at`; remote wins ⇒ write local **and** `dropQueuedFor`
      - push surviving outbox rows via `.upsert()`, reading each row fresh
      - `entries` upserts specify `onConflict: 'goal_id,day_key'`
      - advance the watermark to the max `synced_at` seen, **only** after a fully clean cycle
      - **never throws** — every failure lands in `sync_state.lastError` and returns
      - a mutex so two triggers can't drain concurrently
- [x] Triggered on: sign-in, app foreground, and after a successful mutation settles. **Never on
      an interval** (`rules/03` §3)
- [x] Query cache invalidated after a pull that changed anything, so the UI reflects pulled rows
- [x] `mapping.test.ts` — round-trip every table; the UTC conversion asserted explicitly
- [x] **Replay idempotency** (`rules/06` §3 requires this) — in `resolve.test.ts` rather than
      `engine.test.ts`, for the same reason as above: `engine.ts` imports both SQLite and
      Supabase, so its decisions were extracted into pure `resolve.ts` where a test can reach
      them. Covers: repeated upserts collapse to one; draining twice is identical; a later delete
      beats earlier upserts; a later upsert beats an earlier delete
- [x] `tsc`, `eslint`, `jest` clean

**Done when**: `syncNow()` is correct in tests. It cannot run yet — there is no session.

---

### Phase 8.4 — Auth: email OTP ✅ Complete (on-device verification pending)

**Email OTP, not magic link.** `signInWithOtp` + `verifyOtp` with a 6-digit code needs no
redirect-URL allowlisting, no deep-link handler, and no browser — so it works with zero
Supabase dashboard configuration. It is also strictly better on mobile: a magic link opened on
a laptop lands the session on the wrong device, while a code can be typed anywhere.

- [x] `hooks/useAuth.ts` — session/user from `onAuthStateChange`, `null` when signed out
- [x] `hooks/useSignIn.ts` — `sendCode(email)` / `verifyCode(email, code)`; inline errors only
      (`rules/02` §5 — never a toast for validation)
- [x] `sheets/SignInSheet.tsx` on the log-sheet shell, `useSheetBackHandler` wired
      (`rules/02` §3 — mandatory, and its absence exits the app on Android back)
- [x] `app/(onboarding)/signup.tsx` — the Phase 4 stub given real handlers; **"Keep it on this
      phone" still skips**, unchanged
- [x] **Google and Apple buttons rendered `disabled`** (user decision — §8.6 is on hold).
      They keep their place in the layout so it doesn't reflow later, but they cannot be pressed.
      Phase 4 wired all three CTAs to the same local-activation handler; that shortcut ends here —
      pressing Google must do *nothing*, not silently activate an arc.
- [x] `Button` gains a real `disabled` visual state: label drops to `textQuaternary`
      (`rules/01` §1 comments that token "captions, disabled" — it already exists for this),
      container loses its fill, and `PressableScale` skips the press spring.
      `accessibilityState={{ disabled: true }}` so VoiceOver says so rather than reading a
      button that does nothing.
- [x] Settings: signed-out shows `Sign in`; signed-in shows the email + `Sign out`
- [x] **First sign-in is push-only.** If `sync_state.userId` was null and local rows exist, the
      first cycle skips the pull entirely and pushes local state up, then sets the watermark.
      `rules/05` §5 — never pull-then-overwrite
- [x] `local_profile.name` upserted to `profiles` on first sign-in
- [x] Sign-out clears the session, `sync_state`, and the drained queue — **and leaves every
      SQLite row in place**
- [x] Signing in as a *different* user on the same device does not merge the two datasets
      (guard on `sync_state.userId` mismatch → refuse and explain, rather than silently
      uploading one user's arc into another's account)
- [x] `tsc`, `eslint`, `jest` clean

- [ ] A code arrives by email and verifies — **on-device, pending**
- [ ] Local data lands in Supabase after that first sign-in — **on-device, pending**

**Done when**: a code arrives by email, verifies, and local data lands in Supabase.
**On-device — pending** (batched pass).

---

### Phase 8.5 — Sync status & RLS verification ✅ Complete (on-device verification pending)

- [x] One Settings `ListRow`: `Synced 2m ago` / `12 pending` / `Last sync failed`. Value column,
      `textTertiary`, no color, no icon, not tappable-to-retry (the next foreground retries)
- [x] `hooks/useSyncStatus.ts` — reads `sync_state` + `pendingCount()`
- [x] **RLS verified from a real client** — every table plus the new `profiles` returns `[]` to
      an unauthenticated REST request carrying only the publishable key
- [ ] **A second signed-in account sees nothing** — **on-device, pending.** Needs two real
      accounts and two inboxes; the unauthenticated check above is the half that can be done
      from here. `IMPLEMENTATION.md`'s Phase 8 requires this explicitly
- [x] `get_advisors` run after the schema change — no new findings. The two pre-existing
      `rls_auto_enable` warnings were investigated and closed as **not exploitable**: see
      Implementation Notes
- [ ] Airplane mode: log, kill the app, relaunch, data survives, no error surfaces anywhere —
      **on-device, pending**
- [ ] Both themes rendered — **on-device, pending**
- [ ] `rules/06` §8 definition of done walked item by item — the offline and both-themes items
      are **on-device, pending**; everything else is verified

**Done when**: log offline on device A → sign in → it appears on device B; then kill the network
and the app is still fully usable. **On-device — pending** (batched pass; this is the phase's
real done-condition and needs two devices).

---

### Phase 8.6 — Google & Apple OAuth 🔒 **ON HOLD — user decision, 2026-09-02**

**Held by explicit user decision, not by the blockers.** The buttons ship **visibly disabled**
in 8.4; no OAuth code is written. This is the same call made for broader haptics in Phase 5.5 —
the surface stays in place so the layout is final, and the capability arrives when the user
decides it should.

Recorded so the reasoning survives: the external prerequisites below are real and *would* have
gated this phase anyway, which is part of why holding it costs nothing. Nothing in 8.0–8.5
depends on it.

**Prerequisites, for whenever this comes off hold:**

1. **Google** — OAuth 2.0 client IDs in Google Cloud Console (Web + Android; iOS only if an
   iOS build ever exists), then client ID + secret into Supabase → Authentication → Providers →
   Google. The Android client needs the dev build's SHA-1 fingerprint.
2. **Redirect URL** — add `garra://auth/callback` to Supabase → Authentication → URL
   Configuration → Redirect URLs.
3. **Apple** — requires a **paid Apple Developer account and a Mac**. Development is on Windows
   and there is no `ios/` directory. `IMPLEMENTATION.md` notes Apple is *mandatory on iOS if
   Google ships* — that constraint binds at iOS submission, not now.

Then:

- [ ] `expo-auth-session` + `expo-web-browser` installed → **new dev-client build required**
- [ ] `scheme: 'garra'` confirmed in `app.config.ts`
- [ ] `signInWithOAuth` + `WebBrowser.openAuthSessionAsync`, session exchanged via `setSession`
- [ ] Google + Apple buttons un-disabled on screen `05` and in the sign-in sheet

**Done when**: this comes off hold. Not before.

---

## Open questions / deferred

- **Realtime** is not used. Sync runs on sign-in, foreground, and post-mutation. A Realtime
  subscription would be a second sync path to keep correct for a single-user app whose other
  device is usually asleep — not worth it in v1.
- **Deletes of whole arcs/goals** rely on `on delete cascade` remotely, but the outbox enqueues
  only the parent row. A cascade delete of a goal with 90 entries pushes one delete and Postgres
  removes the children — correct remotely, but a *second* device pulls no tombstones for those
  entries. Tombstones are out of scope for Phase 8; recorded because archive-not-delete is the
  app's actual model (`CLAUDE.md`: archives are read-only) and hard deletes are rare.
- **Custom SMTP** for production email deliverability.
- Magic-link / deep-link sign-in as an alternative to OTP, if OTP proves annoying on device.
- `rls_auto_enable()` SECURITY DEFINER advisory — pre-existing, still unaddressed, unrelated to
  this phase.

---

## Implementation Notes

**Phases 8.0–8.5 built in one pass, 2026-09-02.** 8.6 held by user decision.
Verification at close: `tsc --noEmit` clean, `eslint .` clean, **251 tests / 23 suites passing**
(up from 209 / 20).

### Two defects found before writing any sync code

Both would have corrupted data silently, and neither was visible from the feature spec.

**1. `moddatetime` inverted last-write-wins.** Documented at length in *The defect that has to
be fixed first* above. Fixed in 8.0 by splitting the concern into a client-owned `updated_at`
and a server-owned `synced_at`. `rules/05` §2 mandated the trigger this removes, so that rule
was rewritten in the same change — a rule that lags the code is worse than no rule.

**2. Local `updated_at` has two formats in circulation.** Every `db.insert(...)` in the app
omits it and takes SQLite's `current_timestamp` (`'2026-09-02 14:33:01'` — UTC, but zone-less
and space-separated); every `db.update(...)` sets it via `toISOString()`
(`'2026-09-02T14:33:01.123Z'`). Two independent ways that breaks LWW:

- String comparison sorts every space-form value before every ISO one, because `' '` (0x20) <
  `'T'` (0x54). An inserted-never-updated row would lose every conflict regardless of its
  actual time.
- `new Date('2026-09-02 14:33:01')` is parsed as **local** time by JS, not UTC — silently
  shifting the value that decides which edit survives by the device's offset.

Fixed centrally in `parseTimestamp()` rather than by editing six insert sites, because the
defaults can't be removed without a migration and old rows would keep arriving in both forms
either way. Three tests pin the reasoning, including one that asserts the naive string
comparison *is* wrong so the next person doesn't "simplify" it back.

### Deviations from the plan

| Planned | Built | Why |
|---|---|---|
| `outbox.test.ts`, `engine.test.ts` | `resolve.test.ts` | `outbox.ts` and `engine.ts` both import `lib/db/client` → `openDatabaseSync`, which cannot load under Jest (standing rule #20). The *decisions* were extracted into pure `lib/sync/resolve.ts` (`collapseQueue`, `resolveConflict`, `nextWatermark`) and tested there. The SQL and network shells are left thin and untested, which is what `rules/06` §3 prescribes. |
| Every mutation sets `updated_at` explicitly | Normalised in the mapper instead | See defect 2. |
| Magic link | **Email OTP** | A six-digit code needs no redirect-URL allowlisting and no deep-link handler, so it works with zero Supabase dashboard configuration — which is what removed the external blocker from the core path. It is also better on mobile: a magic link opened on a laptop puts the session on the wrong device. |
| `enqueueSync({table, rowId, op})` at call sites | `enqueueUpsert` / `enqueueDelete` | Because the drain re-reads the row and upserts, 'insert' and 'update' are the same remote action. Collapsing them is what lets the dedupe fire at all. |
| Sync triggered from each mutation's `onSettled` | One `MutationCache.onSuccess` | Nine edits replaced by one, and it can't be forgotten on a tenth mutation. Debounced 2s inside `scheduleSync()` so "log everything" on a ten-goal day asks for one drain, not ten. |

### Decisions worth keeping

- **`pull → resolve → push` ordering removed the need for an RPC.** The original plan assumed a
  Postgres function doing `ON CONFLICT … WHERE excluded.updated_at > t.updated_at`, since
  supabase-js's `.upsert()` can't express that condition. Resolving conflicts *before* pushing
  means a losing local edit is already dropped from the outbox, so a plain `.upsert()` is
  correct — no function, no dynamic SQL, no table whitelist.
- **`entries` upserts on `(goal_id, day_key)`, not `id`.** Two devices logging the same day
  generate different UUIDs for what is one entry; conflicting on the primary key would violate
  the partial unique index instead of merging. This is why 8.0 also created that index remotely
  — it existed only in SQLite before.
- **The watermark advances only after a fully clean cycle.** A partial advance would permanently
  skip whatever failed.
- **Sign-out leaves every SQLite row in place.** Clearing them would make "Keep it on this
  phone" false, retroactively.
- **A second account signing in on the same device is refused, not merged** — checked in
  `useVerifyCode` (which signs back out and explains) and again in the engine as a backstop.
- **No color on the sync row.** Amber means *slipping*; dressing "no wifi" as a warning would
  conflate a network condition with being behind on goals (`rules/01` §0).
- **One narrow cast per table in `upsertLocalRow`, not a single wide one.** Standing rule #19
  exists because an `as never` previously hid two real bugs; each cast here asserts a specific
  `$inferInsert` type, and the column names they depend on are guaranteed by `mapping.test.ts`'s
  round-trip rather than by the cast.

### The `rls_auto_enable` advisory — closed, not exploitable

Carried as an open item since Phase 1. Investigated properly this time:
`public.rls_auto_enable()` is `SECURITY DEFINER` and `EXECUTE` *is* granted to `anon` and
`authenticated`, so the advisory is technically accurate. But it `RETURNS event_trigger`, a
pseudo-type PostgREST cannot serialize, and its body calls
`pg_event_trigger_ddl_commands()`, which errors outside an event-trigger context. Calling it
over REST was tested directly and returns
`{"code":"0A000","message":"cannot display a value of type event_trigger"}`.

It is Supabase-managed infrastructure — it's what auto-enabled RLS on Garra's own tables — so
it is deliberately left untouched rather than hardened. **Not a hole; no action needed.**

### On-device verification still outstanding

Nothing in this phase has run on hardware, consistent with every phase since 0. Added to
`00-index.md` §6. The items that genuinely need a device or a second account:

- migration `0004` applying at boot
- a real OTP email arriving and verifying
- first sign-in pushing a local-only arc up
- **a second account seeing nothing** (the unauthenticated half is verified from here)
- airplane-mode: log, kill, relaunch, survive
- both themes

### Deferred

- **Tombstones.** A cascade delete of a goal removes its entries remotely via
  `on delete cascade`, but a second device pulls no tombstone for those children and keeps them
  locally. Out of scope here: the app's model is archive-not-delete (`CLAUDE.md`: archives are
  read-only), so hard deletes are rare. `useUndoEntry` is the one real delete path and it
  targets a single row, which *is* enqueued.
- **Custom SMTP.** Supabase's built-in sender is rate-limited to ~2–3/hour on the free tier —
  fine for testing, not for production deliverability.
- **Realtime.** Deliberately unused; a subscription would be a second sync path to keep correct
  for a single-user app whose other device is usually asleep.
- **Ship metadata on the log path** and **freeze earning writes** (Phase 9) still carry no
  outbox wiring, because neither writes rows yet.
