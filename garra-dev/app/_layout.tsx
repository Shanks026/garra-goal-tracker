import '../global.css';

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '../lib/db/client';
import migrations from '../lib/db/migrations/migrations';

// Never let a missing/misconfigured DSN block boot — Sentry is diagnostics, not a dependency.
try {
  Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined });
} catch {
  // Swallowed deliberately — see comment above.
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    // No fonts are loaded yet (Phase 1.2 scope) — migrations are the only real gate right
    // now, and they're normally fast enough that this fires close to immediately.
    if (success || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [success, error]);

  if (error) {
    // No design for this state yet (01-design-system.md §9 doesn't cover it either) — a
    // broken local database is unrecoverable without developer intervention, so a plain
    // message is correct here, not a styled empty state.
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6 dark:bg-bg-dark">
        <Text className="text-text-primary dark:text-text-primary-dark">
          Database failed to load: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return null; // Splash stays up until migrations finish.
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
