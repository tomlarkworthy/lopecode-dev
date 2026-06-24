# QA report: local-change-history

**Date:** 2026-05-17
**Notebook:** `lopecode/notebooks/@tomlarkworthy_local-change-history.html`
**URL hash:** `#view=S100(@tomlarkworthy/local-change-history,@tomlarkworthy/module-selection)&cc=…`
**Browser:** Playwright Chromium (headed, 1400×900)

## Summary

Two complaints from the user are confirmed and trace to a **single high-severity bug**: the `commit_changes` cell is curried wrong against its sole caller, so every captured edit silently no-ops on its way to git. That breaks **save**, and because nothing is ever saved, **replay** has nothing to load on reload (`git_commits = []`). The cell-order complaint is a separate authoring issue: the timeline plot and selectedChanges table live at the *end* of the module, while the buttons that consume them sit at the top — the layout is upside-down. Console is noisy with `module d/57d79353bac56631@44 is defined more than once` errors, which also fire on every runtime redefine.

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass | `# Local Change History` renders at top of pane |
| 2 | Explanation | pass | "History Data Model", "Isomorphic Git", "Replay and Save Algorithm", "Persistent Variable IDs" prose sections |
| 3 | Doc matches impl | **fail** | Prose claims "On page refresh, the notebook will load… we need to replay to catch up" — replay does nothing because nothing ever gets committed (Issue #1) |
| 4 | Does what it says | **fail** | "Save and replay local edits" does not work end-to-end (Issue #1) |
| 5 | Feature list | partial | All claimed surfaces exist (timeline, history table, repo/branch pickers, zip export, revert, rewind, wipe-fs), but the timeline + table are buried below the helpers (Issue #2) |
| 6 | Lean code | partial | 76 cells — appropriate for a stateful module — but `git_history` vs `relevant_git_history`, and `git_commits` vs `relevant_git_commits` are duplicated logic; one can probably go (Issue #4) |
| 7 | Scoped domain | pass | Single concern: capturing/replaying runtime variable edits to a per-host git branch |
| 8 | Claims tested | fail | No in-notebook self-tests verify the save→commit→replay loop. The bug in Issue #1 would have been caught by a single end-to-end test on `commit_history.committed` |
| 9 | Serialization | n/a | Not tested — not the focus of this pass; can be re-checked separately |
| 10 | Adversarial / try to break | partial | Rapid double-redefine produced only one history entry (last-write-wins); ok for save-history but worth a comment. New-cell op captured correctly. |
| 11 | Clean console logs | **fail** | Console floods with `RuntimeError: module d/57d79353bac56631@44 is defined more than once` on every redefine (Issue #3) |

## Issues found

### 1. commit_changes is curried wrong — every local edit silently fails to commit — severity: high — criterion: #3, #4

**What:** Local edits captured by `change_listener` are routed into the `history` mutable and then `commit_history` runs `commitRuntimeHistorySince` → which calls `await commit_changes({repo, branch, change})`. But `commit_changes` (cell pid `_1klrowp`) is a 4-arg curried function that returns the actual async committer only when called with `(ensure_branch, git, fs, moduleBaseHash)` first. Calling it with the inner-args shape returns the inner async function as a value (the await resolves a non-promise function to itself); no commit happens, no exception is thrown.

**Where:** `@tomlarkworthy/local-change-history` module, cell `_commit_changes` (pid `_1klrowp`), and its caller `commitRuntimeHistorySince` (pid `_1p3t9pb`).

**Evidence:**

Cell source:
```js
const _1klrowp = function _commit_changes()  // <-- 0 cell inputs
{
    return (ensure_branch, git, fs, moduleBaseHash) => {  // <-- outer curried wrapper
        return async ({repo, branch, change} = {}) => { /* the real work */ };
    };
};
```

Caller:
```js
// in _commitRuntimeHistorySince:
const r = await commit_changes({ repo, branch, change });   // <-- wrong shape
```

Live probe:
```js
await commit_changes({ repo: 'fakerepo', branch: 'fakebranch', change: { pid: 'x', op: 'upd' } });
// → returns async ƒ ({repo, branch, change}={}) => { /* never invoked */ }
```

End-to-end:
- `change_listener = "initialized"` ✓
- After programmatic `target.define()`: `history.length` 0 → 1 ✓
- `commit_history` value: `{ ok: true, attempted: 1, committed: 0, results: [ async ƒ(…) ] }` — the result array contains the *inner async function*, not a commit summary
- `git_commits = []` — nothing in the repo on reload, confirming nothing ever lands

**Hypothesis:** The cell was probably refactored from `function _commit_changes(ensure_branch, git, fs, moduleBaseHash) { return async ({repo, branch, change}) => {…} }` (cell inputs were dropped but body wasn't unwrapped), or the caller was simplified without updating the signature. The mis-shape has been present since the only jumpgate commit (`c96cbc7`, 2026-03-08); no subsequent commit has touched this cell, so the corruption likely came from an Observable-side edit that landed in that single jumpgate.

**Fix (cell-only):** Restore the cell inputs and drop the outer wrapper:

```js
commit_changes = async ({repo, branch, change} = {}) => {
  // … same body, with ensure_branch / git / fs / moduleBaseHash now coming from cell inputs
}
// cell inputs: ensure_branch, git, fs, moduleBaseHash
```

This matches `_setFilesAndCommit`'s shape, which works.

---

### 2. Cell order — timeline plot and history table are buried at the end — severity: medium — criterion: #5

**What:** The action buttons live at the top:
- pos 2: "rewind to {time}" button (depends on `rewind`)
- pos 3: "revert variables" button (depends on `selectedChanges`)

But the cells they consume live near the bottom of the 76-cell module:
- pos 67: `viewof rewind` (the Plot timeline, pid `_1enjs3i`)
- pos 69: `viewof selectedChanges` (the table, pid `_138eq5p`)

So the rendered layout is: title → two empty/inert button stubs → long prose → all the git helper functions → a "Provenance Utils" header → revertVariables/rewindToTime → State → THEN finally the timeline and table the buttons act on. The user has to scroll past everything to reach the controls and then scroll back up to use the buttons. The "rewind to" placeholder reads "⚠️ pick a time to rewind" because `rewind` is undefined when nothing is hovered in the not-yet-visible plot.

**Where:** Cell ordering across the whole module.

**Evidence:** Screenshots above; cell index from `grep -n '^const _' /tmp/lch.js`.

**Hypothesis:** Organic growth — UI cells were added at the bottom as they were authored, while controls stayed near the title.

**Fix direction:** Reorder cells (using `repositionSetElement` from `@tomlarkworthy/runtime-sdk` per memory `[[feedback_lopecode_cell_reorder]]`) so the visible UI region groups together near the top:

```
1. Title
2. y-axis temporal/discrete select
3. Timeline plot (viewof rewind)
4. "rewind to {time}" button
5. selectedChanges table
6. "revert variables" button
7. history table (the Inputs.table view)
8. — then prose: data model, git layout, replay algorithm, persistent IDs —
9. — then helpers (git, fs, parse, etc.) —
10. — then state cells —
```

---

### 3. Console flood: "module d/57d79353bac56631@44 is defined more than once" — severity: medium — criterion: #11

**What:** Forty+ identical errors stacked in the console, from `module-map.js:381`. Fires once at load plus twice for every subsequent runtime redefine. Likely scoped to module-map's reaction to my probe redefines as well as initial load; it does **not** prevent the page from functioning.

**Where:** `@tomlarkworthy/module-map` cell that materialises module-variables (lopecode-dev internal, not local-change-history's fault). Worth opening a separate issue rather than fixing here.

**Evidence:** `qa_console_logs({types:["error","warning"]})` returned 40+ identical `RuntimeError: module d/57d79353bac56631@44 is defined more than once` entries.

**Hypothesis:** Two bootstrap paths reach the same `d/57d79353bac56631@44` import — likely lopepage imports it directly while another module also re-imports it under the same key. This is a `module-map` issue, not local-change-history.

---

### 4. Duplicated logic: git_commits / relevant_git_commits and git_history / relevant_git_history — severity: low — criterion: #6

**What:** `git_history` reads from `git_commits`; `relevant_git_history` reads from `relevant_git_commits`. The bodies of `git_history` and `relevant_git_history` are byte-identical except for the input variable. Same for the `*_materialized` chain.

**Where:** Cells `_177arhl` (`git_history`) and `_n6n063` (`relevant_git_history`).

**Hypothesis:** Probably a forked exploration that was never collapsed. Pick whichever variant the replay/UI actually needs and delete the other.

---

### 5. Empty-history timeline renders "Invalid Date" — severity: low — criterion: #4

**What:** When `history = []`, `timeline = Array(1024)[0,0,0,…]` (because `first = last = 0`). The Plot then renders a single ruleY at `d3.max(history,…) = -Infinity` whose tickFormat shows "Invalid Date" on the y-axis.

**Where:** Cells `_1ostthv` (`timeline`) and `_1enjs3i` (`viewof rewind`).

**Hypothesis:** No empty-state guard. A `history.length === 0` branch returning `md` placeholder (or `Plot.plot({...})` with sensible empty-state) would be friendlier.

## Per-notebook guidance applied

No prior `qa/per-notebook/local-change-history.md` existed — created during this pass (see below).

## Things checked and OK

- **Module/feature inventory** — 76 cells, all imports resolved, no missing exports. Surfaces inventoried: timeline plot (`viewof rewind`), selectedChanges table, history table, "rewind to" button, "revert variables" button, "wipe filesystem" button, selected_repo / selected_branch dropdowns, repo file/commit tables, ZIP export button, hidden state mutables (`viewof initial_state` Map(1827), `viewof module_load_time` Map(45), `viewof historyModule`).
- **change_listener initial scan** — populated `initial_state` Map with 1827 variable snapshots and `module_load_time` Map with 45 modules. ✓
- **change_listener onCodeChange hook** — fires on programmatic `variable.define()`; produces correctly shaped `{t, op, source, pid, module, provenance, _name, _inputs, _definition}` entries in `history`. ✓ Both `upd` (redefine) and `new` (new variable) ops captured.
- **No thrown runtime errors** during open or probe edits (other than the module-map flood, Issue #3).
- **Notebook itself rendered** — title, prose, all inspector outputs, plot region (with empty-history caveat).
- **`history` propagation to subscribers** — confirmed via the channel `variable_update` events firing for each `history` mutation.

## Notes for follow-up

- The `commit_changes` fix is small and self-contained — define the cell with inputs `[ensure_branch, git, fs, moduleBaseHash]` and drop the outer arrow wrapper. Single commit will repair save+replay end-to-end. Worth pushing to Observable too so the next jumpgate doesn't reintroduce it.
- Once the fix is in, re-run this QA pass and verify: (a) reload preserves a programmatic edit; (b) `git_commits.length > 0` after a redefine; (c) replay correctly re-applies on next reload.
- The cell-reorder is mechanical (use `repositionSetElement`) and can be done in the same session, but treat as a separate concern — don't bundle with the bug fix.
- Console-spam Issue #3 should be filed against `module-map`, not local-change-history.
