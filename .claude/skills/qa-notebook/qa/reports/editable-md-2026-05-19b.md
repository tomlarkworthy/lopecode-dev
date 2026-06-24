## QA report: editable-md (focused — click/highlight UX)

**Date:** 2026-05-19
**Notebook:** lopebooks/notebooks/@tomlarkworthy_editable-md.html
**URL hash:** `#view=S100(@tomlarkworthy/editable-md,@tomlarkworthy/module-selection)&cc=TOKEN`
**Browser:** Playwright Chromium (headed, 1280×900)
**Trigger:** user-reported misfeature — "highlight text flips it to edit mode and you lose the highlight. Generally misclicks keep triggering it. We should only flip mode when its a clear click."

## Summary

User report **reproduced and confirmed as a high-severity UX bug**. The click listener in the `md` cell fires unconditionally on every left-button click, regardless of whether the user just completed a drag-to-select gesture. The result: any attempt to highlight prose text inside a rendered `md` cell mounts the ProseMirror editor and wipes the selection. A "clear click" distinction does not exist in the current implementation. 1 fail. The earlier high-severity smart-quote bug (issue #1 in `editable-md-2026-05-19.md`) was not re-tested this pass and remains open.

## Criterion scoring (delta vs prior pass — only #4 and #10 re-scored)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 4 | Does what it says | **fail** | Selecting text inside an `md` cell is a basic user expectation for any rendered document; here it destroys the selection and switches to edit mode |
| 10 | Adversarial / try to break | **fail** | Trivial input — drag-select 3+ chars and release within the same cell — breaks the surface every time |

(Criteria 1–3, 5–9, 11 unchanged from `editable-md-2026-05-19.md` — not re-scored.)

## Issues found

### 1. Click listener fires after drag-to-select, mounting editor and wiping the highlight — severity: high — criterion: #4, #10

- **What:** The `md` cell attaches a single `click` listener on its root `dom`. When the user drags to select text and releases within the same cell, the browser fires `click` at mouseup. The listener has no awareness that a text selection was just made; it dispatches `saveAndRender` → `dom.innerHTML = ""` → mounts a fresh ProseMirror `EditorView`. ProseMirror's mount wipes the previous `window.getSelection()` range. Net effect: user cannot ever select text inside a rendered `md` cell — every drag-select instantly converts into "you are now in the editor, with no text selected."
- **Where:** `@tomlarkworthy/editable-md` — `md` cell (pid `_9tswvb`). The relevant listener body:
  ```js
  const listener = async (event) => {
    if (isInteractiveTarget(event, dom)) return;
    // ... unconditionally mounts ProseMirror
  };
  dom.addEventListener("click", listener);
  ```
  `isInteractiveTarget` checks `defaultPrevented`, `button`, modifier keys, and target-element selector — but **not** the current selection. A non-collapsed selection rooted inside `dom` is not part of any gate.
- **Evidence (repro #1 — 28-char drag-select):**
  - `SELECTION_BEFORE_CLICK`: `"drop in replacement for the "` (28 chars selected via `Range` + `getSelection().addRange()`)
  - Probe at capture phase: `{type:"click", target:"P", detail:1, button:0, hasSelection:true, selectionLength:28}`
  - 200ms after the click: `AFTER_DRAGCLICK_PM_COUNT=1, SELECTION_AFTER=""`
  - Visual: blue ProseMirror border + toolbar (B, I, Code, Link, Insert, Type, Undo, Redo, List, Indent, Blockquote, Image) mounted on the cell that previously rendered the H1 title.
- **Evidence (repro #2 — 3-char "trivial drag" / pointer-jitter selection):**
  - `V1_SELECTION_BEFORE`: `"p i"` (3 chars)
  - Probe: `{detail:1, button:0, hasSelection:true, selectionLength:3}`
  - Result: `V1_TINY_DRAG_PM_COUNT=1, SELECTION_AFTER=""`
- **Control (clean single click, no prior selection):**
  - `CONTROL_CLEAN_CLICK before=0 after=1 selectionPre=""` — passes, must continue to pass after any fix.
- **Hypothesis / suggested fix:** Add a selection-empty guard at the top of the click listener:
  ```js
  const sel = dom.ownerDocument.getSelection && dom.ownerDocument.getSelection();
  if (sel && !sel.isCollapsed
      && sel.anchorNode && sel.focusNode
      && dom.contains(sel.anchorNode) && dom.contains(sel.focusNode)) {
    return;
  }
  ```
  This rejects the post-drag click while a non-collapsed selection rooted inside the cell exists. For a more robust "clear click" definition that also rejects pointer-jitter without a measurable selection, pair `mousedown` and `mouseup` listeners, record the down-coords + timestamp, and only call `saveAndRender` when delta < ~3 px AND elapsed < ~250 ms AND `getSelection().isCollapsed`. The simpler selection-guard fix covers the user's stated complaint; the pointerdown-pairing variant is the proper "clear click" semantics. Either way, do NOT preventDefault on `click` itself — that breaks anchor navigation.

### 2. Double-click (intent: word-select) triggers edit mode on the first click — severity: medium — criterion: #4

- **What:** Browser fires two `click` events for a double-click: `detail:1` then `detail:2`. The first one has `hasSelection:false` (the word-select happens at the dblclick's mousedown, between the two clicks). With the current implementation, the first click hits the listener with no selection and unconditionally opens the editor. By the time `detail:2` fires, ProseMirror is already mounted and `isInteractiveTarget` (which matches `[contenteditable='true']`) correctly bails out — but the user has been routed into the editor regardless. Effect: users who instinctively double-click to select a word for copy/quote also lose that affordance.
- **Where:** Same listener as issue #1.
- **Evidence:**
  - `PROBE3_CLICK {"detail":1,"hasSelection":false,"selectionLength":0}` — first click fires editor mount
  - `PROBE3_CLICK {"detail":2,"hasSelection":true,"selectionLength":1}` — second click lands on the now-mounted ProseMirror
  - `V2_DBLCLICK_PM_COUNT=1`
- **Hypothesis / suggested fix:** Defer the mount by a single tick (e.g., 200 ms) and cancel it if a second `click` (detail≥2) arrives within that window, or — preferable — wire to `dblclick` to actively pre-empt the mount. The mousedown-pairing fix proposed in issue #1 also resolves this if it additionally checks `event.detail === 1` at mouseup.

## Per-notebook guidance applied
- The 2026-05-19 per-notebook note already records issue #3 ("interactive-target filter may miss link clicks") as a low-severity known issue. That entry remains valid — orthogonal to this pass. The smart-quote corruption (issue #1 in the prior report) was NOT exercised this pass.

## Things checked and OK

**Targeted matrix executed (click/highlight UX only):**

| # | Scenario | Action | Outcome |
|---|---|---|---|
| H1 | Clean single click on prose, no prior selection | dispatch `click` at p (100, 30) with `getSelection().removeAllRanges()` | **pass** — editor mounts (intended) |
| A1 | Drag-select 28 chars, release within cell | install range, dispatch `click` on `<p>` | **fail** (issue #1) |
| A2 | Drag-select 3 chars (pointer jitter analog) | install 3-char range, dispatch `click` | **fail** (issue #1) |
| A3 | Double-click on prose | dispatch `click` detail:1 + `click` detail:2 with 1-char range mid-pair | **fail** (issue #2) |

The earlier pass's happy-path matrix (focusout commit, `dom.markdown` getter, template interpolation, self-tests, boot console) was not re-run this pass and is presumed unchanged.

## Notes for follow-up

- Smallest fix that addresses the user's literal complaint (highlight loses on release): selection-empty guard at the top of the listener (`if (!selection.isCollapsed && cell.contains(anchor/focus)) return;`).
- Cleaner fix for "only flip on a *clear* click": pair `mousedown`/`mouseup`, gate the editor mount on `(distance < 3px && elapsed < 250ms && selection.isCollapsed && event.detail === 1)`.
- File an upstream test alongside the fix: synthesize a `Range` over the rendered cell, dispatch `click`, assert `dom.querySelector('.ProseMirror')` is null and the selection is preserved.
- Worth a follow-up sanity check: with the selection guard in place, does the focusout-commit path still close the editor correctly when the user clicks *outside* the cell after selecting text in the editor? (Should — focusout doesn't use the same listener — but worth confirming.)
- The double-click issue (issue #2) is genuinely separate from "drag-select loses highlight"; report both in any GitHub issue but mark issue #2 as a follow-up improvement, not a blocker.
- Did not re-test issue #1 from the prior pass (smart-quote corruption). It remains open until the fix lands and a regression test is added.
