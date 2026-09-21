import type { Kumite, TermPair } from '../data';
import { shuffled } from './shuffle';

// The quiz's rounds: which terms a level draws on, where the wrong answers come
// from, and how the kumite sequences are turned into things to ask.
//
// Pure, with the random source injected as store.ts and flashcards-queue.ts take
// theirs. That is what lets any of this be checked — a student sees four options
// and cannot tell where three of them came from — and it is where the rules
// about small pools live, since no shipped content reaches them through the UI.
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
// what the page looks like, so it is transcribed rather than tidied. Exported
// because /kumite joins a sequence's responses with it too: a sequence reads
// the same on the reference page and in a quiz question.
export const STEP_JOIN = '  »  ';

// `options` always contains `correct`, which the type cannot say. `correct` is the
// answer's TEXT rather than its index: the options are distinct, so the text names
// exactly one button, and the page can mark it without knowing where it landed.
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

type Random = () => number;

// Level 0 is the menu's "Everything"; any other level is itself and everything
// below it, which is what "each level includes everything below it" promises.
const tiersFor = (level: number): readonly string[] =>
  level === 0 ? ['1', '2', '3', '4'] : Array.from({ length: level }, (_, index) => String(index + 1));

const distinct = (texts: readonly string[]): readonly string[] => [...new Set(texts)];

// The wrong answers every question shape draws by the same rule: candidate texts,
// each at most once and never the right answer's, taken first from what is being
// studied (`own`) and only then from the whole content (`everything`), until there
// are three. A student on one level or range never meets a term or a kumite from
// beyond it while their own can supply the wrong answers — which, with the content
// the site ships, is always — and a question offers fewer than four options only
// when the whole content has fewer than four distinct texts to show.
//
// Which texts are candidates at all is the caller's business: see termQuestion,
// where a text that would be a RIGHT answer to the prompt is never a candidate.
function wrongAnswers(options: {
  readonly correct: string;
  readonly own: readonly string[];
  readonly everything: readonly string[];
  readonly random: Random;
}): readonly string[] {
  const { correct, own, everything, random } = options;
  const fromOwn = shuffled(
    distinct(own).filter((text) => text !== correct),
    random,
  ).slice(0, WRONG_PER_QUESTION);
  if (fromOwn.length === WRONG_PER_QUESTION) return fromOwn;

  const taken = new Set([correct, ...fromOwn]);
  const fromBeyond = shuffled(
    distinct(everything).filter((text) => !taken.has(text)),
    random,
  );
  return [...fromOwn, ...fromBeyond].slice(0, WRONG_PER_QUESTION);
}

// --- terminology --------------------------------------------------------------

const japaneseOf = (pair: TermPair): string => pair[0] ?? '';
const englishOf = (pair: TermPair): string => pair[1] ?? '';

function termQuestion(options: {
  readonly pair: TermPair;
  readonly pool: readonly TermPair[];
  readonly everything: readonly TermPair[];
  readonly random: Random;
}): Question {
  const { pair, pool, everything, random } = options;
  const backwards = random() < BACKWARDS_CHANCE;
  const shown = backwards ? englishOf : japaneseOf;
  const displayed = backwards ? japaneseOf : englishOf;
  const prompt = shown(pair);
  const correct = displayed(pair);

  // A wrong answer is the displayed text of a term that is not itself a right
  // answer to this prompt. Excluding by the prompt's side of the pair, not by the
  // answer's, is what makes that true: asked backwards about 'kick', a second term
  // that also means kick is excluded; asked forwards about a term with two
  // glosses, its other gloss is excluded. Either would otherwise be offered as a
  // wrong answer and mark a student wrong for being right.
  const candidates = (pairs: readonly TermPair[]): readonly string[] =>
    pairs.filter((other) => shown(other) !== prompt).map(displayed);

  return {
    prompt,
    hint: backwards ? 'Which term means this?' : 'What does this mean?',
    correct,
    options: shuffled(
      [correct, ...wrongAnswers({ correct, own: candidates(pool), everything: candidates(everything), random })],
      random,
    ),
  };
}

