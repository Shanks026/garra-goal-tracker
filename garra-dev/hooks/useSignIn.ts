import { eq } from 'drizzle-orm';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { localProfile } from '@/lib/db/schema';
import { supabase } from '@/lib/supabase';
import { pushProfileName, syncNow } from '@/lib/sync/engine';
import { clearSyncState, readSyncState } from '@/lib/sync/state';

// Email OTP — a six-digit code, not a magic link.
//
// A magic link needs its redirect URL allowlisted in the Supabase dashboard and a deep-link
// handler in the app; a code needs neither, so this path works with zero external configuration.
// It is also better on mobile regardless: a link opened on a laptop puts the session on the wrong
// device, while a code can be typed wherever the app happens to be.

export class DifferentAccountError extends Error {
  constructor() {
    super("This phone already holds another account's arc. Sign out of that account first.");
    this.name = 'DifferentAccountError';
  }
}

/** Sends the code. Supabase creates the user on first verify, so there's no separate sign-up. */
export function useSendCode() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        // The whole point of OTP: don't mint a magic link we can't handle.
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
    },
  });
}

export function useVerifyCode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; code: string }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: input.email.trim(),
        token: input.code.trim(),
        type: 'email',
      });
      if (error) throw new Error(error.message);

      const userId = data.session?.user.id;
      if (!userId) throw new Error('That code did not return a session. Request a new one.');

      // Refuse to merge two accounts' data on one device. Checked here rather than only in the
      // engine so the user gets a real error instead of a sync that silently does nothing —
      // and we sign back out, because staying signed in to an account we won't sync is worse.
      const state = await readSyncState();
      if (state.userId && state.userId !== userId) {
        await supabase.auth.signOut();
        throw new DifferentAccountError();
      }

      // Mirror the onboarding display name up. Before Phase 8 it only ever existed in
      // `local_profile`; `profiles` is its real home once an account exists.
      const profile = await db
        .select()
        .from(localProfile)
        .where(eq(localProfile.id, 'local'))
        .limit(1);
      const name = profile[0]?.name;
      if (name) await pushProfileName(userId, name);

      // The engine decides push-only vs full cycle by reading `sync_state.userId`, which is
      // still null here on a first sign-in — so it must not be written before this call.
      return syncNow();
    },

    onSuccess: (result) => {
      // A first sign-in pushes rather than pulls, so usually nothing changed locally. When a
      // second device pulls an existing arc, everything on screen is stale.
      if (result.changedLocally) qc.invalidateQueries();
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Order matters: clear the local sync identity first so a failed network sign-out can't
      // leave the device believing it's still bound to that account.
      await clearSyncState();
      await supabase.auth.signOut();
      // Every SQLite row stays. "Keep it on this phone" has to remain true after a sign-out, or
      // it was never true in the first place (rules/05 §5).
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
