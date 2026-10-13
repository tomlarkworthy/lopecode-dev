# page-notes-return-after-a-refresh

The owner, 2026-10-13, to the orchestrating session: "I closed all the feedback panels, but a refresh later
and they have all appeared again, so the UI is tending towards clutered with no way of fixing it."

Written 2026-10-13 by a writer of the issue loop (`impl-64b5fd`), round 1. One seed,
`tools/cloud-brain/brain-feedback.ojs`, and one tool that reads and prints. No Worker's module changed and
nothing was deployed. **cb4 does not run it until the shell is posted**, which is the orchestrating session's
after a review (`rules.md`, "Two standing leaves of the orchestrating session").

## What the record of cb4 has

Read with `issue-as.sh impl-64b5fd "get?id=<id>" --short` for each of the five, before 09:01:35 CEST (the
`date` of the command after them): each has one
event of type `labelled`, and it is his.

```
fb-a2kw99i9wy  6109  2026-10-13T06:50:08Z  key annotation/fb-…/removed  by owner (tab)  remove ["annotation"]
fb-a2oogpkdjb  6110  06:50:12Z
fb-a2b5yudl8s  6111  06:50:17Z
fb-a2pyxbfzuh  6112  06:50:20Z
fb-a24kt7jw3q  6113  06:50:35Z
list?label=annotation  ->  fb-a2k9vvmfvv (open), and no other
```

The key is the one `gone` of the seed sends, so the five came off by the note's Remove or its ×, on notes
that read Done. No earlier `labelled` event is on any of the five. After 06:50:35Z a load cannot place a note
for them: the page places from that list.

**Which of the paths below he met is not known.** The record has no event for a × that hid a note, and the
core's line of each call is his to read. What is known: the module cb4 serves is the one these runs were made
on (`curl https://cb4.endpointservices.workers.dev/` at 09:01:35 CEST, `lope-reader.ts --get-module
@tomlarkworthy/brain-feedback` of it and of a build of `3a159fbf`, `cmp`: the same 73,731 bytes). And his note
of 06:52:29Z, `fb-a2k9vvmfvv`, is open: on the page as served its × lasts until the next load, which is
path 1, and there is no other way to put it away.

## Three ways a closed note was placed again

A probe cell, added to the seed beside the app of `3a159fbf` and taken out again, run with `tab-tests.ts` at
09:06:50 CEST. It threw what it saw:

```
{"p1_sameApp":[],"p1_rebuilt":["fb-open"],"p1_loaded":["fb-open"],
 "p2_labelCalls":0,"p2_hidden":[],"p2_afterAsk":["fb-done"],"p2_labels":["annotation"],
 "p3_afterThatAsk":["fb-done"],"p3_labels":[],"p3_afterNextAsk":[]}
```

| | What was done in the rig | What the app of `3a159fbf` did |
|---|---|---|
| 1 | The × on the note of an open issue; then the cell `feedback` run again on the page; then a load | Away for that app. Placed again by the rebuilt app, and by the load. `hidden` was a `Set` made with the app |
| 2 | The cell `feedback` run again on a page that has a Done note; the × on it before the new app's first ask ended | No `issue.label`, nothing hidden (`gone`: `if (!t) continue`, the app had read no issue). Placed again by that ask, the label still on |
| 3 | Remove on a Done note while an ask had the list and had not placed from it | The label came off. That ask placed the note again from its list; the next ask took it away |

Path 1 is what the seed's first cell said the × does ("hides the note until the page is loaded again") and
what `test_feedback_done_then_remove_takes_the_label_off` asserted. Paths 2 and 3 were not written anywhere.
Path 2 needs the cell `feedback` to run again while notes are on the page. Whether the redraw of
`page-services-refreshes-in-a-loop` does that was not counted here; that issue's writer counts what recomputes.

## What changed

