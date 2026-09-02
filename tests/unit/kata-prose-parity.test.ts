import { readFile } from 'node:fs/promises';

import { markdownConfigDefaults } from '@astrojs/internal-helpers/markdown';
import { parseFrontmatter } from '@astrojs/internal-helpers/frontmatter';
import { satteri } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';

import { KATA } from '../../src/data';
import { kataSectionsFromJson, splitIntoSections, visibleText } from '../../src/data/kata-prose';

// The fidelity proof that src/content/kata/<slug>.md says the same thing as
// src/data/kata.json, at the CONTENT level: this file renders the markdown
// with its OWN local satteri() call, using framework defaults — not the
// shipped build's configuration. astro.config.mjs overrides
// `markdown.processor` to disable smart punctuation for the real build (see
// its own comment); this test deliberately does not carry that override, so
// its renderer applies smart punctuation where the shipped pipeline does
// not. That divergence is folded away below (see foldQuotes) — it is a
// property of THIS TEST's renderer, not a claim that the shipped pipeline
// behaves the same way.
//
// Because of that, this test does NOT prove what the built page shows a
// student — it proves the two authored copies of the prose agree with each
// other. The shipped page's fidelity (exact characters, exact emphasis
// placement, block by block) is proven separately, against `dist/`, by
// tests/build/kata-routes.test.ts. Do not read a pass here as coverage of
// the real pipeline.
//
// A byte comparison is the wrong test: markdown always wraps a block in <p>,
// but a section with no block tags in kata.json is bare text with no
// wrapper, and those render identically (the site's global reset sets
// `* { margin: 0 }`) while differing byte-for-byte. So both sides are parsed
// down to the same semantic model — see src/data/kata-prose.ts, the shared
// comparator both this test and kata-routes.test.ts use — and *that* is what
// gets compared. Every expectation below is derived from kata.json at run
// time; nothing here is a hand-typed copy of the prose.

// This test's local renderer applies smart punctuation (its framework
// default), turning kata.json's straight quotes (e.g. 'three conflicts')
// into curly ones. That is a difference between this test's renderer and
// the real one (which disables it) — not a claim that curly-quote
// conversion is harmless content-wise; the real pipeline is asserted to
// preserve the authored straight quotes exactly, by kata-routes.test.ts's
// character-for-character test. Folding here is purely a workaround so this
// test's own renderer choice does not produce a false mismatch.
function foldQuotes(html: string): string {
  return html.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

const processor = satteri();
const renderer = await processor.createRenderer(markdownConfigDefaults);

const renderedBodyCache = new Map<string, Promise<string>>();

function kataMarkdownPath(slug: string): string {
  return `src/content/kata/${slug}.md`;
}

function renderedBody(slug: string): Promise<string> {
  const cached = renderedBodyCache.get(slug);
  if (cached) return cached;

  const promise = (async () => {
    const raw = await readFile(kataMarkdownPath(slug), 'utf8');
    const withoutFrontmatter = raw.replace(/^---[\s\S]*?\n---\n+/, '');
    const result = await renderer.render(withoutFrontmatter);
    return foldQuotes(result.code);
  })();

  renderedBodyCache.set(slug, promise);
  return promise;
}

describe('kata prose markdown says the same thing as src/data/kata.json', () => {
  it.each(KATA.map((kata) => kata.slug))('%s: sections match, block for block, in order', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const html = await renderedBody(slug);
    const actual = splitIntoSections(html);
    const expected = kataSectionsFromJson(kata);

    expect(actual).toStrictEqual(expected);
  });
});

// FINDING 7: KataGuide.astro takes name/translation/hex/white/match/quote
// from kata.json, not from the content collection entry — nothing renders
// src/content/kata/<slug>.md's frontmatter today. That leaves it free to
// drift from kata.json (a fabricated quote, a swapped hex) with no build or
// test failure. This asserts every frontmatter field against kata.json,
// field for field, so the frontmatter stays a verified second copy of the
// same facts rather than a decorative one — the fields exist for a later
// slice to read, kept honest until then.

type KataQuote = { readonly text: string; readonly src: string };
type KataFrontmatter = {
  readonly name: string;
  readonly translation: string;
  readonly hex: string;
  readonly white: boolean;
  readonly match: readonly string[];
  readonly quote?: KataQuote;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isKataQuote(value: unknown): value is KataQuote {
  return isRecord(value) && typeof value.text === 'string' && typeof value.src === 'string';
}

function toKataFrontmatter(raw: unknown, slug: string): KataFrontmatter {
  if (!isRecord(raw)) throw new Error(`${slug}.md frontmatter is not an object`);
  const { name, translation, hex, white, match, quote } = raw;
  if (typeof name !== 'string') throw new Error(`${slug}.md frontmatter.name is not a string`);
  if (typeof translation !== 'string') throw new Error(`${slug}.md frontmatter.translation is not a string`);
  if (typeof hex !== 'string') throw new Error(`${slug}.md frontmatter.hex is not a string`);
  if (typeof white !== 'boolean') throw new Error(`${slug}.md frontmatter.white is not a boolean`);
  if (!isStringArray(match)) throw new Error(`${slug}.md frontmatter.match is not a string array`);
  if (quote === undefined) return { name, translation, hex, white, match };
  if (!isKataQuote(quote)) throw new Error(`${slug}.md frontmatter.quote is malformed`);
  return { name, translation, hex, white, match, quote };
}

describe("kata markdown frontmatter matches src/data/kata.json, field for field", () => {
  it.each(KATA.map((kata) => kata.slug))('%s: frontmatter matches exactly', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const raw = await readFile(kataMarkdownPath(slug), 'utf8');
    const { frontmatter } = parseFrontmatter(raw);
    const actual = toKataFrontmatter(frontmatter, slug);

    const expected: KataFrontmatter =
      kata.quote === undefined
        ? { name: kata.name, translation: kata.translation, hex: kata.hex, white: kata.white, match: kata.match }
        : {
            name: kata.name,
            translation: kata.translation,
            hex: kata.hex,
            white: kata.white,
            match: kata.match,
            quote: kata.quote,
          };

    expect(actual).toStrictEqual(expected);
  });
});

// Pinned separately from the block-comparison suite above: proves headings
// stay in the same order kata.json declares, independent of body content, so
// a heading-only regression (a reordered `## ` line) is unambiguous in a
// failure message rather than buried inside a full-section diff.
describe('kata prose markdown headings', () => {
  it.each(KATA.map((kata) => kata.slug))('%s: section headings match, in order', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const html = await renderedBody(slug);
    const rendered = splitIntoSections(html);

    expect(rendered.map((section) => section.heading)).toStrictEqual(
      kata.sections.map((section) => visibleText(section.h)),
    );
  });
});
