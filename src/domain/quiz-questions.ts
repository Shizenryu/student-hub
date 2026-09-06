import type { Kumite, TermPair } from '../data';
import { shuffled } from './shuffle';

// The quiz's rounds: which terms a level draws on, where the wrong answers come
// from, and how the kumite sequences are turned into things to ask.
//
// Pure, with the random source injected as store.ts and flashcards-queue.ts take
// theirs. That is what lets any of this be checked — a student sees four options
// and cannot tell where three of them came from — and it is the only place the
// three remaining defects can be pinned, since none is reachable through the UI
// with the content the site ships.
//
// One deliberate difference from the page being ported: the legacy quiz chose a
// question's direction and wrong answers at the moment it was DISPLAYED, where
// this builds the round up front, as the legacy kumite mode already did. A
// question is shown exactly once, so a student cannot tell.

export const ROUND_LENGTH = 10;

// How often a terminology question is asked backwards — English shown, Japanese
// wanted. Transcribed from the legacy `Math.random() < 0.3`.
const BACKWARDS_CHANCE = 0.3;

const OPTIONS_PER_QUESTION = 4;
const WRONG_PER_QUESTION = OPTIONS_PER_QUESTION - 1;

// Two spaces either side, as the legacy page wrote it. The separator is part of
// what the page looks like, so it is transcribed rather than tidied.
const STEP_JOIN = '  »  ';

// `options` always contains `correct`, which the type cannot say. `correct` is the
// answer's TEXT rather than its index, deliberately: the page marks every option
// whose text matches, which is exactly why defect 1 shows two right answers instead
// of one. An index would mark a single button and quietly change that.
export type Question = {
  readonly prompt: string;
  readonly hint: string;
  readonly correct: string;
  readonly options: readonly string[];
};

// A whole round, not just its questions. `bestKey` is persisted to localStorage and
// has to stay byte-identical with what public/assets/store.js writes until that file
// retires, so it is built here where a node test can see it, rather than in the
// island where only a browser could.
export type Round = {
  readonly mode: 'terms' | 'kumite';
  readonly bestKey: string;
  readonly questions: readonly Question[];
};

// Level 0 is the menu's "Everything"; any other level is itself and everything
// below it, which is what "each level includes everything below it" promises.
const tiersFor = (level: number): readonly string[] =>
  level === 0 ? ['1', '2', '3', '4'] : Array.from({ length: level }, (_, index) => String(index + 1));

function termQuestion(pair: TermPair, pool: readonly TermPair[], random: () => number): Question {
  const japanese = pair[0] ?? '';
  const english = pair[1] ?? '';
  const backwards = random() < BACKWARDS_CHANCE;
  const correct = backwards ? japanese : english;

  // DEFER(slice-8): DEFECT 1. Wrong answers are excluded by JAPANESE term, so in the
  // forward direction — where the options are English — a different term sharing
  // this one's gloss survives the filter and renders as a second copy of the right
  // answer. Both then count as correct. Ported unchanged; pinned in
  // tests/unit/quiz-questions.test.ts.
  const wrong = shuffled(
    pool.filter((other) => other[0] !== japanese),
    random,
  )
    .slice(0, WRONG_PER_QUESTION)
    .map((other) => (backwards ? (other[0] ?? '') : (other[1] ?? '')));

  return {
    prompt: backwards ? english : japanese,
    hint: backwards ? 'Which term means this?' : 'What does this mean?',
    correct,
    options: shuffled([correct, ...wrong], random),
  };
}

export function termsRound(options: {
  readonly terms: Readonly<Record<string, readonly TermPair[]>>;
  readonly level: number;
  readonly random: () => number;
}): Round {
  const { terms, level, random } = options;
  const pool = tiersFor(level).flatMap((tier) => terms[tier] ?? []);

  return {
    mode: 'terms',
    bestKey: `level${level}`,
    questions: shuffled(pool, random)
      .slice(0, ROUND_LENGTH)
      .map((pair) => termQuestion(pair, pool, random)),
  };
}

