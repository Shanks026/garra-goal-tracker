import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDraftArc, useSetArcWindow } from '@/hooks/useArcBuilder';
import {
  addDaysToKey,
  dayKey,
  daysBetweenKeysInclusive,
  deviceTimezone,
  endOfYearKey,
} from '@/lib/date';
import { safeBack } from '@/lib/navigation';
import { WindowTicks } from '@/components/charts/WindowTicks';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';

// Screen 06 — Arc Builder step 1 of 3. Reached both as the manual path's entry point and as
// onboarding's "tap to change" affordance from Recommended goals (feature doc gap #1).
const PRESETS = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

type ArcWindow = { startsAt: string; endsAt: string };

// Every date here is a day key produced by dayKey() and moved with day-key arithmetic, so the
// arc's window agrees with the 04:00 rollover that every entry's own day_key uses (rules/03 §5).
// Arcs start tomorrow by design — it creates anticipation and avoids a half-day miss on day 1
// (garra-index.md §7.2 step 2).
function computeWindow(days: number | 'endOfYear'): ArcWindow {
  const startsAt = addDaysToKey(dayKey(new Date(), deviceTimezone()), 1);
  const endsAt = days === 'endOfYear' ? endOfYearKey(startsAt) : addDaysToKey(startsAt, days - 1);
  return { startsAt, endsAt };
}

export default function Window() {
  const router = useRouter();
  const draftArc = useDraftArc();
  const setWindow = useSetArcWindow();

  const [selected, setSelected] = useState<ArcWindow>(() => computeWindow(90));
  const [touched, setTouched] = useState(false);

  // Re-entering with an existing draft arc (from Recommended goals' "tap to change") shows its
  // actual window, not a fresh default — only until the user picks something new.
  useEffect(() => {
    if (draftArc.data && !touched) {
      setSelected({ startsAt: draftArc.data.startsAt, endsAt: draftArc.data.endsAt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftArc.data]);

  const totalDays = daysBetweenKeysInclusive(selected.startsAt, selected.endsAt);

  const onPickPreset = (days: number | 'endOfYear') => {
    setSelected(computeWindow(days));
    setTouched(true);
  };

  const onNext = () => {
    setWindow.mutate(selected);
    safeBack(router, '/recommended');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-1 px-6 pt-4" style={{ gap: 44 }}>
        <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
          STEP 1 OF 3
        </Text>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.84 }}
        >
          Set the window
        </Text>

        <View style={{ gap: 24 }}>
          <View className="flex-row items-end" style={{ gap: 12 }}>
            <Text
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 60, fontWeight: '600', letterSpacing: -2.7, lineHeight: 54 }}
            >
              {totalDays}
            </Text>
            <View style={{ gap: 6, paddingBottom: 8 }}>
              <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
                DAYS
              </Text>
              <Text className="text-[16px] font-medium text-text-secondary dark:text-text-secondary-dark">
                {selected.startsAt} → {selected.endsAt}
              </Text>
            </View>
          </View>
          <WindowTicks totalDays={totalDays} width={342} startDate={selected.startsAt} />
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              selected={totalDays === p.days}
              onPress={() => onPickPreset(p.days)}
            />
          ))}
          <Chip label="End of year" onPress={() => onPickPreset('endOfYear')} />
          {/* Custom date entry needs a native date picker — no such dependency exists yet
              (rules/06-conventions.md §6: adding one is a decision, not this pass's to make).
              Left present but inert, matching the canvas's layout without a fake interaction. */}
          <Chip label="Custom" selected={false} onPress={() => {}} />
        </View>

        <ListGroup>
          <ListRow label="Starts" value={selected.startsAt} />
          <ListRow label="Ends" value={selected.endsAt} />
        </ListGroup>
      </View>

      <View className="px-6 pb-3">
        <Button title="Next" onPress={onNext} style={{ width: '100%' }} />
      </View>
    </SafeAreaView>
  );
}
