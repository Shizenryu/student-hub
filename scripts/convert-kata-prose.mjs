// Converts the kata prose in src/data/kata.json — today trusted HTML strings — into
// markdown files under src/content/kata/. Mechanical on purpose: nobody retypes
// martial prose, and the conversion rules below are the whole contract.
//
// Conversion rules, and only these:
//   <b>x</b>              -> **x**
//   <i>x</i>              -> *x*
//   <p>...</p>            -> the text, blocks separated by a blank line
//   <ul><li>a</li>...</ul> -> "- a" / "- b" / ... on their own lines
//   a section with no block tags -> a single paragraph
//   &amp;                 -> & (the only HTML entity present in the source data)
//   anything else (an unrecognised tag or entity) -> throw, naming the kata,
//     the section heading and the offending markup. Never silently stripped.
//
// This script is the record of how the migration was performed, same as
// scripts/extract-legacy-data.mjs was for the earlier JSON migration.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SOURCE = 'src/data/kata.json';
const OUT_DIR = 'src/content/kata';

function decodeEntities(text, context) {
  const decoded = text.replaceAll('&amp;', '&');
  const strayEntity = decoded.match(/&[a-zA-Z#][a-zA-Z0-9#]*;/);
  if (strayEntity) {
    throw new Error(
      `Unknown HTML entity ${strayEntity[0]} in kata "${context.kata}", section "${context.heading}"`,
    );
  }
  return decoded;
}

function convertInline(text, context) {
  const withEmphasis = text.replace(/<(b|i)>([\s\S]*?)<\/\1>/g, (_match, tag, inner) => {
    const marker = tag === 'b' ? '**' : '*';
    return `${marker}${inner}${marker}`;
  });

  const strayTag = withEmphasis.match(/<[^>]+>/);
  if (strayTag) {
    throw new Error(`Unknown tag ${strayTag[0]} in kata "${context.kata}", section "${context.heading}"`);
  }

  return decodeEntities(withEmphasis, context);
}

function convertList(content, context) {
  const liPattern = () => /<li>([\s\S]*?)<\/li>/g;

  const items = [...content.matchAll(liPattern())].map((match) => convertInline(match[1], context));

  const leftover = content.replace(liPattern(), '').trim();
  if (leftover.length > 0) {
    throw new Error(
      `Unrecognised markup inside <ul> in kata "${context.kata}", section "${context.heading}": ${leftover}`,
    );
  }
  if (items.length === 0) {
    throw new Error(`Empty <ul> in kata "${context.kata}", section "${context.heading}"`);
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function convertBody(raw, context) {
  const hasBlockTags = /<p>|<ul>/.test(raw);
  if (!hasBlockTags) {
    return convertInline(raw, context);
  }

  const blockPattern = () => /<p>([\s\S]*?)<\/p>|<ul>([\s\S]*?)<\/ul>/g;

  const blocks = [...raw.matchAll(blockPattern())].map((match) =>
    match[1] !== undefined ? { type: 'p', content: match[1] } : { type: 'ul', content: match[2] },
  );

  const leftover = raw.replace(blockPattern(), '').trim();
  if (leftover.length > 0) {
    const strayTag = leftover.match(/<[^>]+>/);
    const what = strayTag ? strayTag[0] : leftover;
    throw new Error(`Unknown markup ${what} in kata "${context.kata}", section "${context.heading}"`);
  }

  return blocks
    .map((block) => (block.type === 'p' ? convertInline(block.content, context) : convertList(block.content, context)))
    .join('\n\n');
}

function buildFrontmatter(kata) {
  const lines = [
    `name: ${JSON.stringify(kata.name)}`,
    `translation: ${JSON.stringify(kata.translation)}`,
    `hex: ${JSON.stringify(kata.hex)}`,
    `white: ${JSON.stringify(kata.white)}`,
    `match: ${JSON.stringify(kata.match)}`,
  ];
  if (kata.quote) {
    lines.push('quote:');
    lines.push(`  text: ${JSON.stringify(kata.quote.text)}`);
    lines.push(`  src: ${JSON.stringify(kata.quote.src)}`);
  }
  return lines.join('\n');
}

const source = await readFile(SOURCE, 'utf8');
const kataList = JSON.parse(source);

await mkdir(OUT_DIR, { recursive: true });

for (const kata of kataList) {
  const body = kata.sections
    .map((section) => {
      const converted = convertBody(section.b, { kata: kata.name, heading: section.h });
      return `## ${section.h}\n\n${converted}`;
    })
    .join('\n\n');

  const content = `---\n${buildFrontmatter(kata)}\n---\n\n${body}\n`;
  const file = `${OUT_DIR}/${kata.slug}.md`;
  await writeFile(file, content, 'utf8');
  console.log(`wrote ${file}`);
}
