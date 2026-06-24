# Per-notebook guidance: local-change-history

## What it is
A 76-cell module that captures runtime variable edits and persists them as commits in an in-browser git repo (lightning-fs + isomorphic-git), keyed `repo: <notebook_title>, branch: <host_url>`. On reload it replays git → runtime.

## Key cells (use to orient quickly)
- `change_listener` (pid `_142fbfa`) — hooks `onCodeChange`; produces `history` entries with `{t, op, source, pid, module, provenance, _name, _inputs, _definition}`. Initial scan populates `initial_state` Map keyed by pid and `module_load_time` Map keyed by Module.
- `commit_history` (pid `_va7229`) — reactive cell that fires `commitRuntimeHistorySince` whenever `history` mutates.
- `commit_changes` (pid `_1klrowp`) — the worker that writes a single change as a git commit. **Curry-shape sensitive** — see "Known issues" #1.
- `replay_git` (pid `_frdbmi`) — replays `relevant_git_commits` into the runtime on load; tags definitions with `{source: 'git', t: <historicalTimestamp>}` so the listener doesn't re-capture them.
- `tag` / `read` (pids `_1jkr4mu`, `_1qh1oaw`) — attach/read `__provenance` on a `_definition` function so `change_listener` can distinguish a replay write from a user edit.
- `viewof rewind` (pid `_1enjs3i`) — the timeline Plot (the "UI timeline" the user expects at the top).
- `viewof selectedChanges` (pid `_138eq5p`) — the table for picking changes to revert.

## How to test save+replay end-to-end
1. Open in QA browser with pairing.
2. Programmatically redefine an existing user-named variable: `target.define(target._name, [], fn)` in the @tomlarkworthy/local-change-history module's scope (NOT the lopepage module that imports it).
3. Confirm `history.length` increments by 1.
4. Confirm `commit_history.committed === 1` (NOT 0). If `commit_history.results[0]` is an `async ƒ` instead of an `{ok: true, …}` object, the save path is broken — see "Known issues" #1.
5. Wait, then close+reopen the notebook.
6. Confirm `git_commits.length > 0` and `history` is non-empty on the fresh page.

## Two modules contain `change_listener`
The lopepage module also imports `change_listener` (and other LCH cells), so a scan that just finds "any module with a `change_listener` variable" will hit both. To get the **actual** local-change-history module, search for one that ALSO has `notebookCreationTime` (or any other LCH-internal name not re-exported).

```js
const lchMod = [...rt._modules.values()].find(m => {
  const sc = [...m._scope.values()];
  return sc.some(v => v._name === 'notebookCreationTime') && sc.some(v => v._name === 'change_listener');
});
```

## Known issues (verify each pass; remove when fixed upstream)

1. **`commit_changes` curried wrong → save+replay both no-op.** Cell body is `() => (ensure_branch, git, fs, moduleBaseHash) => async ({repo, branch, change}) => {…}` but caller `commitRuntimeHistorySince` does `await commit_changes({repo, branch, change})`. `await` of the returned function resolves to the function value; nothing commits. Symptoms: `commit_history.committed === 0` despite `attempted > 0`; `commit_history.results[0]` is `async ƒ`; `git_commits` always empty; no replay possible on reload. Fix is to declare `[ensure_branch, git, fs, moduleBaseHash]` as cell inputs and drop the outer wrapper — matches `_setFilesAndCommit`'s working shape. (First seen 2026-05-17 QA pass, present since the only jumpgate `c96cbc7` on 2026-03-08.)

2. **Cell order is inverted relative to user value.** Action buttons (`rewind to {time}`, `revert variables`) are at the top, but the cells they read (`viewof rewind` and `viewof selectedChanges`) are at positions 67/69 of 76. User has to scroll past 60 cells to use the timeline. Fix is mechanical reorder via `repositionSetElement`.

3. **Empty-history timeline renders "Invalid Date" y-axis.** `timeline` falls to `[0]*1024` when history is empty, and `Plot.ruleY([d3.max([], …)])` yields `-Infinity` → `new Date(-Infinity)` → Invalid Date label. Cheap fix: short-circuit the plot when `history.length === 0` with a placeholder.

4. **Duplicated git_commits/relevant_git_commits + git_history/relevant_git_history pairs.** Bodies are byte-identical except for input. Low-priority cleanup.

## Console
- Expect dozens of `module d/57d79353bac56631@44 is defined more than once` errors on load and after every redefine. This is a `@tomlarkworthy/module-map` issue, not LCH's — don't penalise LCH's criterion #11 for it.
