import {
  DECKS,
  GRADES,
  KATA,
  KUMITE,
  MAXIMS,
  PRACTICE,
  SYLLABUS,
  TERMS,
  type Deck,
  type Grade,
  type Kata,
  type Kumite,
  type PracticeActivity,
  type SyllabusItem,
  type TermPair,
} from './index';

const TRACKS = new Set(['All', 'Adult', 'Junior']);
const SIDES = new Set(['OS', 'SS']);

// The shape a caller must supply to be checked. Defaults to the real, migrated
// content so build- and test-suite callers need not repeat it, while tests can
// pass a deliberately broken bundle to prove each check actually fires.
export type ContentBundle = {
  readonly terms: Readonly<Record<string, readonly TermPair[]>>;
  readonly maxims: readonly string[];
  readonly kumite: readonly Kumite[];
  readonly decks: readonly Deck[];
  readonly grades: readonly Grade[];
  readonly syllabus: readonly SyllabusItem[];
  readonly kata: readonly Kata[];
  readonly practice: readonly PracticeActivity[];
};

const REAL_CONTENT: ContentBundle = {
  terms: TERMS,
  maxims: MAXIMS,
  kumite: KUMITE,
  decks: DECKS,
  grades: GRADES,
  syllabus: SYLLABUS,
  kata: KATA,
  practice: PRACTICE,
};

const duplicates = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
};

// Cross-reference checks that a future content edit could break silently.
// A belt whose key stops matching any syllabus row renders an empty study guide
// with no error anywhere — this turns that into a build failure.
export function assertContentIntegrity(content: ContentBundle = REAL_CONTENT): void {
  const { terms, maxims, kumite, decks, grades, syllabus, kata, practice } = content;
  const problems: string[] = [];

  const gradeKeys = new Set(grades.map((grade) => grade.key));
  const gradedInSyllabus = new Set(syllabus.map((item) => item.grade));

  for (const grade of grades) {
    if (!gradedInSyllabus.has(grade.key)) problems.push(`belt "${grade.key}" has no syllabus rows`);
    if (!terms[String(grade.tier)]) problems.push(`belt "${grade.key}" points at missing tier ${grade.tier}`);
  }

  for (const item of syllabus) {
    if (!gradeKeys.has(item.grade)) problems.push(`syllabus row names unknown belt "${item.grade}"`);
    if (!TRACKS.has(item.track)) problems.push(`syllabus row for "${item.grade}" has unknown track "${item.track}"`);
  }

  // The value sets the types cannot express, checked here instead.
  for (const bout of kumite) {
    if (!SIDES.has(bout.side)) problems.push(`kumite ${bout.n} has unknown side "${bout.side}"`);
  }

  for (const [tier, pairs] of Object.entries(terms)) {
    pairs.forEach((pair, index) => {
      if (pair.length !== 2) problems.push(`tier ${tier} term ${index} is not a japanese/english pair`);
    });
  }

  for (const deck of decks) {
    deck.cards.forEach((card, index) => {
      if (card.length !== 2) problems.push(`deck "${deck.id}" card ${index} is not a front/back pair`);
    });
  }

  const beltSlugs = grades.map((grade) => grade.slug);
  if (new Set(beltSlugs).size !== beltSlugs.length) problems.push('two belts share a slug');

  const kataSlugs = kata.map((entry) => entry.slug);
  if (new Set(kataSlugs).size !== kataSlugs.length) problems.push('two kata share a slug');

  for (const entry of kata) {
    const hit = syllabus.some((item) =>
      entry.match.some((needle) => `${item.section} ${item.item} ${item.detail}`.toLowerCase().includes(needle)),
    );
    if (!hit) problems.push(`kata "${entry.name}" matches no syllabus row`);
  }

  // practice.html keys streak completion solely by PRACTICE[].id — a duplicate
  // silently aliases two activities' completion state.
  for (const id of duplicates(practice.map((activity) => activity.id))) {
    problems.push(`practice activity id "${id}" is used more than once`);
  }

  // quiz.html builds "which kumite is this?" questions and distractors from
  // KUMITE[].n alone — a duplicate produces two identical answer labels for
  // genuinely different step sequences.
  for (const n of duplicates(kumite.map((bout) => String(bout.n)))) {
    problems.push(`kumite number ${n} is used more than once`);
  }

  // The mirror image of the brief's own motivating example: two belts with
  // different slugs but the same key would render identical study guides.
  for (const key of duplicates(grades.map((grade) => grade.key))) {
    problems.push(`belt key "${key}" is used by more than one belt`);
  }

  // index.html renders MAXIMS[day % MAXIMS.length]; an empty array yields
  // MAXIMS[NaN] and prints the literal word "undefined" on the homepage.
  if (maxims.length === 0) problems.push('MAXIMS is empty');

  // Not load-bearing today — the legacy flashcards page keys by name — but the
  // field is exported and typed, and a future page may key by it.
  for (const id of duplicates(decks.map((deck) => deck.id))) {
    problems.push(`deck id "${id}" is used more than once`);
  }

  if (problems.length > 0) {
    throw new Error(`Content integrity failed:\n  - ${problems.join('\n  - ')}`);
  }
}
