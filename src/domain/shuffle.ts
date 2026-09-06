// Fisher-Yates, walking from the end, transcribed from the shuffle the legacy quiz
// and flashcards pages both carried:
//
//   for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); … }
//
// It lives in one place because both transcriptions exist for one property — a
// given sequence of random numbers must deal what those pages dealt — and that
// property is only worth anything if there is one algorithm. Two copies can drift,
// and the drift would be silent: one page would start dealing differently from the
// other with every test still green.
//
// It mutates, which the rest of this codebase does not — but only a copy it just
// made and still owns, and every other spelling of an in-place shuffle is harder to
// check against the original.
export function shuffled<T>(items: readonly T[], random: () => number): readonly T[] {
  const order = [...items];
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    const held = order[index];
    const other = order[swap];
    // Both indices are in bounds by construction — `index` walks down from the end
    // and `swap` is at most `index`. The compiler cannot see that under
    // noUncheckedIndexedAccess and this project does not allow assertions, so the
    // swap is written as a positive condition rather than an early `continue` that
    // would silently deal a different order if it ever did fire.
    if (held !== undefined && other !== undefined) {
      order[index] = other;
      order[swap] = held;
    }
  }
  return order;
}
