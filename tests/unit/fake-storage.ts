import type { StorageLike } from '../../src/domain/store';

// A StorageLike backed by a plain Map, for driving the domain store without a
// browser. Deliberately not a localStorage mock: the store only ever calls these
// three methods, and anything richer would be pinning an interface nothing uses.
//
// `read` exposes the raw persisted string so a test can assert the exact JSON
// written — which is what the parity proof against store.js compares, and what a
// future migration would have to keep reading.
//
// Not a *.test.ts file, so vitest does not collect it as a suite; see the
// `include` globs in vitest.config.ts.
export type FakeStorage = StorageLike & {
  readonly read: (key: string) => string | null;
  readonly failOnWrite: boolean;
};

export function fakeStorage(seed?: Readonly<Record<string, string>>): FakeStorage {
  const cells = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (key) => cells.get(key) ?? null,
    setItem: (key, value) => {
      cells.set(key, value);
    },
    removeItem: (key) => {
      cells.delete(key);
    },
    read: (key) => cells.get(key) ?? null,
    failOnWrite: false,
  };
}

// Storage that exists but refuses to write — Safari private browsing, and any
// browser with site data blocked. The student keeps working; nothing persists.
export function unwritableStorage(): FakeStorage {
  return {
    ...fakeStorage(),
    setItem: () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    },
    failOnWrite: true,
  };
}
