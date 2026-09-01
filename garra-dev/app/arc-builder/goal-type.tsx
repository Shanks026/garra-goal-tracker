import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalTypeCard } from '@/components/goal/GoalTypeCard';
import { Button } from '@/components/ui/Button';

// Screen 07 — Arc Builder step 2 of 3.
const TYPES = [
  { type: 'habit', glyph: '◉', name: 'Habit', description: 'do it regularly' },
  { type: 'accumulate', glyph: '▲', name: 'Accumulate', description: 'reach a number' },
  { type: 'ship', glyph: '✦', name: 'Ship', description: 'produce things' },
  { type: 'milestone', glyph: '⬢', name: 'Milestone', description: 'hit checkpoints' },
] as const;

export default function GoalType() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof TYPES)[number]['type'] | null>(null);

  const onNext = () => {
    if (!selected) return;
    router.push({ pathname: '/arc-builder/goal-form', params: { type: selected } });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-1 px-6 pt-4" style={{ gap: 44 }}>
        <View style={{ gap: 8 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            STEP 2 OF 3
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.84 }}
          >
            What kind of goal?
          </Text>
          <Text
            className="text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark"
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

      <View className="px-6 pb-3">
        <Button
          title="Next"
          onPress={onNext}
          disabled={!selected}
          style={{ width: '100%', opacity: selected ? 1 : 0.4 }}
        />
      </View>
    </SafeAreaView>
  );
}
