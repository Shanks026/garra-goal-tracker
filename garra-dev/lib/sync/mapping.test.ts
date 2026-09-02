import { fromRemote, parseTimestamp, TABLE_FIELDS, toIso, toRemote } from './mapping';
import { SYNC_TABLES } from './tables';

describe('parseTimestamp', () => {
  it("treats SQLite's zone-less current_timestamp as UTC, not device-local", () => {
    // The bug this exists to prevent: `new Date('2026-09-02 14:33:01')` is parsed as LOCAL time
    // by JS, so on a UTC+5:30 device it lands 5.5 hours off — on the value that decides which
    // edit survives a conflict.
    expect(parseTimestamp('2026-09-02 14:33:01')).toBe(Date.parse('2026-09-02T14:33:01Z'));
  });

  it('parses the two formats the app actually writes to the SAME instant', () => {
    // Every db.insert() omits updated_at and gets SQLite's space-separated form; every
    // db.update() sets it explicitly via toISOString(). Both are in circulation.
    const sqliteForm = parseTimestamp('2026-09-02 14:33:01');
    const isoForm = parseTimestamp('2026-09-02T14:33:01.000Z');
    expect(sqliteForm).toBe(isoForm);
  });

  it('exposes why a naive string compare of those two formats is wrong', () => {
    // Guards the reasoning, not just the code: ' ' (0x20) sorts before 'T' (0x54), so string
    // comparison would call the EARLIER-looking row older no matter the real times.
    const older = '2026-09-02T09:00:00.000Z'; // genuinely earlier
    const newer = '2026-09-02 14:33:01'; // genuinely later
    expect(newer < older).toBe(true); // string compare: wrong
    expect(parseTimestamp(newer) > parseTimestamp(older)).toBe(true); // parsed: right
  });

  it('respects an explicit non-UTC offset', () => {
    expect(parseTimestamp('2026-09-02T14:33:01+05:30')).toBe(Date.parse('2026-09-02T09:03:01Z'));
  });

  it('returns NaN for missing or unparseable values rather than throwing', () => {
    expect(parseTimestamp(null)).toBeNaN();
    expect(parseTimestamp(undefined)).toBeNaN();
    expect(parseTimestamp('')).toBeNaN();
    expect(parseTimestamp('not a date')).toBeNaN();
  });

  it('toIso normalises both formats to one canonical storage form', () => {
    expect(toIso('2026-09-02 14:33:01')).toBe('2026-09-02T14:33:01.000Z');
    expect(toIso('2026-09-02T14:33:01.000Z')).toBe('2026-09-02T14:33:01.000Z');
    expect(toIso('rubbish')).toBeNull();
  });
});

describe('field specs', () => {
  it('never maps user_id or synced_at — both are server-owned', () => {
    for (const table of SYNC_TABLES) {
      const remoteNames = TABLE_FIELDS[table].map((f) => f.remote);
      expect(remoteNames).not.toContain('user_id');
      expect(remoteNames).not.toContain('synced_at');
    }
  });

  it('maps every table with a unique local and remote name per field', () => {
    for (const table of SYNC_TABLES) {
      const locals = TABLE_FIELDS[table].map((f) => f.local);
      const remotes = TABLE_FIELDS[table].map((f) => f.remote);
      expect(new Set(locals).size).toBe(locals.length);
      expect(new Set(remotes).size).toBe(remotes.length);
    }
  });
});

describe('toRemote / fromRemote', () => {
  const localGoal = {
    id: 'g1',
    arcId: 'a1',
    type: 'habit',
    title: 'Cycling',
    direction: 'up',
    accent: '#FF6B5A',
    icon: 'bike',
    isMain: true,
    targetAmount: 800,
    unit: 'km',
    startingValue: null,
    cadenceMode: 'specific_days',
    timesPerWeek: null,
    daysOfWeek: [1, 3, 5],
    intervalDays: null,
    sessionTarget: null,
    estMinutes: 60,
    paceBasis: 'even',
    quickAdd: [10, 20, 40],
    itemNoun: null,
    startsAt: '2026-09-01',
    endsAt: null,
    status: 'active',
    createdAt: '2026-09-01 10:00:00',
    updatedAt: '2026-09-02T14:33:01.000Z',
  };

  it('snake_cases keys and omits user_id so DEFAULT auth.uid() fills it', () => {
    const remote = toRemote('goals', localGoal);

    expect(remote.arc_id).toBe('a1');
    expect(remote.is_main).toBe(true);
    expect(remote.target_amount).toBe(800);
    expect(remote.days_of_week).toEqual([1, 3, 5]);
    expect(remote.quick_add).toEqual([10, 20, 40]);
    expect('user_id' in remote).toBe(false);
    expect('arcId' in remote).toBe(false);
  });

  it('normalises both local timestamp formats on the way out', () => {
    const remote = toRemote('goals', localGoal);
    expect(remote.created_at).toBe('2026-09-01T10:00:00.000Z');
    expect(remote.updated_at).toBe('2026-09-02T14:33:01.000Z');
  });

  it('round-trips a goal through remote and back without losing a field', () => {
    const back = fromRemote('goals', toRemote('goals', localGoal));

    // createdAt is the one deliberate change: it comes back canonicalised to ISO rather than
    // SQLite's space form. Compared on instant, not string.
    expect(parseTimestamp(back.createdAt as string)).toBe(parseTimestamp(localGoal.createdAt));
    expect({ ...back, createdAt: localGoal.createdAt }).toEqual(localGoal);
  });

  it('drops user_id and synced_at arriving from a pull', () => {
    const remote = {
      ...toRemote('goals', localGoal),
      user_id: '00000000-0000-0000-0000-000000000001',
      synced_at: '2026-09-02T14:40:00.000Z',
    };
    const local = fromRemote('goals', remote);

    expect('userId' in local).toBe(false);
    expect('syncedAt' in local).toBe(false);
    expect('user_id' in local).toBe(false);
  });

  it('coerces Postgres numeric-as-string back to a real number', () => {
    // Postgres sends `numeric` as a string to preserve precision. Left as a string it would
    // poison every sum in lib/derive/progress.ts — '10' + '20' is '1020'.
    const local = fromRemote('entries', {
      id: 'e1',
      goal_id: 'g1',
      day_key: '2026-09-02',
      logged_at: '2026-09-02T14:33:01.000Z',
      value: '42.5',
      skipped: false,
      backfilled: false,
      created_at: '2026-09-02T14:33:01.000Z',
      updated_at: '2026-09-02T14:33:01.000Z',
    });

    expect(local.value).toBe(42.5);
    expect(typeof local.value).toBe('number');
  });

  it('coerces SQLite integer booleans to real booleans', () => {
    const remote = toRemote('entries', { id: 'e1', skipped: 1, backfilled: 0 });
    expect(remote.skipped).toBe(true);
    expect(remote.backfilled).toBe(false);
  });

  it('preserves nulls rather than dropping the key, so an upsert can clear a column', () => {
    const remote = toRemote('goals', { id: 'g1', unit: null, endsAt: null });
    expect(remote.unit).toBeNull();
    expect(remote.ends_at).toBeNull();
  });

  it('omits absent keys entirely, so a partial row does not null out columns', () => {
    const remote = toRemote('goals', { id: 'g1' });
    expect(Object.keys(remote)).toEqual(['id']);
  });

  it('round-trips every table shape without throwing', () => {
    for (const table of SYNC_TABLES) {
      const stub: Record<string, unknown> = { id: 'x' };
      expect(() => fromRemote(table, toRemote(table, stub))).not.toThrow();
    }
  });
});
