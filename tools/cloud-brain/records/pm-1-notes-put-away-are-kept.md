# pm-1-notes-put-away-are-kept

Task 1 of 2 of `page-modifications-how-they-are-kept`: the spec is
`plan/cloud-brain-page-modifications-how-they-are-kept.md`, and the owner chose its pick A, "the put-away set is
kept in this browser" (the issue's body: event 6993 and comment 6997, 2026-10-13).

Written 2026-10-13 by a writer of the issue loop (`impl-be664f`), round 1, from 21:27 to 21:52 CEST. One seed,
`tools/cloud-brain/brain-feedback.ojs`, one tool that reads and prints, and one test file. No Worker's module
changed and nothing was deployed. **cb4 does not run it until the shell is posted**, which is the act of a session
the owner is in, after the review (`rules.md`, "Two standing leaves of a session the owner is in").

The task had two parts, because the bug `page-notes-return-after-a-refresh` landed in the same seed first
(`records/page-notes-return-after-a-refresh.md`): a check of that landing against R1 to R3 of the spec, and
what the check found missing.

## The check of `main` against R1 to R3

On the seed of `ea677aea`, before any change. Built, and
`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`
at 21:27:27 CEST: `"tests":16,"passed":16,"failed":[]`.

| | What the spec asks | On `main` | Seen by |
|---|---|---|---|
| R1 | A note put away with × stays away over a load, whatever the state of its issue | Held | `test_feedback_a_note_put_away_stays_away_over_a_load`, among the 16; `grep -c "back on the next load" tools/cloud-brain/brain-feedback.ojs` printed `0` |
| R2 | He can see which notes are put away and bring one back | **Not there.** No cell `feedbackAway`; the seed's first cell said "Nothing on the page lists the notes put away or brings one back before its work is done" | `grep -c feedbackAway` of that seed: `0` |
| R3 | The signal when the work is done, and Remove for good | Held | The test of this change named for it, `test_feedback_a_note_put_away_comes_back_once_when_done`, was written first and passed on the app of `main` with nothing else changed: 17 of 18, the one failing being the test of R2, `app.list is not a function` |

Each line of "The design of the pick", against that seed:

| The design's line | On `main` |
|---|---|
| `feedbackKept(brain, what = "drafts")` | there |
| `feedbackApp` takes `away = { get, set }`; on the page `feedbackKept(brainOrigin, "away")` | there, made in `feedbackPage` |
| `gone` adds the id and writes the item | there |
| `sync` reads the item at each ask; done is placed and dropped; not in the list is dropped | there |
| the cell `feedbackAway` | **not there** |
| the first cell says where the list is | not there, there being no list |
| tests: the three "back on the next load" turned; put away, load, not placed; done, placed once; a second tab; a copy that is not an object | there, in `test_feedback_a_note_put_away_stays_away_over_a_load` and `test_feedback_done_then_remove_takes_the_label_off`; the spec's second name, `…_comes_back_once_when_done`, was no cell |
| tests: Show | not there |
| the three points of `feedback-reload-check.ts` | not there: that landing wrote `feedback-away-check.ts` beside it, which has the × and the loads and no Show |

Not judged by this check: the two things of that landing the spec's design does not have (its record, "What
changed": the read of an issue in `gone`, and `removed`). They are of paths 2 and 3 of that bug and of no
requirement here.

## What cb4 serves

The issue asks whether the shell has been posted since the bug's pass. Read with no token at 21:36:31 CEST:
`curl -s https://cb4.endpointservices.workers.dev/` (5,154,857 bytes), then
`bun tools/lope-reader.ts <that file> --get-module @tomlarkworthy/brain-feedback` (93,281 bytes), then `grep -c`
of that module:

```
brain_feedback_away 3
feedbackPage 7
feedbackAway 0
```

So the page cb4 serves has the bug's fix (the item `brain_feedback_away`) and the later `feedbackPage` of
`feedback-cell-copies-held-by-no-test`, and has nothing of this change. When it was posted was not read.

