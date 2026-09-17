// Reads the `[[headers]]` rules out of netlify.toml, the file Netlify serves
// from. Two suites need them: tests/build/security-headers.test.ts pins what the
// file says against the built pages, and tests/deploy/csp-violations.test.ts
// serves the built pages WITH those headers to a real browser. Both must read
// the real file, not a copy of its values.
//
// This is not a TOML parser. It reads exactly the subset the file uses — a
// `for` path and one-line basic-string values — and refuses everything else,
// because Netlify turns a multi-line string into a comma-joined header and a
// comma splits a Content-Security-Policy into several policies. A value written
// any other way must fail here, before it can fail in production.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

export type HeaderRule = {
  readonly for: string;
  readonly values: Readonly<Record<string, string>>;
};

const HEADERS_TABLE = /^\[\[headers\]\]\s*$/m;
const FOR_LINE = /^\s*for\s*=\s*"([^"]*)"\s*$/m;
const HEADER_LINE = /^\s*([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.*?)\s*$/gm;
const ONE_LINE_VALUE = /^"([^"]*)"$/;

function valuesOf(block: string): Readonly<Record<string, string>> {
  const afterValuesTable = block.split(/^\s*\[headers\.values\]\s*$/m)[1] ?? '';
  return Object.fromEntries(
    [...afterValuesTable.matchAll(HEADER_LINE)].map(([, name, raw]) => {
      const value = ONE_LINE_VALUE.exec(raw ?? '')?.[1];
      if (name === undefined || value === undefined) {
        throw new Error(
          `netlify.toml header ${name ?? '?'} must be written on one line as a "basic string": Netlify joins the lines of a ` +
            `multi-line string with commas, and a comma splits a Content-Security-Policy into separate policies`,
        );
      }
      return [name, value];
    }),
  );
}

export function headerRules(toml: string): readonly HeaderRule[] {
  const withoutComments = toml.replace(/^\s*#.*$/gm, '');
  return withoutComments
    .split(HEADERS_TABLE)
    .slice(1)
    .map((block) => block.split(/^\[\[/m)[0] ?? '')
    .map((block) => ({ for: FOR_LINE.exec(block)?.[1] ?? '', values: valuesOf(block) }));
}
