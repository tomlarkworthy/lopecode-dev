# robocoop-4 live pairing QA — 2026-06-28

Model: z-ai/glm-5.2. Notebook: lopebooks/notebooks/@tomlarkworthy_robocoop-4.html (live channel).

## Watches attached
(to be filled)

## Findings
### F1 — theme regressed parchment → should be ocean-floor
- Symptom: notebook boots with light/parchment theme.
- Root cause: the active baked theme (embedded CSS blocks at lines ~692/703/721 + boot-loader `adoptedStyleSheets` imports) is the parchment/light trio. A jumpgate re-export after commit 9a17974 ("default theme ocean-floor") overwrote the ocean trio back to default parchment. bootconf + modules unaffected.
- Fix: surgical regex swap parchment/light trio → ocean-floor/dark trio in both the embedded `<script>` CSS blocks and the boot-loader imports, on both lopebooks + lopecode copies. NOT touching bootconf hash/mains (avoid re-introducing the exporter-3 layout change).
- Status: applying.

## Live observation log (z-ai/glm-5.2 building @user/background-explorer)
- Task appears to be a theme/background explorer (module @user/background-explorer, depends on @tomlarkworthy/themes).
- msg30: assistant turn rendered as text:"null" in my mirror → tool-only assistant turn (no text block). [mirror cosmetic: shows "null" for tool-only turns]
- msg31 (tool result): "Edited /notebook/@user/background-explorer.js (1 r…) evaluating 'v.import'); bg_color_key: undefined is n…" → **the agent's edit left ERRORED cells**: `bg_color_key` undefined + an error "evaluating 'v.import'". Watching whether it self-corrects (prompt says keep going until no cell errors).
- msg33 (tool result): inspected theme_properties → `--theme-foreground: "#dfdfd6"` (light/parchment values) — consistent with F1 (theme is still parchment).

### F2 — cross-module import from agent-created module not resolving
- msg31/39 (repeated): agent's cell in @user/background-explorer.js errors `evaluating 'v.import'` + `bg_color_key: undefined is not …`. The cell tries to import another module's cell (theme_properties / a `@variable` dep) via the `v.import(...)` form.
- msg40 assistant: "The `@variable` dep isn't resolving. Let me … read properties directly from the page instead of importing." → agent self-corrects (abandons import, reads computed style off the page).
- Significance: the **cross-module import idiom** (documented in prompt commit a5ac1fc) is NOT working for agent-authored modules — the bot wrote a plausible `v.import` cell that the runtime can't resolve, burned 2 edit cycles on it, then worked around it. Candidate idiom-doc / tooling fix. Self-correction itself = correct behavior.

### F3 — bot guesses wrong cell name in eval (msg56)
- msg52: bot ran list_values (correct survey idiom), saw cells incl `bg_color`, `pattern_svg`, `pattern_opacity`, `_pattern_note`.
- msg56 (tool error): `Can't find variable: bg` — bot then evaluated an expression referencing `bg` (abbreviation of `bg_color`). Name guess despite having just listed the real names.
- Pattern: model abbreviates/misremembers a cell name in eval right after a list_values that showed the true name. Cheap self-inflicted error cycle. Watch for self-correct.

### F4 — edit_file old_string mismatch (msg63)
- msg61: preview cell renders ("SVG Background Explorer") — feature working.
- msg63 (tool error): `ERROR: old_string not found in /notebook/@user/background-explorer.js.` edit_file failed to locate the target string (likely whitespace/exact-match drift after prior edits). Recurring edit-tool failure class; costs a re-read+retry. Watching self-correct.

### F2 (update) — cross-module read STILL undefined after workarounds
- msg65: bot tries the dynamic-import form `runtime.module((await import("/@to…")))` to pull another module's cell.
- msg68 watch: `@user/background-explorer:theme_properties = undefined` — STILL undefined. The preview renders, but the theme-property integration the whole "background explorer" depends on never resolves.
- This is now the central idiom gap of this run: reading a sibling module's reactive cell value from an agent-authored module. Multiple distinct attempts (v.import, read-from-page, dynamic import) all failed to populate `theme_properties`. Strong candidate for a dedicated prompt idiom + a worked example, or a hostbridge helper tool (e.g. read_cell(module,name)).

