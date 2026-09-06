import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { readBuiltPage } from './astro-html';

// Nothing else proves this route ships.
//
// public/quiz.html used to sit in public-passthrough's LEGACY_PAGES, so the build
// asserted a quiz page existed; removing that line on migration leaves a hole.
// Delete src/pages/quiz.astro and the build succeeds, every other suite stays green,
// /quiz 404s and the new 301 points at a dead URL. The browser suite cannot see it
// either — it renders the component and never asks whether a page was emitted. Same
// lesson as tests/build/flashcards-route.test.ts.

describe('the quiz route (/quiz)', () => {
  let html: string;

  beforeAll(async () => {
    html = await readBuiltPage('quiz', 'index.html');
  });

  it('is served at a directory URL, so /quiz.html needs no forced redirect', () => {
    expect(existsSync(join('dist', 'quiz.html'))).toBe(false);
  });

  it('shows the heading pair the page has always opened with', () => {
    expect(html).toContain('>SHIZENRYU DOJO QUIZ<');
    expect(html).toContain('>Know the words · Own the art<');
  });

  it('ships the container the island portals its streak chip into', () => {
    expect(html).toContain('id="streakChip"');
  });

  it('server-renders the whole menu, so nothing moves when the island hydrates', () => {
    // Each label is asserted as one text run with its trailing space, not just as a
    // word. React separates adjacent text nodes with an empty comment, so
    // `{name} <small>` would ship as `Beginner<!-- --> <small>` — invisible to a
    // reader, but it splits the text run and changes how the browser shapes it,
    // which was enough to stop the flashcards page matching the one it replaced
    // pixel for pixel. Quiz.tsx builds each label as a single expression to avoid
    // that, and these assertions are what keeps it that way.
    const menu: ReadonlyArray<readonly [string, string]> = [
      ['Beginner', 'Red &amp; Orange · 9th–8th Kyu'],
      ['Intermediate', 'Yellow &amp; Green · 7th–6th Kyu'],
      ['Advanced', 'Blue &amp; Purple · 5th–4th Kyu'],
      ['Brown &amp; Black', '3rd Kyu — Dan grades'],
      ['Everything', 'Full syllabus, all terms'],
      ['Kumite 1–6', 'Red to Green belt'],
      ['Kumite 1–12', 'The full set'],
    ];

    for (const [label, detail] of menu) {
      expect(html, `${label} is missing from the built menu`).toContain(`${label} <small>${detail}</small>`);
    }

    expect(html.match(/class="belt-btn/g) ?? []).toHaveLength(menu.length);
  });

  it('hydrates — the level buttons are inert markup otherwise', () => {
    expect(html).toContain('<astro-island');
  });

  it('says how a round works before a student picks a level', () => {
    expect(html).toContain('10 questions. Choose your level — each level includes everything below it.');
    expect(html).toContain('What comes next? Which kumite is it? Same side or opposite side?');
  });

  it('has no inline style attribute', () => {
    // The legacy page had four: the streak chip, the result's progress line and the
    // menu's two ledes. The progress bar's width is the one value that cannot be a
    // class, and the island assigns it through the CSSOM on an element that only
    // exists once a round has started — so it never reaches this HTML.
    expect(html).not.toContain('style="');
  });
});
