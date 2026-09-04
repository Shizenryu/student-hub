import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

// home.js is legacy plain JavaScript, like store.js and legacy-hash.js: no
// exports, run as a classic <script>, touching a handful of DOM globals
// (document.querySelector, document.getElementById, HTMLElement) plus the
// ambient Store global store.js defines. Evaluating the real source inside
// `new Function` with a hand-rolled `document`/`HTMLElement` stand-in and an
// optional fake Store — the same technique
// tests/unit/streak-local-day.test.ts uses for store.js — exercises the
// actual file rather than a reimplementation of its logic, so a change to
// home.js that breaks the modulo indexing or either streak-chip string is
// caught here without needing a browser or a build.
const HOME_SCRIPT_SOURCE = 'public/assets/home.js';

type StreakInfo = { readonly count: number; readonly today: boolean };
type FakeStore = { readonly today: () => number; readonly streakInfo: () => StreakInfo };

// The two things home.js reads off Store, in one place. `day` defaults because
// a streak assertion does not care what day it is, and stating it anyway
// implies it matters.
const fakeStore = (streak: StreakInfo, day = 0): FakeStore => ({
  today: () => day,
  streakInfo: () => streak,
});

const NO_STREAK: StreakInfo = { count: 0, today: false };

type RunResult = { readonly maximText: string; readonly streakText: string };

// Stands in for HTMLElement: the script's own `host instanceof HTMLElement`
// guard needs a real class the fake host is actually an instance of.
class FakeElement {
  dataset: Record<string, string> = {};
}

async function runHomeScript(options: {
  readonly maxims?: readonly string[];
  // Sets data-maxims verbatim, for the malformed values `maxims` cannot express.
  readonly rawMaxims?: string;
  readonly store?: FakeStore;
}): Promise<RunResult> {
  const source = await readFile(HOME_SCRIPT_SOURCE, 'utf8');

  const host = new FakeElement();
  host.dataset.maxims = options.rawMaxims ?? JSON.stringify(options.maxims ?? []);

  const maximEl = { textContent: '' };
  const streakEl = { textContent: '' };

  const fakeDocument = {
    querySelector: (selector: string) => (selector === '[data-maxims]' ? host : null),
    getElementById: (id: string) => {
      if (id === 'maxim') return maximEl;
      if (id === 'streakChip') return streakEl;
      return null;
    },
  };

  // `Store` is a formal parameter, not a captured closure variable: when
  // options.store is omitted, the call below passes undefined for it, so
  // the script's own `typeof Store !== 'undefined'` guard sees exactly what
  // it would in a browser where store.js failed to load. home.js has no
  // return statement — it only mutates maximEl/streakEl — so nothing here
  // needs to type its (unused) return value.
  const run = new Function('document', 'HTMLElement', 'Store', source);
  run(fakeDocument, FakeElement, options.store);

  return { maximText: maximEl.textContent, streakText: streakEl.textContent };
}

describe('public/assets/home.js', () => {
  it('selects the maxim at Store.today() modulo the list length, not the raw day number', async () => {
    // Two days, one list, because a single day cannot tell the two failure
    // modes apart. today() = 5 against 3 items wraps to index 2; today() = 6
    // wraps to index 0. The first assertion pins that wrapping happens at all
    // (5 is out of range, and 2 is not 5). The second pins where the day comes
    // from: a script computing its own Date.now() day — the bug this slice
    // removes — answers the SAME maxim to both calls. Asserting one day only
    // would leave that mutant alive whenever the real day number happened to
    // be congruent to 5 modulo the list length: one day in three.
    const onDayFive = await runHomeScript({ maxims: ['a', 'b', 'c'], store: fakeStore(NO_STREAK, 5) });
    const onDaySix = await runHomeScript({ maxims: ['a', 'b', 'c'], store: fakeStore(NO_STREAK, 6) });

    expect(onDayFive.maximText).toBe('“c”');
    expect(onDaySix.maximText).toBe('“a”');
  });

  it('renders the "trained today" streak-chip form, character for character', async () => {
    const { streakText } = await runHomeScript({ store: fakeStore({ count: 5, today: true }) });

    expect(streakText).toBe('🔥 5-day training streak');
  });

  it('renders the "train today to keep it" streak-chip form, character for character', async () => {
    const { streakText } = await runHomeScript({ store: fakeStore({ count: 5, today: false }) });

    expect(streakText).toBe('🔥 5-day streak — train today to keep it');
  });

  it('leaves the streak chip empty when the streak count is zero', async () => {
    const { streakText } = await runHomeScript({ store: fakeStore(NO_STREAK) });

    expect(streakText).toBe('');
  });

  // src/data/integrity.ts fails the build on an empty MAXIMS precisely because
  // of what this pins: the page must stay blank rather than print the literal
  // word "undefined" at a student. home.js no longer carries a length check for
  // it — mutation testing proved that clause could not change any outcome — so
  // this test is the only thing holding the guarantee.
  it('leaves the maxim empty rather than printing "undefined" when the list is empty', async () => {
    const { maximText } = await runHomeScript({ maxims: [], store: fakeStore(NO_STREAK, 5) });

    expect(maximText).toBe('');
  });

  // The route writes this attribute from typed JSON, so a non-array should be
  // impossible — but Array.isArray is the only thing standing between a
  // malformed one and real damage, and mutation testing found nothing pinned
  // it. A JSON string is the nasty case: "abc" has a length, so it indexes, and
  // a single letter renders as the maxim of the day. null is the loud one: it
  // would throw, and an uncaught throw here takes the rest of the file — the
  // streak chip — down with it. Asserting the chip still renders is the point
  // of the second expectation, not incidental.
  it.each([
    { label: 'a JSON string', rawMaxims: '"abc"' },
    { label: 'null', rawMaxims: 'null' },
  ])('leaves the maxim empty when data-maxims is $label rather than an array', async ({ rawMaxims }) => {
    const { maximText, streakText } = await runHomeScript({
      rawMaxims,
      store: fakeStore({ count: 3, today: true }),
    });

    expect(maximText).toBe('');
    expect(streakText).toBe('🔥 3-day training streak');
  });

  it('leaves both the maxim and the streak chip empty when Store is unavailable', async () => {
    const { maximText, streakText } = await runHomeScript({ maxims: ['a', 'b', 'c'] });

    expect(maximText).toBe('');
    expect(streakText).toBe('');
  });
});
