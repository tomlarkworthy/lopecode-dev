# robocoop-4 QA — MIMO (xiaomi/mimo-v2.5-pro) builds "SVG Background Explorer"

Date: 2026-06-28 · Model: `xiaomi/mimo-v2.5-pro` · Notebook: `@tomlarkworthy/robocoop-4` (lopebooks) · Driver: autonomous pairing QA

## Task
"Create a plan for an SVG background explorer notebook" → then "execute the plan" (build `@user/svg-bg-explorer` live inside robocoop-4).

## Results

### 1. Planning — STRONG PASS
One model call, ~3.3k completion tokens, **$0.0035**, ~20s. Produced a complete, idiomatic 8.9k-char design plan:
- Single-module reactive dataflow chain: `viewof selectedPattern` → `currentPatternDef` → `viewof params` (built from the pattern's param schema) → `baseTileSvg` (`generate(params)`) → `preview` (`<pattern>`+`<rect>`) → `exportSvg` → `exportButtons`.
- Pattern schema `{name, description, params:[{name,value,min,max,step,label}], generate}`.
- Dynamic `viewof params` rebuild via runtime teardown; pure-SVG export ("assets are code"); risk table; future work.
- Respected "plan only" (no premature tool calls). Grasp of the reactive idiom (the area glm struggled with) is clearly present.

### 2. Build — WORKING after two default-value fixes; both rooted in a lopepage harness interaction (verified)
MIMO built a clean single-module dataflow: `patternList` (4 patterns: Diagonal Stripes, Polka Dots, Checkerboard, Hex Grid) → `viewof selectedPattern` → `currentPatternDef` → `viewof params` (built from each pattern's param schema) → `baseTileSvg = currentPatternDef.generate(params)` → `preview`/`exportSvg`. **Architecture, schema, generators, preview and export are all correct** — all cells are bounded (a `find`, a `generate` returning a fixed 600×400 `<svg>` with one `<pattern>` tile; no loops over user-controlled counts).

**Two functional bugs, same root cause — both surface as "viewof not displaying"/blank output (matches the user's screenshot):**
1. `viewof selectedPattern` had no usable initial value → `selectedPattern === null` at boot → `currentPatternDef` undefined → dead chain.
2. The color params use `Inputs.text({value: "#4e79a7"})`; at boot their live `.value` is empty → `exportSvg` emits `fill=""` → invisible pattern even once a pattern is selected.

**Root cause — PINNED and FIXED:** stale bundled `@tomlarkworthy/summarizejs` (missing the B22 clone-before-inspect fix) corrupts agent-built `Inputs` values. MIMO's schema is correct (Hex Grid `strokeColor: "#76b7b2"`, `bgColor: "#f0f0f0"`) yet the live `params` come back `""` and the `<select>` sits at `selectedIndex -1` — the value is lost *after* construction. Isolation (clean tab `rc4probe1`/`rc4verify1`):
- Fresh `Inputs.select`/`Inputs.text`/`Inputs.form` **retain** their values.
- **`summarizeJS(liveInputsElement)` corrupts the original** (`select.value "A"→null`, `form text "#111111"→""`) — exactly the live symptom.
- Staged: `inspect(original)` → null; `inspect(clone)` → safe; `cloneNode` alone → safe; `html\`<div>${inspect(clone)}\`` → safe. So **`inspect()` mutates the live Inputs element it is handed** (it inlines/moves/normalizes the node), and the fix is to never hand it the live node.
- The **live** `summarizeJS` had `hasCloneFix: false` — the OLD body `html\`<div>${inspect(value)}\`` (inspects the live value). The disk file (`modules/@tomlarkworthy/summarizejs.js:42`) already clones first; it had simply never been synced into the robocoop-4 bundle (reverted by the e0ef730 re-export).
- `summarizeJS` is called by `robocoop-4-hostbridge` `probeAndWatch` after every write, and by `inspect_value`/`list_values`/`watch_variable`, on the agent module's **named pid** viewof cells — so every agent-built notebook with an `Inputs` default got blanked, regardless of the layout hash (panes are irrelevant). The number/range survived while text/select didn't because `inspect()`'s mutation maps to a value-setter call that `Inputs.range` rejects but `Inputs.text`/`select` accept.

**Fix shipped & verified:** `sync-module --module @tomlarkworthy/summarizejs --source modules/@tomlarkworthy/summarizejs.js` into both robocoop-4 HTMLs (lopebooks `082c4ba`, lopecode `80962b3`). Re-verified live (`rc4verify1`, `hasCloneFix: true`): `Inputs.select` and `Inputs.form` values **survive** `summarizeJS`. This is a **root-cause fix**, not a workaround — no prompt change or risky harness edit needed. (Note: the earlier `el.value = el` / "value-post" framing was a coincidental same-end-state, **not** the actual path; the real path is `inspect()` mutating the live node via the stale summarizeJS.)

**Fixes applied live (both verified end-to-end, no freeze):**
- `currentPatternDef = patternList.find(p => p.name === selectedPattern) ?? patternList[0]` — defaults to the first pattern when the clobbered select yields null.
- `baseTileSvg` backfills empty/null params from the pattern's schema defaults before calling `generate`, so colors render even when the text inputs are clobbered (and still update when the user types).

After the fixes: boots to Diagonal Stripes with real colors (`exportSvg` 653 chars, `#4e79a7`/`#f28e2b`, no empty fill); interactively switching to Hex Grid updates `selectedPattern → currentPatternDef → exportSvg` (486-char valid colored SVG) with **no freeze**. Interactive switching works because the clobber only wipes the *initial* value — subsequent `input` events still propagate.

### 3. Steer handling — PASS (B2 not reproduced)
Sent a precise steer ("give Inputs.select an initial value; verify selectedPattern non-null at boot"). MIMO **received and acted on it** (runtime began churning edits immediately). The earlier B2 "steer silently dropped" failure did **not** reproduce here.

### 4. The "freeze" — NOT a runaway explorer cell (corrected again, with verification)
Two earlier diagnoses were wrong (both "plausibility is not verification" misses): first "purely a runaway cell," then "screen-lock + a genuine runaway cell." Reproducing the build cleanly (tab `rc4auto1`) disproves the runaway:
- **The explorer chain is fully bounded.** Every cell was read directly from the runtime: `currentPatternDef` is a `find`; `baseTileSvg` is `generate(params)` returning a fixed 600×400 `<svg>` with a single `<pattern>` tile; `preview`/`exportSvg` are fixed templates. None loops over a user-controlled count. Animating the whole chain (default fix → `currentPatternDef` resolves → `baseTileSvg`/`exportSvg` compute) completes instantly and does **not** freeze.
- **The freezes I saw this round were transient and recovered on their own.** `eval` timed out twice (30s), then `3+3` returned `6` ~90s later with no intervention. They correlated with my own heavy introspection evals (iterating all `_variables` and reading every `_value`) and with the robocoop-4 app's own activity (the `history` cell was incrementing 48→50 throughout), not with the explorer.
- **Screen lock** remains a real, separate cause of the *original* away-from-keyboard stall (macOS suspends the browser process; `tick=messageChannel` only defeats background-tab throttling while awake), but it is orthogonal to any cell bug.
- **The earlier hard freeze of MIMO's `rc4fix3`** could not be read (trapped in a lost per-tab fs), so its cause is **unconfirmed and should not be asserted as a runaway cell.** The reproducible rebuild shows the explorer architecture itself does not hang.

### 4b. Post-site PINNED to stale summarizeJS (FIXED)
Confirmed via the clean-tab isolation above: `summarizeJS(liveInputsElement)` corrupts the value, and the live bundle's `summarizeJS` lacked the clone fix. `summarizeJS` reaches the explorer's viewofs through `robocoop-4-hostbridge` `probeAndWatch` (~ln 384, runs after every write on every named pid cell) and the on-demand `inspect_value`/`list_values`/`watch_variable`. Fixed by syncing the canonical clone-fixed `summarizejs` into both robocoop-4 HTMLs; re-verified live. (Lesson retained: do NOT call `probeAndWatch`/`probe` from `eval` — that wedged the runtime, B27 addendum; isolate by calling `summarizeJS`/`inspect` on throwaway elements only.)

### 5. Loop hygiene — minor finding
Agent turns repeatedly ended on a dangling `tool` result with **no `task_complete`** and no final assistant summary (same family as the prior B1/"won't cleanly complete" findings). Did not break the build but leaves ambiguous "is it done?" state.

## Harness findings (for fixing)
- **H1 (latent, not observed this run): no runaway-cell protection.** Observable runs cells synchronously on the main thread, so a single unbounded cell *would* freeze the whole runtime (agent loop, channel, UI). This is a real latent risk worth Worker-izing/bounding, but note: it was **not** the cause of any freeze in this QA — the prior "runaway cell" claim was retracted (§4). Don't cite this run as evidence it occurred.
- **H2 (severe) — FIXED: stale bundled `summarizeJS` corrupted agent-built Inputs.** The robocoop-4 bundle shipped a `summarizeJS` without the B22 clone-before-inspect fix, so it called `inspect()` on the *live* `Inputs` element (which `inspect()` mutates), wiping `Inputs.select`/`Inputs.text`/`Inputs.form` defaults (select→null, text→"") — the "viewof not displaying" symptom. Called from `probeAndWatch` (every write) + `inspect_value`/`list_values`/`watch_variable`. Fixed by syncing the canonical clone-fixed `summarizejs` into both robocoop-4 HTMLs; verified live. **Lesson: re-exports silently revert synced module fixes** — after any robocoop-4 re-export, re-verify `summarizeJS` has the clone fix (`hasCloneFix`). The number/range survived because `inspect()`'s mutation maps to a value-setter call those reject; only writable text/select accepted it.
- **H3: agent-built modules are per-tab and not in local-change-history.** The agent's justbash fs is per-tab (a fresh tab returns ENOENT for the file) and agent-written cells go through file-write (applyModule), NOT the editor, so they don't replay on a fresh boot. A build therefore lives only in its originating tab. Consider persisting the agent fs to disk via file-sync, or writing cells through a path that local-change-history records.

## Outcome
**The headline result is a shipped root-cause harness fix**, not just a characterisation: the stale bundled `summarizeJS` (H2) was the real reason agent-built notebooks blanked, and syncing the clone-fixed version resolves it for *all* future agent builds (verified live: Inputs values survive `summarizeJS`). Committed: report + per-notebook B27 (`f59dc81`, `426c588`, `a832bf2`); summarizejs sync (lopebooks `082c4ba`, lopecode `80962b3`). The rebuilt explorer worked live (tab `rc4auto1`) after two belt-and-suspenders robustness fixes, but those are now **unnecessary** given the H2 fix — they were a per-cell workaround for the bundle bug. The explorer was QA scaffolding (per-tab fs, not persisted); MIMO's original build is lost but fully characterised. Prior session fixes also landed (visualizer, tick-aware exporter-3, tick+ocean restore).

## Bottom line
MIMO is a strong **planner** and a competent **builder**: it produced a correct single-module reactive architecture (pattern schema → dynamic param form → generator → pure-SVG preview/export). The recurring "viewof not displaying" failure across MIMO/agent builds was **not a model deficiency** — it was a robocoop-4 harness bug (a stale `summarizeJS` corrupting Inputs values when watched), now **root-caused and fixed**. The earlier "MIMO's fix froze the runtime" and "value=self post" claims are both **withdrawn** (the chain is bounded; the real path is `inspect()` mutating the live node via stale summarizeJS). Net: excellent plan, working build, and the QA loop converted a recurring symptom into a one-commit root-cause fix.

## Follow-ups (open)
- **Repo-wide drift CONFIRMED: ~190 notebooks ship the stale `summarizeJS`** (audited 2026-06-28 — only robocoop-4 (now fixed) and visualizer are current). This is the known module-drift problem; fix it via the **module-store build system** (`tools/lope-build.ts`, canonical `/modules/`), NOT by hand-syncing 190 HTMLs. Deliberately left for that process — a mass rewrite is out of scope for this QA and the "robocoop-4 local files only" framing. Impact is limited in practice: `summarizeJS` only corrupts a value when called on a live `Inputs` element (mainly agent/inspect tooling like robocoop and the debugger notebooks); most notebooks carry it as an unexercised transitive dep.
- **Re-export regression guard:** robocoop-4 re-exports silently revert synced module fixes (this bug, plus tick/theme per [[project_robocoop4_reexport_drops_customizations]]). Consider a post-export check asserting `summarizeJS` has the clone fix.

## OUT-OF-THE-BOX VALIDATION (2026-06-28) — observed, not asserted
After the two fixes (summarizeJS clone + engine maxTokens 8192→32000), drove MIMO (`xiaomi/mimo-v2.5-pro`) on TWO fresh builds in clean tabs, NO manual edits, and verified by reading the live runtime:
- **Build A — `@user/svg-pattern-explorer`** (30 cells, 0 errored): `viewof controls` value fully populated with defaults `{patternType:{Dots}, fg:"#333333", bg:"#ffffff", size:8, spacing:24, strokeWidth:1, opacity:1, angle:45, tileSize:120}`; `svgTile`/`exportSvg`/`previewSvg` all valid `<svg>` strings (1714/1930/1894 ch).
- **Build B — `@user/tip-calculator`** (15 cells, 0 errored): inputs populated (`billAmount 50`, `tipPercent 18`, `splitCount 1`); computed chain correct (`tipAmount 9`, `totalWithTip 59`, `perPerson 59`). NaN seen mid-build was transient lazy-eval, resolved correct once settled+observed.
- **First attempt (pre-maxTokens-fix) FAILED**: build explored 3 steps then stopped at a reasoning-only turn truncated at 8192 (`finish_reason:'length'`) — that's what surfaced the maxTokens blocker. Re-ran after the fix → both builds above succeeded.

**Verdict: MIMO builds well out of the box on robocoop-4** after the two committed fixes — confirmed by 2 observed fresh builds, not by assertion. (Process note: the first OOB run failing is what caught the second, independent blocker — observation-based DoD works.)
