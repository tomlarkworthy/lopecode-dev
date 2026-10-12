# The watch prints a comment written with an `out-` token (`watch-prints-an-outside-sessions-comment`)

An action of the post mortem `tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`
(its third). Round 1, by a writer of the issue loop, token `impl-80654f`, on 2026-10-12; its `start`
is event 5213. A local tool, three texts and a test file. No seed, no deploy, no install.

The case it is of, as the post mortem has it: comment 4916 of `fly-1-by-hand` was the owner's
question about a billed machine, written by a session outside the loop with the token `out-5f56b2`.
The watch printed no line for it, and the orchestrating session read it 38 s later in the listing
of a whole pass that happened to be running.

## What changed

- **`tools/cloud-brain/issue-watch.sh`.** The filter prints a `commented` event whose `by.holder`
  is, whole, `secret:out-` and six hex digits, and is not the token the watch was given. One
  condition, `outside`, beside `own`, `sent` and `asks`. The line has the form of every other:
  `<seq> commented <id> <token>  <the first 140 characters of the body>`. The header says so.
- **`.claude/skills/brain-maintenance/SKILL.md`, step 8.** The comment is among what the watch
  prints, with what is no line (that token's moves and labels) and that a watch armed before
  prints none until it is armed again.
- **`knowledge/calling-a-cloud-brain-from-this-checkout.md`.** One item under "A session outside
  the loop makes itself a token": its comment wakes the orchestrating session, so one comment for
  one thing. Not asked for by the issue. Without it the session that writes the comment has
  nowhere to read that it is a wake.
- **`plan/cloud-brain-worker-machine-on-fly.md`.** It cites the script by line; the two lines are
  38 and 7 now (`grep -n 'sleep "\$every"\|never exits' tools/cloud-brain/issue-watch.sh`), and the
  sentence says so, as the writer of `asks-orchestrator-label-and-watch` left it.

## What was decided here and is not in the issue

- **Comments alone.** The issue: "prints a comment written with a token `out-`". A move, a label,
  a link or a review by such a token is no line. An issue it opens was a line already (another
  holder than the watch's).
- **Not the watch's own token.** A session outside the loop that arms the watch with its `out-`
  token is not woken by its own comments. The orchestrating session's token is `orch-…`, so for it
  this changes nothing.
- **The name on the line is the token's**, `out-5f56b2`, and not `OWNER`: `OWNER` is an event made
  with his session. A comment with his session and an `out-` holder is one line, with `OWNER`.
- **What is read is the name.** `rules.md`, "Which token": "The role in a name is what its maker
  typed." A session outside the loop that writes with another name is not printed, and an agent
  that typed `out` as its role is.

## The test

`tests/tools/issue-watch.test.ts`, 21 tests before and 28 now, run in the worktree as
`bun test --timeout=30000 ./tests/tools/issue-watch.test.ts`. Six of the seven feed `--filter` an
answer and one reads `SKILL.md`. Run against the files as they were at `1904d03d`
(`ISSUE_WATCH_SH=` and `SKILL=` name a copy made with `git show 1904d03d:<path>`), 2026-10-12
23:37 CEST:

```
the script of 1904d03d     25 pass  3 fail   event 4916 is a line; an out- token and not a writer's; the watch's own out- token
SKILL.md of 1904d03d       27 pass  1 fail   "SKILL.md, step 8, has the comment of an out- token among what the watch prints"
as committed               28 pass  0 fail
```

Three of the six pass against the old script too: they hold what is no line, and the one line of
an owner's session.

What the six give the filter: event 4916 in the fields cb4 has (a line); comments of `out-0a1b2c`
and `out-ffffff` (a line each, a newline of the body as a space) beside comments of `impl-`, `rev-`
and the watch's own `orch-` token (none); a watch given `out-0a1b2c`, with a comment of that token
(none) and one of `out-ffffff` (a line); holders `secret:out-abcde`, `secret:out-abcdefa`,
`secret:out-ABCDEF`, `secret:out-abcdeg`, `secret:xout-abcdef`, `secret:outside-abcdef`,
`secret:out-`, the name with a space or a newline after it, `out-abcdef` with no `secret:`,
`session:out-abcdef`, `secret:impl-abcdef`, `secret:out-abcdef-2`, the empty string, `null`, `7`, a
list, an object, a `by` with no holder and an event with no `by` (no line for any); a `start`
move, a `labelled`, a `linked` and a `reviewed` event of `out-0a1b2c` (no line); and a comment
with `via` `session` and an `out-` holder (one line, `OWNER`).

Two other files read this script or the step, run after the change with the same flag:
`./tests/tools/issue-wait.test.ts` and `./tests/tools/pm-agent-request-not-seen-fly-idle.test.ts`.
The three files together: 46 pass, 0 fail. The second reads the script of `45687267` with
`git show` and still sees no line for 4916 there.

The whole suite, `tests/tools/suite.sh` in the worktree after its rebase on `origin/main` (which
brought in a change to `SKILL.md` by another writer), ended 23:42:33 CEST: 818 pass, 0 fail in 85
files, 217 s, the load 8.72 at its start (`uptime`).

## On cb4

Reads alone, with this writer's token; nothing was written for the check.

Event 4916 as cb4 answers it, `issue-as.sh impl-80654f "sync?after=4915&limit=3"` at 23:37:09 CEST
(events 4916 to 4918), through both scripts with `--filter orch-d97e0e`:

```
the script of 1904d03d    LAST 4918
as it is                  4916 commented fly-1-by-hand out-5f56b2  From a session with the owner, outside the loop (token `out-5f56b2`). The owner, 2026-10-12, before 22:41 CEST, whole:  > Is the fly work pr
                          LAST 4918
```

**The old and the new script over the whole record**, read at 23:37:20 CEST to event 5225 with
`sync?after=<seq>&limit=200`, and given to both as one answer:

```
--filter orch-d97e0e    919 lines before   961 after   diff: 42 lines
--filter impl-80654f    998 lines before  1040 after   diff: the same 42
```

The 42 are the 42 `commented` events of the record whose holder starts `secret:out-`, all of
`out-5f56b2`, events 4205 to 5121. That token's other events in the record, 6 `opened`, 6 `linked`
and 1 `labelled`, are in neither diff. No line that was printed before is gone.

So over the 917 events from 4205 to 5121 the change would have been 42 more wakes of the
orchestrating session. 21 of the 42 begin with a letter of a choice, `A. `, `B. ` or `C. `, or with
"No letter yet": the owner's answers, relayed (`grep -c -E '^[A-C]\. |^No letter yet'` over the
bodies of the 42 lines). 4916 is not one of the 21. How many of the 42 the session would have
acted on sooner was not counted.

**The watch's own loop**, `issue-watch.sh impl-80654f 4915 2` from the worktree for 6 s at 23:38:27
CEST: 56 lines, the first of them 4916.

## Not tried, not done

- **No comment was written with an `out-` token for this.** A writer makes no token. The line for
  such a comment is shown on the 42 that the record has.
- **The orchestrating session of this run has the watch it armed before the landing**, which
  prints no such line until it is armed again.
- **What the session does on the wake.** Step 8 says to read the issue and take it from the table
  of step 3, which has no row for "an outside session commented". The clause of step 8 says to
  read the comment. Step 3 was not changed: the issue names the line of step 8 alone.
- **A session outside the loop that works an issue as a writer does** would wake the session with
  each of its comments. The record has one `out-` token and its comments are of the owner's words
  or of the record; a second kind was not seen.
- **An agent's comment that carries the owner's words** (the orchestrating session quoting him, a
  session with a role's token) is no line, as before.
- **`issue-wait.sh`** reads reviews and moves, and was not changed.

## Prior art

Three searches of `knowledge.search?semantic=true` before the `start` (23:35:43 CEST): "watch prints comment outside
session out- token", "owner words from a session outside the loop reach the orchestrator",
"issue-watch filter by.holder commented". Each answered the post mortem first (scores 1, 0.992,
0.644). Used: the post mortem, `records/asks-orchestrator-label-and-watch.md` for the form of the
filter's tests and of the line cite, and `doc:calling-a-cloud-brain-from-this-checkout`, where the
item for an outside session went.
