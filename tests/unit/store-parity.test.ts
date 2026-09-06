import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../../src/domain/store';
import type { Store } from '../../src/domain/store';
import { PROGRESS_KEY, fakeStorage, loadLegacyStore } from './store-fixtures';
import type { LegacyStore } from './store-fixtures';

// Half of what this suite used to be, because half of what it proved has been
// delivered.
//
// Until slice 6 there were TWO writers of the same localStorage key: the islands
// through src/domain/store.ts, and public/quiz.html through public/assets/store.js.
// So the proof ran identical operation SEQUENCES through both and compared the bytes
// they persisted. quiz.html was the last writer, and it is gone.
//
// What is left is a reader. public/assets/home.js still calls Store.today() and
// Store.streakInfo() through store.js — those two, and nothing else — to draw the
// home page's maxim of the day and its streak chip. The home page is deliberately
// not an island (see the slice 6 plan: React on the landing page is roughly 60KB
// gzipped to render one line of text), so store.js outlives the migration.
//
// That leaves exactly one thing to prove, and this file proves it: a student who
// trains on an island and then opens the home page sees the streak they just
// earned. The state is therefore WRITTEN by store.ts and READ by both, rather than
// written by each and compared — which is the actual shape of the risk now, and
// stops the suite asserting agreement about operations nothing calls any more.
//
// It retires with store.js, if the home page ever stops needing it.

const START = '2026-07-01T09:00:00Z';
const START_DAY = Math.floor(Date.UTC(2026, 6, 1) / 86400000);

// What an island does. Written as data so one list drives the store with no chance
// of a sequence drifting from the description beside it.
type Write =
  | { readonly kind: 'markTrained' }
  | { readonly kind: 'logPractice'; readonly id: string }
  | { readonly kind: 'unlogPractice'; readonly id: string }
  | { readonly kind: 'setBest'; readonly mode: string; readonly score: number }
  | { readonly kind: 'recordCard'; readonly card: string; readonly gotIt: boolean }
  | { readonly kind: 'advanceDays'; readonly days: number };

function applyWrites(store: Store, writes: readonly Write[]): void {
  let elapsedDays = 0;

  for (const write of writes) {
    switch (write.kind) {
      case 'markTrained':
        store.markTrained();
        break;
      case 'logPractice':
        store.logPractice(write.id);
        break;
      case 'unlogPractice':
        store.unlogPractice(write.id);
        break;
      case 'setBest':
        store.setBest(write.mode, write.score);
        break;
      case 'recordCard':
        store.recordCard(write.card, write.gotIt);
        break;
      case 'advanceDays':
        elapsedDays += write.days;
        vi.setSystemTime(new Date(Date.parse(START) + elapsedDays * 86400000));
        break;
    }
  }
}

// Everything home.js asks store.js for. Deliberately only these two: store.js still
// exposes ten more operations, and asserting agreement about them would be asserting
// something no student can observe. A third call added to home.js belongs here.
const homePageReadings = (store: LegacyStore): readonly unknown[] => [store.today(), store.streakInfo()];

// One storage, as there is one localStorage. The island writes into it and the
// legacy store is built on top of the result — which is what actually happens when a
// student finishes a round and then taps through to the home page.
async function afterTraining(
  writes: readonly Write[],
  seed?: string,
): Promise<{ readonly island: readonly unknown[]; readonly legacy: readonly unknown[] }> {
  vi.setSystemTime(new Date(START));

  const storage = fakeStorage(seed === undefined ? undefined : { [PROGRESS_KEY]: seed });
  const island = createStore({ storage, now: () => new Date() });
  applyWrites(island, writes);

  return { island: homePageReadings(island), legacy: homePageReadings(await loadLegacyStore(storage)) };
}

const SESSIONS: ReadonlyArray<{ readonly name: string; readonly writes: readonly Write[] }> = [
  {
    name: 'a first ever session',
    writes: [{ kind: 'markTrained' }],
  },
  {
    name: 'three consecutive days of training',
    writes: [
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
    ],
  },
  {
    name: 'a gap that breaks the streak, then training again',
    writes: [
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 4 },
      { kind: 'markTrained' },
    ],
  },
  {
    // The streak is alive but today is not counted yet, which is the state the home
    // page's chip words differently — "train today to keep it". Getting `today`
    // wrong here shows a student a reminder they have already acted on, or hides one
    // they need.
    name: 'yesterday counted, today has not',
    writes: [{ kind: 'markTrained' }, { kind: 'advanceDays', days: 1 }],
  },
  {
    name: 'a streak that has already lapsed',
    writes: [{ kind: 'markTrained' }, { kind: 'advanceDays', days: 5 }],
  },
  {
    // A whole day across all three islands. The streak is what home.js reads, but the
    // other three writes are what surround it in the persisted object — a store that
    // wrote them in a shape store.js could not parse would take the streak down with
    // them, since store.js reads the whole object or none of it.
    name: 'a student using all three islands in one day',
    writes: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'markTrained' },
      { kind: 'setBest', mode: 'level1', score: 8 },
      { kind: 'logPractice', id: 'terms' },
      { kind: 'recordCard', card: 'cabc12', gotIt: false },
      { kind: 'logPractice', id: 'philosophy' },
      { kind: 'unlogPractice', id: 'stretch' },
    ],
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the home page reads what the islands wrote', () => {
  it.each(SESSIONS)('store.js and store.ts agree about the day and the streak after $name', async ({ writes }) => {
    const { island, legacy } = await afterTraining(writes);

    expect(legacy).toEqual(island);
  });

  it('carries state written by the old page forward, on the day the islands take over', async () => {
    // The realistic case on ship day: a student whose streak, scores and miss queue
    // were all written by store.js before this slice, who then trains on an island.
    const seed = JSON.stringify({
      streak: { last: START_DAY - 1, count: 12, best: 30 },
      best: { level1: 9, kumite6: 4 },
      miss: { cabc12: 2 },
      plog: { [String(START_DAY - 1)]: ['terms', 'stretch'] },
    });

    const { island, legacy } = await afterTraining([{ kind: 'markTrained' }], seed);

    expect(legacy).toEqual(island);
    expect(island).toEqual([START_DAY, { count: 13, best: 30, today: true, alive: true }]);
  });
});

describe('where the two deliberately differ', () => {
  // The parity claim above is about state an island WROTE, which is always
  // well-formed. On malformed state the two are supposed to diverge — that is the
  // entire point of the guard store.js does not have. Asserting it here stops the
  // suite from quietly implying a guarantee it does not make.
  //
  // What a student would see: with a hand-edited progress key, the home page shows
  // whatever store.js makes of it until the next island session rewrites it clean.
  it('store.js reads malformed state that store.ts discards', async () => {
    vi.setSystemTime(new Date(START));
    const seed = '{"streak":{"last":' + String(START_DAY) + ',"count":"twelve","best":30}}';
    const storage = fakeStorage({ [PROGRESS_KEY]: seed });

    const island = createStore({ storage, now: () => new Date() });
    const legacy = await loadLegacyStore(storage);

    // The count is a string, so store.ts throws the whole object away and reports no
    // streak. store.js hands the string straight back.
    expect(island.streakInfo()).toEqual({ count: 0, best: 0, today: false, alive: false });
    expect(legacy.streakInfo()).toMatchObject({ count: 'twelve' });
  });
});
