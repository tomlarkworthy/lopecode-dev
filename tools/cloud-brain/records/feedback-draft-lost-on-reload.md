# feedback-draft-lost-on-reload

## Round 1, 2026-10-11

A feedback note typed on the Brain's page and not filed was lost when the page was loaded again.
The issue was opened by the reviewer of `page-feedback-filed-twice-never-arrived` from a reading of
the seed, not from a run, and no loss had been reported by the owner.

The change is in `tools/cloud-brain/brain-feedback.ojs` alone. No Worker's module changed and nothing
was deployed. **It is not on cb4 until the shell is posted**, which is done with the recovery key:
`BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts shell tools/cloud-brain/.emitted/feedback-draft-lost-on-reload-shell.html tools/cloud-brain/.emitted/feedback-draft-lost-on-reload-verify.html`.
Those two files are the landing's build of `main`, copied there from the worktree. The command was not run
by the writer: since event 2465 of `seen-shell-docs-behind-main` the orchestrating session posts the shell
after each reviewed change to a module of it, on the owner's A (event 2395 there).

Times are CEST, from `date` printed before each run.

### What a reload loses, read and then run

The issue says the text is in `drafts`, a `Map` of `feedbackApp`. That is half of it. Read in
`@tomlarkworthy/annotate` as the notebook has it
(`bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_cloud-brain.html --get-module @tomlarkworthy/annotate`):
`store.create` defines the note as two cells of the runtime, the id is `"a2" + Math.random()…`, and
`grep -c "localStorage\|sessionStorage\|indexedDB"` over the module is 0. The page is served by the
kernel and saves nothing. So a reload takes the note itself, and a text kept by the note's id alone
would have no note to go in. The triage's size ("the draft kept in the browser by the note's id") was
for the smaller half: a new `feedbackApp` on a page whose notes are still cells.

Run, in a headless Chrome on the built file, `bun tools/cloud-brain/feedback-reload-check.ts $W/tools/cloud-brain/.emitted/cloud-brain.html`
at 22:16:57, line 3 of its output, after `page.reload()` and before the app is made:

```
3 after a reload, before the app is made: {"notes":[],"boxes":[],"kept":"{\"a2ldvubpaa\":{\"text\":\"Typed and not filed.\\nSecond line.\", …
```

No note is in annotate's store and none is drawn.

### The change

- A cell `feedbackKept(address)`: `get` and `set` of one `localStorage` item, `brain_feedback_drafts ADDRESS`,
  as `issuesStore` of `brain-issues.ojs` keeps the page's copy of the issues. It reads
  `globalThis.localStorage` inside a `try`, so a refusal reads as no copy and a write is dropped.
  An empty copy removes the item.
- `feedbackApp` takes it as `kept`. With none given it keeps nothing, as before.
- On each `input` of a draft's box the copy gets `{ text, anchor, box }` under a name: the id of the
  note the text was first typed in. A text of spaces alone takes the entry away.
- A new app reads the text of each unfiled note that is still a cell (the cell `feedback` ran again).
- On its first `sync`, once, an app places a note again for each entry that no note here has
  (`store.create(anchor, { kind, draft: NAME, box })`), with the text in its box. `sync` and not the
  constructor, because `feedbackSync` waits there until annotate knows the kind; a note made before
  that is written into the module it points at (the comment in `feedbackSync`). Once, so that a second
  tab does not take up, every 30 s, what the first is typing.
- The note placed again has a new id and carries the name as `draft`. `file` opens `fb-NAME` with the
  key `annotation/NAME`, not the new id's.
- The entry goes when the note is filed, and when an unfiled note is removed (`gone`).
- In `sync`, an unfiled note whose `fb-NAME` is in the list becomes that issue's note. Without it a
  draft filed from another tab would be on this page twice, once as the draft.
- The reference (first cell) says what is kept, where, and what is not.

Taken from the Brain's search (`knowledge.search`, three queries: "draft text lost on reload unsaved
textarea", "keep unfiled note localStorage persist across reload", "annotation store a2Store kept in
the browser"): `doc:keeping-user-state-in-the-saved-notebook`, which says `localStorage` is for what
belongs to one browser and must not travel with a saved file. This page is served, not saved, and a
draft is one browser's. `@tomlarkworthy/local-storage-view` and `sticky` were looked at by their
cards and not used: the first binds a view, and there is a note to place again as well as a value;
the second writes into the cell's source, which this page does not keep.

Not taken: keeping the note under its old id. `store.create` mints the id and takes none, and
`@tomlarkworthy/annotate` is a shared module that this issue does not change. The cost of the side
taken: an issue filed after a reload is named for an id that no note on the page has.

### Tests

`brain-feedback` is no Worker's module, so `cloud-brain-dev/test.ts` and `verify-run.ts` run none of
its tests. The count is `tab-tests.ts`, in the worktree.

Three new cells, and one existing cell extended:

- `test_feedback_a_draft_is_kept_over_a_rebuild_and_a_reload`: the copy after typing; a second app on
  the same store draws the text; after the rig's `reload()` (every cell gone, the copy left) the first
  `sync` places one note with the anchor, the box and `draft`, sends `issue.list` and nothing else,
  and a later `sync` and another app place no second; typing on writes the one entry; File sends
  `annotation/<first id>`, `fb-<first id>`, and leaves `{}`; the next load places the issue's note alone.
