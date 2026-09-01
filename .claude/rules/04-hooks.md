# Rule 04 — Hooks

---

## 1. The four kinds, and what each may do

| Kind | Naming | May contain | May NOT contain |
|---|---|---|---|
| **Query** | `useArc`, `useGoals`, `useTodayList` | TanStack `useQuery` over SQLite, then a pure call into `lib/derive/` | Network calls, mutations, navigation |
| **Mutation** | `useLogEntry`, `useRescopeGoal` | TanStack `useMutation`, optimistic cache patch, haptic | Derivation math, UI copy |
| **UI** | `useSheetBackHandler`, `useKeyboardOffset` | Platform/RN plumbing | Any data access |
| **Selector** | `useFlag`, `useAccentForGoal` | Cheap reads from Zustand or a config map | Async work |

A hook that both fetches and mutates is doing two jobs. Split it.

---

## 2. Query hook shape

```ts
export function useGoalPace(goalId: string) {
  const { data: goal } = useQuery({ queryKey: qk.goal(goalId), queryFn: () => db.goal(goalId) });
  const { data: entries } = useQuery({ queryKey: qk.entries(goalId), queryFn: () => db.entries(goalId) });
  const now = useNow();                       // ticks on foreground + rollover, not per second

  return useMemo(
    () => (goal && entries ? pace({ ...goal, current: sum(entries), now }) : null),
    [goal, entries, now],
  );
}
```

Rules:

- **Derivation is called from the hook, never inlined in it.** The hook wires data to a pure
  function; the math lives in `lib/derive/`. This is what makes the math testable without
  React.
- Always `useMemo` a derived object — pace objects are passed into charts, and a new object
  identity every render defeats their memoisation.
- Return `null` while loading rather than a half-populated object. Charts must never receive
  `NaN`.
- One hook, one concern. `useTodayList` returns the list; it does not also return arc totals.

---

## 3. Mutation hook shape

```ts
export function useLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: LogInput) => db.insertEntry(v),     // SQLite. Never Supabase
    onMutate: async (v) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const prev = qc.getQueryData(qk.today(v.arcId, v.dayKey));
      qc.setQueryData(qk.today(v.arcId, v.dayKey), patch(prev, v));   // optimistic
      return { prev };
    },
    onError: (_e, v, ctx) => {
      qc.setQueryData(qk.today(v.arcId, v.dayKey), ctx?.prev);
      toast('Could not save that. Tap to retry.');
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: qk.goals(v.arcId) });
      enqueueSync(v);                                    // outbox — fire and forget
    },
  });
}
```

- **Haptic fires in `onMutate`**, not on success. The user gets feedback in the same frame as
  their tap; waiting for a DB round-trip makes a 1-tap action feel like a 200ms action.
- Never `await` sync. `enqueueSync` appends to the outbox and returns.
- Never show a spinner on a log. The optimistic patch *is* the feedback.
- Invalidate by prefix, not by enumerating keys.

---

## 4. `useNow`

Time-derived values (day counter, pace, "88 days left") need a clock, but re-rendering the
whole app every second is waste and battery.

```ts
// Ticks on: mount, app foreground, and the next 04:00 rollover. Nothing else.
export function useNow(): Date;
```

**Never call `new Date()` inside a component or a derivation.** Pass `now` in. This keeps
derivations pure and makes them testable at arbitrary points in an arc.

---

## 5. Naming

- Queries read as nouns: `useArc`, `useGoals`, `useGoalPace`, `useTodayList`, `useMosaic`.
- Mutations read as verbs: `useLogEntry`, `useSkipDay`, `useRescopeGoal`, `useHitCheckpoint`.
- Sheet openers are `use<Name>Sheet()` returning `{ open<Name> }` — imperative, not navigation.
- No `get` prefix on a hook. No `useFetchX`.

---

## 6. Never

- A hook that calls Supabase directly. Only `lib/sync/` touches the network.
- A hook that computes pace, streak, or mosaic math inline instead of calling `lib/derive/`.
- A hook returning a fresh object literal without `useMemo`.
- `useEffect` for data fetching — that's what TanStack Query is for.
- A hook that reads `Date.now()` internally.
- A "god hook" (`useGarra`, `useAppState`) that returns half the app.
