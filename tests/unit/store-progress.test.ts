import { describe, expect, it } from 'vitest';

import { JULY_2, JULY_2_DAY, PROGRESS_KEY, fakeStorage, persisted, storeOn } from './store-fixtures';

// What the store records besides the streak: the daily practice log and the
// flashcard miss queue, both read by islands, and the best quiz scores, which only
// public/quiz.html uses until slice 6. store.js writes all of them into the same
// key, so this store has to round-trip the scores untouched or that page loses a
// student's bests.

describe('the daily practice log', () => {
  it('records what was practised today', () => {
    const store = storeOn(JULY_2);

    store.logPractice('stretch');
    store.logPractice('sanchin');

    expect(store.todayPractice()).toEqual(['stretch', 'sanchin']);
  });

  it('records an activity once however many times it is logged', () => {
    const store = storeOn(JULY_2);

    store.logPractice('stretch');
    store.logPractice('stretch');

    expect(store.todayPractice()).toEqual(['stretch']);
  });

  it('removes an activity that was un-ticked', () => {
    const store = storeOn(JULY_2);
    store.logPractice('stretch');
    store.logPractice('kihon');

    store.unlogPractice('stretch');

    expect(store.todayPractice()).toEqual(['kihon']);
  });

  it('leaves no empty day behind when the last activity is removed', () => {
    const storage = fakeStorage();
    const store = storeOn(JULY_2, storage);
    store.logPractice('stretch');

    store.unlogPractice('stretch');

    // The day's key is deleted rather than left as []. The week strip counts a day
    // as practised when its array is non-empty, so an empty array would be
    // harmless — but store.js deletes it, and the persisted shape has to match.
    expect(persisted(storage)).toEqual({ plog: {} });
  });

  it('reports nothing for a day with no practice', () => {
    expect(storeOn(JULY_2, fakeStorage()).practiceOn(JULY_2_DAY - 3)).toEqual([]);
  });

  it('reads back a day logged earlier in the week', () => {
    const storage = fakeStorage();
    storeOn('2026-06-30T12:00:00Z', storage).logPractice('mara');

    expect(storeOn(JULY_2, storage).practiceOn(JULY_2_DAY - 2)).toEqual(['mara']);
  });

  it('forgets practice older than sixty days', () => {
    const storage = fakeStorage({
      [PROGRESS_KEY]: JSON.stringify({
        plog: {
          [String(JULY_2_DAY - 61)]: ['stretch'],
          [String(JULY_2_DAY - 60)]: ['mara'],
          [String(JULY_2_DAY - 59)]: ['kihon'],
        },
      }),
    });
    const store = storeOn(JULY_2, storage);

    store.logPractice('sanchin');

    // Strictly older than 60 days goes; exactly 60 stays. The boundary matters
    // because the page shows a 30-day summary and the log is otherwise unbounded.
    expect(store.practiceOn(JULY_2_DAY - 61)).toEqual([]);
    expect(store.practiceOn(JULY_2_DAY - 60)).toEqual(['mara']);
    expect(store.practiceOn(JULY_2_DAY - 59)).toEqual(['kihon']);
  });

  it('does not prune while un-ticking', () => {
    // store.js prunes only on the logging path. Pruning here too would be tidier
    // and would break parity, so it is pinned rather than improved.
    const storage = fakeStorage({
      [PROGRESS_KEY]: JSON.stringify({
        plog: { [String(JULY_2_DAY - 61)]: ['stretch'], [String(JULY_2_DAY)]: ['mara'] },
      }),
    });
    const store = storeOn(JULY_2, storage);

    store.unlogPractice('mara');

    expect(store.practiceOn(JULY_2_DAY - 61)).toEqual(['stretch']);
  });
});

describe('best quiz scores', () => {
  it('reports nothing for a mode never played', () => {
    expect(storeOn(JULY_2, fakeStorage()).best('terms')).toBe(0);
  });

  it('records a new best and says it was one', () => {
    const store = storeOn(JULY_2);

    expect(store.setBest('terms', 7)).toBe(true);
    expect(store.best('terms')).toBe(7);
  });

  it('keeps the higher score and says the lower one was not a best', () => {
    const store = storeOn(JULY_2);
    store.setBest('terms', 7);

    expect(store.setBest('terms', 5)).toBe(false);
    expect(store.best('terms')).toBe(7);
  });

  it('writes nothing at all when the score was not a best', () => {
    // store.js only saves on the improving path. A losing round must not touch
    // storage, or two implementations racing on the same key would differ.
    const storage = fakeStorage();
    storeOn(JULY_2, storage).setBest('terms', 0);

    expect(storage.read(PROGRESS_KEY)).toBeNull();
  });

  it('keeps scores for different modes apart', () => {
    const store = storeOn(JULY_2);

    store.setBest('terms', 7);
    store.setBest('kumite', 3);

    expect([store.best('terms'), store.best('kumite')]).toEqual([7, 3]);
  });
});

describe('the flashcard miss queue', () => {
  it('starts empty', () => {
    expect(storeOn(JULY_2, fakeStorage()).misses()).toEqual({});
  });

  it('counts a card the student did not know', () => {
    const store = storeOn(JULY_2);

    store.recordCard('c1abc', false);
    store.recordCard('c1abc', false);

    expect(store.misses()).toEqual({ c1abc: 2 });
  });

  it('works a miss back off when the student gets it', () => {
    const store = storeOn(JULY_2);
    store.recordCard('c1abc', false);
    store.recordCard('c1abc', false);

    store.recordCard('c1abc', true);

    expect(store.misses()).toEqual({ c1abc: 1 });
  });

  it('forgets a card once its misses are worked off', () => {
    const store = storeOn(JULY_2);
    store.recordCard('c1abc', false);

    store.recordCard('c1abc', true);

    expect(store.misses()).toEqual({});
  });

  it('ignores a correct answer for a card that was never missed', () => {
    const store = storeOn(JULY_2);

    store.recordCard('c1abc', true);

    expect(store.misses()).toEqual({});
  });
});

describe('card hashing', () => {
  it('gives the same card the same key every time', () => {
    const store = storeOn(JULY_2, fakeStorage());

    expect(store.hash('Zanshin|Remaining mind')).toBe(store.hash('Zanshin|Remaining mind'));
  });

  it('gives different cards different keys', () => {
    const store = storeOn(JULY_2, fakeStorage());

    expect(store.hash('Zanshin|Remaining mind')).not.toBe(store.hash('Mushin|No mind'));
  });

  it('produces a key that is safe as a JSON object property', () => {
    // The result is used directly as a key in the persisted miss map, so it must
    // not be empty and must not need escaping.
    const store = storeOn(JULY_2, fakeStorage());

    expect(store.hash('Zanshin|Remaining mind')).toMatch(/^c[0-9a-z]+$/);
  });
});
