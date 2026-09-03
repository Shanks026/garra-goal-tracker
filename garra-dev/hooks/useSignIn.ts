import { eq } from 'drizzle-orm';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db/client';
import { localProfile } from '@/lib/db/schema';
import { supabase } from '@/lib/supabase';
import { pushProfileName, syncNow } from '@/lib/sync/engine';
import { clearSyncState, readSyncState } from '@/lib/sync/state';

// Email + password.
//
// This replaced an email-OTP flow once email confirmation was switched off in the Supabase
// dashboard: with confirmation off, `signUp` returns a live session immediately, so a password
// is both simpler and instant. The OTP path existed to avoid needing any dashboard
// configuration at all; that constraint is gone.
//
// Deliberately no email-format validation yet (per user decision) — Supabase rejects a
// malformed address itself and the error surfaces inline.

export class DifferentAccountError extends Error {
  constructor() {
    super("This phone already holds another account's arc. Sign out of that account first.");
    this.name = 'DifferentAccountError';
  }
}

/** Supabase's own floor. Enforced here so the failure is inline rather than a server round-trip. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Shared tail of both flows: refuse a second account on this device, mirror the display name up,
 * and run the first sync.
 */
async function afterAuth(userId: string, qc: ReturnType<typeof useQueryClient>) {
  // Refuse to merge two accounts' data on one device. Checked here rather than only in the
  // engine so the user gets a real error instead of a sync that silently does nothing — and we
  // sign back out, because staying signed in to an account we won't sync is worse.
  const state = await readSyncState();
  if (state.userId && state.userId !== userId) {
    await supabase.auth.signOut();
    throw new DifferentAccountError();
  }

  const profile = await db.select().from(localProfile).where(eq(localProfile.id, 'local')).limit(1);
  const name = profile[0]?.name;
  if (name) await pushProfileName(userId, name);

  // The engine decides push-only vs full cycle by reading `sync_state.userId`, which is still
  // null here on a first sign-in — so it must not be written before this call.
  const result = await syncNow();
  if (result.changedLocally) qc.invalidateQueries();
  return result;
}

/** New account. With email confirmation off, this returns a usable session straight away. */
export function useSignUp() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; password: string; name?: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) throw new Error(error.message);

      // No session means confirmation is still on in the dashboard — worth saying plainly
      // rather than letting the user tap a button that appears to do nothing.
      const userId = data.session?.user.id;
      if (!userId) {
        throw new Error('Account created, but it needs email confirmation before you can sign in.');
      }

      // The name typed during onboarding is the local profile; keep it authoritative.
      if (input.name?.trim()) {
        await db
          .insert(localProfile)
          .values({ id: 'local', name: input.name.trim() })
          .onConflictDoUpdate({
            target: localProfile.id,
            set: { name: input.name.trim(), updatedAt: new Date().toISOString() },
          });
      }

      return afterAuth(userId, qc);
    },
  });
}

/** Existing account. */
export function useLogIn() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) throw new Error(error.message);

      const userId = data.session?.user.id;
      if (!userId) throw new Error('That did not return a session. Try again.');

      return afterAuth(userId, qc);
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
