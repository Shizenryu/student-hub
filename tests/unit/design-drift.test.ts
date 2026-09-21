import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { filesUnder } from '../support/files';

// The design system is tokens.css, and this is what keeps it so: a colour that
// is not a token has no business in a rule anywhere else. Two kinds of literal
// are allowed by name. The palettes that mirror DATA — belt, kata and deck
// colours, the quiz level gradients, the home tiles' gradient stops — are
// content transcribed into CSS, not design, and stay literal. And the quiz
// progress track's 4px corner and the practice day dot's 50% are shapes no
// radius token describes.
//
// Comments are stripped first: a comment may name a colour it explains.

const TOKENS = 'src/styles/tokens.css';

// Per file, the literals a rule may contain.
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  'src/styles/belts.css': [
    '#C8102E', '#fff', '#ED8B00', '#1A1A1A', '#E3BC00', '#00843D', '#0072CE', '#702F8A', '#8B5A2B', '#7A4A21', '#6B3F1D',
  ],
  'src/styles/kata.css': ['#C8102E', '#fff', '#161616', '#9A7D00', '#0072CE'],
  'src/styles/flashcards.css': ['#C8102E', '#161616', '#00843D', '#0072CE', '#702F8A', '#8B5A2B', '#9A7D00'],
  'src/styles/quiz.css': ['#C8102E', '#ED8B00', '#d4b100', '#00843D', '#0072CE', '#702F8A', '#8B5A2B', '#161616'],
  'src/pages/index.astro': ['#00843D', '#8B0A20', '#3a3a3a', '#6B3F1D'],
};

const ALLOWED_RADII: Readonly<Record<string, readonly string[]>> = {
  'src/styles/quiz.css': ['4px'],
  'src/styles/practice.css': ['50%'],
};

// What slice 9 is removing, commit by commit. Each entry is a literal that a
// rule still carries today; the list ends empty and is then deleted. Listed
// here rather than allowed, so that nothing new can hide among them: a literal
// not in tokens.css, not allowed, and not on this list fails the build.
const DRIFT_STILL_TO_REMOVE: Readonly<Record<string, readonly string[]>> = {
  'src/components/KataGuide.astro': ['#333', '#555'],
  'src/pages/404.astro': ['#faf7f2', '#222', '#161616', '#C8102E', '#555', '#999'],
  'src/pages/index.astro': ['#555', '#fff', '#f4efe7', 'rgba(0, 0, 0, .06)', 'rgba(0, 0, 0, .10)', 'rgba(0, 0, 0, .07)'],
  'src/styles/app.css': ['#666'],
  'src/styles/flashcards.css': ['#fff', '#f5f1ea', '#777', 'rgba(0, 0, 0, .10)'],
  'src/styles/practice.css': ['#e5e0d8', '#e9f7ef', '#fff', '#777', '#555'],
  'src/styles/quiz.css': ['#fff', '#eee', '#e5e0d8', '#e9f7ef', '#fdecea', '#b07d00', '#555'],
};

const DRIFT_RADII_STILL_TO_REMOVE: Readonly<Record<string, readonly string[]>> = {
  'src/components/BeltGuide.astro': ['0 10px 10px 0'],
  'src/components/KataGuide.astro': ['0 10px 10px 0'],
  'src/styles/practice.css': ['12px'],
  'src/styles/quiz.css': ['0 8px 8px 0'],
};

const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const coloursIn = (source: string): readonly string[] =>
  [...source.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((match) => match[0]);

const radiiIn = (source: string): readonly string[] =>
  [...source.matchAll(/border-radius:\s*([^;]+);/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter((value) => !value.includes('var('));

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

describe('every colour in a rule is a token', () => {
  it('scans the stylesheets and the routes and components that carry styles', () => {
    const paths = styledFiles.map((file) => file.path);
    expect(paths).toContain('src/styles/app.css');
    expect(paths).toContain('src/pages/index.astro');
    expect(paths).toContain('src/components/KataGuide.astro');
  });

  it('finds no colour literal outside tokens.css that is not a data palette or still listed for removal', () => {
    const offences = styledFiles
      .filter((file) => file.path !== TOKENS)
      .flatMap((file) => {
        const allowed = permitted(ALLOWED, file.path);
        const pending = permitted(DRIFT_STILL_TO_REMOVE, file.path);
        return [...new Set(coloursIn(file.source))]
          .filter((literal) => !allowed.has(literal) && !pending.has(literal))
          .map((literal) => `${file.path} uses ${literal}`);
      });
    expect(offences).toEqual([]);
  });

  it('lists nothing for removal that has already been removed', () => {
    const stale = Object.entries(DRIFT_STILL_TO_REMOVE).flatMap(([path, literals]) => {
      const present = new Set(coloursIn(styledFiles.find((file) => file.path === path)?.source ?? ''));
      return literals.filter((literal) => !present.has(literal)).map((literal) => `${path} no longer uses ${literal}`);
    });
    expect(stale).toEqual([]);
  });
});

describe('every radius in a rule is a token', () => {
  it('finds no radius literal that is not a named shape or still listed for removal', () => {
    const offences = styledFiles
      .filter((file) => file.path !== TOKENS)
      .flatMap((file) => {
        const allowed = permitted(ALLOWED_RADII, file.path);
        const pending = permitted(DRIFT_RADII_STILL_TO_REMOVE, file.path);
        return [...new Set(radiiIn(file.source))]
          .filter((literal) => !allowed.has(literal) && !pending.has(literal))
          .map((literal) => `${file.path} uses border-radius: ${literal}`);
      });
    expect(offences).toEqual([]);
  });
});
