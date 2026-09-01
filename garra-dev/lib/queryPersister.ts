import { createMMKV } from 'react-native-mmkv';
import type { Persister } from '@tanstack/query-persist-client-core';

// Hand-written against MMKV directly rather than adding another package for this — MMKV's API
// is already synchronous and JSON-friendly, and the Persister interface is three tiny methods
// (06-conventions.md §6: prefer 20 lines in lib/ over a package for something small).
const storage = createMMKV({ id: 'garra-query-cache' });
const KEY = 'garra.queryClient';

export const mmkvPersister: Persister = {
  persistClient(persistedClient) {
    storage.set(KEY, JSON.stringify(persistedClient));
  },
  restoreClient() {
    const raw = storage.getString(KEY);
    return raw ? JSON.parse(raw) : undefined;
  },
  removeClient() {
    storage.remove(KEY);
  },
};
