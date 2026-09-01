import { describe, expect, it } from 'vitest';

import { assertContentIntegrity, type ContentBundle } from '../../src/data/integrity';
import type { Deck, Grade, Kata, Kumite, PracticeActivity, SyllabusItem } from '../../src/data';

const grade = (overrides: Partial<Grade> = {}): Grade => ({
  slug: '9th-kyu',
  key: '9th Kyu',
  banner: 'RED BELT',
  hex: '#C8102E',
  white: true,
  tier: 1,
  maxim: 'm',
  mind: 'mind',
  ...overrides,
});

const syllabusItem = (overrides: Partial<SyllabusItem> = {}): SyllabusItem => ({
  grade: '9th Kyu',
  track: 'All',
  section: 'Kihon',
  item: 'Jun-zuki',
  detail: 'Straight punch',
  ...overrides,
});

const kumiteBout = (overrides: Partial<Kumite> = {}): Kumite => ({
  n: 1,
  side: 'OS',
  belt: '9th Kyu',
  steps: ['jun-zuki'],
  ...overrides,
});

const deck = (overrides: Partial<Deck> = {}): Deck => ({
  id: 'd1',
  name: 'Deck One',
  cls: 'd1',
  cards: [['front', 'back']],
  ...overrides,
});

const kata = (overrides: Partial<Kata> = {}): Kata => ({
  slug: 'sanchin',
  name: 'Sanchin',
  translation: 'Three battles',
  hex: '#000000',
  white: true,
  match: ['kihon'],
  sections: [{ h: 'Overview', b: '<p>...</p>' }],
  ...overrides,
});

const practiceActivity = (overrides: Partial<PracticeActivity> = {}): PracticeActivity => ({
  id: 'kihon',
  name: 'Kihon drills',
  hint: '10 minutes',
  ...overrides,
});

const validContent = (overrides: Partial<ContentBundle> = {}): ContentBundle => ({
  terms: { '1': [['osu', 'push']] },
  maxims: ['Discipline first.'],
  kumite: [kumiteBout()],
  decks: [deck()],
  grades: [grade()],
  syllabus: [syllabusItem()],
  kata: [kata()],
  practice: [practiceActivity()],
  ...overrides,
});

describe('content cross-references hold', () => {
  it('accepts the real content', () => {
    expect(() => assertContentIntegrity()).not.toThrow();
  });

  it('accepts a well-formed bundle', () => {
    expect(() => assertContentIntegrity(validContent())).not.toThrow();
  });

  it('rejects a belt whose key matches no syllabus row', () => {
    const content = validContent({ grades: [grade({ key: 'Ghost Kyu' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/belt "Ghost Kyu" has no syllabus rows/);
  });

  it('rejects a syllabus row naming an unknown belt', () => {
    const content = validContent({ syllabus: [syllabusItem({ grade: 'Ghost Kyu' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/syllabus row names unknown belt "Ghost Kyu"/);
  });

  it('rejects a belt pointing at a missing terminology tier', () => {
    const content = validContent({ grades: [grade({ tier: 99 })] });
    expect(() => assertContentIntegrity(content)).toThrow(/belt "9th Kyu" points at missing tier 99/);
  });

  it('rejects a syllabus row with an unknown track', () => {
    const content = validContent({ syllabus: [syllabusItem({ track: 'Sensei-only' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/unknown track "Sensei-only"/);
  });

  it('rejects a kumite bout with an unknown side', () => {
    const content = validContent({ kumite: [kumiteBout({ side: 'XX' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 has unknown side "XX"/);
  });

  it('rejects a term pair that is not a japanese/english pair', () => {
    const content = validContent({ terms: { '1': [['only-one']] } });
    expect(() => assertContentIntegrity(content)).toThrow(/tier 1 term 0 is not a japanese\/english pair/);
  });

  it('rejects a deck card that is not a front/back pair', () => {
    const content = validContent({ decks: [deck({ cards: [['only-front']] })] });
    expect(() => assertContentIntegrity(content)).toThrow(/deck "d1" card 0 is not a front\/back pair/);
  });

  it('rejects two belts sharing a slug', () => {
    const content = validContent({
      grades: [grade(), grade({ key: 'Other Kyu' })],
      syllabus: [syllabusItem(), syllabusItem({ grade: 'Other Kyu' })],
    });
    expect(() => assertContentIntegrity(content)).toThrow(/two belts share a slug/);
  });

  it('rejects two kata sharing a slug', () => {
    const content = validContent({ kata: [kata(), kata()] });
    expect(() => assertContentIntegrity(content)).toThrow(/two kata share a slug/);
  });

  it('rejects a kata that matches no syllabus row', () => {
    const content = validContent({ kata: [kata({ match: ['no-such-text'] })] });
    expect(() => assertContentIntegrity(content)).toThrow(/kata "Sanchin" matches no syllabus row/);
  });

  it('rejects a duplicate practice activity id', () => {
    const content = validContent({ practice: [practiceActivity(), practiceActivity({ name: 'Different name' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/practice activity id "kihon" is used more than once/);
  });

  it('rejects a duplicate kumite number', () => {
    const content = validContent({ kumite: [kumiteBout(), kumiteBout({ side: 'SS' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite number 1 is used more than once/);
  });

  it('rejects two belts sharing a key', () => {
    const content = validContent({ grades: [grade(), grade({ slug: 'other-kyu' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/belt key "9th Kyu" is used by more than one belt/);
  });

  it('rejects an empty maxims list', () => {
    const content = validContent({ maxims: [] });
    expect(() => assertContentIntegrity(content)).toThrow(/MAXIMS is empty/);
  });

  it('rejects a duplicate deck id', () => {
    const content = validContent({ decks: [deck(), deck({ name: 'Deck Two' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/deck id "d1" is used more than once/);
  });

  it('accumulates unrelated problems into a single thrown message', () => {
    const content = validContent({ maxims: [], grades: [grade({ key: 'Ghost Kyu' })] });
    try {
      assertContentIntegrity(content);
      expect.unreachable('expected assertContentIntegrity to throw');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/belt "Ghost Kyu" has no syllabus rows/);
      expect(message).toMatch(/MAXIMS is empty/);
    }
  });
});
