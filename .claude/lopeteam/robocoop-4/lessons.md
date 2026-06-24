# Lessons learned — robocoop-4

Known-failing edits, gotchas, and dead ends. Critics read this to avoid re-proposing; appliers read it to avoid re-attempting.

- Stray 'debugger;' + DevTools open = whole-notebook freeze (channel/eval all time out, even 1+1). Sweep bundled modules for genuine 'debugger;' (bare-line AND inline 'if(...) debugger;'); replace with 'void 0;' to preserve brace-less if control flow. False positives: lezer keyword lists ('debugger:'), comments, doc strings.

- ASSESSMENT META-LESSON: plausibility != verification. The first pass graded a hallucinated climate report 'strong' by checking figures against own knowledge (same ungrounded source). Grade produced content only against external sources it actually consulted; unsourced precision is a defect even if values are right. Encoded into lopeteam SKILL + functional + applier-verifier prompts.

- mimo-v2.5 (and any model) one-shots large modules; max_tokens=8192 truncates the write_file args mid-string -> unterminated JSON. Xiaomi/DigitalOcean upstream 400s ('Unterminated string') when that malformed tool_call is echoed back, killing the whole session. Fix lives in createAgentSession arg-parse catch: repair stored call.function.arguments to '{}' AND return recovery guidance (build incrementally). Don't raise max_tokens (reintroduces B2 402 on budget keys).

- addEventListener WITHOUT invalidation is only a #15 leak when the target OUTLIVES the cell (window/document/another module/a persistent object). Listeners on the cell's OWN returned DOM subtree are torn down automatically on rerun (old element detached + GC'd) — adding invalidation there is dead code. Verify the TARGET before flagging (robocoop-4 _facade was a false positive).

- _createAgentSession send() loop: do NOT extract the per-call tool-dispatch block for MI. It's cohesively bound to loop-local state (step, per-step byId, messages, callbacks, completeSpec, truncate, ctx, pendingImages); a separate-cell fn needs ~10 params (couples worse), a nested fn doesn't move the cell's CC. The complexity is intrinsic + node-CI-gated (17 test_rc4_* cells). Leave it.

- gemini-3.5-flash is a WEAK agentic builder for the DAW task: even after the MALFORMED fix (no longer crashes), it over-explores (read_file×8+) and emits code as CHAT prose instead of calling write_file, never calling task_complete. Prompt nudges help only marginally. gemini-2.5-flash builds. Don't expect 3.5-flash to complete agentic builds; the value is graceful UX degradation (never-silent outcome) when it doesn't.