- `test_feedback_a_kept_draft_goes_with_its_note_and_a_bad_copy_places_nothing`: emptied and
  spaces-only text; the × on a draft, typed here and placed again and never drawn; a refused
  `issue.open` keeps the entry; a draft whose issue appears in the list; ten copies of another shape
  (`"text"`, `7`, `[1]`, an entry that is null, a string, has a number for text, spaces for text, no
  anchor, a string or null for anchor) place nothing; a `kept` whose `get` and `set` throw, and none
  given, type and file as before.
- `test_feedback_kept_is_one_item_of_the_browser_for_an_address`: the real `localStorage` under a
  name of the test's own, removed in a `finally`. It writes one item of the browser while it runs.
- `test_feedback_cells_stay_in_this_module_with_annotates_store` also places a kept draft again in
  annotate's own store and reads `draft`, the home module and the box back after `a2Store.refresh()`.

Runs:

- Before the fix, with the three new cells and the rig's `kept` and `reload` added and `feedbackApp`
  unchanged, 22:09:00: `"tests":13,"passed":10`, the three new ones failed (`Received: null` for the
  copy in the first two; `feedbackKept is not defined` in the third). The extension of the fourth
  cell was written after the fix and was not run without it.
- After, on the last build (the worktree rebased onto `e393a6b2`, which brought in `brain-issues.ojs`,
  a seed this module does not import, and no other seed), three times from 22:21:00:
  `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`:
  `"tests":14,"passed":14,"failed":[]` each time. 14 is `grep -c "^test_" tools/cloud-brain/brain-feedback.ojs`:
  the 10 before, these 3, and 1 of `feedback-draft-box-redrawn-on-ask`, landed with this.
- `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback`, 22:21:09:
  `Tests: 14 passed, 0 failed, 0 timed out, 0 skipped, 14 total`.
- Two assertions were added to the new cells after the fix and were not run without it: a box moved
  with `store.patch` after the last keystroke comes back with the box of that keystroke; and a draft
  whose issue was opened before the page was loaded is, after one `sync`, one note, the issue's.
- `verify-run.ts --times 20`, which the brief asks for after a changed test, opens a Worker's run
  address, and no Worker runs this module. In its place: the three `tab-tests.ts` runs above.
- The page a deploy's test run opens, on the built `verify.html`, 22:21:28, from the main checkout:
  `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/verify.html --times 3`:
  `"runs":3,"passed":3,"failed":0,"none":0,"from":["brain"],"hashes":["dedc19e1935b"],"byChance":[]`.
  `from` is `brain`: the Worker's module was the deployed one. It shows the built verify page still
  passes that run; it runs no test of `brain-feedback`.

### A real reload, in a headless Chrome

`tools/cloud-brain/feedback-reload-check.ts` opens the built file with `brain-feedback` in the one
pane. `feedbackOn` is false on a file, so it redefines the cell `feedback` as the seed's cell makes
it, with the rig's tracker in the place of `brainClient`, annotate's own `a2Store`, and
`feedbackKept("reload-check")`, the browser's `localStorage`. Then: `a2Layer.arm("note")` and a real
click on the heading, the text typed with the keyboard, `page.reload()`, `feedback` redefined again.
Run at 22:16:57 (Chrome 151.0.7922.34, the browser `tab-tests.ts` named), on the build before the
two assertions above were added to the tests; `feedbackApp` did not change after it. Cut to what each
line shows:

| Line | Notes in annotate's store | The box | `localStorage` |
|---|---|---|---|
| 1 placed, nothing typed | `a2ldvubpaa` | draft, empty | none |
| 2 typed | `a2ldvubpaa` | `Typed and not filed.\nSecond line.` | one entry `a2ldvubpaa`, with the anchor and `box` |
| 3 after a reload, before the app is made | none | none | the same entry |
| 4 after a reload, the app made | `a2yqvrsl2r`, `draft: a2ldvubpaa` | the same text | the same entry |
| 5 typed on, then `feedback` redefined on the page | the same one note | `… Second line. More.` | the entry, with the later text |
| 6 File pressed | `issue: fb-a2ldvubpaa` | `open fb-a2ldvubpaa` and the text | none; the rig got one `issue.open`, key `annotation/a2ldvubpaa` |
| 7 after a second reload | none | none | none |

`page errors: []`. A screenshot of an earlier run at line 4 (22:14:13) has the box beside the
heading that was clicked, with the text in it and File under it. Line 7 has no note because the rig's tracker is made new with the app and has no
issue; on cb4 the list would give the filed one.

### Not tried

- The owner's page. It needs the shell posted and the owner signed in; `feedbackOn` true was not
  seen with this change, and neither was the item `brain_feedback_drafts https://cb4…`.
- Two tabs on one address, in a browser. On the rig: a draft whose issue appears in the list becomes
  that issue's note. Read and not run: two tabs typing in the same draft (the last keystroke is what
  is kept), and a tab opened while another has a draft, which places that draft as a note of its own once.
- A kept anchor whose cell is gone or changed after a deploy of the page. The note is created with
  the anchor as kept; where annotate then draws it was not looked at.
- A browser that refuses `localStorage`. The rig's `kept` throws in the test; a private window or a
  full store was not run.
- The cluster's Chrome 128.
- A box moved after the last keystroke, by hand in a browser. On the rig the note comes back with
  the box of that keystroke.
- Signing out. The item stays in the browser. With another account signed in `feedbackOn` is false
  and no app is made, so nothing reads it; that was read, not run. Any script of the page can read
  the item, as it can the session token beside it.
- An entry is never taken away for age. One that cannot be placed (`store.create` answers null)
  stays in the item.
