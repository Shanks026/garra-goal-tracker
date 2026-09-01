import { ACCENT_HEXES, assignAccents, nextUnusedAccent } from './accents';

describe('nextUnusedAccent', () => {
  it('returns the first accent when nothing is taken', () => {
    expect(nextUnusedAccent([])).toBe(ACCENT_HEXES[0]);
  });

  it('skips taken accents, preserving ACCENT_ORDER', () => {
    expect(nextUnusedAccent([ACCENT_HEXES[0]!])).toBe(ACCENT_HEXES[1]);
    expect(nextUnusedAccent([ACCENT_HEXES[1]!])).toBe(ACCENT_HEXES[0]);
  });

  it('wraps rather than returning undefined once the palette is exhausted', () => {
    const all = [...ACCENT_HEXES];
    expect(ACCENT_HEXES).toContain(nextUnusedAccent(all));
  });
});

describe('assignAccents', () => {
  it('assigns distinct accents in order — no two goals share one', () => {
    const assigned = assignAccents(4);
    expect(new Set(assigned).size).toBe(4);
    expect(assigned).toEqual(ACCENT_HEXES.slice(0, 4));
  });

  it('avoids accents already used by existing goals', () => {
    const existing = [ACCENT_HEXES[0]!, ACCENT_HEXES[1]!];
    const assigned = assignAccents(2, existing);
    expect(assigned).toEqual([ACCENT_HEXES[2], ACCENT_HEXES[3]]);
    for (const hex of assigned) expect(existing).not.toContain(hex);
  });

  it('matches what repeated nextUnusedAccent calls would produce — preview equals reality', () => {
    // The bug this guards: a preview computed one way, the mutation another.
    const used: string[] = [];
    const oneAtATime = [0, 1, 2].map(() => {
      const next = nextUnusedAccent(used);
      used.push(next);
      return next;
    });
    expect(assignAccents(3)).toEqual(oneAtATime);
  });
});
