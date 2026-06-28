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

### 2. Build — MOSTLY WORKING, one functional bug
MIMO built 19 cells, **0 errored**. Verified end-to-end (after manually selecting a pattern):
`selectedPattern: "Dot Grid"` → `currentPatternDef {name,description,params,generate}` → `baseTileSvg` valid 279-char SVG → `exportSvg` valid 562-char `<svg>`. Dropdown mounted, 9 SVGs rendering. **Architecture, schema, generators, preview and export are all correct.**

**Functional bug (matches the user's screenshot):** `viewof selectedPattern` was created with **no default value** → `selectedIndex === -1` → `selectedPattern === null` at boot → `currentPatternDef` undefined → the whole preview/export chain is dead until the user manually picks a pattern. This is the classic Inputs.select "no initial `value`" idiom miss.

### 3. Steer handling — PASS (B2 not reproduced)
Sent a precise steer ("give Inputs.select an initial value; verify selectedPattern non-null at boot"). MIMO **received and acted on it** (runtime began churning edits immediately). The earlier B2 "steer silently dropped" failure did **not** reproduce here.

### 4. CRITICAL — MIMO's steer-fix wedged the runtime
While reworking the default-value fix, MIMO defined a cell that **blocks the main thread** (infinite loop or massive synchronous SVG compute — consistent with its own "large tile = slow" risk note). Confirmed wedged: both `eval_code` and `list_variables` time out (30s) repeatedly; the page is frozen. The build was never persisted to disk, so it exists only in the runtime + local-change-history (IndexedDB).

### 5. Loop hygiene — minor finding
Agent turns repeatedly ended on a dangling `tool` result with **no `task_complete`** and no final assistant summary (same family as the prior B1/"won't cleanly complete" findings). Did not break the build but leaves ambiguous "is it done?" state.

## Harness findings (for fixing)
- **H1 (severe): no runaway-cell protection.** A single user/agent-authored cell running unbounded synchronous work freezes the *entire* runtime — agent loop, channel, and UI all die with it. A robust coding-agent harness should bound/Worker-ize cell execution or at least keep the channel responsive so the agent can recover.
- **H2: no observability during a freeze.** Once wedged, the cell that caused it cannot be read (reading needs the runtime). Consider persisting the agent's last-written file to disk (file-sync) so a frozen build is inspectable out-of-band.
- **H3: wedged `file://` tab blocks recovery.** Same-origin tabs share a renderer; the frozen tab prevents new robocoop-4 tabs from booting in the same browser, and macOS `open` may just refocus the dead tab. Recovery requires closing the wedged tab manually.

## Recovery steps (for the user)
1. Close the wedged system-browser tab(s) (`?cb=rc4fix3` and the dead `rc4fix4/5`).
2. Re-open robocoop-4 **without** the explorer pane: `#view=R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))` — local-change-history will replay the `@user/svg-bg-explorer` cells but, being unmounted, they stay dormant (unobserved → uncomputed → no re-wedge).
3. Inspect the cell definitions (read `_definition`, do not mount) to find the infinite-loop/heavy cell; fix it (likely `tiledPreview`/`baseTileSvg` tiling bounds or a generator without `yield`).
4. The single functional bug to also fix: give `viewof selectedPattern` an initial `value` (default to `patternList[0]`).

## Bottom line
MIMO is a strong **planner** and a competent **builder** (working architecture + correct export), but shows the predicted **reactive-idiom execution gaps**: it missed an Inputs default value, and — critically — its *fix attempt froze the runtime*. Net: excellent plan, ~90%-working build, one easy functional fix, and one severe execution failure that also exposed real harness gaps (H1–H3).
