# A running agent asks the orchestrating session with a label, and the watch prints it (`asks-orchestrator-label-and-watch`)

An action of the post mortem `tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`
(its first, "The root cause"). Round 1, by a writer of the issue loop, token `impl-0f0bf1`, on
2026-10-12; its `start` is event 5123. A local tool, two texts an agent reads and a test file. No
seed, no deploy, no install.

The case it is of, as the post mortem has it: comment 4816 of `fly-1-by-hand` asked the
orchestrating session for a go-ahead at 22:21:06 CEST with a billed Fly machine running, and the
answer, 4921, came at 22:43:04, after the owner asked. The watch printed no line for 4816.

## What changed

- **`tools/cloud-brain/issue-watch.sh`.** The filter prints a `labelled` event whose `add` is a list
  with the name `asks-orchestrator`, whatever token wrote it. One condition, `asks`, beside `own`
  and `sent`. The line has the form of every other: `<seq> labelled <id> <token> ['asks-orchestrator'] `.
- **`.claude/skills/brain-maintenance/SKILL.md`, step 3.** A row `labeled asks-orchestrator, at any
  state` between the row of `needs-owner` and the first `in-progress` row: answer in that wake with
  a comment keyed `orch/<id>/answer-<n>`, then take the label off; a whole pass reads
  `list?label=asks-orchestrator&limit=100` before the table.
- **`SKILL.md`, step 8.** The label is among what the watch prints, and the fallback wake names the
  read of the list.
- **`.claude/skills/brain-maintenance/agents/implementer.md`.** A section "When you need the
  orchestrating session", before "A quick win", and one line at the end of step 3 that points to
  it. The first choice is to stop what is billed and end the run with a report. The label is for a
  run that cannot end: the comment with the ask, then the label, then a read of the label once a
  minute, for 10 minutes at most.
- **`plan/cloud-brain-worker-machine-on-fly.md`.** It cites `issue-watch.sh` by line ("line 33",
  "its line 4"); the two lines are 35 and 5 now, and the sentence says so.

## What was decided here and is not in the issue

- **The session takes the label off after its answer, and the agent reads the label gone as
  "answered".** The issue says "take the label off with the answer" and gives the agent no way to
  learn of it. A label is in `issue.labels` of `get?id=`, so the agent's read needs no parse of
  comments.
- **The agent's read exits 0 with the label on, 3 with it off, and anything else when the answer
  has no issue.** With 1 for "off", a read that failed would have been taken for an answer: python
  exits 1 on the exception.
- **10 minutes, then the agent takes the label off itself and reports.** The number is this
  writer's and is not measured. Without one the wait has no end, which is the second thing the post
  mortem names beside the cause. What a billed thing does through a wait is
  `wait-says-what-runs-and-until-when`, which is not written.
- **An `opened` event with the label is not read as an ask.** The filter reads `labelled` alone. An
  issue another token opens is a line already; one the watch's own token opens with the label is
  none (the test has it).
- **The label put on by the watch's own token is a line.** The issue: "whatever token wrote it".

## The test

`tests/tools/issue-watch.test.ts`, 13 tests before and 21 now, run in the worktree as
`bun test --timeout=30000 ./tests/tools/issue-watch.test.ts`. Five of the eight feed `--filter` an
answer, two read the texts, and one runs the read the brief gives. Each group was run against the
file as it was at `83ef3477` (`ISSUE_WATCH_SH=`, `SKILL=` and `IMPLEMENTER=` name a copy made with
`git show 83ef3477:<path>`):

```
the script of 83ef3477     18 pass  3 fail   the label is a line; the comment, then the label; the two events of cb4
SKILL.md of 83ef3477       20 pass  1 fail   "SKILL.md has the row of the label above the in-progress rows, …"
the brief of 83ef3477      19 pass  2 fail   the brief's section; the brief's read of the label
as committed               21 pass  0 fail
```

