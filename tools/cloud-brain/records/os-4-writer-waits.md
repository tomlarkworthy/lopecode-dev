# A writer waits for its own review (`os-4-writer-waits`)

Task 4 of `plan/cloud-brain-loop-order-of-service.md`, part 5 of its design (R5), round 1, by a
writer of the issue loop on 2026-10-11. One commit in a worktree made at `6577a442`, by its
subject: "os-4-writer-waits: issue-wait.sh waits for a writer's own review, …" (commit time
23:49:44 +0200, `git log --format=%ci` in the worktree; the landing's rebase gives it another).
The commits after it are this record. Their names on `main` are the refs of the submit. No seed, no deploy.

The change is a trial. `os-5-trial-read` keeps or takes out step 13 of the writer's brief after
five rounds that a writer took itself. No writer had waited for a review when this was written.

## What changed

- **New, `tools/cloud-brain/issue-wait.sh <token> <id> <after seq> [seconds]`.** It reads
  `sync?after=` every 15 s through `issue-as.sh` and writes nothing. Exit 0 prints the first
  `reviewed` event of the issue after the seq, one line of JSON, and then the first `moved` event of
  the issue after that review when it reads one within 30 s. Exit 3 after the seconds, 240 by
  default, with nothing printed. Exit 2 when `issue-as.sh` keeps no token of the name or a read is
  answered 401 or 403. Exit 64 for arguments it cannot read. `--filter <id> [after seq]` gives the
  same lines from one answer on stdin and makes no call.
- **`.claude/skills/brain-maintenance/agents/implementer.md`.** Step 13, "Wait for your review, and
  take the next round yourself", after step 12; the first sentence of the brief; one paragraph at
  the head of "A resumed round".
- **`tools/cloud-brain/issue-watch.sh`.** A `moved` event whose `move` is `submit` or `submit-spec`
  is a line, whatever token made it.
- **`.claude/skills/brain-maintenance/SKILL.md`.** Step 2, a paragraph "A writer that waits": how
  the orchestrator reads from the tracker that a writer waits, that it is not counted as a writer
  at work and is sent no round. Step 5: one `cost` line with `"rounds":2` for a run of two rounds,
  and a writer's token ended after its report. Step 8: the watch's new line. "A rework round goes
  to the agent that wrote the change": which rounds are still sent by message.
- **The spec.** One note "(As built, `os-4-writer-waits`, …)" under part 5.

## Where it differs from the spec, and why

**A second line.** The spec has the tool exit "with the first `reviewed` event of that issue as
JSON". Review 2415 noted that the reviewer's `rework` move is a later event. A writer that acts
between the two counts no `rework` move, so its round is 1 and its keys are `comment-1` and
`submit-1` again, which the tracker answers with `duplicate: true`. Two ways were open: the brief
tells the writer to read the issue until it is `in-progress`, or the tool waits for the move. The
tool waits. A read by the writer is one more request over its whole context each time, and the
tool's read costs nothing. Line 5 of `philosophy.md` (cost is part of a decision) decided it.

How long the move takes, from the record read whole to event 2851 with `issue-as.sh impl-697b35
"sync?after=<seq>"` (16 calls, 200 events at most in one), a script of this writing, not kept. It was read after
event 2851 (`at` 23:35:08 CEST) and before this task's `start`, event 2856 (`date` after it: 23:39:10), as were the
search and the `get` named below:

```
reviews with a later move of their issue   214   median 5.2 s   85th percentile 7.3 s   over 30 s: 4
  of them changes, then rework              54   median 0.5 s   min 0.3 s   max 9.7 s
  the four over 30 s                        32.5 s (pass), 58.5 s and 72.0 s (to-approval), 642.4 s (pass, event 72)
reviews with no later move                   0
```

So 30 s would have read the `rework` of each of the 54. The four it would have missed are `pass`
reviews, where the writer reports on the verdict and needs no move.

With one line and `changes` the brief has the writer read the issue once, and report when it is
still `in-review`. That case is not in the record (0 of 214).

**Exit 2.** The spec names exits 0 and 3. The orchestrator ends a writer's token; a wait that went
on reading with an ended token would give exit 3 five times. After a revoke on this machine
`issue-as.sh` exits 2 (`SKILL.md`, "A token for each agent"), and the tool passes that on.

**What the brief adds to the spec's sentence.** No round is taken when the issue has 3 `rework`
moves or more (the spec: "the judgment at 3 reworks stays the orchestrator's"). A round that came
by message does not wait, and neither does a quick win: the spec's "once".

**`round` of a line with `"rounds":2`.** The spec gives `rounds` and `event`. `round` is the first
of the two, and the key has that number. `run-cost-is-part-of-the-issue-model` was at `building`
with `cm-1` to `cm-6` at `triaged` (`issue-as.sh impl-697b35 "get?id=run-cost-is-part-of-the-issue-model"`), so the comment is the current form of a cost line.

## The tests

Run in the worktree after the last change to a file they read:

```
bun test ./tests/tools/issue-wait.test.ts     13 pass  0 fail
bun test ./tests/tools/issue-watch.test.ts    13 pass  0 fail   (10 before this task, 3 added)
bun test ./tests/tools                        see "The whole suite" below
```

Against the files as they were at `6577a442`:

```
ISSUE_WATCH_SH=<the script of 6577a442>                     12 pass  1 fail   "a submit and a submit-spec are a line each, whatever token made them, the watch's own too"
SKILL=<SKILL.md of 6577a442> IMPLEMENTER=<the brief of it>  11 pass  2 fail   "the writer's brief has the wait as step 13: …", "SKILL.md: a writer that waits is not a writer at work, …"
ISSUE_WAIT_SH=<a path with no file>                          2 pass 11 fail   the two that pass read the texts
```

The 13 of `issue-wait.test.ts` call a stand-in for `issue-as.sh` (`ISSUE_AS_SH`) that gives the
files of a directory in turn and logs its arguments. What they give the tool: a review and its
move among another issue's events and an answer that is not JSON; no review for 1 s; answers that
are never JSON; an answer of 200 events, then the review; a review whose move does not come
(`ISSUE_WAIT_MOVE=1` in place of 30 s); `seconds` of 0; a seq past the last event (`reset: true`);
a stand-in that exits 2, and one whose stderr ends `[401]`, `[403]` and `[502]`; twelve argument
lists that are refused. One test holds that each call had two arguments, so no body was sent.

## Run against cb4

Each with the tool of the worktree and `ISSUE_AS_SH` the main checkout's `issue-as.sh`, since a
worktree keeps no token.

```
issue-wait.sh impl-697b35 os-4-writer-waits 2856          23:40:35 to 23:44:35 CEST   exit 3, nothing printed
issue-wait.sh impl-697b35 os-4-writer-waits 2856 20       23:51:25 to 23:51:45        exit 3
issue-wait.sh impl-697b35 os-2-order-and-pool 2843 20     23:51:45                    exit 0: 2848 reviewed (pass), 2849 moved (pass)
issue-wait.sh impl-697b35 topics-service 2781 5           23:50:14                    exit 0: 2797 reviewed changes, 2798 moved respec
issue-wait.sh impl-nope os-2-order-and-pool 1 20          23:51:45 to 23:51:49, with  exit 2, "no token named impl-nope is kept; nothing was sent"
issue-wait.sh impl-697b35 os-2-order-and-pool 99999 3     the line above              exit 3, "after 99999 is past the last event, 2863; reading from 2863"
```

The first line is the spec's "not tried": the run was a foreground Bash call with the timeout at
280,000 ms, made by a writer that was a background Agent of the orchestrating session, and the
harness did not stop it. That is one run, and it was made before the exit for a refused read and
`ISSUE_WAIT_MOVE` were added to the tool; the other five were made with the tool as committed.

**Every submit of the record through `--filter`**, at 23:50 CEST, the record to event 2851 as one
answer, each `submit` move's id and seq as the arguments:

```
submits 179   exit 0 with the lines the record has next: 179   of them two lines: 179   wrong: 0
  pass then pass 104, pass then to-approval 21, changes then rework 54
```

**The watch, old and new, over the same record** (`--filter <token> < the record`, the old script from `git show 6577a442:`):

```
--filter orch-d97e0e             393 lines before   605 after   212 added, 0 removed
--filter issues-implementer-2    270 lines before   482 after   212 added, 0 removed
the 212: 178 moved … in-review, 34 moved … spec-review
```

The record has 213 `submit` and `submit-spec` moves; one was made with the owner's session and was a line before.

## The whole suite

`bun test ./tests/tools` in the worktree, after the commit named above: 447 pass, 1 skip, 0 fail,
448 tests in 49 files. The run after this record was committed is in the comment of the submit.

## What was read before designing

The Brain's search with `loop-knowledge`. Three searches with `semantic=true` ("wait
for review event poll tracker", "prompt cache keep warm resumed writer", "cost line rounds usage
agent") were each answered `UpstreamFailed … ai.v1/embeddings answered 402 owner has made 2000
priced calls today`. One by words, "wait review", gave six `doc:` entries, the first the spec of
this task; "cache resumed" and "rounds" were sent in the same command and their answers were lost
to a shell error and not read. Nothing but the spec was used.

## Not tried

- **A writer's wait for its own review.** No run of step 13 is behind this record: the writer of
  this task was started with the brief as it was. What it did after its submit is in its report and
  the comment after it, not here.
- **Five runs of 240 s one after another.** One was made.
- **Whether a request made while waiting reads the cache.** That is the trial (`os-5-trial-read`),
  counted from transcripts by the orchestrator.
- **A real 401.** The exit for a refused read was run against a stand-in whose stderr ends
  `[401]`. That cb4 answers a revoked token 401 is `SKILL.md`'s sentence, not a call of this task.
- **A review whose move never comes, on cb4.** By the stand-in only; the record has none.
- **The watch's loop against cb4 with the new filter.** `--filter` was run over the record; the
  loop that calls it was not changed and not run.
- **An orchestrator reading the new texts.** Step 2's test for "a writer that waits", the `cost`
  line with `"rounds":2` and `agent-usage.ts` with no `--last-run` for such a run are written and
  not yet followed by anyone. No transcript of a run of two rounds exists to count.
- **A watch that is already armed.** It runs the script as it was when it started, so it prints no
  submit until it is armed again (`oversight.md`: "a watch armed before a landing runs the old `issue-watch.sh` until armed again (os-1)"). `SKILL.md`, step 8, says so.
