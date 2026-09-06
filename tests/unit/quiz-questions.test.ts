import { describe, expect, it } from 'vitest';

import { KUMITE, TERMS } from '../../src/data';
import type { Kumite, TermPair } from '../../src/data';
import { ROUND_LENGTH, kumiteRound, termsRound } from '../../src/domain/quiz-questions';
import { noShuffle } from './random-sources';

// Why crafted data rather than the real content: the three defects pinned at the
// bottom of this file cannot be reached through the UI at all, so each one has to
// build the terms or kumite that trigger it. The rules themselves are described in
// src/domain/quiz-questions.ts.

// The direction roll is `random() < 0.3`. `forward` doubles as a no-swap shuffle at
// these sizes — Math.floor(0.9 * (n + 1)) === n for any n below 9 — which is why
// the forward tests can also name the term they expect. `backwards` genuinely
// shuffles as well as flipping the direction, so tests using it assert shape rather
// than which term came first.
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
  const fourTiers: Readonly<Record<string, readonly TermPair[]>> = {
    '1': [['ichi', 'one']],
    '2': [['ni', 'two']],
    '3': [['san', 'three']],
    '4': [['shi', 'four']],
  };

  it('asks only about the level chosen and everything below it', () => {
    const round = termsRound({ terms: fourTiers, level: 2, random: noShuffle });

    expect(round.questions.map((question) => question.prompt).sort()).toEqual(['ichi', 'ni']);
  });

  it('asks about all four tiers when the level is Everything', () => {
    // Level 0 is the menu's "Everything" button.
    const round = termsRound({ terms: fourTiers, level: 0, random: noShuffle });

    expect(round.questions).toHaveLength(4);
  });

  it('asks ten questions when there are more terms than that', () => {
    const round = termsRound({ terms: TERMS, level: 0, random: noShuffle });

    expect(round.questions).toHaveLength(ROUND_LENGTH);
  });
});