export function termsRound(options: {
  readonly terms: Readonly<Record<string, readonly TermPair[]>>;
  readonly level: number;
  readonly random: Random;
}): Round {
  const { terms, level, random } = options;
  const pairsIn = (tiers: readonly string[]): readonly TermPair[] => tiers.flatMap((tier) => terms[tier] ?? []);
  const pool = pairsIn(tiersFor(level));
  // The four syllabus tiers, the same "everything" the menu's Everything level
  // asks about — not whatever keys the content happens to carry.
  const everything = pairsIn(tiersFor(0));

  return {
    mode: 'terms',
    bestKey: `level${level}`,
    questions: shuffled(pool, random)
      .slice(0, ROUND_LENGTH)
      .map((pair) => termQuestion({ pair, pool, everything, random })),
  };
}

// --- kumite -------------------------------------------------------------------

const nameOf = (kumite: Kumite): string => `Kumite ${kumite.n}`;
const stepsOf = (sequences: readonly Kumite[]): readonly string[] => sequences.flatMap((each) => each.steps);

// Everything the kumite in range could be asked, before ten are drawn from them:
// per sequence, one "what comes next" for each step, one "which kumite is this",
// and one "which side". Enumerating first is what lets the round be drawn without
// building forty questions.
type Candidate =
  | { readonly kind: 'next'; readonly kumite: Kumite; readonly step: number }
  | { readonly kind: 'which'; readonly kumite: Kumite }
  | { readonly kind: 'side'; readonly kumite: Kumite };

// Every kumite question shape takes the same pools: the sequences in the range
// being studied, and every sequence there is. Which texts each shape draws from
// them — names, or steps — is its own business.
type KumitePools = {
  readonly kumite: Kumite;
  readonly inRange: readonly Kumite[];
  readonly everything: readonly Kumite[];
  readonly random: Random;
};

const sideQuestion = ({ kumite, random }: KumitePools): Question => ({
  prompt: `${nameOf(kumite)}:  ${kumite.steps.join(STEP_JOIN)}`,
  hint: 'Same side (SS) or opposite side (OS)?',
  correct: kumite.side,
  options: shuffled(['OS', 'SS'], random),
});

// The wrong answers are the other sequences in range, then those beyond it. A
// range of three or fewer cannot supply three others alone.
function whichKumiteQuestion({ kumite, inRange, everything, random }: KumitePools): Question {
  const correct = nameOf(kumite);
  const others = wrongAnswers({ correct, own: inRange.map(nameOf), everything: everything.map(nameOf), random });

  return {
    prompt: kumite.steps.join(STEP_JOIN),
    hint: 'Which kumite is this?',
    correct,
    options: shuffled([correct, ...others], random),
  };
}

// The wrong answers are every step in range, not just this sequence's — these are
// two and three steps long, so one sequence could not supply three — and a range
// of one falls through to every step there is.
function nextStepQuestion({ kumite, inRange, everything, random }: KumitePools, step: number): Question {
  const correct = kumite.steps[step] ?? '';
  const wrong = wrongAnswers({ correct, own: stepsOf(inRange), everything: stepsOf(everything), random });
  const opening = step === 0;

  return {
    prompt: opening
      ? `${nameOf(kumite)} (${kumite.side}) opens with…`
      : `${nameOf(kumite)}:  ${kumite.steps.slice(0, step).join(STEP_JOIN)}${STEP_JOIN}?`,
    hint: opening ? 'The attack that starts it' : 'What comes next?',
    correct,
    options: shuffled([correct, ...wrong], random),
  };
}

export function kumiteRound(options: {
  readonly kumite: readonly Kumite[];
  readonly upTo: number;
  readonly random: Random;
}): Round {
  const { kumite, upTo, random } = options;
  const inRange = kumite.filter((each) => each.n <= upTo);

  const candidates = inRange.flatMap((each): readonly Candidate[] => [
    ...each.steps.map((_, step): Candidate => ({ kind: 'next', kumite: each, step })),
    { kind: 'which', kumite: each },
    { kind: 'side', kumite: each },
  ]);

  const ask = (candidate: Candidate): Question => {
    const pools: KumitePools = { kumite: candidate.kumite, inRange, everything: kumite, random };
    switch (candidate.kind) {
      case 'side':
        return sideQuestion(pools);
      case 'which':
        return whichKumiteQuestion(pools);
      case 'next':
        return nextStepQuestion(pools, candidate.step);
    }
  };

  return {
    mode: 'kumite',
    bestKey: `kumite${upTo}`,
    questions: shuffled(candidates, random).slice(0, ROUND_LENGTH).map(ask),
  };
}
