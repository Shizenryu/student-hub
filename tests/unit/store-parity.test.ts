import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../../src/domain/store';
import { PROGRESS_KEY, fakeStorage, loadLegacyStore } from './store-fixtures';
import type { LegacyStore } from './store-fixtures';

// The load-bearing test of slice 4.
//
// Until slice 6 empties public/, TWO implementations write the same localStorage
// key. quiz.html:265 and flashcards.html:171 both call logPractice() and
// markTrained() through public/assets/store.js, so a student can tick an activity
// on the practice island and finish a quiz round on a legacy page the same day. If
// the two disagree about the shape they persist, a streak breaks silently and the
// student is simply told they lost it.
//
// So this drives BOTH through identical operation sequences and compares two
// things: the persisted JSON as a STRING — key order is part of what
// byte-for-byte means, and comparing parsed objects would quietly accept a
// reordering — and every value the operations RETURN.
//
// Returned values were added after review pointed out that comparing storage
// alone leaves the read surface unproven, which is precisely what slices 5 and 6
// lean on: the quiz reads setBest's boolean to decide whether to announce a new
// best, and flashcards read misses() to order the deck. The Operation list below
// already covers the whole surface, not just the practice page's part of it, so
// those slices need add nothing here.
//
// It deletes itself in slice 6, with store.js.

const START = '2026-07-01T09:00:00Z';
const START_DAY = Math.floor(Date.UTC(2026, 6, 1) / 86400000);

// Everything either store can be asked to do. Sequences are written as data so one
// list drives both implementations with no chance of the two runs drifting apart.
type Operation =
  | { readonly kind: 'markTrained' }
  | { readonly kind: 'logPractice'; readonly id: string }
  | { readonly kind: 'unlogPractice'; readonly id: string }
  | { readonly kind: 'setBest'; readonly mode: string; readonly score: number }
  | { readonly kind: 'recordCard'; readonly card: string; readonly gotIt: boolean }
  | { readonly kind: 'advanceDays'; readonly days: number }
  | { readonly kind: 'readStreak' }
  | { readonly kind: 'readTodaysPractice' }
  | { readonly kind: 'readPracticeDaysAgo'; readonly daysAgo: number }
  | { readonly kind: 'readBest'; readonly mode: string }
  | { readonly kind: 'readMisses' };

type Run = { readonly stored: string | null; readonly readings: readonly unknown[] };

function runSequence(store: LegacyStore, operations: readonly Operation[]): readonly unknown[] {
  const readings: unknown[] = [];
  let elapsedDays = 0;

  for (const operation of operations) {
    switch (operation.kind) {
      case 'markTrained':
        readings.push(store.markTrained());
        break;
      case 'logPractice':
        store.logPractice(operation.id);
        break;
      case 'unlogPractice':
        store.unlogPractice(operation.id);
        break;
      case 'setBest':
        readings.push(store.setBest(operation.mode, operation.score));
        break;
      case 'recordCard':
        store.recordCard(operation.card, operation.gotIt);
        break;
      case 'advanceDays':
        elapsedDays += operation.days;
        vi.setSystemTime(new Date(Date.parse(START) + elapsedDays * 86400000));
        break;
      case 'readStreak':
        readings.push(store.streakInfo());
        break;
      case 'readTodaysPractice':
        readings.push(store.todayPractice());
        break;
      case 'readPracticeDaysAgo':
        readings.push(store.practiceOn(store.today() - operation.daysAgo));
        break;
      case 'readBest':
        readings.push(store.best(operation.mode));
        break;
      case 'readMisses':
        readings.push(store.misses());
        break;
    }
  }

  return readings;
}

// Both runs share the faked system clock: store.js reads `new Date()` directly and
// cannot be told otherwise, so the domain store is given a clock that reads the
// same faked time rather than the other way round.
async function runBoth(
  operations: readonly Operation[],
  seed?: string,
): Promise<{ readonly legacy: Run; readonly domain: Run }> {
  const seeded = seed === undefined ? undefined : { [PROGRESS_KEY]: seed };

  vi.setSystemTime(new Date(START));
  const legacyStorage = fakeStorage(seeded);
  const legacyReadings = runSequence(await loadLegacyStore(legacyStorage), operations);

  vi.setSystemTime(new Date(START));
  const domainStorage = fakeStorage(seeded);
  const domainReadings = runSequence(
    createStore({ storage: domainStorage, now: () => new Date() }),
    operations,
  );

  return {
    legacy: { stored: legacyStorage.read(PROGRESS_KEY), readings: legacyReadings },
    domain: { stored: domainStorage.read(PROGRESS_KEY), readings: domainReadings },
  };
}

