// The syllabus keeps its own wording ("JJ"); every display layer expands it.
// See CLAUDE.md's content rules — losing this silently changes what students read.
export function expandAbbreviations(text: string): string {
  return text.replace(/\bJJ\b/g, 'Jiu Jitsu (JJ)');
}
