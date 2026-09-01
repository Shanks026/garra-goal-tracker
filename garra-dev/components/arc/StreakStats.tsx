import { Text, View } from 'react-native';

import { copy } from '@/lib/copy';

// Not designed — `garra-index.md` §7.8 asks the Arc tab for streak stats, and the canvas doesn't
// draw them. This reuses screen 14's two-column stat pair (PRACTICE / NEXT NODE) rather than
// inventing a layout: label at 11/600/+.14em over a 26/600 value.
//
// This is the arc streak — the forgiving, any-goal-logged one (garra-index.md §4.4 calls it "very
// forgiving" on purpose). Per-goal, schedule-aware streaks belong on goal detail.
export function StreakStats({ current, longest }: { current: number; longest: number }) {
  return (
    <View className="mt-6">
      <View className="h-px bg-border dark:bg-border-dark" />
      <View className="mt-6 flex-row justify-between">
        <Stat label="CURRENT STREAK" value={`${current} ${current === 1 ? 'day' : 'days'}`} />
        <Stat label="LONGEST" value={`${longest} ${longest === 1 ? 'day' : 'days'}`} />
      </View>
      <Text className="mt-2 text-[13px] text-text-tertiary dark:text-text-tertiary-dark">
        Any goal logged counts — {copy.freeze.toLowerCase()}s protect the per-goal ones.
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
        {label}
      </Text>
      <Text
        className="text-text-primary dark:text-text-primary-dark"
        style={{
          fontSize: 26,
          fontWeight: '600',
          letterSpacing: -0.78,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