describe('a terminology question', () => {
  // One list, used both to build the round and to check what it drew from — so the
  // assertions provably describe the terms the round was given.
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['ichi', 'one'],
    ['ni', 'two'],
    ['san', 'three'],
    ['shi', 'four'],
    ['go', 'five'],
  ];
  const terms = termsOf('1', pairs);

  it('shows the Japanese and asks what it means', () => {
    const [question] = termsRound({ terms, level: 1, random: forward }).questions;
    const pair = pairs.find(([japanese]) => japanese === question?.prompt);

    expect(question?.hint).toBe('What does this mean?');
    expect(pair, `"${question?.prompt}" is not a term in this level`).toBeDefined();
    expect(question?.correct).toBe(pair?.[1]);
  });

  it('sometimes shows the English and asks for the term instead', () => {
    const round = termsRound({ terms, level: 1, random: backwards });
    const question = round.questions.find(({ hint }) => hint === 'Which term means this?');
    const pair = pairs.find(([, english]) => english === question?.prompt);

    expect(question, 'no question was asked backwards').toBeDefined();
    expect(pair, `"${question?.prompt}" is not a gloss in this level`).toBeDefined();
    expect(question?.correct).toBe(pair?.[0]);
  });

  it('offers four options, one of them right', () => {
    const [question] = termsRound({ terms, level: 1, random: forward }).questions;

    expect(question?.options).toHaveLength(4);
    expect(question?.options).toContain(question?.correct);
  });

  it('draws its wrong answers from the terms being studied', () => {
    const [question] = termsRound({ terms, level: 1, random: forward }).questions;
    const glosses = pairs.map(([, english]) => english);

    for (const option of question?.options ?? []) {
      expect(glosses, `"${option}" is not one of the terms in this level`).toContain(option);
    }
  });

  it('asks backwards about three times in ten', () => {
    // A range rather than a count: the point is that both directions occur, not
    // that a particular sequence of rolls produces a particular tally.
    const rolls = [0.1, 0.9, 0.9, 0.2, 0.9];
    let index = 0;
    const scripted = () => rolls[index++ % rolls.length] ?? 0.9;

    const round = termsRound({ terms, level: 1, random: scripted });
    const backwardsCount = round.questions.filter(({ hint }) => hint === 'Which term means this?').length;

    expect(backwardsCount).toBeGreaterThan(0);
    expect(backwardsCount).toBeLessThan(round.questions.length);
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
    // without exercising it, which is how a test passes against a function that has
    // stopped returning anything.
    expect(round.questions.length).toBeGreaterThan(0);
    for (const question of round.questions) {
      expect(question.prompt).not.toContain('mae-geri');
    }
  });

  it('asks ten questions from the full set', () => {
    // The real twelve kumite offer far more than ten candidates, so this is a cap
    // being applied rather than a shortage.
    const round = kumiteRound({ kumite: KUMITE, upTo: 12, random: noShuffle });

    expect(round.questions).toHaveLength(ROUND_LENGTH);
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

  // A factory rather than a shared value: a throw inside kumiteRound then fails the
  // test that provoked it rather than the whole file's collection.
  const askedWithHint = (hint: string) =>
    kumiteRound({ kumite, upTo: 6, random: noShuffle }).questions.filter((question) => question.hint === hint);

  it('asks what opens a sequence', () => {
    const [question] = askedWithHint('The attack that starts it');

    expect(question?.prompt).toBe('Kumite 1 (OS) opens with…');
    expect(question?.correct).toBe('jun-zuki');
  });

  it('asks what comes next, showing the steps so far', () => {
    const [question] = askedWithHint('What comes next?');

    expect(question?.prompt).toBe('Kumite 1:  jun-zuki  »  ?');
    expect(question?.correct).toBe('gedan-barai');
  });

  it('draws what-comes-next wrong answers from every step in range', () => {
    // Not just from the sequence being asked about. These sequences are two and
    // three steps long, so one of them could not supply three wrong answers and the
    // question would quietly offer fewer options — defect 4's shape, arriving
    // somewhere nobody was looking for it.
    const [question] = askedWithHint('What comes next?');
    const ownSteps = ['jun-zuki', 'gedan-barai', 'gyaku-zuki'];
    const fromElsewhere = (question?.options ?? []).filter((option) => !ownSteps.includes(option));

    expect(question?.options).toHaveLength(4);
    expect(fromElsewhere.length).toBeGreaterThan(0);
  });

  it('asks which kumite a sequence is', () => {
    const [question] = askedWithHint('Which kumite is this?');

    expect(question?.prompt).toBe('jun-zuki  »  gedan-barai  »  gyaku-zuki');
    expect(question?.correct).toBe('Kumite 1');
    expect(question?.options).toHaveLength(4);
  });

  it('asks which side a sequence is worked on', () => {
    const [question] = askedWithHint('Same side (SS) or opposite side (OS)?');

    expect(question?.prompt).toBe('Kumite 1:  jun-zuki  »  gedan-barai  »  gyaku-zuki');
    expect(question?.correct).toBe('OS');
    expect(question?.options).toEqual(expect.arrayContaining(['OS', 'SS']));
    expect(question?.options).toHaveLength(2);
  });
});

describe('what a round records about itself', () => {
  // The best-score key is persisted to localStorage and has to stay byte-identical
  // with what public/assets/store.js writes until that file retires — so it is
  // built in this module, where a node test can see it, rather than in the island
  // where only a browser could.
  it('names the level for a terminology round', () => {
    expect(termsRound({ terms: TERMS, level: 3, random: noShuffle }).bestKey).toBe('level3');
    expect(termsRound({ terms: TERMS, level: 0, random: noShuffle }).bestKey).toBe('level0');
  });

  it('names the range for a kumite round', () => {
    expect(kumiteRound({ kumite: KUMITE, upTo: 6, random: noShuffle }).bestKey).toBe('kumite6');
  });

  it('says which practice a round counts as', () => {
    // The island logs this to the practice tracker: 'terms' or 'kumite'.
    expect(termsRound({ terms: TERMS, level: 1, random: noShuffle }).mode).toBe('terms');
    expect(kumiteRound({ kumite: KUMITE, upTo: 12, random: noShuffle }).mode).toBe('kumite');
  });
});

// --- the defects -------------------------------------------------------------
//
// These three assert behaviour that is WRONG, so slice 8 has something to turn red
// and nobody corrects the code in passing and wonders why nothing failed. The
// mechanism of each is described where it lives, in src/domain/quiz-questions.ts;
// what follows is only the data that triggers it.
//
// All three are unreachable with the content the site ships, which is why slice 8's
// fixes will change nothing a student currently sees. They are guards against a
// future content edit, on content that is edited by hand.

describe('DEFER(slice-8) defect 1: a shared English gloss makes a question unanswerable', () => {
  it('offers the same answer twice when two terms mean the same thing', () => {
    // Two terms, one gloss. There are no shared glosses in the shipped terms; one
    // added tomorrow would produce this.
    const terms = termsOf('1', [
      ['keri', 'kick'],
      ['geri', 'kick'],
      ['zuki', 'punch'],
      ['uke', 'block'],
      ['dachi', 'stance'],
    ]);

    const round = termsRound({ terms, level: 1, random: forward });
    const kickQuestion = round.questions.find((question) => question.correct === 'kick');
    const kicks = (kickQuestion?.options ?? []).filter((option) => option === 'kick');

    expect(kicks.length, 'DEFECT 1: the correct answer should appear exactly once').toBeGreaterThan(1);
  });
});

describe('DEFER(slice-8) defect 2: a short level still says ten questions', () => {
  it('builds a round shorter than the length the progress display uses', () => {
    // A tier of three. Every shipped tier has at least thirteen terms, so today the
    // display and the score always agree.
    const terms = termsOf('1', [
      ['ichi', 'one'],
      ['ni', 'two'],
      ['san', 'three'],
    ]);

    const round = termsRound({ terms, level: 1, random: noShuffle });

    // The length is the guard — "shorter than ten" alone is satisfied by a round of
    // nothing — and the comparison is the statement of intent.
    expect(round.questions).toHaveLength(3);
    expect(round.questions.length, 'DEFECT 2: the round is shorter than the displayed total').toBeLessThan(
      ROUND_LENGTH,
    );
  });
});

describe('DEFER(slice-8) defect 4: a small kumite range loses an option', () => {
  it('offers three options instead of four when there are too few other kumite', () => {
    // A range of three leaves only two other kumite to draw wrong answers from. The
    // menu offers 1-6 and 1-12, so this is unreachable; a "Kumite 1-3" button would
    // reach it.
    const kumite = [
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
      kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 3, random: noShuffle });
    const [which] = round.questions.filter((question) => question.hint === 'Which kumite is this?');

    expect(which?.options, 'DEFECT 4: every question should offer four options').toHaveLength(3);
  });
});
