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

type RunResult = { readonly maximText: string; readonly streakText: string };

// Stands in for HTMLElement: the script's own `host instanceof HTMLElement`
// guard needs a real class the fake host is actually an instance of.
class FakeElement {
  dataset: Record<string, string> = {};
}

async function runHomeScript(options: {
  readonly maxims: readonly string[];
  readonly store?: FakeStore;
}): Promise<RunResult> {
  const source = await readFile(HOME_SCRIPT_SOURCE, 'utf8');

  const host = new FakeElement();
  host.dataset.maxims = JSON.stringify(options.maxims);

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
    // today() = 5 against a 3-item list: 5 % 3 = 2 -> the 3rd item. Neither
    // maxims[5] (out of range) nor a day number that happens to already be
    // a valid index would tell modulo wrapping apart from a bug that used
    // the raw day number — 5 itself is out of range, and 2 (the correct
    // answer) is not equal to 5, so this pins the wrap genuinely happening.
    const store: FakeStore = {
      today: () => 5,
      streakInfo: () => ({ count: 0, today: false }),
    };

    const { maximText } = await runHomeScript({ maxims: ['a', 'b', 'c'], store });

    expect(maximText).toBe('“c”');
  });

  it('renders the "trained today" streak-chip form, character for character', async () => {
    const store: FakeStore = {
      today: () => 0,
      streakInfo: () => ({ count: 5, today: true }),
    };

    const { streakText } = await runHomeScript({ maxims: ['x'], store });

    expect(streakText).toBe('🔥 5-day training streak');
  });

  it('renders the "train today to keep it" streak-chip form, character for character', async () => {
    const store: FakeStore = {
      today: () => 0,
      streakInfo: () => ({ count: 5, today: false }),
    };

    const { streakText } = await runHomeScript({ maxims: ['x'], store });

    expect(streakText).toBe('🔥 5-day streak — train today to keep it');
  });

  it('leaves the streak chip empty when the streak count is zero', async () => {
    const store: FakeStore = {
      today: () => 0,
      streakInfo: () => ({ count: 0, today: false }),
    };

    const { streakText } = await runHomeScript({ maxims: ['x'], store });

    expect(streakText).toBe('');
  });

  // src/data/integrity.ts fails the build on an empty MAXIMS precisely because
  // of what this pins: the page must stay blank rather than print the literal
  // word "undefined" at a student. Both the length guard and the typeof check
  // in home.js block that independently, so this test passes with either one
  // removed — it characterises the guarantee, not a single line's necessity.
  it('leaves the maxim empty rather than printing "undefined" when the list is empty', async () => {
    const store: FakeStore = {
      today: () => 5,
      streakInfo: () => ({ count: 0, today: false }),
    };

    const { maximText } = await runHomeScript({ maxims: [], store });

    expect(maximText).toBe('');
  });

  it('leaves both the maxim and the streak chip empty when Store is unavailable', async () => {
    const { maximText, streakText } = await runHomeScript({ maxims: ['a', 'b', 'c'] });

    expect(maximText).toBe('');
    expect(streakText).toBe('');
  });
});
