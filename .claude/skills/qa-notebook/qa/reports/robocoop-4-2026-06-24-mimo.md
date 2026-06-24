# robocoop-4 — lopeteam run 2026-06-24 (focus: xiaomi/mimo-v2.5 on "Create me a fully featured Audio DAW")

Goal (user): get `xiaomi/mimo-v2.5` working **properly** on a DAW-build task. Local files only; no ObservableHQ push.

## Outcome
mimo-v2.5 went from **hard-failing at step 2 (silent session death, nothing written)** to **building a live, compiling DAW core** on the same task. One load-bearing fix, root-caused and verified live + node CI.

## Root cause (grounded)
1. Single-turn tool-calling on mimo is fine: structured `tool_calls`, valid JSON args, multi-turn, `task_complete`, and `reasoning_details` round-trip all work (node `probe-mimo-wire.mjs` / `probe-mimo-loop.mjs`).
2. On the DAW task mimo **one-shots a ~13KB module as a single `write_file`**. The `content` argument hits `max_tokens=8192` and **truncates mid-string** → the tool_call `arguments` is unterminated JSON (observed: 30924 chars, `JSON Parse error: Unterminated string`).
3. The loop caught the *local* parse error (replied "could not parse tool arguments") but **left the malformed `tool_calls` message in history**. On the next turn that message is echoed back, and the upstream provider (Xiaomi / DigitalOcean via OpenRouter) **400s with "Unterminated string"** — and keeps 400-ing every subsequent turn. The session dies at step 2 having written nothing. (Live error captured: `error.metadata.raw` = `"unexpected end of data: line 1 column 30924 (char 30923)"`, `provider_name: "Xiaomi"`.)
4. This is **provider-agnostic in spirit**: any model that one-shots a big file and hits `max_tokens` truncates the same way; Anthropic's endpoint happens to tolerate the echoed-back malformed call, stricter providers don't.

## Fix (accepted, committed local-only)
`createAgentSession` arg-parse catch (`modules/@tomlarkworthy/robocoop-4-core.js`):
- **Repair in place**: set the stored `call.function.arguments = '{}'` so the malformed (unterminated) JSON can't poison later provider calls.
- **Recover**: return a tool result telling the model its call was cut off by the per-turn output limit and to **build large modules incrementally** (write a small skeleton, then add cells with `edit_file`).
- Deliberately did **not** raise `max_tokens` (would reintroduce B2 — 402 "requested up to 32000" on budget keys).

Commits: main `modules/@tomlarkworthy/robocoop-4-core.js` + probes; submodules `lopebooks` & `lopecode` `@tomlarkworthy_robocoop-4.html` (synced via sync-module).

## Verification (runtime truth, not self-report)
- **Unit, real network**: sanitizing the *actual* failing message array → HTTP 200, model resumes (live eval).
- **node CI**: `node --experimental-vm-modules --test tests/notebooks/robocoop-4.test.js` → `test_rc4_* pass` (all loop invariants hold).
- **Live, end-to-end (the grounding)**: fresh page, model = `xiaomi/mimo-v2.5`, task = "Create me a fully featured Audio DAW".
  - Before fix: died at step 2, `OpenRouter 400: Provider returned error`, `modules written: []`.
  - After fix: survived a truncation at step 8 → followed the incremental guidance → produced a **live `@user/audio-daw`: 10.6KB, 11 cells, 0 errored** (`daw_state`, `daw_header`, `viewof start_engine`, `viewof transport`, `transport_value`, `mixer`, `master_vol`). Auto-surfaced as a pane (B14). Ended on `max_steps` (21 steps, ~5 min) before "fully featured".

