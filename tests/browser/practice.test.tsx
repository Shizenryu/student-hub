import { beforeEach, describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import Practice from '../../src/components/Practice';
import { PRACTICE } from '../../src/data';
import { mountChipTarget, seed, stored, today } from './progress';

// The practice island, driven in a real browser against real localStorage — which
// is the whole reason this page is an island rather than a static route. The store
// is exercised here exactly as a student's browser will exercise it, not through a
// fake: tests/unit/ already proves the store's rules in isolation, so what is left
// to prove is the wiring.
//
// localStorage is cleared before every test by tests/browser/setup.ts.

beforeEach(() => {
  mountChipTarget();
});

describe('choosing what you practised', () => {
  test('offers every activity from the syllabus data, with its hint', async () => {
    const screen = await render(<Practice activities={PRACTICE} />);

    for (const activity of PRACTICE) {
      // Scoped to the tile rather than searched for loose in the page: two kata
      // share the hint "About 1 minute", so a bare text query is ambiguous — and
      // what matters is that each hint sits on its OWN activity.
      const tile = screen.getByRole('button', { name: new RegExp(activity.name) });

      await expect.element(tile).toBeVisible();
      await expect.element(tile).toHaveTextContent(activity.hint);
    }
  });

  test('records an activity and keeps the streak when it is ticked', async () => {
    const screen = await render(<Practice activities={PRACTICE} />);

    await screen.getByRole('button', { name: /Stretch/ }).click();

    // Both halves matter, and they are separate calls in the legacy page: the
    // activity is logged AND the day counts as trained. A student who ticks one
    // thing has kept their streak.
    await expect.element(screen.getByText(/1 thing done today/)).toBeVisible();
    expect(stored()).toEqual({
      plog: { [String(today())]: ['stretch'] },
      streak: { last: today(), count: 1, best: 1 },
    });
  });

  test('removes the activity but leaves the streak alone when it is un-ticked', async () => {
    const screen = await render(<Practice activities={PRACTICE} />);
    await screen.getByRole('button', { name: /Stretch/ }).click();

    await screen.getByRole('button', { name: /Stretch/ }).click();

    // Un-ticking is not "I did not train after all": the streak stays. Worth being
    // precise about why, because the mutation gate showed it — the asymmetry in the
    // code (tick marks the streak, un-tick does not) is UNOBSERVABLE, since
    // markTrained is idempotent within a day and un-ticking can only follow a tick
    // that already marked it. What this pins is the guarantee that matters: nothing
    // on the un-tick path reduces the streak.
    await expect.element(screen.getByText(/Nothing yet/)).toBeVisible();
    expect(stored()).toEqual({ plog: {}, streak: { last: today(), count: 1, best: 1 } });
  });

  test('counts more than one activity in the day', async () => {
    const screen = await render(<Practice activities={PRACTICE} />);

    await screen.getByRole('button', { name: /Stretch/ }).click();
    await screen.getByRole('button', { name: /Sanchin/ }).click();

    await expect.element(screen.getByText(/2 things done today/)).toBeVisible();
  });

  test('shows what was already ticked when the page is opened again', async () => {
    seed({ plog: { [String(today())]: ['mara'] } });

    const screen = await render(<Practice activities={PRACTICE} />);

    await expect.element(screen.getByText(/1 thing done today/)).toBeVisible();
    await expect.element(screen.getByRole('button', { name: /Mara/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('the week behind you', () => {
  test('counts the two windows separately', async () => {
    const now = today();
    seed({
      plog: {
        [String(now - 1)]: ['mara', 'kihon'],
        [String(now - 3)]: ['stretch'],
        [String(now - 10)]: ['sanchin'],
        [String(now - 40)]: ['kihon'],
      },
    });

    const screen = await render(<Practice activities={PRACTICE} />);

    // Deliberately four seeds at four distances. The 10-day-old one is the load
    // bearing case: it is inside the month window and outside the week, so the two
    // numbers differ. Mutation testing found that without it, a month window that
    // was secretly the week window produced the same sentence and passed.
    // The 40-day-old entry is outside both.
    await expect.element(screen.getByText('Practised on 2 of the last 7 days · 3 of the last 30.')).toBeVisible();
  });

  test('puts each day of the week in its place, today last', async () => {
    const now = today();
    seed({ plog: { [String(now - 5)]: ['mara'], [String(now - 1)]: ['stretch', 'kihon'] } });

    await render(<Practice activities={PRACTICE} />);

    // The strip reads oldest to newest, so a day's position IS its meaning: five
    // days ago is second from the left and yesterday is second from the right.
    // Asserting only the summary left that ordering unpinned — a strip built
    // backwards showed the same counts and passed.
    await expect
      .poll(() => [...document.querySelectorAll('.week .day .dot')].map((dot) => dot.textContent))
      .toEqual(['·', '1', '·', '·', '·', '2', '·']);
  });

  test('rings today, and only today', async () => {
    await render(<Practice activities={PRACTICE} />);

    // The ring is the one thing on this page with no text and no accessible name —
    // a red border on the last dot. Its position is the whole of its meaning, so
    // the class is the only thing there is to assert.
    await expect
      .poll(() => [...document.querySelectorAll('.week .day')].map((day) => day.classList.contains('today')))
      .toEqual([false, false, false, false, false, false, true]);
  });

  test('counts today as soon as something is ticked', async () => {
    const screen = await render(<Practice activities={PRACTICE} />);

    await screen.getByRole('button', { name: /Kihon/ }).click();

    await expect.element(screen.getByText('Practised on 1 of the last 7 days · 1 of the last 30.')).toBeVisible();
  });
});

describe('the streak chip', () => {
  test('says nothing when there is no streak', async () => {
    await render(<Practice activities={PRACTICE} />);

    // Asserted on the real element rather than a test id: the chip is a plain
    // container the page owns, and adding a data-testid to production markup to
    // check it is empty would be the tail wagging the dog.
    await expect.poll(() => document.getElementById('streakChip')?.textContent).toBe('');
  });

  test('reads "train today to keep it" when yesterday was the last session', async () => {
    seed({ streak: { last: today() - 1, count: 4, best: 9 } });

    const screen = await render(<Practice activities={PRACTICE} />);

    await expect.element(screen.getByText('🔥 4-day streak — train today to keep it')).toBeVisible();
  });

  test('drops the reminder once today counts', async () => {
    seed({ streak: { last: today() - 1, count: 4, best: 9 } });
    const screen = await render(<Practice activities={PRACTICE} />);

    await screen.getByRole('button', { name: /Stretch/ }).click();

    // Note the wording: this page says "5-day streak", where the home page says
    // "5-day training streak". That divergence is pre-existing and deliberate —
    // unifying them is a content decision, not a port decision.
    await expect.element(screen.getByText('🔥 5-day streak')).toBeVisible();
  });
});

describe('a browser that will not store anything', () => {
  test('still lets the student tick things for the length of the visit', async () => {
    // localStorage exists but is full. The page must keep working rather than
    // throwing on the first tap.
    const setItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    };

    try {
      const screen = await render(<Practice activities={PRACTICE} />);

      await screen.getByRole('button', { name: /Stretch/ }).click();

      await expect.element(screen.getByText(/1 thing done today/)).toBeVisible();
    } finally {
      localStorage.setItem = setItem;
    }
  });
});
