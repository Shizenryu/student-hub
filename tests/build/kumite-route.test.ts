import { describe, expect, it } from 'vitest';

import { GRADES, KUMITE, SYLLABUS } from '../../src/data';
import { expandAbbreviations } from '../../src/data/display';
import { STEP_JOIN } from '../../src/domain/quiz-questions';
import { astroEscapeText, readBuiltPage } from './astro-html';

// The kumite reference: all twelve Kihon Kumite, in syllabus order under their
// belts, each as one attack and its responses, from the same data the quiz asks
// about. A static page — nothing here needs a browser, so the built HTML is
// asserted directly, as the belt and kata routes are.

const html = await readBuiltPage('kumite', 'index.html');

const ordered = [...KUMITE].sort((a, b) => a.n - b.n);
const beltsWithKumite = GRADES.filter((grade) => KUMITE.some((kumite) => kumite.belt === grade.key));
const positionOf = (needle: string): number => {
  const index = html.indexOf(needle);
  expect(index, `${needle} is not on the page`).toBeGreaterThanOrEqual(0);
  return index;
};

describe('the kumite reference (/kumite)', () => {
  it('lists every kumite once, in order, each with an anchor by number', () => {
    const positions = ordered.map((kumite) => positionOf(`id="kumite-${kumite.n}"`));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect((html.match(/id="kumite-\d+"/g) ?? []).length).toBe(KUMITE.length);
  });

  it('groups them under the belt banners, in belt order, with the belt colour', () => {
    const positions = beltsWithKumite.map((grade) => {
      positionOf(astroEscapeText(grade.banner));
      return positionOf(`belt-colour" data-slug="${grade.slug}"`);
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const kumite of ordered) {
      const grade = GRADES.find((entry) => entry.key === kumite.belt);
      expect(grade).toBeDefined();
      if (!grade) return;
      expect(positionOf(`id="kumite-${kumite.n}"`)).toBeGreaterThan(positionOf(`data-slug="${grade.slug}"`));
    }
  });

  it('shows each kumite as its attack and then its responses, joined as the quiz joins them', () => {
    for (const kumite of ordered) {
      const [attack, ...responses] = kumite.steps;
      expect(html).toContain(astroEscapeText(attack ?? ''));
      expect(html).toContain(astroEscapeText(responses.join(STEP_JOIN)));
    }
  });

  it('shows each side as the syllabus writes it, with its expansion', () => {
    expect(html).toContain('OS');
    expect(html).toContain('SS');
    expect(html).toContain('opposite side');
    expect(html).toContain('same side');
    // Once per kumite of that side, plus the lede's one mention of each.
    expect((html.match(/opposite side/g) ?? []).length).toBe(KUMITE.filter((kumite) => kumite.side === 'OS').length + 1);
    expect((html.match(/same side/g) ?? []).length).toBe(KUMITE.filter((kumite) => kumite.side === 'SS').length + 1);
  });

  it('ends with the 2nd Kyu row that says where the twelve lead, under its banner', () => {
    const row = SYLLABUS.find((item) => item.grade === '2nd Kyu' && item.item === 'Kumite 1 to 12');
    expect(row).toBeDefined();
    if (!row) return;
    const secondKyu = GRADES.find((grade) => grade.key === '2nd Kyu');
    expect(secondKyu).toBeDefined();
    if (!secondKyu) return;
    const banner = positionOf(`belt-colour" data-slug="${secondKyu.slug}"`);
    expect(positionOf(astroEscapeText(expandAbbreviations(row.item)))).toBeGreaterThan(banner);
    expect(positionOf(astroEscapeText(expandAbbreviations(row.detail)))).toBeGreaterThan(banner);
    expect(banner).toBeGreaterThan(positionOf('id="kumite-12"'));
  });

  it('ships no script and no inline style', () => {
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\sstyle\s*=/i);
  });
});
