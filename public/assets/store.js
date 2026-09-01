// Shizenryu Student Hub — progress store.
// localStorage with feature detection; falls back to in-memory (page lifetime) if
// storage is unavailable. Stores NO personal data: day numbers, counts and scores only.
// Key: shizenryu-progress-v1  { streak:{last,count,best}, best:{mode:score}, miss:{cardHash:n} }

const Store = (function(){
  const KEY = 'shizenryu-progress-v1';
  let mem = {};
  let ok = false;
  try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); ok = true; } catch(e){ ok = false; }

  function load(){
    if(!ok) return mem;
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; }
  }
  function save(d){
    mem = d;
    if(ok){ try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(e){} }
  }
  // Day number for the LOCAL calendar date, not the UTC one. Date.now() alone (the
  // previous implementation) is a UTC day number: during British Summer Time, a student
  // training at 00:30 local is at 23:30 UTC the previous day, so Date.now()-based logging
  // would credit yesterday and later see a gap that resets a streak never actually broken.
  // getFullYear/getMonth/getDate read the LOCAL date; Date.UTC then turns those parts back
  // into a stable day number — exact across daylight-saving transitions, unlike offset
  // arithmetic on Date.now(). Do not "simplify" this back to Date.now()/86400000.
  function day(){
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  // Call when a quiz round or flashcard deck is completed.
  function markTrained(){
    const d = load(); const t = day();
    d.streak = d.streak || {last:0, count:0, best:0};
    if(d.streak.last === t){ /* already counted today */ }
    else if(d.streak.last === t - 1){ d.streak.count++; d.streak.last = t; }
    else { d.streak.count = 1; d.streak.last = t; }
    if(d.streak.count > d.streak.best) d.streak.best = d.streak.count;
    save(d);
    return {count: d.streak.count, best: d.streak.best, today: true};
  }

  // Read-only view: is the streak alive, and has the user trained today?
  function streakInfo(){
    const d = load(); const t = day();
    const s = d.streak || {last:0, count:0, best:0};
    const today = s.last === t;
    const alive = today || s.last === t - 1;
    return {count: alive ? s.count : 0, best: s.best, today, alive};
  }

  function best(k){ const d = load(); return (d.best || {})[k] || 0; }
  function setBest(k, v){
    const d = load(); d.best = d.best || {};
    if(v > (d.best[k] || 0)){ d.best[k] = v; save(d); return true; }
    return false;
  }

  // Flashcards: cards answered "Again" accumulate misses and are shown first
  // next time; each "Got it" works a miss back off.
  function misses(){ const d = load(); return d.miss || {}; }
  function recordCard(h, got){
    const d = load(); d.miss = d.miss || {};
    if(got){ if(d.miss[h]){ d.miss[h]--; if(d.miss[h] <= 0) delete d.miss[h]; } }
    else { d.miss[h] = (d.miss[h] || 0) + 1; }
    save(d);
  }
  function hash(s){
    let h = 0;
    for(let i = 0; i < s.length; i++){ h = (h * 31 + s.charCodeAt(i)) | 0; }
    return 'c' + (h >>> 0).toString(36);
  }

  // Daily practice log: { dayNumber: [activityId, ...] }, pruned to the last 60 days.
  function logPractice(id){
    const d = load(); const t = day();
    d.plog = d.plog || {};
    const arr = d.plog[t] || [];
    if(!arr.includes(id)){ arr.push(id); d.plog[t] = arr; }
    Object.keys(d.plog).forEach(k => { if(t - Number(k) > 60) delete d.plog[k]; });
    save(d);
  }
  function unlogPractice(id){
    const d = load(); const t = day();
    if(d.plog && d.plog[t]){
      d.plog[t] = d.plog[t].filter(x => x !== id);
      if(d.plog[t].length === 0) delete d.plog[t];
      save(d);
    }
  }
  function practiceOn(dayNum){ const d = load(); return (d.plog || {})[dayNum] || []; }
  function todayPractice(){ return practiceOn(day()); }
  function today(){ return day(); }

  return {available: ok, markTrained, streakInfo, best, setBest, misses, recordCard, hash,
          logPractice, unlogPractice, practiceOn, todayPractice, today};
})();
