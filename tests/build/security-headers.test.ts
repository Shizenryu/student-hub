import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { headerRules } from '../support/netlify-headers';

// What Netlify will send with every response, read from the file it sends it
// from, and checked against every page the build produced. The policy is
// hand-written — there is no adapter generating it — so this is the only thing
// standing between "someone added an inline script" and a page whose island
// silently fails to hydrate on every student's phone.
//
// The deploy suite (tests/deploy/) then proves the same policy in a real
// browser. This suite is the fast half: no Chromium, runs inside `npm test`.

const DIST_DIR = 'dist';
const NETLIFY_TOML = 'netlify.toml';

const EXPECTED_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

const FIXED_DIRECTIVES: readonly string[] = [
  "default-src 'none'",
  "img-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
];

async function everythingHeaders(): Promise<Readonly<Record<string, string>>> {
  const rule = headerRules(await readFile(NETLIFY_TOML, 'utf8')).find((candidate) => candidate.for === '/*');
  if (!rule) throw new Error(`${NETLIFY_TOML} has no [[headers]] rule for "/*"`);
  return rule.values;
}

async function policy(): Promise<string> {
  const csp = (await everythingHeaders())['Content-Security-Policy'];
  if (csp === undefined) throw new Error(`${NETLIFY_TOML} sets no Content-Security-Policy for "/*"`);
  return csp;
}

const directivesOf = (csp: string): readonly string[] =>
  csp
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive.length > 0);

const sourcesOf = (csp: string, directive: string): readonly string[] =>
  directivesOf(csp)
    .find((candidate) => candidate.startsWith(`${directive} `))
    ?.split(/\s+/)
    .slice(1) ?? [];

const HASH_SOURCE = /^'sha256-[A-Za-z0-9+/]+=*'$/;

// The browser hashes the exact bytes between the tags, no trimming — so this
// must too, or a hash that matches here fails in Chromium.
const sha256Source = (body: string): string => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

type BuiltPage = { readonly route: string; readonly html: string };

async function builtPages(): Promise<readonly BuiltPage[]> {
  const entries = await readdir(DIST_DIR, { withFileTypes: true, recursive: true });
  const paths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  if (paths.length === 0) throw new Error(`${DIST_DIR} has no built pages — run \`npm run build\` first`);
  return Promise.all(
    paths.map(async (path) => ({
      route: `/${relative(DIST_DIR, path).split(sep).join('/')}`,
      html: await readFile(path, 'utf8'),
    })),
  );
}

// Inline means no src= — an external <script src> is covered by 'self', and its
// body is empty anyway.
const inlineBodies = (html: string, tag: 'script' | 'style'): readonly string[] =>
  [...html.matchAll(new RegExp(`<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map(
    (match) => match[1] ?? '',
  );

const attributeValues = (html: string, tag: string, attribute: string): readonly string[] =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\s${attribute}="([^"]*)"`, 'g'))].map((match) => match[1] ?? '');

const isSameOrigin = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');

// Every inline <script> (or <style>) on every page is allowed by a hash the
// directive lists, and the directive lists no hash that no page uses — a stale
// hash is a standing permission for code that no longer exists.
async function expectInlineAllowedByHash(tag: 'script' | 'style', directive: string): Promise<void> {
  const allowed = sourcesOf(await policy(), directive).filter((source) => HASH_SOURCE.test(source));
  const used = new Set<string>();

  for (const page of await builtPages()) {
    for (const body of inlineBodies(page.html, tag)) {
      const source = sha256Source(body);
      used.add(source);
      expect(
        allowed,
        `${page.route} has an inline <${tag}> whose hash is not in netlify.toml's ${directive}. ` +
          `If the change is deliberate, add ${source} there and say why in the commit; ` +
          `the ${body.length}-byte ${tag} begins: ${JSON.stringify(body.slice(0, 60))}`,
      ).toContain(source);
    }
  }

  for (const source of allowed) {
    expect(used.has(source), `netlify.toml's ${directive} allows ${source} but no built page carries it`).toBe(true);
  }
}

describe('the headers netlify.toml sends with every response', () => {
  it.each(Object.entries(EXPECTED_HEADERS))('sets %s', async (name, value) => {
    expect((await everythingHeaders())[name]).toBe(value);
  });

  it('sets a Content-Security-Policy that starts from nothing and allows no inline or eval', async () => {
    const csp = await policy();
    const directives = directivesOf(csp);
    for (const directive of FIXED_DIRECTIVES) expect(directives).toContain(directive);
    expect(csp).not.toMatch(/unsafe-(inline|eval|hashes)/);
    expect(sourcesOf(csp, 'script-src')).toContain("'self'");
    expect(sourcesOf(csp, 'style-src')).toContain("'self'");
  });
});

describe('every built page under that policy', () => {
  it('has each inline script allowed by hash in script-src, and no unused hash', async () => {
    await expectInlineAllowedByHash('script', 'script-src');
  });

  it('has each inline style allowed by hash in style-src, and no unused hash', async () => {
    await expectInlineAllowedByHash('style', 'style-src');
  });

  it('ships no style attribute and no inline event handler', async () => {
    for (const page of await builtPages()) {
      expect(page.html, `${page.route} has a style="" attribute`).not.toContain('style="');
      expect(page.html, `${page.route} has an on*= handler attribute`).not.toMatch(/\son[a-z]+=/);
    }
  });

  it('loads every script, stylesheet and image from this origin', async () => {
    for (const page of await builtPages()) {
      const urls = [
        ...attributeValues(page.html, 'script', 'src'),
        ...attributeValues(page.html, 'link', 'href'),
        ...attributeValues(page.html, 'img', 'src'),
      ];
      for (const url of urls) {
        expect(isSameOrigin(url), `${page.route} loads ${url}, which the policy would block`).toBe(true);
      }
    }
  });
});
