import { AppState, type AppStateStatus } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { secureSessionStore } from './secureSessionStore';

// The ONLY module that constructs a network client. rules/03 §2: TanStack Query reads SQLite;
// Supabase is touched exclusively by lib/sync/. Importing this from a hook or a component is a
// bug — it's how "local-first" quietly becomes "online-first".

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// EXPO_PUBLIC_* is inlined by Metro at build time, so a missing value is a build-time mistake
// that would otherwise surface as an opaque "Invalid URL" from inside supabase-js on first use.
if (!url || !publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.',
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: secureSessionStore,
    persistSession: true,
    autoRefreshToken: true,
    // Must be false in React Native. The default is true and exists for web OAuth redirects,
    // where the session arrives in window.location — there is no URL bar here, and leaving it on
    // makes supabase-js reach for browser globals.
    detectSessionInUrl: false,
  },
});

// supabase-js's refresh timer is a JS interval, so it keeps firing while the app is backgrounded
// (burning battery and network) unless it's stopped, and it can be left stale on resume. Called
// once from app/_layout.tsx rather than run as a module side effect, so importing this file for
// its client doesn't silently install a listener.
export function startSessionAutoRefresh(): () => void {
  const handle = (status: AppStateStatus) => {
    if (status === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };

  handle(AppState.currentState);
  const subscription = AppState.addEventListener('change', handle);
  return () => subscription.remove();
}
