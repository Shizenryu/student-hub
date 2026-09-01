// Old bookmarks like /belts.html#5th-kyu or /kata.html#sanchin survive the Netlify
// redirect to /belts or /kata as /belts#5th-kyu or /kata#sanchin — fragments never
// reach the server, so only the browser can carry them, and only client script can
// act on them. Upgrade a known fragment to its real route; an unknown or absent
// fragment leaves the list rendering normally.
//
// Generic across every list page, not one hardcoded branch per page: the page
// itself marks one element with the slugs it considers valid and the route
// prefix to send them to, and this script just reads that contract. A new list
// page needs no change here — only its own two data attributes.
const host = document.querySelector('[data-legacy-slugs]');
const rawSlugs = host instanceof HTMLElement ? host.dataset.legacySlugs : undefined;
const prefix = host instanceof HTMLElement ? host.dataset.legacyPrefix : undefined;
const slug = location.hash.slice(1);

if (typeof rawSlugs === 'string' && typeof prefix === 'string' && slug.length > 0) {
  const slugs = JSON.parse(rawSlugs);
  if (Array.isArray(slugs) && slugs.includes(slug)) {
    location.replace(`${prefix}/${slug}`);
  }
}
