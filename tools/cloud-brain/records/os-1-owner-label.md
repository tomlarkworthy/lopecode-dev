# The label `owner` on what is the owner's (`os-1-owner-label`)

Task 1 of `plan/cloud-brain-loop-order-of-service.md`, part 1 of its design (R1), round 1, by a
writer of the issue loop on 2026-10-11. Two commits in a worktree made at `338d3dd6`, by their
subjects: "issue-watch.sh --filter reads an answer of sync from stdin" (author time 22:34:34 +0200,
`git log --format=%ai`; the commit time is the landing's rebase) and "the label owner marks an issue the owner asked for" (22:42:07). The
commits after those two are this record. The names of all of them on `main` are the refs of the submit. No seed, no deploy.

## What changed

- **`tools/cloud-brain/issue-watch.sh`.** It prints an `opened` event whose `labels` is a list
  with the name `owner`, whatever token opened it. Before, an open was printed only when its
  holder was not the token the watch was started with. The first commit moved the choice of lines
  into `issue-watch.sh --filter <token>`, which reads an answer of `sync?after=` from stdin and
  makes no call, so that a test can feed it; the loop calls the same function.
- **`.claude/skills/brain-maintenance/SKILL.md`, step 3.** A paragraph "The owner's" before the
  table: opened by his session, or labeled `owner`. The row for a project or feature at `open`
  reads "with three parts or more, or the owner's" where it read "or opened by the owner". The
  sentence "Among issues on the same row, one the owner opened or moved goes first" is as it was:
  it is `os-2-order-and-pool`'s.
- **`SKILL.md`, step 8.** Where it says what the watch prints, the label is named.
- **`knowledge/calling-a-cloud-brain-from-this-checkout.md`.** A paragraph "An issue the owner
  asked for", after "No token of your own for the tracker".
- **The spec.** Three notes "(As built, `os-1-owner-label`, …)": seven labels and not eight or
  nine, twice, and the guide's sentence.
- **Seven issues on cb4 got the label**, below.

## The test

`tests/tools/issue-watch.test.ts`, 10 tests, run in the worktree as
`bun test ./tests/tools/issue-watch.test.ts`. Eight feed `--filter` an answer; one reads
`SKILL.md` and one the guide. Each of the three that hold the change was run against the file as
it was before (`ISSUE_WATCH_SH=`, `SKILL=`, `GUIDE=` name a copy):

```
the script of the first commit, 8 tests then      7 pass  1 fail   "an issue opened with the label owner is a line, though the watch's own token opened it"
SKILL.md of 338d3dd6, 9 tests then                8 pass  1 fail   "SKILL.md says once what the owner's is, …"
the guide of 338d3dd6, 10 tests                   9 pass  1 fail   "the guide for calling a Brain tells a session …"
as committed                                     10 pass  0 fail
```

The first fail printed the list it got, `["LAST 4"]`, where the line `3 opened asked orch-aaaaaa`
was expected: the script ran and printed no line for the open.

What the eight give the filter: an open by another token (a line) and by the watch's own (none);
an open by the watch's own token with `["infra","owner"]` (a line) beside one with `["infra"]`
(none); `labels` of `["owners"]`, `["needs-owner"]`, `["Owner"]`, the string `"owner"`, `null`,
`[["owner"]]` and `{"owner":true}` (no line for any); an open by another token with the label
(one line, not two); a `labelled` event of the watch's own token that adds `owner` (none); a
comment made with the owner's session (a line); no events, and text that is not JSON (nothing,
exit 0); `--filter` with no token (not exit 0).

**The old and the new script over cb4's record.** The record was read whole at 22:35 CEST with
`issue-as.sh <token> "sync?after=<seq>"`, 200 events a call, to event 2673, and given to both
scripts as one answer:

```
--filter orch-d97e0e             385 lines before   385 after   diff: 0 lines
--filter issues-implementer-2    265 lines before   265 after   diff: 0 lines
```

No `opened` event of the record had the label then, so this shows that nothing printed before is
lost, and not that the new line is printed on cb4.

The whole directory, after the last edit of this file, is in the comment of the issue.

## The labels

