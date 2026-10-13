# overseer-runs-too-often: an overseer looks at one ended issue in 10, alone

2026-10-13. A part of `orchestrator-as-steps`. `tools/cloud-brain/loop.ts`, the overseer's brief, the lines of
`SKILL.md`, of the orchestrator's brief and of five specs that the change made untrue, and nine test files: a
local tool and docs, no seed, no deploy. Written by the implementer `impl-d6fd7a` in the worktree
`bm-orchestrator-as-steps`. Times are CEST, from `date`, an event's `at`, `git reflog` or `steps.jsonl`.

## What the owner asked

The issue was opened for him by a session he was in (`out-5bc2ed`) on "it seems like a lot of overseers" and
"lets jsut run them less often? Or reduce the volume of information they consume?". Its body asks for the count
of ended issues to go from 3 to 10. Two comments of that session then replace that with his design, and this
change is built from them, not from the body:

Comment 6719:

> I think we need to move to them investigating 1 in 10 tasks randomly instead of everything. And looking at that task in isolation, no tracing it up the chain type of thing.

Comment 6722:

> no that put back rule is silly now because that implies we have to figure out what went wrong, which is not a post mortem action not an overseer action. I don't want the auto post mortem. We want overssers to be quality control and process improvers so random task sampling of an isolated work unit is the correc tmodel.

## Measured before

The five runs the issue names, from `runs/<token>.json` and `runs/<token>.result.json` of the main checkout's
`.emitted/issue-loop` (read 2026-10-13 about 17:00; `usd`, `context` and `ms` are the result's own fields):

```
token        after  usd    context  seconds
over-608b7a  6231   9.01   249176   854
over-0c3236  6231   5.56   144734   551
over-0ed9dd  6590   5.95   159952   602
over-e1faeb  6590   1.96   148070   467
over-c04fd6  6666   5.66   150372   856
```

What one run read, from the transcript of `over-c04fd6` (session `00f2a685-…`, the `tool_result` blocks of its
`.jsonl`, sizes in characters): 21 tool results, 177,232 characters. The largest:

```
26,760  the events of sync since 6666, printed from a file
21,306  a script over the briefs and oversight.md, for its edits
20,317  agents/overseer.md, read whole
18,819  the journal of one issue, cat, with the suite's lines
17,096  a second pass over the saved sync
13,618  the end of another issue's journal
12,712  issue-stats.ts, 150 lines
10,040  rules.md and the end of oversight.md
```

So of a context of 150,372 at its end, the tool results are 177,232 characters; the rest is what every run of
`agent.sh` starts with and what the model wrote. I did not split that remainder. The sweep's own reads (sync
twice, `issue-stats.ts`, two journals of the issues ended since) are 89,005 of the 177,232, the sum of five of
the rows above. This is one run of the five; the other four transcripts were not read.

## Cause 1 of the issue: the second pair was the unmended code

The issue asks whether the main checkout had c4271763 (`overseer-started-again-before-pull`) when `over-e1faeb`
was started at 15:56:30 for the same `after` as `over-0ed9dd`. Comment 6719 says it had. It had not:

```
git -C <root> merge-base --is-ancestor c4271763 e1ec4266   -> exit 1
git -C <root> merge-base --is-ancestor c4271763 271ae092   -> exit 0
git -C <root> merge-base --is-ancestor c4271763 ba2adb32   -> exit 0
git -C <root> reflog --date=iso
  e1ec4266 HEAD@{2026-10-13 15:50:59}: pull --ff-only     the main checkout, without the mend
  ba2adb32 HEAD@{2026-10-13 16:21:28}: pull --ff-only     the main checkout, with it
git -C <root> reflog show origin/main --date=iso
  271ae092 @{2026-10-13 15:52:28}: update by push         the mend reaches origin/main
  1b2c470b @{2026-10-13 15:54:56}: update by push         over-0ed9dd's entry, events 6590 to 6637
```

The pull of 15:50:59 brought e1ec4266, which was pushed at 15:40:14, before the mend's commit of 15:43:20. So
the step of 15:56:30 ran `loop.ts` as it stood before the mend, read the main checkout's `oversight.md` alone
(heading 6590) and started a second for it, as the first pair was started. The one overseer started after the
pull of 16:21:28, `over-c04fd6` at 16:22:13, has an `after` of its own. That is one start, and it shows no
defect of the mend; it does not show the mend holds either. This change removes the heading from the rule, so
the question does not arise again in this form.

## What changed

