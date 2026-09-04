import { readFile } from 'node:fs/promises';

import { createStore } from '../../src/domain/store';
import type { StorageLike, Store } from '../../src/domain/store';
import { fakeStorage } from './fake-storage';

// Shared scaffolding for the store suite: the persisted key, the calendar the
// tests run on, a store factory, and the loader for the legacy store the parity
// proof compares against.
//
// Not a *.test.ts file, so vitest does not collect it as a suite — see the
// `include` globs in vitest.config.ts, and tests/build/astro-html.ts for the same
// pattern on the build side.

export { fakeStorage, storageThatFillsUp, unwritableStorage } from './fake-storage';
export type { FakeStorage } from './fake-storage';

// Deliberately a literal here rather than an import from src/domain/store.ts,
// which does not export it. This copy IS the pin on the persisted key name: if the
// production key ever changes without a migration, these tests must fail.
export const PROGRESS_KEY = 'shizenryu-progress-v1';

// One calendar for the whole suite. Midday, so no test accidentally depends on
// being near a day boundary — the boundaries themselves are pinned deliberately in
// store-day-number.test.ts, which keeps its own independently derived literals and
// imports nothing from here.
export const JULY_1 = '2026-07-01T12:00:00Z';
export const JULY_2 = '2026-07-02T12:00:00Z';
export const JULY_3 = '2026-07-03T12:00:00Z';
export const JULY_5 = '2026-07-05T12:00:00Z';

export const JULY_1_DAY = 20635;
export const JULY_2_DAY = 20636;

export const storeOn = (iso: string, storage: StorageLike | null = fakeStorage()): Store =>
  createStore({ storage, now: () => new Date(iso) });

export const persisted = (storage: { readonly read: (key: string) => string | null }): unknown =>
  JSON.parse(storage.read(PROGRESS_KEY) ?? 'null');

// --- the legacy store ---------------------------------------------------------

const LEGACY_SOURCE = 'public/assets/store.js';

// Every member both stores expose. Written once, as a runtime list, with the type
// derived from it — stating the names twice is how a seventh operation ends up
// checked in one place and not the other.
export const LEGACY_MEMBERS = [
  'today',
  'markTrained',
  'streakInfo',
  'logPractice',
  'unlogPractice',
  'practiceOn',
  'todayPractice',
  'best',
  'setBest',
  'misses',
  'recordCard',
  'hash',
] as const;

export type LegacyStore = Pick<Store, (typeof LEGACY_MEMBERS)[number]>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isLegacyStore(value: unknown): value is LegacyStore {
  return isRecord(value) && LEGACY_MEMBERS.every((member) => typeof value[member] === 'function');
}

// store.js is an IIFE assigning to a top-level `const Store`, with no exports. It
// is evaluated inside a Function body that returns the binding — `eval` will not
// do, because `const` inside eval is block-scoped and never escapes.
//
// `localStorage` is a formal parameter because Node has no such global and
// store.js probes it at load time to decide whether it can persist at all. Passing
// a fake is harmless to callers that do not care: the probe is inside a try/catch.
//
// The result is narrowed by a real guard rather than an assertion, so a store.js
// that stopped exposing an operation fails here with a sentence instead of
// surfacing as an undefined-is-not-a-function three frames away.
export async function loadLegacyStore(storage: StorageLike = fakeStorage()): Promise<LegacyStore> {
  const source = await readFile(LEGACY_SOURCE, 'utf8');
  const built: unknown = new Function('localStorage', `${source}\nreturn Store;`)(storage);
  if (!isLegacyStore(built)) {
    throw new Error(`${LEGACY_SOURCE} did not evaluate to a store exposing ${LEGACY_MEMBERS.join(', ')}`);
  }
  return built;
}
