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
  };
}

// Storage that exists but refuses every write, including the store's probe —
// Safari private browsing, and any browser with site data blocked. The store
// detects this at construction and falls back to memory for the page's lifetime.
export function unwritableStorage(): FakeStorage {
  return {
    ...fakeStorage(),
    setItem: () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    },
  };
}

// Storage that passes the probe and then fails: the quota fills part-way through a
// session. A different case from the above, and one the store handles worse —
// see the save() comment in src/domain/store.ts.
export function storageThatFillsUp(): FakeStorage {
  const backing = fakeStorage();
  let probed = false;
  return {
    ...backing,
    setItem: (key, value) => {
      if (probed) throw new DOMException('quota exceeded', 'QuotaExceededError');
      probed = true;
      backing.setItem(key, value);
    },
  };
}
