import { Text, View } from 'react-native';

import { Momentum } from '@/components/charts/Momentum';
import { fontFor } from '@/theme/fonts';

// Screen 15's MOMENTUM section: the headline % beside its explanation, then the curve.
export function MomentumSection({
  headline,
  points,
}: {
  headline: number;
  points: [number, number][];
}) {
  const percent = Math.round(headline * 100);

  return (
    <View className="mt-6">
      <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
        MOMENTUM
      </Text>
      <View className="mt-1 flex-row items-end" style={{ gap: 8 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{
            fontSize: 34,
            fontFamily: fontFor(600, 'display'), fontWeight: '600',
            letterSpacing: -1.19,
            lineHeight: 37,
            fontVariant: ['tabular-nums'],
          }}
        >
          {percent}%
        </Text>
        <Text
          className="font-body text-[14px] text-text-secondary dark:text-text-secondary-dark"
          style={{ paddingBottom: 8 }}
        >
          7-day completion
        </Text>
      </View>
      {points.length > 0 ? (
        <View className="mt-1.5">
          <Momentum points={points} accessibilityLabel={`Momentum ${percent} percent`} />
        </View>
      ) : null}
    </View>
  );
}
