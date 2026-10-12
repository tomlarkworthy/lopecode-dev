# cm-5-the-loop-writes-the-event

Task 5 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610), its requirement R7: the loop writes what a run cost as a `cost` event and reads the
event, and no tool or brief parses a comment's body for a cost. `SKILL.md` step 5 and the rework
section, `tools/cloud-brain/issue-stats.ts`, four test files, and one run of `cost-events.ts --post`
on cb4. No seed changed and nothing was deployed. Committed in the worktree at 2026-10-12 03:29:52
+0200 (`git log -1 --format=%ci`, before the rebase onto `main`); the commit is a ref of the submit.

## What changed

**`SKILL.md`, step 5.** The orchestrator calls `issue.cost` where it wrote a comment. The two
examples are calls, `issue-as.sh <your token> cost '{…}'`, with the key `cost/<id>/<role>/<round>`.
What differs from the comment's line, each because the service refuses the other form:

| The comment | The call |
|---|---|
| `"tokens"` | `"context"` |
| `"resumed":true`, `"light":true`, or neither | `"how"`: `resumed`, `light`, `fresh` |
| a missing `tokens` or `seconds` left out | both required; an Agent result that lacks one has 0, said in the journal |
| a usage found later: a second comment | the whole run sent again under `cost/<id>/<role>/<round>/2`; the tracker writes `replaced` |
| `"rounds":2` for a run in which the writer took a round itself (os-4) | no such field |

The other lines of `SKILL.md` that spoke of a `cost` comment or line now speak of the event or the
run: "A token for each agent" (three), the row "A spec sent back", the light reviewer's paragraph
of step 4, and the rework section (step 1 reads `runs?id=<id>&role=implementer` and takes the
highest `round`; a spec writer's and a digest writer's round the same way with their role). Two
dated mentions of comments by their seq are left: "cost comment 1003" and "`cost` comments 926, 997
and 1015". They name comments that are in the record.

**`issue-stats.ts`.** `costs` is made from the events of type `cost`: for each issue, role and
round, the last one in the record read. The sum of `statements only` is of `context`. The
`try { } catch {}` is gone with the parse. The printed line still says `tokens`, and
`(no cost comment naming its event)` now reads `(no cost event naming its event)`.

**As-built notes** in five specs, at the sentence the change made untrue:
`cloud-brain-run-cost-is-part-of-the-issue-model.md` (two), `cloud-brain-loop-order-of-service.md`
(three, for `rounds`), `cloud-brain-record-checked-by-review-alone.md`,
`cloud-brain-record-names-token-not-agent.md`, `cloud-brain-paper-summarizer-persona.md`.

## The choices, and what decided each

Line 2 of `philosophy.md` for each: the side that is smaller and easier to undo.

- **A run of two rounds is one event with no field for the count.** `issue.cost` refuses a field
  it does not list. On cb4, 2026-10-12 03:24 CEST, with `rounds` added to a body that is otherwise
  taken:
  ```
  {"error":"InvalidRequest","message":"rounds: not a field of issue.cost, which are role, round, how, outcome, seconds, context, tools, event, of, agent, session, token, usage, usd, backfilled"} [400]
  ```
  The other side is a field in `issuesLimits.cost` and a deploy of `brain-x-issues`, which this
  task does not have. The run has `round` the first of the two and `event` the last submit.
  `SKILL.md` says how such a run is told from the record (the submit its `event` names is the
  second after the `start`, with a `rework` between). The spec of os-4 said it would write
  `"rounds"` "in whichever form is current when it lands". No run of two rounds was in the record
  at event 3358: `cost-events.ts` leaves out a comment with a field it does not carry, and it left
  out none of 389.
- **A missing `seconds` or count of tokens is sent as 0.** The service requires both. The other
  side is no event for that run, which leaves it out of `issue.get`'s totals and `issue.runs`.
  Each of the 389 comments had both, so no run has needed this. The smallest in the record at
  event 3376 are `context` 38,719 and `seconds` 48 (389 `cost` events), so a 0 is told from a
  measured figure today.
- **`issue-stats.ts` takes the last event of a run and does not read `replaced`.** The tracker's
  row keeps the same one (`issueApply`, `brain-issues.ojs` line 453). With `--until` the record is
  cut first, so the run in force is the one that stood at that event.
- **The printed line keeps the word `tokens`.** An oversight entry compares the line with the one
  before it. The header of the tool says what the number is.

