import type { Kumite, TermPair } from '../data';

// The quiz's questions: which terms a level draws on, where the wrong answers come
// from, and how the kumite sequences are turned into things to ask.
//
// Pure, with the random source injected the way flashcards-queue.ts and store.ts
// take theirs. Almost nothing here is observable from the outside — a student sees
// four options and cannot tell where three of them came from — so this is the only
// place the rules can be checked, and the only place the three remaining defects
// can be pinned. None of them is reachable through the UI with the content the site
// ships; see the defect tests in tests/unit/quiz-questions.test.ts.
//
// One deliberate difference from the page this replaces. The legacy quiz chose a
// question's direction and its wrong answers at the moment it was DISPLAYED; this
// builds the whole round up front, as the legacy kumite mode already did. A
// question is shown exactly once, so a student cannot tell — but it means the round
// is a value that can be inspected rather than a sequence of side effects.

export const ROUND_LENGTH = 10;

// How often a terminology question is asked backwards — English shown, Japanese
// wanted. Transcribed from the legacy `Math.random() < 0.3`.
const BACKWARDS_CHANCE = 0.3;

const OPTIONS_PER_QUESTION = 4;

// Two spaces either side, as the legacy page wrote it. The step separator is part
// of what the page looks like, so it is transcribed rather than tidied.
const STEP_JOIN = '  »  ';

export type Question = {
  readonly prompt: string;
  readonly hint: string;
  readonly correct: string;
  readonly options: readonly string[];
};

// Fisher-Yates from the end, the same transcription flashcards-queue.ts carries, so
// a given sequence of random numbers deals what the legacy page dealt.
function shuffled<T>(items: readonly T[], random: () => number): readonly T[] {
  const order = [...items];
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    const held = order[index];
    const other = order[swap];
    // In bounds by construction; the compiler cannot see it and this project does
    // not allow assertions.
    if (held !== undefined && other !== undefined) {
      order[index] = other;
      order[swap] = held;
    }
  }
  return order;
}

// Level 0 is the menu's "Everything"; any other level is itself and everything
// below it, which is what "each level includes everything below it" promises.
const tiersFor = (level: number): readonly string[] =>
  level === 0 ? ['1', '2', '3', '4'] : Array.from({ length: level }, (_, index) => String(index + 1));

export function termsRound(options: {
  readonly terms: Readonly<Record<string, readonly TermPair[]>>;
  readonly level: number;
  readonly random: () => number;
}): readonly Question[] {
  const { terms, level, random } = options;
  const pool = tiersFor(level).flatMap((tier) => terms[tier] ?? []);

  return shuffled(pool, random)
    .slice(0, ROUND_LENGTH)
    .map((pair) => {
      const japanese = pair[0] ?? '';
      const english = pair[1] ?? '';
      const backwards = random() < BACKWARDS_CHANCE;
      const correct = backwards ? japanese : english;

      // DEFECT 1, ported unchanged and pinned in the test file. Wrong answers are
      // excluded by JAPANESE term, so in the forward direction — where the options
      // are English — a different term sharing this one's gloss survives the filter
      // and renders as a second copy of the right answer. Both then count as
      // correct. Slice 8 owns the fix.
      const wrong = shuffled(
        pool.filter((other) => other[0] !== japanese),
        random,
      )
        .slice(0, OPTIONS_PER_QUESTION - 1)
        .map((other) => (backwards ? (other[0] ?? '') : (other[1] ?? '')));

      return {
        prompt: backwards ? english : japanese,
        hint: backwards ? 'Which term means this?' : 'What does this mean?',
        correct,
        options: shuffled([correct, ...wrong], random),
      };
    });
}

// Every question the kumite in range can be asked, before the round is drawn from
// them: for each sequence, one "what comes next" per step, one "which kumite is
// this", and one "which side".
type Candidate =
  | { readonly kind: 'next'; readonly kumite: Kumite; readonly step: number }
  | { readonly kind: 'which'; readonly kumite: Kumite }
  | { readonly kind: 'side'; readonly kumite: Kumite };

export function kumiteRound(options: {
  readonly kumite: readonly Kumite[];
  readonly upTo: number;
  readonly random: () => number;
}): readonly Question[] {
  const { kumite, upTo, random } = options;
  const inRange = kumite.filter((each) => each.n <= upTo);

  // Every step in range, deduplicated: the wrong answers for "what comes next" come
  // from the whole vocabulary a student has met, not just from this sequence.
  const vocabulary = [...new Set(inRange.flatMap((each) => each.steps))];

  const candidates: readonly Candidate[] = inRange.flatMap((each) => [
    ...each.steps.map((_, step) => ({ kind: 'next', kumite: each, step }) as const),
    { kind: 'which', kumite: each } as const,
    { kind: 'side', kumite: each } as const,
  ]);

  return shuffled(candidates, random)
    .slice(0, ROUND_LENGTH)
    .map((candidate) => askAbout(candidate, { vocabulary, inRange, random }));
}

function askAbout(
  candidate: Candidate,
  context: { readonly vocabulary: readonly string[]; readonly inRange: readonly Kumite[]; readonly random: () => number },
): Question {
  const { vocabulary, inRange, random } = context;
  const kumite = candidate.kumite;

  if (candidate.kind === 'side') {
    return {
      prompt: `Kumite ${kumite.n}:  ${kumite.steps.join(STEP_JOIN)}`,
      hint: 'Same side (SS) or opposite side (OS)?',
      correct: kumite.side,
      options: shuffled(['OS', 'SS'], random),
    };
  }

  if (candidate.kind === 'which') {
    // DEFECT 4, ported unchanged and pinned in the test file. The wrong answers are
    // the OTHER kumite in range, so a range below five cannot supply three of them
    // and the question offers fewer than four options. The menu only ever asks for
    // 1-6 or 1-12, so this is unreachable today. Slice 8 owns the fix.
    const others = shuffled(
      inRange.filter((other) => other.n !== kumite.n),
      random,
    )
      .slice(0, OPTIONS_PER_QUESTION - 1)
      .map((other) => `Kumite ${other.n}`);
    const correct = `Kumite ${kumite.n}`;

    return {
      prompt: kumite.steps.join(STEP_JOIN),
      hint: 'Which kumite is this?',
      correct,
      options: shuffled([correct, ...others], random),
    };
  }

  const correct = kumite.steps[candidate.step] ?? '';
  const wrong = shuffled(
    vocabulary.filter((step) => step !== correct),
    random,
  ).slice(0, OPTIONS_PER_QUESTION - 1);

  const opening = candidate.step === 0;
  return {
    prompt: opening
      ? `Kumite ${kumite.n} (${kumite.side}) opens with…`
      : `Kumite ${kumite.n}:  ${kumite.steps.slice(0, candidate.step).join(STEP_JOIN)}${STEP_JOIN}?`,
    hint: opening ? 'The attack that starts it' : 'What comes next?',
    correct,
    options: shuffled([correct, ...wrong], random),
  };
}
