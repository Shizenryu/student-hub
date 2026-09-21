import { describe, expect, it } from 'vitest';

import { sideLabel } from '../../src/components/kumite-labels';

// The one string the kumite reference page adds: the expansion of a side. The
// words are the quiz's own — "Same side (SS) or opposite side (OS)?" — so the two
// pages say the same thing.
describe('a kumite side, expanded', () => {
  it('reads OS as the opposite side', () => {
    expect(sideLabel('OS')).toBe('opposite side');
  });

  it('reads SS as the same side', () => {
    expect(sideLabel('SS')).toBe('same side');
  });
});
