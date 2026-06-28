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

**Root cause (grounded by repro + live DOM signature, not the obvious one):** MIMO's schema is correct — every pattern has proper color defaults (e.g. Hex Grid `strokeColor: "#76b7b2"`, `bgColor: "#f0f0f0"`) — yet the live `params` come back `strokeColor: "", bgColor: ""`, and the live `<select>` sits at `selectedIndex -1`. The value is lost *after* construction:
- A fresh `Inputs.text({value:"#76b7b2"})` / `Inputs.form({...})` / `Inputs.select(names,{value:names[0]})` built in `eval` **retain** their values (`"#76b7b2"`, `selectedIndex 0`).
- Applying a single **`el.value = el`** (the Observable "post-upstream" idiom, [[feedback_lopepage_value_self]]) **resets them**: select → `selectedIndex -1 / null`; form → every sub-input distributed `undefined`. No throw.
- The **live DOM matches this signature exactly**: in the mounted `viewof params`, the `number`/`range` inputs keep their values while the `text` (color) inputs are `""` — because the value-*setter* given garbage is *rejected* by `Inputs.range` but *accepted* (→ "") by `Inputs.text`. `cloneNode(true)` preserves `selectedIndex`, so cloning is ruled out.

So this is a **harness × idiomatic-Observable interaction**, not a model error: some render/observe path posts `element.value = element` to the viewof, invoking the Inputs setter with a value that has none of the expected options/keys. The exact trigger line is **not pinned** — it is not a literal `x.value = x` in source (grep-clean across lopepage/view/visualizer/channel), so it's an indirect/compiled assignment or robocoop-4's own inspector rendering of the agent-created module (the explorer is *not* in the layout hash, so lopepage panes are not mounting it). It also **disproves the old note's claim that `Inputs.*` survive the post** — their value setter is exactly what makes them vulnerable.

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

### 5. Loop hygiene — minor finding
Agent turns repeatedly ended on a dangling `tool` result with **no `task_complete`** and no final assistant summary (same family as the prior B1/"won't cleanly complete" findings). Did not break the build but leaves ambiguous "is it done?" state.

## Harness findings (for fixing)
- **H1 (latent, not observed this run): no runaway-cell protection.** Observable runs cells synchronously on the main thread, so a single unbounded cell *would* freeze the whole runtime (agent loop, channel, UI). This is a real latent risk worth Worker-izing/bounding, but note: it was **not** the cause of any freeze in this QA — the prior "runaway cell" claim was retracted (§4). Don't cite this run as evidence it occurred.
- **H2 (severe, confirmed by repro): lopepage's `element.value = element` resets Observable Inputs on mount.** The "value=self" assignment invokes each Input's value *setter* with the element: `Inputs.select` → `selectedIndex -1 / value null`; `Inputs.form` → sub-inputs distributed `undefined` (text/color clear to "", range rejects it and survives). This silently wipes idiomatic `Inputs.select`/`Inputs.text` default values — the "viewof not displaying" symptom. Agents (and humans) cannot defend per-cell; **fix it in lopepage**: skip the `.value = element` assignment for elements that already expose a value getter, or write through the Inputs API. See [[feedback_lopepage_value_self]] (which previously, wrongly, claimed `Inputs.*` survive this).
- **H3: agent-built modules are per-tab and not in local-change-history.** The agent's justbash fs is per-tab (a fresh tab returns ENOENT for the file) and agent-written cells go through file-write (applyModule), NOT the editor, so they don't replay on a fresh boot. A build therefore lives only in its originating tab. Consider persisting the agent fs to disk via file-sync, or writing cells through a path that local-change-history records.

## Outcome
The rebuilt explorer (tab `rc4auto1`) is **working live** after the two one-line robustness fixes (§2). It was **not** baked into the committed robocoop-4 HTML — it is QA scaffolding (a notebook-in-notebook), and the per-tab fs means it is not persisted; the fixes are recorded here so a rebuild is trivial. MIMO's *original* build remains lost (per-tab fs, trapped in a closed tab) but is no longer needed — its behaviour is fully characterised. The committed outputs of this session are the harness/customization fixes already landed (visualizer, tick-aware exporter-3, tick+ocean restore) plus this report.

## Bottom line
MIMO is a strong **planner** and a competent **builder**: it produced a correct single-module reactive architecture (pattern schema → dynamic param form → generator → pure-SVG preview/export) that works once two default values survive mounting. Its only genuine execution gaps were missing `value` defaults — and even those are largely masked by a **lopepage harness bug** (H2) that wipes those defaults regardless of what the model writes. The earlier "MIMO's fix froze the runtime" claim is **withdrawn**: the explorer chain is bounded and does not hang. Net: excellent plan, working build after two trivial robustness fixes, and the most actionable finding is a harness fix (H2), not a model deficiency.
