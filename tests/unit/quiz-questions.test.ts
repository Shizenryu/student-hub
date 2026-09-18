import { describe, expect, it } from 'vitest';

import { KUMITE, TERMS } from '../../src/data';
import type { Kumite, TermPair } from '../../src/data';
import { ROUND_LENGTH, kumiteRound, termsRound } from '../../src/domain/quiz-questions';
import { mixing, noShuffle } from './random-sources';

// Why crafted data rather than the real content: the rules about small pools at the
// bottom of this file — a shared gloss, a range too short to supply three wrong
// answers — cannot be reached through the UI with the content the site ships, so
// each case builds the terms or kumite that reach it. The rules themselves are
// described in src/domain/quiz-questions.ts.

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
    // three steps long, so one of them alone could not supply three wrong answers.
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

// --- small pools -------------------------------------------------------------
//
// None of what follows is reachable with the content the site ships: every level
// and both ranges can supply three wrong answers of their own, and no two terms
// share a gloss. These are guards against a future content edit, on content that
// is edited by hand — and the rule they pin, own pool first and the whole content
// only after, is what keeps a Beginner from meeting a Dan-grade term today.

describe('a terminology question offers four distinct options, one of them right', () => {
  // Wrong answers are chosen by the text a student will SEE — the gloss when asked
  // forwards, the Japanese when asked backwards — never the same text twice, and
  // never the right answer's text. Two terms sharing a gloss is what makes that
  // matter; there are none in the shipped terms, and one added tomorrow would
  // produce these fixtures.

  it('never offers the same text twice, even when two terms share a gloss', () => {
    // 'kick' is shared. On the 'kick' question it is the right answer; on every
    // other question it sits among the wrong candidates twice. Both must dedupe.
    const terms = termsOf('1', [
      ['keri', 'kick'],
      ['geri', 'kick'],
      ['zuki', 'punch'],
      ['uke', 'block'],
      ['dachi', 'stance'],
    ]);

    const round = termsRound({ terms, level: 1, random: forward });

    expect(round.questions).toHaveLength(5);
    for (const question of round.questions) {
      expect(question.options, `"${question.prompt}"`).toHaveLength(4);
      expect(new Set(question.options).size, `"${question.prompt}" repeats an option`).toBe(4);
      expect(question.options.filter((option) => option === question.correct)).toHaveLength(1);
    }
  });

  it('draws every wrong answer from the level being studied when it has enough', () => {
    // Own pool first: a Beginner must never see a Dan-grade term while tier 1 can
    // supply three wrong answers of its own. A mixing source, not a no-swap one:
    // tier 1 sits first in the content, so a source that never moves anything
    // would let an implementation that pools every tier together pass this.
    const tierOne: readonly TermPair[] = [
      ['ichi', 'one'],
      ['ni', 'two'],
      ['san', 'three'],
      ['shi', 'four'],
      ['go', 'five'],
    ];
    const terms = {
      '1': tierOne,
      '4': [
        ['roku', 'six'],
        ['shichi', 'seven'],
        ['hachi', 'eight'],
      ],
    } satisfies Readonly<Record<string, readonly TermPair[]>>;
    const tierOneTexts = tierOne.flat();

    const round = termsRound({ terms, level: 1, random: mixing(7) });

    expect(round.questions).toHaveLength(5);
    for (const question of round.questions) {
      for (const option of question.options) {
        expect(tierOneTexts, `"${option}" is not a tier-1 term`).toContain(option);
      }
    }
  });

  it('draws the rest from other tiers when the level cannot supply three', () => {
    const terms = {
      '1': [
        ['keri', 'kick'],
        ['geri', 'kick'],
      ],
      '2': [
        ['zuki', 'punch'],
        ['uke', 'block'],
        ['dachi', 'stance'],
      ],
    } satisfies Readonly<Record<string, readonly TermPair[]>>;

    const round = termsRound({ terms, level: 1, random: forward });

    expect(round.questions).toHaveLength(2);
    for (const question of round.questions) {
      expect(question.correct).toBe('kick');
      expect([...question.options].sort()).toEqual(['block', 'kick', 'punch', 'stance']);
    }
  });

  it('offers what exists when the whole content has fewer than four distinct glosses', () => {
    const terms = {
      '1': [
        ['keri', 'kick'],
        ['geri', 'kick'],
      ],
      '2': [['zuki', 'punch']],
    } satisfies Readonly<Record<string, readonly TermPair[]>>;

    const [question] = termsRound({ terms, level: 1, random: forward }).questions;

    expect([...(question?.options ?? [])].sort()).toEqual(['kick', 'punch']);
  });
});

