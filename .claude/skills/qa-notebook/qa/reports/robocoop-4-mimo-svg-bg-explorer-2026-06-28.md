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

### 4. Runtime froze during the steer-rework — TWO overlapping causes (corrected)
Initially diagnosed as purely a runaway cell; that was an over-claim ("plausibility is not verification"). Accurate picture from later evidence:
- **Screen lock (confirmed by user).** The freeze coincided with the machine locking. macOS suspends the whole browser process on lock → no in-page tick survives (tick=messageChannel only defeats *background-tab throttling while awake*, NOT OS lock/sleep). This explains why freshly-opened `rc4fix4`/`rc4fix5` could not boot *while away*, and why `rc4fix5` connected the instant the machine was unlocked.
- **A genuine runaway cell, too.** Post-unlock, `rc4fix5` (clean, explorer NOT mounted) is fully responsive while `rc4fix3` (explorer mounted+computing) stays frozen — `eval_code` and `list_variables` both 30s-timeout. The only difference is the mounted explorer, so MIMO's steer-rework did introduce a main-thread-blocking cell. Exact culprit **unconfirmed** — the code is trapped in the frozen tab, unreadable while frozen.
- **Recovery reality:** the explorer cells were written via the agent's justbash fs file (not the editor), so they are NOT in local-change-history and do not replay on a fresh boot; and the justbash fs is **per-tab** (fresh `rc4fix5` returns ENOENT for the file). So MIMO's exact code lives only in the frozen `rc4fix3`; reloading to unfreeze discards the in-memory fs → effectively unrecoverable. Lesson: export+commit a checkpoint at the working milestone BEFORE any steer/risky edit.

### 5. Loop hygiene — minor finding
Agent turns repeatedly ended on a dangling `tool` result with **no `task_complete`** and no final assistant summary (same family as the prior B1/"won't cleanly complete" findings). Did not break the build but leaves ambiguous "is it done?" state.

## Harness findings (for fixing)
- **H1 (severe): no runaway-cell protection.** A single user/agent-authored cell running unbounded synchronous work freezes the *entire* runtime — agent loop, channel, and UI all die with it. A robust coding-agent harness should bound/Worker-ize cell execution or at least keep the channel responsive so the agent can recover.
- **H2: no observability during a freeze.** Once wedged, the cell that caused it cannot be read (reading needs the runtime). Consider persisting the agent's last-written file to disk (file-sync) so a frozen build is inspectable out-of-band.
- **H3: a frozen build is unrecoverable across tabs.** The agent's justbash fs is **per-tab** (a fresh tab returns ENOENT for the file), and agent-written cells go through file-write (applyModule), NOT the editor, so they are **not** in local-change-history and do not replay on a fresh boot. Combined with the freeze (lock + runaway), MIMO's exact code is trapped in the frozen tab and lost on reload. Consider persisting the agent fs to disk via file-sync, or writing cells through a path that local-change-history records.

## Recovery outcome
MIMO's exact build is **not recoverable** (per-tab fs, not in local-change-history, trapped in the frozen `rc4fix3`). Per user decision (2026-06-28): close out — keep this report + the committed harness fixes; rebuild later if desired. A fresh rebuild is cheap (~15 min, ~$0.07) and `rc4fix5` (clean, same browser profile, has the OpenRouter key) is a ready environment. Two known fixes to apply next time: (a) give `viewof selectedPattern` an initial `value` (default `patternList[0]`); (b) checkpoint (export+commit) at the working milestone BEFORE any steer.

## Bottom line
MIMO is a strong **planner** and a competent **builder** (working architecture + correct export), but shows the predicted **reactive-idiom execution gaps**: it missed an Inputs default value, and — critically — its *fix attempt froze the runtime*. Net: excellent plan, ~90%-working build, one easy functional fix, and one severe execution failure that also exposed real harness gaps (H1–H3).