What the five give the filter: the label added by a writer's token, by a spec writer's beside
another label, and by the watch's own (a line each); a comment keyed `impl/a/ask-1` alone (no
line), and the same comment before the label (one line, the label's); the label taken off by the
watch's token and by a writer's, `add` of `["needs-owner"]`, `["asks-orchestrator-2"]`, `["asks"]`,
the string `"asks-orchestrator"`, `[["asks-orchestrator"]]`, `null`, `{"asks-orchestrator":true}`
and `["Asks-Orchestrator"]`, a `commented` event with an `add`, and an open by the watch's own token
with the label (no line for any); the label added with the owner's session (one line, not two);
and the two events cb4 recorded, below.

The two tests of the texts hold: one row of the label, above the first `in-progress` row, with
"Answer in this wake", the key of the answer before the `remove`, and the list call; the line of
step 8 and the fallback's read; in the brief, "First choice: end the run." before the paragraph of
the label, the comment's command before the label's, and the pointer of step 3. They hold that the
sentences are there. Whether an agent follows them is not tested.

## On cb4

One check, with this writer's token on its own issue, 2026-10-12 23:12 CEST. It was no ask, and the
watch then armed was the script of before, which prints neither.

```
issue-as.sh impl-0f0bf1 label '{"key":"…/check-add-1",…"add":["asks-orchestrator"]}'        200, event 5125
issue-as.sh impl-0f0bf1 "list?label=asks-orchestrator&limit=100"                             one issue, this one
issue-as.sh impl-0f0bf1 label '{"key":"…/check-remove-1",…"remove":["asks-orchestrator"]}'  200, event 5126
issue-as.sh impl-0f0bf1 "list?label=asks-orchestrator&limit=100"                             {"issues":[]}
```

So the policy in force lets a writer's token put the label on its own issue and take it off, which
the post mortem had not read. The answer of `sync?after=5122`, events 5123 to 5126, through both
scripts:

```
issue-watch.sh --filter orch-d97e0e, as it was     LAST 5126
issue-watch.sh --filter orch-d97e0e, as it is      5125 labelled asks-orchestrator-label-and-watch impl-0f0bf1 ['asks-orchestrator']
                                                   LAST 5126
```

**The old and the new script over the whole record**, read at 23:15 CEST to event 5133 with
`sync?after=<seq>`, 200 events a call, and given to both as one answer:

```
--filter orch-d97e0e    904 lines before   905 after   diff: 5125
--filter impl-0f0bf1    983 lines before   984 after   diff: 5125
```

No label of that name was in the record before 5125, so no earlier line changes.

**The watch's own loop**, `issue-watch.sh impl-0f0bf1 5124 2` from the worktree for 6 s at 23:20
CEST: its first line was 5125, and 5126 was not among the six it printed.

**The brief's read**, with `ia "get?id=asks-orchestrator-label-and-watch"` before it, the label
off: exit 3. With `get?id=no-such-issue-xyz`: exit 1.

## Not tried, not done

- **No ask was made this way and no row was answered.** The orchestrating session of this run has
  the watch it armed before the landing, which prints no such line until it is armed again.
- **The read with the label on, against cb4.** In the test it is given `{"issue":{"labels":[…]}}`.
  On cb4 it was run with the label off and on an id that is not there.
- **A token of another agent on this issue, or a writer's token on another's issue.** The check
  was one token on the issue it had started.
- **`spec.md`, `digest.md`, `overseer.md` and the reviewer's brief have no such paragraph.** The
  issue names the implementer's brief. A spec writer or a reviewer that puts the label on is
  printed and answered the same; nothing tells it to.
- **`issue.queue`.** An issue with the label is under `work` there, as the issue's body says. Not
  changed: a seed, and `major`.
- **Nothing checks that the comment came before the label**, or that the session's answer came
  before its `remove`. Both orders are sentences.
- **The 5 minutes of the post mortem's "How it is known later"** (the label and no event of the
  session in that time) are counted by nothing.

## Prior art

Three searches of `knowledge.search?semantic=true` at 23:11 CEST: "agent asks orchestrating
session while running label", "issue-watch prints labelled event", "request from running agent
not seen". The first and third answered the post mortem first (score 1). The second answered
`doc:cloud-brain-tracker-trigger-rules` first (0.705): its `WAKE` line is for a wait of the
watch's own token, which the post mortem had read and set aside (its "questions of the body", 2).
Used: the post mortem, and `records/os-1-owner-label.md` for the form of the filter's tests.
