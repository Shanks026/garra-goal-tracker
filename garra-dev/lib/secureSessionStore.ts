import * as SecureStore from 'expo-secure-store';

// A Supabase session must live in the keychain, never AsyncStorage (IMPLEMENTATION.md, Phase 8):
// it holds a refresh token, which is a long-lived credential.
//
// The problem this file exists to solve: SecureStore's practical value ceiling is ~2048 bytes,
// and a Supabase session (access JWT + refresh token + the full user object) routinely runs
// 2–4 KB. On Android an oversized write *warns and may fail* rather than throwing, so the
// failure mode is a session that silently doesn't persist — the user is signed out on every cold
// start with nothing in the logs. So every value is chunked.

// 1800 leaves headroom under 2048 for the key name and platform overhead.
const CHUNK_SIZE = 1800;
const MANIFEST_PREFIX = 'chunks:';

// AFTER_FIRST_UNLOCK, not the WHEN_UNLOCKED default: the token refresh timer can fire while the
// phone is locked, and a keychain read that fails there would drop the session for no reason.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

async function readChunkCount(key: string): Promise<number | null> {
  const manifest = await SecureStore.getItemAsync(key, OPTIONS);
  if (manifest === null) return null;
  if (!manifest.startsWith(MANIFEST_PREFIX)) return null;
  const count = Number(manifest.slice(MANIFEST_PREFIX.length));
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export const secureSessionStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      const manifest = await SecureStore.getItemAsync(key, OPTIONS);
      if (manifest === null) return null;

      // Not a manifest: a value written directly, by an older build or a shorter code path.
      // Returning it verbatim is strictly safer than treating it as corrupt and signing the
      // user out.
      if (!manifest.startsWith(MANIFEST_PREFIX)) return manifest;

      const count = await readChunkCount(key);
      if (count === null) return null;

      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
        // A missing chunk means a torn write. Half a session is worse than none — it would fail
        // to parse and could leave auth in an unrecoverable state, so report absence instead.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      // A keychain miss must never throw into Supabase's auth code, which treats a throw here
      // as a hard failure rather than "no stored session".
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const previousCount = (await readChunkCount(key)) ?? 0;

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      // An empty string still needs one chunk, or getItem returns '' as a 0-chunk join and the
      // caller can't tell it from a stored empty value.
      if (chunks.length === 0) chunks.push('');

      for (let i = 0; i < chunks.length; i += 1) {
        await SecureStore.setItemAsync(`${key}.${i}`, chunks[i] ?? '', OPTIONS);
      }

      // Write the manifest only after every chunk has landed: if this process dies mid-write,
      // the old manifest still points at a complete older value rather than a torn newer one.
      await SecureStore.setItemAsync(key, `${MANIFEST_PREFIX}${chunks.length}`, OPTIONS);

      // Then drop chunks the new value no longer uses. Skipping this is the classic bug in a
      // hand-rolled chunker — a session that shrinks from 4 chunks to 2 leaves two orphans, and
      // the next read of a 4-chunk manifest would splice stale bytes onto a fresh token.
      for (let i = chunks.length; i < previousCount; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
      }
    } catch {
      // Swallow: a failed session persist means "signed out next launch", which is recoverable.
      // Throwing would break the sign-in that is currently succeeding.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const count = (await readChunkCount(key)) ?? 0;
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
      }
      await SecureStore.deleteItemAsync(key, OPTIONS);
    } catch {
      // Same reasoning as setItem.
    }
  },
};
