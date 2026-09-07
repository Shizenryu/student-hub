import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import Quiz from '../../src/components/Quiz';
import { KUMITE, MAXIMS, TERMS } from '../../src/data';
import type { TermPair } from '../../src/data';
import { mountChipTarget, seed, stored, today } from './progress';

// The page's own stylesheet, which src/pages/quiz.astro imports.
import '../../src/styles/quiz.css';

// The quiz island in a real browser against real localStorage. Which questions a
// round contains is proven in tests/unit/quiz-questions.test.ts and the wording in
// tests/unit/quiz-labels.test.ts; what is left to prove here is the three screens,
// what answering does, and that finishing reaches the student's stored progress.
//
// localStorage is cleared before every test by tests/browser/setup.ts.

// The island reads the ambient Math.random, exactly as Flashcards.tsx does. Stubbing
// it here rather than adding a `random` prop keeps the seam out of the production
// API: an Astro island's props are serialised to JSON, so a function could not be
// passed from the route anyway, and an optional prop only tests ever supply is a
// worse thing to own than a stub.
//
// 0.999999 is the source tests/unit/random-sources.ts calls noShuffle, and it is
// what makes a round predictable enough to answer deliberately: every swap in
// shuffled() lands on itself, so nothing is reordered, and `random() < 0.3` is
// false, so a terminology question is asked forwards. The correct answer is
// therefore always the FIRST option. Restated here rather than imported: that
// module is test data for the domain suite, and this is a browser stub.
const NO_SHUFFLE = 0.999999;

beforeEach(() => {
  mountChipTarget();
  vi.spyOn(Math, 'random').mockReturnValue(NO_SHUFFLE);
});

const quiz = () => render(<Quiz terms={TERMS} kumite={KUMITE} maxims={MAXIMS} />);

// render() resolves once the island has mounted, so every caller awaits it — the
// store is bound in an effect and nothing can be pressed before that.

const options = (): readonly HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.opt')];

const textOf = (selector: string): string => document.querySelector(selector)?.textContent ?? '';

// Long enough for React to commit the state change before the next assertion reads
// the DOM directly. Assertions that go through expect.element poll and do not need
// it; the ones reading a class list or textContent do.
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 60));

const answer = async (index: number): Promise<void> => {
  options()[index]?.click();
  await settle();
};

const pressNext = async (): Promise<void> => {
  document.querySelector<HTMLElement>('.next-btn')?.click();
  await settle();
};

// Answers a whole round by always taking the first option, and reports the score the
// page ended up showing. In terminology mode that is a perfect round; the helper
// reads the score off the screen rather than assuming, so it serves both modes.
const answerWholeRound = async (): Promise<string> => {
  for (let asked = 0; asked < 10; asked += 1) {
    await answer(0);
    await pressNext();
  }
  return textOf('.score-big');
};

const startLevel = async (name: string) => {
  const screen = await quiz();
  await screen.getByRole('button', { name }).click();
  await settle();
  return screen;
};

describe('choosing what to train', () => {
  test('offers five terminology levels and the two kumite ranges', async () => {
    const screen = await quiz();

    const menu: ReadonlyArray<readonly [string, string]> = [
      ['Beginner', 'Red & Orange · 9th–8th Kyu'],
      ['Intermediate', 'Yellow & Green · 7th–6th Kyu'],
      ['Advanced', 'Blue & Purple · 5th–4th Kyu'],
      ['Brown & Black', '3rd Kyu — Dan grades'],
      ['Everything', 'Full syllabus, all terms'],
      ['Kumite 1–6', 'Red to Green belt'],
      ['Kumite 1–12', 'The full set'],
    ];

    for (const [name, detail] of menu) {
      await expect.element(screen.getByRole('button', { name })).toHaveTextContent(detail);
    }
  });

  test('opens the round it was asked for', async () => {
    await startLevel('Beginner');

    expect(textOf('.qcount')).toBe('QUESTION 1 / 10SCORE 0');
    expect(options()).toHaveLength(4);
    expect(textOf('.hint')).toBe('What does this mean?');
  });
});

