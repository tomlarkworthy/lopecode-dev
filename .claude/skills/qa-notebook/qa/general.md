# General QA criteria for lopecode notebooks

Universal criteria every notebook is scored against during a `/qa-notebook` pass. Re-read this every pass — do not rely on memory.

Each criterion is scored **pass / partial / fail** with concrete evidence. Cite a screenshot region, `get_variable` snapshot, or console excerpt for every non-pass.

## The 15 criteria

### 1. Clear title

The notebook has an unambiguous H1 (or equivalent prominent heading) that names what the notebook is. A user landing on a tab should know what they're looking at without scrolling.

- **pass** — single H1 near the top, names the notebook concept.
- **partial** — title exists but is ambiguous, abbreviated, or buried below other content.
- **fail** — no H1, or the title contradicts the actual content.

### 2. Explanation

Prose near the top explains what the notebook *does* and *who it's for*. A first paragraph that orients a new reader counts. Source-only notebooks with no prose fail this even if they work.

- **pass** — first paragraph clearly states purpose and intended use.
- **partial** — explanation exists but is terse, lists features without context, or assumes too much.
- **fail** — no prose, or jumps directly to controls with no introduction.

### 3. Doc matches impl

Every claim in the prose is reproducible against the running notebook. If the prose says "press SHIFT+ENTER to commit," that keybinding works. If it says "exports state to local-change-history," that path is reachable.

- **pass** — every prose-claimed behavior verified working.
- **partial** — claims mostly accurate, one or two undocumented quirks, OR one minor claim outdated.
- **fail** — a load-bearing claim is wrong (documented feature missing, advertised shortcut not bound, etc.).

### 4. Does what it says

The headline use case actually works end-to-end on a fresh load. This is the criterion that gates most user trust — if the notebook is named "Inline editable md" and clicking a cell *doesn't* let you edit it, that's a #4 fail regardless of how nice the rest looks.

- **pass** — the primary advertised flow works on a clean load with no errors.
- **partial** — works but degrades on edge inputs, OR requires a non-obvious recovery step.
- **fail** — primary flow broken; user cannot achieve the headline outcome.

### 5. Feature list

Every interactive control, exported cell, and keyboard shortcut is either documented in the prose or has a clear visual affordance. **Undocumented features count against this criterion** — they're either dead code that should be deleted, or hidden affordances that should be advertised.

- **pass** — feature inventory (from your QA matrix) matches the prose 1:1.
- **partial** — 1–2 undocumented features, or 1–2 documented-but-missing features.
- **fail** — significant gap between prose and implementation in either direction.

Always list every undocumented control you find in the report so a future pass either gets it documented or gets it removed.

### 6. Lean code

The module avoids dead cells, oversized utility blobs, and cells that re-implement what an existing import already provides. "Lean" is judged relative to the notebook's stated scope — a 100-cell debugger is fine if every cell is load-bearing.

- **pass** — every cell exercised or clearly load-bearing for a documented feature.
- **partial** — 1–3 obviously dead/duplicate cells; or 1 oversized cell that should be split.
- **fail** — multiple unused cells, copy-paste duplication, or a hand-rolled utility shadowing an existing import.

### 7. Scoped domain

The notebook addresses **one** concern. Composite notebooks that combine unrelated features fail this — they should be split into separate notebooks composed via lopepage.

- **pass** — single, nameable concern.
- **partial** — 2 closely related concerns that could plausibly stay bundled.
- **fail** — bag of unrelated features.

### 8. Claims tested

Notable behavioral claims have corresponding `test_*` cells (or are exercised by something equivalent like a worked example with an `expect(...)` assertion).

- **pass** — every load-bearing claim has a test cell or asserted example.
- **partial** — some claims tested, the highest-impact failure mode is uncovered.
- **fail** — no tests, or tests don't exercise the documented behavior.

### 9. Serialization (export round-trip)

The notebook can `export_notebook` itself to disk and reload from that exported HTML without losing user state. Only score this if you actually exercised export — otherwise mark "not exercised" and skip.

- **pass** — export → reload → state intact, no console errors.
- **partial** — exports but loses 1 piece of state (e.g. `viewof` value resets to default), or reload produces a warning.
- **fail** — export corrupts the file, or reload throws.

### 10. Adversarial / try to break

A motivated user trying to break the notebook with reasonable-but-edge inputs (empty strings, special chars, repeat clicks, out-of-order sequences, persistence round-trips) does not produce uncompilable/unrecoverable state. Score against the matrix you executed during the QA pass.

- **pass** — adversarial matrix completed; nothing breaks beyond expected guard rails.
- **partial** — one adversarial input produces a poor error message but recovers.
- **fail** — a trivial adversarial input produces unrecoverable state (cell stuck in a throwing stub, mutable corrupted in persistence, etc.).

The #1 lesson here: **trivial-input failures count as fails**. Typing `"` inside a `${}` block is a trivial input; if it bricks the cell, that's a #10 fail.

### 11. Clean console logs

Booting and exercising the documented happy path produces no `console.error` or thrown `pageerror`. Known noisy boot chatter from `runtime-sdk`/`module-map`/`editor-5`/`fakefs` is filtered by default in `qa_console_logs` (and listed in `tools/channel/lopecode-channel.ts:QA_DEFAULT_NOISE`); errors and warnings always pass through. Failed network requests for known-missing assets (`*.mov`, `blob:null/*` aborts during boot) are out of scope unless they cascade.

