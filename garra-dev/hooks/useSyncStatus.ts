import { useQuery } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { pendingCount } from '@/lib/sync/outbox';
import { readSyncState } from '@/lib/sync/state';

// Feeds one quiet Settings row. rules/03 §7: sync state is surfaced in Settings only — never a
// banner, never a blocker.

export type SyncStatus = {
  label: string;
  pending: number;
  lastError: string | null;
};

export function useSyncStatus(signedIn: boolean) {
  return useQuery({
    queryKey: qk.syncStatus,
    queryFn: async (): Promise<SyncStatus> => {
      const [state, pending] = await Promise.all([readSyncState(), pendingCount()]);
      return { label: describe(state.lastSyncedAt, state.lastError, pending, signedIn), pending, lastError: state.lastError };
    },
    // The row is glanceable, not live. It refreshes when Settings mounts and after a sync
    // settles; polling it would be the interval rules/03 §3 rules out.
    staleTime: 30_000,
  });
}

function describe(
  lastSyncedAt: string | null,
  lastError: string | null,
  pending: number,
  signedIn: boolean,
): string {
  if (!signedIn) return pending > 0 ? `${pending} waiting` : 'Not signed in';
  if (lastError) return 'Last sync failed';
  if (pending > 0) return `${pending} pending`;
  if (!lastSyncedAt) return 'Not synced yet';

  const ms = Date.now() - Date.parse(lastSyncedAt);
  if (Number.isNaN(ms)) return 'Synced';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Synced just now';
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}
