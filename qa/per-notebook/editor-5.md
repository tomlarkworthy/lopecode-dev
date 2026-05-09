# QA guidance: @tomlarkworthy/editor-5

Notebook-specific knowledge accumulated from prior QA passes. Read this before QAing editor-5; append to it when you learn something new.

## What the notebook claims to be

A reactive userspace cell mutator. Two documented entry points:
- `auto_attach` — attaches editors to *every* cell in the runtime (the "live edit anything" mode)
- `cellEditor(variable)` — attaches an editor to one specific cell

## What's actually exercised in the notebook itself

Only `cellEditor(title_variable)` — i.e. an editor for editing this notebook's *own* `title` cell. **`auto_attach` is documented but not demonstrated in-place**, so the QA pass on editor-5 alone cannot verify the cross-notebook attach behavior. To verify `auto_attach`, load a *second* notebook in the QA browser, import editor-5, run `auto_attach`, and check that editors appear on cells.

## Toolbar buttons (the row above the CodeMirror editor)

Eight controls, left to right. Per `qa/general.md` criterion #4, every control must be either exercised or explicitly skipped with a reason — no silent omissions.

1. Checkbox — purpose unclear, possibly "select for batch op". *Exercise:* toggle once, verify no console errors, untoggle.
2. Up arrow — *Exercise:* click; observe whether cell reorders (no visible feedback at boundary in past passes — flag if still missing).
3. Down arrow — same as up arrow.
4. Trash — delete cell. *Exercise:* skip on the title cell (would corrupt the notebook); exercise only on a cell freshly added via ➕ in the same session, and verify a corresponding `op:"del"` history event.
5. `+` — add cell. *Exercise:* click ≥ 2× in a row at clean state and run the local-change-history correlation check below. Two consecutive clicks must yield two history entries with **distinct `pid`s** — if they collide, that's [#144](https://github.com/tomlarkworthy/lopecode/issues/144).
6. Run/play — execute cell. **NOT** equivalent to Cmd/Ctrl+Enter — the keymap binding is missing (confirmed 2026-05-02). Until that's added, never assume an edit propagated until you've explicitly clicked ▶️. *Exercise:* edit a cell, click ▶️, verify the H1/output updates AND a `op:"upd"` history event fires.
7. **📄📄 — copy focused cell + any "selected" cells to clipboard.** Calls `decompile(variables)` then `cellsToClipboard(cells)` which uses `document.execCommand("copy")` with both `text/plain` and `application/vnd.observablehq+json` MIME on the clipboard. Sets `editedCell.module.module` source. *Caveat:* hangs in headless Playwright even with `clipboard-write` permission granted — possibly because `execCommand("copy")` requires a user-gesture context. Documented in source at `_copy` (`@tomlarkworthy/editor-5` HTML around line 5255) but **not in the prose**.
8. **📋 — paste Observable clipboard cells into the current module.** Calls `readObservableClipboardCells()` then `pasteObservableCellsIntoModule({ cells, editedCell })`. Reads from `application/vnd.observablehq+json` MIME (so it round-trips with 📄📄). Documented in source at `_paste` but **not in the prose**.

**Tooltips: none.** Confirmed 2026-05-02: every toolbar `<button>` is bare emoji (`<button>⬆</button>`, etc.) with empty `title` and null `aria-label`. Sighted users have to guess; screen readers read the emoji name. Don't keep re-asking; flag it (or stop flagging it once fixed). Adding `title=` per button is the trivial fix.

## Module Selector right pane

The radial dependency graph and module list. **Known quirk:** clicking the checkbox next to a module name toggles a "selected" state but does NOT open the module in a new pane — the layout doesn't change. To actually open a module, the gesture is presumably drag-into-pane (unverified) or a different control.

Don't flag the checkbox-vs-pane behavior as a bug without confirming intended UX with the author.

## Known low-severity issues (re-verify each pass)

1. **`notebookwebhook.mov` 404** — referenced as an embedded asset, GCS bucket returns aborted. Not visible in the default layout; check if asset has been re-uploaded or reference removed.
2. **Two `blob:null/...` aborted GETs on load** — bootloader churn during module init; benign noise but might mask real failures.
3. **Three CSS `@import` warnings** — constructed-stylesheet implementation drops `@import` rules from one of the upstream CSS files (`syntax.css`, `inspector.css`, `highlight.css`, `plot.css`, or `global.css`). Visual styling appears intact regardless.

## Known high-severity issues (status as of 2026-05-06)

