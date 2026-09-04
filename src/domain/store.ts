// The student's progress store: streak, best scores, flashcard misses and the
// daily practice log.
//
// Stores NO personal data — day numbers, counts and scores only. It is the only
// thing in src/ that touches localStorage, and it treats what it reads back as
// untrusted input.
//
// Storage and clock are injected rather than reached for. That is what makes the
// day-boundary arithmetic below testable without freezing global time, and it is
// how a caller supplies the in-memory fallback when a student has storage
// disabled.

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type Clock = () => Date;

export type Store = {
  readonly today: () => number;
};

// Days since the epoch for the clock's LOCAL calendar date.
//
// Reading the local Y/M/D and re-composing them through Date.UTC is deliberate,
// and the whole point of the function. The obvious spelling —
// Math.floor(now.getTime() / 86400000) — is a UTC day number, which is the defect
// #12 removed: during British Summer Time a student training at 00:30 local is at
// 23:30 UTC the previous day, so their session lands on a day that has already
// finished and the streak they kept looks broken. Offset arithmetic on the
// timestamp has the same problem in reverse at a DST transition; composing the
// local date parts is exact across them. Do not "simplify" this.
function localDayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
}

export function createStore(options: { storage: StorageLike | null; now: Clock }): Store {
  return {
    today: () => localDayNumber(options.now()),
  };
}
