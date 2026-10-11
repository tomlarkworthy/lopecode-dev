# Open feedback is closed with the work it is tied to (`feedback-closed-or-promoted`)

Round 1, by a writer of the issue loop on 2026-10-11, in a worktree made at `20dc75fa`. No seed, no
deploy. The owner, shown the backlog that day: "Why are the feedback ones not being done?"

## What was there

51 feedback issues at `open` on cb4 at event 2745 (23:00 CEST). The issue's body counts 49 at 22:30.
`SKILL.md` had "Nothing, unless it is the owner's and asks for a change: then `promote` it" for them, and
no text of the loop had anyone close one that was not a duplicate or gathered into an approved spec.

No policy install was needed. The feedback workflow of the installed policy (event 483) has the move
`close` from `open` and the swap `promote`, both for any token:

```
issue-as.sh impl-c4e497 swap '{"key":"…","id":"test-fb-promote-c4e497","swap":"promote","reason":"test of the call"}'   -> 200, event 2747
get?id=test-fb-promote-c4e497   -> kind feedback, state open, workflow 8dd86dbd (the task workflow)
```

So a promoted issue keeps the kind `feedback` and sits at `open` of the task workflow. The old row
would have matched it again by its kind. The test issue was rejected at event 2748.

## What changed

- **`tools/cloud-brain/issue-stats.ts`** prints two lists after its `feedback` line. `feedback due to
  be closed`: a feedback issue at `open` of the feedback workflow, not labeled `needs-owner`, with no
  comment that begins `held:`, that has a tie and whose every tie is at `done` or `closed`. A tie is an
  issue it links to, an issue that links to it, or its parent. `feedback of the owner's with no tie, to
  promote`: labeled `owner` or opened by his session, and no tie.
- **`agents/overseer.md`**, a section "Feedback that is due": the overseer closes each due one in its
  oversight with a reason that names the ties, holds one it still needs with a `held:` comment, and
  closes one of the owner's only when it can name what the finished work did for his ask.
- **`SKILL.md`**, the row for `open`, kind `feedback`: the orchestrator promotes one that is the owner's
  (the paragraph "The owner's" of `os-1-owner-label`: his session, or the label `owner`), asks for a
  change and has no tie; the call is written out; a promoted one is taken by the rows for a task.

## The two things the issue left to settle

**Is "finished" `done` alone?** `done` and `closed`. Not `rejected` or `reverted`. The one case on cb4,
`seen-reviewer-bug-rejected-in-seconds`, is tied to two rejected bugs and is a report about those
rejections, so their being rejected answers nothing in it. It stays at `open`, read as one with no tie.

**How is feedback filed for the owner known as his?** By the label `owner`, which `os-1-owner-label`
landed the same evening (`971611f0`) for exactly an issue a session opens on his word. A field would
have been a change of the Worker; nothing more was built.

One of his that already has a tie is not promoted. The four below are each tied to a project at
`building` or to another of the four, and a task made from each would do that work a second time.
Decided by `philosophy.md`, line 2 (the smaller side, easier to undo). The other side: his ask then
waits on a project and is closed with it, so the overseer's close of one of his has a check the others
do not have (it names what was done for the ask, or leaves it for him).

## The pass over the open feedback

Run from the main checkout with the worktree's `report()` over the whole record (`sync?after=`, 500 a call):

```
23:00 CEST, event 2745    51 open    25 due    0 to promote
23:05 CEST, event 2775    33 open     7 due    0 to promote
list?kind=feedback&state=open&limit=500 at 23:05   -> 33 issues
```

- **18 closed**, events 2754 to 2771, each with the reason "Every issue this is tied to is finished:
  <ties and states>. … Whether that work changed what this reports was not looked at; it has no comment.
  Seen again, it is filed again, and reopen undoes this close." These are the due ones with no comment.
- **7 due and left at `open`**: `seen-refused-install-probe-vs-never`, `seen-unlabel-comment-names-no-event`,
  `seen-session-writes-most-submits`, `seen-review-brief-branch-only-seed`, `seen-verify-run-shell-own-module`,
  `seen-never-crossed-on-chat-word`, `seen-reviewer-brief-spec-section-gaps`. Each has a comment of an
  overseer. I read the comments: they add a second case, or carry an edit of a brief "for the next put"
  that was not made. Closing those by the count of their ties would have dropped work an overseer was
  keeping, which is why the tool reads `held:` and the brief has the paragraph on holding. None of the
  seven has a `held:` comment, so the tool lists all seven for the next oversight.
- **4 labeled `owner`**, events 2772 to 2775: `health-chart-not-useful-remove`,
  `services-chart-near-the-top`, `specs-kept-in-the-cluster`, `for-your-attention-one-issue-at-a-time`.
  The issue names five. The fifth, `health-dashboard-three-panels-stale`, opens "Seen 2026-10-11 21:48
  CEST while working fb-a2oogpkdjb": it is an agent's report and got no label.

## The test

`tests/tools/feedback-closed-or-promoted.test.ts`, 8 tests, run in the worktree at 23:06 CEST as
`bun test ./tests/tools/feedback-closed-or-promoted.test.ts`. Six give `report()` a record of 29
feedback issues and seven tasks; one reads the overseer's brief and one the row of `SKILL.md`.
`ISSUE_STATS_TS=`, `SKILL=` and `OVERSEER=` name a copy of each file as `20dc75fa` has it:

```
all three as they were         0 pass  8 fail
the tool alone as it was       2 pass  6 fail
as committed                   8 pass  0 fail
bun test ./tests/tools       413 pass  1 skip  0 fail   (414 tests, 46 files)
```

## Not tried

- Whether the finished work changed what each of the 18 closed notes reports. The issue left it out
  and the close reason says so.
- A promote of a real issue: none was to promote. The call was made once, on a test issue.
- An oversight run with the new section. No overseer has read it.
- What the 4 unlinked notes are, and whether the projects the owner's four are tied to do what he asked.
- The tool's lists on a record whose policy event gives feedback no workflow: both are then empty,
  from the code, not from a run.
- `issue-stats.ts` run whole from the worktree: a worktree has no tokens. The lists above came from
  `report()` and `text()` of the worktree's file, given the record read with the main checkout's `issue-as.sh`.
