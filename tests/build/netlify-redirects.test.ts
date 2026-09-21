import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { redirectRules } from '../support/netlify-config';
import { builtPages } from './astro-html';

// The migration retired five hand-written pages from public/ and moved the home
// page to a route. Every one of those URLs is in somebody's bookmarks, and the
// rules in netlify.toml are the only thing still answering them — a typo in a
// `from`, or a `to` left pointing at a route that was later renamed, would ship
// green and 404 a student who had done nothing wrong.

const rules = redirectRules(await readFile('netlify.toml', 'utf8'));
const routes = new Set((await builtPages()).map((page) => page.route));

// Where each retired page went. A historical fact: this list is complete and
// does not grow, because no page added after the migration ever had a .html URL.
const LEGACY_URLS: ReadonlyArray<readonly [from: string, to: string]> = [
  ['/belts.html', '/belts'],
  ['/kata.html', '/kata'],
  ['/practice.html', '/practice'],
  ['/flashcards.html', '/flashcards'],
  ['/quiz.html', '/quiz'],
  ['/index.html', '/'],
];

describe('the redirects that keep old bookmarks working', () => {
  it.each(LEGACY_URLS)('sends %s to %s, permanently', (from, to) => {
    const found = rules.find((candidate) => candidate.from === from);
    expect(found, `netlify.toml has no redirect from ${from}`).toBeDefined();
    expect(found?.to, from).toBe(to);
    expect(found?.status, from).toBe(301);
  });

  it('forces the home page rule, and only that one', () => {
    // Astro emits a real dist/index.html, so without `force` the file answers
    // /index.html and the rule never fires. No other retired URL has a file to
    // lose to, and forcing one would cost a needless redirect.
    expect(rules.filter((candidate) => candidate.force).map((candidate) => candidate.from)).toEqual(['/index.html']);
  });

  it('points every rule at a page the build actually produced', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const { from, to } of rules) {
      const route = to.endsWith('/') ? to : `${to}/`;
      expect(routes, `${from} redirects to ${to}, which the build does not produce`).toContain(route);
    }
  });
});
