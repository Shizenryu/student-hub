// Random sources with known effects, for the modules that take one.
//
// These two values are not test data: they encode the contract of `shuffled()` in
// src/domain/shuffle.ts — that it walks from the end and picks with
// `Math.floor(random() * (index + 1))`. They are correct only while that loop is,
// which is why they live beside each other rather than in each suite.
//
// Not a *.test.ts file, so vitest does not collect it as a suite; see the `include`
// globs in vitest.config.ts.

// Never swaps: Math.floor(random() * (index + 1)) === index for every index, so a
// shuffle leaves the order it was given. The clearest baseline for asserting
// membership, and for any test that would otherwise depend on a permutation.
export const noShuffle = () => 0.999999;

// Always picks index 0, which is a real permutation rather than "some order" —
// [a,b,c,d] comes out [b,c,d,a]. Use it when the order itself is the assertion.
export const alwaysFirst = () => 0;

// A deterministic source that genuinely mixes: the same seed always gives the
// same sequence, and unlike the two above it does not favour any position. For
// a rule about WHERE options come from, a source that never moves anything can
// pass an implementation that ignores the rule, because the right items happen
// to sit first. (A linear congruential step; the constants are Numerical
// Recipes'.)
export const mixing = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};
