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

// The syllabus row a kumite must agree with: same number and side in the item,
// the belt as the grade, and the steps as `attack >>> response >> response`.
const kihonKumiteRow = (overrides: Partial<SyllabusItem> = {}): SyllabusItem =>
  syllabusItem({
    section: 'Kihon Kumite',
    item: 'Kumite 1 (OS)',
    detail: 'jun-zuki >>> uchi-uke >> gyaku-zuki',
    ...overrides,
  });

const validContent = (overrides: Partial<ContentBundle> = {}): ContentBundle => ({
  terms: { '1': [['osu', 'push']] },
  maxims: ['Discipline first.'],
  kumite: [kumiteBout({ steps: ['jun-zuki', 'uchi-uke', 'gyaku-zuki'] })],
  decks: [deck()],
  grades: [grade()],
  syllabus: [syllabusItem(), kihonKumiteRow()],
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
    expect(() => assertContentIntegrity(content)).toThrow(/belt "9th Kyu" points at missing or empty tier 99/);
  });

  it('rejects a belt pointing at an empty terminology tier', () => {
    // A level whose tier has no terms would deal a round of nothing.
    const content = validContent({ terms: { '1': [] } });
    expect(() => assertContentIntegrity(content)).toThrow(/belt "9th Kyu" points at missing or empty tier 1/);
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

  it('rejects a term pair with an extra, over-length element', () => {
    const content = validContent({ terms: { '1': [['osu', 'push', 'stray note']] } });
    expect(() => assertContentIntegrity(content)).toThrow(/tier 1 term 0 is not a japanese\/english pair/);
  });

  it('rejects a deck card with an extra, over-length element', () => {
    const content = validContent({ decks: [deck({ cards: [['front', 'back', 'extra']] })] });
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

  it('accepts a kata whose match needle appears only in a syllabus row detail', () => {
    const content = validContent({
      syllabus: [syllabusItem({ section: 'Kihon', item: 'Jun-zuki', detail: 'Only findable here' }), kihonKumiteRow()],
      kata: [kata({ match: ['findable'] })],
    });
    expect(() => assertContentIntegrity(content)).not.toThrow();
  });

  it('accepts a kata whose match needle appears only in a syllabus row item', () => {
    const content = validContent({
      syllabus: [syllabusItem({ section: 'Kihon', item: 'Only-findable-here', detail: 'Straight punch' }), kihonKumiteRow()],
      kata: [kata({ match: ['only-findable-here'] })],
    });
    expect(() => assertContentIntegrity(content)).not.toThrow();
  });

  it('rejects a duplicate practice activity id', () => {
    const content = validContent({ practice: [practiceActivity(), practiceActivity({ name: 'Different name' })] });
    expect(() => assertContentIntegrity(content)).toThrow(/practice activity id "kihon" is used more than once/);
  });

  it('rejects a card front used by more than one card, across decks', () => {
    // The Everything deck merges decks, and a front is a card's identity to the
    // store and to the session alike.
    const content = validContent({
      decks: [deck(), deck({ id: 'd2', name: 'Deck Two', cards: [['front', 'another back']] })],
    });
    expect(() => assertContentIntegrity(content)).toThrow(/card front "front" is used by more than one card/);
  });

  it('rejects a duplicate kumite number', () => {
    const content = validContent({
      kumite: [kumiteBout({ steps: ['jun-zuki', 'uchi-uke', 'gyaku-zuki'] }), kumiteBout({ side: 'SS' })],
    });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite number 1 is used more than once/);
  });
});

// kumite.json and the syllabus rows are two copies of the same twelve sequences:
// the quiz and /kumite read the first, the belt guides render the second. The
// syllabus writes each as `attack >>> response >> response`; the data lists the
// same tokens in the same order, attack first. Either copy edited alone fails
// the build, naming the kumite.
describe('every kumite agrees with its Kihon Kumite syllabus row', () => {
  it('accepts a kumite whose steps, order, belt and side all match its row', () => {
    expect(() => assertContentIntegrity(validContent())).not.toThrow();
  });

  it('matches the steps case-insensitively, as 11 and 12 differ only in capitals', () => {
    const content = validContent({ syllabus: [syllabusItem(), kihonKumiteRow({ detail: 'Jun-zuki >>> Uchi-uke >> Gyaku-zuki' })] });
    expect(() => assertContentIntegrity(content)).not.toThrow();
  });

  it('rejects a kumite with no Kihon Kumite row', () => {
    const content = validContent({ syllabus: [syllabusItem()] });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 has no "Kihon Kumite" syllabus row/);
  });

  it('rejects a kumite whose steps differ from its row', () => {
    const content = validContent({ kumite: [kumiteBout({ steps: ['jun-zuki', 'uchi-uke', 'mae-geri'] })] });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 steps differ from its syllabus row/);
  });

  it('rejects a kumite whose steps are in a different order from its row', () => {
    const content = validContent({ kumite: [kumiteBout({ steps: ['uchi-uke', 'jun-zuki', 'gyaku-zuki'] })] });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 steps differ from its syllabus row/);
  });

  it('rejects a kumite whose belt is not the row\'s grade', () => {
    const content = validContent({
      kumite: [kumiteBout({ belt: '8th Kyu', steps: ['jun-zuki', 'uchi-uke', 'gyaku-zuki'] })],
    });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 belt "8th Kyu" is not its syllabus row's "9th Kyu"/);
  });

  it('rejects a kumite whose side is not the row\'s', () => {
    const content = validContent({
      kumite: [kumiteBout({ side: 'SS', steps: ['jun-zuki', 'uchi-uke', 'gyaku-zuki'] })],
    });
    expect(() => assertContentIntegrity(content)).toThrow(/kumite 1 side "SS" is not its syllabus row's "OS"/);
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
