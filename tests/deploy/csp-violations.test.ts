import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { serveBuiltSite, type BuiltSite } from './serve-dist';

// The built site, served with the headers netlify.toml declares, in a real
// Chromium: every page must load and every island must work with ZERO
// Content-Security-Policy violations. A wrong policy breaks all three islands
// for every student at once, on a site with no error reporting, so this is the
// rehearsal that runs before every merge.
//
// The islands are driven, not just loaded: hydration is where Astro's inline
// bootstrap runs, and the quiz progress bar is the one place a style is set at
// runtime (through the CSSOM, which the policy does not govern — this proves it).

const DIST_DIR = 'dist';

const routes: readonly string[] = readdirSync(DIST_DIR, { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => `/${relative(DIST_DIR, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
  .map((file) => (file === '/404.html' ? file : file.replace(/index\.html$/, '')))
  .sort();

type Visit = {
  readonly page: Page;
  readonly status: number;
  readonly csp: string | undefined;
  readonly violations: readonly string[];
  readonly errors: readonly string[];
};

let browser: Browser;
let site: BuiltSite;

beforeAll(async () => {
  [browser, site] = await Promise.all([chromium.launch(), serveBuiltSite()]);
});

afterAll(async () => {
  await Promise.all([browser?.close(), site?.close()]);
});

// Violations are reported to Node through a function Playwright exposes on the
// page; the listener is installed before any page script runs, so nothing is
// missed, and no test state lives on `window` for a page script to see.
async function visit(route: string): Promise<Visit> {
  const violations: string[] = [];
  const errors: string[] = [];
  const page = await browser.newPage();
  await page.exposeFunction('reportCspViolation', (report: string) => violations.push(report));
  await page.addInitScript(`
    document.addEventListener('securitypolicyviolation', (event) => {
      reportCspViolation(event.violatedDirective + ' blocked ' + (event.blockedURI || 'inline') +
        ' at ' + (event.sourceFile || document.location.pathname) + ':' + event.lineNumber);
    });
  `);
  const url = `${site.origin}${route}`;
  page.on('pageerror', (error) => errors.push(error.message));
  // Chromium logs a document's own 404 status as a console error; for the
  // 404-page test that is the point, so the document itself is exempt. A
  // failed sub-resource — script, stylesheet, image — is still an error.
  page.on('console', (message) => {
    if (message.type() === 'error' && message.location().url !== url) errors.push(message.text());
  });
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  if (!response) throw new Error(`no response for ${route}`);
  return { page, status: response.status(), csp: response.headers()['content-security-policy'], violations, errors };
}

const expectClean = ({ violations, errors }: Visit, when: string): void => {
  expect(violations, `CSP violations ${when}`).toEqual([]);
  expect(errors, `page errors ${when}`).toEqual([]);
};

describe('every built page, served with the headers netlify.toml declares', () => {
  it.each(routes)('%s arrives with the policy from netlify.toml and loads without a violation', async (route) => {
    const visit_ = await visit(route);
    expect(visit_.csp).toBe(site.headers['Content-Security-Policy']);
    // The policy comes from the header alone, so there is exactly one place to edit it.
    expect(await visit_.page.locator('meta[http-equiv="content-security-policy" i]').count()).toBe(0);
    expectClean(visit_, `loading ${route}`);
    await visit_.page.close();
  });

  it('a path that does not exist gets the 404 page, with the same headers', async () => {
    const visit_ = await visit('/no-such-page');
    expect(visit_.status).toBe(404);
    expect(visit_.csp).toBe(site.headers['Content-Security-Policy']);
    expectClean(visit_, 'loading the 404 page');
    await visit_.page.close();
  });
});

describe('every island works under that policy', () => {
  it('/practice: ticking a tile records it and draws the streak chip into the header', async () => {
    const visit_ = await visit('/practice/');
    const { page } = visit_;
    await page.getByRole('button', { name: /Stretch/ }).click();
    await page.getByText(/1 thing done today/).waitFor();
    expect(await page.locator('header #streakChip').textContent()).toContain('streak');
    expectClean(visit_, 'ticking a practice tile');
    await page.close();
  });

  it('/flashcards: a deck opens, a card flips and can be graded', async () => {
    const visit_ = await visit('/flashcards/');
    const { page } = visit_;
    await page.getByRole('button', { name: 'The Maxims' }).click();
    await page.locator('button.flash').click();
    await page.locator('button.flash.flipped').waitFor();
    await page.getByRole('button', { name: 'Got it' }).click();
    expectClean(visit_, 'flipping and grading a flashcard');
    await page.close();
  });

  it('/quiz: a round starts, an answer counts and the progress bar moves', async () => {
    const visit_ = await visit('/quiz/');
    const { page } = visit_;
    await page.getByRole('button', { name: /Kumite 1–6/ }).click();
    const barWidth = (): Promise<string> =>
      page.locator('.progress div').evaluate((bar) => getComputedStyle(bar).width);
    expect(await barWidth()).toBe('0px');
    await page.locator('.opts button').first().click();
    await page.locator('.next-btn').click();
    await page.waitForFunction(() => {
      const bar = document.querySelector('.progress div');
      return bar !== null && getComputedStyle(bar).width !== '0px';
    });
    expect(await barWidth()).not.toBe('0px');
    expectClean(visit_, 'answering a quiz question');
    await page.close();
  });
});
