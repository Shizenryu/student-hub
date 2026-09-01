import { readFile } from 'node:fs/promises';

import { satteri } from '@astrojs/markdown-satteri';
import { markdownConfigDefaults } from '@astrojs/internal-helpers/markdown';
import { describe, expect, it } from 'vitest';

import { KATA } from '../../src/data';

// This is the fidelity proof for the kata prose migration: src/data/kata.json's
// trusted-HTML sections must say exactly what src/content/kata/<slug>.md says, once
// rendered through the same markdown pipeline the site itself uses (Astro's default
// processor — Sätteri, the package the build actually calls; see astro.config.mjs,
// which does not override `markdown.processor`).
//
// A byte comparison is the wrong test: markdown always wraps a block in <p>, but a
// section with no block tags in kata.json is bare text with no wrapper, and those
// render identically (the site's global reset sets `* { margin: 0 }`) while differing
// byte-for-byte. So both sides are parsed down to the same semantic model — visible
// text with whitespace collapsed, the set of emphasised phrases, and list items in
// order — and *that* is what gets compared. Every expectation below is derived from
// kata.json at run time; nothing here is a hand-typed copy of the prose.

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// Astro's markdown pipeline applies smart punctuation (SmartyPants) by default, which
// turns the straight quotes in kata.json's prose (e.g. 'three conflicts') into curly
// quotes on render. That is a typographic detail of the rendering pipeline, not a
// content change — every other visible character is unaffected — so both sides are
// folded to the same quote style before comparing text or emphasised phrases.
function normalizeText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

type ProseModel = {
  readonly text: string;
  readonly strong: readonly string[];
  readonly em: readonly string[];
  readonly listItems: readonly string[];
};

// Treats <b>/<strong> as the same "strong" concept and <i>/<em> as the same "em"
// concept, since kata.json's source markup uses the former and the rendered markdown
// uses the latter — the brief's own framing of what must match.
function extractModel(html: string): ProseModel {
  const strong = [...html.matchAll(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi)].map((match) =>
    normalizeText(stripTags(match[1] ?? '')),
  );
  const em = [...html.matchAll(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi)].map((match) =>
    normalizeText(stripTags(match[1] ?? '')),
  );
  const listItems = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) =>
    normalizeText(stripTags(match[1] ?? '')),
  );
  const text = normalizeText(stripTags(html));
  return { text, strong, em, listItems };
}

type RenderedSection = { readonly heading: string; readonly body: string };

// Splits the rendered HTML on its <h2> headings — the markdown's "## <heading>"
// sections — into ordered {heading, body} pairs, so each can be matched back to the
// corresponding entry in kata.json's `sections` array.
function splitSections(html: string): readonly RenderedSection[] {
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const sections: RenderedSection[] = [];
  for (let index = 1; index < parts.length; index += 2) {
    const heading = normalizeText(stripTags(parts[index] ?? ''));
    const body = parts[index + 1] ?? '';
    sections.push({ heading, body });
  }
  return sections;
}

const processor = satteri();
const renderer = await processor.createRenderer(markdownConfigDefaults);

const renderedBodyCache = new Map<string, Promise<string>>();

function renderedBody(slug: string): Promise<string> {
  const cached = renderedBodyCache.get(slug);
  if (cached) return cached;

  const promise = (async () => {
    const raw = await readFile(`src/content/kata/${slug}.md`, 'utf8');
    const withoutFrontmatter = raw.replace(/^---[\s\S]*?\n---\n+/, '');
    const result = await renderer.render(withoutFrontmatter);
    return result.code;
  })();

  renderedBodyCache.set(slug, promise);
  return promise;
}

describe('kata prose markdown says the same thing as src/data/kata.json', () => {
  it.each(KATA.map((kata) => kata.slug))('%s: section headings match, in order', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const html = await renderedBody(slug);
    const rendered = splitSections(html);

    expect(rendered.map((section) => section.heading)).toStrictEqual(
      kata.sections.map((section) => normalizeText(section.h)),
    );
  });

  const sectionCases = KATA.flatMap((kata) => kata.sections.map((section) => [kata.slug, section.h] as const));

  it.each(sectionCases)('%s / %s: visible text, emphasis and list items match', async (slug, heading) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const section = kata.sections.find((entry) => entry.h === heading);
    expect(section).toBeDefined();
    if (!section) return;

    const html = await renderedBody(slug);
    const rendered = splitSections(html).find((entry) => entry.heading === normalizeText(heading));
    expect(rendered).toBeDefined();
    if (!rendered) return;

    const expected = extractModel(section.b);
    const actual = extractModel(rendered.body);

    expect(actual.text).toBe(expected.text);
    expect([...actual.strong].sort()).toStrictEqual([...expected.strong].sort());
    expect([...actual.em].sort()).toStrictEqual([...expected.em].sort());
    expect(actual.listItems).toStrictEqual(expected.listItems);
  });
});
