import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { markdownConfigDefaults } from '@astrojs/internal-helpers/markdown';
import { satteri } from '@astrojs/markdown-satteri';

import { KATA, type Kata } from './index';

// Shared prose model for the kata content migration: turns a chunk of HTML
// (either kata.json's trusted-HTML `sections[].b` strings, or a markdown
// renderer's output) into the same semantic shape, so two renderers of the
// same content can be compared honestly. Used by:
//   - tests/build/kata-routes.test.ts, proving the BUILT page's emphasis and
//     block structure match kata.json
//   - tests/unit/kata-prose-parity.test.ts, proving the markdown source in
//     src/content/kata/ says the same thing as kata.json
//   - assertKataProseParity() below, the build-time twin of the parity test,
//     wired into astro.config.mjs so prose drift fails the deploy, not just
//     the test suite Netlify does not run
//
// The model is an ORDERED sequence of blocks, each an ORDERED sequence of
// runs — never a sorted set. That is what lets a phrase that is emphasised
// correctly but in the wrong sentence, the wrong block, or the wrong section
// fail a comparison, and what lets two identical emphasised phrases in one
// block stay distinguishable by position instead of collapsing into one set
// entry.

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

export function visibleText(html: string): string {
  return collapseWhitespace(decodeHtmlEntities(stripTags(html)));
}

export type ProseRunKind = 'text' | 'strong' | 'em';
export type ProseRun = { readonly kind: ProseRunKind; readonly text: string };
export type ProseBlockTag = 'p' | 'li';
export type ProseBlock = { readonly tag: ProseBlockTag; readonly runs: readonly ProseRun[] };
export type ProseSection = { readonly heading: string; readonly blocks: readonly ProseBlock[] };

const EMPHASIS_PATTERN = /<(b|strong|i|em)\b[^>]*>([\s\S]*?)<\/\1>/gi;

// Splits one block's inner HTML into an ORDERED sequence of plain-text and
// emphasis runs. <b>/<strong> both count as "strong" and <i>/<em> both count
// as "em" — kata.json's source markup uses the former, rendered markdown the
// latter.
export function parseRuns(html: string): readonly ProseRun[] {
  const runs: ProseRun[] = [];
  let lastIndex = 0;
  EMPHASIS_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMPHASIS_PATTERN.exec(html))) {
    const [whole, tag, inner] = match;
    if (match.index > lastIndex) {
      const plain = visibleText(html.slice(lastIndex, match.index));
      if (plain !== '') runs.push({ kind: 'text', text: plain });
    }
    const kind: ProseRunKind = tag !== undefined && /^(b|strong)$/i.test(tag) ? 'strong' : 'em';
    runs.push({ kind, text: visibleText(inner ?? '') });
    lastIndex = match.index + whole.length;
  }
  const tail = visibleText(html.slice(lastIndex));
  if (tail !== '') runs.push({ kind: 'text', text: tail });
  return runs;
}

const LIST_ITEM_PATTERN = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const BLOCK_PATTERN = /<p\b[^>]*>([\s\S]*?)<\/p>|<ul\b[^>]*>([\s\S]*?)<\/ul>/gi;

// Splits one section's body HTML into an ORDERED sequence of <p>/<li> blocks.
// kata.json allows a section body with no block tags at all (bare inline
// text — see its own schema comment); that is treated as a single implicit
// paragraph, the same way a markdown renderer wraps a bare line in <p>, so
// the two sides compare structurally equal rather than differing only by an
// absent wrapper tag.
export function parseProseBlocks(html: string): readonly ProseBlock[] {
  const blocks: ProseBlock[] = [];
  BLOCK_PATTERN.lastIndex = 0;
  let sawBlock = false;
  let match: RegExpExecArray | null;
  while ((match = BLOCK_PATTERN.exec(html))) {
    sawBlock = true;
    const [, paragraph, list] = match;
    if (paragraph !== undefined) {
      blocks.push({ tag: 'p', runs: parseRuns(paragraph) });
      continue;
    }
    LIST_ITEM_PATTERN.lastIndex = 0;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = LIST_ITEM_PATTERN.exec(list ?? ''))) {
      blocks.push({ tag: 'li', runs: parseRuns(liMatch[1] ?? '') });
    }
  }
  if (!sawBlock) blocks.push({ tag: 'p', runs: parseRuns(html) });
  return blocks;
}

// Splits a flowing document's HTML — kata-prose-parity's locally-rendered
// markdown, or the built page's `.prose` fragment — on its <h2> headings
// into ordered {heading, blocks} sections, so each can be matched back to
// the corresponding entry in kata.json's `sections` array by position.
export function splitIntoSections(html: string): readonly ProseSection[] {
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const sections: ProseSection[] = [];
  for (let index = 1; index < parts.length; index += 2) {
    const heading = visibleText(parts[index] ?? '');
    const body = parts[index + 1] ?? '';
    sections.push({ heading, blocks: parseProseBlocks(body) });
  }
  return sections;
}

// The ordered section model kata.json itself describes, for comparison
// against whatever a renderer produced.
export function kataSectionsFromJson(kata: Kata): readonly ProseSection[] {
  return kata.sections.map((section) => ({
    heading: visibleText(section.h),
    blocks: parseProseBlocks(section.b),
  }));
}

const KATA_CONTENT_DIR = 'src/content/kata';

async function renderKataMarkdown(slug: string): Promise<string> {
  const raw = await readFile(`${KATA_CONTENT_DIR}/${slug}.md`, 'utf8');
  const withoutFrontmatter = raw.replace(/^---[\s\S]*?\n---\n+/, '');
  // Same processor configuration as astro.config.mjs's real build — smart
  // punctuation off, so this check proves the shipped pipeline's prose, not
  // a differently-configured stand-in for it.
  const processor = satteri({ features: { smartPunctuation: false } });
  const renderer = await processor.createRenderer(markdownConfigDefaults);
  const result = await renderer.render(withoutFrontmatter);
  return result.code;
}

// Build-time twin of tests/unit/kata-prose-parity.test.ts: proves
// src/content/kata/<slug>.md still renders to the same sections kata.json
// describes, using the site's real markdown configuration, so a prose edit
// made in only one of the two authored copies fails the deploy — not just
// the test suite Netlify does not run. See CLAUDE.md's content rules.
export async function assertKataProseParity(kata: readonly Kata[] = KATA): Promise<void> {
  const problems: string[] = [];

  for (const entry of kata) {
    const html = await renderKataMarkdown(entry.slug);
    const rendered = splitIntoSections(html);
    const expected = kataSectionsFromJson(entry);
    if (!isDeepStrictEqual(rendered, expected)) {
      problems.push(`kata "${entry.slug}" markdown (src/content/kata/${entry.slug}.md) no longer matches kata.json`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Kata prose parity failed:\n  - ${problems.join('\n  - ')}`);
  }
}
