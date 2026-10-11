# attention-block-unreadable-to-owner

2026-10-11. The block "For your attention" of the tracker's panel (`issuesPanel`,
`tools/cloud-brain/brain-issues.ojs`). Seed commit `5ab9e936` (`git log -1 --format='%h %ci'`:
2026-10-11 15:09:10 +0200).

## What the owner said

Tom, 2026-10-11, of the block on cb4 (issue body, event 677): "it is unreadable so I can never find
these approvals and its not clear what button needs pressing. the codes we use in chat are not the
ones in the list, and its not clear what button to press, and the order is strange."

## What the block did (brain-x-issues `8e7b8d43`, read in the seed before the change)

- A row was the title as a link, then `<code>id</code>`, then state, kind, about, labels.
- A move's button had the name of the state it leads to: `text: to` in `actButtons`. The approve
  move was a button "done".
- Under the row was the last comment, or the last event when there was none.
- The order was `updated_at` descending, so a comment on any row moved it to the top.

## What it does now

Decided by the writer under line 2 of `philosophy.md`, for line 4. Each choice below had another
side; the one not taken is named.

| Want of the issue | Now | Not taken |
|---|---|---|
| The id leads | `<code>` in bold at the text's size is the first element of a row; the title is on the line under it | the id as the link: the title still opens the issue |
| A button says what it does | the name of the move this caller would make with a reason (`issueAllowed(...).name`): `approve`, `triage`, `close`; `owner-reject` is shown as `reject`; the tooltip is "To done." The same names in the open issue, where a refused move takes the first move listed to that state | a table of words in the panel: the workflow is installed as data and has the names already |
| The asked one is told apart | it is first and bold, `data-asked`: `approve` on an approval, `Answer` on a needs-owner row | a colour: the panel has no colours of its own |
| One line says what is asked | `data-ask` after the id: "Approve it, or reject it with a reason.", "Answer it: type the answer, then press Answer.", "A security report: read it, then move it." | a line written for each issue: nothing in the record holds one |
| What the ask is about | an approval: the review that passed. An answer: the last comment by whoever added `needs-owner`, before the labelling; or the body of an issue opened with the label. Then the last comment when it is another event | the latest event alone, as before |
| An order he can predict | four groups under headings with counts (To approve, To answer, Security, Not shown to this caller), by id inside a group | oldest first: he looks for a row by the id he has from chat, and the id is on every row; whether each issue on cb4 has an `opened_at` was not read |

`Answer` is new: one press sends the box as `issue.comment` and then `issue.label` with
`remove: ["needs-owner"]`. Two events. When the comment is taken and the label is refused, the box
is emptied (a second press is not a second comment) and the row is back with "take needs-owner
off" armed. `− needs-owner` is now "take needs-owner off".

The same eight issues are listed: `waits` was not changed.

## Tests

`test_issues_panel_attention_rows_say_what_is_asked` is new. Written first and run in a QA tab
(Chrome, headless) against the panel as it was: 23 `test_*` cells, 1 failed, the new one, on the
order (`q3` first, where `a1, q1, q2, q3, s1` was expected).

After the change, the snippet of step 8 of `agents/implementer.md` in a QA tab on
`$W/tools/cloud-brain/.emitted/cloud-brain.html`, 2026-10-11 about 15:08 CEST: `[23,[]]`, 23 run
and none failed.

`cd cloud-brain-dev && bun test.ts brain-x-issues --with <built module>`: `passed 14, failed 0,
needsBrowser 9`. The nine are the panel's tests (`location is not defined`), the new one among
them; 14 + 9 = 23.

Two tests of the old order were changed. `test_issues_panel_lists_what_waits_for_the_owner`:
the order `w3, w1, w5, w4`, and the approval's row shows "reviewed pass" where it showed the move.
`test_issues_panel_keeps_the_caret_in_a_row_box`: a comment no longer changes the order, so its
last step opens an issue `c0` that comes in before the row with the caret.

The new test, of the brief's four for a control that writes: a second press before the answer
(one `issue.comment` held, every button "Being sent."); a write refused, both the comment and the
label; another caller's comment on the row between the two writes. Two rows answered out of order
and the caret are in the two tests named for them and were not repeated for `Answer`.

## Not tried

- The block on cb4 with the real eight rows in a browser. The page of cb4 is not opened by the
  loop (`rules.md`, Never). The picture looked at was a panel on a rig with five issues of the
  same shapes.
- "dv-5 waits for dv-4": the record has no link that says one issue waits for another (`rels`:
  `part-of`, `duplicate`, `cause`, `related`), so such a row is not last and says nothing of it.
  Its row shows "part of <project>". A relation would be a change to a method.
- `Answer` where the caret is in the box when the comment's answer lands: the caret test types
  and reads, it does not press Answer.
- Whether "by id" is the order he wants inside a group. It is the one that does not move.
- Chrome 128, the cluster's browser, before the deploy. The deployer runs the tests there after it.
