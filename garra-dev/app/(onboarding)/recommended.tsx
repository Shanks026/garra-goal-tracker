import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import type { goals } from '@/lib/db/schema';
import { INTENTS, type GoalProposal, type IntentKey } from '@/lib/intents';
import {
  useAddGoalToDraft,
  useDraftArc,
  useGoalsForArc,
  useRemoveDraftGoal,
} from '@/hooks/useArcBuilder';
import { daysBetweenKeysInclusive } from '@/lib/date';
import { assignAccents } from '@/lib/accents';
import { useAppTheme } from '@/theme/useAppTheme';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';
import { describeCadence, formatAmount, formatDayKeyLong } from '@/lib/format';
import { fontFor } from '@/theme/fonts';
import { layout } from '@/theme/tokens';

type GoalRow = typeof goals.$inferSelect;

// Only a render-time fallback now, for the frame before the draft-arc query resolves. It used
// to be the *actual* window every fast-path arc got, because no screen asked for one; `arc-new`
// runs before this screen and collects a real range, so by the time a user sees these proposals
// `draftArc.data` is populated and this value is unused.
const DEFAULT_WINDOW_DAYS = 90;

/**
 * One summary line for a goal, from either a proposal or a stored row.
 *
 * Two things were wrong before. It rendered **raw enum keys** — "n_per_week", "accumulate" —
 * straight from the data, which is exactly what rules/05 §4 keeps neutral in the DB *and*
 * rules/01 §8 says must be turned into words for the screen. And the type suffix was noise: a
 * card reading "197 km · 4× / week · accumulate" spends its last third telling the user an
 * implementation detail they never chose.
 *
 * Now it reads like a sentence: "200 km · 4 times a week".
 */
function describeGoal(g: {
  type: string;
  targetAmount?: number | null;
  unit?: string | null;
  itemNoun?: string | null;
  cadenceMode?: string | null;
  timesPerWeek?: number | null;
  intervalDays?: number | null;
  sessionTarget?: number | null;
  checkpointCount?: number;
}): string {
  const cadence = describeCadence(g.cadenceMode, g.timesPerWeek, g.intervalDays);
  const parts: string[] = [];

  if (g.type === 'accumulate' && g.targetAmount != null) {
    parts.push(`${formatAmount(g.targetAmount)}${g.unit ? ` ${g.unit}` : ''}`);
  } else if (g.type === 'ship' && g.targetAmount != null) {
    parts.push(`${formatAmount(g.targetAmount)}${g.itemNoun ? ` ${g.itemNoun}` : ''}`);
  } else if (g.type === 'milestone') {
    const n = g.checkpointCount ?? 0;
    if (n > 0) parts.push(`${n} ${copy.checkpoints.toLowerCase()}`);
  } else if (g.sessionTarget != null) {
    parts.push(`${formatAmount(g.sessionTarget)}${g.unit ? ` ${g.unit}` : ''}`);
  }

  if (cadence) parts.push(cadence);
  return parts.join(' · ');
}