## Parked for the human (decisions / tradeoffs, not silently changed)
- **Step cap vs pace**: mimo is slow (~30s/turn, high variance) and exploration-heavy (~8 steps before first write), so it hits `maxStepsPerTurn=20` mid-build. Raising the cap would let incremental builders finish but costs tokens for everyone — a cost/behavior call.
- **Exploration efficiency**: a tighter "read ONE template, then build; don't survey many" prompt line would cut mimo's discovery steps, at the cost of prompt bytes for capable models. Unverified.
- **`edit_file` exact-match friction**: mimo burned several steps on "old_string not found" (its guesses didn't match). A fuzzier/anchored edit affordance could help weaker models.
- **`window.__daw` global**: mimo built shared DAW state on a `window` global rather than reactive cells (#15 anti-pattern). Prompt-level discouragement is possible but speculative.

## Aesthetic queue
None this run (no visual verdicts taken; the produced DAW is a partial core, not a finished UI to judge).

---

# Loop continuation 2026-06-24 (model robustness + agent self-correction + tooling)

Same day, continued lopeteam loop. Theme stayed "get models working properly". 8 accepted changes, all grounded (node CI of in-notebook `test_rc4_*` cells and/or live channel exercise), committed + pushed to all three repos (main + lopebooks + lopecode). Local-only re: ObservableHQ.

## Accepted (with grounding)
1. **Auto force-compute + watch agent-written cells on apply (B19, rubric #16).** A module that COMPILES can still ERROR at runtime, and the error is LAZY (a cell only throws when observed — e.g. a `Generators.interval` typo errors only when its pane renders). `applyModuleFile` now force-computes the written module's named cells and reports `⚠ N cells ERRORING at runtime — <cell>: <err> — FIX before task_complete` in the SAME tool result, and auto-registers a persistent watch on each (rc4_watchBus, deduped) so later changes/errors stream into the loop. System prompt told to treat a runtime-error report like a compile failure. Verified live: a deliberate `Generators.interval` bug surfaces in the apply result and as a watch. This is the agent-facing half of the user's "force agents to look at their output" ask.
2. **lopeteam rubric #16 "No errored cells (force-computed)."** New criterion in `general.md`; functional + applier-verifier prompts + SKILL axis map updated to FORCE-COMPUTE before claiming zero errors (a passive `_error`/`list_variables` scan false-passes on lazy cells). This is the team-facing half of the same ask. (Encodes the meta-lesson from the earlier "0 errored cells" overclaim.)
3. **Gemini MALFORMED_FUNCTION_CALL recovery (B18, functional v5).** Distinct from the mimo truncation. Some providers reject the model's own tool call upstream and return an empty assistant turn (finish_reason 'error' / native MALFORMED_FUNCTION_CALL, content null, 0 tokens). The loop used to push that null message (poison) and only fire the generic stall nudge. Now: drop the null message, inject a targeted nudge, retry (bounded by `malformedRetryLimit`=4); on persistent failure end with finishReason 'error'. Tests `test_rc4_session_malformed_recovers` + `_fallback`.
4. **Synthesize missing tool_call ids (B21, model-robustness v4).** `call.id` was used raw; a provider that omits ids produced a tool message with undefined `tool_call_id` (dropped from wire JSON → history desync → strict providers 400). Now a stable id is synthesized and stamped onto the call object (shared by assistant call + tool result). Test `test_rc4_session_missing_call_id`.
5. **list_values force-computes CONCURRENTLY (B11, perf v3).** Was serial: up to 40 cells × 5s ≈ 200s worst-case stall. `Promise.all`, order preserved. Verified live: 37-cell module in 12ms.
6. **probeAndWatch force-computes CONCURRENTLY.** Same serial→concurrent fix in the new on-apply probe (24 cells × 4s worst case).
7. **inspect/list/watch show STRINGS raw (B9, functional v4).** summarizeJS rendered strings through the DOM inspector → quoted, escape-sequenced, MIDDLE-elided. An agent inspecting produced text (HTML/docs/computed output) got a mangled literal. `summary()`/`summ()` now special-case `typeof==='string'`: raw, HEAD-truncated with `…(+N chars)`. Verified live: a 347-char string returns full raw text (no backtick wrapper, no `…`, real newline+tab).
8. **Extract shared cell-introspection helpers (B4/B5).** The auto-watch work duplicated resolveModule/varsOf/isStructural/label/oneLine/watchKey into `_editTools` (already in `_valueTools`), crashing _editTools MI to 8. Factored the identical primitives into a `_cellHelpers` cell both destructure; kept the behaviorally-divergent helpers (readVar timeout semantics, value summarization) local. MI _editTools 8→9, _valueTools 11→12, dup gone. Verified live: all 10 tools present + working.

## Rejected / parked (grounded reasons — feed the reflector)
- **B20 _facade "listener leak" (code-quality critic, claimed v5) → REJECTED, false positive.** Every addEventListener is on the cell's OWN ephemeral DOM (root/ta/send/attach/fileInput), none on window/document/session. Rerun detaches + GCs the old subtree with its listeners. Per #15 (effects OUTSIDE the model) no invalidation is needed. **Reflector signal: the code-quality critic pattern-matched "addEventListener without invalidation" without checking the target's lifetime — over-claimed v5 on a non-defect.** Lesson logged.
- **B22 tool-wire re-serialization memo → PARKED (premature opt).** toWireTool maps ~10 tools (microseconds), dwarfed by the per-step API round-trip (seconds). Memo code is net bloat vs the lean-per-ms bar.
- **B23 model-catalog 8s fetch loading feedback (#14) → PARKED (low impact).** The model select lives in a collapsed-by-default `<details>`; the catalog fetch is usually <1s, 8s is only the worst-case fallback. Not user-visible on boot.
- **B6 _createAgentSession dispatch extraction → PARKED.** The per-call dispatch block is cohesive with loop-local state (step/byId/messages/callbacks/completeSpec/truncate/ctx/pendingImages); a separate-cell fn needs ~10 params (couples worse), a nested fn doesn't move the cell's CC. Intrinsic complexity, node-CI-gated.
- **Speculative functional items (not worked, no evidence yet):** message-history compaction for long builds (run hit max_steps, not a confirmed context overflow — would be guessing); parallel tool_calls (edit/write need serial compile feedback); tool-calls-as-text detection (low incidence). Listed for a future evidence-driven pass.

## Aesthetic queue
None new (no visual verdicts this session).

## Still open for the human (decision, not silently done)
- **Live end-to-end validation run.** The mimo + gemini + tool_call_id fixes are unit-grounded (node CI) but a fresh end-to-end DAW build per model (the gold-standard grounding in the section above) was not re-run this session — it costs OpenRouter turns. Recommended as the next confirmation step.
- **B14 focus-steal (carried over):** auto-surfacing an agent-created module makes it the ACTIVE tab over the chat, hiding the live progress feed. Functional/#14, but the fix (re-focus chat vs side-split vs background tab) is a UX choice — parked for the human.

## Live validation 2026-06-24 — model sweep on the DAW task (with all fixes in place)
- **gemini-3.5-flash**: no longer crashes (MALFORMED fix) — runs 24+ steps — but a WEAK agentic builder: over-explores (read_file×8), emits code as CHAT prose instead of write_file, never calls task_complete. The prompt nudges help only marginally. Net: it does NOT build the DAW. UX now degrades gracefully (never-silent outcome bubble).
- **gpt-5.4-mini**: ✅ BUILT a clean DAW end-to-end. ~8 effective steps (bash×4, read_file×4, write_file×1, edit_file×1, task_complete×1). Produced `@tomlarkworthy/audio-daw`: **17 cells, 0 errored** (force-computed, #16). Idiomatic reactive architecture — `state`/`setState`/`clone` (immutable, #15-safe), `audio` engine, `transport` (Play/Stop/Reset), `stepEditor` (●/○ step grid), `trackControls`, `waveformViz`, `app`. NO window.__daw global. Auto-surfaced as a pane (B14). Ended via task_complete.
  - **Direct evidence the B19 force-compute/auto-watch feature works in a real build:** the agent's completion summary said it *"Fixed the only runtime error"* — it saw the runtime-error report in the apply result and fixed the cell before calling task_complete (exactly the intended loop).
- **UX takeaways:** (1) the never-silent outcome + task_complete summary mean the chat always shows what happened. (2) B14 auto-surface made the DAW the active tab over the chat — DESIRABLE for a completed build (user sees their creation), but it's the same focus-steal that hides the chat during active multi-turn work (carried-over human-gated UX decision). (3) gemini-3.5-flash exposed that weak models need either heavier steering or a different affordance; for now, capable models (gpt-5.x, gemini-2.5-flash) build reliably and the UX fails gracefully for the rest.
