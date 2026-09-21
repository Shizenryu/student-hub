import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKENS_PATH = 'src/styles/tokens.css';
const SRC_DIR = 'src';
const SCANNED_EXTENSIONS = ['.css', '.astro'];

// The design system, whole: every token and its value, as slice 9 settled them.
// A value here changing means the site looks different — which is fine, but it is
// a decision to show on a before/after sheet, not a side effect to discover.
const REQUIRED_TOKENS: ReadonlyArray<readonly [name: string, value: string]> = [
  ['--red', '#C8102E'],
  ['--dark', '#161616'],
  ['--paper', '#faf7f2'],
  ['--gold', '#9A7D00'],
  ['--good', '#1e8a4c'],
  ['--bad', '#c0392b'],
  ['--ink', '#222'],
  ['--ink-soft', '#444'],
  ['--muted', '#888'],
  ['--muted-light', '#999'],
  ['--faint', '#bbb'],
  ['--rule', '#f0ebe2'],
  ['--surface', '#fff'],
  ['--surface-warm', '#fbf7f1'],
  ['--on-colour', '#fff'],
  ['--line', '#e5e0d8'],
  ['--good-tint', '#e9f7ef'],
  ['--bad-tint', '#fdecea'],
  ['--track-adult', '#0072CE'],
  ['--track-junior', '#ED8B00'],
  ['--radius-card', '14px'],
  ['--radius-control', '10px'],
  ['--radius-banner', '12px'],
  ['--radius-tag', '6px'],
  ['--shadow-card', '0 2px 10px rgba(0, 0, 0, .08)'],
  ['--app-max', '520px'],
];

describe('design tokens match the site as built by hand', () => {
  it.each(REQUIRED_TOKENS)('defines %s as %s', async (name, value) => {
    const css = await readFile(TOKENS_PATH, 'utf8');
    expect(css).toContain(`${name}: ${value};`);
  });

  it('defines every token the stylesheets and components reference', async () => {
    const tokens = await readFile(TOKENS_PATH, 'utf8');

    const names = (source: string, pattern: RegExp): string[] =>
      [...source.matchAll(pattern)]
        .map((match) => match[1])
        .filter((name): name is string => name !== undefined);

    const defined = new Set(names(tokens, /^\s*(--[\w-]+):/gm));

    const entries = await readdir(SRC_DIR, { withFileTypes: true, recursive: true });
    const scannedFiles = entries
      .filter((entry) => entry.isFile() && SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext)))
      .map((entry) => join(entry.parentPath, entry.name));

    for (const file of scannedFiles) {
      const source = await readFile(file, 'utf8');
      const used = names(source, /var\((--[\w-]+)/g);
      const relativePath = relative(SRC_DIR, file).split(sep).join('/');

      for (const name of used) {
        expect(defined, `${relativePath} uses ${name}, which tokens.css does not define`).toContain(name);
      }
    }
  });
});