**The rule of a step** (`loop.ts`, the end of `step`). An ending is a move to `done` or `rejected`, or the label
`needs-owner`. A step reads the last 500 events (`sync?after=` the record's head less `OVERSEE_WINDOW`), takes
the endings for which `drawn(id, seq)` holds, the oldest first, and for the first that needs one starts an
overseer on that issue: `loop.ts start <id> --role overseer --at <seq>`.

```
drawn(id, seq) = sha256(`${id}:${seq}`), its first 4 bytes as a number, % 10 === 0
```

A step keeps no state, so what says an ending was looked at is the record: an overseer's `cost` event on the
issue after the ending event. The files of `runs/` with that `id` and `drawn` are read beside it, for a start
whose event was not written. For one ending: a run that is `done` ends it; one that runs stops the row for that
step (`an overseer of it runs`); 2 that died start no third, and `status.md` says so; a run whose result says
its process was not logged in is not counted. A live `over-` token of any machine stops the start, as before:
overseers share the worktree `bm-over-<host>` and the briefs they edit. The machine's loop starts none, as before.

Gone from the step: the count of 3 ended issues, the third `rework`, the heading of `oversight.md`
(`lastOversight`, `lastHeading`), and the entry `pm`, by which a `send-back`, an `owner-reject` of a passed
issue or a `revert` of his was given to a judgment run to declare a post mortem.

**`start` and `ended`.** An overseer takes an issue: `start --role overseer` with none is exit 2. Its token's
note is the issue, its `cost` events are on the issue, its prompt's third and fourth lines are
`Issue: <id>, which ended at event <seq>` and `Journal: <the journal file of that issue>`, and `ended` appends
its report to that file. `_oversight.md` is written no more. The worktree is still the host's.

**The brief** (`agents/overseer.md`, 19,431 bytes before and 14,057 after, `wc -c`). It says what an overseer
is for in his words, what it reads (the issue in its short form, its journal, the commits of its refs, its
record) and what it does not (the parent, the spec, the siblings, `sync`, the journal's directory, earlier
entries of `oversight.md`). The sections "Feedback tickets, and gathering" and "Feedback that is due" are gone,
and of "Measure first" the one command kept is `approver.ts check`. The table "What you may do", its limits,
the landing by push and the put of the reviewer's brief are as they were, but for three lines: the search
before it files says what a list leaves out, its 3 issues are the ones its token opened, with no `sync`, and
it makes no move.

**Other texts.** `SKILL.md`: the usage line, the row of "where oversight got to", the journal, the token's
note, the prompt of step 4, the cost line of step 5, step 6, the row for `open` feedback, and two sentences that
gave the overseer a comparison and the gathering. `agents/orchestrator.md`: the row `pm` is gone, "Who declares
one" has the owner alone with the old bullet kept as it stood until today, and a triage leaves gathering to a
`project`. Dated notes, with the old text kept, in `plan/cloud-brain-orchestrator-as-steps.md` (six places),
`plan/cloud-brain-post-mortems-declared-and-kept.md` (two), `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md`,
`plan/cloud-brain-issues.md` and `plan/cloud-brain-lean-reviewer-persona.md`. A comment of `issue-stats.ts`.

## What was dropped

Comment 6719 asks what becomes of what the sweep also did. Each of these was done by an overseer at each
oversight, needs a read of more than one issue, and is done by no agent after this change. None was given
another home here: each needs a decision of where it goes, and `overseer-sweep-jobs-have-no-home` asks it.

| What | Where it was | Now |
|---|---|---|
| `issue-stats.ts`, four lines in the entry, and the median stay at `in-review` after os-2 | "Measure first" | Not run by the loop. The tool is unchanged |
| Every open `feedback` issue read, duplicates and causes linked, a `project` opened for three that share a cause | "Feedback tickets, and gathering" | Nobody. `philosophy.md` still says "the overseer reads them together" |
| Feedback that is due, closed | "Feedback that is due"; `SKILL.md`, the row for `open` feedback | Nobody. `issue-stats.ts` still prints the list. The owner's are the orchestrator's, as before |
| A comment on a note of the owner's, of what a finished tie did for his ask | the same section | Nobody |
| The sign of a machine that carries no more writers, added to `SKILL.md` step 2 | "Measure first" | Nobody |
| A writer's lines under "For the overseer" in its comment, of a text it may not edit | `agents/implementer/submit-and-wait.md` | Read for 1 issue in 10 |
| The owner's moves that undo reviewed work, given for a post mortem | `loop.ts`, the entry `pm` | Removed on his "I don't want the auto post mortem". He declares one through a session |
| The heading of `oversight.md` as the mark of where oversight got to | `loop.ts`, `lastOversight` | Removed. The mark is the `cost` event on the issue |

## Readings taken, which are mine

- **`approver.ts check` stays in the overseer's run.** Comment 6719 asks that each thing the sweep did have a
  home that costs no model run, or be dropped. `rules.md`, "The approver", says the overseer runs the check at
  each oversight, and no agent edits `rules.md`. The check is one command whose answer is a line, so it adds
  no read to the run, and keeping it leaves that rule true (`philosophy.md`, line 2: the smaller side, easier
  to undo). It now runs at 1 ending in 10 where it ran at every third. The alternative not built: a step for
  the clock runs it and puts its last line in `status.md`, which needs a change to that line of `rules.md`.
- **That his "I don't want the auto post mortem" ends the entry `pm`** is the reading of the session he said
  it to (comment 6722). It is taken as written there, and the brief and the spec say whose reading it is.
- **The window is 500 events**, one page of `sync` at its largest. An ending that leaves the window with no
  overseer started (the driver stopped for a day, a live `over-` token for hours) is not looked at.
- **One start a step**, and the oldest drawn ending first.
- **An issue whose id is over 51 characters is not looked at.** `start` refuses a run whose longest key
  (`cost/<id>/overseer/1/<token>/resumed-9999999/end`) is over the 100 the tracker keeps, so the step skips
  such an ending and goes to the next, where it would else ask for the same refused start at each step.
  `agents/implementer/tracker-calls.md` says an id is 40 characters at most at `open`, so this is for an id
  from before that limit; I did not look for one in the record.
- **The draw is not weighted**: a quick win and a three-round task are as likely.
- **Every ending is in the draw**, as every one was in the old count: a digest the step rejected as covered by a
  later one, and an issue rejected at triage, among them. An overseer drawn for one has little to read.
- **The 3 issues and 2 edits of one oversight are unchanged.** With fewer oversights the loop files and edits
  less in all; whether the limits should move was not asked and not changed.

## Seen on cb4

A dry step for an event with the changed tool, from the worktree, against the tracker (17:16:21, the record at
6732, `LOOP_TOKEN=impl-d6fd7a bun tools/cloud-brain/loop.ts step --dry --for event`, exit 0):

```
acts  start rules-md-over-one-tool-read reviewer
      start writer-started-on-an-owners-act-task reviewer
      start sd-4-the-rest-and-the-release-line overseer
```

The same 500 events read with `issue-as.sh … "sync?after=6232&limit=500"` and `drawn` imported from the tool:
events 6233 to 6732, 35 endings, 3 drawn (`sd-4-the-rest-and-the-release-line` at 6351,
`approver-policy-mark-takes-every-route` at 6509, `git-status-answers-in-a-worktree` at 6634). The old rule
asked for 3 ended issues an overseer, so those 35 endings were at most 11 overseers. The dry step named the
first of the 3 as having no overseer's run; the other two were not looked at for one. If none has, the
driver's first steps after this lands start 3 overseers, one at a time.

A `cost` event is written on an issue that is `done`: `tracker-limits-in-no-brief` moved to `done` at 6692 and
has a reviewer's `cost` event at 6693 (`get?id=tracker-limits-in-no-brief`). No overseer's `cost` event was
written on cb4 by me.

## Tests

Written before the rule changed, with only `drawn` added to `loop.ts`, and run: 36 pass, 3 fail
(`bun test --timeout=30000 ./tests/tools/loop-step.test.ts`), the three being the two new tests of the draw's
row (`start overseer` where `start i0 overseer` was expected; `[]` where a start was) and the changed test of
the judgment's entries (`pm f`, `pm g` skipped where none was expected).

After the change:

```
bun test --timeout=30000 ./tests/tools/loop.test.ts ./tests/tools/loop-step.test.ts     60 pass, 0 fail
tests/tools/suite.sh                                                                    1272 pass, 0 fail, 131 files
```

Both were run on the tree rebased on `origin/main` at 17:19:54 (`git reflog`), after the last change to a file they read. The
test of the long id was run once with its check switched off and failed: the step named the start of that issue.

Test files changed, and why:

- `loop-step.test.ts`: four new tests (the draw is about 1 in 10 and the same at each call; the row; an id
  too long for the run's key; the window) in the place of two (3 ended or a third `rework`; the heading read from `origin/main`). The fixtures
  of three more end issues until one is drawn, where they ended three. The test of the judgment's entries
  expects no `pm`.
- `loop.test.ts`: one test of `start` and `ended` for an overseer on an issue in the place of two (on no issue;
  `after` from `origin/main`), and the test of the scratch directory starts its overseer on an issue.
- `ac-5-prose-names-the-two-shapes.test.ts`: three tests of the brief's `sync` and its list of projects are one
  test, that the brief reads no `sync` and what it says of the list it reads before it files.
- `feedback-closed-or-promoted.test.ts`: the test of "Feedback that is due" is a test that the section is gone
  and the brief says so; the row of `SKILL.md` is held to "nobody".
- `orchestrator-brief.test.ts`, `pm-2-brief-and-procedure.test.ts`, `rules-md-the-approver.test.ts`: the words
  of the changed lines.
- Removed: `overseer-md-order-of-service-reads.test.ts` (5 tests of "Measure first") and
  `overseer-says-unanswered-without-a-read.test.ts` (4 tests of a paragraph of "Feedback that is due"). The
  text they held left the brief.

## Not tried

- **An overseer's run by the new brief.** The after of the issue's measurement, the context at the end of such
  a run, is `context` of `runs/<token>.result.json` of the first one the driver starts. No run was made.
- `loop.ts start <id> --role overseer` against cb4: the rig's stand-in tracker took its `cost` events, cb4 was
  not asked.
- A step that is not dry, on cb4.
- The machine's loop (no state file) beyond the rig's test that it skips the start.
- An issue with two endings that are both drawn, and an overseer of another machine that runs: the code reads
  both, no test enters either.
- Whether 1 in 10 finds what the sweep found. Nothing here measures that.
