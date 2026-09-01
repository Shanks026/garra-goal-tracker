import '../global.css';

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db, enableForeignKeys } from '../lib/db/client';
import migrations from '../lib/db/migrations/migrations';
import { mmkvPersister } from '../lib/queryPersister';
import { LogSheetHost } from '../sheets/LogSheetHost';

// SQLite is local, and the only thing that changes data is the user (03-state-and-data.md §3) —
// a generous staleTime is correct here, not a bug. Refetch happens on invalidation, not polling.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
});

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
    // Foreign keys go on only *after* migrations finish — see lib/db/client.ts for why the
    // table-recreate migrations must run with enforcement off.
    if (success) {
      enableForeignKeys();
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
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: mmkvPersister }}
        >
          {/* Mounted once at the app root (rules/02-ui-components.md §3) so any screen can
              open a sheet without each one needing its own provider. */}
          <BottomSheetModalProvider>
            <LogSheetHost>
              <Stack screenOptions={{ headerShown: false }} />
            </LogSheetHost>
          </BottomSheetModalProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
