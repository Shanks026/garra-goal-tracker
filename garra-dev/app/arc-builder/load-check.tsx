import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDraftArc, useDraftLoadCheck } from '@/hooks/useArcBuilder';
import { safeBack } from '@/lib/navigation';
import { Button } from '@/components/ui/Button';
import { system } from '@/theme/tokens';

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Screen 09 — Arc Builder step 3 of 3. Two states, not the original spec's three
// (green/amber/red): the design system never puts green on "success" or red on "behind" —
// see feature doc gap #5. Below the ambitious threshold, no panel renders at all.
const AMBITIOUS_HOURS = 8;
const SECOND_JOB_HOURS = 15;

export default function LoadCheck() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const draftArc = useDraftArc();
  const loadCheck = useDraftLoadCheck(draftArc.data?.id);

  const totalHours = loadCheck ? loadCheck.weeklyMinutesTotal / 60 : 0;
  const showPanel = totalHours >= AMBITIOUS_HOURS;
  const panelCopy =
    totalHours >= SECOND_JOB_HOURS
      ? 'This is a second job. Most people drop two of these by week 4.'
      : 'Ambitious. Doable.';

  const onProceed = () => {
    // Both buttons proceed — the point is making the user look, not gatekeeping
    // (garra-index.md §7.2 step 5: "Always let them proceed"). Activation itself happens on
    // the Sign Up screen, matching "hit auth/save at the very end" (feature doc's resolved
    // fast-path ordering — see Implementation Notes).
    router.push('/signup');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, gap: 32 }}>
        <View style={{ gap: 8 }}>
          {/* The Arc Builder's own step numbering is correct for the manual path, but showing
              it mid-onboarding contradicted that flow's numbering (audit finding). */}
          {from !== 'onboarding' && (
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              STEP 3 OF 3
            </Text>
          )}
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.84 }}
          >
            Load check
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          {(loadCheck?.goals ?? []).map((g) => {
            const perGoal = loadCheck?.perGoal.find((p) => p.id === g.id);
            return (
              <View key={g.id} className="flex-row items-center" style={{ gap: 14 }}>
                <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: g.accent }} />
                <View className="flex-1" style={{ gap: 3 }}>
                  <Text className="text-[17px] font-medium text-text-primary dark:text-text-primary-dark">
                    {g.title}
                  </Text>
                  <Text className="text-[13px] text-text-tertiary dark:text-text-tertiary-dark">
                    {g.cadenceMode ?? 'no cadence'}
                  </Text>
                </View>
                <Text
                  className="text-[17px] font-semibold text-text-secondary dark:text-text-secondary-dark"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatMinutes(perGoal?.weeklyMinutes ?? 0)}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="h-px bg-border dark:bg-border-dark" />

        <View style={{ gap: 8 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            TOTAL
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{
              fontSize: 38,
              fontWeight: '600',
              letterSpacing: -1.33,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMinutes(loadCheck?.weeklyMinutesTotal ?? 0)}
          </Text>
          <Text className="text-[15px] text-text-secondary dark:text-text-secondary-dark">
            per week · {formatMinutes(loadCheck?.dailyAverageMinutes ?? 0)} a day
          </Text>
        </View>

        {showPanel && (
          <View className="rounded-card p-5" style={{ backgroundColor: system.slippingPanel }}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: system.slipping }}>
              {panelCopy}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="px-6 pb-3" style={{ gap: 10 }}>
        <Button
          title="Trim something"
          onPress={() => safeBack(router, '/recommended')}
          style={{ width: '100%' }}
        />
        <Button
          title="I know what I'm doing"
          variant="outline"
          onPress={onProceed}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}