The spec names eight issues, "open, not feedback, and say 'on the owner's word' or were opened by
his session", and a ninth if still open. Read again from the record at 22:35 (the `opened` events
whose kind is not `feedback` and whose `by.via` is `session` or whose body has the words "on the
owner's word": 19; then `get?id=` of each): 7 were not closed, and they are seven of the spec's
eight. `i1842` was at `done`, and `writers-qa-tabs-wake-the-orchestrator` too.

Each got the label with `issue-as.sh impl-4e8be2 label '{"key":"impl/os-1-owner-label/label-<id>","id":"<id>","add":["owner"]}'`,
each answered 200, events 2675 to 2681. Then, at 22:36:01 CEST:

```
issue-as.sh impl-4e8be2 "list?label=owner&limit=100"   ->  7 issues
ai-tomarkdown-pass-through  dashboard-service  flow-metrics  loop-order-of-service
n39625a1a  paper-summarizer-persona  worker-machine-on-fly
```

The spec's check of R1 says 8 or 9. It is 7, for the two closed issues.

`n39625a1a` was opened by his session and is the owner's without the label by the definition now
in `SKILL.md`. It was labeled because the spec's list names it; the other side was to leave it,
and `list?label=owner` would then be 6. With it the list has each open issue of his that is not
feedback, as of that minute. A later issue he opens in the page has no label and is not in that
list: `SKILL.md` says the call "lists the labeled ones".

## The guide's sentence

The spec: "`ta-5-outside-session-doc` writes the paragraph it belongs in and is held; whichever
lands second adds the sentence." `ta-5` was at `triaged` at 22:42:52 (`get?id=`), so this landed
first, and by that line the sentence was `ta-5`'s to add. The issue's body lists "the sentence in
the knowledge doc" among this task's parts. Taken: the sentence is in the guide now, as a
paragraph of its own, and `ta-5` has a comment that says where it is. Left for `ta-5`: to put it
in its paragraph for a session outside the loop.

## What the definition's sentences rest on

- "no guard of the workflow reads it": `issue-as.sh impl-4e8be2 policy`, 22:42:52 CEST, has `in issue.labels`
  three times, for `needs-owner` twice and `security` once, and no `"owner" in`.
- "whoever may call `issue.open` may write it": that answer has `"open":"true"` four times and
  no other `open`, and 37 `opened` events of the record carry labels. Event 1628
  (`worker-machine-on-fly`) was opened by `issues-implementer-2` with `["infra"]`. No open with
  `["owner"]` was made.
- "68 minutes": the spec's figure, under "What was asked". Not counted again.
- The `label` call in that paragraph has the shape of the seven calls above, with the
  orchestrator's key in place of the writer's.

## Not tried

- **The watch running against cb4 with an issue opened with the label.** No such issue was opened:
  the test's events are made in the test, with the fields of event 2641. The first session that
  opens one on his word is the first run.
- **A label on a closed issue**, and the label taken off again.
- **The watch's loop against cb4.** `issue-watch.sh impl-4e8be2 2640 2`, run from the worktree for
  8 s at 22:42 CEST, printed nothing and was ended by the alarm (exit 142): the script reads
  `issue-as.sh` of its own checkout, and a worktree keeps no token. What was run in its place is
  the loop's one pipe by hand, from the main checkout at 22:43:
  `issue-as.sh impl-4e8be2 "sync?after=2640" | bash <worktree>/tools/cloud-brain/issue-watch.sh --filter impl-4e8be2`,
  which printed the opens of other tokens and `LAST`. The loop as a whole is first run by the
  orchestrator's next arming.
- **Whether the orchestrating session's armed watch is the new script.** A watch started before
  the landing runs the old text until it is armed again (30 minutes at most, by `SKILL.md` step 8).
- **A label put on after the open is no line**, unless his session put it on. An issue the
  orchestrator labels is one it already knows; an outside session that labels an issue after
  opening it without is not seen by the watch. The spec asks for the open only.

## Prior art

Three searches of the Brain with `semantic=true` at 22:31 CEST each answered 402, "owner has made
2000 priced calls today, which is the most for one day". Three by words (`owner label issue`,
`issue-watch opened`, `label precedence`) answered the spec itself and docs that did not bear on
a label or the watch. Nothing was used but the spec.
