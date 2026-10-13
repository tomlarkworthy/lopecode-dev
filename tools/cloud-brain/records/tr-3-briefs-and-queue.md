# tr-3-briefs-and-queue

Task 3 of `plan/cloud-brain-tracker-trigger-rules.md` (approved for the owner at event 4903 of
`tracker-trigger-rules`), part 3 of its design, the half that tr-2 left: the queue says who listens,
the three briefs name the wait, and the old form of the tool is gone. Written 2026-10-13 by
`impl-a472ec`; the `start` move is event 5902 (06:47 CEST). One seed, `brain-issues.ojs`, so a deploy
of `brain-x-issues`; `major` by the spec.

Commands below are run in the worktree `bm-tr-3-briefs`.

## What changed

| File | What |
|---|---|
| `tools/cloud-brain/brain-issues.ojs` | `issueQueue` puts `waiter: { actor, holder, until }` on an entry of `queue` or `waiting`; the prose "The queue" has the field in the two shapes and an item for it, and the row `issue.queue` of the method table a sentence; one test cell, `test_issues_queue_names_the_starter_that_waits` |
| `tools/cloud-brain/issue-wait.sh` | The form with no flag (`<token> <id> <after seq> [seconds]`, the reads of `sync?after=`) and `--filter` are taken out: 226 lines before, 167 after (`wc -l`). A call with no flag is exit 64 with nothing sent and one line on stderr |
| `.claude/skills/brain-maintenance/agents/implementer.md`, step 13 | The line with `--left in-review`; the fifth run with `--last`; `--work` before the one round, `--no-round` on the wait after it, `--remove` at 3 `rework` moves; exit 5 |
| `…/agents/implementer/submit-and-wait.md`, step 13 | The same, with each answer of the tool. The cases "one line" and "a second line" are gone |
| `…/agents/implementer/resumed-round.md` | The review of a round taken at step 13 is the tool's second line, and `--work` is the round's first act |
| `…/agents/spec.md`, step 7 and "A resumed round" | The wait after `submit-spec`, `--left spec-review`, with the same bounds |
| `…/SKILL.md`, steps 2 and 3, "A rework round goes to the agent that wrote the change" | "A writer that waits" reads `waiter`; the shape of the queue's answer; the rows `round`, `work` and "A spec sent back" have the case with `waiter` |
| `tests/tools/issue-wait.test.ts` | 11 tests of the old form out, 1 of its refusal in; the test of step 13 rewritten; 2 new, of `spec.md` and of steps 2 and 3 |
| `plan/cloud-brain-tracker-trigger-rules.md` | Two notes "As built" in part 3 |
| `plan/cloud-brain-bookkeeping-in-the-tracker.md`, `plan/cloud-brain-loop-order-of-service.md`, `plan/cloud-brain-answers-cut-and-not-said.md` | One note each, where a sentence said what the queue's entry has or what the tool reads |

## `waiter`

```
queue:   [{ id, do, kind, state, title, labels, for, since, late, hold, waiter }]
waiting: [{ id, kind, state, why, on, until, waiter }]
```

The field is the three of the wait: `actor`, `holder` (`secret:` and the token's name) and `until`.
It is there while the wait is not taken off and its `until` is after the `now` of the read. Whether
the `when` is true is not asked: a listener's wait is due from the reviewer's move until the writer
replaces it or takes it off, and through that stretch the round is the listener's. No row of the two
tables and no order changes; an entry with no such wait has no such field, so every `toEqual` of the
seed's other queue tests passes unchanged.

**Where it differs from the spec.** The spec: "when the actor that started the issue
(`issue.by.start`, or `issue.by.spec`) has a live wait on it". As built the starter is read by the
state: `by.start` at `in-progress` or `in-review`, `by.spec` at `spec` or `spec-review`, and an
entry at any other state has no `waiter`. The first run of the test said why:

```
- Expected  [ "start", undefined ]
+ Received  [ "start", { "actor": "delegation:d7", "holder": "secret:impl-0a1b2c", "until": 1791868535595 } ]
```

After the orchestrator's `back` of a dead writer the row still has that writer in `by.start` (a
`back` does not clear it; the next `start` replaces it), and its wait lives up to 60 minutes. The
`start` entry of an issue the orchestrator had just taken from an agent named that agent as
listening. The other reading, the spec's words as written, costs nothing in `SKILL.md` today (no row
of `start` reads `waiter`), and was not taken because the field would then be untrue of the one case
the orchestrator has already judged. Taken by line 2 of `philosophy.md`: the smaller claim, undone
by deleting one object literal.

## The tool

```
$ issue-wait.sh impl-x mine 7
issue-wait.sh: the wait with no flag was taken out (tr-3-briefs-and-queue), and nothing was sent. After your submit: issue-wait.sh impl-x mine 7 --left in-review
exit=64
$ issue-wait.sh spec-x mine 7 20
… After your submit: issue-wait.sh spec-x mine 7 --left spec-review 20
exit=64
$ issue-wait.sh --filter mine 7
usage: issue-wait.sh <token> <id> <after seq> (--when CEL | --left STATE) …
exit=64
```

The line on stderr is for a writer spawned before this change: it has the old step 13 in its
context, and its worktree gets this tool at its landing's rebase. The spec has no such line; it says
the old arguments "are then removed". The state named is `spec-review` for a token whose name
begins `spec-` and `in-review` for any other.

## The briefs

