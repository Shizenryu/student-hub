import { describe, expect, it } from 'vitest';

import { assertContentIntegrity } from '../../src/data/integrity';
import { GRADES, KATA, SYLLABUS, TERMS } from '../../src/data';

describe('content cross-references hold', () => {
  it('accepts the real content', () => {
    expect(() => assertContentIntegrity()).not.toThrow();
  });

  it('gives every belt a syllabus', () => {
    const graded = new Set(SYLLABUS.map((item) => item.grade));
    for (const grade of GRADES) {
      expect(graded, `no syllabus rows for belt "${grade.key}"`).toContain(grade.key);
    }
  });

  it('assigns every syllabus row to a known belt', () => {
    const keys = new Set(GRADES.map((grade) => grade.key));
    for (const item of SYLLABUS) {
      expect(keys, `syllabus row for unknown belt "${item.grade}"`).toContain(item.grade);
    }
  });

  it('points every belt at a terminology tier that exists', () => {
    for (const grade of GRADES) {
      expect(TERMS[String(grade.tier)], `belt "${grade.key}" has no tier ${grade.tier}`).toBeDefined();
    }
  });

  it('gives every belt and kata a unique slug', () => {
    const beltSlugs = GRADES.map((grade) => grade.slug);
    expect(new Set(beltSlugs).size).toBe(beltSlugs.length);
    const kataSlugs = KATA.map((entry) => entry.slug);
    expect(new Set(kataSlugs).size).toBe(kataSlugs.length);
  });

  it('matches every kata to at least one syllabus row', () => {
    for (const entry of KATA) {
      const hit = SYLLABUS.some((item) =>
        entry.match.some((needle) => `${item.section} ${item.item} ${item.detail}`.toLowerCase().includes(needle)),
      );
      expect(hit, `kata "${entry.name}" matches no syllabus row via ${JSON.stringify(entry.match)}`).toBe(true);
    }
  });
});