## What changed

In `feedbackApp`:

- `list()` answers the element of the list: a first line, "N notes put away in this browser" or "No note is
  put away in this browser.", and a line for each with **Show**, the id of the issue, its title and its state.
  The rows are what the app hides and what the browser's item has. Before an app's first ask that is the item's
  ids alone, with no title and no state. The state is what the note would read: for a gathered one, the state
  of the first open issue it is followed in, with that id (`open proj`).
- The list is drawn again at a ×, at Show and at the end of each ask.
- `show(issue)` takes the id out of the app's set and out of the item, and makes an ask, which places the note.
  An ask that is refused is logged and not thrown; the next ask places the note.
- `awayRead`, at each ask: an id the item had at this app's last read and has no longer is shown here too.
  Before, an app only added ids from the item, so Show in one tab would have left the note away in a second tab
  until its load.
- `putAway()` answers the rows as data, for the tests.

The cell `feedbackAway` is `feedback.list()`, and a sentence where `feedback` is null. The seed's first cell: the
row "Put away" names the cell, and a paragraph says what the list has, the address that opens it and what Show
does.

`tools/cloud-brain/feedback-reload-check.ts`: the app is made with the item `brain_feedback_away reload-check`
too, each point prints the item and the list's text, and four points follow the seven (below): the spec's
three, and a load after Show. With a
screenshot's path the list of point 9 is written beside it as `…-away.png`.

### Three choices, each taken by line 2 of `philosophy.md` (the smaller side, easier to undo)

1. **Show asks at once.** The spec has "Show, which drops the entry and places the note on the next ask". The
   next ask is then up to 30 s away (`everyMs`). As built the press makes that ask. The other side is one line
   less; its cost is a press that shows nothing for half a minute.