describe('a short level yields a short round', () => {
  it('asks every term once when there are fewer than ten', () => {
    // A tier of three. Every shipped tier has at least thirteen terms, so a round
    // is ten today; the island counts and scores against whatever this returns.
    const terms = termsOf('1', [
      ['ichi', 'one'],
      ['ni', 'two'],
      ['san', 'three'],
    ]);

    const round = termsRound({ terms, level: 1, random: noShuffle });

    expect(round.questions).toHaveLength(3);
  });
});

describe('a kumite question offers four distinct options for any range', () => {
  // The same rule as the terminology questions: wrong answers come from the range
  // being studied first, and from the sequences beyond it only when the range
  // cannot supply three. The menu offers 1–6 and 1–12, both of which can, so today
  // a student never meets a sequence from beyond their range; a "Kumite 1–3"
  // button would, and these are what it would get.

  const NEXT_HINTS = ['The attack that starts it', 'What comes next?'];

  it('names sequences beyond the range when the range has too few others', () => {
    // A range of three leaves two others; the fourth sequence supplies the third.
    const kumite = [
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
      kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
      kumiteOf(4, 'SS', ['ushiro-geri', 'shuto-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 3, random: noShuffle });
    const which = round.questions.filter((question) => question.hint === 'Which kumite is this?');

    expect(which.length).toBeGreaterThan(0);
    for (const question of which) {
      expect([...question.options].sort()).toEqual(['Kumite 1', 'Kumite 2', 'Kumite 3', 'Kumite 4']);
    }
  });

  it('offers what exists when the whole content has fewer than four sequences', () => {
    const kumite = [
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
      kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 3, random: noShuffle });
    const [which] = round.questions.filter((question) => question.hint === 'Which kumite is this?');

    expect([...(which?.options ?? [])].sort()).toEqual(['Kumite 1', 'Kumite 2', 'Kumite 3']);
  });

  it('never reaches beyond the range while the range can supply the wrong answers', () => {
    // Six in range, one beyond. Neither its name nor its steps may appear in any
    // option of any question, for either shape that draws wrong answers. The one
    // beyond is listed FIRST, so an implementation that pooled everything together
    // would pick it before anything in range, whatever the random source does.
    const kumite = [
      kumiteOf(7, 'OS', ['ura-zuki', 'kaki-uke']),
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai', 'gyaku-zuki']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke']),
      kumiteOf(3, 'OS', ['mawashi-geri', 'age-uke']),
      kumiteOf(4, 'SS', ['ushiro-geri', 'shuto-uke']),
      kumiteOf(5, 'OS', ['hiza-geri', 'sekui-uke']),
      kumiteOf(6, 'SS', ['tobikomi-zuki', 'nagashi-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 6, random: noShuffle });

    expect(round.questions).toHaveLength(ROUND_LENGTH);
    for (const question of round.questions) {
      for (const option of question.options) {
        expect(['Kumite 7', 'ura-zuki', 'kaki-uke'], `"${option}" is from beyond the range`).not.toContain(option);
      }
    }
  });

  it('draws what-comes-next wrong answers from beyond the range when the range has too few steps', () => {
    // One sequence of three steps in range cannot supply three wrong steps for any
    // of its own questions; the sequence beyond has three new ones.
    const kumite = [
      kumiteOf(1, 'OS', ['jun-zuki', 'gedan-barai', 'gyaku-zuki']),
      kumiteOf(2, 'SS', ['mae-geri', 'soto-uke', 'age-uke']),
    ];

    const round = kumiteRound({ kumite, upTo: 1, random: noShuffle });
    const next = round.questions.filter((question) => NEXT_HINTS.includes(question.hint));

    expect(next).toHaveLength(3);
    for (const question of next) {
      expect(question.options, `"${question.prompt}"`).toHaveLength(4);
      expect(new Set(question.options).size, `"${question.prompt}" repeats an option`).toBe(4);
      expect(question.options).toContain(question.correct);
    }
  });
});
