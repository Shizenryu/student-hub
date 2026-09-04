import { describe, expect, it } from 'vitest';

import { createStore } from '../../src/domain/store';
import { fakeStorage, unwritableStorage } from './fake-storage';

// The streak is the thing students actually care about, and the thing that
// silently breaks if the day arithmetic or the transition rules are a step out.
// These drive it through whole days rather than through internal state: a store
// is built at a given moment, used, and rebuilt at a later moment against the
// same storage — the same way a student closes the page and comes back tomorrow.

const JULY_1 = '2026-07-01T12:00:00Z';
const JULY_2 = '2026-07-02T12:00:00Z';
const JULY_3 = '2026-07-03T12:00:00Z';
const JULY_5 = '2026-07-05T12:00:00Z';

const storeOn = (iso: string, storage: ReturnType<typeof fakeStorage>) =>
  createStore({ storage, now: () => new Date(iso) });

describe('training on a day', () => {
  it('starts a streak at one', () => {
    const storage = fakeStorage();

    expect(storeOn(JULY_1, storage).markTrained()).toEqual({ count: 1, best: 1, today: true });
  });

  it('counts a second session on the same day only once', () => {
    const storage = fakeStorage();
    const store = storeOn(JULY_1, storage);

    store.markTrained();

    expect(store.markTrained()).toEqual({ count: 1, best: 1, today: true });
  });

  it('extends the streak when the last session was yesterday', () => {
    const storage = fakeStorage();
    storeOn(JULY_1, storage).markTrained();

    expect(storeOn(JULY_2, storage).markTrained()).toEqual({ count: 2, best: 2, today: true });
  });

  it('restarts at one when a day was missed', () => {
    const storage = fakeStorage();
    storeOn(JULY_1, storage).markTrained();
    storeOn(JULY_2, storage).markTrained();

    // Nothing on the 3rd or 4th; training on the 5th is a new streak, but the
    // best is a high-water mark and must survive the reset.
    expect(storeOn(JULY_5, storage).markTrained()).toEqual({ count: 1, best: 2, today: true });
  });
});

describe('reading the streak without training', () => {
  it('reports nothing for a student who has never trained', () => {
    // alive is false, not true: the stored default last-trained day is 0, which is
    // 1 January 1970 and so not yesterday. store.js has answered this since it was
    // written, and nothing reads `alive` — but the parity proof compares the whole
    // returned object, so the honest expectation is what it actually says.
    expect(storeOn(JULY_1, fakeStorage()).streakInfo()).toEqual({
      count: 0,
      best: 0,
      today: false,
      alive: false,
    });
  });

  it('reports the streak as alive but not yet trained on the following day', () => {
    const storage = fakeStorage();
    storeOn(JULY_1, storage).markTrained();
    storeOn(JULY_2, storage).markTrained();

    // The 3rd, before training: the streak still stands, and the page says "train
    // today to keep it" on exactly this state.
    expect(storeOn(JULY_3, storage).streakInfo()).toEqual({
      count: 2,
      best: 2,
      today: false,
      alive: true,
    });
  });

  it('reports a broken streak as zero while keeping the best score', () => {
    const storage = fakeStorage();
    storeOn(JULY_1, storage).markTrained();
    storeOn(JULY_2, storage).markTrained();

    expect(storeOn(JULY_5, storage).streakInfo()).toEqual({
      count: 0,
      best: 2,
      today: false,
      alive: false,
    });
  });

  it('does not erase the stored streak just because someone read it', () => {
    const storage = fakeStorage();
    storeOn(JULY_1, storage).markTrained();
    storeOn(JULY_2, storage).markTrained();

    // Reading on a day that breaks the streak reports 0 — but it is a read. If it
    // wrote that 0 back, training later the same day would start from 1 instead of
    // continuing, and the student would lose a streak to having opened the page.
    storeOn(JULY_3, storage).streakInfo();

    expect(storeOn(JULY_3, storage).markTrained()).toEqual({ count: 3, best: 3, today: true });
  });
});

describe('when the browser will not store anything', () => {
  it('still answers, and reports itself unavailable', () => {
    const store = createStore({ storage: null, now: () => new Date(JULY_1) });

    expect(store.available).toBe(false);
    expect(store.markTrained()).toEqual({ count: 1, best: 1, today: true });
  });

  it('keeps working within the page when writes throw', () => {
    // Safari private browsing: localStorage exists and setItem throws. The student
    // should still see their streak move while the page is open, even though
    // nothing survives the reload.
    const storage = unwritableStorage();
    const store = createStore({ storage, now: () => new Date(JULY_1) });

    store.markTrained();

    expect(store.streakInfo()).toEqual({ count: 1, best: 1, today: true, alive: true });
  });
});
