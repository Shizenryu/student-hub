// Reads the `[[headers]]` rules out of netlify.toml, the file Netlify serves
// from. Two suites need them: tests/build/security-headers.test.ts pins what the
// file says against the built pages, and tests/deploy/csp-violations.test.ts
// serves the built pages WITH those headers to a real browser. Both must read
// the real file, not a copy of its values.
//
// This is not a TOML parser. It reads exactly the subset the file uses — a
// `for` path and one-line basic-string values with `\"` and `\\` escapes — and
// refuses anything else by name. An HTTP header value cannot contain a newline,
// and Netlify's own parser only trims a value and normalises whitespace around
// commas, so a multi-line TOML string would reach the edge with newlines inside
// it and whatever happened next would happen in production, not here. A value
// written any other way must fail in this file first.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

export type HeaderRule = {
  readonly for: string;
  readonly values: Readonly<Record<string, string>>;
};

const HEADERS_TABLE = /^\[\[headers\]\]\s*$/m;
const FOR_LINE = /^\s*for\s*=\s*"([^"]*)"\s*$/m;
const HEADER_LINE = /^\s*([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.*?)\s*$/gm;
const ONE_LINE_BASIC_STRING = /^"((?:[^"\\]|\\["\\])*)"$/;

const unescape = (raw: string): string => raw.replace(/\\(["\\])/g, '$1');

function valuesOf(block: string): Readonly<Record<string, string>> {
  const afterValuesTable = block.split(/^\s*\[headers\.values\]\s*$/m)[1] ?? '';
  return Object.fromEntries(
    [...afterValuesTable.matchAll(HEADER_LINE)].map(([, name, raw]) => {
      const value = ONE_LINE_BASIC_STRING.exec(raw ?? '')?.[1];
      if (name === undefined || value === undefined) {
        throw new Error(
          `netlify.toml header ${name ?? '?'} must be written on one line as a "basic string" — ` +
            `an HTTP header value cannot contain a newline, and this reader supports no other TOML string form`,
        );
      }
      return [name, unescape(value)];
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

// The rule for one path, or a clear failure naming the file — every consumer
// wants exactly this, and "undefined" from a missing rule would surface as a
// confusing assertion three calls later.
export function rule(rules: readonly HeaderRule[], path: string): Readonly<Record<string, string>> {
  const found = rules.find((candidate) => candidate.for === path);
  if (!found) throw new Error(`netlify.toml has no [[headers]] rule for "${path}"`);
  return found.values;
}
