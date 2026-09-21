import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { GRADES, KATA } from '../../src/data';
import { textColorForWhite } from '../../src/data/display';
import { filesUnder } from '../support/files';

// The design system is tokens.css, and this is what keeps it so: a colour that
// is not a token has no business in a rule anywhere else. Two kinds of literal
// are allowed by name. The palettes that mirror DATA — belt, kata and deck
// colours, the quiz level gradients, the home tiles' gradient stops — are
// content transcribed into CSS, not design, and stay literal; the belt and kata
// allowances are derived from the data itself, never a second hand-typed list
// (tests/unit/belt-colours.test.ts says why). And the quiz progress track's 4px
// corner and the practice day dot's 50% are shapes no radius token describes.
//
// Comments are stripped first: a comment may name a colour it explains.

const TOKENS = 'src/styles/tokens.css';

const palette = (entries: ReadonlyArray<{ readonly hex: string; readonly white: boolean }>): readonly string[] => [
  ...new Set(entries.flatMap((entry) => [entry.hex, textColorForWhite(entry.white)])),
];

// Per file, the literals a rule may contain.
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  // base.css is vendored from the design-system repository and carries both
  // data palettes, because the marketing site shows belts too. The allowances
  // are still derived from the data here rather than from the stylesheet, so a
  // vendored file that drifted from grades.json fails in this repository.
  'src/styles/base.css': [...palette(GRADES), ...palette(KATA)],
  'src/styles/flashcards.css': ['#C8102E', '#161616', '#00843D', '#0072CE', '#702F8A', '#8B5A2B', '#9A7D00'],
  'src/styles/quiz.css': ['#C8102E', '#ED8B00', '#d4b100', '#00843D', '#0072CE', '#702F8A', '#8B5A2B', '#161616'],
  'src/pages/index.astro': ['#00843D', '#8B0A20', '#3a3a3a', '#6B3F1D', '#702F8A'],
};

const ALLOWED_RADII: Readonly<Record<string, readonly string[]>> = {
  'src/styles/quiz.css': ['4px'],
  'src/styles/practice.css': ['50%'],
};

const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

// A colour written any way CSS accepts: a hex in value position (not an entity
// or a fragment link), an rgb/hsl/color-mix call, or a named colour after a colon.
const COLOUR = /(?<=[:\s(,])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|color-mix)\([^)]*\)|(?<=:\s*)\b(?:white|black|gr[ae]y|silver|red|green|blue|gold)\b/g;

const coloursIn = (source: string): readonly string[] => [...source.matchAll(COLOUR)].map((match) => match[0]);

// Every radius property, however written and however terminated; a value is a
// literal if any part of it is a length that is not a token. A bare `0` — a
// square corner in a shorthand like `0 var(--radius-control) …` — is not one.
const RADIUS = /border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;}]+)/g;

const radiiIn = (source: string): readonly string[] =>
  [...source.matchAll(RADIUS)]
    .map((match) => match[1]?.trim() ?? '')
    .filter((value) => value.split(/\s+/).some((part) => part !== '0' && /^[\d.]/.test(part)));

type Styled = { readonly path: string; readonly source: string };

const styledFiles: readonly Styled[] = await Promise.all(
  (await filesUnder('src'))
    .filter((file) => file.endsWith('.css') || file.endsWith('.astro'))
    .map(async (file) => ({
      path: `src/${file}`,
      source: stripComments(await readFile(join('src', file), 'utf8')),
    })),
);

const permitted = (table: Readonly<Record<string, readonly string[]>>, path: string): ReadonlySet<string> =>
  new Set(table[path] ?? []);

const sourceOf = (path: string): string => styledFiles.find((file) => file.path === path)?.source ?? '';

const staleAllowances = (
  table: Readonly<Record<string, readonly string[]>>,
  found: (source: string) => readonly string[],
): readonly string[] =>
  Object.entries(table).flatMap(([path, literals]) => {
    const present = new Set(found(sourceOf(path)));
    return literals.filter((literal) => !present.has(literal)).map((literal) => `${path} no longer uses ${literal}`);
  });

describe('every colour in a rule is a token', () => {
  it('scans the stylesheets and the routes and components that carry styles', () => {
    const paths = styledFiles.map((file) => file.path);
    expect(paths).toContain('src/styles/app.css');
    expect(paths).toContain('src/pages/index.astro');
    expect(paths).toContain('src/components/KataGuide.astro');
  });

  it('finds no colour literal outside tokens.css that is not a data palette', () => {
    const offences = styledFiles
      .filter((file) => file.path !== TOKENS)
      .flatMap((file) => {
        const allowed = permitted(ALLOWED, file.path);
        return [...new Set(coloursIn(file.source))]
          .filter((literal) => !allowed.has(literal))
          .map((literal) => `${file.path} uses ${literal}`);
      });
    expect(offences).toEqual([]);
  });

  it('allows nothing that is no longer there — a stale allowance is a standing permission', () => {
    expect(staleAllowances(ALLOWED, coloursIn)).toEqual([]);
  });
});

describe('every radius in a rule is a token', () => {
  it('finds no radius literal that is not a named shape', () => {
    const offences = styledFiles
      .filter((file) => file.path !== TOKENS)
      .flatMap((file) => {
        const allowed = permitted(ALLOWED_RADII, file.path);
        return [...new Set(radiiIn(file.source))]
          .filter((literal) => !allowed.has(literal))
          .map((literal) => `${file.path} uses border-radius: ${literal}`);
      });
    expect(offences).toEqual([]);
  });

  it('allows no shape that is no longer there', () => {
    expect(staleAllowances(ALLOWED_RADII, radiiIn)).toEqual([]);
  });
});
