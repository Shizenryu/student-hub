// Old bookmarks like /belts.html#5th-kyu survive the Netlify redirect to /belts as
// /belts#5th-kyu — fragments never reach the server, so only the browser can carry
// them, and only client script can act on them. Upgrade a known belt fragment to its
// real route; an unknown or absent fragment leaves the list rendering normally.
const belts = document.querySelector('[data-belt-slugs]');
const rawSlugs = belts instanceof HTMLElement ? belts.dataset.beltSlugs : undefined;
const slug = location.hash.slice(1);

if (typeof rawSlugs === 'string' && slug.length > 0) {
  const slugs = JSON.parse(rawSlugs);
  if (Array.isArray(slugs) && slugs.includes(slug)) {
    location.replace(`/belts/${slug}`);
  }
}
