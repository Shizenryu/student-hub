import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../../src/domain/store';
import type { Store } from '../../src/domain/store';
import { fakeStorage } from './fake-storage';

// The load-bearing test of slice 4.
//
// Until slice 6 empties public/, TWO implementations write the same localStorage
// key. quiz.html:265 and flashcards.html:171 both call logPractice() and
// markTrained() through public/assets/store.js, so a student can tick an activity
// on the practice island and finish a quiz round on a legacy page the same day. If
// the two disagree about the shape they persist, a streak breaks silently and the
// student is simply told they lost it.
//
// So this drives BOTH through identical operation sequences and compares the
// resulting JSON as a STRING, not as a deep-equal object: key order is part of
// what a byte-for-byte claim means, and comparing parsed objects would quietly
// accept a reordering that a future exact-match assertion would then trip over.
//
// It deletes itself in slice 6, with store.js.

const STORE_SOURCE = 'public/assets/store.js';
const KEY = 'shizenryu-progress-v1';
const START = '2026-07-01T09:00:00Z';

// Every operation both stores expose that changes persisted state, plus a way to
// move the calendar. Sequences below are written as data so the same list drives
// both implementations, with no chance of the two runs drifting apart.
type Operation =
  | { readonly kind: 'markTrained' }
  | { readonly kind: 'logPractice'; readonly id: string }
  | { readonly kind: 'unlogPractice'; readonly id: string }
  | { readonly kind: 'setBest'; readonly mode: string; readonly score: number }
  | { readonly kind: 'recordCard'; readonly card: string; readonly gotIt: boolean }
  | { readonly kind: 'advanceDays'; readonly days: number };

// store.js's surface, structurally. Only the mutating operations are needed here.
type LegacyStore = Pick<
  Store,
  'markTrained' | 'logPractice' | 'unlogPractice' | 'setBest' | 'recordCard' | 'hash'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const REQUIRED_METHODS = [
  'markTrained',
  'logPractice',
  'unlogPractice',
  'setBest',
  'recordCard',
  'hash',
] as const;

function isLegacyStore(value: unknown): value is LegacyStore {
  return isRecord(value) && REQUIRED_METHODS.every((method) => typeof value[method] === 'function');
}

// store.js is an IIFE assigning to a top-level `const Store`, with no exports; it
// is evaluated inside a Function body that returns the binding, exactly as
// tests/unit/streak-local-day.test.ts does. `localStorage` is passed in as a
// parameter because Node has no such global, and store.js probes it at load time
// to decide whether it can persist at all.
async function loadLegacyStore(storage: ReturnType<typeof fakeStorage>): Promise<LegacyStore> {
  const source = await readFile(STORE_SOURCE, 'utf8');
  const build: unknown = new Function('localStorage', `${source}\nreturn Store;`)(storage);
  if (!isLegacyStore(build)) {
    throw new Error(`${STORE_SOURCE} did not evaluate to a store with the expected operations`);
  }
  return build;
}

function runSequence(store: LegacyStore, operations: readonly Operation[]): void {
  let elapsedDays = 0;
  for (const operation of operations) {
    switch (operation.kind) {
      case 'markTrained':
        store.markTrained();
        break;
      case 'logPractice':
        store.logPractice(operation.id);
        break;
      case 'unlogPractice':
        store.unlogPractice(operation.id);
        break;
      case 'setBest':
        store.setBest(operation.mode, operation.score);
        break;
      case 'recordCard':
        store.recordCard(operation.card, operation.gotIt);
        break;
      case 'advanceDays':
        elapsedDays += operation.days;
        vi.setSystemTime(new Date(Date.parse(START) + elapsedDays * 86400000));
        break;
    }
  }
}

