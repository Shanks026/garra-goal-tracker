import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { INTENTS, type GoalProposal, type IntentKey } from '@/lib/intents';
import { useAddGoalToDraft, useDraftArc, useSetArcWindow } from '@/hooks/useArcBuilder';
import { addDaysToKey, dayKey, daysBetweenKeysInclusive, deviceTimezone } from '@/lib/date';
import { assignAccents } from '@/lib/accents';
import { useAppTheme } from '@/theme/useAppTheme';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, stepLabel, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';

// The canvas's fast onboarding path never shows a window-setting screen — it defaults to a
// round, season-independent 90 days starting tomorrow (feature doc gap #1). Screen 06 (Arc
// Builder's Window step) is reachable from here to change it.
const DEFAULT_WINDOW_DAYS = 90;

function describeProposal(p: GoalProposal): string {
  const cadenceLabel =
    p.cadenceMode === 'daily'
      ? 'daily'
      : p.cadenceMode === 'n_per_week'
        ? `${p.timesPerWeek}× / week`
        : (p.cadenceMode ?? '');
  if (p.type === 'accumulate') return `${p.targetAmount} ${p.unit} · ${cadenceLabel} · accumulate`;
  if (p.type === 'ship') return `${p.targetAmount} ${p.itemNoun} · ${cadenceLabel} · ship`;
  if (p.type === 'milestone')
    return `${p.checkpoints?.length ?? 0} checkpoints · ${cadenceLabel} · milestone`;
  return `${cadenceLabel}${p.sessionTarget ? ` · ${p.sessionTarget} ${p.unit ?? ''}` : ''} · habit`;
}

export default function Recommended() {
  const router = useRouter();
  const { intents } = useLocalSearchParams<{ intents: string }>();
  const { tokens } = useAppTheme();
  const draftArc = useDraftArc();
  const setWindow = useSetArcWindow();
  const addGoal = useAddGoalToDraft();

  useEffect(() => {
    if (draftArc.data === null) {
      // Day buckets go through dayKey() so the 04:00 rollover applies — `format(new Date())`
      // would use the device's local midnight and silently disagree with every entry's day_key
      // (rules/03 §5).
      const today = dayKey(new Date(), deviceTimezone());
      setWindow.mutate({
        startsAt: addDaysToKey(today, 1),
        endsAt: addDaysToKey(today, DEFAULT_WINDOW_DAYS),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftArc.data]);

  const pickedKeys = useMemo(() => (intents ? (intents.split(',') as IntentKey[]) : []), [intents]);

  const totalDays = draftArc.data
    ? daysBetweenKeysInclusive(draftArc.data.startsAt, draftArc.data.endsAt)
    : DEFAULT_WINDOW_DAYS;

  const proposals = useMemo(
    () =>
      pickedKeys
        .map((key) => INTENTS.find((i) => i.key === key))
        .filter((i): i is (typeof INTENTS)[number] => !!i)
        .map((intent) => ({ intent, goal: intent.buildGoal({ totalDays }) })),
    [pickedKeys, totalDays],
  );

  const [accepted, setAccepted] = useState<Set<IntentKey>>(() => new Set(pickedKeys));

  const toggle = (key: IntentKey) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // The accents these proposals will actually receive, from the same helper the mutation uses —
  // so the preview dots can't disagree with what gets stored when a middle proposal is
  // deselected (see the feature doc's 5.0.8 table).
  const acceptedKeys = useMemo(
    () => proposals.filter(({ intent }) => accepted.has(intent.key)).map(({ intent }) => intent.key),
    [proposals, accepted],
  );
  const previewAccents = useMemo(() => {
    const assigned = assignAccents(acceptedKeys.length);
    const byKey = new Map<IntentKey, string>();
    acceptedKeys.forEach((key, i) => byKey.set(key, assigned[i]!));
    return byKey;
  }, [acceptedKeys]);

  const [starting, setStarting] = useState(false);
  const canStart = accepted.size > 0 && !!draftArc.data && !starting;

  const onStartArc = async () => {
    if (!draftArc.data) return;
    setStarting(true);
    // `useAddGoalToDraft` is idempotent per (arc, title), so coming back to this screen and
    // tapping again re-uses the existing rows instead of duplicating every goal.
    for (const { intent, goal } of proposals) {
      if (!accepted.has(intent.key)) continue;
      await addGoal.mutateAsync({
        arcId: draftArc.data.id,
        type: goal.type,
        title: goal.title,
        icon: intent.icon,
        targetAmount: goal.targetAmount,
        unit: goal.unit,
        itemNoun: goal.itemNoun,
        cadenceMode: goal.cadenceMode,
        timesPerWeek: goal.timesPerWeek,
        sessionTarget: goal.sessionTarget,
        estMinutes: goal.estMinutes,
        paceBasis: goal.paceBasis,
        quickAdd: goal.quickAdd,
      });
    }
    setStarting(false);
    // `from` lets Load Check suppress its Arc-Builder step label, so a user walking the fast
    // path never sees "STEP 3 OF 3" in the middle of onboarding's own numbering.
    router.push('/arc-builder/load-check?from=onboarding');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 30, gap: 28 }}>
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {stepLabel('recommended')} · {totalDays} DAYS
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.9 }}
          >
            Here&apos;s what that looks like
          </Text>
          <Text className="text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            Targets sized to your window. Change any number later.
          </Text>
          {draftArc.data ? (
            <Pressable onPress={() => router.push('/arc-builder/window')} hitSlop={8}>
              <Text className="text-[14px] text-text-tertiary dark:text-text-tertiary-dark">
                {totalDays} days · {draftArc.data.startsAt} → {draftArc.data.endsAt} (tap to change)
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-3">
          {proposals.map(({ intent, goal }) => {
            const isOn = accepted.has(intent.key);
            const accent = previewAccents.get(intent.key);
            return (
              <Pressable
                key={intent.key}
                onPress={() => toggle(intent.key)}
                className="flex-row items-center gap-4 rounded-card border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark"
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 6,
                    // Declined proposals get no accent — they aren't claiming one.
                    backgroundColor: accent ?? 'transparent',
                    borderWidth: accent ? 0 : 1,
                    borderColor: tokens.borderControl,
                  }}
                />
                <View className="flex-1 gap-1">
                  <Text className="text-[17px] font-semibold text-text-primary dark:text-text-primary-dark">
                    {goal.title}
                  </Text>
                  <Text className="text-[14px] text-text-secondary dark:text-text-secondary-dark">
                    {describeProposal(goal)}
                  </Text>
                </View>
                <View
                  className={
                    isOn
                      ? 'items-center justify-center rounded-full bg-text-primary dark:bg-text-primary-dark'
                      : 'items-center justify-center rounded-full border border-border-control dark:border-border-control-dark'
                  }
                  style={{ width: 28, height: 28 }}
                >
                  <Text
                    className={
                      isOn
                        ? 'text-bg dark:text-bg-dark'
                        : 'text-text-secondary dark:text-text-secondary-dark'
                    }
                    style={{ fontSize: 14, fontWeight: '700' }}
                  >
                    {isOn ? '✓' : '+'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => router.push('/arc-builder/goal-type')} hitSlop={8}>
          <Text className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
            + Add something else
          </Text>
        </Pressable>
      </ScrollView>

      <View className="items-center gap-5 px-6 pb-3">
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('recommended')} />
        <Button
          title="Start the arc"
          onPress={onStartArc}
          disabled={!canStart}
          style={{ width: '100%', opacity: canStart ? 1 : 0.4 }}
        />
      </View>
    </SafeAreaView>
  );
}
