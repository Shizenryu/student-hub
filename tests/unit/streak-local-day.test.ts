import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadLegacyStore } from './store-fixtures';

// The loader lives in store-fixtures.ts, shared with store-parity.test.ts, which
// needs the same evaluation trick against the same file. Using it here also drops
// the `as StoreModule` this file used to need: the shared loader narrows through a
// real type guard, which is what the project's no-assertions rule asks for.

describe('Store.today() follows the local calendar date, not the UTC one', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports 2 July in London when it is still 1 July in UTC', async () => {
    // 2026-07-01T23:30:00Z is 2026-07-02T00:30:00+01:00 in Europe/London (BST) —
    // the exact window where a UTC-based day number logs the session to the wrong,
    // already-finished day.
    vi.setSystemTime(new Date('2026-07-01T23:30:00Z'));

    const Store = await loadLegacyStore();

    // Independently derived, NOT via Date.UTC(2026,6,2)/86400000 (the expression the
    // fix itself uses) — days-since-epoch to 2026-07-02, worked out by hand:
    //   1970-01-01 -> 2000-01-01 is 10957 days (30 years incl. 7 leap years:
    //     1972,76,80,84,88,92,96)
    //   2000-01-01 -> 2026-01-01 is 26*365 + 7 leap days (2000,04,08,12,16,20,24)
    //     = 9490 + 7 = 9497 days, landing on day number 10957 + 9497 = 20454
    //   2026-01-01 -> 2026-07-02 is Jan(31)+Feb(28)+Mar(31)+Apr(30)+May(31)+Jun(30)
    //     = 181 days to 1 July, +1 more day to 2 July = 182 days
    //   20454 + 182 = 20636
    const expectedDayNumberFor2ndJuly2026 = 20636;

    expect(Store.today()).toBe(expectedDayNumberFor2ndJuly2026);
  });

  it('agrees with the UTC calendar date at a time when London and UTC coincide', async () => {
    // 2026-07-01T12:00:00Z is 2026-07-01T13:00:00+01:00 in Europe/London — the same
    // calendar date on both clocks, so this pins the ordinary case: the fix must not
    // change behaviour when there is no UTC/local disagreement to resolve.
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));

    const Store = await loadLegacyStore();

    // Same independent derivation as above, one day earlier: 20454 + 181 = 20635.
    const expectedDayNumberFor1stJuly2026 = 20635;

    expect(Store.today()).toBe(expectedDayNumberFor1stJuly2026);
  });
});
