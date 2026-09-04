import { describe, expect, it } from 'vitest';

import { createStore } from '../../src/domain/store';
import { fakeStorage } from './fake-storage';

// localStorage is untrusted input. It is shared with anything else on the origin,
// it survives across versions of this site, and a student can edit it by hand.
// The store must never hand the page something it cannot render.
//
// The most important case here is the first one. Real students already have data
// in this key, written by public/assets/store.js, with no version field. A guard
// that rejected it would wipe live streaks on the day this ships — so it is
// tested first and must never regress.

const KEY = 'shizenryu-progress-v1';
const JULY_2 = '2026-07-02T12:00:00Z';

// 2026-07-01 and 2026-07-02 as local day numbers; see store-day-number.test.ts
// for the derivation.
const JULY_1_DAY = 20635;
const JULY_2_DAY = 20636;

const storeReading = (stored: string) =>
  createStore({ storage: fakeStorage({ [KEY]: stored }), now: () => new Date(JULY_2) });

describe('state already in a student browser', () => {
  it('keeps a streak written by the legacy store, which carries no version field', () => {
    // Exactly what public/assets/store.js writes after two days of training and a
    // quiz round: no version, optional keys, numbers throughout.
    const legacy = JSON.stringify({
      streak: { last: JULY_1_DAY, count: 12, best: 30 },
      best: { terms: 8 },
      miss: { c1abc: 2 },
      plog: { [String(JULY_1_DAY)]: ['terms', 'stretch'] },
    });

    expect(storeReading(legacy).streakInfo()).toEqual({
      count: 12,
      best: 30,
      today: false,
      alive: true,
    });
  });

  it('keeps a partial state from a student who has only ever done a quiz', () => {
    // No plog and no miss: absent is not malformed.
    const partial = JSON.stringify({ streak: { last: JULY_2_DAY, count: 3, best: 3 } });

    expect(storeReading(partial).streakInfo()).toEqual({
      count: 3,
      best: 3,
      today: true,
      alive: true,
    });
  });
});

describe('state that cannot be trusted', () => {
  const unusable: ReadonlyArray<{ readonly label: string; readonly stored: string }> = [
    { label: 'not JSON at all', stored: 'not json {' },
    { label: 'a JSON string', stored: '"a string"' },
    { label: 'a JSON number', stored: '42' },
    { label: 'a JSON array', stored: '[{"streak":{"last":1,"count":1,"best":1}}]' },
    { label: 'null', stored: 'null' },
    { label: 'a streak that is not an object', stored: '{"streak":"twelve"}' },
    { label: 'a streak that is an array', stored: '{"streak":[20635,12,30]}' },
    { label: 'a streak with a string count', stored: '{"streak":{"last":20635,"count":"12","best":30}}' },
    { label: 'a streak missing its count', stored: '{"streak":{"last":20635,"best":30}}' },
    { label: 'a streak with a NaN day', stored: '{"streak":{"last":null,"count":1,"best":1}}' },
    { label: 'best scores that are not numbers', stored: '{"best":{"terms":"eight"}}' },
    { label: 'a practice log holding a bare string', stored: '{"plog":{"20635":"terms"}}' },
    { label: 'a practice log holding non-strings', stored: '{"plog":{"20635":[1,2]}}' },
  ];

  it.each(unusable)('starts clean when the stored state is $label', ({ stored }) => {
    expect(storeReading(stored).streakInfo()).toEqual({
      count: 0,
      best: 0,
      today: false,
      alive: false,
    });
  });

  it.each(unusable)('does not throw reading $label', ({ stored }) => {
    // A student with a corrupt key must get an empty page, not a blank one. This is
    // separate from the assertion above on purpose: a guard that threw would fail
    // that test too, but for a reason the message would not explain.
    expect(() => storeReading(stored).streakInfo()).not.toThrow();
  });

  it('replaces unusable state rather than merging the next write into it', () => {
    const storage = fakeStorage({ [KEY]: '{"streak":"twelve","best":{"terms":"eight"}}' });
    const store = createStore({ storage, now: () => new Date(JULY_2) });

    store.markTrained();

    // The rubbish is gone, not carried alongside the repaired streak: a later read
    // by store.js on a legacy page has to find a shape it can use too.
    expect(JSON.parse(storage.read(KEY) ?? 'null')).toEqual({
      streak: { last: JULY_2_DAY, count: 1, best: 1 },
    });
  });
});
