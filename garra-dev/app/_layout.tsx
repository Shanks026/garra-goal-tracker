import '../global.css';

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';

// Never let a missing/misconfigured DSN block boot — Sentry is diagnostics, not a dependency.
try {
  Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined });
} catch {
  // Swallowed deliberately — see comment above.
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // No fonts are loaded yet (Phase 1.2 scope), so this fires effectively immediately —
    // the gate exists as the seam future font-loading hooks into.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