// Both runs share the faked system clock: store.js reads `new Date()` directly and
// cannot be told otherwise, so the domain store is given a clock that reads the
// same faked time rather than the other way round.
async function persistedByEach(
  operations: readonly Operation[],
  seed?: string,
): Promise<{ readonly legacy: string | null; readonly domain: string | null }> {
  const seeded = seed === undefined ? undefined : { [KEY]: seed };

  vi.setSystemTime(new Date(START));
  const legacyStorage = fakeStorage(seeded);
  runSequence(await loadLegacyStore(legacyStorage), operations);

  vi.setSystemTime(new Date(START));
  const domainStorage = fakeStorage(seeded);
  runSequence(createStore({ storage: domainStorage, now: () => new Date() }), operations);

  return { legacy: legacyStorage.read(KEY), domain: domainStorage.read(KEY) };
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

describe('store.ts and store.js persist the same state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(SEQUENCES)('write identical JSON for $name', async ({ operations }) => {
    const { legacy, domain } = await persistedByEach(operations);

    expect(domain).toBe(legacy);
  });

  it('prune the practice log at the same boundary', async () => {
    // Seeded with days either side of the 60-day cutoff, then a write that
    // triggers pruning. The boundary is the easiest thing here to get one out.
    const startDay = Math.floor(Date.UTC(2026, 6, 1) / 86400000);
    const seed = JSON.stringify({
      plog: {
        [String(startDay - 61)]: ['stretch'],
        [String(startDay - 60)]: ['mara'],
        [String(startDay - 59)]: ['kihon'],
      },
    });

    const { legacy, domain } = await persistedByEach([{ kind: 'logPractice', id: 'sanchin' }], seed);

    expect(domain).toBe(legacy);
  });

  it('leave old entries alone when un-ticking, since only logging prunes', async () => {
    // Negative-testing this suite found that nothing here un-ticked with an
    // expired entry present, so a store that pruned on BOTH paths passed parity
    // while diverging from store.js. tests/unit/store-progress.test.ts pins the
    // behaviour; this pins that the two agree about it.
    const startDay = Math.floor(Date.UTC(2026, 6, 1) / 86400000);
    const seed = JSON.stringify({
      plog: { [String(startDay - 61)]: ['stretch'], [String(startDay)]: ['mara', 'kihon'] },
    });

    const { legacy, domain } = await persistedByEach([{ kind: 'unlogPractice', id: 'mara' }], seed);

    expect(domain).toBe(legacy);
  });

  // There is deliberately NO practice-log equivalent of the miss-queue ordering
  // sequence above. One was written and could not be made to fail: a practice log
  // is keyed by day NUMBER, and JavaScript orders integer-like keys numerically
  // however they were inserted, so `{"20635":…,"20632":…}` always serialises
  // ascending and the log cannot reorder. The miss queue can, because card keys
  // start with a letter and so keep insertion order. A test that cannot fail is
  // worse than no test, so this note stands in its place.

  it('carry existing student state forward identically', async () => {
    // The realistic case on ship day: a student who already has a streak, scores
    // and a miss queue written by store.js, who then uses the island.
    const startDay = Math.floor(Date.UTC(2026, 6, 1) / 86400000);
    const seed = JSON.stringify({
      streak: { last: startDay - 1, count: 12, best: 30 },
      best: { terms: 9, kumite: 4 },
      miss: { cabc12: 2 },
      plog: { [String(startDay - 1)]: ['terms', 'stretch'] },
    });

    const { legacy, domain } = await persistedByEach(
      [{ kind: 'logPractice', id: 'sanchin' }, { kind: 'markTrained' }],
      seed,
    );

    expect(domain).toBe(legacy);
  });

  it('key flashcards identically, or a student loses their miss queue', async () => {
    const storage = fakeStorage();
    const legacy = await loadLegacyStore(storage);
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The parity claim above is about WELL-FORMED state. On malformed state the two
  // are supposed to diverge — that is the entire point of the guard store.js does
  // not have. Asserting it here stops the parity suite from quietly implying a
  // guarantee it does not make.
  it('store.js carries malformed state forward where store.ts discards it', async () => {
    const seed = '{"streak":"twelve","best":{"terms":"eight"}}';

    const { legacy, domain } = await persistedByEach([{ kind: 'markTrained' }], seed);

    expect(domain).not.toBe(legacy);
    expect(JSON.parse(domain ?? 'null')).toEqual({
      streak: { last: Math.floor(Date.UTC(2026, 6, 1) / 86400000), count: 1, best: 1 },
    });
    // store.js spreads the string across numeric indices and keeps the bad scores.
    expect(JSON.parse(legacy ?? 'null')).toMatchObject({ best: { terms: 'eight' } });
  });
});
