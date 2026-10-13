# feedback-cell-copies-held-by-no-test

Written 2026-10-13 by a writer of the issue loop (`impl-8f62ef`), round 1. One seed,
`tools/cloud-brain/brain-feedback.ojs`, and one new test file, `tests/tools/feedback-cell.test.ts`. No Worker's
module changed and nothing was deployed. **cb4 does not run it until the shell is posted**, which is the
orchestrating session's after a review (`rules.md`, "Two standing leaves of the orchestrating session"). What
the owner's page does is the same before and after: the change is a function with a name and two tests.

## What the issue said, run again

The reviewer of `page-notes-return-after-a-refresh` took `, away: feedbackKept(brainOrigin, "away")` out of the
cell `feedback` in a built notebook and the module's 15 tests passed. Here the same text was taken out of the
seed of `62d9c59f` (the worktree's commit before this change), the notebook built, and
`bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-feedback` run, 09:44 CEST, Chrome 151.0.7922.34:

```
HEAD, away out of the cell: 15 of 15 []
HEAD, kept out of the cell: 15 of 15 []
```

The second line is the issue's "the same is true by reading of `kept:`", now run.

## What changed

- **`feedbackPage({ origin, client, store, near, modules })`**, a new cell of the seed: the app of a page at a
  Brain's address. It makes the two copies, `feedbackKept(origin)` and `feedbackKept(origin, "away")`, and
  `about`, which answers the Worker of the module a note is on. The cell `feedback` is now
  `feedbackOn ? feedbackPage({ origin: brainOrigin, client: brainClient, store: a2Store, near: feedbackNear, modules: brainModules }) : null`.
  This is the fix the issue names.
- **`test_feedback_the_page_app_keeps_both_copies_in_this_browser`**, a new test cell. It calls `feedbackPage`
  with an address of its own (`test ` and a random word), the rig's tracker and store, and no copy: the app
  writes the browser's `localStorage`. A draft is typed, read in the item `brain_feedback_drafts ADDRESS`,
  placed by an app made after a reload and not by one at another address, and filed. The note is put away,
  read in `brain_feedback_away ADDRESS`, and not placed after a reload. The test takes its items away at its end.
- **`tests/tools/feedback-cell.test.ts`**, new, 3 tests. The named function alone left the cell's own line
  unread: with the cell changed back to `feedbackApp({ client: brainClient, store: a2Store, near: feedbackNear })`,
  the 16 test cells passed (table below). A test cell cannot read the cell `feedback` on: `feedbackOn` is false
  on a file. This file compiles the module from the seed (`tests/tools/needs.ts`, `seedModule`), loads it with
  `tools/notebook-import.ts`, and gives the cell its inputs: `feedbackOn` true, an address, the module's own
  `feedbackRig` for the tracker and the store, and a `localStorage` held in a Map. The value of `feedback` is
  then what the seed's cell computes. A load of the page is a second import, a new runtime.

## What fails with what taken out

Each line: the text changed in the seed, the tests run, the seed put back. Run after the last edit of the seed.

`bun tools/cloud-brain/tab-tests.ts` on a build of each, 09:44 to 09:47 CEST. The one test that fails is the new cell:

| Changed | Test cells passed |
|---|---|
| `away` out of `feedbackPage` | 15 of 16 |
| `kept` out of `feedbackPage` | 15 of 16 |
| `away: feedbackKept(origin)`, the drafts' item | 15 of 16 |
| `kept: feedbackKept()`, no address | 15 of 16 |
| `away: feedbackKept(undefined, "away")`, no address | 15 of 16 |
| `about` out of `feedbackPage` | 15 of 16 |
| `near` out of `feedbackPage` | 15 of 16 |
| `origin: brainOrigin` out of the cell `feedback` | 16 of 16 |
| the cell `feedback` calls `feedbackApp` with no copy | 16 of 16 |

`cd $W && bun test --timeout=30000 ./tests/tools/feedback-cell.test.ts` on each, 09:45 CEST:

| Changed | pass, fail | Failed |
|---|---|---|
| nothing | 3, 0 | |
| the cell `feedback` calls `feedbackApp` with no copy | 1, 2 | the draft, the note put away |
| `origin: brainOrigin` out of the cell | 1, 2 | the draft, the note put away |
| `near: feedbackNear` out of the cell | 2, 1 | the draft (its filing) |
| `modules: brainModules` out of the cell | 2, 1 | the draft (its filing) |
| `feedbackOn ?` made `true ?` | 2, 1 | off the owner's page the cell is null |
| `away` out of `feedbackPage` | 2, 1 | the note put away |
| `kept` out of `feedbackPage` | 2, 1 | the draft |
| `away: feedbackKept(origin)` | 2, 1 | the note put away |
| `kept: feedbackKept()` | 2, 1 | the draft |
| `away: feedbackKept(undefined, "away")` | 2, 1 | the note put away |
| the seed of `62d9c59f`, as it was | 3, 0 | |
| that seed, `away` out of its cell | 2, 1 | the note put away |
| that seed, `kept` out of its cell | 2, 1 | the draft |

The last three lines: the file holds the cell as it was before the change too, so it is the reproduction, and
the reviewer's own edit fails it.

## Tests

- `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`,
  on a build of the seed as committed, three runs ending 09:43:57 CEST: `"tests":16,"passed":16,"failed":[]`
  each time. `brain-feedback` is no Worker's module, so `cloud-brain-dev/test.ts` and `verify-run.ts` run none of
  its tests; the three runs stand in for `verify-run.ts --times 20`, as in `page-notes-return-after-a-refresh`.
- `cd $W && bun test --timeout=30000 ./tests/tools/feedback-cell.test.ts`, 09:43:59 CEST: `3 pass`, `0 fail`.
- `$W/tests/tools/suite.sh`, ending 09:47:13 CEST, after the last edit: `1113 pass`, `0 fail`, 114 files, no
  line `skipped:`.
- `bun tools/cloud-brain/feedback-away-check.ts` and `feedback-reload-check.ts` on the build, 09:37 CEST: the
  eight lines and the seven lines as before, `page errors: []` in both. They redefine the cell `feedback`
  themselves and were not changed.

## What the Brain's search had

`brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=…" --as loop-knowledge`, three
questions, 09:32:36 CEST, before the fix was written.

| Asked | First entries | Used |
|---|---|---|
| test that fails when a cell stops passing an argument to the app | `doc:writing-unit-tests-in-a-notebook` 0.87; `module:tomlarkworthy:tester` 0.51 | Not read: the module has its test cells and its rig already, and the gap was a cell no test cell can read |
| feedback note copies in localStorage drafts and away | `doc:cloud-brain-page-modifications-how-they-are-kept` 0.61; `module:tomlarkworthy:notes` 0.53 | The first is the spec the two items are named in; its line 234 was read and is still true of the page |
| wiring of a page cell held by no test named function | `doc:writing-unit-tests-in-a-notebook` 0.79; `doc:packaging-notebook-functions-as-a-javascript-library` 0.67 | Nothing |

What was used was found by reading `tests/tools`: `needs.ts` and `tools/notebook-import.ts`, as
`cost-events.test.ts` reads `issueAct` of the tracker's seed.

## Not tried

- The owner's page: `feedbackOn` true at the Brain's address, and the items `brain_feedback_drafts https://cb4…`
  and `brain_feedback_away https://cb4…` there. It needs the shell posted and the owner signed in.
- The bun file runs the cell with no browser. Its `localStorage` is a Map, `htl` is an empty object, and
  nothing in it draws a note: the app's `note()` is not called there. The drawing and a real `localStorage`
  are the test cell's, which calls `feedbackPage` and not the cell.
- A browser that refuses `localStorage`, for the new test cell: its branch for no storage did not run in
  Chrome. `test_feedback_kept_is_one_item_of_the_browser_for_an_address` has the same branch.
- A checkout with no toolchain notebook: `testNeedingSeed` then skips the three tests with a line. Not met here.
- The two check tools were not moved to `feedbackPage`.
