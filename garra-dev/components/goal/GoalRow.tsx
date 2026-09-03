import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PaceRing } from '@/components/charts/PaceRing';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
import { motion, staggerDelay } from '@/theme/motion';
import { copy } from '@/lib/copy';
import type { ArcRowData } from '@/hooks/useHomeData';
import { fontFor } from '@/theme/fonts';

// rules/01 §7's Arc row: 32px pace ring, name 17/500, then a right column of value (16/600,
// tabular) over status (13/500).
//
// Status color is the governing law in miniature (rules/01 §0): `locked_in` and `on_track` both
// render neutral grey — success is the absence of warning, not a color — and only `slipping` is
// amber, swapping to slippingLight on light grounds because #FFB020 is illegible on #FAFAF9
// (§5). `cooked` stays neutral too: `system.cooked` is an unapproved proposal (§9), and the word
// carries the meaning, never color alone (§8).
const STATUS_LABEL = {
  locked_in: copy.status.lockedIn,
  on_track: copy.status.onTrack,
  slipping: copy.status.slipping,
  cooked: copy.status.cooked,
} as const;

export function GoalRow({
  row,
  onPress,
  index = 0,
}: {
  row: ArcRowData;
  onPress?: () => void;
  /** Position in the list, for the staggered entrance. */
  index?: number;
}) {
  const { tokens, colorScheme } = useAppTheme();

  // "Not started" is neutral by definition: an arc on day 0 has not slipped, so it must never
  // borrow amber. Only a genuine slip does (rules/01 §0).
  const statusColor =
    !row.notStarted && row.status === 'slipping'
      ? colorScheme === 'light'
        ? system.slippingLight
        : system.slipping
      : tokens.textSecondary;

  return (
    <Animated.View
      entering={FadeInDown.delay(staggerDelay(index))
        .duration(240)
        .withInitialValues({ transform: [{ translateY: motion.enterOffset }] })}
    >
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        className="flex-row items-center"
        style={{ gap: 14, minHeight: 44 }}
      >
        <PaceRing
          p={row.p}
          t={row.t}
          accent={row.accent}
          size="row"
          accessibilityLabel={row.accessibilityLabel}
        />
        <Text
          className="flex-1 text-[17px] font-medium text-text-primary dark:text-text-primary-dark"
          style={{ letterSpacing: -0.17 }}
          numberOfLines={1}
        >
          {row.title}
        </Text>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text
            className="text-[16px] font-semibold text-text-primary dark:text-text-primary-dark"
            style={{ letterSpacing: -0.16, fontVariant: ['tabular-nums'] }}
          >
            {row.valueLabel}
          </Text>
          <Text
            style={{ fontSize: 13, fontFamily: fontFor(500, 'text'), fontWeight: '500', letterSpacing: -0.065, color: statusColor }}
          >
            {row.notStarted ? copy.status.notStarted : STATUS_LABEL[row.status]}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}
