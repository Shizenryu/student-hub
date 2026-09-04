import { describe, expect, it } from 'vitest';

import { KUMITE, TERMS } from '../../src/data';
import type { Kumite, TermPair } from '../../src/data';
import { ROUND_LENGTH, kumiteRound, termsRound } from '../../src/domain/quiz-questions';

// The quiz's questions, built in node with a known random source.
//
// This is the largest piece of logic in the migration and almost none of it is
// observable from outside: which terms a level draws on, where the wrong answers
// come from, and how often the question is asked backwards are all decided before
// anything reaches the screen. It is also where the three remaining defects live —
// and none of them can be reached through the UI at all (see the bottom of this
// file), so a pure module driven by crafted data is the only place they can be
// pinned.

// Never swaps: Math.floor(random() * (i + 1)) === i for every i, so a shuffle
// leaves the order it was given. The clearest baseline for asserting membership.
const noShuffle = () => 0.999999;

// Always picks index 0, which is a real permutation rather than "some order".
const alwaysFirst = () => 0;

// The direction roll is `random() < 0.3`, so these two force it either way.
const forward = () => 0.9;
const backwards = () => 0.1;

const termsOf = (tier: string, pairs: ReadonlyArray<readonly [string, string]>) => ({ [tier]: pairs });

const kumiteOf = (n: number, side: string, steps: readonly string[]): Kumite => ({
  n,
  side,
  belt: '9th Kyu',
  steps,
});

describe('a terminology round draws on the right terms', () => {
  it('asks only about the level chosen and everything below it', () => {
    const terms: Readonly<Record<string, readonly TermPair[]>> = {
      '1': [['ichi', 'one']],
      '2': [['ni', 'two']],
      '3': [['san', 'three']],
      '4': [['shi', 'four']],
    };

    const round = termsRound({ terms, level: 2, random: noShuffle });

    expect(round.map((question) => question.prompt).sort()).toEqual(['ichi', 'ni']);
  });

  it('asks about all four tiers when the level is Everything', () => {
    const terms: Readonly<Record<string, readonly TermPair[]>> = {
      '1': [['ichi', 'one']],
      '2': [['ni', 'two']],
      '3': [['san', 'three']],
      '4': [['shi', 'four']],
    };

    // Level 0 is the menu's "Everything" button.
    const round = termsRound({ terms, level: 0, random: noShuffle });

    expect(round).toHaveLength(4);
  });

  it('asks ten questions when there are more terms than that', () => {
    const round = termsRound({ terms: TERMS, level: 0, random: noShuffle });

    expect(round).toHaveLength(ROUND_LENGTH);
  });
});