export default function Recommended() {
  const router = useRouter();
  const { intents } = useLocalSearchParams<{ intents: string }>();
  const { tokens } = useAppTheme();
  const draftArc = useDraftArc();
  const addGoal = useAddGoalToDraft();
  const removeGoal = useRemoveDraftGoal();

  // The arc is NOT created here any more.
  //
  // This screen used to conjure it in a `useEffect` — a default 90-day window plus a title from
  // `seasonalArcTitle()` — which meant the central object in the product came into existence as
  // a side-effect of rendering a *list of suggestions*, with the user never seeing or naming it.
  // `arc-new` now runs before this screen and collects a real name, description and window, so
  // by the time we get here a draft arc always exists.
  //
  // The order change also makes these proposals honest: their targets are sized to the arc's
  // length, and computing that against a placeholder window meant "800 km" was scaled to a
  // number the user had never agreed to.

  const pickedKeys = useMemo(() => (intents ? (intents.split(',') as IntentKey[]) : []), [intents]);

  const totalDays = draftArc.data
    ? daysBetweenKeysInclusive(draftArc.data.startsAt, draftArc.data.endsAt)
    : DEFAULT_WINDOW_DAYS;

  const proposals = useMemo(
    () =>
      pickedKeys
        .map((key) => INTENTS.find((i) => i.key === key))
        .filter((i): i is (typeof INTENTS)[number] => !!i)
        .map((intent) => ({ intent, goal: intent.buildGoal({ totalDays }) })),
    [pickedKeys, totalDays],
  );

  const [accepted, setAccepted] = useState<Set<IntentKey>>(() => new Set(pickedKeys));

  // Goals that already exist as rows, keyed by title — `useAddGoalToDraft` identifies a goal by
  // (arc, title), so that's the join. A row exists once the user has customised the proposal;
  // until then the card renders the proposal itself.
  const storedGoals = useGoalsForArc(draftArc.data?.id);
  const storedByTitle = useMemo(() => {
    const byTitle = new Map<string, GoalRow>();
    for (const g of storedGoals.data ?? []) byTitle.set(g.title, g);
    return byTitle;
  }, [storedGoals.data]);

  const toggle = async (key: IntentKey, title: string) => {
    const isOn = accepted.has(key);
    setAccepted((prev) => {
      const next = new Set(prev);
      if (isOn) next.delete(key);
      else next.add(key);
      return next;
    });

    // Declining a proposal the user had already customised has to remove the row, or it would
    // ride along into the arc as a goal they explicitly said no to.
    const stored = storedByTitle.get(title);
    if (isOn && stored && draftArc.data) {
      await removeGoal.mutateAsync({ goalId: stored.id, arcId: draftArc.data.id });
    }
  };

  /**
   * Opens the real goal form for a proposal.
   *
   * `goal-form` edits by `goalId`, so the row has to exist first — it's created here on demand
   * rather than on mount, because creating rows as a side-effect of *rendering suggestions* is
   * exactly the pattern that made the arc itself invisible before `arc-new` existed.
   *
   * The bulk create in `onStartArc` is idempotent per (arc, title) and returns early on a
   * duplicate without touching it, so anything customised here survives untouched.
   */
  const customize = async (intent: (typeof INTENTS)[number], goal: GoalProposal) => {
    if (!draftArc.data) return;

    const existing = storedByTitle.get(goal.title);
    const goalId =
      existing?.id ??
      (
        await addGoal.mutateAsync({
          arcId: draftArc.data.id,
          type: goal.type,
          title: goal.title,
          icon: intent.icon,
          targetAmount: goal.targetAmount,
          unit: goal.unit,
          itemNoun: goal.itemNoun,
          cadenceMode: goal.cadenceMode,
          timesPerWeek: goal.timesPerWeek,
          sessionTarget: goal.sessionTarget,
          estMinutes: goal.estMinutes,
          paceBasis: goal.paceBasis,
          quickAdd: goal.quickAdd,
          checkpoints: goal.checkpoints,
        })
      ).goalId;

    // Customising implies keeping it.
    setAccepted((prev) => new Set(prev).add(intent.key));
    router.navigate({ pathname: '/arc-builder/goal-form', params: { goalId } });
  };

  // The accents these proposals will actually receive, from the same helper the mutation uses —
  // so the preview dots can't disagree with what gets stored when a middle proposal is
  // deselected (see the feature doc's 5.0.8 table).
  const acceptedKeys = useMemo(
    () =>
      proposals.filter(({ intent }) => accepted.has(intent.key)).map(({ intent }) => intent.key),
    [proposals, accepted],
  );
  const previewAccents = useMemo(() => {
    const assigned = assignAccents(acceptedKeys.length);
    const byKey = new Map<IntentKey, string>();
    acceptedKeys.forEach((key, i) => byKey.set(key, assigned[i]!));
    return byKey;
  }, [acceptedKeys]);

  const [starting, setStarting] = useState(false);
  const canStart = accepted.size > 0 && !!draftArc.data && !starting;

  const onStartArc = async () => {
    if (!draftArc.data) return;
    setStarting(true);
    // `useAddGoalToDraft` is idempotent per (arc, title), so coming back to this screen and
    // tapping again re-uses the existing rows instead of duplicating every goal.
    for (const { intent, goal } of proposals) {
      if (!accepted.has(intent.key)) continue;
      await addGoal.mutateAsync({
        arcId: draftArc.data.id,
        type: goal.type,
        title: goal.title,
        icon: intent.icon,
        targetAmount: goal.targetAmount,
        unit: goal.unit,
        itemNoun: goal.itemNoun,
        cadenceMode: goal.cadenceMode,
        timesPerWeek: goal.timesPerWeek,
        sessionTarget: goal.sessionTarget,
        estMinutes: goal.estMinutes,
        paceBasis: goal.paceBasis,
        quickAdd: goal.quickAdd,
      });
    }
    setStarting(false);
    // `from` lets Load Check suppress its Arc-Builder step label, so a user walking the fast
    // path never sees "STEP 3 OF 3" in the middle of onboarding's own numbering.
    router.navigate('/arc-builder/load-check?from=onboarding');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 28,
        }}
      >
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {totalDays} DAYS
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 38, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.33, lineHeight: 42 }}
          >
            {copy.onboarding.recommendedTitle}
          </Text>
          <Text className="font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            {copy.onboarding.recommendedBody}
          </Text>
          {/* The window row used to sit here, under the body copy — two subtitles stacked at the
              top read as a wall of small grey text and buried the actual content. It's now
              directly above the CTA, next to the decision it qualifies. */}
        </View>

        <View className="gap-3">
          {proposals.map(({ intent, goal }) => {
            const isOn = accepted.has(intent.key);
            const accent = previewAccents.get(intent.key);
            const stored = storedByTitle.get(goal.title);
            return (
              <View
                key={intent.key}
                className="flex-row items-center gap-4 rounded-card border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark"
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 6,
                    // Declined proposals get no accent — they aren't claiming one.
                    backgroundColor: accent ?? 'transparent',
                    borderWidth: accent ? 0 : 1,
                    borderColor: tokens.borderControl,
                  }}
                />
                {/* The body opens the real goal form. This was the missing step: the proposals
                    were accept-or-decline only, with no way to set your own target or cadence
                    before committing. `goal-form` already has a full edit mode, so it's reused
                    rather than a second form being written (rules/02 §1). */}
                <Pressable
                  className="flex-1 gap-1"
                  onPress={() => void customize(intent, goal)}
                  accessibilityRole="button"
                  accessibilityLabel={`Customise ${goal.title}`}
                >
                  <Text className="text-[17px] font-semibold text-text-primary dark:text-text-primary-dark">
                    {goal.title}
                  </Text>
                  {/* Stored values once customised, so an edited target is reflected here
                      instead of the card still advertising the original suggestion. */}
                  <Text className="font-body text-[14px] text-text-secondary dark:text-text-secondary-dark">
                    {stored
                      ? describeGoal({ ...stored, checkpointCount: 0 })
                      : describeGoal({ ...goal, checkpointCount: goal.checkpoints?.length ?? 0 })}
                  </Text>
                  {/* Reads as the card's action rather than a hint — textSecondary at weight
                      500, not quaternary, because it's the affordance the whole screen turns
                      on and the user has to notice it. */}
                  <Text className="text-[13px] font-medium text-text-secondary dark:text-text-secondary-dark">
                    {stored ? copy.onboarding.editGoalHint : copy.onboarding.customiseHint}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void toggle(intent.key, goal.title)}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOn }}
                  accessibilityLabel={goal.title}
                  className={
                    isOn
                      ? 'items-center justify-center rounded-full bg-text-primary dark:bg-text-primary-dark'
                      : 'items-center justify-center rounded-full border border-border-control dark:border-border-control-dark'
                  }
                  style={{ width: 28, height: 28 }}
                >
                  <Text
                    className={
                      isOn
                        ? 'text-bg dark:text-bg-dark'
                        : 'text-text-secondary dark:text-text-secondary-dark'
                    }
                    style={{ fontSize: 14, fontFamily: fontFor(700, 'text'), fontWeight: '700' }}
                  >
                    {isOn ? '✓' : '+'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Pressable onPress={() => router.navigate('/arc-builder/goal-type')} hitSlop={8}>
          <Text className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
            + Add something else
          </Text>
        </Pressable>
      </ScrollView>

      <View className="items-center gap-5 px-6 pb-screen-bottom">
        {/* Moved down from under the header, where it was the second of two stacked grey
            subtitles. It qualifies the commitment, so it belongs beside the button that makes
            it — and it's still the affordance for changing the window. */}
        {draftArc.data ? (
          <Pressable onPress={() => router.navigate('/arc-builder/window')} hitSlop={8}>
            <Text
              className="text-center font-body text-[14px] text-text-tertiary dark:text-text-tertiary-dark"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {totalDays} days · {formatDayKeyLong(draftArc.data.startsAt)} →{' '}
              {formatDayKeyLong(draftArc.data.endsAt)} · tap to change
            </Text>
          </Pressable>
        ) : null}
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('recommended')} />
        <Button
          title={copy.onboarding.startArcCta}
          onPress={onStartArc}
          disabled={!canStart}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}