### Grounded state @ msg~84 (live runtime read, not self-report)
- @user/background-explorer: `preview` renders (object w/ .value), `pattern_svg` = function, **0 errored cells**, but **`bg_color` = undefined** (live). No throw, but the color value is empty (downstream of F3 bg/bg_color naming).
- theme_properties earlier flagged undefined (msg68) — by msg78 bot retrieved 12 theme keys (fg,fgMuted,…,syntaxLiteral); F2 may have resolved via a later approach. Did NOT over-claim either way; bg_color is the concrete live gap.

### F5 — turn ended without a tool call (msg86)
- system nudge: "You ended your turn without calling a tool… do a concrete step; do not just describe." Model spent a turn describing instead of acting. Mild waste; loop recovered it with a nudge.

### Good behavior — diagnosed viewof-recreation reactive bug (msg87)
- Bot: "The selects are in the notebook UI which is separate… reactive `colors` so the selects don't get recreated." Correctly identified that recomputing the cell rebuilds the `viewof` selects and loses their state — a genuine Observable reactivity insight. Refactoring to a stable reactive value. (Rubric #15-adjacent competence.)

### F6 — transient `colors.bg` null-during-recompute (msg134/137)
- Watch surfaced `⚠ null is not an object (evaluating 'colors.bg')`.
- Grounded live read moments later: colors = valid object (fg,fgMuted,…), bg_color = "color-mix(in srgb, #dfdfd6 4%, #161616)", color_keys = [12], 0 errors. → the error was TRANSIENT: `colors` was momentarily null mid-recompute, a dependent cell read `colors.bg` before it settled, then self-healed.
- QA risk: the auto-watch streams these transient mid-recompute errors into the agent's context. A model could chase a phantom bug that has already self-healed (cost + churn). Consider debouncing watch-error reports past the settle, or marking "transient (cleared)".

### COMPLETION VERDICT (msg167 — agent declared done)
- Grounded final read of @user/background-explorer: **23 cells, 0 errored, 0 undefined, 0 problems.** Completion claim is VALID (not a B1 premature/false completion).
- The string of watch-streamed undefineds during build (fg_color_key, color_keys, colors.bg null) were ALL transient mid-recompute — agent correctly ignored them; final module is healthy. Reinforces F6: auto-watch streams transient recompute errors; here the model showed good judgment not chasing them.
- Note (msg146): one edit reported "live runtime unchanged; fix and re-edit" for _v_fk — the apply detected no effective runtime change and told the agent to re-edit; agent recovered. Worth confirming this message isn't misleading the model when the edit *was* semantically a no-op vs a real apply miss.
- Agent closed the claude-code-pairing pane via hash (close=@tomlarkworthy/claude-code-pairing) on completion — may drop the QA channel.

## Summary of findings this session
- F1 theme regression parchment→ocean (NOT fixed, on hold per user)
- F2 cross-module read of sibling cell value: hard for agent-authored modules; multiple attempts; eventually worked
- F3 wrong cell-name guess in eval (bg vs bg_color)
- F4 edit_file old_string mismatch (whitespace drift)
- F5 turn ended w/o tool call → nudge
- F6 auto-watch streams transient mid-recompute errors (phantom-bug bait)
- Good: diagnosed viewof-recreation reactive bug; used list_values survey idiom; clean self-correction; VALID completion.

## HARNESS FAULT (root-caused, grounded) — duplicate lopepage-2 panes break viewof rendering
User report: viewof cells render as `▶HTMLFormElement {…}` inspector summaries (not live widgets); can't see their code. "Bot backed out because it couldn't get viewof selectors working."

Investigation (all live-runtime grounded, not self-report):
1. All 5 `viewof` value-elements in @user/background-explorer are `isConnected:false` (detached). The runtime variables hold valid same-realm HTMLFormElements (instanceof Element true, ownerDocument===document, ctor===window.HTMLFormElement). NOT a realm mismatch.
2. Manually re-mounting one (appendChild into its cell node) works: mounts, 8 options, `.value` getter responds. **The bot's code is correct; the widget is valid.**
3. summarizeJS(el) returns a STRING and does NOT detach the element → inspect_value/list_values are NOT the cause (B22 fix holds). Earlier hypothesis refuted by test.
4. 12 connected "stale" Inputs widgets in the doc, 0 of which are current cell values; current values detached/object-summarized. Backwards reactive swap (old kept, new orphaned).
5. ROOT: `lp2_paneRegistry` has 1 entry for @user/background-explorer, but the DOM has **2 distinct .lp2-pane nodes** rendering it, and **neither equals the registry's cached pane** (isRegPane:false both). Both carry their own visualizer root; connected-form counts 3 + 9 = the 12 leaked widgets.

Mechanism: layout rebuilds (agent hash churn: open bg-explorer, close hostbridge, close pairing) created duplicate panes instead of reusing the immortal registry pane. Two visualizer/inspector sets observe the SAME variables; an element can only live in one DOM location, so the inspectors fight — each mount detaches the element from the other, the latest recompute's element is left detached and rendered as `name = HTMLFormElement {…}`, and every recompute leaks a stale widget. This is why interacting with on-screen widgets can't update the cell (value-bearing node is orphaned) and why the bot, inspecting its own viewof cells, saw HTMLFormElement objects / null/stale values and concluded its UI was broken → backed out. **Harness-induced failure, not a model deficiency.**

Secondary: "can't see code" = the live-created module isn't persisted (`window.lopecode.contentSync("@user/background-explorer")` === null), though the runtime HAS the cell definitions. Editor source-of-truth for an unpersisted live module is the gap; not a runtime orphan.

Fix direction (lopepage-2 / immortal panes — project_lopepage2_immortal_panes, worktree .claude/worktrees/lopepage-2):
- Honor lp2_paneRegistry on every layout (re)build: reuse the cached immortal pane for a module name; never instantiate a 2nd pane/visualizer-root for the same module.
- Defensive: visualizer should tolerate >1 observer per variable for element values (clone-for-display, or single-owner mount) so duplicate roots can't orphan the live node.
- Consider: element-valued cells leak stale nodes across recompute even single-pane — verify cleanup on pending()/fulfilled().

## FIX (visualizer teardown) — applied + verified
Bug confirmed at source: Observable Inspector `fulfilled` object-branch = `!isnode(e) || (e.parentNode && e.parentNode !== slot)`. The viewof element's parentNode was a DEAD inspector `_node` div (no cell owns it), so the guard refused re-mount → object summary forever. The dead div came from visualizer teardown: `observer._node.remove()` carried the live element off INSIDE the removed _node.

Changes in modules/@tomlarkworthy/visualizer.js:
1. `ensureObserver().remove()` — before `node.remove()`, detach the variable's live element value from `_node` (`if (val && val.nodeType && val.parentNode === node) node.removeChild(val)`). Frees the element (parentless) so a later inspector re-mounts it instead of finding it trapped. Implements user's "replaced panels detach all children before creating new ones." Covers disposeRoot too (it calls obsEntry.remove()).
2. Demo cell `_4` `detachNodes: true` → `false` (user: "no detachNodes:true"; production never set it — root.detachNodes was undefined).

Regression safety: object-valued cells unaffected (val not a node child → unchanged). Element cells: on teardown the element is freed instead of GC'd-with-div; re-mounts on next render.

VERIFIED (live, on the real orphaned `viewof stroke_width`): trapped→`divHasForm:false` (object); after freeing→`divHasForm:true, mountedIsEl:true, input present` (mounts). summarizeJS re-confirmed innocent (returns string, leaves element attached).

Synced into both lopebooks + lopecode robocoop-4.html (sync-module updated=2).
