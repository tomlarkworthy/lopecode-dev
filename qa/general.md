# General QA criteria for lopecode notebooks

A QA pass evaluates a notebook against these criteria. Every criterion has (a) the question, (b) how to evaluate it concretely with the available tools, and (c) what good vs. bad looks like. Score each criterion **pass / fail / partial** and cite evidence (cell name, screenshot region, console line, or quote).

A notebook with all criteria passing is shippable. Any **fail** is a release blocker; **partial** is a follow-up issue.

---

## 1. Clear title

**Question:** Does the notebook have a single, prominent, descriptive title that tells a stranger what it is?

**Evaluate:**
- Top-of-page screenshot — is there an `<h1>` rendered prominently above all other content?
- The title should match (or sensibly extend) the module name. `@user/foo-bar` → title roughly "Foo Bar" or a descriptive phrase containing those words.
- Find the title cell in `list_cells` (typically named `title` or `_0`/`_1`). Inspect its source.

**Good:** One H1, descriptive ("Editor: Reactive Userspace Cell Mutator"), distinct from other headings.
**Bad:** No H1, or H1 is the module slug verbatim with no human gloss, or multiple competing H1s, or title-case inconsistencies.

---

## 2. Notebook explains what it does

**Question:** Within the first viewport (no scroll), can a stranger understand what problem the notebook solves and why they'd use it?

**Evaluate:**
- Take a fullscreen `qa_screenshot` at default viewport. Read the first ~600 px of content as a stranger would.
- Look for: a sentence answering "what is this?" and a sentence answering "what would you use it for?". They can be the same sentence.
- Penalize jargon-first openers ("This module exposes a `cellEditor` higher-order function that…") that assume the reader already knows the concept.

**Good:** First paragraph is a 1–3 sentence elevator pitch in plain English. Optionally a screenshot/demo right after.
**Bad:** Opens with API reference, opens with a wall of imports, opens with TODOs, opens with no prose at all.

---

## 3. Implementation matches the technical documentation

**Question:** Do the documented APIs (functions, exports, configuration) actually exist in the runtime, with the documented signatures and types?

**Evaluate:**
- Extract every code block, every "import { X } from '@user/notebook'" line, and every named API mentioned in prose from the source.
- For each documented name: `list_cells` must list it; `get_variable` must return a non-error value of the expected shape (function, object, view, etc.).
- For each documented function: spot-check by calling it via `eval_code` if a synthetic call is feasible — e.g. an example from the docs.
- Read function signatures (cell `definition`) and check against documented arg names/order/types.

**Good:** Every named export exists, signatures match prose, examples in the docs are runnable.
**Bad:** Documented `foo()` doesn't exist, or takes different args than described, or returns a different shape, or examples in the docs throw.

---

## 4. The notebook does what it says it does

**Question:** Beyond *existing*, does the implementation actually deliver the behavior promised? Demos render, claimed effects happen, examples produce the shown output.