// Everything the kumite in range could be asked, before ten are drawn from them:
// per sequence, one "what comes next" for each step, one "which kumite is this",
// and one "which side". Enumerating first is what lets the round be drawn without
// building forty questions.
type Candidate =
  | { readonly kind: 'next'; readonly kumite: Kumite; readonly step: number }
  | { readonly kind: 'which'; readonly kumite: Kumite }
  | { readonly kind: 'side'; readonly kumite: Kumite };

const sideQuestion = (kumite: Kumite, random: () => number): Question => ({
  prompt: `Kumite ${kumite.n}:  ${kumite.steps.join(STEP_JOIN)}`,
  hint: 'Same side (SS) or opposite side (OS)?',
  correct: kumite.side,
  options: shuffled(['OS', 'SS'], random),
});

// DEFER(slice-8): DEFECT 4. The wrong answers are the OTHER kumite in range, so a
// range below five cannot supply three of them and the question offers fewer than
// four options. The menu only ever asks for 1-6 or 1-12, so this is unreachable
// today. Ported unchanged; pinned in tests/unit/quiz-questions.test.ts.
function whichKumiteQuestion(kumite: Kumite, inRange: readonly Kumite[], random: () => number): Question {
  const correct = `Kumite ${kumite.n}`;
  const others = shuffled(
    inRange.filter((other) => other.n !== kumite.n),
    random,
  )
    .slice(0, WRONG_PER_QUESTION)
    .map((other) => `Kumite ${other.n}`);

  return {
    prompt: kumite.steps.join(STEP_JOIN),
    hint: 'Which kumite is this?',
    correct,
    options: shuffled([correct, ...others], random),
  };
}

function nextStepQuestion(
  kumite: Kumite,
  step: number,
  vocabulary: readonly string[],
  random: () => number,
): Question {
  const correct = kumite.steps[step] ?? '';
  // From every step in range, not just this sequence's: these are two and three
  // steps long, so one sequence could not supply three wrong answers.
  const wrong = shuffled(
    vocabulary.filter((other) => other !== correct),
    random,
  ).slice(0, WRONG_PER_QUESTION);
  const opening = step === 0;

  return {
    prompt: opening
      ? `Kumite ${kumite.n} (${kumite.side}) opens with…`
      : `Kumite ${kumite.n}:  ${kumite.steps.slice(0, step).join(STEP_JOIN)}${STEP_JOIN}?`,
    hint: opening ? 'The attack that starts it' : 'What comes next?',
    correct,
    options: shuffled([correct, ...wrong], random),
  };
}

export function kumiteRound(options: {
  readonly kumite: readonly Kumite[];
  readonly upTo: number;
  readonly random: () => number;
}): Round {
  const { kumite, upTo, random } = options;
  const inRange = kumite.filter((each) => each.n <= upTo);

  // Every step in range, deduplicated: the wrong answers for "what comes next" come
  // from the whole vocabulary a student has met.
  const vocabulary = [...new Set(inRange.flatMap((each) => each.steps))];

  const candidates = inRange.flatMap((each): readonly Candidate[] => [
    ...each.steps.map((_, step): Candidate => ({ kind: 'next', kumite: each, step })),
    { kind: 'which', kumite: each },
    { kind: 'side', kumite: each },
  ]);

  const ask = (candidate: Candidate): Question => {
    switch (candidate.kind) {
      case 'side':
        return sideQuestion(candidate.kumite, random);
      case 'which':
        return whichKumiteQuestion(candidate.kumite, inRange, random);
      case 'next':
        return nextStepQuestion(candidate.kumite, candidate.step, vocabulary, random);
    }
  };

  return {
    mode: 'kumite',
    bestKey: `kumite${upTo}`,
    questions: shuffled(candidates, random).slice(0, ROUND_LENGTH).map(ask),
  };
}
