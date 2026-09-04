import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { DECKS } from '../../src/data';
import { astroEscapeText } from './astro-html';

// Nothing else proves this route ships.
//
// public/flashcards.html used to sit in public-passthrough's LEGACY_PAGES, so the
// build asserted a flashcards page existed; removing that line on migration leaves
// a hole. Delete src/pages/flashcards.astro and the build succeeds, every other
// suite stays green, /flashcards 404s and the new 301 points at a dead URL. The
// browser suite cannot see it either — it renders the component and never asks
// whether a page was emitted. Same lesson as tests/build/practice-route.test.ts.
const FLASHCARDS_PAGE = join('dist', 'flashcards', 'index.html');

// These assert the counts as plain text on purpose, with no allowance for React's
// text-node splitting. React separates adjacent text nodes with an empty comment,
// so `{count} cards` would ship as `11<!-- --> cards` — invisible to a reader, but
// it splits the text run and changes how the browser shapes it, which was enough
// to stop the page matching the one it replaced pixel for pixel. Flashcards.tsx
// builds each count as a single expression to avoid that, and these assertions are
// what keeps it that way.

describe('the flashcards route (/flashcards)', () => {
  let html: string;

  beforeAll(async () => {
    if (!existsSync(FLASHCARDS_PAGE)) {
      throw new Error(`${FLASHCARDS_PAGE} is missing — run \`npm run build\`, or the route no longer exists`);
    }
    html = await readFile(FLASHCARDS_PAGE, 'utf8');
  });

  it('is served at a directory URL, so /flashcards.html needs no forced redirect', () => {
    expect(existsSync(join('dist', 'flashcards.html'))).toBe(false);
  });

  it('shows the heading pair the page has always opened with', () => {
    expect(html).toContain('>SHIZENRYU FLASHCARDS<');
    expect(html).toContain('>The ideas behind the art<');
  });

  it('ships the container the island portals its streak chip into', () => {
    expect(html).toContain('id="streakChip"');
  });

  it('server-renders every deck with its card count, and Everything with the total', () => {
    // Derived from src/data, not a second copy of the deck list: these counts are
    // the only thing on the menu a student uses to choose, and a stale one is
    // invisible until they finish a deck earlier or later than it promised.
    for (const deck of DECKS) {
      expect(html, `${deck.name} is missing from the built menu`).toContain(astroEscapeText(deck.name));
      expect(html, `${deck.name}'s card count is missing`).toContain(`${deck.cards.length} cards`);
    }

    const total = DECKS.reduce((count, deck) => count + deck.cards.length, 0);
    expect(html).toContain(`${total} cards`);
    // Six decks plus Everything.
    expect(html.match(/class="deck-btn/g) ?? []).toHaveLength(DECKS.length + 1);
  });

  it('hydrates — the deck buttons are inert markup otherwise', () => {
    expect(html).toContain('<astro-island');
  });

  it('explains how to use the cards before a student picks a deck', () => {
    expect(html).toContain('Read the front, answer in your head, tap to flip.');
  });

  it('has no inline style attribute', () => {
    // The legacy page had one, on the streak chip.
    expect(html).not.toContain('style="');
  });
});
