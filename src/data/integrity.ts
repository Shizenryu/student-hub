import { DECKS, GRADES, KATA, KUMITE, SYLLABUS, TERMS } from './index';

const TRACKS = new Set(['All', 'Adult', 'Junior']);
const SIDES = new Set(['OS', 'SS']);

// Cross-reference checks that a future content edit could break silently.
// A belt whose key stops matching any syllabus row renders an empty study guide
// with no error anywhere — this turns that into a build failure.
export function assertContentIntegrity(): void {
  const problems: string[] = [];

  const gradeKeys = new Set(GRADES.map((grade) => grade.key));
  const gradedInSyllabus = new Set(SYLLABUS.map((item) => item.grade));

  for (const grade of GRADES) {
    if (!gradedInSyllabus.has(grade.key)) problems.push(`belt "${grade.key}" has no syllabus rows`);
    if (!TERMS[String(grade.tier)]) problems.push(`belt "${grade.key}" points at missing tier ${grade.tier}`);
  }

  for (const item of SYLLABUS) {
    if (!gradeKeys.has(item.grade)) problems.push(`syllabus row names unknown belt "${item.grade}"`);
    if (!TRACKS.has(item.track)) problems.push(`syllabus row for "${item.grade}" has unknown track "${item.track}"`);
  }

  // The value sets the types cannot express, checked here instead.
  for (const bout of KUMITE) {
    if (!SIDES.has(bout.side)) problems.push(`kumite ${bout.n} has unknown side "${bout.side}"`);
  }

  for (const [tier, pairs] of Object.entries(TERMS)) {
    pairs.forEach((pair, index) => {
      if (pair.length !== 2) problems.push(`tier ${tier} term ${index} is not a japanese/english pair`);
    });
  }

  for (const deck of DECKS) {
    deck.cards.forEach((card, index) => {
      if (card.length !== 2) problems.push(`deck "${deck.id}" card ${index} is not a front/back pair`);
    });
  }

  const beltSlugs = GRADES.map((grade) => grade.slug);
  if (new Set(beltSlugs).size !== beltSlugs.length) problems.push('two belts share a slug');

  const kataSlugs = KATA.map((entry) => entry.slug);
  if (new Set(kataSlugs).size !== kataSlugs.length) problems.push('two kata share a slug');

  for (const entry of KATA) {
    const hit = SYLLABUS.some((item) =>
      entry.match.some((needle) => `${item.section} ${item.item} ${item.detail}`.toLowerCase().includes(needle)),
    );
    if (!hit) problems.push(`kata "${entry.name}" matches no syllabus row`);
  }

  if (problems.length > 0) {
    throw new Error(`Content integrity failed:\n  - ${problems.join('\n  - ')}`);
  }
}