`plan/cloud-brain-page-modifications-how-they-are-kept.md` came in with the rebase, written the same hour by
`spec-8d8514` and not approved when this was written. Its pick is A, a set kept in this browser, and "The design
of the pick" names the item and the option. The change takes those names, so that the spec's task pm-1 has
nothing to rename. First written here with other names and with one more rule (below); rewritten to the spec's.

- `feedbackKept(brain, what = "drafts")`: the item is `brain_feedback_<what> ADDRESS`. With one argument it is
  the drafts' item as before.
- `feedbackApp` takes `away = { get, set }`. On the page it is `feedbackKept(brainOrigin, "away")`: an object
  of issue id to the time of the ×. One id is written at a time into what the browser has then.
- `gone`: a note whose work is not done is put away in that copy. A second run begun before the first took the
  note leaves it (Remove runs `gone`, and so does the cell `feedbackGone`). An issue the app has not read is
  read then, with what it is followed in, before Done is judged (path 2). From the × until the label is off or
  the issue is put away, no ask places the issue (`removed`, path 3).
- `sync` reads the copy at each ask. An issue in it that is not done gets no note; one that is done is taken
  out and its note placed, reading Done with Remove; one that is not in the list is taken out. A note here whose
  issue is in the copy (a × in a second tab) is removed.
- The seed's first cell: the row Remove, a new row "Put away", and a paragraph on the item.
- `feedbackRig` has the copy and a refusal of `issue.label`. One test cell is new,
  `test_feedback_a_note_put_away_stays_away_over_a_load`. Three assertions of "back on the next load" now assert
  the opposite, and the same as before for an app given no copy; `test_feedback_kept_is_one_item_…` reads the
  second item in the browser's `localStorage`.
- `tools/cloud-brain/feedback-away-check.ts`, new: the run below.

**The choice taken: a note put away is placed once more when its work is done.** The other side is that it
never comes back and the page takes the label off for him when the work is done. Taken by line 2 of
`philosophy.md`, the side that is easier to undo: nothing is removed without his click, and the note was how he
asked to be told (the seed, "What a note shows"). Its cost: each note put away is on the page once more, until
Remove. The spec's writer reads his words the same way and says it is a reading (its line 25).

**Written and taken out again:** a note put away on an issue that was closed and in its five-minute wait had
its label taken off by the page when the wait ended, with no note placed. It kept such a note from coming back
five minutes after the ×. It is not in the spec's design, it is an act for good with no click, and it needed a
second value in the copy. As landed, that note is placed once after the wait, Done, as the test's second part
has it.

**Not built, of the spec's design:** the cell `feedbackAway` with Show (its R2), and the rule of R4. As landed,
nothing on the page lists the notes put away or brings one back before its work is done; clearing the item
does. The seed's first cell says so.

## What the Brain's search had

`brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=…" --as loop-knowledge`, three
questions, 09:23:54 CEST. They were run after the fix was written, not before it as the brief asks.

| Asked | First entries | Used |
|---|---|---|
| feedback note closed comes back after a page reload | `doc:cloud-brain-page-modifications-how-they-are-kept` 0.97; `doc:keeping-user-state-in-the-saved-notebook` 0.74 | The first is the spec above, whose names the change takes. The second, read to its line 30: `localStorage` is for "per-browser settings that must *not* travel with the file … a panel toggle", and a state the reader expects in the file goes in the file with `sticky`. The Brain's page is not a file he saves, and a note put away is of the first kind |
| state kept in the browser localStorage for a page module | the same two; `module:mbostock:safe-local-storage` 0.52 | Not imported: `feedbackKept` already reads and writes one item with a `try` around each, and the change gives it a second name |
| annotation note hidden until its issue is done | the spec 0.72; `module:tomlarkworthy:annotate` 0.67 | annotate was read from the build: its × is `store.remove(id)`, and it keeps no note outside the runtime |

## Tests

`cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`,
on a build of the seed as committed, three runs ending 09:18:19 CEST, Chrome 151.0.7922.34:
`"tests":15,"passed":15,"failed":[]` each time. Before any change, on `3a159fbf`: 14 of 14. With the new test
and the app of `3a159fbf`: 14 of 15, the new one failing at its first read of the copy.

`brain-feedback` is no Worker's module, so `cloud-brain-dev/test.ts` and `verify-run.ts` run none of its tests
(`records/feedback-draft-lost-on-reload.md` has the same). The three runs stand in for `verify-run.ts --times 20`.

Each line taken out in turn, the tests run, the line put back (run ending 09:15:44 CEST):

| Line taken out | Tests that failed |
|---|---|
| the guard against a second run of `gone` | the new one |
| `removed` in the placing of an ask | the new one |
| the read of the issue in `gone` | the new one |
| the write of the copy | the new one and two older |
| the read of what it is followed in, in `gone` | the new one |
| a done one is taken out of the copy | the new one and two older |
| an id with no label is taken out of the copy | the new one |
| the read of the copy at an ask | the new one |
| the removal of a note put away in another tab | the new one |
| a read of the copy when the app is made | none: 15 of 15 |

The last line was redundant (each ask reads the copy before it places) and was deleted after that run. The
three runs of 09:18 are of the seed without it.

### A real ×, and real loads, in a headless Chrome

`bun tools/cloud-brain/feedback-away-check.ts tools/cloud-brain/.emitted/cloud-brain.html`, 09:16:52 CEST.
`feedbackOn` is false on a file, so the tool redefines the cell `feedback` as the seed's cell makes it, over the
rig's tracker, annotate's own `a2Store` and `feedbackKept("away-check", "away")`. The note is filed by a click
and the keyboard, and put away with annotate's Delete button. The rig is new at each load and is given the
issue again from the body the first one was sent.

| Line | Notes in annotate's store | `localStorage`, `brain_feedback_away away-check` | Labels of the issue, `issue.label` calls |
|---|---|---|---|
| 1 filed | `fb-a2dk73vdbg` | none | `annotation`, 0 |
| 2 after a load, nothing put away | `fb-a2dk73vdbg`, the box reads `open` | none | `annotation`, 0 |
| 3 the × pressed | none | `{"fb-a2dk73vdbg":1791875847330}` | `annotation`, 0 |
| 4 after the next ask | none | the same | the same |
| 5 after a load | none | the same | the same |
| 6 after a second load | none | the same | the same |
| 7 the issue done, the next ask | `fb-a2dk73vdbg`, the box reads `Done … Fixed. Remove` | none | `annotation`, 0 |
| 8 Remove pressed | none | none | none, 1 |

`page errors: []`. Line 2 is the control: a load places the note of a labeled issue, which is what a load did
for a note put away before the change.

## Not tried

- The owner's page. It needs the shell posted and the owner signed in; `feedbackOn` true, and the item
  `brain_feedback_away https://cb4…`, were not seen.
- Which path the owner met, and whether the cell `feedback` runs again in the redraw he reported.
- Two real tabs. The test has two apps, a store each, over one copy.
- Safari, and a browser that refuses `localStorage`: the test has a copy that throws and an app given none.
- A note missing from annotate's store while its cell exists (`store.refresh()` not finding it). `gone` would
  put its issue away, and that now holds over loads where it held for one. Not seen and not provoked.
- A refused `issue.label` on the owner's page. In the rig the note is not placed again by that app and a load
  places it, Done. Before the change the next ask placed it, 30 s later.
- A × on a note while its `issue.open` is in flight: the issue is put away, read in the code and not run.
- `tests/tools/suite.sh` reads nothing of this seed (`grep -l -E 'brain-feedback|feedbackApp|feedbackKept'
  tests/tools/*.ts tests/notebooks/*.js` printed nothing). Run once after the last edit, ending 09:21 CEST:
  `1110 pass`, `0 fail`, 113 files. The new tool has no test file: it prints and has no verdict, as
  `feedback-reload-check.ts` has none.
