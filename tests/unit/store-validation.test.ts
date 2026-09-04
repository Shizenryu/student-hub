import { describe, expect, it } from 'vitest';

import { createStore } from '../../src/domain/store';
import { JULY_1_DAY, JULY_2, JULY_2_DAY, PROGRESS_KEY, fakeStorage, storeOn } from './store-fixtures';

// localStorage is untrusted input. It is shared with anything else on the origin,
// it survives across versions of this site, and a student can edit it by hand.
// The store must never hand the page something it cannot render.
//
// The most important case here is the first one. Real students already have data
// in this key, written by public/assets/store.js, with no version field. A guard
// that rejected it would wipe live streaks on the day this ships — so it is
// tested first and must never regress.

const storeReading = (stored: string) => storeOn(JULY_2, fakeStorage({ [PROGRESS_KEY]: stored }));

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
    // 1e999 is valid JSON and parses to Infinity, which is how a non-finite number
    // actually reaches this guard --- the literals NaN and Infinity are not JSON at
    // all. An infinite day number makes every streak comparison false forever.
    { label: 'a streak day that overflows to Infinity', stored: '{"streak":{"last":1e999,"count":1,"best":1}}' },
    { label: 'a best score that overflows to Infinity', stored: '{"best":{"terms":1e999}}' },
    // Keyed on today, so a value that leaked through would show up in a read.
    { label: 'a practice log holding a bare string', stored: `{"plog":{"${JULY_2_DAY}":"terms"}}` },
    { label: 'a practice log holding non-strings', stored: `{"plog":{"${JULY_2_DAY}":[1,2]}}` },
  ];

  // Every reader, not just the streak. Mutation testing found that asserting the
  // streak alone could not tell "discarded" from "accepted": dropping the guard's
  // best-scores or practice-log clause left the streak reading zero either way,
  // and the suite stayed green while rubbish flowed through to the page.
  it.each(unusable)('starts every reader clean when the stored state is $label', ({ stored }) => {
    const store = storeReading(stored);

    expect({
      streak: store.streakInfo(),
      best: store.best('terms'),
      misses: store.misses(),
      practisedToday: store.todayPractice(),
    }).toEqual({
      streak: { count: 0, best: 0, today: false, alive: false },
      best: 0,
      misses: {},
      practisedToday: [],
    });
  });

  it.each(unusable)('writes a clean state over $label rather than alongside it', ({ stored }) => {
    // The other half of the same point, and the only thing that catches a guard
    // which accepts a top-level ARRAY: every reader answers cleanly for an array
    // too, but the next write spreads it into numeric keys and the result is
    // something store.js cannot read on a legacy page.
    const storage = fakeStorage({ [PROGRESS_KEY]: stored });

    createStore({ storage, now: () => new Date(JULY_2) }).markTrained();

    expect(JSON.parse(storage.read(PROGRESS_KEY) ?? 'null')).toEqual({
      streak: { last: JULY_2_DAY, count: 1, best: 1 },
    });
  });

  it.each(unusable)('does not throw reading $label', ({ stored }) => {
    // A student with a corrupt key must get an empty page, not a blank one. This is
    // separate from the assertion above on purpose: a guard that threw would fail
    // that test too, but for a reason the message would not explain.
    expect(() => storeReading(stored).streakInfo()).not.toThrow();
  });

});
