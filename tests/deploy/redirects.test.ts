import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { serveBuiltSite, type BuiltSite } from './serve-dist';

// The redirect rules, applied rather than read. tests/build/netlify-redirects.test.ts
// pins what netlify.toml says; this serves the built site under those rules and
// follows them, so the one that is a behaviour rather than a value — `force`,
// which has to beat the real dist/index.html Astro emits — is executable instead
// of explained in a comment.
//
// No browser: a redirect is a status and a Location header, and Chromium would
// only slow it down. What this cannot prove is that NETLIFY reads the rules the
// same way; that is the one-time curl after a deploy, as with the headers.

let site: BuiltSite;

beforeAll(async () => {
  site = await serveBuiltSite();
});

afterAll(async () => {
  await site?.close();
});

const RETIRED: ReadonlyArray<readonly [from: string, to: string]> = [
  ['/belts.html', '/belts'],
  ['/kata.html', '/kata'],
  ['/practice.html', '/practice'],
  ['/flashcards.html', '/flashcards'],
  ['/quiz.html', '/quiz'],
];

describe('a retired URL still reaches its page', () => {
  it.each(RETIRED)('301s %s to %s', async (from, to) => {
    const response = await fetch(`${site.origin}${from}`, { redirect: 'manual' });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(to);
  });

  it('redirects the home page even though a real file answers that path', async () => {
    // dist/index.html exists, so an ordinary rule would never fire; this is the
    // whole reason that one rule is forced.
    const response = await fetch(`${site.origin}/index.html`, { redirect: 'manual' });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/');
  });

  it('arrives at a real page when the redirect is followed', async () => {
    const response = await fetch(`${site.origin}/quiz.html`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('DOJO QUIZ');
  });

  it('leaves a canonical URL alone', async () => {
    const response = await fetch(`${site.origin}/quiz/`, { redirect: 'manual' });

    expect(response.status).toBe(200);
  });

  it('301s a route without its trailing slash, as Netlify does', async () => {
    // This is why a retired URL takes two hops: /quiz.html to /quiz to /quiz/.
    const response = await fetch(`${site.origin}/quiz`, { redirect: 'manual' });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/quiz/');
  });

  it('still answers an unknown path with the 404 page', async () => {
    const response = await fetch(`${site.origin}/no-such-page`, { redirect: 'manual' });

    expect(response.status).toBe(404);
  });
});
