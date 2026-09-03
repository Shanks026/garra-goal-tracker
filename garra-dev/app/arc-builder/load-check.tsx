import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import { describeCadence } from '@/lib/format';
import { useDraftArc, useDraftLoadCheck } from '@/hooks/useArcBuilder';
import { safeBack } from '@/lib/navigation';
import { useAndroidBack } from '@/hooks/useAndroidBack';
import { Button } from '@/components/ui/Button';
import { layout, system } from '@/theme/tokens';
import { fontFor } from '@/theme/fonts';

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

  // The thresholds stay weekly — that's the scale at which "a second job" means anything, and
  // 15h/week is a recognisable number where 2h/day is not. Only the *display* leads with per-day.
  const totalHours = loadCheck ? loadCheck.weeklyMinutesTotal / 60 : 0;
  const showPanel = totalHours >= AMBITIOUS_HOURS;
  const panelCopy =
    totalHours >= SECOND_JOB_HOURS ? copy.loadCheck.secondJob : copy.loadCheck.ambitious;

  const fromOnboarding = from === 'onboarding';

  const onProceed = () => {
    // Activation happens on the Sign Up screen, matching "hit auth/save at the very end"
    // (feature doc's resolved fast-path ordering).
    //
    // `replace`, not `push`, on the fast path: this screen was entered by a cross-group push
    // from `(onboarding)/recommended`, so pushing again stacks a third group entry and leaves
    // the history in a state where neither back nor `canGoBack()` means what it looks like.
    // Replacing keeps the fast path linear.
    router.navigate('/signup');
  };

  const onBack = () => safeBack(router, fromOnboarding ? '/recommended' : '/arc-builder/goal-type');

  // Android back exited the app here: a cross-group push leaves nothing poppable in the group
  // the user came from, so the event fell through expo-router to the OS. See the hook.
  useAndroidBack(onBack);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 32,
        }}
      >
        <View style={{ gap: 8 }}>
          {/* The Arc Builder's own step numbering is correct for the manual path, but showing
              it mid-onboarding contradicted that flow's numbering (audit finding). */}
          {!fromOnboarding && (
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              STEP 3 OF 3
            </Text>
          )}
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 38, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.33, lineHeight: 42 }}
          >
            {copy.loadCheck.title}
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
                  <Text className="font-body text-[13px] text-text-tertiary dark:text-text-tertiary-dark">
                    {describeCadence(g.cadenceMode, g.timesPerWeek, g.intervalDays)}
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

        {/* Per *day* is the headline, weekly is the footnote — the swap matters. Nobody feels
            "11h a week"; everybody feels "1h 34m a day", and the daily number is the one that
            decides whether this arc survives contact with a Tuesday. */}
        <View style={{ gap: 8 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.loadCheck.perDayLabel}
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{
              fontSize: 60,
              fontFamily: fontFor(600, 'display'),
              fontWeight: '600',
              letterSpacing: 60 * -0.045,
              lineHeight: 63,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMinutes(loadCheck?.dailyAverageMinutes ?? 0)}
          </Text>
          <Text className="font-body text-[15px] text-text-secondary dark:text-text-secondary-dark">
            a day · {formatMinutes(loadCheck?.weeklyMinutesTotal ?? 0)} per week
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

      {/* Proceeding is now the primary action. "I know what I'm doing" made going forward sound
          like defying the app's advice, and pairing it with a primary "Trim something" pushed
          the user toward cutting their own plan. The screen's job is to make them *look* at the
          number, not to talk them out of it (garra-index.md §7.2 step 5). Trimming stays one tap
          away as the secondary. */}
      <View className="px-6 pb-screen-bottom" style={{ gap: 10 }}>
        <Button title={copy.loadCheck.lockIn} onPress={onProceed} style={{ width: '100%' }} />
        <Button
          title={copy.loadCheck.trim}
          variant="outline"
          onPress={onBack}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}
