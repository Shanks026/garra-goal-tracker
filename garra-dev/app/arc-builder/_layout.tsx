import { Stack } from 'expo-router';

// Same forward-sequence language as onboarding, but back-swipe stays on here: the builder is
// explicitly re-enterable (adjust the window, add another goal), so leaving a step is normal.
export default function ArcBuilderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    />
  );
}
