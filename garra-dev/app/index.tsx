import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useActiveArc, useDraftArc, useGoalsForArc } from '@/hooks/useArcBuilder';

// garra-index.md §7.0's cold-start diagram, as routing logic: splash -> (no active or draft
// arc -> onboarding) / (draft arc exists -> resume the builder where it left off) / (active
// arc exists -> the Today tab). While the queries load, render nothing — app/_layout.tsx's
// splash gate is still up, so there's no flash of an intermediate screen.
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

    if (activeArc.data) {
      router.replace('/(tabs)');
      return;
    }

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

  // Nothing to render: every branch above redirects, and the splash gate in app/_layout.tsx is
  // still up until migrations finish, so there's no flash of an intermediate screen.
  return <View className="flex-1 bg-bg dark:bg-bg-dark" />;
}
