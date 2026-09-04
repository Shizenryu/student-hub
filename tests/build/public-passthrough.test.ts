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

// index.html is deliberately absent: it is no longer a legacy page copied out of
// public/ but a route Astro renders from src/pages/index.astro. Leaving it here
// would keep passing for the wrong reason — the built file exists either way, so
// the assertion would no longer prove anything about public/. tests/build/
// home-route.test.ts owns proving the route ships.
const LEGACY_PAGES = ['quiz.html', 'flashcards.html'];

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

// The URL a page claims, so a route and a legacy page can be compared directly.
// Both `belts.astro` and `belts/index.astro` serve /belts; `public/belts.html` serves
// /belts.html. Those are different paths, so Astro emits both without warning and the
// stale page keeps answering old bookmarks — which is the collision worth catching.
function toClaimedUrl(pathWithExtension: string): string {
  const withoutExtension = pathWithExtension.replace(/\.(astro|md|mdx|html)$/, '');
  return withoutExtension.replace(/(^|\/)index$/, '');
}

// A dynamic route file (its name contains `[`) does not claim a URL by itself — Astro
// expands it per param at build time. But the directory it lives in still claims that
// directory's URL, the same way `belts/index.astro` claims `/belts`. Drop any path
// segment containing `[` before deriving the claimed URL, so `belts/[slug].astro` is
// checked against `public/belts.html` exactly as `belts/index.astro` would be — that
// pairing was the guard's blind spot. A route with no routable segment left (every
// segment dynamic, e.g. a hypothetical top-level `[slug].astro`) claims no directory
// at all and is skipped — but `''` alone (the site root, `index.astro`) is a real,
// routable claim and must not be treated the same way.
function toRouteClaimedUrl(pathWithExtension: string): string | null {
  const routableSegments = pathWithExtension.split('/').filter((segment) => !segment.includes('['));
  if (routableSegments.length === 0) return null;
  return toClaimedUrl(routableSegments.join('/'));
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

describe('migrated routes do not leave their legacy page behind', () => {
  it('has no src/pages route claiming a URL a public/ page still answers', async () => {
    if (!existsSync(PAGES_DIR)) return;

    const legacyUrls = new Map(
      (await filesUnder(PUBLIC_DIR))
        .filter((file) => file.endsWith('.html'))
        .map((file) => [toClaimedUrl(file), file]),
    );

    const routes = (await filesUnder(PAGES_DIR)).filter((file) =>
      ROUTABLE_EXTENSIONS.some((extension) => file.endsWith(extension)),
    );

    for (const route of routes) {
      const claimedUrl = toRouteClaimedUrl(route);
      if (claimedUrl === null) continue; // wholly dynamic — claims no directory

      const legacyPage = legacyUrls.get(claimedUrl);

      expect(
        legacyPage,
        `src/pages/${route} and public/${legacyPage} both serve the same page — ` +
          `delete the legacy file to complete the migration, or old links keep getting the stale version`,
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
