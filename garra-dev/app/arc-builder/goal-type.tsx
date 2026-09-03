import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDraftArc, useGoalsForArc } from '@/hooks/useArcBuilder';
import { GoalTypeCard } from '@/components/goal/GoalTypeCard';
import { Button } from '@/components/ui/Button';
import { safeBack } from '@/lib/navigation';
import { useAndroidBack } from '@/hooks/useAndroidBack';
import { fontFor } from '@/theme/fonts';

// Screen 07 — Arc Builder step 2 of 3.
const TYPES = [
  { type: 'habit', glyph: '◉', name: 'Habit', description: 'do it regularly' },
  { type: 'accumulate', glyph: '▲', name: 'Accumulate', description: 'reach a number' },
  { type: 'ship', glyph: '✦', name: 'Ship', description: 'produce things' },
  { type: 'milestone', glyph: '⬢', name: 'Milestone', description: 'hit checkpoints' },
] as const;

export default function GoalType() {
  const router = useRouter();
  const draftArc = useDraftArc();
  const goalsQuery = useGoalsForArc(draftArc.data?.id);
  const [selected, setSelected] = useState<(typeof TYPES)[number]['type'] | null>(null);

  const goalCount = goalsQuery.data?.length ?? 0;

  // Android back exited the app here. Two ways in, both leaving nothing poppable: a cross-group
  // push from `(onboarding)/recommended` ("+ Add something else"), and `router.replace` from the
  // cold-start router when a draft arc has no goals yet. See the hook.
  useAndroidBack(() => safeBack(router, goalCount > 0 ? '/recommended' : '/welcome'));

  const onNext = () => {
    if (!selected) return;
    router.push({ pathname: '/arc-builder/goal-form', params: { type: selected } });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-1 px-6 pt-screen-top" style={{ gap: 44 }}>
        <View style={{ gap: 8 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            STEP 2 OF 3
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 38, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.33, lineHeight: 42 }}
          >
            What kind of goal?
          </Text>
          <Text
            className="font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark"
            style={{ maxWidth: 280 }}
          >
            Pick the shape of the commitment. You can add more later.
          </Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {TYPES.map((t) => (
            <View key={t.type} style={{ width: '48%' }}>
              <GoalTypeCard
                glyph={t.glyph}
                name={t.name}
                description={t.description}
                selected={selected === t.type}
                onPress={() => setSelected(t.type)}
              />
            </View>
          ))}
        </View>
      </View>

      <View className="px-6 pb-screen-bottom" style={{ gap: 10 }}>
        <Button
          title="Next"
          onPress={onNext}
          disabled={!selected}
          style={{ width: '100%', opacity: selected ? 1 : 0.4 }}
        />
        {/* Without this, the manual path dead-ended here: goal-type -> goal-form -> back, with
            nothing routing on to the load check, so a user resumed into this screen by the
            cold-start router had to kill the app to progress (audit finding). */}
        {goalCount > 0 && (
          <Button
            title={`Done adding · ${goalCount} ${goalCount === 1 ? 'goal' : 'goals'}`}
            variant="outline"
            onPress={() => router.push('/arc-builder/load-check')}
            style={{ width: '100%' }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
