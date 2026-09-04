// Fills in the maxim of the day and the streak chip on the home page.
//
// public/index.html used to compute the maxim's day number itself, by
// dividing the raw timestamp by the length of a day in milliseconds — a UTC
// day number. That is a different clock from the streak chip below it, which
// store.js's day() now computes from the LOCAL calendar date (see that
// function's own comment): during British Summer Time the two used to
// disagree for the first hour after local midnight, changing the maxim an
// hour after the streak already had. Store.today() exposes the corrected
// value — use it, not a third copy of the arithmetic.
//
// Reads the maxims from data-maxims on [data-maxims], the same contract
// shape legacy-hash.js uses for its slugs, rather than a hardcoded copy of
// the content src/data/maxims.json already owns.
const host = document.querySelector('[data-maxims]');
const rawMaxims = host instanceof HTMLElement ? host.dataset.maxims : undefined;
const maximEl = document.getElementById('maxim');
const streakEl = document.getElementById('streakChip');

// If store.js failed to load, Store is never declared. Both features below
// need it — the maxim for the day number, the chip for the streak — so both
// stay empty rather than guessing, and the check is made once.
if (typeof Store !== 'undefined') {
  if (typeof rawMaxims === 'string' && maximEl) {
    const maxims = JSON.parse(rawMaxims);
    // No length check: n % 0 is NaN and [][NaN] is undefined, so the typeof
    // below already covers the empty list. Mutation testing proved the length
    // clause could not change any outcome; tests/unit/home-script.test.ts
    // pins the empty-list behaviour directly instead.
    if (Array.isArray(maxims)) {
      const maxim = maxims[Store.today() % maxims.length];
      if (typeof maxim === 'string') {
        maximEl.textContent = '“' + maxim + '”';
      }
    }
  }

  if (streakEl) {
    const info = Store.streakInfo();
    if (info.count >= 1) {
      streakEl.textContent = info.today
        ? '🔥 ' + info.count + '-day training streak'
        : '🔥 ' + info.count + '-day streak — train today to keep it';
    }
  }
}
