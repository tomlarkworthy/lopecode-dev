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