2. **Show holds in a second tab.** Not in the spec's words, which have a × in a second tab and not a Show. Its
   cost: an item cleared while the page stands open (the site's data cleared) places those notes at the next ask
   and not at the next load.
3. **The spec's three points went into `feedback-reload-check.ts`**, as the spec's table has it ("R1, R2"), and
   `feedback-away-check.ts` is left as that landing wrote it. Two tools now press the × on a filed note.

## Tests

Counts, each after the last change to the seed:

- `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`,
  three runs ending 21:46:19 CEST, Chrome 151.0.7922.34: `"tests":18,"passed":18,"failed":[]` each time.
  `brain-feedback` is no Worker's module, so `cloud-brain-dev/test.ts` and `verify-run.ts` run none of its tests;
  the three runs stand in for `verify-run.ts --times 20`, as in the record of the bug.
- The spec's check, `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback`,
  ending 21:46:53 CEST: `Tests: 18 passed, 0 failed, 0 timed out, 0 skipped, 18 total`, and among the passed the
  three names of its table: `test_feedback_a_note_put_away_stays_away_over_a_load`,
  `test_feedback_a_note_put_away_comes_back_once_when_done`,
  `test_feedback_away_lists_what_is_put_away_and_show_places_it`.
- `bun test --timeout=30000 ./tests/tools/feedback-cell.test.ts`: `4 pass`, `0 fail`. Its new test computes the
  cell `feedbackAway` from the seed and presses Show through the page's app over a `localStorage` held in a Map.
  On the seed of `ea677aea` with the new test: `3 pass`, `1 fail`.
- `tests/tools/suite.sh`, ending 21:51:43 CEST: `1295 pass`, `0 fail`, `Ran 1295 tests across 135 files.
  [277.99s]`, no line `skipped`. `uptime` then: load 27.19.
- The spec's other greps: `grep -c "brain_feedback_" tools/cloud-brain/brain-feedback.ojs` is `9`, as on `main`.
  `grep -c 'client.procedure('` is `21` where `main` has `19`; the two are `issue.open` of the rigs of the two
  new test cells. `gone` still has one call, `issue.label` through `unlabel`. Show sends `issue.list` and
  `issue.get` and nothing else (asserted in the test of R2).

Two test cells are new, and one is changed (`test_feedback_is_off_away_from_the_owners_page` reads the cell
`feedbackAway` where `feedback` is null).

Each new line taken out in turn, the seed built, `tab-tests.ts` run, the line put back (the first ten in a run
ending 21:32:05 CEST, the last two after):

| Line taken out | Result |
|---|---|
| the drop of an id the item has no longer (`awayRead`) | 17 of 18, the test of R2 |
| the draw of the list at a × | 17 of 18, the test of R2 |
| the draw of the list at Show | 18 of 18 in that run; a case was then added (Show while an ask is held), and with it 17 of 18 |
| the draw of the list at the end of an ask | 17 of 18, the test of R2 |
| the item's ids in the rows | 17 of 18, the test of R2 |
| the app's own hidden ids in the rows | 17 of 18, the test of R2 |
| the ask in `show` | 17 of 18, the test of R2 |
| the take-out in `show` | 17 of 18, the test of R2 |
| the id of what the work is followed in, in the state | 17 of 18, the test of R2 |
| the sentence of the cell `feedbackAway` where `feedback` is null | 17 of 18, `test_feedback_is_off_away_from_the_owners_page` |
| the catch of a refused ask in `show` | 17 of 18, the test of R2 |

### A real ×, a real load and a real Show, in a headless Chrome

`bun tools/cloud-brain/feedback-reload-check.ts tools/cloud-brain/.emitted/cloud-brain.html <png>`, 21:43:44 to
21:45:50 CEST. `feedbackOn` is false on a file, so the tool redefines the cell `feedback` over the module's rig,
annotate's own `a2Store` and the browser's two items; the cell `feedbackAway` of the pane is then the list of
that app. The rig is new at each load and from point 8 is given the issue again from the body point 6 sent.
Points 1 to 7 are the tool's as they were; each printed `"away":null` and the list's text beside what it
prints of the draft. The tool was not run on the seed of `main` for a comparison.

| Point | `notes` (annotate's store) | `localStorage`, `brain_feedback_away reload-check` | The list |
|---|---|---|---|
| 8 the filed note of an open issue put away with its × (annotate's Delete button) | `[]` | `{"fb-a2wv4t0n7t":1791920707548}` | `1 note put away in this browser` `Show` `fb-a2wv4t0n7t` `Typed and not filed.` `open` |
| 9 after a load | `[]` | the same | the same |
| 10 Show pressed, a click on the button of the pane | the note of `fb-a2wv4t0n7t`, its box reads `open` | none | `No note is put away in this browser.` |
| 11 after a load | the note of `fb-a2wv4t0n7t` | none | the same |

`page errors: []`. The screenshot of point 9 was looked at: one line of text, then the button, the id, the
title and the state on one row.

The address in the seed's first cell, on the built file: a one-off Playwright script opened
`cloud-brain.html#open=@tomlarkworthy/brain-feedback#feedbackAway`, and after 12 s the pane of `brain-feedback`
was open and the cell's sentence was in the view, at `top: 875` of a window 900 high. On a file the shell's
own layout has other panes than the owner's page.

## Not tried

- The owner's page. It needs the shell posted and the owner signed in: `feedbackOn` true, the list over the
  real tracker, and the address above there, were not seen.
- Two real tabs. The test has two apps, a store each, over one copy.
- Safari, and a browser that refuses `localStorage`: the test has a copy that throws and an app given none.
- A list of more than two notes, and a title longer than 120 characters (it is cut there by the line that
  draws it; no test has one).
- Show pressed twice by a click. The test calls `show` a second time, and for an id that is not put away,
  `undefined` and `null`.
- The list drawn in two places at once. An app draws again only the element of its last `list()`; the cell is
  the one caller.
- A narrow pane: the row is a flex line and was seen at 1300 px wide.
- A note put away, shown, and its issue done in the same ask.
