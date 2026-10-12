# bk-6-skill-watch-and-stats

Task 6 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, events 4148 and
4149 of `bookkeeping-in-the-tracker`), its part 6: the texts and the tools that read the queue.
Written 2026-10-12 and 13 with the token `impl-5c7990`; the `start` move is event 5275 (23:57:45
CEST by `date`). Two local tools, four texts, their tests. No seed, no build, no deploy.

Every time is CEST, from `date` beside the command. `ia` is
`tools/cloud-brain/issue-as.sh impl-5c7990`, run from the worktree `bm-bookkeeping-in-the-tracker`.

## What changed

**`.claude/skills/brain-maintenance/SKILL.md`, step 3.** The paragraph of the order ("A place goes,
in this order, to: …") and the table of 20 rows that each open issue was matched against are gone.
The step is the read of `issue.queue` and three tables:

- a row for each `do` of the queue, 10 rows, as the spec drafted them, with the wording finished;
- a row for each `why` of `waiting` that asks for something, 3 rows;
- under them, 13 rows of the old table, as they stood, that those two name or that the queue does
  not read. One sentence of them changed: the row of `needs-owner` ends "take the issue again from
  the queue", where it said "from this table".

The `decompose` row has the link: one `after` link for each "after" the spec gives a task, written
before any task is moved. The `ready` row says to read a `held:` comment of before first. The `look`
row says that a hold stays until the next move or a `remove`.

The spec's two checks of R6, run in the worktree after the last edit of the file:

```
awk '/^3\. \*\*/{on=1} /^4\. \*\*Spawn/{on=0} on && /^   \| /' .claude/skills/brain-maintenance/SKILL.md | grep -v -c -E '^   \| (`do`|In `waiting`|Issue is|---)'
26
grep -c "A place goes, in this order" .claude/skills/brain-maintenance/SKILL.md
0
```

The spec has 20 before and "13, with the draft of part 6 in the file", and says "The task's count
may differ by the rows it adds". It is 26: the draft's 13 and the 13 kept rows. The spec's part 6
names five to keep (a dead writer, a submit made for a writer, a quick win sent back, the judgment
at 3 reworks, `needs-owner`). Four more were added to the old table, or added to, after the draft
was written: the approver at `awaiting-approval`, the label `asks-orchestrator`, the two of a post
mortem (comment 5261 of this issue names them). Four have text the draft's rows name and do not
carry: a spec sent back, a digest at `open`, the owner's feedback, "Anything else". The old row for
a digest at `ready` is a sentence of the row `start`.

**The step is longer than it was, not shorter.** `awk '/^3\. \*\*/{on=1} /^4\. \*\*Spawn/{on=0} on' … | wc -lc`:
48 lines and 18,411 bytes at the commit before, 77 lines and 22,979 bytes now (both after the rebase, in which
`wait-says-what-runs-and-until-when` had added to the row of `asks-orchestrator`). What went is the
matching and the order: a session reads an entry's `do` and goes to one row. What stayed is every
case a row sends it to. Whether that is less to hold in mind was not measured; no pass has been
made from it ("Not tried").

**`SKILL.md`, step 1, "Past 4 hours".** It says what the line of `issue-stats.ts` counts now (below),
and that a wait is written as a link, a hold or `needs-owner`. The call of the `held:` comment
(`orch/<id>/held-1`) is taken out.

**`SKILL.md`, step 8 and the table under "State".** Step 8 says what the watch prints now. "What is
there to do" in the State table is the read of `queue`.

**`agents/spec.md`, step 5.** Each task names the tasks it is after, by id, or says it is after
nothing; a wait that is not for a task is said as that.

**`agents/implementer.md`, step 13.** One clause: the orchestrator learns of a submit from the
watch's line `QUEUE review <id>`, where it read "which prints every `submit`".

**`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`.** One clause for `issue.queue`
in the line of the tracker, beside `issue.flow`.

**`tools/cloud-brain/issue-watch.sh`.** At each read it asks `queue` too, and prints
`QUEUE <do> <id> <for> <title>` for each entry whose id and `do` were not in the answer before. It
keeps the entries of the last answer in a file of its own (`mktemp`), removed at its end. The first
answer is printed whole. The lines for an open (another caller's, or with the label `owner`) and
for a `submit` or `submit-spec` are taken out. Kept: an event of the owner's session, the label
`asks-orchestrator` put on, a comment of an `out-` token, and the line `asks-still`, which
`wait-says-what-runs-and-until-when` landed while this was written. `--queue <file>` reads one answer of
`queue` from stdin and makes no call, as `--filter` does for `sync`; an answer that is not the
queue's prints nothing and leaves the file.

**`tools/cloud-brain/issue-stats.ts`.** The last line is counted from one answer of `issue.queue`
and no longer from the record: `<n>` is the entries of `queue` with `late: true` whose `do` is
`start`, `spec`, `triage` or `ready`, each printed under the line with its `do` at the end;
`(<m> more are held)` is the entries of `waiting` whose `why` is `after` or `until`. The mark `held`
in the list of the idle is the same entries. With no answer the line reads `not read:` and why, and
nothing is marked. The reading of `held` in a triage reason is removed. The reading of a `held:`
comment stays for one thing, the list `feedback due to be closed` (`agents/overseer.md`, "One you
still need is held, not closed"): a feedback issue at `open` is in neither list of the queue.
`--json` has `unstarted.noReason`, each row with `do`, and `unstarted.held`, each with `why` and
`on` or `until`; `unstarted.notRead` in their place.

**Two other specs, in the sentences this made untrue.** `plan/cloud-brain-loop-order-of-service.md`
gains three notes "(Since `bk-6-skill-watch-and-stats` …)": at the watch's line for an open with
the label, at its line for a submit, and at the `held:` comment. `plan/cloud-brain-worker-machine-on-fly.md`
cites the script by line and says the tool reads `held:` comments: both mended in place
(`grep -n 'sleep "\$every"\|never exits' tools/cloud-brain/issue-watch.sh`: lines 84 and 5, after the rebase).
The spec of this task gains three notes "As built" in part 6 and one in each of two rows of its
table of checks.

## On cb4

The first four runs were made before the rebase, with the script and the tool as this change first had
them; the last is of the files as they land.

**The tool as it was and as it is, one after the other**, 00:00:12 on 2026-10-13, from the worktree
(the record at event 5281):

```
git show HEAD:tools/cloud-brain/issue-stats.ts > <file>; bun <file> --token impl-5c7990 | tail -1
past 4 h, not started, no reason: 0

bun tools/cloud-brain/issue-stats.ts --token impl-5c7990 | sed -n '/^past/,$p'
past 4 h, not started, no reason: 3 (21 more are held)
  ta-1c-parent-revoke-on-cb4               task     open               26.8 h with no move  triage
  ap-5-panel-approved-for-you              task     triaged             5.3 h with no move  ready
  ap-6-rules-and-live-step                 task     triaged             5.3 h with no move  ready
```

**Why the old count was 0.** The tool counted from an issue's last `moved` or `swapped` event. The
install of the policy at event 4668 (22:07 on 2026-10-12) wrote a `swapped` event for each open
issue of the task workflow (this issue's own is event 4678, `"reason":"policy 4668"`), so at
midnight every one of them was under 4 hours from its "last move". The queue's `since` is
`issue.last.at`, which the spec has "left by a swap of an install's `migrate`". This reading is from
the tool's code (`e.type === "moved" || e.type === "swapped"` sets `since`) and from that one
event; the three rows were not each traced. The old line had no `(<m> more are held)` either: no
issue with a `held:` comment was past 4 hours by that clock.

**The watch's filter on one answer of `sync`**, events 5101 to 5306 (`ia "sync?after=5100&limit=500"`,
206 events, 00:14:31), fed to the script as it was and as it is with `--filter impl-5c7990`:

```
as it was   31 lines: 12 opened, 16 moved, 2 commented, 1 labelled
as it is     3 lines:  2 commented (out-5f56b2, events 5120 and 5121), 1 labelled (asks-orchestrator, 5125)
```

**The watch's own loop**, `perl -e 'alarm 7; exec @ARGV' bash tools/cloud-brain/issue-watch.sh impl-5c7990 5270 2`
from the worktree, 00:11:15 to 00:11:23: 16 lines, each `QUEUE …` (7 `ready`, 8 `triage`, 1
`start`), printed once though the loop read every 2 s. `ia "queue"` just after: `seq` 5296, 16
entries in `queue`, 40 in `waiting`. No event line: none of events 5271 to 5296 is of the three
kinds kept. After the alarm ended it, `find "$TMPDIR" -maxdepth 1 -name 'issue-watch.*' | wc -l`: 0.

**`--queue` on two answers of cb4**, between the `start` (23:57:45) and 00:00:12: the first printed 17 lines, the second, a few seconds
later with the same entries, none.

**After the rebase, the files as they land**, 00:22:02 to 00:22:09. The same command for the loop, from event
5300: 17 lines, each `QUEUE …` (7 `ready`, 8 `triage`, 2 `review`), exit 142 (the alarm), no file of `mktemp`
left. `ia "queue"` then: `seq` 5321, 17 entries in `queue` (the same three counts), 40 in `waiting`
(`after` 16, `parts` 12, `owner` 4, `until` 4, `work` 4). And the tool:

```
bun tools/cloud-brain/issue-stats.ts --token impl-5c7990 | sed -n '/^past/,$p'
past 4 h, not started, no reason: 4 (20 more are held)
  ta-1c-parent-revoke-on-cb4               task     open               27.2 h with no move  triage
  ap-5-panel-approved-for-you              task     triaged             5.6 h with no move  ready
  ap-6-rules-and-live-step                 task     triaged             5.6 h with no move  ready
  ac-5-prose-names-the-two-shapes          task     triaged             4.1 h with no move  ready
```

20 is `after` 16 and `until` 4 of that read.

## Tests

In the worktree, each as `bun test --timeout=30000 ./tests/tools/<file>`. `grep -c '^test(' <file>` at
the commit this one stands on (`git show HEAD~1:<file>`, after the rebase) and now:

| File | Before | Now | What changed |
|---|---|---|---|
| `issue-watch.test.ts` | 32 | 37 | six tests of `--queue`, R7's among them ("two answers of queue: the first is printed whole, the second prints one line, for the entry that is new"); one of the loop, with a stand-in for `issue-as.sh`; one of the texts beside step 3; the four of an open are two (none is a line; one of his session is) and the two of a submit are one; two pins of step 8 |
| `issue-stats.test.ts` | 36 | 37 | the four of the past-4-hours line are five, fed an answer of `queue`; the test of the whole tool has `queue` as its last call and reads the last line |
| `os-2-order-and-pool.test.ts` | 6 | 6 | the two of step 3 and the one of step 1 are rewritten for the queue; one reads the names of `do` and `why` from the prose of `brain-issues.ojs`, so a row the service gains fails it |
| `issue-wait.test.ts` | 13 | 13 | one pin: the watch's line for a submit |
| `pm-2-brief-and-procedure.test.ts` | 7 | 7 | the post mortem's rows are named by the rows `triage` and `start` |

**They fail on the files as they were.** After the rebase, 00:21:44 to 00:21:52, with `SKILL=`,
`SPEC_BRIEF=`, `IMPLEMENTER=`, `CLUSTER_GUIDE=`, `ISSUE_WATCH_SH=` and `ISSUE_STATS_TS=` naming the files of
`git show HEAD~1:`:

```
os-2-order-and-pool.test.ts        3 pass  3 fail
issue-wait.test.ts                12 pass  1 fail
pm-2-brief-and-procedure.test.ts   6 pass  1 fail
issue-stats.test.ts               31 pass  6 fail
issue-watch.test.ts, with -t 'an open is no line|no move is a line|SKILL.md, step 8|SKILL.md says once|agents/spec.md has each task'    0 pass  5 fail
```

The seven tests of `--queue` and of the loop were not run against the script as it was, for this
reason: it has no such mode, takes `--queue` for a token and starts its loop, which never exits.
Before the rebase five of them were run so, by mistake: each failed at the 30 s timeout, and the run
was ended by hand. (`issue-as.sh` keeps no token of that name, so that loop sent nothing.)

**The counts at the landing.** In the worktree, after the rebase and after the last edit of a file a
test reads; this record and two cells of the spec's table of checks were written after it, and no
test reads either:

```
tests/tools/suite.sh        00:18:14 to 00:21:28, uptime's first number 5.90 before it
 888 pass
 0 fail
Ran 888 tests across 91 files. [193.95s]
```

No `skipped:` line (`grep '^skipped'` of the whole output). Before the rebase, 00:11:40 to 00:13:26:
853 pass, 0 fail, 88 files, 106.16 s. The five files alone are in that run; `issue-watch.test.ts`
by itself gave 37 pass, 0 fail at the continue of the rebase.

## The rebase

`worktree.sh --rebase` stopped once, on four files that `wait-says-what-runs-and-until-when` had
changed since this worktree was brought up: `issue-watch.sh` (its `--still` mode and the read of
`list?label=asks-orchestrator`), `SKILL.md` (the row of `asks-orchestrator` and a line of step 8),
`tests/tools/issue-watch.test.ts`, and the line numbers in `plan/cloud-brain-worker-machine-on-fly.md`.
Each was taken as `origin/main` has it and this change made on it again: the queue's function and
its read in the loop beside `still`; the rows of step 3 moved as they stand on `main`; step 8 with
the line `asks-still` kept. `diff` of `SKILL.md` before and after that: the row, the line of step 8
and main's new section, and nothing else. The loop now makes three reads at each turn: `sync`,
`list?label=asks-orchestrator`, `queue`.

## Read before the work

The Brain, three searches with `loop-knowledge` (`knowledge.search?semantic=true`), 23:55, before
the `start`: "orchestrator reads the queue step 3 SKILL.md what is next", "watch prints a line for
a new queue entry wakes the orchestrator", "past 4 hours not started held count issue-stats". Used:
`doc:cloud-brain-bookkeeping-in-the-tracker` (this task's spec). Read for what lands in the same
files after this: `doc:cloud-brain-orchestrator-as-steps` (lines 552 to 562: "it rewrites step 3 of
`SKILL.md` as the read of the queue, and gives `issue-watch.sh` a `QUEUE` line. Both stand") and
`doc:cloud-brain-tracker-trigger-rules` (its `WAKE <id> <when>` line of the same script, task
`tr-2`, and `waiter` on an entry, `tr-3`). `QUEUE` and `WAKE` are different first words.
`doc:pm-agent-request-not-seen-fly-idle` for the two lines of the watch added on 2026-10-12, which
stay. Also read: the prose "The queue" and `issueQueue` of `tools/cloud-brain/brain-issues.ojs`, the
records of `bk-3` and `bk-5`, and each of the 24 files under `tests/tools` that read `SKILL.md`, for
the sentences they hold.

## Not tried, not known

- **No pass has been made from the new step 3.** It was written and read, and its rows are held by
  tests of their words. No session has taken an entry by it.
- **No spec has been decomposed with links** by the row `decompose`, and no spec written under the
  new line of `agents/spec.md`.
- **The watch under a `Monitor`.** It was run 7 s from a shell. What a session sees when it arms it
  for 30 minutes was not seen, nor what the whole queue printed again at each arm costs it: 16
  lines at 00:11. How a `Monitor` ends the script is not known; a `kill -9` leaves the file of
  `mktemp` behind, one small file an arm.
- **A watch armed before this landing** runs the script as it was until it is armed again: the main
  checkout's file changes at the session's next pull, and a running bash keeps the file it opened.
  Not tried.
- **Three calls every 30 s.** What the third costs cb4 was not measured. `issue.queue` reads every row of the view
  (the spec, "Not tried, not known").
- **A queue of more than 200 entries.** The watch asks with no `limit`. An entry past the cut is not
  in the answer, and is printed when it comes in. `issue-stats.ts` says so in its line (`more`),
  from a test; cb4 had 16 to 19 entries in each read here.
- **`issue.queue` refused or not there.** The line `not read:` is from tests with a stand-in for
  `issue-as.sh`; the watch's silence on such an answer from `--queue` with a refusal's body. Neither
  was met on cb4.
- **`--until` and `--after`.** A count of the last line cannot be made again for an earlier event:
  the queue is of the time of the call. The line of before could.
- **An entry an agent is on** is printed by the watch, as the spec has it: the record does not know
  which agents run. How many of a night's lines that is was not counted.
- **The four issues `bk-5` left at `triaged` behind a link** (`fly-4b-first-run`,
  `fly-6-after-seven-days`, `bk-7-read-after-two-days`, `ac-5-prose-names-the-two-shapes`) each have
  a `held:` comment that says more than the link. The row `ready` now says to read it first;
  `ac-5-prose-names-the-two-shapes` was a `ready` entry in each read of the queue this task made, and
  nothing was written on it by this task.
- `agents/implementer.md`, "Where you work", says `issue-stats.ts` is run from `<root>`. It ran from
  the worktree here with no `ISSUE_AS`. That sentence was not changed.
