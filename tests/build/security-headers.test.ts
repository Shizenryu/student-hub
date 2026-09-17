import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { filesUnder } from '../support/files';
import { headerRules, rule } from '../support/netlify-headers';
import { builtPages, decodeAttribute } from './astro-html';

// The security headers a student's browser receives, pinned at build time from
// the two places they come from. The Content-Security-Policy is split: Astro
// generates the part that needs per-page hashes (script-src, style-src and the
// fixed directives, as a <meta> on every page — see astro.config.mjs), and
// netlify.toml sends the one directive a <meta> cannot carry, frame-ancestors,
// alongside the hardening headers. Two policies intersect, so nothing loosens.
//
// This suite is the fast half, no Chromium, inside `npm test`: it checks the
// file Netlify serves from and every built page for the shape the deploy suite
// (tests/deploy/) then proves in a real browser.

// Whole rules, not header-by-header: an unexpected extra header fails too.
const EVERY_RESPONSE: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

// Astro names every file under /_astro/ by content hash, so a changed file is a
// new URL and the old one can be cached forever.
const HASHED_ASSETS: Readonly<Record<string, string>> = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

// What every page's <meta> policy must say beyond the hashes Astro computes,
// with the hash sources removed: asserting the whole skeleton means a directive
// that appears from nowhere, or a host source that widens one, fails.
const PAGE_POLICY_SKELETON =
  "default-src 'none'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; script-src 'self'; style-src 'self'";

// Read once: neither the file nor the build changes during a run.
const rules = headerRules(await readFile('netlify.toml', 'utf8'));
const pages = await builtPages();

const HASH_SOURCE = /^'(sha256|sha384|sha512)-[A-Za-z0-9+/]+=*'$/;

const directivesOf = (csp: string): readonly string[] =>
  csp
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive.length > 0);

const sourcesOf = (csp: string, directive: string): readonly string[] =>
  directivesOf(csp)
    .find((candidate) => candidate === directive || candidate.startsWith(`${directive} `))
    ?.split(/\s+/)
    .slice(1) ?? [];

const skeletonOf = (csp: string): string =>
  directivesOf(csp)
    .map((directive) =>
      directive
        .split(/\s+/)
        .filter((token) => !HASH_SOURCE.test(token))
        .join(' '),
    )
    .join('; ');

const metaPolicies = (html: string): readonly string[] =>
  [...html.matchAll(/<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"/gi)].map((match) =>
    decodeAttribute(match[1] ?? ''),
  );

// Inline means no src= — an external <script src> is covered by 'self', and its
// body is empty anyway.
const inlineBodies = (html: string, tag: 'script' | 'style'): readonly string[] =>
  [...html.matchAll(new RegExp(`<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map(
    (match) => match[1] ?? '',
  );

// The browser hashes the exact bytes between the tags, no trimming — so this
// must too. The algorithm is whichever the policy's own hashes use.
const hashSource = (algorithm: string, body: string): string =>
  `'${algorithm}-${createHash(algorithm).update(body).digest('base64')}'`;

function expectInlineAllowed(route: string, html: string, csp: string, tag: 'script' | 'style'): void {
  const sources = sourcesOf(csp, `${tag}-src`);
  const algorithms = [...new Set(sources.flatMap((source) => HASH_SOURCE.exec(source)?.[1] ?? []))];
  for (const body of inlineBodies(html, tag)) {
    expect(
      algorithms.some((algorithm) => sources.includes(hashSource(algorithm, body))),
      `${route} has an inline <${tag}> its own policy does not allow — Astro should have hashed it; ` +
        `the ${body.length}-byte ${tag} begins: ${JSON.stringify(body.slice(0, 60))}`,
    ).toBe(true);
  }
}

// Any attribute value, whatever the quoting; matched case-insensitively and
// with spaces around `=`, since the browser accepts all of those.
const attributeValues = (html: string, tag: string, attribute: string): readonly string[] =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*?\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi'))].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? '',
  );

const isSameOrigin = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');

describe('the headers netlify.toml sends', () => {
  it('with every response', () => {
    expect(rule(rules, '/*')).toEqual(EVERY_RESPONSE);
  });

  it('with the content-hashed assets', () => {
    expect(rule(rules, '/_astro/*')).toEqual(HASHED_ASSETS);
  });
});

describe('every built page', () => {
  it('carries exactly one Content-Security-Policy <meta>, with this skeleton and nothing more', () => {
    for (const { route, html } of pages) {
      const policies = metaPolicies(html);
      expect(policies, `${route} should carry one CSP <meta>`).toHaveLength(1);
      expect(skeletonOf(policies[0] ?? ''), route).toBe(PAGE_POLICY_SKELETON);
    }
  });

  it('has every inline script and style allowed by a hash in its own policy', () => {
    for (const { route, html } of pages) {
      const [csp = ''] = metaPolicies(html);
      expectInlineAllowed(route, html, csp, 'script');
      expectInlineAllowed(route, html, csp, 'style');
    }
  });

  it('ships no style attribute and no inline event handler', () => {
    for (const { route, html } of pages) {
      expect(html, `${route} has a style attribute`).not.toMatch(/\sstyle\s*=/i);
      expect(html, `${route} has an on*= handler attribute`).not.toMatch(/\son[a-z]+\s*=/i);
    }
  });

  it('loads every script, stylesheet and image from this origin', () => {
    for (const { route, html } of pages) {
      const urls = [
        ...attributeValues(html, 'script', 'src'),
        ...attributeValues(html, 'link', 'href'),
        ...attributeValues(html, 'img', 'src'),
      ];
      for (const url of urls) {
        expect(isSameOrigin(url), `${route} loads ${url}, which the policy would block`).toBe(true);
      }
    }
  });
});

// A stylesheet can load too — a background image, a font — and the policy
// allows neither from another origin. The pages' inline styles are scanned
// above; this covers every stylesheet the build emitted as a file.
describe('every built stylesheet', () => {
  it('references nothing from another origin', async () => {
    const stylesheets = (await filesUnder('dist')).filter((file) => file.endsWith('.css'));
    for (const file of stylesheets) {
      const css = await readFile(join('dist', file), 'utf8');
      const urls = [...css.matchAll(/url\(\s*["']?([^"')\s]+)/g)].map((match) => match[1] ?? '');
      for (const url of urls) {
        expect(isSameOrigin(url) || url.startsWith('data:'), `${file} loads ${url}, which the policy would block`).toBe(
          true,
        );
      }
    }
  });
});
