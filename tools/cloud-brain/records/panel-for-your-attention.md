# panel-for-your-attention

The issue (opened 2026-10-10 19:14 CEST, started 19:31) quotes the owner on `n39625a1a`: "It is
difficult to find issues that are need attension. That needs to be a prefiltered list. Further its
hard to add feedback to them requiring lots of clicks and form filling."

## What changed, 2026-10-10

One seed, `tools/cloud-brain/brain-issues.ojs`, 165 lines added and 20 removed against `main`. No
new method, no change to the service's handlers, its SQL or the policy: the block reads the copy
the panel already keeps and writes with `issue.move`, `issue.comment` and `issue.label`.

- `issuesPanel` draws a block **For your attention** above the filters. A row for each open issue
  that has the label `needs-owner` or `security`, is at `awaiting-approval`, is of kind `security`,
  or is hidden from the caller. Each row: the title (it opens the issue below), the last comment,
  one text box, a button for each move, **Comment**, and **− needs-owner** where the issue has
  that label.
- The buttons of a move and the label button were inside `drawOne`. They are now `actButtons` and
  `unlabel`, used by the open issue and by the block.
- `issue.get` was asked inside `drawOne`. It is now `load(i)`, asked once for each `seq` of an
  issue, and used by both. The block asks it for every listed issue that is not hidden.
- `send` answers `true` when the service took the write and `false` when it refused. The block
  empties a row's box on `true`.
- The first `md` cell has a bullet for the block.
- A test, `test_issues_panel_lists_what_waits_for_the_owner`.

## Two people worked on it

An earlier implementer wrote the block and the test and was stopped before building. Its diff was
uncommitted on `07484682`. This session committed it, rebased it, read it, and changed two things:

- A row is made again when its issue changes, and keeps the same text box. After a write, the box
  was emptied and the buttons of the row that sent it were drawn again, not those of the row now on
  the page. Those stayed enabled with the old text until `issue.get` answered and the row was made
  a third time. Now the box's `oninput`, which is always the newest row's, is called.
  Not reproduced in a test: with the fake service `issue.get` answers within the same poll of the
  test, so the assertion added for it (Comment is disabled once the box is empty) also passed
  before the change.
- An `issue.get` that failed was not asked again until the issue changed. Before the draft it was
  asked again at every draw. It is again. No test.

## Choices the issue did not spell out

- "newest first" is drawn as last changed first (`updated_at`, then `seq`), the order of the table
  below it. By date opened, an old issue that reached `awaiting-approval` a minute ago would be
  at the bottom.
- "hidden" is read as an issue the service does not show this caller. Such a row has the id, the
  state and the kind, and no box or button. The owner is shown every issue, so on the owner's page
  no row is of this sort; the test draws one with a token's panel.
- A closed issue is not listed, whatever its labels: `w2` in the test is rejected with
  `needs-owner` still on it.
- A move the guard refuses whatever the reason has no button in the block (a move that needs refs,
  a pass with no review). A swap has none either. Both are in the open issue. The cost: the block
  does not say why a move is missing.
- With no comment on an issue, the row shows its last event. For an issue nobody has touched that
  is `opened` with the title, not the body.

## Tests

14 of 14 `test_issues_*` cells, in a headless QA tab on the worktree's build, 2026-10-10 19:39 CEST,
by the snippet of the implementer brief (the count on the tip that landed is in the issue's
comment). The same 14 with `bun tools/lope-tests.ts … --filter test_issues` in 14.6 s. It was 13
before; the 13 passed unchanged, which is what covers the move of the buttons and of `issue.get`
out of `drawOne`.

The new test opens six issues in the rig and reads the block:

```
listed, in order            w4 w3 w5 w1          (not w0, a plain task; not w2, rejected)
w3 awaiting-approval        done enabled, rejected disabled until the box has text
w5 in-review, needs-owner   no done, no in-progress, rejected present
Comment on w1               event body "Take the first way", box empty after
approve w3 with "ship it"   moved, move "approve", reason "ship it"; the row is gone
− needs-owner on w1         labels [] and the row is gone
typed in w5, then another   the box still holds "half a line"
  caller's comment arrives
a token's panel, w4         "not shown", 0 inputs and buttons
```

The block was also drawn in that tab from a rig with three waiting issues and looked at in a
screenshot: three rows, the box filling the row, the buttons to its right.

## Not tried

- The block in the owner's signed-in page on cb4. A press there is an owner's write; an agent does
  not make one. What was checked on cb4 is in the issue's comment.
