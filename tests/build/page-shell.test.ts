import { describe, expect, it } from 'vitest';

import { builtPages } from './astro-html';

// Every page wraps in the same shell, and the shell has no variants: one column
// width, one spacing scale, one heading pair. The migration carried each page's
// hand-written drift across as an `.app--*` modifier so the port could be reviewed
// as a port; slice 9 collapsed them, and this is what keeps them collapsed.

const pages = await builtPages();

const shellClassOf = (html: string): string | undefined => /<div class="(app[^"]*)"/.exec(html)?.[1];

describe('the page shell', () => {
  it('is on every built page', () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const { route, html } of pages) {
      expect(shellClassOf(html), `${route} has no .app shell`).toBeDefined();
    }
  });

  it('has one column width — no page asks for a narrower or wider one', () => {
    for (const { route, html } of pages) {
      expect(shellClassOf(html), route).not.toMatch(/app--(narrow|wide)/);
    }
  });

  it('is the bare shell on every page — no variant for spacing, headings or colour', () => {
    for (const { route, html } of pages) {
      expect(shellClassOf(html), route).toBe('app');
    }
  });

  it('wraps the 404 page too, with the shared footer', () => {
    const notFound = pages.find((page) => page.route === '/404.html');
    expect(notFound).toBeDefined();
    expect(notFound?.html).toContain('<div class="app">');
    expect(notFound?.html).toContain('← Shizenryu home');
  });
});
