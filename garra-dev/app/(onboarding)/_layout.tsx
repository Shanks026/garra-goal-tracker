import { Stack } from 'expo-router';

import { timing } from '@/theme/motion';
import { useAppTheme } from '@/theme/useAppTheme';

// Onboarding is a forward-only sequence. Back-swipe stays disabled: a half-finished arc-builder
// step the user swiped out of is a worse state than one they completed.
//
// **Cross-fade, not slide_from_right.** The slide exposed a thin white seam between the outgoing
// and incoming screens — the window background showing through the gap the native transition
// opens. `contentStyle` below fixes the cause, but the slide is dropped anyway: on a stack of
// near-black screens, a horizontal slide reads as a seam moving across the display rather than
// as forward motion, because there is no visible edge contrast to carry the gesture. A fade
// between two dark screens reads as one continuous surface changing.
//
// This reverses `rules/01-design-system.md` §6.2, which specified slide-from-right for
// sequences; the rule has been updated rather than left contradicting the code.
export default function OnboardingLayout() {
  const { tokens } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade',
        animationDuration: timing.base.duration,
        // The actual fix for the white seam: without an explicit background, the transition
        // composites against the raw window background instead of the app's ground.
        contentStyle: { backgroundColor: tokens.bg },
      }}
    />
  );
}
