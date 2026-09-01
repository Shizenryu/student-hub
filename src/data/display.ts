// The syllabus keeps its own wording ("JJ"); every display layer expands it.
// See CLAUDE.md's content rules — losing this silently changes what students read.
export function expandAbbreviations(text: string): string {
  return text.replace(/\bJJ\b/g, 'Jiu Jitsu (JJ)');
}

// The colour rule belts.css and kata.css both transcribe: a grade/kata records
// whether it needs white or dark text against its own hex background, and this
// is the one place that mapping is named, so both stylesheets' colour tests
// can assert against the same derivation instead of each re-typing the ternary.
export function textColorForWhite(white: boolean): '#fff' | '#1A1A1A' {
  return white ? '#fff' : '#1A1A1A';
}
