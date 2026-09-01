import { Stack } from 'expo-router';

// Onboarding is a forward-only sequence, so steps slide in from the right — the standard
// "progressing through a flow" gesture language. Back-swipe stays disabled: a half-finished
// arc-builder step that the user swiped out of is a worse state than one they completed.
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    />
  );
}
