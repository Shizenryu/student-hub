import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

// The shared design layer is not written here. tokens.css and base.css are
// vendored from the design-system repository, byte for byte, alongside the
// marketing site's own copies — that is what keeps two sites built by two
// people looking like one club.
//
// This is the guard on that: a copy edited in place fails here, naming both
// hashes, instead of diverging quietly until someone notices the two sites'
// reds are different. A deliberate change means changing it at the source and
// running the design system's `scripts/sync.mjs` again, which rewrites the
// manifest with the new hashes and the version they came from.
const MANIFEST_PATH = 'tests/build/design-system.sha256';

type Entry = { readonly hash: string; readonly path: string };

const readManifest = async (): Promise<readonly Entry[]> => {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const [hash, path] = line.split(/\s+/, 2);
      if (!hash || !path) throw new Error(`Malformed line in ${MANIFEST_PATH}: ${line}`);
      return { hash, path };
    });
};

const sha256 = async (path: string): Promise<string> =>
  createHash('sha256').update(await readFile(path)).digest('hex');

const manifest = await readManifest();

describe('the vendored design system is the design system', () => {
  it('pins every shared file', () => {
    expect(manifest.map((entry) => entry.path).sort()).toEqual([
      'src/styles/base.css',
      'src/styles/tokens.css',
    ]);
  });

  it.each(manifest.map((entry) => entry.path))('%s matches its recorded hash', async (path) => {
    const entry = manifest.find((candidate) => candidate.path === path);
    expect(entry).toBeDefined();
    const actual = await sha256(path);
    expect(
      actual,
      `${path} differs from the design system.\n` +
        `  recorded ${entry?.hash}\n` +
        `  actual   ${actual}\n` +
        'Change it in the design-system repository and run its scripts/sync.mjs, ' +
        'rather than editing the copy here.',
    ).toBe(entry?.hash);
  });

  it('records which version it is pinned at', async () => {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    expect(raw, `${MANIFEST_PATH} does not say which design system version it came from`).toMatch(
      /pinned at v\d+\.\d+\.\d+/,
    );
  });
});
