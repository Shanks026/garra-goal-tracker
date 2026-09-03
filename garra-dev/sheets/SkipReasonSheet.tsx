import { Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { copy } from '@/lib/copy';
import type { SkipReasonKey } from '@/hooks/useLogEntry';
import { fontFor } from '@/theme/fonts';

// Not designed (rules/01 §9 lists no skip surface). Extends the log-sheet shell with the same
// Chip primitive the intent picker uses, rather than inventing a new visual language. Two taps
// total: swipe left, then a reason (rules/02 §4).
const REASONS: SkipReasonKey[] = ['sick', 'travel', 'noTime', 'choseNotTo'];

export function SkipReasonSheetContent({
  goalTitle,
  onPick,
}: {
  goalTitle: string;
  onPick: (reason: SkipReasonKey) => void;
}) {
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
          {copy.log.skipped.toUpperCase()}
        </Text>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 24, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -0.6 }}
        >
          {goalTitle}
        </Text>
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {REASONS.map((reason) => (
          <Chip
            key={reason}
            label={copy.log.skipReasons[reason]}
            variant="intent"
            onPress={() => onPick(reason)}
          />
        ))}
      </View>
    </View>
  );
}