## What was run on cb4

All with `issue-as.sh impl-b53276` from the main checkout, 2026-10-12, times from `date` and the
events' `at`.

**`cost-events.ts --post` once more.** Six comments had been written since task 4's post
(3344, 3345, 3350 to 3353). Entered as events 3369 to 3374, `at` 03:25:14 to 03:25:16 CEST:

```
checked with issueAct of .claude/worktrees/bm-cm-5-the-loop-writes-the-event/cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js: 6 taken, 0 refused
at event 3368, 12 events hidden to impl-b53276; 389 cost comments: 383 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 6 with a usage, 3 with a usd, 3 fresh, 0 resumed, 3 light; 6 to enter
posted 6 of 6
```

and the dry run after it, exit 0:

```
at event 3374, 12 events hidden to impl-b53276; 389 cost comments: 389 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 0 with a usage, 0 with a usd, 0 fresh, 0 resumed, 0 light; 0 to enter
```

`verify?guards=true` after it: `{"ok":true,"seq":3374,"head":"da34805e…","checked":3374,"guards":true}`.

A first run, with `--check cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js` of the main
checkout, sent nothing: `0 taken, 6 refused`, each `refused by issueAct: …: guard`. That file is
of 2026-10-11 08:20 (`ls -la`), 182,923 bytes, and has no `"cost"` in it (`grep -c`: 0); the
worktree's copy, read from cb4 when the worktree was made, is 359,589 bytes. The main checkout's
`deploy/` is as old as its last `sync.ts`. The overseer opened
`cost-events-test-reads-stale-deploy` at event 3368 while this ran.

**The orchestrator that was running wrote those six comments, and may write more.** Their
`by.holder` is `secret:orch-d97e0e`. That session read `SKILL.md` before this landing. Until it reads step 5 again its runs are comments; the tool passes
a comment over when a `cost` event of that run with no `of` is there already, and enters it
otherwise. `bun tools/cloud-brain/cost-events.ts --token NAME` says how many wait. A writer whose
run is still a comment has no run in `issue.runs`, and the rework section then spawns where it
could have sent the round: the tool is run with `--post` before a round is sent, until the
orchestrator has read step 5 again.

**The rework section's read.** `runs?id=cm-4-enter-the-runs-again&role=implementer` answered one
run with `"agent":"a8654e1bb30e786ae"`, `"session":"f501a8e8-…"` and `"token":"impl-b645a6"`
(event 3372). `runs?role=spec-writer&limit=1` answered `total.runs` 36.

**Every run.** `runs?limit=500` at event 3383: 389 runs, `more: false`, each with `of`, 100 with
`backfilled`.

**`issue-stats.ts`, the tool before against the tool after, over cb4's record at event 3376.**
A script of the session (not kept) read `issue.sync` once and gave the events to `report` of the
main checkout's tool (comments) and of the worktree's (events):

```
the report of the record as it is, the same from both: true {"reviews":3,"verdicts":{"pass":3},"round":{"summed":0,"tokens":0,"leftOut":[]}}
```

The record has three marked reviews and all are `pass`, so no round after one is summed there.
With the mark put before the body of every review, so that the round after each of the 72
`changes` is looked for:

```
from comments: {"reviews":225,"verdicts":{"pass":153,"changes":72},"round":{"summed":29,"tokens":7753899,"leftOut":43}}
from events:   {"reviews":225,"verdicts":{"pass":153,"changes":72},"round":{"summed":29,"tokens":7753899,"leftOut":43}}
the same: true
```

`leftOut` is printed as its length; the two lists are the same (`the same` compares them whole).

**Three bodies the service refuses**, each 400 and nothing written (no event of 3359 to 3383 has
the role `probe` the three were sent with; `sync?after=3358`): the one with `rounds` above; one with no `context`
(`context: a whole number, 0 or more`); one with `"agent":null` (`agent: text, 1 to 100
characters`). `issue-as.sh` exits 0 on each: the answer is what says it was refused.

**R7's grep**, in the worktree after the last edit:

```
$ grep -cE 'cost \\?\{|cost-usage' .claude/skills/brain-maintenance/SKILL.md tools/cloud-brain/issue-stats.ts tools/cloud-brain/brain-feedback.ojs
.claude/skills/brain-maintenance/SKILL.md:0
tools/cloud-brain/issue-stats.ts:0
tools/cloud-brain/brain-feedback.ojs:5
```