`agents/implementer.md` is held to 20,000 characters (`tests/tools/implementer-brief-core.test.ts`)
and the file was 19,900 bytes (`wc -c`). With the change it is 19,996 characters and 20,006 bytes
(`python3 -c 'print(len(open(…).read()))'`, `wc -c`), so step 13 there has the line, the exits and the three flags, and the page has the rest. Two things in it are
not in the spec:

- **"Run it only after your submit"**, on the page and in `spec.md`. From the report of tr-2, which
  the orchestrating session put on this issue (comment 5861): `--left` on an issue the caller is at
  work on is due at once and reads as a round sent back.
- **One sentence of the old inference stays in step 2 of `SKILL.md`**, for an agent spawned before
  the change: it may wait with no wait in the record, so an entry of its round has no `waiter`
  while it runs. The spec has step 2 lose the inference whole.

The watch was not changed. It prints `QUEUE round <id> …` for a round whose entry has `waiter` as
for one that has none, and the orchestrator reads the entry to tell them apart.

## Tests

`test_issues_queue_names_the_starter_that_waits`, through `issue.wait` and `issue.queue` of the
service in the module's rig, with the waits `issue-wait.sh` sends in its order. The two R6 rows of
the spec's "How each requirement is known to be met" are the second to the fifth item here:

- a review with nobody listening has no field; with the writer's wait it has `waiter`, and the
  entry is otherwise the one it was; token b and the owner are answered the same;
- after the `rework` the entry is a `round` with `waiter`; asked of `issueQueue` a millisecond
  before the wait's `until` it has it, and at `until` none;
- the wait of `--work` takes the first one's place, the round's submit makes a `review` with
  `waiter`, the wait after it another;
- a second `rework`, then the `remove` the tool sends with `--no-round`: a `round` with no field;
- an issue with 3 `rework` moves (counted from the rig's events), the starter's wait, then the
  `remove` of `--remove`: none;
- another actor's wait alone makes none, and beside the starter's is not the one read;
- a named token's `holder`; an entry of `waiting` (`work`) has the field;
- after a `back`, and after another actor's `start`, the first starter's live wait makes none;
- a project: the spec writer's wait at `spec-review`, and the `round` after a `respec`;
- a row with no `waits` and one with no `by` are read as having none; `issue.verify?guards=true`
  is `ok`.

**Without the change.** The two spreads of `waiter(i)` taken out of `issueQueue`, the test left in,
built to another file and run with `test.ts --with`: `49 passed, 1 failed, 17 need a browser`, the
failure being the second expectation of the test (`"review"`, expected the waiter, received
`undefined`). The tool and the four texts as they were at the commit before, with the tests of this
change (`ISSUE_WAIT_SH=`, `SKILL=`, `SPEC_BRIEF=`, `IMPLEMENTER=`, `IMPLEMENTER_CORE=`):
`14 pass, 4 fail`, the four being the test of the refusal (which runs the old tool's 240 s wait
into the test's timeout) and the three of the texts.

Counts, each from a run after the last edit of what it reads, 2026-10-13:

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the module of the build>` | `50 passed, 0 failed, 17 need a browser` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `"tests":67,"passed":67,"failed":[]`, twice: before the rebase, and after it with `--emit` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` (main checkout, 06:58 CEST) | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` brain-shell and brain-issues; `tests` 67 in each run |
| `bun test --timeout=30000 ./tests/tools/issue-wait.test.ts` | `18 pass, 0 fail`, 219 expects |
| the same with `implementer-brief-core`, `issue-ask`, `pm-agent-request-not-seen-fly-idle` and `issue-watch` (the files that read the tool or these texts), 07:03 CEST | `82 pass, 0 fail` in 5 files |
| `tests/tools/suite.sh` | 07:04:16 to 07:06:01 CEST, after the rebase and with this file written: `1066 pass, 0 fail` in 109 files, 98.34 s; no line `skipped:` |

Each run of `verify-run.ts` lists what ran as `brain-shell: 9, brain-issues: 66` and one test of a
module `@test/verify-…`, with `tests: 67`. Why one of the 67 is under another module's name was not
looked at.

The rebase before the landing brought in one file, `.claude/skills/brain-maintenance/oversight.md`,
which nothing here is built from.

## Not tried

- **A real round with these waits.** No writer or spec writer has run step 13 or step 7 as they now
  read, apart from this task's own wait, which the comment of its submit reports. The sequence
  (a wait, `--work`, a submit, a wait with `--no-round`, a second `changes`) ran in the module's rig
  and, for the tool's half, against tr-2's stand-in.
- **An orchestrating session reading `waiter`.** The rows of step 3 are text; no pass has been run
  with them.
- **A writer that has the old brief in its context meeting the refusal.** The line it is given was
  run by the test, which then runs the line it names. Whether a running writer acts on it was not seen.
- **A running process of the old form.** A writer whose `issue-wait.sh` was started before its
  worktree was rebased runs the old code to its end and has no wait in the record: the sentence
  kept in step 2 is for it.
- **`waiter` on an issue of the security workflow**, or of a workflow with other names for its
  states: the field is read by the four state names, as the queue's rows are.
- **Two actors in `by.start` and `by.spec` of one issue.** The state picks one; no issue of the rig
  has both.
- **The page's panel.** It was not looked at for `waiter`, as the spec says of `waits`.
- **The `QUEUE` line of the watch for an entry with `waiter`**: not changed, above.
- **What the reviewer's brief on the Brain says of a writer's wait**: not read.
