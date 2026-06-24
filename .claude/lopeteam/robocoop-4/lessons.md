# Lessons learned — robocoop-4

Known-failing edits, gotchas, and dead ends. Critics read this to avoid re-proposing; appliers read it to avoid re-attempting.

- Stray 'debugger;' + DevTools open = whole-notebook freeze (channel/eval all time out, even 1+1). Sweep bundled modules for genuine 'debugger;' (bare-line AND inline 'if(...) debugger;'); replace with 'void 0;' to preserve brace-less if control flow. False positives: lezer keyword lists ('debugger:'), comments, doc strings.

- ASSESSMENT META-LESSON: plausibility != verification. The first pass graded a hallucinated climate report 'strong' by checking figures against own knowledge (same ungrounded source). Grade produced content only against external sources it actually consulted; unsourced precision is a defect even if values are right. Encoded into lopeteam SKILL + functional + applier-verifier prompts.

- mimo-v2.5 (and any model) one-shots large modules; max_tokens=8192 truncates the write_file args mid-string -> unterminated JSON. Xiaomi/DigitalOcean upstream 400s ('Unterminated string') when that malformed tool_call is echoed back, killing the whole session. Fix lives in createAgentSession arg-parse catch: repair stored call.function.arguments to '{}' AND return recovery guidance (build incrementally). Don't raise max_tokens (reintroduces B2 402 on budget keys).
