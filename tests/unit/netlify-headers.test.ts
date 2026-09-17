import { describe, expect, it } from 'vitest';

import { headerRules } from '../support/netlify-headers';

// netlify.toml is what Netlify serves from, so the tests that pin the deployed
// headers have to read the same file rather than a copy of its values. Node has
// no TOML parser and a dependency for three keys is not worth owning, so this
// reads exactly the subset the file uses: `[[headers]]` tables whose values are
// one-line basic strings. Anything else must fail loudly rather than parse into
// something Netlify would not serve — see the multi-line case below.

const rule = (body: string): string => `[[headers]]\n  for = "/*"\n  [headers.values]\n${body}\n`;

describe('reading [[headers]] rules out of netlify.toml', () => {
  it('returns each rule with its path and every one-line header value', () => {
    const toml = `${rule('    X-Frame-Options = "DENY"\n    Referrer-Policy = "no-referrer"')}[[headers]]\n  for = "/docs/*"\n  [headers.values]\n    Cache-Control = "public, max-age=60"\n`;

    expect(headerRules(toml)).toEqual([
      { for: '/*', values: { 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } },
      { for: '/docs/*', values: { 'Cache-Control': 'public, max-age=60' } },
    ]);
  });

  it('keeps single quotes and semicolons inside a value intact', () => {
    const toml = rule(`    Content-Security-Policy = "default-src 'none'; script-src 'self' 'sha256-abc='"`);

    expect(headerRules(toml)[0]?.values['Content-Security-Policy']).toBe(
      "default-src 'none'; script-src 'self' 'sha256-abc='",
    );
  });

  it('ignores redirects and build tables, and comments', () => {
    const toml = `[build]\n  publish = "dist"\n\n[[redirects]]\n  from = "/a"\n  to = "/b"\n\n# A comment = "not a header"\n${rule('    X-Content-Type-Options = "nosniff"')}`;

    expect(headerRules(toml)).toEqual([{ for: '/*', values: { 'X-Content-Type-Options': 'nosniff' } }]);
  });

  it('returns no rules when the file has no headers table', () => {
    expect(headerRules('[build]\n  publish = "dist"\n')).toEqual([]);
  });

  // Netlify joins the lines of a multi-line TOML string with commas, because it
  // treats them as multiple values of one header. A comma in a CSP separates
  // POLICIES, so a multi-line policy ships as several broken ones. Refusing it
  // here is what stops that reaching production behind a passing test.
  it('refuses a multi-line string value, naming the header', () => {
    const toml = rule(`    Content-Security-Policy = '''\n      default-src 'none';\n      script-src 'self'\n    '''`);

    expect(() => headerRules(toml)).toThrow(/Content-Security-Policy.*one line/);
  });
});