Before: 4, 1 and 5. The five of `brain-feedback.ojs` are the line that leaves the old comments out
of a note and its test, as the spec has them.

## Tests

Each count is from the command beside it, run in the worktree after the last edit of a test or the
tool.

| Command | Result |
|---|---|
| `bun test ./tests/tools/issue-stats.test.ts ./tests/tools/rework-resumes-the-implementer.test.ts` (R7's row of the spec) | 35 pass, 0 fail |
| the same with `./tests/tools/issue-wait.test.ts ./tests/tools/briefs-name-the-prompts-token.test.ts` | 62 pass, 0 fail, 380 `expect()` calls |
| `bun test ./tests/tools` | 469 pass, 1 skip, 0 fail, 470 tests across 50 files |

Before the change `bun test ./tests/tools` gave 464 pass, 1 skip, 0 fail in the same worktree.
At the landing the worktree was rebased onto `main` at `3b221e0f`, which had the commits of two other writers
(`lock-sh-default-token-r4`, `overseer-md-lacks-order-of-service-reads`, which changed `SKILL.md`
too, with no conflict); `bun test ./tests/tools` there, at 2026-10-12 03:40 CEST (`date`), gave
474 pass, 1 skip, 0 fail, 475 tests across 51 files, and R7's grep 0 and 0.
No line beginning `skipped:` was printed by the last; which test is the one skip was not looked
for.

What the tests hold:

- `issue-stats.test.ts`: the fixtures of `statements only` are the nine `cost` events cb4 has for
  the two issues, at their seqs, without `agent`, `session` and `usage`. Three tests are new: a run
  written as a comment is not read, and a comment that does not parse beside the events is no
  error; of two events of one issue, role and round the later stands, `--until` before it gives the
  earlier figure, another issue's or another round's event replaces nothing, and a later event with
  no `event` leaves the review out; the tool's text has no match of R7's pattern.
- `rework-resumes-the-implementer.test.ts`: the examples are parsed from the calls. Each has its
  key, the six required fields and no field outside the list of `issuesLimits.cost`, which the
  test reads from the seed; `issueAct` of `cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js`
  takes both and refuses each with `rounds` or `tokens` added (that half is skipped with a line in
  a checkout that lacks the file, or whose copy is from before `issue.cost`: the main checkout's was,
  above); R7's pattern matches no line of `SKILL.md` or `issue-stats.ts`;
  the rework section names the read.
- `issue-wait.test.ts` and `briefs-name-the-prompts-token.test.ts`: the sentence on a run of two
  rounds, and the examples' `token`, in the new form.

With the main checkout's copy of `brain-issues.js` (2026-10-11) put in the worktree's `deploy/`,
`bun test ./tests/tools/rework-resumes-the-implementer.test.ts` gave 11 pass, 0 fail and the line
`skipped: … is from before issue.cost`; the fresh copy was put back before the counts above.

**The tests fail without the change.** The new fixtures against `issue-stats.ts` as `main` had it
(`git stash -- tools/cloud-brain/issue-stats.ts`): 17 pass, 7 fail of 24. The two files that read
`SKILL.md`, against `SKILL.md` as `main` had it: 18 pass, 6 fail of 24.
`briefs-name-the-prompts-token.test.ts` failed 1 of 14 against the new `SKILL.md` before it was
changed; that is how it was found.

## Not tried

- A call of `issue.cost` made by an orchestrator from step 5 as written. The six events of this
  task were written by `cost-events.ts`, and the examples were given to `issueAct`, not sent.
- A run of two rounds: none is in the record, so the rule that tells one from the moves was not
  run on one.
- A correction on cb4 (a second event of one run, with `replaced`). `issue-stats.ts` has it in a
  test; the record has none (0 of 389 `cost` events have `replaced`).
- A run sent with `seconds` or `context` 0.
- A rework round sent from the run read with `runs?id=&role=implementer`: the read was made, no
  round was sent.
- `issue-stats.ts` run as a command. Before the landing only its `report` was called, by the
  script; the run from the main checkout after the landing is in the issue's comment.
- The reviewer's brief as the Brain serves it was not read for a mention of the cost comment. The
  main checkout's `cloud-brain-dev/`, with its `brain/roles/` and without `deploy/`, was:
  `grep -rn -E 'cost \{|cost comment|cost line|cost-usage' --include='*.md' --include='*.sh' --include='*.ts'`
  printed no line.
