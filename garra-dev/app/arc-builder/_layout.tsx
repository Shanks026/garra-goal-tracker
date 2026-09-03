import { Stack } from 'expo-router';

import { timing } from '@/theme/motion';
import { useAppTheme } from '@/theme/useAppTheme';

// Back-swipe stays on here, unlike onboarding: the builder is explicitly re-enterable (adjust
// the window, add another goal), so leaving a step is normal.
//
// Cross-fade for the same reason as the onboarding layout — the slide showed a white seam where
// the window background met the transition gap, and a horizontal slide between two near-black
// screens reads as a moving seam rather than forward motion. See that file for the full note.
export default function ArcBuilderLayout() {
  const { tokens } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: timing.base.duration,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    />
  );
}
