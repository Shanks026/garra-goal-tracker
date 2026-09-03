import '../global.css';

import { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { useFonts } from 'expo-font';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { db, enableForeignKeys } from '../lib/db/client';
import migrations from '../lib/db/migrations/migrations';
import { mmkvPersister } from '../lib/queryPersister';
import { startSessionAutoRefresh } from '../lib/supabase';
import { scheduleSync, syncNow } from '../lib/sync/engine';
import { timing } from '../theme/motion';
import { useAppTheme } from '../theme/useAppTheme';
import { LogSheetHost } from '../sheets/LogSheetHost';

// SQLite is local, and the only thing that changes data is the user (03-state-and-data.md §3) —
// a generous staleTime is correct here, not a bug. Refetch happens on invalidation, not polling.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
  // One place instead of nine `onSettled` edits: every mutation in the app already enqueues to
  // the outbox, so all this needs to do is ask for a drain. Debounced inside scheduleSync, and
  // nothing awaits it — the mutation is already complete by the time this runs.
  mutationCache: new MutationCache({
    onSuccess: () => scheduleSync(),
  }),
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
  // Read here rather than inside the Stack's options object so the hook call is unconditional,
  // ahead of the early returns below.
  const { tokens } = useAppTheme();
  const stackBg = tokens.bg;

  // Six faces: Inter Tight for display/title sizes, Inter for body — see theme/fonts.ts for why
  // the split matters and why each weight is a separate family. `fontError` is deliberately
  // tolerated rather than fatal: a missing typeface should fall back to the OS font, not stop
  // the app booting.
  const [fontsLoaded, fontError] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    // Splash now waits on fonts as well as migrations. Hiding it earlier would show one frame in
    // the OS font and then reflow the whole screen as Inter swaps in — a visible flash of
    // unstyled text on the very first impression.
    if ((success || error) && fontsSettled) {
      SplashScreen.hideAsync().catch(() => {});
    }
    // Foreign keys go on only *after* migrations finish — see lib/db/client.ts for why the
    // table-recreate migrations must run with enforcement off.
    if (success) {
      enableForeignKeys();
    }
  }, [success, error, fontsSettled]);

  useEffect(() => {
    // Only after migrations: `sync_state` doesn't exist before 0004 has run, and a sync that
    // can't read its own watermark would push against a null one.
    if (!success) return;

    const stopAutoRefresh = startSessionAutoRefresh();

    // A pull that overwrote local rows has to reach the UI, or the screen shows data the
    // database no longer holds until something else happens to invalidate it.
    const syncAndRefresh = () =>
      void syncNow().then((result) => {
        if (result.changedLocally) queryClient.invalidateQueries();
      });

    // Sync triggers are: boot, app foreground, sign-in, and a settled mutation — never an
    // interval (rules/03 §3). syncNow() is a no-op while signed out and holds a mutex, so a
    // foreground landing on top of a boot sync can't double-drain.
    syncAndRefresh();

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') syncAndRefresh();
    });

    return () => {
      stopAutoRefresh();
      subscription.remove();
    };
  }, [success]);

  if (error) {
    // No design for this state yet (01-design-system.md §9 doesn't cover it either) — a
    // broken local database is unrecoverable without developer intervention, so a plain
    // message is correct here, not a styled empty state.
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6 dark:bg-bg-dark">
        <Text className="font-body text-text-primary dark:text-text-primary-dark">
          Database failed to load: {error.message}
        </Text>
      </View>
    );
  }

  if (!success || !fontsSettled) {
    // Splash stays up until migrations AND fonts are ready. Rendering before the faces are
    // registered would paint the whole app in the OS font and then reflow every line as Inter
    // swaps in.
    return null;
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
              {/* Everything cross-fades. The slide it replaced exposed a thin white seam —
                  the window background showing through the gap the native transition opens —
                  and `contentStyle` below is the actual fix for that. On a stack of near-black
                  screens a horizontal slide reads as a seam crossing the display rather than as
                  forward motion, so the fade is also the better transition. Reverses
                  rules/01 §6.2, which has been updated to match. */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: timing.base.duration,
                  contentStyle: { backgroundColor: stackBg },
                }}
              >
                {/* The cold-start router is replaced into, so it must not animate at all. */}
                <Stack.Screen name="index" options={{ animation: 'none' }} />
              </Stack>
            </LogSheetHost>
          </BottomSheetModalProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
