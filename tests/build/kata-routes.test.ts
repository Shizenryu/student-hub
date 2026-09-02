import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { KATA, SYLLABUS } from '../../src/data';
import { kataSectionsFromJson, splitIntoSections, visibleText } from '../../src/data/kata-prose';

// Same rationale as tests/build/belts-routes.test.ts: asserting against the built
// HTML files pins the same behaviour without wiring a static file server into
// Vitest Browser Mode.
const DIST_DIR = 'dist';
const KATA_DIR = join(DIST_DIR, 'kata');

async function readKataPage(slug: string): Promise<string> {
  return readFile(join(KATA_DIR, slug, 'index.html'), 'utf8');
}

// Astro escapes interpolated text — content containing &, <, >, " or ' comes out
// entity-escaped in the built HTML, so fixture text is escaped the same way
// before comparing.
function astroEscapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Astro adds a scoped-style attribute (data-astro-cid-*) to every element
// KataGuide.astro renders, which breaks an exact-markup match like
// `<span class="g">grade</span> item` — see belts-routes.test.ts's
// extractNavBlock comment for the same caveat. Stripping it restores the
// original, exact assertion instead of loosening it.
function stripScopeAttribute(html: string): string {
  return html.replace(/ data-astro-cid-[a-z0-9]+/g, '');
}

describe('the kata list route (/kata)', () => {
  let html: string;

  beforeAll(async () => {
    if (!existsSync(KATA_DIR)) {
      throw new Error('dist/kata is missing — run `npm run build` before this test');
    }
    html = await readFile(join(KATA_DIR, 'index.html'), 'utf8');
  });

  it('shows every kata as a tile linking to its own route', () => {
    expect(KATA.length).toBe(4);
    for (const kata of KATA) {
      expect(html).toContain(`href="/kata/${kata.slug}"`);
      expect(html).toContain(`>${astroEscapeText(kata.name)}<`);
      expect(html).toContain(`>${astroEscapeText(kata.translation)}<`);
    }
    expect((html.match(/class="kata-btn kata-colour"/g) ?? []).length).toBe(4);
  });

  it('shows the explanatory paragraph', () => {
    expect(html).toContain('Four kata carry the art');
  });

  it('ships no inline style="" attribute', () => {
    expect(html).not.toContain('style="');
  });

  // legacy-hash.js (shared with the belts list — see belts-routes.test.ts for
  // its own copy of this contract) reads these attributes to upgrade an old
  // /kata.html#<slug> bookmark to its real route. Nothing else pins that
  // contract on this page — a renamed attribute or a dropped <script> tag
  // would silently send every bookmarked student to the generic list.
  it('wires the bookmark-upgrade script to the built page with no inline body', () => {
    const scriptMatch = /<script([^>]*)src="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/.exec(html);
    expect(scriptMatch, 'no <script src="..."> found in the built page').not.toBeNull();
    if (!scriptMatch) return;
    const [, before, src, after, body] = scriptMatch;
    expect(src).toBe('/assets/legacy-hash.js');
    expect(`${before ?? ''}${after ?? ''}`).not.toContain('src=');
    expect(body?.trim()).toBe('');

    expect(html).toContain('data-legacy-prefix="/kata"');

    const attrMatch = /data-legacy-slugs="([^"]*)"/.exec(html);
    expect(attrMatch, 'no data-legacy-slugs attribute found in the built page').not.toBeNull();
    if (!attrMatch) return;
    const rawSlugs = attrMatch[1] ?? '';
    const parsedSlugs: unknown = JSON.parse(rawSlugs.replace(/&quot;/g, '"'));
    expect(parsedSlugs).toEqual(KATA.map((kata) => kata.slug));
  });
});

