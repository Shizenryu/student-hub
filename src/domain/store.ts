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
//
// It must write exactly what public/assets/store.js writes, byte for byte, for as
// long as both exist: quiz.html and flashcards.html still log practice and mark
// the streak through the old one, so a student can move between an island and a
// legacy page on the same day. tests/unit/store-parity.test.ts holds them
// together. Where a rule below looks odd, it is almost certainly matching that
// file rather than expressing a preference.

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type Clock = () => Date;

export type StreakReport = {
  readonly count: number;
  readonly best: number;
  readonly today: boolean;
};

export type StreakInfo = StreakReport & { readonly alive: boolean };

export type Store = {
  readonly available: boolean;
  readonly today: () => number;
  readonly markTrained: () => StreakReport;
  readonly streakInfo: () => StreakInfo;
  readonly logPractice: (activityId: string) => void;
  readonly unlogPractice: (activityId: string) => void;
  readonly practiceOn: (dayNumber: number) => readonly string[];
  readonly todayPractice: () => readonly string[];
  readonly best: (mode: string) => number;
  readonly setBest: (mode: string, score: number) => boolean;
  readonly misses: () => Readonly<Record<string, number>>;
  readonly recordCard: (cardKey: string, gotIt: boolean) => void;
  readonly hash: (cardText: string) => string;
};

const KEY = 'shizenryu-progress-v1';
const PROBE_KEY = '__t';

type StreakState = { readonly last: number; readonly count: number; readonly best: number };

// Version 1 is exactly the shape store.js writes: every field optional, because a
// student who has only ever done a quiz has `streak` and `best` and no `plog`.
type ProgressState = {
  readonly streak?: StreakState;
  readonly best?: Readonly<Record<string, number>>;
  readonly miss?: Readonly<Record<string, number>>;
  readonly plog?: Readonly<Record<string, readonly string[]>>;
};

const NO_STREAK: StreakState = { last: 0, count: 0, best: 0 };

// --- the untrusted-input guard ----------------------------------------------
//
// Hand-rolled rather than Zod, deliberately. Zod is already a dependency, but it
// runs at build time for content collections; pulling it into an island would
// ship roughly 12KB to a student's phone to check a four-key object.
//
// SCHEMA VERSION 1 is the shape store.js writes, and it is UNVERSIONED — there is
// no version field in the persisted JSON and there must not be one, because
// store.js would write state without it and the two would stop matching. The key
// name itself (…-v1) carries the version. A version 2 changes that key and
// migrates from this one; it does not add a field here.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Number.isFinite and not typeof alone: NaN and Infinity survive a JSON round trip
// as null, but a hand-edited key can hold either, and both poison day arithmetic
// silently rather than loudly.
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isNumberMap = (value: unknown): boolean => isRecord(value) && Object.values(value).every(isNumber);

const isStreakState = (value: unknown): value is StreakState =>
  isRecord(value) && isNumber(value.last) && isNumber(value.count) && isNumber(value.best);

const isPracticeLog = (value: unknown): boolean =>
  isRecord(value) &&
  Object.values(value).every((day) => Array.isArray(day) && day.every((id) => typeof id === 'string'));

// Absent is not malformed: a student who has only ever done a quiz has a streak
// and no practice log. Present-but-wrong discards the whole object rather than the
// offending field, because a half-trusted state is harder to reason about than a
// fresh one, and the student loses nothing they could have seen anyway.
function isProgressState(value: unknown): value is ProgressState {
  if (!isRecord(value)) return false;
  if (value.streak !== undefined && !isStreakState(value.streak)) return false;
  if (value.best !== undefined && !isNumberMap(value.best)) return false;
  if (value.miss !== undefined && !isNumberMap(value.miss)) return false;
  if (value.plog !== undefined && !isPracticeLog(value.plog)) return false;
  return true;
}

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

// Whether a session today moves the streak on, restarts it, or leaves it alone.
//
// The best score is recomputed even on the already-counted path. That looks
// redundant and is: store.js runs its `count > best` check after the branch, so a
// state where count somehow exceeds best would be repaired by a same-day call.
// Keeping the shape means the parity proof compares like with like.
function trainedOn(streak: StreakState, today: number): StreakState {
  const moved: StreakState =
    streak.last === today
      ? streak
      : { ...streak, last: today, count: streak.last === today - 1 ? streak.count + 1 : 1 };

  return moved.count > moved.best ? { ...moved, best: moved.count } : moved;
}