const SEQUENCES: ReadonlyArray<{ readonly name: string; readonly operations: readonly Operation[] }> = [
  {
    name: 'a first ever session',
    operations: [{ kind: 'markTrained' }],
  },
  {
    name: 'two sessions on the same day',
    operations: [{ kind: 'markTrained' }, { kind: 'markTrained' }],
  },
  {
    name: 'three consecutive days of training',
    operations: [
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
    ],
  },
  {
    name: 'a gap that breaks the streak, then training again',
    operations: [
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'markTrained' },
      { kind: 'advanceDays', days: 4 },
      { kind: 'markTrained' },
    ],
  },
  {
    name: 'a practice session ticking several activities',
    operations: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'markTrained' },
      { kind: 'logPractice', id: 'sanchin' },
      { kind: 'logPractice', id: 'kihon' },
    ],
  },
  {
    name: 'ticking and un-ticking, leaving some behind',
    operations: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'logPractice', id: 'mara' },
      { kind: 'unlogPractice', id: 'stretch' },
    ],
  },
  {
    name: 'un-ticking the last activity of the day',
    operations: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'markTrained' },
      { kind: 'unlogPractice', id: 'stretch' },
    ],
  },
  {
    name: 'un-ticking something that was never ticked',
    operations: [{ kind: 'logPractice', id: 'mara' }, { kind: 'unlogPractice', id: 'stretch' }],
  },
  {
    name: 'un-ticking on a day with nothing logged at all',
    operations: [{ kind: 'unlogPractice', id: 'stretch' }],
  },
  {
    name: 'practice across a week, read back through the log',
    operations: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'advanceDays', days: 1 },
      { kind: 'logPractice', id: 'mara' },
      { kind: 'advanceDays', days: 2 },
      { kind: 'logPractice', id: 'kumite' },
      { kind: 'markTrained' },
    ],
  },
  {
    name: 'quiz scores, improving and not',
    operations: [
      { kind: 'setBest', mode: 'terms', score: 7 },
      { kind: 'setBest', mode: 'terms', score: 5 },
      { kind: 'setBest', mode: 'terms', score: 9 },
      { kind: 'setBest', mode: 'kumite', score: 3 },
    ],
  },
  {
    name: 'a losing round before any score was ever set',
    operations: [{ kind: 'setBest', mode: 'terms', score: 0 }],
  },
  {
    name: 'flashcard misses accumulating and being worked off',
    operations: [
      { kind: 'recordCard', card: 'cabc12', gotIt: false },
      { kind: 'recordCard', card: 'cabc12', gotIt: false },
      { kind: 'recordCard', card: 'cdef34', gotIt: false },
      { kind: 'recordCard', card: 'cabc12', gotIt: true },
      { kind: 'recordCard', card: 'cdef34', gotIt: true },
    ],
  },
  {
    name: 'getting a card right that was never missed',
    operations: [{ kind: 'recordCard', card: 'cabc12', gotIt: true }],
  },
  {
    // Review found the miss queue reordering its keys: destructuring one out and
    // spreading it back appends it at the end, where store.js assigns in place.
    // The sequence above hid it by working both cards down to zero, which deletes
    // the moved key. This one leaves the decremented card in the map with another
    // card after it, so the byte-for-byte comparison actually sees the order.
    name: 'a card worked down while another card is still queued behind it',
    operations: [
      { kind: 'recordCard', card: 'cabc12', gotIt: false },
      { kind: 'recordCard', card: 'cabc12', gotIt: false },
      { kind: 'recordCard', card: 'cdef34', gotIt: false },
      { kind: 'recordCard', card: 'cabc12', gotIt: true },
    ],
  },
  {
    name: 'a student moving between the island and a legacy page all day',
    operations: [
      { kind: 'logPractice', id: 'stretch' },
      { kind: 'markTrained' },
      { kind: 'setBest', mode: 'terms', score: 8 },
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

describe('store.ts and store.js persist the same state', () => {
  it.each(SEQUENCES)('agree on both the stored state and every answer for $name', async ({ operations }) => {
    const { legacy, domain } = await runBoth(operations);

    // One assertion covers both halves: `stored` is compared as a string, so
    // byte-for-byte, and `readings` as structured values.
    expect(domain).toEqual(legacy);
  });

  it('prune the practice log at the same boundary', async () => {
    // Seeded with days either side of the 60-day cutoff, then a write that
    // triggers pruning. The boundary is the easiest thing here to get one out.
    const seed = JSON.stringify({
      plog: {
        [String(START_DAY - 61)]: ['stretch'],
        [String(START_DAY - 60)]: ['mara'],
        [String(START_DAY - 59)]: ['kihon'],
      },
    });

    const { legacy, domain } = await runBoth(
      [{ kind: 'logPractice', id: 'sanchin' }, { kind: 'readPracticeDaysAgo', daysAgo: 60 }],
      seed,
    );

    expect(domain).toEqual(legacy);
  });

  it('leave old entries alone when un-ticking, since only logging prunes', async () => {
    // Negative-testing this suite found that nothing here un-ticked with an
    // expired entry present, so a store that pruned on BOTH paths passed parity
    // while diverging from store.js. tests/unit/store-progress.test.ts pins the
    // behaviour; this pins that the two agree about it.
    const seed = JSON.stringify({
      plog: { [String(START_DAY - 61)]: ['stretch'], [String(START_DAY)]: ['mara', 'kihon'] },
    });

    const { legacy, domain } = await runBoth(
      [{ kind: 'unlogPractice', id: 'mara' }, { kind: 'readPracticeDaysAgo', daysAgo: 61 }],
      seed,
    );

    expect(domain).toEqual(legacy);
  });

  // There is deliberately NO practice-log equivalent of the miss-queue ordering
  // sequence above. One was written and could not be made to fail: a practice log
  // is keyed by day NUMBER, and JavaScript orders integer-like keys numerically
  // however they were inserted, so `{"20635":…,"20632":…}` always serialises
  // ascending and the log cannot reorder. The miss queue can, because card keys
  // start with a letter and so keep insertion order. A test that cannot fail is
  // worse than no test, so this note stands in its place.

  it('agree on a miss count that is somehow already negative', async () => {
    // recordCard's comment claims a stored negative count is incremented and KEPT,
    // never deleted, because store.js sets unconditionally. Nothing pinned that
    // claim, and the mutation gate found it: folding the miss path into the same
    // "<= 0 means remove" rule as the got-it path passed every test.
    //
    // Unreachable from well-formed state — but the guard accepts any finite number,
    // so a hand-edited key gets here, and the two stores must still agree.
    const seed = JSON.stringify({ miss: { cabc12: -3, cdef34: 1 } });

    const { legacy, domain } = await runBoth(
      [{ kind: 'recordCard', card: 'cabc12', gotIt: false }, { kind: 'readMisses' }],
      seed,
    );

    expect(domain).toEqual(legacy);
  });

  it('carry existing student state forward identically', async () => {
    // The realistic case on ship day: a student who already has a streak, scores
    // and a miss queue written by store.js, who then uses the island.
    const seed = JSON.stringify({
      streak: { last: START_DAY - 1, count: 12, best: 30 },
      best: { terms: 9, kumite: 4 },
      miss: { cabc12: 2 },
      plog: { [String(START_DAY - 1)]: ['terms', 'stretch'] },
    });

    const { legacy, domain } = await runBoth(
      [
        { kind: 'readStreak' },
        { kind: 'readBest', mode: 'terms' },
        { kind: 'readMisses' },
        { kind: 'logPractice', id: 'sanchin' },
        { kind: 'markTrained' },
        { kind: 'readStreak' },
        { kind: 'readTodaysPractice' },
      ],
      seed,
    );

    expect(domain).toEqual(legacy);
  });

  it('key flashcards identically, or a student loses their miss queue', async () => {
    const legacy = await loadLegacyStore();
    const domain = createStore({ storage: fakeStorage(), now: () => new Date() });

    const cards = [
      'Zanshin|Remaining mind',
      'Mushin|No mind',
      '',
      'a',
      'Structure > Discipline',
      // Beyond the BMP. store.js walks UTF-16 code units; an implementation that
      // walks code points instead agrees on everything above and diverges here,
      // which is precisely what review found. No deck contains an emoji today —
      // adding one would have silently orphaned every miss count on that card.
      'a\u{1F525}b',
      '\u{1F525}',
      '\u{1F525}\u{1F525}',
    ];

    expect(cards.map((card) => domain.hash(card))).toEqual(cards.map((card) => legacy.hash(card)));
  });
});

describe('where the two deliberately differ', () => {
  // The parity claim above is about WELL-FORMED state. On malformed state the two
  // are supposed to diverge — that is the entire point of the guard store.js does
  // not have. Asserting it here stops the parity suite from quietly implying a
  // guarantee it does not make.
  it('store.js carries malformed state forward where store.ts discards it', async () => {
    const seed = '{"streak":"twelve","best":{"terms":"eight"}}';

    const { legacy, domain } = await runBoth([{ kind: 'markTrained' }], seed);

    expect(domain.stored).not.toBe(legacy.stored);
    expect(JSON.parse(domain.stored ?? 'null')).toEqual({
      streak: { last: START_DAY, count: 1, best: 1 },
    });
    // store.js keeps the unusable string and the bad scores.
    expect(JSON.parse(legacy.stored ?? 'null')).toMatchObject({ best: { terms: 'eight' } });
  });
});
