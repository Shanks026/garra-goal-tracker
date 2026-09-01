import { Text, View } from 'react-native';

import { controls } from '@/theme/tokens';

// Screen 13's RECENT section: h42 rows with a hairline bottom border and tabular numerals.
//
// For a **Ship** goal this shows the *things you made* rather than a value column.
// garra-index.md §5 calls that list "the entire emotional payoff of a creative goal" — the same
// math as Accumulate, a completely different screen — so it's the one deliberate divergence from
// the designed layout.
export type RecentEntry = {
  dayKey: string;
  label: string;
  value: string;
  title: string | null;
  link: string | null;
};

export function GoalRecentList({
  entries,
  showTitles,
  itemNoun,
}: {
  entries: RecentEntry[];
  showTitles: boolean;
  itemNoun: string | null;
}) {
  return (
    <View className="mt-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
        {showTitles ? (itemNoun ?? 'SHIPPED').toUpperCase() : 'RECENT'}
      </Text>
      <View className="mt-1">
        {entries.length === 0 ? (
          <Text className="mt-3 text-[15px] text-text-secondary dark:text-text-secondary-dark">
            Nothing logged yet.
          </Text>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.dayKey}
              className="flex-row items-center justify-between border-b border-hairline dark:border-hairline-dark"
              style={{ height: controls.entryRowH }}
            >
              <Text
                className="flex-1 text-[16px] text-text-secondary dark:text-text-secondary-dark"
                numberOfLines={1}
              >
                {showTitles ? (entry.title ?? entry.label) : entry.label}
              </Text>
              <Text
                className="text-[16px] font-semibold text-text-primary dark:text-text-primary-dark"
                style={{ fontVariant: ['tabular-nums'] }}
                numberOfLines={1}
              >
                {showTitles ? entry.label : entry.value}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
