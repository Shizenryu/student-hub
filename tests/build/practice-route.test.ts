import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { PRACTICE } from '../../src/data';
import { astroEscapeText, readBuiltPage } from './astro-html';

// Nothing else proves this route ships.
//
// public/practice.html used to be in public-passthrough's LEGACY_PAGES, so the
// build asserted a practice page existed. Removing that line when the page
// migrated left a hole: delete src/pages/practice.astro and the build succeeds,
// every suite stays green, /practice 404s and the new 301 points at a dead URL.
// The browser suite cannot catch it either — it renders the component directly and
// never asks whether a page was emitted.
//
// Same lesson as the home route in slice 3b, where the opposite mistake was made:
// an assertion was left in LEGACY_PAGES passing for the wrong reason. A migrated
// page needs its own build test either way.

describe('the practice route (/practice)', () => {
  let html: string;

  beforeAll(async () => {
    html = await readBuiltPage('practice', 'index.html');
  });

  it('is served at a directory URL, so /practice.html needs no forced redirect', () => {
    // The home page's rule needs force = true because Astro emits dist/index.html
    // and the old URL still resolves to a real file. This one emits
    // dist/practice/index.html, so /practice.html matches nothing and the plain
    // 301 fires. That difference is only true while this assertion is.
    expect(existsSync(join('dist', 'practice.html'))).toBe(false);
  });

  it('shows the heading pair the page has always opened with', () => {
    expect(html).toContain('>DAILY PRACTICE<');
    expect(html).toContain('>One thing a day is enough<');
  });

  it('ships the container the island portals its streak chip into', () => {
    // The chip lives in <header>, above the island's own markup, and Practice.tsx
    // portals into it by id. If this element stops being rendered the chip
    // silently never appears — the portal just has nowhere to go.
    expect(html).toContain('id="streakChip"');
  });

  it('server-renders every activity, so the tiles are there before any script runs', () => {
    // Derived from src/data rather than a second copy of the list: the activities
    // are content, and this is the assertion that they reached the page.
    for (const activity of PRACTICE) {
      expect(html, `${activity.name} is missing from the built page`).toContain(astroEscapeText(activity.name));
      expect(html, `${activity.name}'s hint is missing`).toContain(astroEscapeText(activity.hint));
    }
    expect(html.match(/class="act"/g) ?? []).toHaveLength(PRACTICE.length);
  });

  it('hydrates — the tiles are inert markup otherwise', () => {
    // client:load compiles to an astro-island element. Without it the page renders
    // and nothing a student taps does anything, which no other test would notice.
    expect(html).toContain('<astro-island');
  });

  it('keeps the closing thought verbatim', () => {
    expect(html).toContain('A stretch counts. One kata counts.');
  });

  it('has no inline style attribute', () => {
    expect(html).not.toContain('style="');
  });
});