- More waiting issues than a screen holds. There is no limit and no paging; each row costs one
  `issue.get` when it is first drawn and one more each time its issue changes.
- A narrow window, and a light theme.
- Keyboard use: Enter in the box does nothing, because a row has more than one button.

## Round 2, 2026-10-10: the two findings of review 1

Review 1 (event 245, sent back 19:54:06 CEST by event 246) found two defects in the block, both
measured in a browser. Both were reproduced before any change: with the two tests below added to
the seed of `lopebooks@ddb6cd94` and nothing else, the snippet of the implementer brief answered,
in a headless QA tab,

```
[16, ["test_issues_panel_a_second_press_writes_once … Expected: false Received: true",
      "test_issues_panel_keeps_the_caret_in_a_row_box … [true, "half a line", - true + false, 2, 6]"]]
```

The first line is "is any button of the row enabled after a press of Comment". The third value of
the second is `document.activeElement === box` after another caller's comment and `panel.sync()`.

### What changed

One seed, `tools/cloud-brain/brain-issues.ojs`, 127 lines added and 15 removed, of which 103 are the
two tests. All of it is in `issuesPanel`; no handler, SQL or policy.

- **The caret.** `drawWaiting` read `document.activeElement` after its loop. The loop makes a row
  again by putting the kept box into a new `htl` template, which takes the box out of the page,
  and a box out of the page has no caret. The active element and its selection are now read
  before the loop. After the rows are put back the box is focused and `setSelectionRange` is
  called with what was read. Only a row's box is restored; a button that had the focus is a new
  element after a redraw and is not.
- **One write of a row at a time.** A set `busy` of issue ids. A press in a row goes through
  `once`: it does nothing when the id is in the set; otherwise it adds the id, draws the row's
  buttons (all disabled, tooltip "Being sent."), sends, and on the answer or the refusal takes
  the id out and draws the buttons again. It covers the moves, **Comment** and **− needs-owner**
  of a row. The box stays open for typing while a write is on its way.
  `actButtons` and `unlabel` take the wrapper as `via`; the open issue (`drawOne`) passes none and
  is as it was.
- The first `md` cell says both in the bullet of the block.

### Tests

17 of 17 `test_issues_*` cells in a headless QA tab (session `impl-pfa-2`) on the worktree's build,
2026-10-10 20:00:44 CEST, after the rebase on `bb447b04`. 14 were there at review 1, one came with
`stale-panel-after-deploy`, two are new:

- `test_issues_panel_keeps_the_caret_in_a_row_box`. The panel is appended to `document.body`, since
  the caret is the document's, and removed at the end. A box is focused with the selection 2 to 6.
  Read after each of: another caller's comment on that issue and a sync; the answer of `issue.get`
  (the row made a third time); a comment on the row beside it, which changes the order to c2, c1.
  Each time: the same element, the same text, `activeElement`, selection 2 to 6.
- `test_issues_panel_a_second_press_writes_once`. The client holds each write until the test lets
  it go. After one press of Comment every button of the row is disabled; a second press and a
  press of every other button leave one call held. Text typed meanwhile is kept and arms nothing.
  On the answer: one `commented` event with that body. Then a refusal ("not now"): the text is
  kept, the note says it, the buttons are armed. Then two presses again: one call, one event, the
  box empty.

`bun tools/lope-tests.ts … --filter test_issues` passes the same 17 in 15.0 s. It was not run on the
build that had the tests and no fix, so whether its DOM shows either defect is not known; the
failing run and the count are the browser's.

### Not tried

- The Comment, Review and Add label buttons of the open issue (`drawOne`). Not changed here: the
  rework names the block. This bullet said, from reading and with no run, that a second press of
  that Comment would send again. Wrong: review 2 (event 255) measured it, "two presses of that
  Comment with the call held: 1 call held, 1 commented event, textarea empty after". Why it sends
  once was not looked into. Review and Add label of the open issue are still not measured.
- The same press in two tabs, or a press of the same move in the block and in the open issue
  below it. `busy` is one panel's and is asked only by the block.
- A caret in a row whose issue leaves the block while it is typed in (approved by someone else):
  the row and its text go. Before and after this change.
- A press on cb4. It is the owner's write.
- The reviewer's probe with a client that answers after 150 ms was not run as such; the held
  client of the test is the same case with the answer under the test's control.

## Round 3, 2026-10-10: the two findings of review 2

