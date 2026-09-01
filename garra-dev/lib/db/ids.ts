import * as Crypto from 'expo-crypto';

// The bare `crypto.randomUUID()` global is not actually available at runtime despite
// TypeScript's ambient lib types not flagging it (00-index.md standing rule #10) — use
// expo-crypto's implementation for every locally generated id.
export function newId(): string {
  return Crypto.randomUUID();
}
