import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { GRADES } from '../../src/data';

const BELTS_CSS_PATH = 'src/styles/belts.css';

// grades.json is the source of truth for belt colour. This reads the actual
// stylesheet content and compares it against GRADES itself — never against a
// second hardcoded list — so belts.css cannot silently drift from the data it
// transcribes. See CLAUDE.md: comparing one literal against another proves
// nothing, and this project has shipped that mistake before.
describe('belts.css carries every belt\'s exact colour from grades.json', () => {
  it.each(GRADES.map((grade) => grade.slug))('%s has a matching rule', async (slug) => {
    const grade = GRADES.find((entry) => entry.slug === slug);
    expect(grade).toBeDefined();
    if (!grade) return;

    const css = await readFile(BELTS_CSS_PATH, 'utf8');
    const expectedTextColor = grade.white ? '#fff' : '#1A1A1A';
    const rulePattern = new RegExp(
      `\\.belt-colour\\[data-slug="${slug}"\\]\\s*\\{[^}]*\\}`,
    );
    const match = rulePattern.exec(css);

    expect(match, `no rule for data-slug="${slug}" in ${BELTS_CSS_PATH}`).not.toBeNull();
    const rule = match?.[0] ?? '';

    expect(rule, `${slug}'s rule does not set background: ${grade.hex}`).toContain(
      `background: ${grade.hex};`,
    );
    expect(rule, `${slug}'s rule does not set color: ${expectedTextColor}`).toContain(
      `color: ${expectedTextColor};`,
    );
  });
});
