import decksJson from './decks.json';
import gradesJson from './grades.json';
import kataJson from './kata.json';
import kumiteJson from './kumite.json';
import maximsJson from './maxims.json';
import practiceJson from './practice.json';
import syllabusJson from './syllabus.json';
import termsJson from './terms.json';

// Field types mirror what JSON can actually prove. `tier`, `track` and `side` have
// small fixed value sets, but TypeScript infers `number`/`string` from a .json file
// and narrowing them here would need a type assertion — which the project bans
// without justification. Their allowed values are enforced in integrity.ts instead,
// where a violation produces a named error rather than a silent mistyping.
//
// Pairs are `readonly string[]` for the same reason: JSON infers arrays, not tuples.
// Their length is checked in integrity.ts.

export type TermPair = readonly string[];

export type Grade = {
  readonly slug: string;
  readonly key: string;
  readonly banner: string;
  readonly hex: string;
  readonly white: boolean;
  readonly tier: number;
  readonly maxim: string;
  readonly mind: string;
};

export type SyllabusItem = {
  readonly grade: string;
  readonly track: string;
  readonly section: string;
  readonly item: string;
  readonly detail: string;
};

export type Kumite = {
  readonly n: number;
  readonly side: string;
  readonly belt: string;
  readonly steps: readonly string[];
};

export type Deck = {
  readonly id: string;
  readonly name: string;
  readonly cls: string;
  readonly cards: readonly TermPair[];
};

export type KataSection = { readonly h: string; readonly b: string };

export type Kata = {
  readonly slug: string;
  readonly name: string;
  readonly translation: string;
  readonly hex: string;
  readonly white: boolean;
  readonly match: readonly string[];
  readonly quote?: { readonly text: string; readonly src: string };
  readonly sections: readonly KataSection[];
};

export type PracticeActivity = { readonly id: string; readonly name: string; readonly hint: string };

// Annotations, not assertions — the JSON's inferred shape must actually satisfy these
// types or the build fails, which is the point.
export const TERMS: Readonly<Record<string, readonly TermPair[]>> = termsJson;
export const MAXIMS: readonly string[] = maximsJson;
export const KUMITE: readonly Kumite[] = kumiteJson;
export const DECKS: readonly Deck[] = decksJson;
export const GRADES: readonly Grade[] = gradesJson;
export const SYLLABUS: readonly SyllabusItem[] = syllabusJson;
export const KATA: readonly Kata[] = kataJson;
export const PRACTICE: readonly PracticeActivity[] = practiceJson;

// noUncheckedIndexedAccess makes TERMS[String(tier)] possibly undefined. The throw
// below is genuinely unreachable — assertContentIntegrity() already fails the build
// when a belt points at a missing tier — but this narrows the value honestly for
// consumers instead of reaching for a type assertion.
export function termsForTier(tier: number): readonly TermPair[] {
  const pairs = TERMS[String(tier)];
  if (!pairs) {
    throw new Error(`No terminology tier ${tier} — content integrity should have caught this`);
  }
  return pairs;
}
