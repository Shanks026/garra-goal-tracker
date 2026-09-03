import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useActiveArc,
  useAddGoalToDraft,
  useDraftArc,
  useGoalsForArc,
} from '@/hooks/useArcBuilder';
import { useGoalRow, useRescopeGoal, useUpdateGoal } from '@/hooks/useGoalDetail';
import { nextUnusedAccent } from '@/lib/accents';
import { quickAddFor } from '@/lib/intents';
import { safeBack } from '@/lib/navigation';
import { useAndroidBack } from '@/hooks/useAndroidBack';
import { GOAL_ICON_KEYS, GoalIcon, type GoalIconKey } from '@/components/goal/GoalIcon';
import { AccentPicker } from '@/components/goal/AccentPicker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { useAppTheme } from '@/theme/useAppTheme';
import { formatDayKeyLong } from '@/lib/format';
import { fontFor } from '@/theme/fonts';
import { controls, layout, radii } from '@/theme/tokens';

const GOAL_TYPES = ['habit', 'accumulate', 'ship', 'milestone'] as const;
type GoalType = (typeof GOAL_TYPES)[number];

function isGoalType(value: string | undefined): value is GoalType {
  return !!value && (GOAL_TYPES as readonly string[]).includes(value);
}

const CADENCE_OPTIONS: {
  mode: 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';
  label: string;
}[] = [
  { mode: 'daily', label: 'Daily' },
  { mode: 'n_per_week', label: 'X× / week' },
  { mode: 'specific_days', label: 'Set days' },
  { mode: 'every_n_days', label: 'Every N days' },
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Screen 08's exact structure (header -> identity -> accent row -> type-specific block ->
// inset list group -> footer hint + primary button), extended to Habit/Ship/Milestone per
// 01-design-system.md §9 — only the Accumulate form is designed; the chrome stays identical.
export default function GoalForm() {
  const router = useRouter();
  // `goalId` present → edit mode. Reusing this form rather than writing a second one is the
  // point: two forms would drift apart within two phases (08-goal-detail.md §6.4.4).
  const { type: typeParam, goalId } = useLocalSearchParams<{ type?: GoalType; goalId?: string }>();
  const { tokens } = useAppTheme();
  const isEditing = !!goalId;

  const draftArc = useDraftArc();
  const activeArc = useActiveArc();
  const existingGoal = useGoalRow(goalId);
  // Editing happens after activation, so there is no draft arc then — the goal's own arc is the
  // one that matters.
  const arcId = isEditing ? existingGoal?.arcId : draftArc.data?.id;
  const goalsQuery = useGoalsForArc(arcId ?? activeArc.data?.id);
  const addGoal = useAddGoalToDraft();
  const updateGoal = useUpdateGoal();
  const rescope = useRescopeGoal();

  // In edit mode the goal's *own* accent must stay selectable — it isn't a collision with itself.
  const usedAccents = useMemo(
    () => new Set((goalsQuery.data ?? []).filter((g) => g.id !== goalId).map((g) => g.accent)),
    [goalsQuery.data, goalId],
  );

  const type = isEditing ? ((existingGoal?.type ?? typeParam) as GoalType | undefined) : typeParam;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<GoalIconKey>('bike');
  // Deliberately null until the goals query resolves. Initialising it from `usedAccents` while
  // that query was still loading (an empty set) and freezing it into state let this form submit
  // an accent another goal already owned, breaking "no two goals in one arc share an accent"
  // (rules/01 §1). See the feature doc's 5.0.8 table.
  const [accent, setAccent] = useState<string | null>(null);
  const [estMinutes, setEstMinutes] = useState('30');
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (accent === null && goalsQuery.data && !isEditing) {
      setAccent(nextUnusedAccent(goalsQuery.data.map((g) => g.accent)));
    }
  }, [accent, goalsQuery.data, isEditing]);

  // Habit
  const [cadenceMode, setCadenceMode] = useState<
    'daily' | 'n_per_week' | 'specific_days' | 'every_n_days'
  >('n_per_week');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState('4');
  const [intervalDays, setIntervalDays] = useState('2');
  const [sessionTarget, setSessionTarget] = useState('');
  const [unit, setUnit] = useState('');

  // Accumulate
  const [targetAmount, setTargetAmount] = useState('');

  // Ship
  const [itemNoun, setItemNoun] = useState('');

  // Milestone
  const [checkpoints, setCheckpoints] = useState<string[]>(['']);

  // Prefill once, when editing and the row has arrived. Guarded by `prefilled` rather than by a
  // dependency list, so the user's own edits are never overwritten by a refetch.
  useEffect(() => {
    if (!isEditing || prefilled || !existingGoal) return;
    setPrefilled(true);
    setTitle(existingGoal.title);
    setIcon(existingGoal.icon as GoalIconKey);
    setAccent(existingGoal.accent);
    setEstMinutes(existingGoal.estMinutes != null ? String(existingGoal.estMinutes) : '30');
    if (existingGoal.cadenceMode) {
      setCadenceMode(existingGoal.cadenceMode as typeof cadenceMode);
    }
    if (existingGoal.daysOfWeek) setDaysOfWeek(existingGoal.daysOfWeek);
    if (existingGoal.timesPerWeek != null) setTimesPerWeek(String(existingGoal.timesPerWeek));
    if (existingGoal.intervalDays != null) setIntervalDays(String(existingGoal.intervalDays));
    if (existingGoal.sessionTarget != null) setSessionTarget(String(existingGoal.sessionTarget));
    if (existingGoal.unit) setUnit(existingGoal.unit);
    if (existingGoal.targetAmount != null) setTargetAmount(String(existingGoal.targetAmount));
    if (existingGoal.itemNoun) setItemNoun(existingGoal.itemNoun);
  }, [isEditing, prefilled, existingGoal]);

  const canSubmit =
    isGoalType(type) &&
    accent !== null &&
    title.trim().length > 0 &&
    (type === 'milestone' ? checkpoints.some((c) => c.trim().length > 0) : true) &&
    (type === 'accumulate' || type === 'ship' ? targetAmount.trim().length > 0 : true);

  // Android back exited the app when this form was opened from onboarding's inventory screen
  // (a cross-group push, so nothing poppable in that group). Mirrors the submit fallback.
  useAndroidBack(() =>
    safeBack(
      router,
      draftArc.data && existingGoal && draftArc.data.id === existingGoal.arcId
        ? '/recommended'
        : '/arc-builder/goal-type',
    ),
  );

  const onSubmit = async () => {
    if (!canSubmit || !isGoalType(type) || accent === null) return;

    // --- Edit mode ---
    if (isEditing && existingGoal) {
      const nextTarget =
        type === 'accumulate' || type === 'ship' ? Number(targetAmount) : undefined;
      const targetChanged =
        nextTarget != null &&
        existingGoal.targetAmount != null &&
        nextTarget !== existingGoal.targetAmount;

      // A goal on a *draft* arc is still being assembled — there is no run to keep an audit
      // trail for, so a target change is a plain edit. Only an active arc routes through the
      // rescope mutation. Without this, tuning a proposal during onboarding wrote a `rescopes`
      // row describing an event that never happened.
      const isDraft = draftArc.data?.id === existingGoal.arcId;

      await updateGoal.mutateAsync({
        goalId: existingGoal.id,
        arcId: existingGoal.arcId,
        title: title.trim(),
        icon,
        accent,
        estMinutes: Number(estMinutes) || null,
        unit: unit || null,
        itemNoun: type === 'ship' ? itemNoun || 'things' : null,
        cadenceMode: type === 'habit' || type === 'milestone' ? cadenceMode : null,
        timesPerWeek: cadenceMode === 'n_per_week' ? Number(timesPerWeek) : null,
        daysOfWeek: cadenceMode === 'specific_days' ? daysOfWeek : null,
        intervalDays: cadenceMode === 'every_n_days' ? Number(intervalDays) : null,
        sessionTarget: sessionTarget ? Number(sessionTarget) : null,
        // The bug this fixes: `targetAmount` was absent here entirely, so an edited target was
        // only ever written by the rescope below — and that call wasn't awaited before
        // navigating, so returning to the previous screen re-read the old value.
        ...(isDraft && nextTarget != null ? { targetAmount: nextTarget } : {}),
        // Quick-add chips are derived from the target, so they have to move with it or the log
        // sheet keeps offering amounts sized to a number the goal no longer has.
        ...(isDraft && nextTarget != null && type === 'accumulate'
          ? { quickAdd: quickAddFor(nextTarget) }
          : {}),
      });

      // Active arc only: the target moves *and* the `rescopes` audit row is written, in one
      // transaction (05-database.md §1). Awaited, so the next screen reads the new value.
      if (targetChanged && !isDraft && existingGoal.targetAmount != null) {
        await rescope.mutateAsync({
          goalId: existingGoal.id,
          arcId: existingGoal.arcId,
          fromTarget: existingGoal.targetAmount,
          toTarget: nextTarget,
          reason: 'edited',
        });
      }

      // Back to wherever this was opened from. The goal-detail fallback only makes sense on an
      // active arc — during onboarding there is no active arc for that screen to read.
      // `navigate`, not `safeBack`, for the draft case: this form is reached by a cross-group
      // push from `(onboarding)/recommended`, and a nested-stack `replace`/`back` to a route
      // outside that stack silently does nothing.
      if (isDraft) {
        router.navigate('/recommended');
      } else {
        safeBack(router, `/goal/${existingGoal.id}`);
      }
      return;
    }

    // --- Create mode ---
    if (!draftArc.data) return;
    await addGoal.mutateAsync({
      arcId: draftArc.data.id,
      type,
      title: title.trim(),
      icon,
      estMinutes: Number(estMinutes) || undefined,
      accent, // the user picked one explicitly; the mutation only auto-assigns when omitted
      ...(type === 'accumulate' && {
        targetAmount: Number(targetAmount),
        unit: unit || undefined,
        // pace() requires a basis, and 'even' is the only implemented one (04-pace-engine.md).
        paceBasis: 'even' as const,
        quickAdd: quickAddFor(Number(targetAmount)),
      }),
      ...(type === 'ship' && {
        targetAmount: Number(targetAmount),
        itemNoun: itemNoun || 'things',
        paceBasis: 'even' as const,
        quickAdd: [1, 2, 3],
      }),
      ...((type === 'habit' || type === 'milestone') && {
        cadenceMode,
        timesPerWeek: cadenceMode === 'n_per_week' ? Number(timesPerWeek) : undefined,
        daysOfWeek: cadenceMode === 'specific_days' ? daysOfWeek : undefined,
        intervalDays: cadenceMode === 'every_n_days' ? Number(intervalDays) : undefined,
        sessionTarget: sessionTarget ? Number(sessionTarget) : undefined,
        unit: unit || undefined,
        ...(sessionTarget ? { quickAdd: quickAddFor(Number(sessionTarget)) } : {}),
      }),
      ...(type === 'milestone' && {
        checkpoints: checkpoints.filter((c) => c.trim()).map((c) => ({ title: c.trim() })),
      }),
    });
    // The manual path enters this screen from goal-type, which may itself have been reached by
    // a `replace` from the cold-start router — so a bare back() can have nothing to pop.
    safeBack(router, '/arc-builder/goal-type');
  };

  // An unrecognised (or missing) `type` param used to render "UNDEFINED" and insert an invalid
  // `goals.type` — SQLite doesn't enforce Drizzle's enum, so the row would corrupt silently.
  if (!isGoalType(type)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6 dark:bg-bg-dark">
        <Text className="font-body text-center text-[16px] text-text-secondary dark:text-text-secondary-dark">
          That goal type isn&apos;t one Garra knows. Go back and pick a type.
        </Text>
        <View style={{ height: 16 }} />
        <Button
          title="Back"
          variant="outline"
          onPress={() => safeBack(router, '/arc-builder/goal-type')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 30,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => safeBack(router, '/arc-builder/goal-type')} hitSlop={8}>
            <Text className="font-body text-[16px] text-text-secondary dark:text-text-secondary-dark">
              Cancel
            </Text>
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {String(type).toUpperCase()}
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 16 }}>
          <View
            className="items-center justify-center rounded-full border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
            style={{ width: 60, height: 60 }}
          >
            <GoalIcon icon={icon} size={26} color={tokens.textPrimary} />
          </View>
          <View className="flex-1" style={{ gap: 4 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Goal name"
              placeholderTextColor={tokens.textTertiary}
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 38, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.33, lineHeight: 42 }}
            />
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            ICON
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {GOAL_ICON_KEYS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: icon === key }}
                className={
                  icon === key
                    ? 'items-center justify-center rounded-full bg-fill-med dark:bg-fill-med-dark'
                    : 'items-center justify-center rounded-full'
                }
                style={{ width: 40, height: 40 }}
                onPress={() => setIcon(key)}
              >
                <GoalIcon
                  icon={key}
                  size={18}
                  color={icon === key ? tokens.textPrimary : tokens.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            ACCENT
          </Text>
          {accent !== null ? (
            <AccentPicker value={accent} disabledAccents={usedAccents} onChange={setAccent} />
          ) : null}
        </View>

        {(type === 'accumulate' || type === 'ship') && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              TARGET
            </Text>
            <View className="flex-row items-end" style={{ gap: 14 }}>
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={tokens.textTertiary}
                className="text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 42, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.68 }}
              />
              {/* The unit / item-noun field was already editable but looked like static text
                  sitting next to the 42px number, so nobody knew they could change it. It now
                  gets the unit-chip treatment the design system already defines (rules/01 §3:
                  `unitChipH: 32`, `radii.unit: 16`) — a filled, rounded field that reads as an
                  input. */}
              {type === 'accumulate' ? (
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="km"
                  placeholderTextColor={tokens.textTertiary}
                  autoCapitalize="none"
                  className="font-body text-text-primary dark:text-text-primary-dark"
                  style={{
                    fontSize: 16,
                    height: controls.unitChipH,
                    minWidth: 72,
                    borderRadius: radii.unit,
                    paddingHorizontal: 12,
                    backgroundColor: tokens.fill,
                    marginBottom: 6,
                  }}
                />
              ) : (
                <TextInput
                  value={itemNoun}
                  onChangeText={setItemNoun}
                  placeholder="videos"
                  placeholderTextColor={tokens.textTertiary}
                  autoCapitalize="none"
                  className="font-body text-text-primary dark:text-text-primary-dark"
                  style={{
                    fontSize: 16,
                    height: controls.unitChipH,
                    minWidth: 88,
                    borderRadius: radii.unit,
                    paddingHorizontal: 12,
                    backgroundColor: tokens.fill,
                    marginBottom: 6,
                  }}
                />
              )}
            </View>
          </View>
        )}

        {(type === 'habit' || type === 'milestone') && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              CADENCE
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {CADENCE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.mode}
                  label={opt.label}
                  selected={cadenceMode === opt.mode}
                  onPress={() => setCadenceMode(opt.mode)}
                />
              ))}
            </View>
            {cadenceMode === 'n_per_week' && (
              <TextInput
                value={timesPerWeek}
                onChangeText={setTimesPerWeek}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={tokens.textTertiary}
                className="font-body text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            )}
            {cadenceMode === 'specific_days' && (
              // schedule.ts has supported specific_days since Phase 3, but no creation path
              // offered it — so `daysOfWeek` was never populated by anything (audit finding).
              <View className="flex-row" style={{ gap: 8 }}>
                {WEEKDAY_LABELS.map((label, weekday) => {
                  const on = daysOfWeek.includes(weekday);
                  return (
                    <Pressable
                      key={weekday}
                      accessibilityRole="button"
                      accessibilityLabel={`Weekday ${weekday}`}
                      accessibilityState={{ selected: on }}
                      onPress={() =>
                        setDaysOfWeek((prev) =>
                          prev.includes(weekday)
                            ? prev.filter((d) => d !== weekday)
                            : [...prev, weekday].sort((a, b) => a - b),
                        )
                      }
                      className={
                        on
                          ? 'items-center justify-center rounded-full bg-text-primary dark:bg-text-primary-dark'
                          : 'items-center justify-center rounded-full border border-border-control dark:border-border-control-dark'
                      }
                      style={{ width: 36, height: 36 }}
                    >
                      <Text
                        className={
                          on
                            ? 'text-[14px] font-semibold text-bg dark:text-bg-dark'
                            : 'text-[14px] text-text-secondary dark:text-text-secondary-dark'
                        }
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {cadenceMode === 'every_n_days' && (
              <TextInput
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={tokens.textTertiary}
                className="font-body text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            )}
            {type === 'habit' && (
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TextInput
                  value={sessionTarget}
                  onChangeText={setSessionTarget}
                  keyboardType="number-pad"
                  placeholder="Session target (optional)"
                  placeholderTextColor={tokens.textTertiary}
                  className="font-body flex-1 text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16 }}
                />
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="min / reps / pages"
                  placeholderTextColor={tokens.textTertiary}
                  className="font-body flex-1 text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16 }}
                />
              </View>
            )}
          </View>
        )}

        {type === 'milestone' && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              CHECKPOINTS
            </Text>
            {checkpoints.map((c, i) => (
              <TextInput
                key={i}
                value={c}
                onChangeText={(v) =>
                  setCheckpoints((prev) => prev.map((p, j) => (j === i ? v : p)))
                }
                placeholder={`Checkpoint ${i + 1}`}
                placeholderTextColor={tokens.textTertiary}
                className="font-body text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            ))}
            <Pressable onPress={() => setCheckpoints((prev) => [...prev, ''])} hitSlop={8}>
              <Text className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
                + Add checkpoint
              </Text>
            </Pressable>
          </View>
        )}

        <ListGroup>
          <View className="h-list-row-h flex-row items-center justify-between bg-surface px-4 dark:bg-surface-dark">
            <Text className="font-body text-[16px] text-text-primary dark:text-text-primary-dark">
              Est. minutes
            </Text>
            <TextInput
              value={estMinutes}
              onChangeText={setEstMinutes}
              keyboardType="number-pad"
              textAlign="right"
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 16, fontFamily: fontFor(600, 'text'), fontWeight: '600' }}
            />
          </View>
          <ListRow
            label="Ends"
            value={draftArc.data ? formatDayKeyLong(draftArc.data.endsAt) : 'arc end'}
          />
        </ListGroup>
      </ScrollView>

      <View className="px-6 pb-screen-bottom" style={{ gap: 12 }}>
        <Button
          title="Add goal"
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{ width: '100%', opacity: canSubmit ? 1 : 0.4 }}
        />
      </View>
    </SafeAreaView>
  );
}
