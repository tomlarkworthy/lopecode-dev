# ap-5-panel-approved-for-you

Task 5 of `plan/cloud-brain-approver-persona.md` (approved by the owner, event 4123): the block "For your
attention" of the tracker's panel has a group "Approved for you", the `approve` moves a token made in the last
7 days, each with the move that undoes it. Written 2026-10-13 by a writer of the issue loop (`impl-51efe4`),
round 1, started at event 5423 (01:10 CEST, read from `date` after the call). The commits and the deploy are
refs of the submit. Times are CEST, each from `date`.

**The group on the owner's page was not seen by the writer.** It is drawn for the owner signed in, and the
writer has no session of his. What was seen is the panel of this build with a client of the test's rig, in a
local headless Chrome (below, "As drawn"), and the one approval that cb4's record has for it to show.

## What changed

All of it in `tools/cloud-brain/brain-issues.ojs`, the seed of `brain-x-issues`:

- `issuesPanel`: the group, drawn by `drawApproved` at each draw of the block; `panel.approved()`, the lines as
  data; the option `clock`, the time the 7 days are counted back from; `actButtons` takes `only`, a list of move
  names, and marks each move's button with `data-move`.
- The first `md` cell: a bullet "Approved for you", after "For your attention".
- Three cells: `issuesApproverRig`, a rig whose policy names a delegation on `approve` of task and of project (as
  `plan/cloud-brain-issues-policy-v3.json` does), and the tests `test_issues_panel_approved_for_you` and
  `test_issues_panel_approved_for_you_keeps_the_caret`.
- `plan/cloud-brain-approver-persona.md`: "(As built …)" at part 5 and at the R8 row, and a paragraph for task 5.

No method, rule or setting of the Worker changed. `bun tools/cloud-brain/brain-info-size.ts` on the emitted
record, 01:25: `brain-x-issues 4966 of 5100, 29 methods, 134 bytes left`, the numbers `--live` gave before the
change.

## The group

**Which approvals.** `issueApply` keeps the actor of an issue's last move of each name, and `issueActor` answers
`by.via` whole for a token (`delegation:<id>`). So `issue.by.approve` of the page's copy says which issues a token
approved, with no call. The time and the reason are in the event: one `issue.get` for each issue whose
`by.approve` is a delegation and whose `updated_at` is of the last 7 days, through the `load` the block already
has (asked once for a seq of the issue). The line is the last `approve` event of that answer, when its `by.via`
is a delegation and its `at` is of the 7 days. A session's `approve` made for the owner on his word is sent with
his session (`rules.md`, Never), so its `via` is `session` and it is not in the group (event 4735 of
`docs-summarised-for-search` is one: `by.via` `session`, and `by.approve` of that issue is `owner`); the test has
the owner's own approve as that case.

