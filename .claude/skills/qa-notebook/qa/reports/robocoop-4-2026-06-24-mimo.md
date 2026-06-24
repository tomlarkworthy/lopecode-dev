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