describe('a terminology question', () => {
  const terms = termsOf('1', [
    ['ichi', 'one'],
    ['ni', 'two'],
    ['san', 'three'],
    ['shi', 'four'],
    ['go', 'five'],
  ]);

  // The pairs these questions are drawn from, so a test can say "the prompt is a
  // Japanese term and the answer is ITS gloss" without depending on which term the
  // shuffle happened to deal first. The same random source drives both the shuffle
  // and the direction roll, so pinning a particular term would really be pinning
  // the permutation.
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ichi', 'one'],
    ['ni', 'two'],
    ['san', 'three'],
    ['shi', 'four'],
    ['go', 'five'],
  ];

  it('shows the Japanese and asks what it means', () => {
    const [question] = termsRound({ terms, level: 1, random: forward });
    const pair = pairs.find(([japanese]) => japanese === question?.prompt);

    expect(question?.hint).toBe('What does this mean?');
    expect(pair, `"${question?.prompt}" is not a term in this level`).toBeDefined();
    expect(question?.correct).toBe(pair?.[1]);
  });

  it('sometimes shows the English and asks for the term instead', () => {
    const round = termsRound({ terms, level: 1, random: backwards });
    const question = round.find(({ hint }) => hint === 'Which term means this?');
    const pair = pairs.find(([, english]) => english === question?.prompt);

    expect(question, 'no question was asked backwards').toBeDefined();
    expect(pair, `"${question?.prompt}" is not a gloss in this level`).toBeDefined();
    expect(question?.correct).toBe(pair?.[0]);
  });

  it('offers four options, one of them right', () => {
    const [question] = termsRound({ terms, level: 1, random: forward });

    expect(question?.options).toHaveLength(4);
    expect(question?.options).toContain(question?.correct);
  });

  it('draws its wrong answers from the terms being studied', () => {
    const [question] = termsRound({ terms, level: 1, random: forward });
    const englishGlosses = ['one', 'two', 'three', 'four', 'five'];

    expect(question?.options ?? []).not.toHaveLength(0);
    for (const option of question?.options ?? []) {
      expect(englishGlosses, `"${option}" is not one of the terms in this level`).toContain(option);
    }
  });

  it('asks backwards about three times in ten', () => {
    // The direction is a coin weighted 0.3. Asserted as a range rather than a
    // count, because the point is that both directions occur, not that a
    // particular sequence of rolls produces a particular tally.
    const rolls = [0.1, 0.9, 0.9, 0.2, 0.9];
    let index = 0;
    const scripted = () => rolls[index++ % rolls.length] ?? 0.9;

    const round = termsRound({ terms, level: 1, random: scripted });
    const backwardsCount = round.filter((question) => question.hint === 'Which term means this?').length;

    expect(backwardsCount).toBeGreaterThan(0);
    expect(backwardsCount).toBeLessThan(round.length);
  });
});

describe('a kumite round draws on the right kumite', () => {
  const kumite = [
    kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai']),
    kumiteOf(2, 'SS', ['gyaku-zuki', 'soto-uke']),
    kumiteOf(7, 'OS', ['mae-geri', 'gedan-barai']),
  ];

  it('leaves out kumite above the range', () => {
    const round = kumiteRound({ kumite, upTo: 2, random: noShuffle });

    // Asserted non-empty first: a loop over nothing satisfies the rule below
    // without exercising it, which is how a test passes against a function that
    // returns nothing at all.
    expect(round.length).toBeGreaterThan(0);
    for (const question of round) {
      expect(question.prompt).not.toContain('mae-geri');
    }
  });

  it('asks at most ten questions', () => {
    const round = kumiteRound({ kumite: KUMITE, upTo: 12, random: alwaysFirst });

    // The real twelve kumite offer far more than ten candidate questions, so this
    // is a cap being applied rather than a shortage.
    expect(round).toHaveLength(ROUND_LENGTH);
  });
});

describe('the three kinds of kumite question', () => {
  const kumite = [
    kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai', 'gyaku-zuki']),
    kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
    kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
    kumiteOf(4, 'SS', ['ushiro-geri', 'shuto-uke']),
    kumiteOf(5, 'OS', ['hiza-geri', 'sekui-uke']),
    kumiteOf(6, 'SS', ['tobikomi-zuki', 'nagashi-uke']),
  ];
  const round = kumiteRound({ kumite, upTo: 6, random: noShuffle });
  const withHint = (hint: string) => round.filter((question) => question.hint === hint);

  it('asks what opens a sequence', () => {
    const [question] = withHint('The attack that starts it');

    expect(question?.prompt).toBe('Kumite 1 (OS) opens with…');
    expect(question?.correct).toBe('jun-zuki');
  });

  it('asks what comes next, showing the steps so far', () => {
    const [question] = withHint('What comes next?');

    expect(question?.prompt).toBe('Kumite 1:  jun-zuki  »  ?');
    expect(question?.correct).toBe('gedan-barai');
  });

  it('draws what-comes-next wrong answers from every step in range', () => {
    // Not just from the sequence being asked about. It matters because these
    // sequences are two and three steps long: drawing from one of them could not
    // supply three wrong answers, and the question would quietly offer fewer
    // options — which is defect 4's shape, arriving somewhere it was not expected.
    // Mutation testing found this unasserted.
    const [question] = withHint('What comes next?');
    const ownSteps = ['jun-zuki', 'gedan-barai', 'gyaku-zuki'];
    const fromElsewhere = (question?.options ?? []).filter((option) => !ownSteps.includes(option));

    expect(question?.options).toHaveLength(4);
    expect(fromElsewhere.length).toBeGreaterThan(0);
  });

  it('asks which kumite a sequence is', () => {
    const [question] = withHint('Which kumite is this?');

    expect(question?.prompt).toBe('jun-zuki  »  gedan-barai  »  gyaku-zuki');
    expect(question?.correct).toBe('Kumite 1');
    expect(question?.options).toHaveLength(4);
  });

  it('asks which side a sequence is worked on', () => {
    const [question] = withHint('Same side (SS) or opposite side (OS)?');

    expect(question?.prompt).toBe('Kumite 1:  jun-zuki  »  gedan-barai  »  gyaku-zuki');
    expect(question?.correct).toBe('OS');
    expect(question?.options).toEqual(expect.arrayContaining(['OS', 'SS']));
    expect(question?.options).toHaveLength(2);
  });
});

