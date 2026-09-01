import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useActiveArc, useDraftArc, useGoalsForArc } from '@/hooks/useArcBuilder';

// garra-index.md §7.0's cold-start diagram, as routing logic: splash -> (no active or draft
// arc -> onboarding) / (draft arc exists -> resume the builder where it left off) / (active
// arc exists -> Home, which doesn't exist until Phase 5 — a temporary placeholder stands in).
// While either query is loading, render nothing; app/_layout.tsx's splash gate is still up.
export default function Index() {
  const router = useRouter();
  const activeArc = useActiveArc();
  const draftArc = useDraftArc();
  const draftGoals = useGoalsForArc(draftArc.data?.id);

  const stillLoading =
    activeArc.data === undefined ||
    draftArc.data === undefined ||
    (draftArc.data !== null && draftGoals.data === undefined);

  useEffect(() => {
    if (stillLoading) return;

    if (activeArc.data) return; // renders the placeholder below, stays on this route

    if (draftArc.data) {
      if ((draftGoals.data?.length ?? 0) === 0) {
        router.replace('/arc-builder/goal-type');
      } else {
        router.replace('/arc-builder/load-check');
      }
      return;
    }

    router.replace('/welcome');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillLoading, activeArc.data, draftArc.data, draftGoals.data]);

  if (stillLoading || !activeArc.data) return null;

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-bg px-6 dark:bg-bg-dark">
      <Text className="text-text-primary dark:text-text-primary-dark">
        {activeArc.data.title} is live — Home is Phase 5.
      </Text>
      <Text className="text-text-tertiary dark:text-text-tertiary-dark">
        (Reach the chart/UI kitchen sink by navigating to /_dev-charts directly.)
      </Text>
    </View>
  );
}
