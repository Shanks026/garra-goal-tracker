import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHomeData, type TodayItem } from '@/hooks/useHomeData';
import {
  useLogEntry,
  useLogEverything,
  useSkipDay,
  useUndoEntry,
  type SkipReasonKey,
} from '@/hooks/useLogEntry';
import { useLogSheet } from '@/sheets/LogSheetProvider';
import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { SkipReasonSheetContent } from '@/sheets/SkipReasonSheet';
import { useToastStore } from '@/lib/stores/toast';
import { copy } from '@/lib/copy';
import { controls, layout } from '@/theme/tokens';
import { ArcHero } from '@/components/home/ArcHero';
import { YesterdayRow } from '@/components/home/YesterdayRow';
import { TodayRow } from '@/components/goal/TodayRow';
import { GoalRow } from '@/components/goal/GoalRow';

// Screens 10 (dark) and 11 (light) — two axes on one screen: Today (execution) above, The Arc
// (trajectory) below, with the countdown never leaving the screen (garra-index.md §7.3).
export default function Home() {
  const {
    arc,
    progress,
    mains,
    sides,
    arcRows,
    todayKey,
    yesterdayKey,
    yesterdayUnlogged,
    showBackfillPrompt,
  } = useHomeData();
  const logEntry = useLogEntry();
  const logEverything = useLogEverything();
  const undoEntry = useUndoEntry();
  const skipDay = useSkipDay();
  const pushToast = useToastStore((s) => s.push);
  const { openLog, openLogQueue } = useLogSheet();

  const skipSheetRef = useRef<SheetRef>(null);
  const [skipTarget, setSkipTarget] = useState<TodayItem | null>(null);

  const onSkip = useCallback((item: TodayItem) => {
    setSkipTarget(item);
    skipSheetRef.current?.present();
  }, []);

  const onPickSkipReason = useCallback(
    (reason: SkipReasonKey) => {
      if (!arc || !todayKey || !skipTarget) return;
      skipDay.mutate({ goalId: skipTarget.goalId, arcId: arc.id, dayKey: todayKey, reason });
      skipSheetRef.current?.dismiss();
      setSkipTarget(null);
    },
    [arc, todayKey, skipTarget, skipDay],
  );

  const onToggle = useCallback(
    async (item: TodayItem) => {
      if (!arc || !todayKey) return;
      // A binary log is one tap: no sheet, no confirm, no navigation. The haptic and the
      // optimistic patch both happen inside the mutation's onMutate.
      const entryId = await logEntry.mutateAsync({
        goalId: item.goalId,
        arcId: arc.id,
        dayKey: todayKey,
        todayKey,
        value: item.sessionTarget ?? null,
      });
      pushToast({
        message: `${copy.log.logged} · ${item.title}`,
        actionLabel: copy.log.undo,
        onAction: () => undoEntry.mutate({ entryId, arcId: arc.id }),
      });
    },
    [arc, todayKey, logEntry, undoEntry, pushToast],
  );

  const onLogEverything = useCallback(() => {
    if (!arc || !todayKey || !mains || !sides) return;
    const pending = [...mains, ...sides].filter((i) => !i.isDone && !i.isSkipped);
    const binary = pending.filter((i) => !i.needsValue);
    const valued = pending.filter((i) => i.needsValue);

    if (binary.length > 0) {
      logEverything.mutate({
        arcId: arc.id,
        goalIds: binary.map((i) => i.goalId),
        dayKey: todayKey,
      });
    }
    // Value goals can't be guessed, so they queue into one sheet pass rather than being skipped.
    if (valued.length > 0) openLogQueue(valued);
  }, [arc, todayKey, mains, sides, logEverything, openLogQueue]);

  if (!arc || !progress || !mains || !sides || !arcRows) {
    // Render nothing rather than a spinner: the splash gate is still up on a cold start, and on
    // a warm one this resolves within a frame from the persisted query cache.
    return <View className="flex-1 bg-bg dark:bg-bg-dark" />;
  }

  const pendingCount = [...mains, ...sides].filter((i) => !i.isDone && !i.isSkipped).length;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenX,
          paddingTop: 8,
          paddingBottom: 24,
        }}
      >
        <ArcHero progress={progress} />

        {showBackfillPrompt && yesterdayUnlogged && yesterdayKey ? (
          <View className="mt-[18px]">
            <YesterdayRow
              unloggedCount={yesterdayUnlogged.length}
              onPress={() => {
                // Backfilled entries are flagged by the mutation (dayKey !== todayKey) and the
                // 2-day window is enforced there too, so this can't reach further back than the
                // rule allows even if the row somehow lingered.
                const valued = yesterdayUnlogged.filter((i) => i.needsValue);
                const binary = yesterdayUnlogged.filter((i) => !i.needsValue);
                if (binary.length > 0 && arc) {
                  logEverything.mutate({
                    arcId: arc.id,
                    goalIds: binary.map((i) => i.goalId),
                    dayKey: yesterdayKey,
                  });
                }
                if (valued.length > 0) openLogQueue(valued);
              }}
            />
          </View>
        ) : null}

        <Text className="mt-[22px] text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
          {copy.home.todayLabel}
        </Text>

        <View style={{ marginTop: 14, gap: 2 }}>
          {mains.map((item, i) => (
            <TodayRow
              key={item.goalId}
              item={item}
              onToggle={onToggle}
              onOpenValue={openLog}
              onSkip={onSkip}
              index={i}
            />
          ))}
          {/* The divider is unlabeled — position carries the meaning (rules/01 §7). Only drawn
              when both sides exist, so a Mains-only or Sides-only arc has no orphan rule. */}
          {mains.length > 0 && sides.length > 0 ? (
            <View
              className="bg-border dark:bg-border-dark"
              style={{ height: 1, marginVertical: 7 }}
            />
          ) : null}
          {sides.map((item, i) => (
            <TodayRow
              key={item.goalId}
              item={item}
              onToggle={onToggle}
              onOpenValue={openLog}
              onSkip={onSkip}
              index={i}
            />
          ))}
          {mains.length === 0 && sides.length === 0 ? (
            <Text className="text-[15px] text-text-secondary dark:text-text-secondary-dark">
              {copy.home.emptyToday}
            </Text>
          ) : null}
        </View>

        {pendingCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onLogEverything}
            className="mt-[14px] items-center justify-center rounded-button bg-fill-med dark:bg-fill-med-dark"
            style={{ height: controls.buttonInlineH }}
          >
            <Text
              className="text-[16px] font-semibold text-text-primary dark:text-text-primary-dark"
              style={{ letterSpacing: -0.16 }}
            >
              {copy.home.logEverything}
            </Text>
          </Pressable>
        ) : null}

        {arcRows.length > 0 ? (
          <>
            <Text className="mt-5 text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
              {copy.home.arcLabel}
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {arcRows.map((row, i) => (
                // Goal detail is Phase 6; the row is pressable but has nowhere to go yet, so it
                // deliberately has no handler rather than a silently swallowed one.
                <GoalRow key={row.goalId} row={row} index={i} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Sheet ref={skipSheetRef} snapPoints={['38%']}>
        {skipTarget ? (
          <SkipReasonSheetContent goalTitle={skipTarget.title} onPick={onPickSkipReason} />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
