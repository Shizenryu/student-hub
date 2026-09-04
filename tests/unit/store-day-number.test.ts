import { describe, expect, it } from 'vitest';

import { createStore } from '../../src/domain/store';

// The day number is the fiddliest thing in the store and already has one shipped
// defect behind it (#12): it was Math.floor(Date.now() / 86400000), a UTC day
// number, so a student training just after local midnight during British Summer
// Time was logged to the previous day and appeared to break a streak they had
// not broken.
//
// store.js takes the clock from the ambient `new Date()`, which makes this only
// testable by freezing global time. src/domain/store.ts takes a clock instead —
// the spec's "domain/ is pure and injectable" — so these read as ordinary
// function calls with no global state to restore. The process timezone still
// decides what "local" means; vitest.config.ts pins it to Europe/London, the
// club's zone and the zone the bug lives in.
const at = (iso: string) => () => new Date(iso);

// A store with nowhere to persist: these tests are about the calendar, not
// storage, and a null storage exercises the same in-memory fallback a student
// with cookies disabled gets.
const storeAt = (iso: string) => createStore({ storage: null, now: at(iso) });

describe('the day number follows the local calendar date, not the UTC one', () => {
  it('reports 2 July in London when it is still 1 July in UTC', () => {
    // 2026-07-01T23:30:00Z is 2026-07-02T00:30:00+01:00 in Europe/London — the
    // exact window the shipped defect got wrong.
    //
    // Derived independently, NOT with Date.UTC(2026, 6, 2) / 86400000, which is
    // the expression the implementation itself uses:
    //   1970-01-01 -> 2000-01-01 = 10957 days (30 years, 7 leap: 1972..1996)
    //   2000-01-01 -> 2026-01-01 = 26*365 + 7 leap (2000..2024) = 9497
    //     => 2026-01-01 is day 20454
    //   2026-01-01 -> 2026-07-02 = 31+28+31+30+31+30 = 181, +1 = 182
    //     => 20454 + 182 = 20636
    expect(storeAt('2026-07-01T23:30:00Z').today()).toBe(20636);
  });

  it('agrees with the UTC date when London and UTC fall on the same day', () => {
    // 13:00 BST, same calendar date on both clocks. Pins that reading the local
    // date does not shift the ordinary case: 20454 + 181 = 20635.
    expect(storeAt('2026-07-01T12:00:00Z').today()).toBe(20635);
  });

  it('holds one day number across a whole local day, both sides of UTC midnight', () => {
    // 2026-07-02 in London runs from 2026-07-01T23:00Z to 2026-07-02T22:59Z, so a
    // correct implementation answers 20636 at both ends while the UTC date changes
    // underneath it. A UTC day number answers 20635 then 20636 and splits the day.
    expect(storeAt('2026-07-01T23:00:00Z').today()).toBe(20636);
    expect(storeAt('2026-07-02T22:59:59Z').today()).toBe(20636);
  });

  it('advances at local midnight rather than at 01:00 local during BST', () => {
    // The minute either side of local midnight: 22:59:59Z is 23:59:59+01:00 on the
    // 2nd, and 23:00:00Z is 00:00:00+01:00 on the 3rd. A UTC day number would hold
    // 20636 across this boundary and roll an hour later.
    expect(storeAt('2026-07-02T22:59:59Z').today()).toBe(20636);
    expect(storeAt('2026-07-02T23:00:00Z').today()).toBe(20637);
  });

  it('advances at local midnight in winter too, when London is UTC', () => {
    // Outside BST there is no offset, so local midnight and UTC midnight coincide.
    // This is the control: it fails if an implementation "fixes" the summer case by
    // subtracting a fixed hour rather than reading the local date.
    //   2026-01-01 is day 20454, so 2026-01-02 is 20455.
    expect(storeAt('2026-01-01T23:59:59Z').today()).toBe(20454);
    expect(storeAt('2026-01-02T00:00:00Z').today()).toBe(20455);
  });
});
