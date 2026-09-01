import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { KATA } from '../../src/data';
import { textColorForWhite } from '../../src/data/display';

const KATA_CSS_PATH = 'src/styles/kata.css';

// kata.json is the source of truth for kata colour. This reads the actual
// stylesheet content and compares it against KATA itself — never against a
// second hardcoded list — so kata.css cannot silently drift from the content
// it transcribes. See tests/unit/belt-colours.test.ts, which does the same
// for belts.css.
describe('kata.css carries every kata\'s exact colour from kata.json', () => {
  it.each(KATA.map((kata) => kata.slug))('%s has a matching rule', async (slug) => {
    const kata = KATA.find((entry) => entry.slug === slug);
    expect(kata).toBeDefined();
    if (!kata) return;

    const css = await readFile(KATA_CSS_PATH, 'utf8');
    const expectedTextColor = textColorForWhite(kata.white);
    const rulePattern = new RegExp(`\\.kata-colour\\[data-slug="${slug}"\\]\\s*\\{[^}]*\\}`);
    const match = rulePattern.exec(css);

    expect(match, `no rule for data-slug="${slug}" in ${KATA_CSS_PATH}`).not.toBeNull();
    const rule = match?.[0] ?? '';

    expect(rule, `${slug}'s rule does not set background: ${kata.hex}`).toContain(`background: ${kata.hex};`);
    expect(rule, `${slug}'s rule does not set color: ${expectedTextColor}`).toContain(
      `color: ${expectedTextColor};`,
    );
  });
});

// Every kata in kata.json today is white:true, so the suite above alone can't
// tell a genuine derivation from one that just hardcodes #fff for everything.
// This pins the derivation itself, including the white:false branch no real
// kata currently exercises.
describe('textColorForWhite', () => {
  it('maps white to #fff', () => {
    expect(textColorForWhite(true)).toBe('#fff');
  });

  it('maps not-white to #1A1A1A', () => {
    expect(textColorForWhite(false)).toBe('#1A1A1A');
  });
});