Review 2 (event 255, sent back 20:12:29 CEST by event 256) found that a write of a row that fails,
where the press had taken the issue out of the block, gives back a row with (1) every button
disabled and titled "Being sent." until a character is typed, and (2) a new, empty box. Both have
one cause. `send` applies the write to the copy before the service answers, so the issue no longer
waits and `drawWaiting` deleted its row from `rows`. On the refusal `send` draws first: a new row
was made, with a new box, while `busy` still had the id. Then `once` took the id out and called
`oninput` of the old box, which drew the buttons of a row no longer on the page.

Reproduced before any change, with the test below added to the seed of `main` at `df6725a2` and
nothing else. The snippet of the implementer brief in a headless QA tab (session `impl-pfa-3`):

```
[18, ["test_issues_panel_a_refused_write_gives_the_row_back … Expected: true Received: false"]]
```

The assertion that failed is the first after the refusal: within 3 s, the row of `r1` is in the
block with no button disabled and titled "Being sent.". `bun tools/lope-tests.ts … --filter
test_issues_panel_a_` failed the same cell with the same message (908 ms, 1 passed, 1 failed). The
message names no line, and 908 ms is less than the 3 s that assertion waits in a browser, so which
assertion failed there was not read.

### What changed

One seed, `tools/cloud-brain/brain-issues.ojs`, 83 lines added and 3 removed, of which 78 are the
test. All of it in `issuesPanel`.

- `drawWaiting` keeps the row of an id that is in `busy` though its issue is not listed. When the
  write is refused the issue waits again, and the row found in `rows` has the box that was typed
  in. Where nothing else changed meanwhile it is the same row; where another caller's event came
  it is made again around the same box, as it is for any event.
- `once`, after the answer or the refusal, takes the id out of `busy`, draws the buttons through
  the box's `oninput` as before, and now calls `drawWaiting`, so a row kept for a write that was
  taken is dropped then and not at the next event.
- The first `md` cell says it in the bullet of the block.

Not changed: at the press the row still leaves the page, and is back only on a refusal. The other
way is to leave the row on the page, disabled, until the answer. That would also keep the caret
(below), but a write is shown as applied before the answer everywhere else in the panel, and
`test_issues_panel_lists_what_waits_for_the_owner` reads the row as gone.

### Tests

18 of 18 `test_issues_*` cells in a headless QA tab (session `impl-pfa-3`) on the worktree's build,
2026-10-10 20:26:24 CEST by the tab's clock, by the snippet of the implementer brief. 17 before,
one new. `bun tools/lope-tests.ts … --filter test_issues`: the same 18 in 15.8 s.

`test_issues_panel_a_refused_write_gives_the_row_back` has a client that holds each write until
the test sends it on or fails it with `new Error("Failed to fetch")`, as the reviewer's did. Two
issues, `r1` and `r2`, both labelled `needs-owner`.

```
− needs-owner on r1, failed        row gone at the press; back with the same <input>, "a line I
                                   was writing", 0 buttons at "Being sent.", − needs-owner and
                                   Comment enabled; the note "issue.label was refused: Failed to fetch"
then panel.sync()                  the same; the kept issue still has the label
rejected on r2 with a reason,      row gone; still gone after the sync; back with the same <input>,
  token a comments meanwhile,      "because of X", the comment shown, rejected enabled; state open;
  a sync, then failed              "issue.move was refused: Failed to fetch"
Comment on r1, then on r2,         2 held, both rows all "Being sent."; after r2's answer r2 is
  r2 answered first                armed and empty, r1 still all disabled with its text and 0 events;
                                   after r1's answer one event each, both boxes the same elements
− needs-owner on r1 again, taken   the label is off, the row is gone and stays gone after a sync
```

### Not tried

- A refusal by the service's guard (a 4xx with a message) in place of a rejected promise. The
  panel's `send` has one `catch` for both; the rig's own refusal was not sent through a row that
  had left the block.
- The caret. A box with the caret whose row leaves the page at the press does not have it when
  the row comes back: `drawWaiting` restores a caret only to a box that is in the block when it
  starts. Not asked by the review, not tested.
- Two answers out of order for one row: `busy` lets a row send one write at a time, so there is
  no such pair. The pair tested is of two rows.
- The same issue pressed in the block and in the open issue below it while one is held, and the
  same press in two tabs. As in round 2.
- A press on cb4 (the owner's write), a narrow window, a light theme, many rows.
