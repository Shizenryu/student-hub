import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { builtPages } from '../build/astro-html';
import { serveBuiltSite, type BuiltSite } from './serve-dist';

// The built site, served with the headers netlify.toml declares, in a real
// Chromium: every page must load and every island must work with ZERO
// Content-Security-Policy violations — from the <meta> policy Astro generated
// and the frame-ancestors header together. A wrong policy breaks all three
// islands for every student at once, on a site with no error reporting, so this
// is the rehearsal that runs before every merge.
//
// The islands are driven, not just loaded: hydration is where Astro's inline
// bootstrap runs, and the quiz progress bar is the one place a style is set at
// runtime (through the CSSOM, which the policy does not govern — this proves it).
//
// What this cannot prove is what Netlify itself sends: the server here is
// handed netlify.toml's values and echoes them, so the header assertions are a
// consistency check on that file, not evidence about the edge. The one-time
// curl after deploy in CLAUDE.md is that evidence.

const routes = (await builtPages()).map((page) => page.route);

type Report = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly violations: readonly string[];
  readonly errors: readonly string[];
};

let browser: Browser;
let context: BrowserContext;
let site: BuiltSite;
const violationsByPage = new WeakMap<Page, string[]>();

// The violation listener is installed once, on the context, before any page
// script runs on any page; reports come to Node through a binding Playwright
// exposes, which tells us the page they came from, so no test state lives on
// `window` for a page script to see.
beforeAll(async () => {
  [browser, site] = await Promise.all([chromium.launch(), serveBuiltSite()]);
  context = await browser.newContext();
  await context.exposeBinding('reportCspViolation', ({ page }, report: string) => {
    violationsByPage.get(page)?.push(report);
  });
  await context.addInitScript(`
    document.addEventListener('securitypolicyviolation', (event) => {
      window.reportCspViolation(event.violatedDirective + ' blocked ' + (event.blockedURI || 'inline') +
        ' at ' + (event.sourceFile || document.location.pathname) + ':' + event.lineNumber);
    });
  `);
});

afterAll(async () => {
  await Promise.all([browser?.close(), site?.close()]);
});

// Opens a page, runs the interaction, and asserts it stayed clean — closing the
// page whatever happened, so a failing assertion does not leave tabs open.
async function withPage(route: string, drive: (page: Page, report: Report) => Promise<void>): Promise<void> {
  const url = `${site.origin}${route}`;
  const violations: string[] = [];
  const errors: string[] = [];
  const page = await context.newPage();
  violationsByPage.set(page, violations);
  try {
    page.on('pageerror', (error) => errors.push(error.message));
    // Chromium logs a document's own 404 status as a console error; for the
    // 404-page test that is the point, so exactly that line is exempt. A failed
    // sub-resource, or a header Chromium could not parse, is still an error.
    page.on('console', (message) => {
      const documentStatusLine =
        message.location().url === url && message.text().startsWith('Failed to load resource');
      if (message.type() === 'error' && !documentStatusLine) errors.push(message.text());
    });
    const response = await page.goto(url);
    if (!response) throw new Error(`no response for ${route}`);
    const report: Report = { status: response.status(), headers: response.headers(), violations, errors };
    await drive(page, report);
    expect(violations, `CSP violations on ${route}`).toEqual([]);
    expect(errors, `page errors on ${route}`).toEqual([]);
  } finally {
    await page.close();
  }
}

const expectDeployHeaders = (report: Report): void => {
  for (const [name, value] of Object.entries(site.headers)) {
    expect(report.headers[name.toLowerCase()], name).toBe(value);
  }
};

describe('every built page, served with the headers netlify.toml declares', () => {
  it.each(routes)('%s arrives with the headers and its own policy, and loads without a violation', (route) =>
    withPage(route, async (page, report) => {
      expectDeployHeaders(report);
      expect(await page.locator('meta[http-equiv="content-security-policy" i]').count(), 'one CSP <meta>').toBe(1);
    }),
  );

  it('a path that does not exist gets the 404 page, with the same headers', () =>
    withPage('/no-such-page', async (page, report) => {
      expect(report.status).toBe(404);
      expectDeployHeaders(report);
      expect(await page.locator('meta[http-equiv="content-security-policy" i]').count()).toBe(1);
    }));
});

describe('every island works under that policy', () => {
  it('/practice: ticking a tile records it and draws the streak chip into the header', () =>
    withPage('/practice/', async (page) => {
      await page.getByRole('button', { name: /Stretch/ }).click();
      await page.getByText(/1 thing done today/).waitFor();
      expect(await page.locator('header #streakChip').textContent()).toContain('streak');
    }));

  it('/flashcards: a deck opens, a card flips and can be graded', () =>
    withPage('/flashcards/', async (page) => {
      await page.getByRole('button', { name: 'The Maxims' }).click();
      await page.locator('button.flash').click();
      await page.locator('button.flash.flipped').waitFor();
      await page.getByRole('button', { name: 'Got it' }).click();
    }));

  it('/quiz: a round starts, an answer counts and the progress bar moves', () =>
    withPage('/quiz/', async (page) => {
      await page.getByRole('button', { name: /Kumite 1–6/ }).click();
      await page.locator('.opts button').first().click();
      await page.locator('.next-btn').click();
      await page.waitForFunction(() => {
        const bar = document.querySelector('.progress div');
        return bar !== null && getComputedStyle(bar).width !== '0px';
      });
    }));
});
