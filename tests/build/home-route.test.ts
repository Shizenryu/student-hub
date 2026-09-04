import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { MAXIMS } from '../../src/data';
import { jsonAttribute } from './astro-html';

// Driving the built page through Vitest Browser Mode would need a static file
// server wired into the browser test config, which nothing in this repo sets
// up yet — see tests/build/belts-routes.test.ts for the same rationale.
// Asserting against the built HTML directly pins the same behaviour.
const DIST_DIR = 'dist';

describe('the home route (/)', () => {
  let html: string;

  beforeAll(async () => {
    if (!existsSync(DIST_DIR)) {
      throw new Error('dist is missing — run `npm run build` before this test');
    }
    html = await readFile(join(DIST_DIR, 'index.html'), 'utf8');
  });

  it('shows both masthead lines and the motto', () => {
    expect(html).toContain('>SHIZENRYU<');
    expect(html).toContain('>The Natural Way of Karate<');
    expect(html).toContain('Structure &gt; Discipline &gt; Measure / Accountability = Growth');
  });

  it('shows the crest and seal images with their intrinsic dimensions', () => {
    expect(html).toContain('src="/assets/img/ki.png"');
    expect(html).toContain('width="200"');
    expect(html).toContain('height="236"');
    expect(html).toContain('src="/assets/img/shizenryu-calligraphy.png"');
    expect(html).toContain('width="140"');
    expect(html).toContain('height="453"');
  });

  const tiles: ReadonlyArray<{ readonly title: string; readonly href: string; readonly description: string }> = [
    {
      title: 'Daily Practice',
      href: '/practice.html',
      description:
        'Tick off what you practised today — one thing is enough to keep your streak. Even a stretch.',
    },
    {
      title: 'Dojo Quiz',
      href: '/quiz.html',
      description:
        'Terminology by belt level, plus the Kumite 1–12 sequences. Ten questions a round — know the words, own the art.',
    },
    {
      title: 'Philosophy Flashcards',
      href: '/flashcards.html',
      description:
        'The Maxims, Zen &amp; Karate, the root kata, Tui Shou, the 6 Human Needs, grades &amp; titles. Flip, recall, repeat.',
    },
    {
      title: 'Belt Study Guides',
      href: '/belts',
      description:
        'Your next grading, explained — every syllabus item, the key terms, and the mind behind the movement.',
    },
    {
      title: 'Kata Reference',
      href: '/kata',
      description:
        'Mara, Sanchin, Rokushu, Naifuanchin — what each kata is, what its name means, and where it lives in the syllabus.',
    },
  ];

  it.each(tiles)('shows the $title tile linking to $href with its description', ({ title, href, description }) => {
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain(`>${title}<`);
    expect(html).toContain(description);
  });

  it('shows exactly five train tiles, one per gradient class', () => {
    for (const gradientClass of ['practice', 'quiz', 'cards', 'belts', 'kata']) {
      expect(html).toContain(`class="tile ${gradientClass}"`);
    }
    expect((html.match(/class="tile /g) ?? []).length).toBe(5);
  });

  const docs: ReadonlyArray<{ readonly href: string; readonly name: string; readonly subtitle: string }> = [
    {
      href: '/docs/study-guides.pdf',
      name: 'Grade Study Guides',
      subtitle: 'One page per belt — techniques, terms and mind',
    },
    {
      href: '/docs/philosophy-guide.pdf',
      name: 'Philosophy Study Guide',
      subtitle: 'The deeper elements, for advanced practitioners',
    },
    {
      href: '/docs/belt-passport.pdf',
      name: 'Belt Passport',
      subtitle: 'Print at A5 — your record of the journey',
    },
  ];

  it.each(docs)('shows the $name PDF link with its subtitle and a PDF badge', ({ href, name, subtitle }) => {
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain(`>${name}<`);
    expect(html).toContain(subtitle);
  });

  it('ships no inline style="" attribute', () => {
    expect(html).not.toContain('style="');
  });

  // home.js reads this attribute to pick the maxim of the day (see that
  // file's own header comment) — nothing else pins the contract that the
  // browser actually receives every maxim, and only every maxim.
  it('hands the browser exactly MAXIMS as a data attribute, not a second copy', () => {
    const parsedMaxims = jsonAttribute(html, 'data-maxims');
    expect(parsedMaxims, 'data-maxims is missing from the built page, or is not every maxim').toEqual(MAXIMS);
  });

  it('loads store.js before home.js, both as external scripts with no inline body', () => {
    const scriptTags = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    const externalScripts = scriptTags
      .map((match) => ({ attrs: match[1] ?? '', body: (match[2] ?? '').trim() }))
      .filter((script) => /src="/.test(script.attrs));

    for (const script of externalScripts) {
      expect(script.body).toBe('');
    }

    const srcs = externalScripts.map((script) => /src="([^"]+)"/.exec(script.attrs)?.[1]);
    const storeIndex = srcs.indexOf('/assets/store.js');
    const homeIndex = srcs.indexOf('/assets/home.js');
    expect(storeIndex, 'store.js not found as an external <script src>').toBeGreaterThanOrEqual(0);
    expect(homeIndex, 'home.js not found as an external <script src>').toBeGreaterThanOrEqual(0);
    expect(storeIndex).toBeLessThan(homeIndex);
  });
});
