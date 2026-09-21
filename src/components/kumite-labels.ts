// The strings the kumite reference page adds, as pure functions — the same split
// as practice-labels.ts and quiz-labels.ts.

// The expansion of a side, in the words the quiz's side question already uses:
// "Same side (SS) or opposite side (OS)?". The content guard admits no other side,
// so the fallback to the side itself is for the type, not for a page.
const SIDE_LABELS: Readonly<Record<string, string>> = {
  OS: 'opposite side',
  SS: 'same side',
};

export const sideLabel = (side: string): string => SIDE_LABELS[side] ?? side;