// --- the defects -------------------------------------------------------------
//
// These three tests assert behaviour that is WRONG. They exist so slice 8 has
// something to turn red, and so nobody corrects the code in passing and wonders
// why nothing failed.
//
// All three are unreachable through the UI with the content the site ships today,
// which is why each one has to construct the data that triggers it. That is also
// why slice 8's fixes will change nothing a student currently sees: they are
// guards against a future content edit, on content that is edited by hand.

describe('defect 1: a shared English gloss makes a question unanswerable', () => {
  it('offers the same answer twice when two terms mean the same thing', () => {
    // Wrong answers are excluded by JAPANESE term, so a different term with the
    // same English gloss survives the filter — and in the forward direction the
    // options are English, so it renders as a second copy of the right answer.
    // Both are marked correct. There are no shared glosses in the shipped terms;
    // one added tomorrow would produce this.
    const terms = termsOf('1', [
      ['keri', 'kick'],
      ['geri', 'kick'],
      ['zuki', 'punch'],
      ['uke', 'block'],
      ['dachi', 'stance'],
    ]);

    const round = termsRound({ terms, level: 1, random: forward });
    const kickQuestion = round.find((question) => question.correct === 'kick');
    const kicks = (kickQuestion?.options ?? []).filter((option) => option === 'kick');

    expect(kicks.length, 'DEFECT 1: the correct answer should appear exactly once').toBeGreaterThan(1);
  });
});

describe('defect 2: a short level still says ten questions', () => {
  it('builds a round shorter than the length the progress display uses', () => {
    // The display is `QUESTION n / N_Q` with N_Q hardcoded to ten, while scoring
    // uses the real round length. Every shipped tier has at least thirteen terms,
    // so today the two always agree; a tier trimmed below ten breaks them apart.
    const terms = termsOf('1', [
      ['ichi', 'one'],
      ['ni', 'two'],
      ['san', 'three'],
    ]);

    const round = termsRound({ terms, level: 1, random: noShuffle });

    // Both halves matter. "Shorter than ten" alone is satisfied by a round of
    // nothing, which would pass against a function that had stopped working.
    expect(round).toHaveLength(3);
    expect(round.length, 'DEFECT 2: the round is shorter than the displayed total').toBeLessThan(ROUND_LENGTH);
  });
});

describe('defect 3 was fixed in #12; defect 4: a small kumite range loses an option', () => {
  it('offers three options instead of four when there are too few other kumite', () => {
    // "Which kumite is this?" draws its wrong answers from the OTHER kumite in
    // range, so a range of three leaves only two. The menu offers 1-6 and 1-12, so
    // this is unreachable today; a "Kumite 1-3" button would reach it.
    const kumite = [
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
      kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 3, random: noShuffle });
    const [which] = round.filter((question) => question.hint === 'Which kumite is this?');

    expect(which?.options, 'DEFECT 4: every question should offer four options').toHaveLength(3);
  });
});
