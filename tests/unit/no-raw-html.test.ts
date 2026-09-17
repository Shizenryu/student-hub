import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Nothing on the site assigns an HTML string to the DOM. JSX escapes, Astro
// escapes, and kata prose is rendered from markdown at build time — so the one
// way a raw-HTML path could return is somebody reaching for one of these. The
// Content-Security-Policy would still contain the damage; this stops it being
// written. There is no linter in this repo, and one rule does not justify one.

const SCANNED: readonly { readonly dir: string; readonly extensions: readonly string[] }[] = [
  { dir: 'src', extensions: ['.astro', '.ts', '.tsx'] },
  { dir: 'public/assets', extensions: ['.js'] },
];

const RAW_HTML_SINKS: readonly string[] = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'set:html',
  'dangerouslySetInnerHTML',
];

type SourceFile = { readonly path: string; readonly lines: readonly string[] };

async function sourceFiles(): Promise<readonly SourceFile[]> {
  const found = await Promise.all(
    SCANNED.map(async ({ dir, extensions }) => {
      const entries = await readdir(dir, { withFileTypes: true, recursive: true });
      return Promise.all(
        entries
          .filter((entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension)))
          .map((entry) => join(entry.parentPath, entry.name))
          .map(async (path) => ({
            path: path.split(sep).join('/'),
            lines: (await readFile(path, 'utf8')).split('\n'),
          })),
      );
    }),
  );
  return found.flat();
}

describe('the code that reaches the browser', () => {
  it('scans every source file and client script', async () => {
    const paths = (await sourceFiles()).map((file) => file.path);
    expect(paths).toContain('src/components/Quiz.tsx');
    expect(paths).toContain('src/layouts/PageShell.astro');
    expect(paths).toContain('public/assets/home.js');
  });

  it('never assigns an HTML string to the DOM', async () => {
    const offences = (await sourceFiles()).flatMap((file) =>
      file.lines.flatMap((line, index) =>
        RAW_HTML_SINKS.filter((sink) => line.includes(sink)).map(
          (sink) => `${relative('.', file.path).split(sep).join('/')}:${index + 1} uses ${sink}`,
        ),
      ),
    );
    expect(offences).toEqual([]);
  });
});
