import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const PUBLIC_DIR = 'public';
const DIST_DIR = 'dist';
const PAGES_DIR = 'src/pages';
const MANIFEST_PATH = 'tests/build/legacy-content.sha256';
const ROUTABLE_EXTENSIONS = ['.astro', '.md', '.mdx', '.html'];

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

function toRouteOutputPath(pagesRelativePath: string): string {
  const withoutExtension = ROUTABLE_EXTENSIONS.reduce(
    (path, extension) => (path.endsWith(extension) ? path.slice(0, -extension.length) : path),
    pagesRelativePath,
  );
  return `${withoutExtension}.html`;
}

type ManifestEntry = { hash: string; path: string };

async function readManifest(): Promise<ManifestEntry[]> {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const match = /^(\S+)\s+(.+)$/.exec(line);
      const hash = match?.[1];
      const path = match?.[2];
      if (!hash || !path) {
        throw new Error(`malformed manifest line in ${MANIFEST_PATH}: ${line}`);
      }
      return { hash, path };
    });
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

describe('migrated routes are not shadowed by public/', () => {
  it('has no src/pages route whose output path collides with a public/ file', async () => {
    if (!existsSync(PAGES_DIR)) return;

    const pageFiles = await filesUnder(PAGES_DIR);
    const publicFiles = new Set(await filesUnder(PUBLIC_DIR));

    const routableFiles = pageFiles.filter((file) =>
      ROUTABLE_EXTENSIONS.some((extension) => file.endsWith(extension)),
    );

    for (const pageFile of routableFiles) {
      if (pageFile.includes('[')) continue;

      const outputPath = toRouteOutputPath(pageFile);
      const shadowingPublicFile = publicFiles.has(outputPath) ? outputPath : undefined;

      expect(
        shadowingPublicFile,
        `src/pages/${pageFile} is shadowed by public/${outputPath} — delete the legacy file to complete the migration`,
      ).toBeUndefined();
    }
  });
});

describe('public/ matches the known-good legacy content baseline', () => {
  it('has a checksum manifest entry matching every file under public/', async () => {
    const manifest = await readManifest();
    const publicFiles = await filesUnder(PUBLIC_DIR);
    const manifestByPath = new Map(manifest.map((entry) => [entry.path, entry.hash]));

    for (const file of publicFiles) {
      const expectedHash = manifestByPath.get(file);
      expect(
        expectedHash,
        `public/${file} has no entry in ${MANIFEST_PATH} — add its checksum or confirm it should not exist`,
      ).toBeDefined();

      const actualHash = await sha256(join(PUBLIC_DIR, file));
      expect(actualHash, `public/${file} does not match the known-good checksum in ${MANIFEST_PATH}`).toBe(
        expectedHash,
      );
    }
  });

  it('has no manifest entry for a file missing from public/', async () => {
    const manifest = await readManifest();
    const publicFiles = new Set(await filesUnder(PUBLIC_DIR));

    for (const entry of manifest) {
      expect(
        publicFiles.has(entry.path),
        `${MANIFEST_PATH} lists public/${entry.path}, which no longer exists — remove the stale entry`,
      ).toBe(true);
    }
  });
});
