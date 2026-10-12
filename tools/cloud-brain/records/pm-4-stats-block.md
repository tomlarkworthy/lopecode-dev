# pm-4-stats-block: `issue-stats.ts` prints the block `post mortems`, with the numbers of R8

Task 4 of `plan/cloud-brain-post-mortems-declared-and-kept.md` (part 7, R7 and R8). Written 2026-10-12 by the
writer with the token `impl-ebe2d0`, in the worktree `bm-post-mortems-declared-and-kept`. A local tool and its
test: no seed, no deploy.

## What it prints

The tool run from the worktree on cb4's record, after the `start` of this issue (event 5178), 2026-10-12 23:26:56 CEST (the time is the one its
`locks` line printed):

```
$ bun tools/cloud-brain/issue-stats.ts --token=impl-ebe2d0 | grep -A4 '^post mortems'
post mortems   3: 3 done, 0 not done
  pm-second-summarizer-role                done              of docs-summarised-for-search   actions: spec-names-what-exists-of-the-job done, decision-comment-names-what-is-added triaged, philosophy-one-role-for-one-job done   named again by: pm-approver-leaves-everything
  pm-approver-leaves-everything            done              of approver-persona   actions: approver-brief-his-test triaged, approver-before-decision-comment ready, approver-own-files-are-the-policy-cells triaged   named again by: none
  pm-agent-request-not-seen-fly-idle       done              of fly-1-by-hand   actions: asks-orchestrator-label-and-watch in-review, wait-says-what-runs-and-until-when triaged, watch-prints-an-outside-sessions-comment triaged   named again by: none
  declared with no label `owner`: 0; the owner undid work that had passed a review: 1 (send-back 1 [4434], owner-reject after a pass 0, revert 0)
```

Before the change the tool printed no line that starts `post mortems` (the test below, run on the tool of
`origin/main`).

I checked those five lines against the record read another way: a script of mine paged `sync` to event 5,166 and
printed every `linked` event that names one of the three, every `opened` and `labelled` of them, and every
`send-back`, `owner-reject` and `revert` move. It gave the same three `cause` links out, the same nine in, one
`related` link from a post mortem to an earlier one (4973, `pm-approver-leaves-everything` to
`pm-second-summarizer-role`), and one move of the three kinds, the `send-back` at 4434. The states of the actions
were not in that print; they are the tool's alone.

## How each part is read

All of it is in `report()`, from the events `sync` gave, and the header of the tool has the same in fewer words.

| Part | Read from |
|---|---|
| a post mortem | an issue with the label `post-mortem` at the last event read, no `test-` one. The label of the first came by a `labelled` event (4975), 495 events after its open |
| `done`, `not done` | the state is `done`, or it is anything else |
| `of` | the `cause` link the post mortem has; `no cause link` with none |
| `actions` | each issue with a `cause` link to it, with that issue's state; `none` with none |
| `named again by` | each post mortem opened after it that has a `related` link to it |
| `declared with no label `owner`` | the post mortems without that label. `SKILL.md`, "A post mortem": a session that declares one on his word "puts `owner` beside `post-mortem`", so one without it is the session's own |
| `the owner undid work that had passed a review` | each `send-back` move, each `owner-reject` of an issue that had a `reviewed` event with the verdict `pass` before it, each `revert`, with the seqs |

Three choices that the spec does not make:

- **Three numbers on the last line, not two.** R8's row sets "the same block's first line" against the count of
  the events, and step 7 of `SKILL.md` tells the owner when the session has "declared more post mortems than the
  record has events of the one case you declare for". The first line counts the owner's post mortems too (all
  three today), so it cannot be the number step 7 compares. The last line has the session's own beside the events.
  The spec has an "As built" note at task 4.
- **The moves are counted by their name, not by who made them.** In the policy in force at event 5,166 the guard
  of `send-back`, `owner-reject` and `revert` is `caller.present && …` in every workflow that has the move (read
  from the last `policy` event of that record). A policy that lets another caller make one would be counted the
  same; the header of the tool says so.
- **Not moved by `--after` or `--window`.** An action is opened long after its post mortem, so a count of the
  issues opened after an event would drop one end of a link. `--until` does reach it, as it reaches everything
  made from the events. Run on cb4 at 23:28:07 CEST: `--until 4900` printed `post mortems   0: 0 done, 0 not done`
  and the same last line as above; `--until 4972 --after 5000` printed two rows, both `in-progress`, the second
  `of no cause link` (its `cause` link is event 5024).

`not done` is every state but `done`: a post mortem closed as a duplicate, or rejected, is counted there, and its
row has its state. No such post mortem exists on cb4, and the test has none at `closed`.

## The test

Three tests added to `tests/tools/issue-stats.test.ts`, over a record of the test's own with the shapes above:
the label at the open and by a later event, a label taken off, a `cause` link each way and one removed, a
`related` link from a later post mortem, from an earlier one and from an issue that is none, a `test-` post
mortem and a `test-` action, an `owner-reject` after a pass, one with no pass and one whose pass came after it, a
`revert`, a hidden `revert`, and a record with no post mortem.

```
$ bun test --timeout=30000 ./tests/tools/issue-stats.test.ts
 35 pass
 0 fail
$ git show origin/main:tools/cloud-brain/issue-stats.ts > <scratchpad>/impl-ebe2d0-issue-stats-before.ts
$ ISSUE_STATS_TS=<scratchpad>/impl-ebe2d0-issue-stats-before.ts bun test --timeout=30000 ./tests/tools/issue-stats.test.ts
 32 pass
 3 fail
```

The three that fail there are the three added. The count of the whole suite is in the comment of the submit, from
the run after the last edit.

## The three `cause` links

Not made by this task: they exist. Events 4909 to 4911, by the writer of `pm-2-brief-and-procedure`, and the first
row above has the three as its actions.

## Docs mended

`git grep -n -F 'issue-stats' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
read for the lines that speak of the block.

- `SKILL.md`, "Known later": "is to print" and "the tool printed none when this was written" are now what it
  prints, with the first and the last line; "The read after three" no longer has "or that list until the block is
  printed". `tests/tools/pm-2-brief-and-procedure.test.ts` holds two sentences of that part and passes, 7 of 7.
- The spec, task 4: the "As built" note.

## Not tried, not done

- The page does not draw the block. The spec asks for the tool alone.
- Nobody has read the block in a pass of the orchestrating session or at an oversight. The first line reads three
  `done` today, which is what "The read after three" of `SKILL.md` waits for; opening `pm-read-after-three` is the
  session's.
- A post mortem with two `cause` links of its own: both ids are printed after `of`, by the code. No test has one.
- An issue the token is not shown that links to a post mortem. `sync` gave this token every event it asked for, and
  what the tool does with a link from an issue it has no `opened` event of was not tried.
- Line 4 of the tool's header, "a worktree has no tokens", and "Where you work" of `agents/implementer.md`, which
  has `issue-stats.ts` among the two tools "run from `<root>`": the runs above were made in the worktree with no
  `ISSUE_AS` and answered. Neither line is changed here.
