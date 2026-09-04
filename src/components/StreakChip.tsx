import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { STREAK_CHIP_ID } from './streak-chip-id';
import { streakLabel } from './practice-labels';
import type { StreakView } from './practice-labels';

// The streak chip belongs in the page <header>, above whatever island renders the
// rest of the page — that is where every page in this site has always put it. But
// it changes when the main island's state changes (ticking the first activity of
// the day rewrites it), so it cannot be an island of its own without a way to
// subscribe across React roots.
//
// A portal is the answer: one root, one piece of state, and the chip lands in its
// real position in the DOM. This component exists so that quiz and flashcards
// portal the same way rather than each rediscovering it — the id is shared by
// convention across markup, CSS and tests, and nothing else ties those together.
//
// Renders nothing until mounted: the target element belongs to the page, not to
// this React tree, so it cannot be reached during a server render.
export default function StreakChip({ streak }: { readonly streak: StreakView }) {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(STREAK_CHIP_ID));
  }, []);

  return target === null ? null : createPortal(streakLabel(streak), target);
}
