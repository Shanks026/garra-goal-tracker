// SecureStore is mocked rather than exercised for real: this file tests *our* chunking logic, and
// the thing most likely to be wrong is orphan cleanup, which is invisible without seeing the
// whole keyspace. `mockStore` stands in for the keychain so assertions can inspect it directly.
// The `mock` prefix is required — jest.mock factories may not close over anything else.
const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

// Sits below the mock for readability; babel-plugin-jest-hoist lifts the jest.mock() above this
// import at compile time, so the ordering here is cosmetic rather than semantic.
// eslint-disable-next-line import/first
import { secureSessionStore } from './secureSessionStore';

const KEY = 'sb-test-ref-auth-token';

beforeEach(() => mockStore.clear());

describe('secureSessionStore', () => {
  it('round-trips a session-sized value that exceeds the 2048-byte SecureStore limit', async () => {
    // 6 KB — comfortably past the limit, and past a single chunk, which is the whole point.
    const session = JSON.stringify({ access_token: 'a'.repeat(4000), refresh_token: 'r'.repeat(2000) });
    expect(session.length).toBeGreaterThan(2048);

    await secureSessionStore.setItem(KEY, session);

    expect(await secureSessionStore.getItem(KEY)).toBe(session);
  });

  it('splits into chunks no larger than the limit, and no single stored value exceeds it', async () => {
    await secureSessionStore.setItem(KEY, 'x'.repeat(5000));

    for (const [key, value] of mockStore) {
      expect(value.length).toBeLessThanOrEqual(2048);
      expect(key.startsWith(KEY)).toBe(true);
    }
    // 5000 / 1800 = 3 chunks, plus the manifest.
    expect(mockStore.get(KEY)).toBe('chunks:3');
    expect(mockStore.size).toBe(4);
  });

  it('deletes stale chunks when a value shrinks, so a shorter session cannot splice old bytes', async () => {
    await secureSessionStore.setItem(KEY, 'y'.repeat(6000)); // 4 chunks
    expect(mockStore.get(KEY)).toBe('chunks:4');

    const short = 'z'.repeat(100); // 1 chunk
    await secureSessionStore.setItem(KEY, short);

    expect(mockStore.get(KEY)).toBe('chunks:1');
    expect(mockStore.has(`${KEY}.1`)).toBe(false);
    expect(mockStore.has(`${KEY}.2`)).toBe(false);
    expect(mockStore.has(`${KEY}.3`)).toBe(false);
    expect(await secureSessionStore.getItem(KEY)).toBe(short);
  });

  it('returns null rather than a partial value when a chunk is missing', async () => {
    await secureSessionStore.setItem(KEY, 'w'.repeat(5000));
    mockStore.delete(`${KEY}.1`); // simulate a torn write

    expect(await secureSessionStore.getItem(KEY)).toBeNull();
  });

  it('removeItem clears the manifest and every chunk', async () => {
    await secureSessionStore.setItem(KEY, 'v'.repeat(5000));
    await secureSessionStore.removeItem(KEY);

    expect(mockStore.size).toBe(0);
    expect(await secureSessionStore.getItem(KEY)).toBeNull();
  });

  it('returns an unchunked legacy value verbatim instead of treating it as corrupt', async () => {
    mockStore.set(KEY, 'a-value-written-without-a-manifest');

    expect(await secureSessionStore.getItem(KEY)).toBe('a-value-written-without-a-manifest');
  });

  it('reports null for a key that was never written', async () => {
    expect(await secureSessionStore.getItem(KEY)).toBeNull();
  });
});
