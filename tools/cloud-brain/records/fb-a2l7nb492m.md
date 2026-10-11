# The issues panel starts at the open work

For the issue `fb-a2l7nb492m`, a note the owner put on the State and Kind filters of the issues
panel (event 1072, 2026-10-11): "I want to see open and in progress isues, but this filter is not
expressive enough. Mainly I want a NOT DONE and NOT rejected. And that should be the default filter
which will scale as more things are added". Built 2026-10-11 by a writer of the issue loop, round 1.

## What changed

All of it is in `tools/cloud-brain/brain-issues.ojs`, a deploy of `brain-x-issues`.

| | |
|---|---|
| `issuesOpenWork` | a new cell, the text `"open work"`: the value of the filter's first choice. No state has that name, since no state in the default policy has a space in it; nothing refuses a policy that names a state so. |
| the State filter | its choices are now `open work`, `all`, then each state an issue of the copy is at. The first is chosen at load. `all` is the choice that was blank before. |
| what `open work` shows | every issue with `closed` false. `closed` is set on each issue by `issueApply` from the `closed` list of the issue's own workflow. |
| `chooser` | takes a third argument, the text of a choice. Kind and the form's Kind do not pass one. |
| the panel | `panel.list`, the node the table is drawn in, for the test. |
| the reference | the line on State, Kind and Find says the above. |

## Decided while building

- **`closed` of the workflow, not a list of four states.** The triage (event 1077) named the states
  to leave out: done, rejected, closed, reverted. Those are the `closed` list of the `task` workflow
  today. The feedback workflow closes at `closed` only and a project at `done`, `closed`,
  `rejected`. Reading the flag gives the same rows today and needs no edit when a policy adds a
  state, which is the owner's "will scale as more things are added".
- **One choice, not a filter language.** The triage's reading of `philosophy.md` line 2, the
  smaller side. The filter still cannot say "open or in-progress" as two states of several.
  Not built: a choice of several states at once.
- **The choice is not kept over a reload.** The panel kept no filter before and keeps none now, so
  a reload is back at `open work`.
- **The count under the table is unchanged**: "N issues at event M" counts the whole copy, not the
  rows shown. The test asserts it (4 issues, 2 rows).

## Tests

One new cell, `test_issues_panel_lists_the_open_work_at_load`: four issues, one rejected, one
feedback closed, one triaged; the rows at load, after a move to `rejected` sent from the panel,
under `all`, under one state, and that a sync that brings a new state keeps the choice.

Before the change to the filter (with the constant and `panel.list` in place, so the test could
run), in a QA tab on the worktree's build, the snippet of `agents/implementer.md` step 8:

```
[27, ["test_issues_panel_lists_the_open_work_at_load expect(received).toEqual(expected) … - "open work", - "all", + "", "open", "rejected", "closed", "triaged"]]
```

After it, the same snippet in a fresh tab: `[27,[]]`.

`cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>`: `passed` 16, `failed`
0, `needsBrowser` 11. The 11 are the panel's tests, the new one among them (`location is not
defined`); 16 + 11 is the 27 of the tab.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the worktree's build> --times 20`:
`"runs":20,"passed":20,"failed":0,"none":0,"byChance":[]`.

The first writing of the test failed after the fix, for a fault of its own: it held the `select`
element across a move that emptied the state `open`, and the chooser makes the element again when
the states change. The test now finds the element at each use.

## Not tried

- The panel in the owner's own tab on cb4, with his 100 or so issues. The rows were read in the
  test's rig only.
- A policy with a state named `open work`. It would be read as the first choice.
- Whether an issue open in the pane under the table should close when a move takes its row out of
  the table. It stays open, as it did under a one-state filter.
- The four cases of step 6 for a control that sends a write: the filter sends none.
