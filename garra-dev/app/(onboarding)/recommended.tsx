import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDays, format } from 'date-fns';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { INTENTS, type GoalProposal, type IntentKey } from '@/lib/intents';
import { useAddGoalToDraft, useDraftArc, useSetArcWindow } from '@/hooks/useArcBuilder';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { ACCENT_ORDER, ACCENTS } from '@/theme/tokens';

// The canvas's fast onboarding path never shows a window-setting screen — it defaults to a
// round, season-independent 90 days starting tomorrow (feature doc gap #1). Screen 06 (Arc
// Builder's Window step, Phase 4.3) is reachable from here to change it.
const DEFAULT_WINDOW_DAYS = 90;

function daysBetweenInclusive(startsAt: string, endsAt: string): number {
  const ms = Date.parse(`${endsAt}T00:00:00.000Z`) - Date.parse(`${startsAt}T00:00:00.000Z`);
  return Math.round(ms / 86_400_000) + 1;
}

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
  const draftArc = useDraftArc();
  const setWindow = useSetArcWindow();
  const addGoal = useAddGoalToDraft();

  useEffect(() => {
    if (draftArc.data === null) {
      const startsAt = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const endsAt = format(addDays(new Date(), DEFAULT_WINDOW_DAYS), 'yyyy-MM-dd');
      setWindow.mutate({ startsAt, endsAt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftArc.data]);

  const pickedKeys = useMemo(() => (intents ? (intents.split(',') as IntentKey[]) : []), [intents]);

  const totalDays = draftArc.data
    ? daysBetweenInclusive(draftArc.data.startsAt, draftArc.data.endsAt)
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

  const [starting, setStarting] = useState(false);
  const canStart = accepted.size > 0 && !!draftArc.data && !starting;

  const onStartArc = async () => {
    if (!draftArc.data) return;
    setStarting(true);
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
      });
    }
    router.push('/arc-builder/load-check');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 30, gap: 28 }}>
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            STEP 3 OF 4 · {totalDays} DAYS
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
          {proposals.map(({ intent, goal }, i) => {
            const isOn = accepted.has(intent.key);
            const accentKey = ACCENT_ORDER[i % ACCENT_ORDER.length] ?? 'coral';
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
                    backgroundColor: ACCENTS[accentKey],
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
        <StepDots total={5} current={3} />
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