describe('answering a question', () => {
  test('praises a right answer and marks it', async () => {
    await startLevel('Beginner');
    await answer(0);

    expect(textOf('.feedback')).toBe('Correct!');
    // The class, not just the words: it is what makes the line green rather than
    // red, and swapping the two reads perfectly well in a text assertion.
    expect(document.querySelector('.feedback')?.className).toBe('feedback good');
    expect(options()[0]?.classList.contains('correct')).toBe(true);
    expect(textOf('.qcount')).toContain('SCORE 1');
  });

  test('names the answer when the student gets it wrong, and marks what they chose', async () => {
    await startLevel('Beginner');
    const correctText = options()[0]?.textContent ?? '';
    await answer(1);

    expect(textOf('.feedback')).toBe(`Not quite — it means: ${correctText}`);
    expect(document.querySelector('.feedback')?.className).toBe('feedback bad');
    expect(options()[1]?.classList.contains('wrong')).toBe(true);
    expect(options()[0]?.classList.contains('correct')).toBe(true);
    expect(textOf('.qcount')).toContain('SCORE 0');
  });

  test('closes the question, so an answer cannot be changed', async () => {
    await startLevel('Beginner');
    await answer(0);

    expect(options().every((option) => option.disabled)).toBe(true);
  });

  test('offers no way on until the question has been answered', async () => {
    await startLevel('Beginner');
    expect(document.querySelector('.next-btn')).toBeNull();

    await answer(0);
    expect(document.querySelector('.next-btn')).not.toBeNull();
  });

  test('calls out a run of three', async () => {
    await startLevel('Beginner');
    await answer(0);
    expect(textOf('.streak')).toBe('');

    await pressNext();
    await answer(0);
    await pressNext();
    await answer(0);

    expect(textOf('.streak')).toBe('\u{1F525} 3 in a row!');
  });

  test('a wrong answer ends the run', async () => {
    await startLevel('Beginner');
    for (const _ of [0, 1, 2]) {
      await answer(0);
      await pressNext();
    }
    await answer(1);

    expect(textOf('.streak')).toBe('');
  });
});

describe('finishing a round', () => {
  test('reports the score, ranks it, and quotes a maxim', async () => {
    await startLevel('Beginner');
    const score = await answerWholeRound();

    expect(score).toBe('10 / 10');
    expect(textOf('.rank')).toBe('Perfect — grading standard!');
    expect(textOf('.maxim')).toContain(`“${MAXIMS[MAXIMS.length - 1]}”`);
  });

  test('records the round as this mode’s best, logs the practice, and marks the day', async () => {
    await startLevel('Beginner');
    await answerWholeRound();

    expect(stored()).toEqual({
      best: { level1: 10 },
      plog: { [String(today())]: ['terms'] },
      streak: { last: today(), count: 1, best: 1 },
    });
    expect(textOf('.progress-line')).toBe('New personal best for this mode!  ·  Trained today ✓');
  });

  test('leaves a standing best alone and says what it is', async () => {
    seed({ best: { level1: 10 } });
    await startLevel('Beginner');

    await answer(1); // one wrong, so the round cannot beat a perfect best
    await pressNext();
    for (let asked = 1; asked < 10; asked += 1) {
      await answer(0);
      await pressNext();
    }

    expect(textOf('.score-big')).toBe('9 / 10');
    expect(textOf('.progress-line')).toBe('Your best for this mode: 10 / 10  ·  Trained today ✓');
  });

  test('counts a kumite round under its own range, not the terminology levels', async () => {
    await startLevel('Kumite 1–6');
    await answerWholeRound();

    expect(stored()).toMatchObject({ plog: { [String(today())]: ['kumite'] } });
    expect(textOf('.qcount')).toBe('');
  });

  test('trains the same level again, rather than dropping back to the menu', async () => {
    await startLevel('Beginner');
    await answerWholeRound();

    document.querySelector<HTMLElement>('.next-btn')?.click();
    await settle();

    expect(textOf('.qcount')).toBe('QUESTION 1 / 10SCORE 0');
  });

  test('goes back to the menu to change level', async () => {
    const screen = await startLevel('Beginner');
    await answerWholeRound();

    document.querySelector<HTMLElement>('.home-btn')?.click();
    await settle();

    await expect.element(screen.getByRole('button', { name: 'Everything' })).toBeVisible();
  });
});

