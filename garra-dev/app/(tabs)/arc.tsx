import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useArcTab } from '@/hooks/useArcTab';
import { copy } from '@/lib/copy';
import { layout } from '@/theme/tokens';
import { ArcMosaicSection } from '@/components/arc/ArcMosaicSection';
import { MomentumSection } from '@/components/arc/MomentumSection';
import { LoadSection } from '@/components/arc/LoadSection';
import { StreakStats } from '@/components/arc/StreakStats';
import { GoalRow } from '@/components/goal/GoalRow';
import { fontFor } from '@/theme/fonts';

// Screen 15 — the whole run at a glance. Read-only: this screen writes nothing at all, which is
// what makes it the safest in the app and the one most likely to get screenshotted
// (garra-index.md §8.3 treats that as a distribution channel, not vanity).
export default function ArcTab() {
  const data = useArcTab();
  const router = useRouter();

  if (!data) return <View className="flex-1 bg-bg dark:bg-bg-dark" />;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenX,
          paddingTop: 8,
          paddingBottom: 32,
        }}
      >
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 28, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -0.84 }}
        >
          {copy.arcTab.title}
        </Text>
        <Text className="font-body mt-1.5 text-[15px] text-text-secondary dark:text-text-secondary-dark">
          {data.windowLabel}
        </Text>

        <ArcMosaicSection cells={data.mosaic} />

        <MomentumSection headline={data.momentum.headline} points={data.momentum.points} />

        <LoadSection
          segments={data.load.segments}
          actualTotalLabel={data.load.actualTotalLabel}
          plannedTotalLabel={data.load.plannedTotalLabel}
          rows={data.load.rows}
        />

        {data.paceRows.length > 0 ? (
          <View className="mt-6">
            <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
              {copy.home.arcLabel}
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {/* Home's row verbatim — same information answering the same question, so a second
                  design would be a mistake. */}
              {data.paceRows.map((row, i) => (
                <GoalRow
                  key={row.goalId}
                  row={row}
                  index={i}
                  onPress={() => router.push(`/goal/${row.goalId}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <StreakStats current={data.streak.current} longest={data.streak.longest} />
      </ScrollView>
    </SafeAreaView>
  );
}