**Evaluate:**
- For every claim in the prose ("This editor lets you modify cells live and the change reflects immediately"), find the demo that supposedly shows it. If there's no demo, that's a partial fail — the claim is unverifiable in-place.
- **Exercise every interactive feature, not just the demos.** Walk every toolbar button, every checkbox, every input, every drag handle, every keyboard shortcut the notebook exposes. The per-notebook guidance file MUST list each control with either "exercise it" or "skip it because <reason>" — no silent omissions. Bugs hide in the controls a previous pass tiptoed around.
- For each demo cell, exercise it: click its inputs, type into it, press its buttons. After each interaction, screenshot + drain `qa_console_logs` and verify the rendered output matches the documented behavior.
- **Mutation under collision.** For every control that creates new runtime state (➕/add, duplicate, fork, attach, new-row), invoke it twice in a row at default/empty state and verify each invocation produces a *distinguishable* runtime entity. Two consecutive invocations that yield identical pids / ids / hashes is a bug, even if everything looks fine in the viewport. (Concrete example: editor-5 issue [#144](https://github.com/tomlarkworthy/lopecode/issues/144) — two ➕ clicks both produced `pid: "_1nvapr1"` because blank content hashed to the same key, and the persistence layer then collapsed them on reload.)
- Cross-check screenshot output against `get_variable` value: if a chart shows X but `get_variable` says Y, that's a reactivity bug.

**Good:** Every claim is backed by a demo, every interactive control was exercised at least once, no console errors during interaction, every mutation produces a distinct runtime entity.
**Bad:** Claims with no demo, demos that throw, demos whose visible behavior doesn't match the prose, reactive bugs (input changes don't propagate), controls left untested without a documented reason, identical-state mutations producing identical pids.

---

## 5. Clear list of features

**Question:** Can a reader skim a feature list (or equivalent overview) and know what the notebook can do, without reading the entire thing? *And — does the list match the implementation in both directions?*

**Evaluate:**
- Look for a bulleted list, a "## Features" / "## What it does" / "## Use cases" section, or an explicit summary near the top.
- Each feature should be one line, concrete, action-oriented ("Edit any runtime cell from any other cell"), not abstract ("supports composability").
- **Forward direction** — for every listed feature, find the cell/control that implements it. Vaporware items = fail.
- **Reverse direction (catches undocumented features)** — for every interactive control surfaced to the user (every toolbar button, every input, every keyboard shortcut, every right-click menu) and every named export from `list_cells`, check whether it's mentioned in the prose / feature list / docs. Anything in the implementation but not in the documentation is an *undocumented feature* — score this as a partial fail and list it in "Issues found" so a future pass either documents it or removes it.
- Use the **feature inventory** built in The Loop step 4 of `SKILL.md` as the canonical "what the implementation actually offers" list; diff it against the documentation to surface both gaps and excesses.

**Good:** A skimmable list of 3–10 concrete features near the top, each implementable.
**Bad:** No feature list, only a wall of prose; or a feature list with vaporware items not actually implemented; or features that exist but aren't listed (under-documented).

---

## 6. Code is lean and minimal

**Question:** Is the source as small as it can be while still doing the job? Are cells dead code, copy-paste, or experimentation that should have been deleted?

**Evaluate:**
- `list_cells` count and total source size (sum of `definition` lengths). Compare against similar-purpose notebooks. A notebook claiming to do one thing should not have 200 cells.
- Look for unused cells: cells with no `dependedBy` (no other cell consumes them) AND not a top-level rendered view AND not an exported entry-point. Candidates for deletion.
- Look for duplicated logic across cells. If two cells implement the same function with slight variations, one should probably win.
- Look for obvious experimentation residue: cells named `_test`, `scratch`, `tmp`, `old`, `OLD`, `delete me`, etc.

**Good:** Cell count proportional to features, no dead cells, no duplication, no experimentation residue.
**Bad:** Dozens of cells with no consumers, multiple `compile_v1` / `compile_v2` / `compile_v3` siblings, large commented-out blocks.

---

## 7. Domain is scoped — does one thing well, imports the rest

**Question:** Is the notebook focused on a single concern, or is it a kitchen sink that re-implements primitives that exist elsewhere?

**Evaluate:**
- State the notebook's core purpose in one sentence. Does every cell directly serve that purpose, or are there long detours into unrelated utilities?
- Check imports: is the notebook importing `@user/foo-helpers` where appropriate, or has it inlined those helpers?
- Look for primitive reimplementations: a `debounce` cell when `@user/utility-belt` exists; a custom JSON serializer when `JSON.stringify` would do; a hand-rolled CodeMirror integration when `@tomlarkworthy/codemirror-6-v2` exists.
- Check `dependsOn` on the module-info — a focused notebook usually depends on a small handful of well-targeted modules.

**Good:** Notebook does one thing, imports cleanly from purpose-built dependencies, no scope creep.
**Bad:** Multiple unrelated concerns in one notebook, reinventing primitives, or zero external imports for a problem that clearly has solved building blocks elsewhere.

---

## 8. Test each claim — does it work?

**Question:** This is a meta-criterion that operationalizes #3 and #4: turn every claim in the prose into a test, then run it.

**Evaluate:**
- Read through the prose and extract every concrete, testable claim ("the editor works offline", "supports clicking +/− to navigate cells", "auto_attach attaches to all cells in the runtime").
- For each claim, design a minimal interaction or `get_variable` check that would falsify it. Run it.
- If the notebook has a `tests` module or `test_*` cells, run `run_tests` and report results.
- Anything where the claim is too vague to test ("it's fast", "it's elegant") — note as **untestable** and either ask the author to make it concrete or drop the claim.

**Good:** Every claim is testable, all tests pass.
**Bad:** Untestable claims, claims that fail when tested, claims that are technically true but misleading (e.g. "supports markdown" but no rendering).

---

## 9. Serialization round-trip via exporter

**Question:** Does the notebook survive `export_notebook` and reload? This is the lopecode-specific stress test — the whole point of the format is self-serialization.

**Evaluate:**
- Make a no-op interaction (e.g. trigger a recompute by clicking a button), then call `export_notebook` to write the current runtime back to the HTML file.
- Diff the file against its previous state — major surprises (cells dropped, attachments missing, hash mangled) are red flags.
- Close the QA browser, re-open the freshly-exported HTML with `qa_open_notebook`, and re-run criteria #1, #4, #8 against the round-tripped version.
- If the notebook has runtime mutations (mutables, file attachments created at runtime), specifically check that they survive the round trip.

**Good:** Exported file reloads identically; all features still work; no cells dropped; file size hasn't ballooned.
**Bad:** Reload throws; cells silently disappear; file attachments lost; mutables reset to initial; file grows by orders of magnitude.

---

## 10. Try to break it (adversarial pass)

**Question:** Does the notebook fail gracefully when pushed off the happy path? Criteria #1–#9 establish *correctness on intended use*; this one establishes *robustness on hostile or careless use*.

This is the last stage of the pass. Run it after everything else — it intentionally creates noise (errors, weird state) that would confuse earlier criteria. Reload the notebook between this pass and any further work.

**Evaluate (apply each that's relevant; skip the irrelevant ones):**

- **Boundary inputs** — for every text input, viewof, or editable area:
  - Empty string, single space, very long string (10 KB), unicode (`日本語`, `🦄`, RTL `العربية`), control chars (`\x00`, `\x1b`), HTML/JS injection (`<script>`, `</textarea>`, `${alert(1)}`), backslash floods (`\\\\\\`).
  - For numeric inputs: `0`, `-1`, `NaN`, `Infinity`, `-Infinity`, `1e308`, `1e-308`, scientific notation, comma-as-decimal.
  - For URL/path inputs: `javascript:`, `data:`, `file:///etc/passwd`, paths with `..`, percent-encoded payloads.
- **Rapid-fire interactions** — click the same button 20× as fast as `qa_click` allows; mash keys; flip a toggle 50×. Looking for: race conditions, double-fire bugs, unhandled promise rejections, stuck "loading" states.
- **In-flight changes** — if the notebook has a slow computation (anything >500 ms), change its inputs *while it's running* and verify the result either reflects the latest input or cancels cleanly. Stale results from a superseded computation = bug.
- **Viewport extremes** — `qa_viewport(320, 480)` (mobile), `qa_viewport(2560, 1440)` (4K-ish), `qa_viewport(800, 200)` (very wide-short). Look for: overflowing layouts, cut-off content, scrollbars-on-scrollbars, controls that move off-screen, tooltips clipped by container.
- **Resize during interaction** — change viewport mid-drag, mid-typing, or mid-scroll. CodeMirror and dropdowns are common offenders.
- **Page lifecycle** — `qa_press("F5")` or `qa_press("Meta+R")` during an interaction. Does state persist where it should (e.g. via `localStorage`) and reset where it should? Hash-routed state should survive reloads.
- **Browser navigation** — manipulate the URL hash via `eval_code("location.hash = '#view=...'")` to a malformed hash; back-button after switching modules. The lopepage hash DSL has historically been a sharp edge.
- **Concurrent modules** — open the notebook with extra modules in the hash that don't normally co-exist. Look for module-init races.
- **Attempt the un-attempted** — for any toolbar button you didn't click in criterion #4 (because it would mutate state), click it in a throwaway state. Trash, delete, "reset", "clear cache" — these are the most-likely-buggy because they're the least-trodden.
- **Drop garbage** — if the notebook accepts file drops or paste, paste binary garbage, drop a `.txt` where it expects `.csv`, drop a 100 MB file. Check for: silent acceptance of invalid input, browser hang, memory blow-up, unhelpful error.
- **Network failure mode** — if the notebook makes runtime fetches, throttle them via `qa_evaluate("self.fetch = () => new Promise(()=>{})")` and observe behavior. Spinner forever? Crash? Useful timeout?
- **Storage corruption** — for notebooks that read `localStorage`, write garbage to the relevant keys via `eval_code`, reload, and observe. Should not crash; should ideally recover.
- **Devtools poking** — `qa_evaluate` arbitrary mischief: delete a DOM node the notebook depends on, override `console.log`, set `Date.now = () => NaN`. Look for: unhelpful crashes, no-op silent failures.

**Always-do during this pass:**
- Drain `qa_console_logs` after each adversarial action — most breakages surface as console errors / unhandled rejections, not visual changes.
- Note any input that produces a *partial* result (UI updates but underlying data didn't, or vice versa) — these are the worst bugs because they look fine.
- Take a final fullscreen `qa_screenshot` to confirm the page isn't visually corrupted at the end.

**Good:** Notebook either rejects bad input with a clear message, sanitizes/clamps it, or simply ignores it. No crashes, no stuck states, no exfiltrated state across reloads, no XSS.
**Bad:** Page errors on plausible inputs; UI hangs; data corruption that survives reload; injection vulnerabilities; runaway resource use; toolbar buttons that throw or do nothing; rapid-fire creates ghost state.

**Severity calibration:**
- Empty string crashes a search box → high.
- 4K viewport pushes a tooltip 5 px off-screen → low.
- Pasting `<script>` runs the script → high (XSS).
- Reload after edit loses unsaved work without warning → medium-high.
- Rapid-clicking a button creates 20 of something → depends on what; if it's "spawn 20 popups" then high.

---

## 11. Clean console logs

**Question:** Are the developer console logs clean during normal operation? The only acceptable noise is **genuine misuse warnings** — e.g. a `console.warn` that fires because the *user* passed bad input and deserves to be told. Everything else (debug logs, leftover `console.log("here")`, internal state dumps on every recompute) is pollution.

This is not the same as criterion #4. #4 catches *errors* during interaction. This one catches *noise* — `log` and `info` and stale debug calls that don't break anything but degrade signal-to-noise for everyone debugging downstream.

**Evaluate:**
- After a clean load + walking criteria 1–10, drain `qa_console_logs` (or watch the running buffer). Bucket every entry by:
  - **`error` / `pageerror`** → already counted under #4 / #10. Re-list here only if missed.
  - **`warning`** → categorize:
    - **Genuine misuse warning** (the notebook is correctly telling the user they did something wrong, OR the notebook is correctly warning of a deprecation it consumes from upstream) → **OK**.
    - **Spurious / framework / unactionable** ("X is deprecated" with no actor able to fix it, repeated on every render) → **noise**.
  - **`log` / `info` / `debug`** → almost always noise. Exception: a single, intentional, documented session-startup banner (e.g. `console.log("foo v1.2 ready")`) is acceptable but discouraged.
- For each noisy entry, look at the `location` field to identify the source:
  - `blob:null/<uuid>` URLs → an Observable cell. **Author's responsibility, counts against the notebook's score.** Trace via `list_cells` (search definitions for the log message) to identify which cell.
  - `file:///...notebook.html:<line>:<col>` pointing into the bootloader script → **framework noise**. Doesn't count against the notebook, but flag separately as a framework issue (open against the bootloader / lopecode core).
  - External URLs (CDN scripts, vendored libs) → **upstream noise**. Doesn't count against the notebook but record so we can either suppress it or upstream a fix.
- Re-drain after each interaction batch in criteria #4 and #10. A cell that's quiet at load but dumps state on every input change is the most common offense.

**Good:**
- Zero `log` / `info` / `debug` from notebook cells.
- Zero spurious `warning` from notebook cells.
- Any `warning` present is a genuine misuse warning, fires only when the misuse occurs, and has an actionable message.
- Framework / upstream noise is acknowledged but separated from the notebook's score.

**Bad:**
- Notebook cells emit `console.log` on load or on every recompute.
- Notebook cells emit warnings that fire unconditionally (e.g. "experimental API in use" — fine to log once at load, not fine every render).
- Misuse warnings are ambiguous, e.g. `console.warn("invalid")` with no context about what was invalid or what to do.
- Notebook silently swallows real problems with `console.log("oh well")`-style fallbacks.

**Examples of acceptable misuse warnings:**
```js
if (!Array.isArray(data)) console.warn(`${cellName}: expected array, got ${typeof data} — ignoring`);
if (opts.deprecated_field !== undefined) console.warn("deprecated_field is removed; use new_field");
```

**Examples of unacceptable noise:**
```js
console.log("rendering chart with", data);   // debug residue
console.log(value);                            // pure noise
console.warn("Note: this uses experimental Foo");  // fires every render
```

---

## Scoring summary template

When writing the report, end with this table:

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass / partial / fail | … |
| 2 | Explanation | pass / partial / fail | … |
| 3 | Doc matches impl | pass / partial / fail | … |
| 4 | Does what it says | pass / partial / fail | … |
| 5 | Feature list | pass / partial / fail | … |
| 6 | Lean code | pass / partial / fail | … |
| 7 | Scoped domain | pass / partial / fail | … |
| 8 | Claims tested | pass / partial / fail | … |
| 9 | Serialization | pass / partial / fail | … |
| 10 | Adversarial / try to break | pass / partial / fail | … |
| 11 | Clean console logs | pass / partial / fail | … |

Any **fail** = blocker. Sum of **partials** is a quality temperature.

**Note on ordering:** criteria 1–9 run in order on the cleanly-loaded notebook. Criterion 11 (console hygiene) is evaluated *throughout* — drain console after every batch of interactions — but scored at the end. Criterion 10 (adversarial) runs last and creates noise; if you intend to QA the notebook again afterward, reload it.
