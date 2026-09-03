import { Text, View } from 'react-native';

import { ArcSweep } from '@/components/charts/ArcSweep';
import { copy } from '@/lib/copy';
import { formatDayKeyLong } from '@/lib/format';
import type { ArcProgress } from '@/hooks/useHomeData';
import { fontFor } from '@/theme/fonts';

// Screens 10/11, top half. The day count is absolutely positioned at the arc's centre rather
// than baked into the canvas (rules/01 §4.1), which is also what lets it use tabular numerals.
//
// Three things were wrong here and all three were layout, not data:
//
//  1. **The arc looked crooked.** `ArcSweep` at `size="home"` renders a canvas `cy + 20` = 166px
//     tall, and this component wrapped it in a fixed `height: 150` — clipping 16px off the
//     bottom, so the stroke's round caps were sliced flat. The wrapper no longer sets a height;
//     the canvas defines its own.
//  2. **It sat off-centre.** The canvas is a fixed 342px wide inside a container wider than
//     that, and nothing centred it. `items-center` does.
//  3. **The title was undersized** relative to every other screen's heading, and the arc's own
//     window wasn't shown anywhere on Home.
export function ArcHero({ progress }: { progress: ArcProgress }) {
  const { day, totalDays, daysLeft, p, title, startsAt, endsAt } = progress;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          // Matches the onboarding/builder question titles (`typography.titleHero`) so the arc's
          // name carries the same weight as the questions that produced it.
          style={{
            fontSize: 38,
            // 700, not the scale's 600 ceiling — an explicit exception for the arc's name, the
            // single most important string in the app. See theme/fonts.ts's DISPLAY note.
            fontFamily: fontFor(700, 'display'),
            fontWeight: '700',
            letterSpacing: -1.33,
            lineHeight: 42,
          }}
        >
          {title}
        </Text>
        <Text
          className="font-body text-[14px] text-text-tertiary dark:text-text-tertiary-dark"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatDayKeyLong(startsAt)} → {formatDayKeyLong(endsAt)}
        </Text>
      </View>

      {/* Outer view centres the fixed-width canvas; the inner one shrink-wraps it so the day
          count's absolute overlay is positioned against the canvas rather than the screen. */}
      <View className="items-center">
        <View>
          <ArcSweep
            p={p}
            size="home"
            accessibilityLabel={`Day ${day} of ${totalDays}, ${daysLeft} days left`}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 56, alignItems: 'center', gap: 6 }}
          >
            <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
              {copy.home.dayLabel}
            </Text>
            <Text
              className="text-text-primary dark:text-text-primary-dark"
              style={{
                fontSize: 46,
                fontFamily: fontFor(600, 'display'),
                fontWeight: '600',
                letterSpacing: -2.07,
                lineHeight: 46,
                fontVariant: ['tabular-nums'],
              }}
            >
              {day}
            </Text>
            <Text
              className="font-body text-[13px] text-text-secondary dark:text-text-secondary-dark"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              of {totalDays} · {daysLeft} days left
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
