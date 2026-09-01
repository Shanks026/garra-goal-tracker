import { Text, View } from 'react-native';

import { ArcSweep } from '@/components/charts/ArcSweep';
import { copy } from '@/lib/copy';
import type { ArcProgress } from '@/hooks/useHomeData';

// Screens 10/11, top half. The day count is absolutely positioned at the arc's centre rather
// than baked into the canvas (rules/01 §4.1), which is also what lets it use tabular numerals.
export function ArcHero({ progress }: { progress: ArcProgress }) {
  const { day, totalDays, daysLeft, p, title } = progress;

  return (
    <View>
      <Text
        className="text-text-primary dark:text-text-primary-dark"
        style={{ fontSize: 22, fontWeight: '600', letterSpacing: -0.55 }}
      >
        {title}
      </Text>

      <View style={{ height: 150, marginTop: 4 }}>
        <ArcSweep
          p={p}
          size="home"
          accessibilityLabel={`Day ${day} of ${totalDays}, ${daysLeft} days left`}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 52, alignItems: 'center', gap: 6 }}
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
            {copy.home.dayLabel}
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{
              fontSize: 46,
              fontWeight: '600',
              letterSpacing: -2.07,
              lineHeight: 46,
              fontVariant: ['tabular-nums'],
            }}
          >
            {day}
          </Text>
          <Text
            className="text-[13px] text-text-secondary dark:text-text-secondary-dark"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            of {totalDays} · {daysLeft} days left
          </Text>
        </View>
      </View>
    </View>
  );
}
