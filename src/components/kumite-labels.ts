// The strings the kumite reference page adds, as pure functions — the same split
// as practice-labels.ts and quiz-labels.ts.

// The expansion of a side, in the words the quiz's side question already uses:
// "Same side (SS) or opposite side (OS)?". A side the syllabus does not write is
// shown as it is, rather than invented an expansion for.
export const sideLabel = (side: string): string =>
  side === 'OS' ? 'opposite side' : side === 'SS' ? 'same side' : side;