// Generalised over all four kata (previously mara-only) — Naifuanchin's two
// match needles (its json key covers a source spelling variant) are still
// exercised, but every kata's banner, headings, quote and syllabus rows are
// now pinned, not just one fixture's.
describe.each(KATA)('a kata study guide route (/kata/<slug>): $slug', (kata) => {
  let html: string;

  beforeAll(async () => {
    html = stripScopeAttribute(await readKataPage(kata.slug));
  });

  it('shows the kata banner name and translation', () => {
    expect(html).toContain(`class="banner kata-colour" data-slug="${kata.slug}"`);
    expect(html).toContain(`>${astroEscapeText(kata.name)}<`);
    expect(html).toContain(`>${astroEscapeText(kata.translation)}<`);
  });

  it('shows every section heading, in order, as one flowing document', () => {
    const positions = kata.sections.map((section) => {
      const heading = `>${astroEscapeText(section.h)}</h2>`;
      const index = html.indexOf(heading);
      expect(index, `heading "${section.h}" not found in ${kata.slug}'s page`).toBeGreaterThan(-1);
      return index;
    });

    for (let i = 1; i < positions.length; i += 1) {
      const previous = positions[i - 1];
      const current = positions[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous === undefined || current === undefined) return;
      expect(current, 'section headings must appear in source order').toBeGreaterThan(previous);
    }
  });

  it('shows the quote in curly quotes with its source', () => {
    expect(kata.quote).toBeDefined();
    if (!kata.quote) return;
    expect(html).toContain(`“${astroEscapeText(kata.quote.text)}”`);
    expect(html).toContain(`— ${astroEscapeText(kata.quote.src)}`);
  });

  it('shows every matching syllabus row, in order, and only those rows, without JJ expansion', () => {
    const rows = SYLLABUS.filter((item) => {
      const blob = `${item.section} ${item.item} ${item.detail}`.toLowerCase();
      return kata.match.some((needle) => blob.includes(needle));
    });
    expect(rows.length).toBeGreaterThan(0);

    // Every rendered row is one of the expected rows and nothing else — an
    // over-matching filter (e.g. one that lists the whole syllabus) inflates
    // this count past rows.length and fails here, even though every expected
    // row individually still appears somewhere in the page.
    const renderedRowCount = (html.match(/class="syl"/g) ?? []).length;
    expect(renderedRowCount).toBe(rows.length);

    // Some rows share identical grade+item text (e.g. two Shodan rows both
    // reading "Complete Mara reflex flow drill" — one Adult, one Junior), so
    // a plain html.indexOf(marker) would find the same first occurrence for
    // both and mistake a genuinely-ordered pair for one out of order.
    // Searching forward from the end of the previous match instead treats
    // the page as a single pass, matching each row to its own occurrence.
    let searchFrom = 0;
    for (const row of rows) {
      const marker = `<span class="g">${astroEscapeText(row.grade)}</span> ${astroEscapeText(row.item)}`;
      const index = html.indexOf(marker, searchFrom);
      expect(index, `row "${row.item}" not found in syllabus order in ${kata.slug}'s page`).toBeGreaterThan(-1);
      if (row.track === 'Adult') expect(html).toContain('class="tag adult"');
      if (row.track === 'Junior') expect(html).toContain('class="tag junior"');
      searchFrom = index + marker.length;
    }

    // kata.html never calls expand() on syllabus text — unlike the belts page,
    // JJ is shown exactly as the syllabus spells it, never expanded. True
    // regardless of whether this kata happens to match a JJ row today.
    expect(html).not.toContain('Jiu Jitsu (JJ)');

    const jjRow = SYLLABUS.find((item) => {
      const blob = `${item.section} ${item.item} ${item.detail}`.toLowerCase();
      return kata.match.some((needle) => blob.includes(needle)) && /\bJJ\b/.test(item.item);
    });
    if (jjRow) {
      expect(html).toContain(astroEscapeText(jjRow.item));
    }
  });

  it('ships no inline style="" attribute', () => {
    expect(html).not.toContain('style="');
  });
});

// FINDING 1: emphasis placement is martial instruction here, not decoration —
// a phrase bolded correctly but attached to the wrong sentence, or bolded in
// the wrong section, changes what a student is told to practise. This
// compares ORDERED (block, run) sequences derived from the BUILT page against
// the same ordered model derived from kata.json, per kata, per section — not
// a flattened bag of emphasised substrings — so a relocated <b>, a <b>/<i>
// swap, a reordered list, or a dropped word all fail here even though the
// existing character-for-character test below (which flattens to plain text)
// would not catch every one of them on its own.
describe("a kata's shipped emphasis matches kata.json, block for block, in order", () => {
  it.each(KATA.map((kata) => kata.slug))('%s', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const html = await readKataPage(slug);
    const actual = splitIntoSections(extractProseHtml(html));
    const expected = kataSectionsFromJson(kata);

    expect(actual).toStrictEqual(expected);
  });
});

function extractNavBlock(html: string): string {
  const match = /<div class="nav"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  expect(match, 'no <div class="nav"> found in the built page').not.toBeNull();
  return match?.[1] ?? '';
}

