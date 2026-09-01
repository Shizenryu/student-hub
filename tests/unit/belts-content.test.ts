import { describe, expect, it } from 'vitest';

import { GRADES, termsForTier } from '../../src/data';
import { expandAbbreviations } from '../../src/data/display';

describe('syllabus abbreviations are expanded for display', () => {
  it('expands JJ to its full name', () => {
    expect(expandAbbreviations('JJ throws')).toBe('Jiu Jitsu (JJ) throws');
  });

  it('expands every occurrence in a line', () => {
    expect(expandAbbreviations('JJ and JJ')).toBe('Jiu Jitsu (JJ) and Jiu Jitsu (JJ)');
  });

  it('leaves JJ inside a longer word alone', () => {
    expect(expandAbbreviations('JJUMP')).toBe('JJUMP');
  });

  it('leaves text without the abbreviation untouched', () => {
    expect(expandAbbreviations('Mae-geri')).toBe('Mae-geri');
  });
});

describe('every belt can render', () => {
  it.each(GRADES.map((grade) => grade.slug))('%s has terminology', (slug) => {
    const grade = GRADES.find((entry) => entry.slug === slug);
    expect(grade).toBeDefined();
    if (!grade) return;
    expect(termsForTier(grade.tier).length).toBeGreaterThan(0);
  });
});
