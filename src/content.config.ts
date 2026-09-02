import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The kata prose, migrated off the trusted-HTML strings in src/data/kata.json (see
// scripts/convert-kata-prose.mjs) into real markdown under src/content/kata/. This
// schema is the frontmatter contract every generated file must satisfy — a missing or
// mistyped field fails the build with the offending file and field named, rather than
// surfacing later as a blank crest colour or a missing quote on a rendered page.
const kata = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/kata' }),
  schema: z.object({
    name: z.string(),
    translation: z.string(),
    hex: z.string(),
    white: z.boolean(),
    match: z.array(z.string()),
    quote: z
      .object({
        text: z.string(),
        src: z.string(),
      })
      .optional(),
  }),
});

export const collections = { kata };
