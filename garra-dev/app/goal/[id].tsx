import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useGoalDetail,
  useHitCheckpoint,
  useRescopeGoal,
  useSetGoalStatus,
} from '@/hooks/useGoalDetail';
import { useLogEntry } from '@/hooks/useLogEntry';
import { safeBack } from '@/lib/navigation';
import { copy } from '@/lib/copy';
import { layout } from '@/theme/tokens';
import { BurnUp } from '@/components/charts/BurnUp';
import { PaceRing } from '@/components/charts/PaceRing';
import { CheckpointSpine } from '@/components/charts/CheckpointSpine';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { GoalActionsSheetContent } from '@/sheets/GoalActionsSheet';
import { RescopeSheetContent } from '@/sheets/RescopeSheet';
import { GoalMosaicSection } from '@/components/goal/GoalMosaicSection';
import { GoalWeekSection } from '@/components/goal/GoalWeekSection';
import { GoalRecentList } from '@/components/goal/GoalRecentList';

// Screens 13 (Accumulate) and 14 (Milestone) exactly; Habit and Ship extend 13's structure with
// a swapped hero, per rules/01 §9's instruction for undesigned variants.
export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useGoalDetail(id ?? '');
  const setStatus = useSetGoalStatus();
  const hitCheckpoint = useHitCheckpoint();
  const rescope = useRescopeGoal();
  const logEntry = useLogEntry();

  const actionsRef = useRef<SheetRef>(null);
  const rescopeRef = useRef<SheetRef>(null);
  // Offered at most once per visit: a prompt that reappears every time becomes a nag, and the nag
  // is what makes people delete habit apps.
  const [rescopeOffered, setRescopeOffered] = useState(false);

  const onArchive = useCallback(() => {
    if (!detail) return;
    // Destructive, so it confirms (rules/02 §5). Pausing is reversible and does not.
    Alert.alert('Archive this goal?', 'It leaves Today and The Arc. Its history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          setStatus.mutate({
            goalId: detail.goal.id,
            arcId: detail.goal.arcId,
            status: 'archived',
          });
          actionsRef.current?.dismiss();
          safeBack(router, '/(tabs)');
        },
      },
    ]);
  }, [detail, setStatus, router]);

  if (!detail) return <View className="flex-1 bg-bg dark:bg-bg-dark" />;

  const { goal } = detail;
  const paused = goal.status === 'paused';

  // The offer fires on first render where the heuristic is true — never blocking, never twice.
  if (detail.offerRescope && !rescopeOffered) {
    setRescopeOffered(true);
    setTimeout(() => rescopeRef.current?.present(), 400);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.screenX, paddingBottom: 32 }}>
        {/* Header: ‹ back · arc name · ⋯ */}
        <View className="h-9 flex-row items-center justify-between">
          <PressableScale onPress={() => safeBack(router, '/(tabs)')} hitSlop={12}>
            <Text className="text-[19px] text-text-secondary dark:text-text-secondary-dark">‹</Text>
          </PressableScale>
          <Text className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
            {detail.arcTitle}
          </Text>
          <PressableScale onPress={() => actionsRef.current?.present()} hitSlop={12}>
            <Text className="text-[19px] text-text-secondary dark:text-text-secondary-dark">⋯</Text>
          </PressableScale>
        </View>

        {/* Identity: label, value, status */}
        <View className="mt-4 flex-row items-start justify-between">
          <View style={{ gap: 8 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
              {detail.label}
            </Text>
            <View className="flex-row items-end" style={{ gap: 8 }}>
              <Text
                className="text-text-primary dark:text-text-primary-dark"
                style={{
                  fontSize: 44,
                  fontWeight: '600',
                  letterSpacing: -1.76,
                  lineHeight: 44,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {detail.value}
              </Text>
              <Text
                className="text-[18px] font-medium text-text-secondary dark:text-text-secondary-dark"
                style={{ paddingBottom: 8 }}
              >
                {detail.valueSuffix}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 22 }}>
            <StatusPill
              label={paused ? 'Paused' : copy.status[statusKey(detail.status)]}
              status={paused ? 'neutral' : detail.statusLabelKind}
            />
          </View>
        </View>

        {/* Hero, swapped by type */}
        <View className="mt-5">
          {goal.type === 'accumulate' && detail.burnUp ? (
            <BurnUp
              points={detail.burnUp.points}
              win={detail.burnUp.win}
              day={detail.burnUp.day}
              accent={goal.accent}
            />
          ) : null}

          {goal.type === 'milestone' ? (
            <View className="mt-6">
              <CheckpointSpine checkpoints={detail.checkpoints} accent={goal.accent} />
            </View>
          ) : null}

          {goal.type === 'habit' || goal.type === 'ship' ? (
            <View className="items-center">
              <PaceRing
                p={detail.p}
                t={detail.t}
                accent={goal.accent}
                accessibilityLabel={`${goal.title}, ${detail.value} ${detail.valueSuffix}`}
              />
            </View>
          ) : null}
        </View>

        {detail.requiredRateLabel && goal.type !== 'milestone' ? (
          <View className="mt-3 flex-row items-baseline" style={{ gap: 8 }}>
            <Text
              className="text-[17px] font-semibold text-text-primary dark:text-text-primary-dark"
              style={{ letterSpacing: -0.17, fontVariant: ['tabular-nums'] }}
            >
              {detail.requiredRateLabel}
            </Text>
            <Text className="text-[15px] text-text-secondary dark:text-text-secondary-dark">
              required from here
            </Text>
          </View>
        ) : null}

        {goal.type === 'milestone' ? (
          <Button
            title="Mark checkpoint hit"
            variant="secondary"
            onPress={() => {
              const next = detail.checkpoints.find((c) => c.status === 'current');
              if (next) hitCheckpoint.mutate({ checkpointId: next.id, goalId: goal.id, hit: true });
            }}
            style={{ width: '100%', marginTop: 24 }}
          />
        ) : (
          <>
            <GoalMosaicSection
              cells={detail.mosaic}
              accent={goal.accent}
              startKey={goal.startsAt ?? detail.todayKey}
              onBackfill={(backfillKey) =>
                logEntry.mutate({
                  goalId: goal.id,
                  arcId: goal.arcId,
                  dayKey: backfillKey,
                  todayKey: detail.todayKey,
                  value: goal.sessionTarget ?? null,
                })
              }
            />
            <GoalWeekSection bars={detail.week} accent={goal.accent} />
            <GoalRecentList
              entries={detail.recent}
              showTitles={goal.type === 'ship'}
              itemNoun={goal.itemNoun}
            />
          </>
        )}
      </ScrollView>

      <Sheet ref={actionsRef} snapPoints={['42%']}>
        <GoalActionsSheetContent
          paused={paused}
          onEdit={() => {
            actionsRef.current?.dismiss();
            router.push({ pathname: '/arc-builder/goal-form', params: { goalId: goal.id } });
          }}
          onRescope={() => {
            actionsRef.current?.dismiss();
            setTimeout(() => rescopeRef.current?.present(), 250);
          }}
          onTogglePause={() => {
            setStatus.mutate({
              goalId: goal.id,
              arcId: goal.arcId,
              status: paused ? 'active' : 'paused',
            });
            actionsRef.current?.dismiss();
          }}
          onArchive={onArchive}
        />
      </Sheet>

      <Sheet ref={rescopeRef} snapPoints={['52%']}>
        <RescopeSheetContent
          goalTitle={goal.title}
          unit={goal.unit}
          status={detail.status}
          target={detail.target}
          suggestion={detail.suggestion}
          requiredRateLabel={detail.requiredRateLabel}
          onRescope={(toTarget) => {
            rescope.mutate({
              goalId: goal.id,
              arcId: goal.arcId,
              fromTarget: detail.target,
              toTarget,
            });
            rescopeRef.current?.dismiss();
          }}
          onKeep={() => rescopeRef.current?.dismiss()}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function statusKey(status: string): 'lockedIn' | 'onTrack' | 'slipping' | 'cooked' {
  if (status === 'locked_in') return 'lockedIn';
  if (status === 'on_track') return 'onTrack';
  if (status === 'slipping') return 'slipping';
  return 'cooked';
}
