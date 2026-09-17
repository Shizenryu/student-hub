import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { filesUnder } from '../support/files';

// Nothing on the site turns an HTML string into DOM. JSX escapes, Astro
// escapes, and kata prose is rendered from markdown at build time — so the one
// way a raw-HTML path could return is somebody reaching for one of the sinks
// below. The Content-Security-Policy would contain the damage; this stops it
// being written. There is no linter in this repo, and one rule does not
// justify one.
//
// Matched as code, not as words: `.innerHTML =` is a sink, a comment that
// mentions innerHTML is not.

const SCANNED: readonly { readonly dir: string; readonly extensions: readonly string[] }[] = [
  { dir: 'src', extensions: ['.astro', '.ts', '.tsx', '.js', '.mjs'] },
  { dir: 'public/assets', extensions: ['.js'] },
];

const RAW_HTML_SINKS: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: 'innerHTML', pattern: /\.innerHTML\s*[=+]/ },
  { name: 'outerHTML', pattern: /\.outerHTML\s*[=+]/ },
  { name: 'insertAdjacentHTML', pattern: /\.insertAdjacentHTML\s*\(/ },
  { name: 'setHTMLUnsafe', pattern: /\.setHTMLUnsafe\s*\(/ },
  { name: 'parseHTMLUnsafe', pattern: /\.parseHTMLUnsafe\s*\(/ },
  { name: 'createContextualFragment', pattern: /\.createContextualFragment\s*\(/ },
  { name: 'document.write', pattern: /\bdocument\.write(ln)?\s*\(/ },
  { name: 'srcdoc', pattern: /\bsrcdoc\s*=/ },
  { name: 'set:html', pattern: /\bset:html\s*=/ },
  { name: 'dangerouslySetInnerHTML', pattern: /\bdangerouslySetInnerHTML\s*=/ },
];

type SourceFile = { readonly path: string; readonly lines: readonly string[] };

const sourceFiles: readonly SourceFile[] = (
  await Promise.all(
    SCANNED.map(async ({ dir, extensions }) =>
      Promise.all(
        (await filesUnder(dir))
          .filter((file) => extensions.some((extension) => file.endsWith(extension)))
          .map(async (file) => ({
            path: `${dir}/${file}`,
            lines: (await readFile(join(dir, file), 'utf8')).split('\n'),
          })),
      ),
    ),
  )
).flat();

describe('the code that reaches the browser', () => {
  it('is scanned in full — every source file and every client script', () => {
    const paths = sourceFiles.map((file) => file.path);
    expect(paths).toContain('src/components/Quiz.tsx');
    expect(paths).toContain('src/layouts/PageShell.astro');
    expect(paths).toContain('public/assets/home.js');
  });

  it('never turns an HTML string into DOM', () => {
    const offences = sourceFiles.flatMap((file) =>
      file.lines.flatMap((line, index) =>
        RAW_HTML_SINKS.filter((sink) => sink.pattern.test(line)).map(
          (sink) => `${file.path}:${index + 1} uses ${sink.name}`,
        ),
      ),
    );
    expect(offences).toEqual([]);
  });
});