describe('prev/next navigation between kata', () => {
  it('disables the previous link on the first kata and links forward to the second', async () => {
    const firstSlug = KATA[0]?.slug;
    const secondSlug = KATA[1]?.slug;
    expect(firstSlug).toBeDefined();
    expect(secondSlug).toBeDefined();
    if (!firstSlug || !secondSlug) return;

    const nav = extractNavBlock(await readKataPage(firstSlug));
    expect(nav).toContain('<button class="nav-btn" disabled');
    expect(nav).toContain('← Previous</button>');
    expect(nav).toContain(`<a class="nav-btn" href="/kata/${secondSlug}"`);
    expect((nav.match(/<button class="nav-btn" disabled/g) ?? []).length).toBe(1);
  });

  it('disables the next link on the last kata and links back to the second-to-last', async () => {
    const lastSlug = KATA.at(-1)?.slug;
    const secondLastSlug = KATA.at(-2)?.slug;
    expect(lastSlug).toBeDefined();
    expect(secondLastSlug).toBeDefined();
    if (!lastSlug || !secondLastSlug) return;

    const nav = extractNavBlock(await readKataPage(lastSlug));
    expect(nav).toContain('<button class="nav-btn" disabled');
    expect(nav).toContain('Next →</button>');
    expect(nav).toContain(`<a class="nav-btn" href="/kata/${secondLastSlug}"`);
  });

  it('links both directions for a kata in the middle of the list', async () => {
    // KATA has 4 entries — index 1 or 2 is "the middle" with a real prev and next.
    const middleIndex = Math.floor(KATA.length / 2) - 1;
    const middle = KATA[middleIndex];
    const prev = KATA[middleIndex - 1];
    const next = KATA[middleIndex + 1];
    expect(middle).toBeDefined();
    expect(prev).toBeDefined();
    expect(next).toBeDefined();
    if (!middle || !prev || !next) return;

    const nav = extractNavBlock(await readKataPage(middle.slug));
    expect(nav).toContain(`<a class="nav-btn" href="/kata/${prev.slug}"`);
    expect(nav).toContain(`<a class="nav-btn" href="/kata/${next.slug}"`);
    expect(nav).not.toContain('disabled');
  });
});

// The prose text itself, character for character — none of the tests above ever
// read a paragraph or list item, only headings and syllabus rows, so a
// transformation that silently rewrites the body prose (e.g. a markdown
// processor's smart-punctuation pass turning straight quotes into curly ones)
// would pass every test above while changing what students actually read on
// the page. public/kata.html injects the authored HTML with innerHTML, so the
// browser shows the literal characters written in data.js — the built route
// must show exactly the same characters, not a typographically "improved" copy.
//
// Deliberately NOT using kata-prose-parity.test.ts's quote-folding, which
// folds curly quotes back to straight ones — the right call for that test's
// fidelity proof (it compares two renderers of the same semantic content,
// one of which applies smart punctuation the shipped pipeline does not) but
// the wrong call here: this test's whole job is to catch exactly that kind
// of folding happening for real, unauthorised, in the shipped page.
// decodeHtmlEntities/collapseWhitespace/stripTags/visibleText are imported
// from src/data/kata-prose.ts — the shared comparator helper, also used by
// kata-prose-parity.test.ts, so this repo does not carry three near-duplicate
// copies of the same text-normalisation logic.

// kata.json's sections carry heading and body separately; the rendered page's
// headings live inside the same flowing document (see KataGuide.astro's
// ".prose" comment), so headings are dropped from the rendered side before
// comparing, to compare body prose against body prose only.
function stripHeadings(html: string): string {
  return html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, ' ');
}

// Captures everything inside KataGuide.astro's <div class="prose">, up to the
// closing tag that immediately precedes the quote block or the "In the
// syllabus" heading — the prose itself contains no nested <div>, so the first
// </div> after the opening tag is genuinely the matching close.
function extractProseHtml(html: string): string {
  const match = /<div class="prose"[^>]*>([\s\S]*?)<\/div>(?:<div class="quote"|<h2)/.exec(html);
  expect(match, 'no <div class="prose"> found in the built page').not.toBeNull();
  return match?.[1] ?? '';
}

describe("a kata's rendered prose matches src/data/kata.json, character for character", () => {
  it.each(KATA.map((kata) => kata.slug))("%s: every section's visible text matches exactly", async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const html = await readKataPage(slug);
    const actual = visibleText(stripHeadings(extractProseHtml(html)));
    const expected = visibleText(kata.sections.map((section) => section.b).join(' '));

    expect(actual).toBe(expected);
  });

  // Mara's "What it is" is the only section with paragraphs and a bullet list
  // together — named explicitly since it exercises both block types at once.
  it("mara: 'What it is' section text matches exactly, including its bullet list", async () => {
    const mara = KATA.find((entry) => entry.slug === 'mara');
    expect(mara).toBeDefined();
    if (!mara) return;

    const section = mara.sections.find((entry) => entry.h === 'What it is');
    expect(section).toBeDefined();
    if (!section) return;

    const html = await readKataPage('mara');
    const prose = extractProseHtml(html);
    // "What it is" is Mara's first section, so its body runs from the start
    // of the prose to the next <h2> (the "How it grows with you" heading).
    const firstSectionMatch = /^[\s\S]*?<\/h2>([\s\S]*?)<h2/.exec(prose);
    expect(firstSectionMatch, "could not isolate the first section's body").not.toBeNull();
    const actual = visibleText(firstSectionMatch?.[1] ?? '');
    const expected = visibleText(section.b);

    expect(actual).toBe(expected);
  });
});
