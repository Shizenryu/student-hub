import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const PUBLIC_DIR = 'public';
const DIST_DIR = 'dist';

const LEGACY_PAGES = [
  'index.html',
  'quiz.html',
  'flashcards.html',
  'belts.html',
  'kata.html',
  'practice.html',
];

const LEGACY_ASSETS = [
  'assets/data.js',
  'assets/store.js',
  'assets/img/icon.png',
  'assets/img/ki.png',
  'assets/img/shizenryu-calligraphy.png',
  'docs/belt-passport.pdf',
  'docs/philosophy-guide.pdf',
  'docs/study-guides.pdf',
];

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

describe('legacy pages served through public/', () => {
  beforeAll(() => {
    if (!existsSync(DIST_DIR)) {
      throw new Error('dist/ is missing — run `npm run build` before this test');
    }
  });

  it('ships every legacy page and asset', async () => {
    const built = await filesUnder(DIST_DIR);
    expect(built).toEqual(expect.arrayContaining([...LEGACY_PAGES, ...LEGACY_ASSETS]));
  });

  it('copies every public file into the build byte-for-byte', async () => {
    const sources = await filesUnder(PUBLIC_DIR);
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const source = await sha256(join(PUBLIC_DIR, file));
      const built = await sha256(join(DIST_DIR, file));
      expect(built, `${file} changed during the build`).toBe(source);
    }
  });

  it('renders the 404 route Astro owns', async () => {
    const built = await filesUnder(DIST_DIR);
    expect(built).toContain('404.html');
  });
});
