# Per-notebook QA guidance: lopepage-2

Layout engine for lopecode notebooks (own-the-DOM rewrite dropping GoldenLayout). It tiles modules into resizable splits (`R`/`C`) and tabbed stacks (`S`), serialises the layout to the `view=` hash, and preserves scroll across layout changes. Canonical file is `lopecode/notebooks/@tomlarkworthy_lopepage-2.html` (newer than the `.claude/worktrees/lopepage-2` copy).

## Setup for a useful pass
- The default bootconf hash `S100(@tomlarkworthy/lopepage-2)` only shows lopepage-2 viewing itself — not enough to exercise tabs. Open a **multi-pane, multi-tab** layout instead, e.g.
  `#view=R100(S50(@tomlarkworthy/runtime-sdk,@tomlarkworthy/visualizer),S50(@tomlarkworthy/lopepage-2))&cc=TOKEN`.
- lopepage-2's own pane is long and scrollable — ideal as the scroll-test target.

## Hash DSL (drive everything from `location.hash`)
- `S{w}(mod,mod#cell,…)` stack/tabs, `R{w}(…)`/`C{w}(…)` row/col. `w` = integer percent.
- One-shot intents: `#open=@mod[#cell]` (overlay/merge into live layout; dedupes if already open), `#close=@mod` (remove + normalize). After applying, lp2 re-serialises to `view=` and drops the intent. The tab `×` and import links route through these.
- Read state via `lp2Model` (the layout tree) and `lp2_paneRegistry` (immortal pane `Map`; retains closed modules' panes). `__ojs_runtime._variables` to find them.

## Known bugs
1. **FIXED (lopecode#192, 2026-06-27) — regression-watch.** Deep-link `#cell` to an *already-open* pane used to do nothing (only fresh opens scrolled). Fix: `lp2_scrollToCell` defers its first attempt (`setTimeout(attempt, 0)`) and holds `entry.pendingDeepLink` across the rerender so `lp2_view`'s scroll-restore skips a pane a deep-link owns. Re-verify BOTH paths each pass: fresh open of a not-yet-open module, AND a second `#open=@mod#otherCell` on an already-open pane (sequential different deep-links must each land).
2. **FIXED (lopecode#192, 2026-06-27) — regression-watch.** Splitter resizes used to never persist (fractional `node.sizes` → mangled by the integer-only DSL parser → round-trip guard refused to write). Fix: `lp2_splitter` rounds `n0` with `Math.round`. Verify by dragging a splitter and checking the `view=` hash actually gained integer `S<n>(…)` sizes.
3. **Still open — `cc=`/non-`view=` hash params are dropped** on any intent navigation (bare `#open=` anchor replaces the whole hash). Low impact in-session.

## Scroll testing recipe (the headline feature — test all three paths)
Set `entry.el.scrollTop` + dispatch `scroll`, wait 2 rAF for the anchor to capture, then:
- **Rerender from another pane** (switch a tab in a *different* stack) → scrollTop must be exact.
- **Reparent** (collapse the sibling stack so the pane becomes root) → exact; same immortal element (`sameEl`).
- **Content-resize** (insert a tall block above the viewport in `.lope-viz`) → ResizeObserver bumps scrollTop by the inserted height, keeping the same cell pinned at top.

## Gotchas
- The channel floods `currentModules`/`history` variable_update events on every recompute (general lopecode behavior, not a lp2 bug) — ignore the noise.
- A rendered module pane shows that module's **own** errored cells (visualizer renders all cells). Red `TypeError` cells in a runtime-sdk pane are runtime-sdk's, not lopepage-2's — don't attribute them to lp2.
- `auto_attach` throws `Cannot create property 'fulfilled' on boolean 'true'` if you force it via `module.value()`, but it's `reachable:true`/`_error:null` in normal operation — a force-compute artifact, not a real error. Don't file it.