describe('kumite rounds', () => {
  test('sets a sequence smaller than a single term, so it fits on the line', async () => {
    await startLevel('Kumite 1–6');

    // The only handle there is: the prompt element is the same one in both modes and
    // the two are told apart by a class, which is what changes its size. Asserted
    // because nothing else would notice — a kumite question set at 1.7rem still
    // reads correctly, it just runs off the page.
    expect(document.querySelector('.jp')?.className).toBe('jp seq');
  });
});

describe('DEFER(slice-8): DEFECT 2 --- a short round still counts to ten', () => {
  // The other half of the pin in tests/unit/quiz-labels.test.ts, driven through the
  // island so the counter AND the progress bar are both covered. Reachable here
  // because the content arrives as a prop: a tier of four terms is what a content
  // edit would have to do to make this bite, and no tier is anywhere near it today.
  const FOUR_TERMS: Readonly<Record<string, readonly TermPair[]>> = {
    '1': [
      ['ichi', 'one'],
      ['ni', 'two'],
      ['san', 'three'],
      ['shi', 'four'],
    ],
  };

  const startShortRound = async () => {
    const screen = await render(<Quiz terms={FOUR_TERMS} kumite={KUMITE} maxims={MAXIMS} />);
    await screen.getByRole('button', { name: 'Beginner' }).click();
    await settle();
    return screen;
  };

  test('counts towards ten, and fills the bar towards ten, in a round of four', async () => {
    await startShortRound();

    expect(textOf('.qcount')).toBe('QUESTION 1 / 10SCORE 0');

    await answer(0);
    await pressNext();

    expect(textOf('.qcount')).toBe('QUESTION 2 / 10SCORE 1');
    // One of ten, not one of four — the bar is drawn against the same wrong total.
    expect(document.querySelector<HTMLElement>('.progress div')?.style.width).toBe('10%');
  });

  test('then scores out of four, which is what the student actually answered', async () => {
    await startShortRound();
    for (let asked = 0; asked < 4; asked += 1) {
      await answer(0);
      await pressNext();
    }

    expect(textOf('.score-big')).toBe('4 / 4');
  });
});

describe('DEFER(slice-8): DEFECT 7 --- the run line outlives its round', () => {
  // A PIN, NOT A SPECIFICATION. quiz.html writes the "N in a row" line only from
  // answer(), and renderQ() never clears it. So the line a student earned on the
  // last answer of one round is still on screen for the first, unanswered question
  // of the next, claiming a run that has already been reset to zero.
  //
  // Reachable today, unlike defects 1, 2 and 4 --- any student who ends a round on a
  // run of three or more and taps "Train again" sees it. Ported unchanged.
  test('a run earned in the last round is still showing on the first question of the next', async () => {
    await startLevel('Beginner');
    await answerWholeRound();

    document.querySelector<HTMLElement>('.next-btn')?.click();
    await settle();

    expect(textOf('.streak')).toBe('\u{1F525} 10 in a row!');
  });
});

describe('the streak chip', () => {
  test('appears in the page header, and moves on once the day has been marked', async () => {
    seed({ streak: { last: today() - 1, count: 4, best: 9 } });
    const screen = await quiz();

    await expect
      .element(screen.getByText('\u{1F525} 4-day streak — train today to keep it'))
      .toBeVisible();

    await screen.getByRole('button', { name: 'Beginner' }).click();
    await settle();
    await answerWholeRound();

    // On the chip element rather than by text: finishing a round also writes the
    // same sentence into the result's own gold line, so a text query finds two.
    await expect.poll(() => document.getElementById('streakChip')?.textContent).toBe('\u{1F525} 5-day streak');
  });
});
