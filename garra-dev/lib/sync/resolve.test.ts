import { collapseQueue, nextWatermark, resolveConflict, type QueuedOp } from './resolve';

const op = (id: string, rowId: string, kind: QueuedOp['op'] = 'insert'): QueuedOp => ({
  id,
  tableName: 'entries',
  rowId,
  op: kind,
});

describe('collapseQueue — replay idempotency (rules/06 §3)', () => {
  it('collapses repeated upserts of one row into a single push', () => {
    // The real sequence: log a ride, correct the value, correct it again, all offline.
    const planned = collapseQueue([op('q1', 'e1'), op('q2', 'e1'), op('q3', 'e1')]);

    expect(planned).toHaveLength(1);
    expect(planned[0]?.op).toBe('upsert');
    // All three queue rows clear together — leaving any behind would re-push next cycle forever.
    expect(planned[0]?.queueIds).toEqual(['q1', 'q2', 'q3']);
  });

  it('draining the same queue twice produces the same single operation', () => {
    const queue = [op('q1', 'e1'), op('q2', 'e1')];
    expect(collapseQueue(queue)).toEqual(collapseQueue(queue));
  });

  it('lets a later delete win over earlier upserts', () => {
    // Logged then undone offline: the remote must never see the row, not even briefly.
    const planned = collapseQueue([op('q1', 'e1'), op('q2', 'e1', 'delete')]);

    expect(planned).toHaveLength(1);
    expect(planned[0]?.op).toBe('delete');
    expect(planned[0]?.queueIds).toEqual(['q1', 'q2']);
  });

  it('lets a later upsert win over an earlier delete', () => {
    // Undo, change your mind, log again. The row exists locally, so it must exist remotely.
    const planned = collapseQueue([op('q1', 'e1', 'delete'), op('q2', 'e1')]);

    expect(planned[0]?.op).toBe('upsert');
  });

  it('treats insert and update as the same remote action', () => {
    const planned = collapseQueue([op('q1', 'e1', 'insert'), op('q2', 'e1', 'update')]);

    expect(planned).toHaveLength(1);
    expect(planned[0]?.op).toBe('upsert');
  });

  it('keeps distinct rows and distinct tables separate', () => {
    const planned = collapseQueue([
      op('q1', 'e1'),
      op('q2', 'e2'),
      { id: 'q3', tableName: 'goals', rowId: 'e1', op: 'insert' },
    ]);

    expect(planned).toHaveLength(3);
  });

  it('returns nothing for an empty queue', () => {
    expect(collapseQueue([])).toEqual([]);
  });
});

describe('resolveConflict — last-write-wins on client updated_at', () => {
  it('the newer edit wins, whichever side it is on', () => {
    expect(
      resolveConflict({ updatedAt: '2026-09-02T10:00:00Z' }, { updatedAt: '2026-09-02T11:00:00Z' }),
    ).toBe('remote');
    expect(
      resolveConflict({ updatedAt: '2026-09-02T12:00:00Z' }, { updatedAt: '2026-09-02T11:00:00Z' }),
    ).toBe('local');
  });

  it('resolves the exact scenario the moddatetime trigger used to get backwards', () => {
    // Device A edits at 10:00 and stays offline. Device B edits at 10:02 and pushes.
    // A comes online at 10:30 and pushes its OLDER row. With the old trigger the remote
    // updated_at became 10:30 and B discarded its newer edit. Now A's row still says 10:00, so
    // B's 10:02 correctly wins.
    const deviceB = { updatedAt: '2026-09-02T10:02:00Z' };
    const pushedByA = { updatedAt: '2026-09-02T10:00:00Z' };

    expect(resolveConflict(deviceB, pushedByA)).toBe('local');
  });

  it('compares across the two local timestamp formats correctly', () => {
    // SQLite space-form is genuinely LATER here; a string compare would say otherwise.
    expect(
      resolveConflict({ updatedAt: '2026-09-02T09:00:00.000Z' }, { updatedAt: '2026-09-02 14:33:01' }),
    ).toBe('remote');
  });

  it('reports equal timestamps as equal so the engine can skip the write', () => {
    const t = '2026-09-02T10:00:00Z';
    expect(resolveConflict({ updatedAt: t }, { updatedAt: t })).toBe('equal');
  });

  it('a row absent locally is always taken from remote', () => {
    expect(resolveConflict(null, { updatedAt: '2026-09-02T10:00:00Z' })).toBe('remote');
  });

  it('an unparseable local timestamp loses; an unparseable remote one loses too', () => {
    expect(resolveConflict({ updatedAt: null }, { updatedAt: '2026-09-02T10:00:00Z' })).toBe('remote');
    expect(resolveConflict({ updatedAt: '2026-09-02T10:00:00Z' }, { updatedAt: null })).toBe('local');
  });
});

describe('nextWatermark', () => {
  it('advances to the greatest synced_at seen', () => {
    expect(
      nextWatermark('2026-09-01T00:00:00.000Z', [
        '2026-09-02T10:00:00.000Z',
        '2026-09-02T12:00:00.000Z',
        '2026-09-02T11:00:00.000Z',
      ]),
    ).toBe('2026-09-02T12:00:00.000Z');
  });

  it('never moves backwards when a pull returns older rows', () => {
    expect(nextWatermark('2026-09-05T00:00:00.000Z', ['2026-09-02T10:00:00.000Z'])).toBe(
      '2026-09-05T00:00:00.000Z',
    );
  });

  it('holds the previous watermark when nothing arrived', () => {
    expect(nextWatermark('2026-09-05T00:00:00.000Z', [])).toBe('2026-09-05T00:00:00.000Z');
  });

  it('bootstraps from null on the first ever pull', () => {
    expect(nextWatermark(null, ['2026-09-02T10:00:00.000Z'])).toBe('2026-09-02T10:00:00.000Z');
    expect(nextWatermark(null, [])).toBeNull();
  });

  it('ignores unparseable values rather than stalling the watermark', () => {
    expect(nextWatermark(null, [null, 'nonsense', '2026-09-02T10:00:00.000Z'])).toBe(
      '2026-09-02T10:00:00.000Z',
    );
  });
});
