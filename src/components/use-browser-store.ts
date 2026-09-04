import { useEffect, useRef, useState } from 'react';

import { createStore } from '../domain/store';
import type { Store } from '../domain/store';

// The only way an island gets a store bound to the browser.
//
// It is a hook rather than a plain factory so that the binding CANNOT happen
// during render. Astro renders a client:load island in Node at build time, where
// there is no localStorage — and the failure that follows is quiet. Reading the
// store while rendering produces one answer on the server (empty) and another in
// the browser (the student's real state), which React 19 recovers from by
// re-rendering without complaint. Nothing throws, no test fails, and on the quiz
// page in slice 5 the divergence will be larger than it is here.
//
// Returns null until the component has mounted, which is the same thing as "we do
// not know this student's state yet" — so a caller has to say what it renders in
// the meantime rather than accidentally rendering an empty store's answers.
export function useBrowserStore(): Store | null {
  const store = useRef<Store | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    store.current = createStore({
      // Not a defensive `?.` — in Node the global is absent entirely, so a bare
      // reference is a ReferenceError rather than undefined. TypeScript will not
      // warn: the DOM lib types localStorage as always present.
      storage: typeof localStorage === 'undefined' ? null : localStorage,
      now: () => new Date(),
    });
    setMounted(true);
  }, []);

  return mounted ? store.current : null;
}