1. **▶️ on a `viewof` *or* `mutable` cell — partially fixed (#158 still open).** With user's `debugger;` removal pulled, the >30 s hang is now ~500 ms-1 s of main-thread block. A transient ~1300-hotbar DOM flash and ~3× runtime variable count spike appear briefly during the recompile, then collapse to the correct +1 hotbar / +1 cell steady state. The hang no longer disconnects the channel. See #158 comment with measurements (2026-05-05).
2. **Mutable shatter — RESOLVED (#159 closed 2026-05-05).** The "three editable hotbars" symptom only appeared in mid-attach state while paused at `debugger;`. With `Debugger.setSkipAllPauses({skip: true})` (or the user's `debugger;` removal), authoring `mutable X = 0` now produces a single hotbar in steady state with the user's source visible.
3. **Re-editing an import errors with `Cannot read properties of undefined (reading 'doc')` (#166).** After running `import {X} from "@user/y"`, focus moves to the runtime-internal `module @user/y = runtime.module(...)` stitch variable (the import-shaped equivalent of #159 mutable shatter). Subsequent edits silently fail to compile and emit a CodeMirror state error. Same root cause appears as a doc-error on `import → regular` kind-changes. **Workaround:** delete the import cell and recreate it.
4. **➕ inserts at index 1, not adjacent to the focused cell (#164).** New cells land at module-index 1 regardless of which cell currently has focus. This is the same issue that surfaces as "new cells started in odd places" — confirmed 2026-05-06.
5. **⬇ drops most clicks (#163).** ⬆ moves the focused cell up by exactly one position per click. ⬇ no-ops on 5 of 6 clicks, then succeeds on the 6th. Reproducible on a freshly-added cell at index 1.

## Verifying with Playwright: bypass `debugger;` pauses

Several `debugger;` statements remain in the bundled HTML (e.g. lines 1949, 2009, 2046, 2063, 2252, 7024, 7058, 10133, ...). Playwright keeps the CDP `Debugger` domain enabled, so any of these can pause the runtime mid-operation and look like a runtime hang. **Always set `Debugger.setSkipAllPauses({skip: true})` before driving the page:**

```typescript
const cdp = await ctx.newCDPSession(page);
await cdp.send("Debugger.enable");
await cdp.send("Debugger.setSkipAllPauses", { skip: true });
```

The user can't reproduce these "hangs" in a regular browser because regular Chrome doesn't have the Debugger domain enabled. If you observe a silent hang the user can't repro, that's the signature.

## Cell-kind transitions: history is `del + new + new` (and sometimes more), not `upd`

When an in-place edit changes a cell's *kind* (regular ↔ viewof, regular ↔ mutable, regular ↔ import, etc.), `@tomlarkworthy/local-change-history#history` records a `del` of the old pid plus one-to-three fresh `new` entries for the new shape, **not** an `upd`. This violates the surface reading of the "Pid stability for `op:"upd"`" invariant below. Treat that invariant as: *"Pid stable for `upd` **only when the cell's kind is unchanged**."* Kind-change edits are a legitimate `del+new...`.

Confirmed shapes (all observed 2026-05-05):

```
regular → viewof X = ...   →  del(old) + new(viewof X) + new(X)                                    // 2 new
regular → mutable X = ...  →  del(old) + new(initial X) + new(mutable X) + new(X)                  // 3 new
regular → import {N} ...   →  del(old) + new(module M) + new(N)            + new(N) in M           // 3 new, last in another module!
```

The import case also pollutes history with an `op:"new"` for the imported variable in the *source* module (`@tomlarkworthy/view`), not just in editor-5 — `local-change-history` watches every module in the runtime. Diff/undo tooling that keys off `module` will see edits the user didn't directly make.

A QA pass that wants to assert "an edit produced exactly one history event" will fail on every kind-change. Bucket by `op` before counting and don't expect a 1:1 entry-per-click.

## Tracking specific user cells in the DOM is hard

editor-5 only renders an expanded `.cm-editor` body for the *focused* cell. Other cells appear as `.hotbar` + inspector text — and the inspector usually shows just the *value* (e.g. `1`), not the source (e.g. `qa_a = 1`). So a regex like `\bqa_a\s*=` against `cell-editor.innerText` will only match the currently-focused cell.

Implications for position-stability tests:
- You can't easily map "qa_a / qa_b / qa_c" → DOM y-positions just from the rendered HTML; the names aren't in the inspector text.
- If you need per-cell tracking, `list_cells` / `list_variables` MCP tools (channel-paired) are the right path — they expose `.variables[].name` directly.
- Without a channel: pin the *focused* cell with the `"close"` hotbar text node and track *its* y over time. Other cells' relative order can be inferred from total hotbar count being stable, but you cannot prove a specific user cell didn't move without an ID.

## Empty / freshly-created cell quirks

- A new cell created by ➕ but never edited has `_definition = "function _anonymous() {\n}"` and renders in the editor as the literal text `{}`. Cosmetic, not a bug.
- ▶️ on an unedited empty cell emits a clean `op:"upd"` with pid stable. Useful as a sanity check before harder tests.
- Clicking ➕ does **not** auto-focus the editor on the new cell. The previous cell's editor stays open. To edit the new cell, find its hotbar (an `<div class="hotbar">` whose visible "edit" text sits at the right edge of the editor pane) and click that "edit" specifically — the toolbar position will shift, so re-fetch button coordinates after.
- Locating hotbars: walk text nodes for the literal strings `"edit"` / `"close"` and use `Range.getBoundingClientRect()` to get the on-screen position. Per-cell hotbars sit in the left pane (~ x=880); module-selector pane edits sit at x=1267.

## Specific things to test on this notebook

1. **Title cell editor** — focus the CodeMirror editor below `title_variable = ▸ Variable`, type a small change, confirm the rendered H1 above updates reactively. Then undo/revert.
2. **`get_variable("title")`** before and after edit — should change.
3. **Toolbar Run button** — click after an edit, confirm reactive propagation.
4. **`cellsToClipboard`** — import is listed as a dependency; clicking the save button should put cell source on the clipboard. Test by reading the clipboard via `eval_code("await navigator.clipboard.readText()")` after the click. (`qa_open_notebook` auto-grants `clipboard-read`/`clipboard-write` so no permission prompt blocks the test.) **Caveat from 2026-05-02:** `eval_code` does not await Promises; pattern `navigator.clipboard.readText().then(t => window.__clip = t)` followed by a polled second `eval_code` reading `window.__clip` did *not* resolve in that pass even though `document.hasFocus()` returned true. If that recurs, fall back to confirming the click doesn't throw + `get_variable('cellsToClipboard')` returns `ƒ(cells)` — direct contents check is best-effort.
5. **Cross-notebook auto_attach** (separate pass, requires a second notebook to load + import editor-5).
6. **Cell-shape coverage matrix** (added 2026-05-05 — most of these still owed). Each shape needs a happy-path + adversarial entry. **Test in this order**, leaving viewof for last because it hangs the browser:
   1. Regular: `qa_simple = 42`. Reference fast-path; should pass instantly. ✓ verified 2026-05-05.
   2. Import: `import {Range} from "@tomlarkworthy/view"`; aliasing `import {a as b} from ...`; collision with a JS global (the `localStorage` story in MEMORY.md is the canonical landmine).
   3. Mutable: `mutable counter = 0` plus a reader and a writer. Verify the three runtime variables (`initial counter`, `mutable counter`, `counter`) all materialise and history pids are unique across them.
   4. Move: ⬆/⬇ on a fresh cell. Confirm DOM order changes; confirm runtime ordering matches; confirm a viewof cell moves both `viewof X` and `X` together; confirm boundary-of-list moves are no-ops, not crashes.
   5. Syntax errors: `let x = ` (incomplete), mismatched braces, lone `viewof` keyword. Does the runtime show the parse error in the cell? Does ▶️ silently swallow it? Does history get a malformed entry?
   6. Type-conversion: regular → viewof; viewof → regular; regular → mutable; mutable → viewof. All of these are expected to emit `del+new+new` in history per the carve-out above; verify that's what they do and that the orphan-pid story doesn't cause UI wedging.
   7. **Viewof — DANGEROUS**: do this LAST because it freezes the browser for ≥30 s. See "Known high-severity issues" §1.

## Mutations must correlate to `@tomlarkworthy/local-change-history#history`

**Standing invariant for every editor-5 QA pass.** Every observable mutation made through editor-5's UI (➕ add, 🗑️ delete, ▶️ recompile, drag-reorder, anything else that changes the runtime) must produce exactly one entry in `get_variable({module: "@tomlarkworthy/local-change-history", name: "history"})` — and across a session, **every entry's `pid` must be distinct from every other entry's `pid` of the same `op`** when the mutations targeted distinct cells.

Drain `history` after each interaction batch and check:

1. **Count match** — `history.length` increased by the expected number of entries. A click that should produce a history entry but didn't is a regression in the listener wiring.
2. **Pid uniqueness for `op:"new"`** — two consecutive ➕ clicks on default/empty state must produce two entries with **different `pid`s**. Identical pids = #144 has reappeared (or never been fixed). This is the single cheapest invariant the pass can check; run it every time.
3. **Pid stability for `op:"upd"`** — editing the same cell twice must produce two `op:"upd"` entries with the *same* `pid`. (The pid identifies the cell, so updates to one cell should share a pid; only `t` and `_definition` should differ.)
4. **Pid existence for `op:"del"`** — a deletion's `pid` must match a previously seen `op:"new"` (or a pid present in the loaded notebook). Orphan deletes are bugs.

If any of these fail, capture the full `history` array in the report — the local-change-history layer is the persistence boundary, and pid bugs there silently corrupt reload.

## Locating toolbar buttons reliably

Coordinates shift with scroll/layout. To find buttons deterministically, the first 7 `<button>` elements in DOM order are the editor toolbar (⬆ ⬇ 🗑️ ➕ ▶️ 📄📄 📋). Get live positions with:

```js
[...document.querySelectorAll('button')].slice(0,7).map(b => {
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), title: b.textContent.trim() };
})
```

Use those (x,y) for `qa_click`. ▶️ is index 4; 📋 is index 6.

## URL template for QA pass

```
file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_editor-5.html#view=R100(S70(@tomlarkworthy/editor-5),S30(@tomlarkworthy/module-selection))&cc=TOKEN
```

This is the layout from `bootconf.json` — preserves the author's intended viewing layout.

## Where to find things

- Source is in `lopecode/notebooks/@tomlarkworthy_editor-5.html`.
- Bootconf at `lopecode/notebooks/@tomlarkworthy_editor-5.json`.
- Last QA report(s) in `qa/reports/editor-5-*.md`.
