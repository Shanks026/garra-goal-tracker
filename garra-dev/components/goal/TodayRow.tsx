import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Checkbox } from '@/components/ui/Checkbox';
import { controls } from '@/theme/tokens';
import { motion, spring, staggerDelay } from '@/theme/motion';
import { copy } from '@/lib/copy';
import type { TodayItem } from '@/hooks/useHomeData';

// rules/01 §7's Today row: h36, gap 14, 24px round checkbox, and **completed rows go
// textSecondary + line-through**. The row's own tap opens the log sheet for a value goal; the
// checkbox toggles a binary one in a single tap without any sheet at all.
//
// Swipe left reveals skip-with-reason (rules/02 §4 — 2 taps total). `ReanimatedSwipeable` is the
// current API; the older `Swipeable` is deprecated in gesture-handler 2.x.
export type TodayRowProps = {
  item: TodayItem;
  onToggle: (item: TodayItem) => void;
  onOpenValue: (item: TodayItem) => void;
  onSkip?: (item: TodayItem) => void;
  /** Position in the list, for the staggered entrance. */
  index?: number;
};

export function TodayRow({ item, onToggle, onOpenValue, onSkip, index = 0 }: TodayRowProps) {
  const done = item.isDone;
  const swipeRef = useRef<SwipeableMethods>(null);

  // A single acknowledging pulse the moment a goal completes. This is the one place the app
  // deliberately rewards the user for the action they came to perform — and it fires off the
  // *data* changing, not off a render, so it can't pulse spuriously.
  const pulse = useSharedValue(1);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      pulse.value = withSequence(
        withSpring(motion.pulseScale, spring.bouncy),
        withSpring(1, spring.snappy),
      );
    }
    wasDone.current = done;
  }, [done, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const row = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.detail ? `, ${item.detail}` : ''}`}
      onPress={() => (item.needsValue ? onOpenValue(item) : onToggle(item))}
      className="flex-row items-center bg-bg dark:bg-bg-dark"
      style={{ height: controls.todayRowH, gap: 14 }}
    >
      <Checkbox
        checked={done}
        accent={item.accent}
        onToggle={() => (item.needsValue && !done ? onOpenValue(item) : onToggle(item))}
      />
      <Text
        className={
          done
            ? 'flex-1 text-[17px] font-medium text-text-secondary line-through dark:text-text-secondary-dark'
            : 'flex-1 text-[17px] font-medium text-text-primary dark:text-text-primary-dark'
        }
        style={{ letterSpacing: -0.17 }}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      {item.detail || item.isSkipped ? (
        <Text
          className={
            done || item.isSkipped
              ? 'text-[14px] text-text-quaternary dark:text-text-quaternary-dark'
              : 'text-[14px] text-text-tertiary dark:text-text-tertiary-dark'
          }
          style={{ fontVariant: ['tabular-nums'] }}
          numberOfLines={1}
        >
          {item.isSkipped ? copy.log.skipped : item.detail}
        </Text>
      ) : null}
    </Pressable>
  );

  // Entrance is staggered by position, and the pulse wraps the row so a completion animates the
  // whole thing rather than just the checkbox.
  const animatedRow = (
    <Animated.View entering={FadeIn.delay(staggerDelay(index)).duration(220)} style={pulseStyle}>
      {row}
    </Animated.View>
  );

  // A day that's already logged or skipped has nothing to skip, so it isn't swipeable — a
  // gesture that does nothing is worse than no gesture.
  if (!onSkip || done || item.isSkipped) return animatedRow;

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <View className="items-center justify-center px-4">
          <Text className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
            {copy.log.skipped}
          </Text>
        </View>
      )}
      onSwipeableOpen={() => {
        onSkip(item);
        // Close behind the sheet so the row isn't left hanging open once a reason is chosen.
        swipeRef.current?.close();
      }}
    >
      {animatedRow}
    </ReanimatedSwipeable>
  );
}
