import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKENS_PATH = 'src/styles/tokens.css';
const SRC_DIR = 'src';
const SCANNED_EXTENSIONS = ['.css', '.astro'];

// Transcribed from the hand-written pages before migration. If a value here has to
// change, the rendered site changed too — which during this slice means a bug.
const REQUIRED_TOKENS: ReadonlyArray<readonly [name: string, value: string]> = [
  ['--red', '#C8102E'],
  ['--dark', '#161616'],
  ['--paper', '#faf7f2'],
  ['--gold', '#9A7D00'],
  ['--track-adult', '#0072CE'],
  ['--track-junior', '#ED8B00'],
  ['--rule', '#f0ebe2'],
  ['--surface-warm', '#fbf7f1'],
  ['--radius-card', '14px'],
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