- **pass** — no errors, no unexpected warnings.
- **partial** — one expected warning, OR one stray `console.error` that doesn't cascade.
- **fail** — repeated errors, an uncaught exception, or a `pageerror` during normal interaction.

### 12. Reusable, themed UI

Interactive controls are built from the standard component vocabulary (`Inputs.*`, `@tomlarkworthy/view`, `htl`) rather than hand-rolled bespoke DOM, and respect the active theme. (Subjective layout/hierarchy/polish stays a human-gated aesthetic verdict — not scored here.)

- **pass** — controls use `Inputs.*`/view/htl; colors and fonts come from `--theme-*`/`--syntax-*`; no hard-coded hex, no external/Google fonts.
- **partial** — mostly themed/reused, but 1–2 hand-rolled controls duplicating an existing `Inputs.*` widget, OR 1–2 hard-coded colors.
- **fail** — bespoke DOM re-implementing standard widgets, a palette ignoring the theme, or an external-font link.

### 13. Performance within the budget

Boot and interaction cost are near the achievable floor for the notebook's scope, with no main-thread wedge. Lopecode ships one browser-only file, so capability is judged per byte and per millisecond. For notebooks that drive an LLM/agent, token/cost efficiency counts here too (sane `max_tokens`, cache the static prefix, don't re-send unchanged context every step).

- **pass** — boots without a visible stall; nothing re-runs every tick/keystroke needlessly (rAF/`now` sources frozen with `Generators.observe`); no synchronous wedge; payload not gratuitously large.
- **partial** — one measurable hotspot (a chain-thrashing recompute, an oversized eager import) that degrades smoothness but recovers.
- **fail** — a freeze/wedge, unbounded growth, or boot/interaction latency far above what the scope needs.

### 14. Responsive, visible feedback

Lopecode notebooks are **reactive and spatio-visual**: the user should always get fast, visible feedback. No user-visible action or long-running operation runs silently — there is an immediate on-screen signal (a streaming output, a "thinking"/busy indicator, a progress affordance) — and an artifact the notebook creates appears **where the user is looking**, not hidden behind a lookup/menu they must hunt through.

- **pass** — every action gives immediate visual feedback; long/async work shows a live progress/"thinking" signal; created or derived artifacts surface in place.
- **partial** — feedback exists but lags, OR one long operation lacks a progress signal, OR a created artifact needs one extra manual step to see.
- **fail** — a long operation runs with no visible signal (the user cannot tell it is working), OR a created/changed artifact is invisible until the user goes hunting for it.

### 15. Dataflow rerunnability

The dataflow graph is a computation: recomputing any cell — or any subset of cells — leaves the program in a consequentially-equivalent state. Differing **values** on rerun are fine (randomness, `Date.now()`, time); leaked or accumulating **effects** are not. Any impure effect outside the model (timers, `addEventListener`, subscriptions, `WebSocket`/`EventSource`, `MutationObserver`/`ResizeObserver`, workers/animations, writes to a global/`window`/another module) must be torn down via the cell's **invalidation promise** (`invalidation.then(() => cleanup())`), so a recompute first undoes the prior effect.

- **pass** — every out-of-model effect has invalidation-driven cleanup; rerunning a cell does not stack listeners/timers/subscriptions or leak resources; cells don't mutate their inputs in place.
- **partial** — one effect lacks cleanup but its impact is bounded (e.g. a single idempotent listener), OR one cell mutates an input in place where a derived value would do.
- **fail** — a rerun duplicates timers/listeners/subscriptions, leaks a resource (socket/worker/observer), or compounds shared state so recomputing a subset diverges.

### 16. No errored cells (force-computed)

Every cell in every booted module computes without throwing. This is distinct from #11: a cell can be in an **error state** (`variable._error`) without ever logging to the console, and the error is **lazy** — an unobserved cell does not run, so it does not error until something observes it. A passive scan of `_error` therefore **under-reports**: a `viewof`/display cell that throws (e.g. a wrong API like a non-existent `Generators.interval`) reads as "fine" until its pane renders. You MUST **force-compute** before scoring: either observe every named cell (`get_variable`/`watch_variable` per cell, or `run_tests`) so the runtime actually evaluates them, or open every module's pane. Then collect the cells whose value is an error.

- **pass** — after force-computing every cell of every booted module, zero are in an error state.
- **partial** — one isolated cell errors but the headline flow is unaffected and it is clearly non-load-bearing.
- **fail** — any load-bearing cell errors, or multiple cells error, once force-computed.

Detection snippet (run via `eval_code`): iterate `__ojs_runtime._variables`, force each named cell (`mod.value(name)` / observe), then report any with `_error`. Do **not** report "0 errored cells" from a non-forcing `_error` scan — that is the classic false-pass (a `currentStep` cell using a non-existent `Generators` method passed a passive scan, then threw the moment its DAW pane rendered).

## How to use this file

1. Read it once at the start of every QA pass.
2. Score 1–16 from the evidence collected during your matrix execution.
3. Cite evidence for each non-pass; vague "looks broken" lines are not acceptable.
4. **Force-compute before claiming no errors (#16):** lazy/unobserved cells don't error until observed, so a passive `_error` scan false-passes. Observe/open every cell first.
5. Note any per-notebook overrides in `qa/per-notebook/<slug>.md` — that file refines (never replaces) these general criteria.
