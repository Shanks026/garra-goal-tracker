import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Session state, and nothing else. A UI-kind hook by rules/04 §1 — it's platform plumbing around
// an auth listener, so it holds no data access and does no derivation.

export type AuthState = {
  /** undefined while the stored session is still being read from the keychain. */
  session: Session | null | undefined;
  userId: string | null;
  email: string | null;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    // getSession reads the chunked keychain value, so it's genuinely async on a cold start.
    // Returning `undefined` until it resolves keeps Settings from flashing "Sign in" at a user
    // who is already signed in.
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
  };
}