**A list, not a fifth group of what waits.** The block shows one waiting issue at a time, in the order of the
ids, and `panel.waiting()` and `issuesAttention` (the Operator's read of the block) answer what waits. An
approved issue does not wait, R8 has him read each approval "in one line", and part 5 has them "newest first".
So the group is a list under the issue shown, and the place, the counts, `waiting()`, `row(id)` and
`issuesAttention` are as they were. With no such approval nothing of it is drawn.

**The undo.** One button a line: the move of `revert` and `owner-reject` that the issue's workflow lets the owner
present make from the state it is in, found with `issueAllowed` as every other button of the panel is. The
reason is the line's box. `revert` is guarded `size(event.refs) > 0`; the panel sends the approve event as the
ref, `{ kind: "event", value: "<seq>" }`, so that the press needs one text and not two. The ref says what is
undone and is no evidence of a change; the open issue, which the line's text opens, has a box for refs. The
reject carries the same ref.

**While a write is on its way** the copy has the move already (the panel applies a write before it is sent), so
the line has the state the move leads to and neither box nor button. A stale button's second press sends
nothing (`sending`, one write of a line at a time). A write that fails gives the box back, the same element with
its text.

## As drawn

A scratch script (not committed) made the panel in a local headless Chrome from `issuesApproverRig`, with three
approvals by the rig's token, one of them with the four-line reason that event 5170 of cb4 has, and took a
picture of it; 01:32. The text of the group as the page had it (`innerText`):

```
Approved for you (3) by a token, in the last 7 days, newest first. To undo one, say why and press.
example-spec 10/13/2026, 1:32:54 AM · approved approver: approve. The spec is what he asked for at event 7. verdict 30, brief aaaa
reject
t3 10/13/2026, 1:32:54 AM · reverted approver: approve. A short one. verdict 12, brief aaaa
tr-9-example-task 10/13/2026, 1:32:54 AM · done approver: approve Moves the line of what a decision's project is for to stand first in the rule of rules.md, as B of comment 4964 has it; rests on his B as two sessions quoted it. what he asked: B of verdict 5169, brief 9956b9aa3debe4c9d6d3434868f1efaa98b525f7
revert
```

In the picture the box and the button of a line are a row under its text, the box as wide as the block. The
first drawing had them in one wrapping row with the text, and a long reason pushed the box to a row of its own
and the button to a third; the layout was changed for that. A reason of several lines is drawn as one run of
text.

The same script with a press of **reject** on the spec's line, on the build of the last seed commit, 02:05: the
event the rig kept is `owner-reject`, reason `not this`, refs `[{"kind":"event","value":"38"}]`, and 38 is the
seq of the approve in `panel.approved()`. The test reads the ref of the `revert` and not of the reject.

What cb4 has for the group today, with the writer's token at 01:16: `issue.snapshot` has 448 issues, 1 with a
delegation as `by.approve`, `dense-rule-project-line-first`, at `done`; `issue.get` of it has one `approve`,
event 5170, `by.via` `delegation:eb3db9d0c6a5`, `by.holder` `secret:loop-approver`.

## The tests

Before the change, with the three cells added and the panel as deployed, between 01:10 and 01:16:

```
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues
"tests":65,"passed":63,"failed":["test_issues_panel_approved_for_you panel.approved is not a function",
"test_issues_panel_approved_for_you_keeps_the_caret expect(received).toBe(expected) …"]
```

After, on the build of the worktree at its last seed commit:

```
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…      (01:54, the run that emitted)
"tests":65,"passed":65,"failed":[]
$ (cd cloud-brain-dev && bun test.ts brain-x-issues --with …/ap-5.js)      (01:54)
passed 48, failed 0, needsBrowser 17
$ BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 60      (01:53)
"runs":60,"passed":60,"failed":0,"none":0,"from":["document"],"byChance":[]
$ 24 runs of tab-tests.ts on that build, six at once, in four rounds      (01:54 to 01:57, load average 25.45 at the end)
24 of 24 runs: 65 of 65
```

The 60 runs were made on the build of the seed as it stood, and the seed was committed after them with no edit
between; the three lines after it are of that build once committed. Each of the 60 runs had `"tests":65`. The 17 that need a browser are the panel's, the two new ones among them
(`location is not defined`): the count of the change is the browser's. 65 is the 63 of before this landing, and
the two.

What `test_issues_panel_approved_for_you` has, on a panel whose client holds each write until the test sends it
on or fails it: three approvals by the token are three lines, newest first; the owner's own approve is none, and
an issue that waits is none and still waits; `issue.get` is asked of the three and of the waiting one, not of the
one he approved; `revert` is sent once for two presses, with the reason and the approve's seq as its ref; a
dropped write gives the same box back with its text; two lines sent together and answered in the other order
each land; a line is still there, with its new state, between the answer of its write and the answer of the
`issue.get` that follows; an undone approval is a line with no box and no button; at 6 days by the clock the
lines are there, at 8 they are gone. The second test has the caret, the selection and the armed button of a line
kept when another caller's comment makes that line again, and when one makes the line above it again.

**Each of nine lines of the group, changed, against the two tests.** One substitution in the seed for each, a
build, `tab-tests.ts` on it, the seed put back. Run on the last seed commit, 01:57 to 02:03:

| The change | Passed | Failed |
|---|---|---|
| `revert` sent with `refs: []` | 63 of 65 | both |
| no `if (sending.has(i.id)) return;` | 64 of 65 | the first |
| `since = 0` in place of the 7 days | 64 of 65 | the first |
| the caret not put back | 64 of 65 | the second |
| any `by.approve`, not a delegation's | 64 of 65 | the first |
| the event's `via` not read | 65 of 65 | none |
| a new box at each drawing of a line | 63 of 65 | both |
| `actButtons` without `only` | 64 of 65 | the first |
| no event kept for a line while its issue is asked again | 64 of 65 | the first |

The sixth passes: the copy's `by.approve` has decided before the event is read, in every case the tests have.
That read is for an answer of `issue.get` older than the copy (an issue the owner approved, that came to wait
again and that the token then approved, drawn before the new answer). No test makes that case.

## What the runs found, after the first build passed

The first build of the group passed 65 of 65, once, and 20 of 20 of `verify-run.ts`. Three things came after,
each from a run that failed by chance.

**A line left the group for a moment after its own undo.** The panel forgets what `issue.get` gave of an issue
when a write of its own is answered (`forget`, in `send`), and asks again. The group read the approve from that
answer alone, so from the write's answer to the get's answer the line was not drawn. Seen as the first test
failing, in 1 of 24 runs of `tab-tests.ts` made six at once (01:37 to 01:41, load average 21.90):
`Cannot read properties of undefined (reading 'state')`, the test's read of the line it had just pressed. Two
earlier batches of the changed builds had the same test fail on a change that could not reach it (the caret,
in the batch of 01:25 to 01:30; the event's `via`, in that of 01:32 to 01:36), with the message not kept. Mended: a line keeps its approve event and is
drawn from it while the issue is asked again. The test now holds that `issue.get` back and reads the line; the
ninth row of the table is that line taken out.

**The tests' waits had a bound of their own**, 3 s, as the other tests of the panel have (`until`, 300 turns of
10 ms). `test_issues_lock_past_its_until_is_taken_over` failed in these same batches because 5 s passed between
two of its calls (`tools/cloud-brain/records/lock-test-5s-held-by-clock.md`), so 3 s is not a wait a busy page
keeps. The two new tests wait until the thing is so, and the limit of the run is their bound.

**The first test then hung in 2 of 20 runs of `verify-run.ts`** (01:48, `no result in 30 s`), and in none of the
24 of `tab-tests.ts`. It held back every `issue.get` and waited for exactly one to be held. The panel asks an
issue again whenever an answer finds it at another seq, so a get of the other line that was being sent could be
held too, and the count was then 2. Read from the code of `load`, not seen in a run: the hang has no message.
The test now holds the gets of the one issue it reads. After it: 60 of 60, above.

**The caret is one a document.** `test_issues_panel_keeps_the_caret_in_a_row_box` takes the focus too, and the
page runs its test cells together. No run failed for it. The new caret test names that cell, so it starts when
that one has ended, and fails with it if it fails.

## Texts that speak of the block

`git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
with this file left out, 02:06: `For your attention` 13 lines, `Approved for you` 2 (the spec, part 5 and its
paragraph as built), `issuesPanel` 33, `actButtons` 3, `panel.waiting` 3. Read: the lines outside this change are
records and specs of the block as it was built, and none says that the block has only what waits. None was
changed but the spec's.

## Not tried

- The owner's page on cb4 with the group. Not run on cb4: needs the owner present.
- The hang of the first test (above) was not made to happen again on purpose, with the gets of two issues held.
- The other tests of the panel keep their waits of 3 s; none was seen to fail for it in the runs of this change.
- The second read of `via`, on the event (above): no test fails without it.
- A spec at `building`: the test rejects one at `approved`. The button is whatever `issueAllowed` gives.
- A write the service refuses with a 403, as apart from one the network drops. Both leave `send` by the same
  `catch`; the test fails the write before it is sent.
- An issue that is in the block and in the group at once (a spec at `approved` with the label `needs-owner`):
  it has a box in each, and a press in each is two writes, of which the service refuses the second. Not run.
- Many approvals. The group has no limit on its lines, and asks one `issue.get` for each at the first draw. cb4
  has 1 today.
- A line leaves at the first draw after its 7 days. A page left open with no event on the tracker draws nothing,
  and keeps the line.
- The cluster's browser, Chrome 128: the runs here are Chrome 151. The deployer's own run after the apply is the
  one in that browser; its verdict is in the comment of the submit.
- The Operator is not told of the group: `issuesAttention` is as it was.
