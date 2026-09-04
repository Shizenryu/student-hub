import { beforeEach, describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import Flashcards from '../../src/components/Flashcards';
import { DECKS } from '../../src/data';
import { mountChipTarget, seed, stored, today } from './progress';

// The page's own stylesheet, which src/pages/flashcards.astro imports. Without it
// "the grading buttons are hidden until the card is flipped" would be a claim
// about a class name rather than about what a student can see and press --- the
// buttons are held in place with visibility, so only the CSS makes it true.
import '../../src/styles/flashcards.css';

// The flashcards island in a real browser against real localStorage. The queue's
// ordering rules are proven in tests/unit/flashcards-queue.test.ts with a
// deterministic random source; what is left to prove here is the three screens,
// the flip, and that grading reaches the student's stored progress.
//
// localStorage is cleared before every test by tests/browser/setup.ts.

beforeEach(() => {
  mountChipTarget();
});

// Both faces of the card are in the DOM at once — that is how the 3D flip works —
// so "what does the card say" has to name a face. The faces are distinguished
// only by a transform, so their classes are the only handle there is.
const faceText = (face: 'front' | 'back'): string =>
  document.querySelector(`.face.${face} .txt`)?.textContent ?? '';

// The grading buttons are held in place with `visibility` so revealing the answer
// does not move the card. That also takes them out of the accessibility tree,
// which is why their state is read here rather than queried by role.
const visibilityOf = (selector: string): string => {
  const element = document.querySelector(selector);
  return element === null ? 'missing' : getComputedStyle(element).visibility;
};

// The flip control's accessible name is whichever face is showing — that is the
// point of it, so a screen-reader user hears the question and not the answer. It
// therefore CHANGES when the card flips, and a role query that worked before the
// first flip cannot find it after. Tests address the control by its element.
const flipCard = async (): Promise<void> => {
  document.querySelector<HTMLElement>('.flash')?.click();
  // Long enough for React to commit the state change before the next assertion
  // reads the DOM directly. Assertions that go through expect.poll do not need it;
  // the ones reading getComputedStyle or a class list do.
  await new Promise((resolve) => setTimeout(resolve, 60));
};

const isFlipped = (): boolean => document.querySelector('.flash')?.classList.contains('flipped') ?? false;

// A deterministic deck to study: the smallest real one, so a test can finish it
// without forty clicks. Reduced rather than sorted, so there is no index to assert
// is present --- this project does not allow non-null assertions.
const smallestDeck = DECKS.reduce((smallest, deck) => (deck.cards.length < smallest.cards.length ? deck : smallest));

// The deck name and the count share a line with no role of their own, so these
// read them off the elements directly rather than through a text query that would
// also match their ancestors.
const metaText = (index: number): string =>
  document.querySelectorAll('.meta span')[index]?.textContent ?? '';

const startSmallestDeck = async () => {
  const screen = await render(<Flashcards decks={DECKS} />);
  await screen.getByRole('button', { name: smallestDeck.name }).click();
  return screen;
};

describe('choosing what to study', () => {
  test('offers every deck with its card count, and Everything with the total', async () => {
    const screen = await render(<Flashcards decks={DECKS} />);

    for (const deck of DECKS) {
      await expect
        .element(screen.getByRole('button', { name: deck.name }))
        .toHaveTextContent(`${deck.cards.length} cards`);
    }

    const total = DECKS.reduce((n, deck) => n + deck.cards.length, 0);
    await expect.element(screen.getByRole('button', { name: /Everything/ })).toHaveTextContent(`${total} cards`);
  });

  test('starts the deck it was given, showing how many are to go', async () => {
    await startSmallestDeck();

    await expect.poll(() => metaText(0)).toBe(smallestDeck.name.toUpperCase());
    await expect.poll(() => metaText(1)).toBe(`${smallestDeck.cards.length} TO GO`);
  });

  test('goes back to the decks without grading anything', async () => {
    const screen = await startSmallestDeck();

    await screen.getByRole('button', { name: /back to decks/ }).click();

    await expect.element(screen.getByRole('button', { name: /Everything/ })).toBeVisible();
    expect(stored()).toBeNull();
  });
});

describe('the card', () => {
  test('hides the answer, and the grading buttons with it, until it is flipped', async () => {
    await startSmallestDeck();

    // Asserted on computed visibility rather than through getByRole, which cannot
    // express this: the buttons are hidden with `visibility`, so the browser drops
    // them from the accessibility tree entirely and a role query simply never
    // resolves. What matters to a student is that they cannot see or press them,
    // and that is exactly what this reads.
    await expect.poll(() => visibilityOf('.got')).toBe('hidden');
    expect(visibilityOf('.again')).toBe('hidden');
    expect(isFlipped()).toBe(false);
  });

  test('reveals the answer and the grading buttons when tapped', async () => {
    const screen = await startSmallestDeck();

    await flipCard();

    await expect.element(screen.getByRole('button', { name: 'Got it' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Again' })).toBeVisible();
    expect(isFlipped()).toBe(true);
  });

  test('shows the two sides of the same card, each tagged with its deck', async () => {
    await startSmallestDeck();

    const front = faceText('front');
    const pair = smallestDeck.cards.find(([question]) => question === front);

    expect(pair, `the front showed "${front}", which is not a card in this deck`).toBeDefined();
    expect(faceText('back')).toBe(pair?.[1]);
    expect(document.querySelector('.face.front .cat')?.textContent).toBe(smallestDeck.name);
  });

  test('can be flipped back', async () => {
    await startSmallestDeck();
    await flipCard();

    await flipCard();

    expect(isFlipped()).toBe(false);
  });

  test('keeps the grading buttons once the answer has been seen, even face down', async () => {
    // The legacy page's flip() only ever REMOVED the hide class; the only thing
    // that put it back was moving to the next card. So a student who reveals the
    // answer and flips back to re-read the question can still grade it.
    //
    // Tying the buttons to `flipped` instead looks equivalent and is not: they are
    // hidden with `visibility`, so they leave the tab order too and the student has
    // to flip a third time to reach them.
    await startSmallestDeck();
    await flipCard();

    await flipCard();

    expect(visibilityOf('.got')).toBe('visible');
    expect(visibilityOf('.again')).toBe('visible');
  });

  test('hides them again for the next card', async () => {
    const screen = await startSmallestDeck();
    await flipCard();

    await screen.getByRole('button', { name: 'Got it' }).click();

    await expect.poll(() => visibilityOf('.got')).toBe('hidden');
  });

  test('does not announce the answer while the card is face down', async () => {
    // Both faces are in the DOM at once and backface-visibility hides the far one
    // from the eye but not from assistive technology. Without aria-hidden the
    // button's accessible name concatenates question AND answer, so a
    // screen-reader user is told the answer on focus and the exercise is pointless.
    await startSmallestDeck();

    expect(document.querySelector('.face.front')?.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector('.face.back')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('announces the answer once it has been revealed', async () => {
    await startSmallestDeck();

    await flipCard();

    expect(document.querySelector('.face.back')?.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector('.face.front')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('grading a card', () => {
  test('"Got it" retires it and moves on', async () => {
    const screen = await startSmallestDeck();
    const first = faceText('front');
    await flipCard();

    await screen.getByRole('button', { name: 'Got it' }).click();

    await expect.poll(() => metaText(1)).toBe(`${smallestDeck.cards.length - 1} TO GO`);
    expect(faceText('front')).not.toBe(first);
    // The next card arrives face down, whatever the last one was.
    expect(isFlipped()).toBe(false);
  });

  test('"Again" sends the card to the back, so the count does not fall', async () => {
    const screen = await startSmallestDeck();
    await flipCard();

    await screen.getByRole('button', { name: 'Again' }).click();

    await expect.poll(() => metaText(1)).toBe(`${smallestDeck.cards.length} TO GO`);
  });

  test('brings a missed card back round', async () => {
    const screen = await startSmallestDeck();
    const missed = faceText('front');
    await flipCard();
    await screen.getByRole('button', { name: 'Again' }).click();

    // Work through the rest of the deck; the missed card must be waiting at the end.
    for (let remaining = smallestDeck.cards.length - 1; remaining > 0; remaining--) {
      await flipCard();
      await screen.getByRole('button', { name: 'Got it' }).click();
    }

    expect(faceText('front')).toBe(missed);
  });

  test('records a missed card so it comes first next time', async () => {
    const screen = await startSmallestDeck();
    await flipCard();

    await screen.getByRole('button', { name: 'Again' }).click();

    // One entry in the miss queue. Its key is a hash, so the count is what matters.
    const state = stored();
    const misses = typeof state === 'object' && state !== null && 'miss' in state ? state.miss : null;
    expect(Object.values(misses ?? {})).toEqual([1]);
  });
});

describe('finishing a deck', () => {
  const finishDeck = async () => {
    const screen = await startSmallestDeck();
    for (let remaining = smallestDeck.cards.length; remaining > 0; remaining--) {
      await flipCard();
      await screen.getByRole('button', { name: 'Got it' }).click();
    }
    return screen;
  };

  test('says how many cards were mastered', async () => {
    const screen = await finishDeck();

    await expect
      .element(screen.getByText(`Deck complete — ${smallestDeck.cards.length} cards mastered.`))
      .toBeVisible();
  });

  test('praises a clean first pass', async () => {
    const screen = await finishDeck();

    await expect.element(screen.getByText(/First pass, no repeats. Grading standard./)).toBeVisible();
  });

  test('counts the cards that needed a second look', async () => {
    const screen = await startSmallestDeck();
    await flipCard();
    await screen.getByRole('button', { name: 'Again' }).click();
    for (let remaining = smallestDeck.cards.length; remaining > 0; remaining--) {
      await flipCard();
      await screen.getByRole('button', { name: 'Got it' }).click();
    }

    await expect.element(screen.getByText(/1 card needed a second look/)).toBeVisible();
  });

  test('records the session as philosophy practice and keeps the streak', async () => {
    await finishDeck();

    expect(stored()).toEqual({
      miss: {},
      plog: { [String(today())]: ['philosophy'] },
      streak: { last: today(), count: 1, best: 1 },
    });
  });

  test('mentions the streak only once it is worth mentioning', async () => {
    // One day is not a streak worth announcing; the legacy page starts at two.
    const screen = await finishDeck();

    await expect.element(screen.getByText(/day streak\./)).not.toBeInTheDocument();
  });

  test('announces a streak of two or more', async () => {
    seed({ streak: { last: today() - 1, count: 4, best: 9 } });

    const screen = await finishDeck();

    await expect.element(screen.getByText(/🔥 5-day streak\./)).toBeVisible();
  });

  test('can study the same deck again', async () => {
    const screen = await finishDeck();

    await screen.getByRole('button', { name: 'Study again' }).click();

    await expect.poll(() => metaText(1)).toBe(`${smallestDeck.cards.length} TO GO`);
    await expect.poll(() => metaText(0)).toBe(smallestDeck.name.toUpperCase());
  });
});

describe('studying Everything', () => {
  test('restarts Everything rather than a deck that happens to share a name', async () => {
    // The legacy page restarted Everything by looking it up by name, missing, and
    // getting the -1 that startDeck uses as its Everything sentinel. That accident
    // is gone; this pins the behaviour it produced.
    const screen = await render(<Flashcards decks={DECKS} />);
    const total = DECKS.reduce((n, deck) => n + deck.cards.length, 0);
    await screen.getByRole('button', { name: /Everything/ }).click();

    await screen.getByRole('button', { name: /back to decks/ }).click();
    await screen.getByRole('button', { name: /Everything/ }).click();

    await expect.poll(() => metaText(1)).toBe(`${total} TO GO`);
  });
});