// The practice log is unbounded otherwise: a student training daily for three
// years would carry a thousand entries into every read. Sixty days is twice the
// longest window the page shows. Strictly greater than 60 — day 60 exactly is
// kept — because that is where store.js draws it.
function pruned(log: Readonly<Record<string, readonly string[]>>, today: number): Record<string, readonly string[]> {
  return Object.fromEntries(Object.entries(log).filter(([dayNumber]) => today - Number(dayNumber) <= 60));
}

// A 32-bit rolling string hash, used as the persisted key for a flashcard. Kept
// digit-for-digit identical to store.js's: the miss queue a student has built up
// is keyed by these, so a different hash silently empties it. `| 0` keeps it in
// int32 as it goes, `>>> 0` makes it unsigned before base 36, and the leading `c`
// keeps the result a safe object property rather than a numeric-looking one.
function hashCard(text: string): string {
  const h = [...text].reduce((acc, character) => (acc * 31 + character.charCodeAt(0)) | 0, 0);
  return `c${(h >>> 0).toString(36)}`;
}

export function createStore(options: { storage: StorageLike | null; now: Clock }): Store {
  const { storage, now } = options;

  // Feature detection by doing it, not by asking. Safari in private browsing has a
  // localStorage that exists and throws on write; the only reliable test is a
  // round trip. store.js probes the same way, with the same key.
  const writable = ((): boolean => {
    if (storage === null) return false;
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  })();

  // The fallback when storage is unavailable: the student's progress lives for the
  // life of the page and no longer. Better than a page that will not count a
  // session at all.
  let memory: ProgressState = {};

  function load(): ProgressState {
    if (!writable || storage === null) return memory;
    try {
      const raw: unknown = JSON.parse(storage.getItem(KEY) ?? 'null');
      return isProgressState(raw) ? raw : {};
    } catch {
      // Not JSON at all. Same answer as JSON that is not our shape: start clean.
      return {};
    }
  }

  function save(state: ProgressState): void {
    memory = state;
    if (!writable || storage === null) return;
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage filled up or was revoked mid-session. The in-memory copy above
      // keeps the page consistent; nothing else can be done here.
    }
  }

  const day = () => localDayNumber(now());

  return {
    available: writable,

    today: day,

    markTrained: () => {
      const state = load();
      const streak = trainedOn(state.streak ?? NO_STREAK, day());
      save({ ...state, streak });
      return { count: streak.count, best: streak.best, today: true };
    },

    streakInfo: () => {
      const streak = load().streak ?? NO_STREAK;
      const t = day();
      const trainedToday = streak.last === t;
      const alive = trainedToday || streak.last === t - 1;
      return { count: alive ? streak.count : 0, best: streak.best, today: trainedToday, alive };
    },

    logPractice: (activityId) => {
      const state = load();
      const t = day();
      const already = state.plog?.[String(t)] ?? [];
      const forToday = already.includes(activityId) ? already : [...already, activityId];
      save({ ...state, plog: { ...pruned(state.plog ?? {}, t), [String(t)]: forToday } });
    },

    unlogPractice: (activityId) => {
      const state = load();
      const t = day();
      const forToday = state.plog?.[String(t)];
      if (forToday === undefined) return;

      // Deliberately no pruning on this path: store.js prunes only when logging.
      const remaining = forToday.filter((id) => id !== activityId);
      const { [String(t)]: _removed, ...otherDays } = state.plog ?? {};
      save({
        ...state,
        plog: remaining.length === 0 ? otherDays : { ...otherDays, [String(t)]: remaining },
      });
    },

    practiceOn: (dayNumber) => load().plog?.[String(dayNumber)] ?? [],

    todayPractice: () => load().plog?.[String(day())] ?? [],

    best: (mode) => load().best?.[mode] ?? 0,

    setBest: (mode, score) => {
      const state = load();
      // Nothing is written when the score is not an improvement, so an ordinary
      // losing round leaves storage untouched.
      if (score <= (state.best?.[mode] ?? 0)) return false;
      save({ ...state, best: { ...state.best, [mode]: score } });
      return true;
    },

    misses: () => load().miss ?? {},

    recordCard: (cardKey, gotIt) => {
      const state = load();
      const current = state.miss?.[cardKey] ?? 0;

      if (!gotIt) {
        save({ ...state, miss: { ...state.miss, [cardKey]: current + 1 } });
        return;
      }

      // Getting a card right works one miss off; at zero the card leaves the queue
      // entirely rather than sitting there as a 0.
      if (current <= 0) {
        save({ ...state, miss: { ...state.miss } });
        return;
      }
      const { [cardKey]: _worked, ...others } = state.miss ?? {};
      save({ ...state, miss: current - 1 <= 0 ? others : { ...others, [cardKey]: current - 1 } });
    },

    hash: hashCard,
  };
}
