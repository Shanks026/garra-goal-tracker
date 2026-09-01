import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Checkbox } from '@/components/ui/Checkbox';
import { controls } from '@/theme/tokens';
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
};

export function TodayRow({ item, onToggle, onOpenValue, onSkip }: TodayRowProps) {
  const done = item.isDone;
  const swipeRef = useRef<SwipeableMethods>(null);

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

  // A day that's already logged or skipped has nothing to skip, so it isn't swipeable — a
  // gesture that does nothing is worse than no gesture.
  if (!onSkip || done || item.isSkipped) return row;

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
      {row}
    </ReanimatedSwipeable>
  );
}
