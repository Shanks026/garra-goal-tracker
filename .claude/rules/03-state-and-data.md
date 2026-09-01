# Rule 03 — State & Data Architecture

---

## 1. The two core principles

### Nothing derived is ever stored

Pace, required rate, status, streaks, consistency %, mosaic cells, momentum, and load totals
are **always computed** from the `entries` table. There is no `current_total` column, no
`streak_count` column, no `status` column.

A stored total drifts the moment a user backfills, deletes, or edits an entry — and this app
*requires* backfill and rescoping. Any feature that seems to need a stored derived number is
working against the grain: **flag it, don't build it.**

The one legitimate exception is a **materialized cache** that is (a) fully recomputable from
`entries`, (b) invalidated on every write, and (c) never read as truth. Don't reach for this
before it's measurably needed. It has not been needed yet.

### Local-first, always

```
expo-sqlite  ←── source of truth
     │
     └──→ Supabase  ←── sync target, not truth
```

Gyms have no signal. Basements have no signal. Bike rides have no signal. **If a log fails
offline, the app is dead.** Every write lands in SQLite immediately and syncs when there's a
connection.

This is the single biggest architectural difference from a normal Supabase app. A component
must **never** await a network call to complete a user action.

---

## 2. State ownership — three layers, no overlap

| Layer | Tool | Owns |
|---|---|---|
| **Persistent data** | expo-sqlite + Drizzle | arcs, goals, checkpoints, entries, freezes |
| **Server state** | TanStack Query | queries *against SQLite*, plus sync status |
| **Ephemeral UI** | Zustand | active sheet, builder draft, selected tab, toast queue |

**Do not blur these.** Specifically:

- TanStack Query's `queryFn` reads **SQLite**, not Supabase. Supabase is touched only by the
  sync engine in `lib/sync/`. This is what makes offline work by default rather than as a
  special case.
- Zustand never holds anything that must survive a cold start. Arc-builder draft state is the
  exception and is explicitly persisted to SQLite as a draft row, not to Zustand storage.
- No Redux. No MobX. No Context for data (Context is for providers and theme only).

---

## 3. TanStack Query conventions

```ts
// Query keys are arrays, hierarchical, and centralised in lib/queryKeys.ts
export const qk = {
  arc:      ['arc', 'active'] as const,
  goals:    (arcId: string) => ['goals', arcId] as const,
  entries:  (goalId: string) => ['entries', goalId] as const,
  today:    (arcId: string, dayKey: string) => ['today', arcId, dayKey] as const,
};
```

- **Mutations are optimistic.** `onMutate` writes SQLite and patches the cache; the UI never
  waits. `onError` rolls back and surfaces a toast.
- Invalidate by **prefix**, not by listing every key: a log invalidates `['today']` and
  `['goals', arcId]`.
- `staleTime` is generous — SQLite is local, and the only thing that changes data is the user.
  Refetch on app foreground and after sync completes, not on an interval.
- Persist the cache with an MMKV persister so a cold start paints instantly rather than
  flashing empty.

---

## 4. Derivation layer — `lib/derive/`

**Every derived number is a pure function** taking plain data and returning plain data. No
React, no hooks, no Supabase, no Date.now() inside (pass `now` in).

```ts
// lib/derive/pace.ts
export function pace(input: {
  target: number; current: number; startDate: string;
  endDate: string; now: Date; basis: PaceBasis;
}): {
  expected: number;        // where you should be
  deficit: number;         // signed: negative = behind
  requiredRate: number;    // per remaining day
  fractionDone: number;    // p — feeds the ring
  fractionExpected: number;// t — feeds the tick
  status: 'locked_in' | 'on_track' | 'slipping' | 'cooked';
}
```

**This module is the product.** It is the one part of the codebase that must be unit-tested
before anything consumes it. Cover, at minimum:

- Day 1 (no elapsed time — no divide-by-zero)
- The final day, and the day *after* the end date
- A goal whose `ends_at` is before the arc's end
- A rescoped target mid-arc
- Backfilled entries changing a past day
- `weekdays_only` and `custom_weekly` pace bases
- A target already exceeded (`fractionDone > 1` must not overflow the ring)
- Mathematically unreachable → `cooked`

Same discipline for `streaks.ts` (schedule-aware, freeze-consuming), `mosaic.ts`, and
`load.ts`.

---

## 5. Time — the rules that bite

```ts
// lib/date.ts
export const DAY_ROLLOVER_HOUR = 4;
export function dayKey(d: Date, tz: string): string;   // 'YYYY-MM-DD' after 04:00 shift
```

- **The day boundary is 04:00 local, not midnight.** A session logged at 00:30 belongs to
  *yesterday*. Every read and write of a day goes through `dayKey()` — never
  `format(date, 'yyyy-MM-dd')` directly.
- Store timestamps as UTC `timestamptz`; store day buckets as a `TEXT` day key computed with
  the user's timezone. Both, not one.
- **Backfill window is 2 days.** Enforce it in the derivation layer *and* at the DB level, and
  mark backfilled entries so the mosaic can hatch them.
- Arc length is inclusive of both endpoints: Sep 1 → Dec 31 is 122 days.
- `date-fns` for all arithmetic. Never manual `Date` string math.

---

## 6. Entitlements

Ship the gate infrastructure in Phase 0, flip it on at launch. One check plus a flag map costs
an afternoon now and saves a painful refactor in month six.

```ts
// lib/entitlements.ts
export type Flag = 'goals.max' | 'arcs.history' | 'charts.deep' | 'finale.poster'
                 | 'freezes.max' | 'reminders.perGoal' | 'widgets.all';
export function useFlag<T>(flag: Flag): T;    // reads RevenueCat entitlement, falls back to free
```

Every gated surface calls `useFlag()`. **No component ever checks a subscription object
directly.** During development every flag resolves to its Pro value.

---

## 7. Sync engine — `lib/sync/`

- **Outbox pattern.** Every local write appends to a `sync_queue` table. A background worker
  drains it. Nothing in the UI knows sync exists.
- **Last-write-wins per row**, using a client `updated_at`. This is a single-user app across
  their own devices — full CRDT machinery is unwarranted, and saying so here stops someone
  reaching for it later.
- `entries` are append-mostly and keyed by `(goal_id, day_key)`, which makes them naturally
  idempotent on replay. Preserve that property.
- Sync is **never** on the critical path of a user action. If sync is broken, the app still
  works completely.
- Surface sync state as a quiet indicator in Settings only. Never a banner, never a blocker.
