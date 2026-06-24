# Lessons learned — robocoop-4

Known-failing edits, gotchas, and dead ends. Critics read this to avoid re-proposing; appliers read it to avoid re-attempting.

- Stray 'debugger;' + DevTools open = whole-notebook freeze (channel/eval all time out, even 1+1). Sweep bundled modules for genuine 'debugger;' (bare-line AND inline 'if(...) debugger;'); replace with 'void 0;' to preserve brace-less if control flow. False positives: lezer keyword lists ('debugger:'), comments, doc strings.

- ASSESSMENT META-LESSON: plausibility != verification. The first pass graded a hallucinated climate report 'strong' by checking figures against own knowledge (same ungrounded source). Grade produced content only against external sources it actually consulted; unsourced precision is a defect even if values are right. Encoded into lopeteam SKILL + functional + applier-verifier prompts.
