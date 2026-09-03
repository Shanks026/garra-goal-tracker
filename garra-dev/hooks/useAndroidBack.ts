import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Runs `handler` on the Android hardware back button while the screen is focused, and swallows
 * the event so it never reaches the OS.
 *
 * Why this exists: the onboarding fast path crosses route groups —
 * `(onboarding)/recommended` → `arc-builder/load-check` → `(onboarding)/signup`. Each group has
 * its own `Stack`, so a cross-group push doesn't leave a poppable entry in the group the user
 * came from. Pressing back on the arc-builder screens therefore fell straight through
 * expo-router to the OS and **exited the app** mid-onboarding, losing the flow.
 *
 * This is the same class of bug `rules/02` §3 documents for bottom sheets, where a missing
 * back-handler exits the app because Home is the root and there's nothing to pop. Same fix:
 * handle it explicitly rather than trusting the navigator's default.
 *
 * Returning `true` from a `BackHandler` subscription marks the event handled. The listener is
 * removed on unmount, so an unfocused screen never intercepts anyone else's back press.
 */
export function useAndroidBack(handler: () => void, enabled = true) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handler();
      return true;
    });
    return () => subscription.remove();
  }, [handler, enabled]);
}
