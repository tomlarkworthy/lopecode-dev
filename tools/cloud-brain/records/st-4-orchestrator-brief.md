# st-4-orchestrator-brief: `agents/orchestrator.md`, cut from `SKILL.md`; the step starts the judgment run

2026-10-13. Task 4 of `plan/cloud-brain-orchestrator-as-steps.md`, its design part 3, item 5. A brief, a
local tool, tests, and a note "As built" in the spec. No seed, no deploy. Nothing of the issue loop runs
`loop.ts step` yet (the driver is `st-5`, the switch `st-7`).

**No judgment run was started with a model.** Every run of one below is a stand-in `agent.sh` that
prints a result line. So no line of the brief's own part has been followed by an agent, and what a
model does with the moved texts when it is not a session is not known.

Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the writer, an `Agent` of
a `claude` session in its sandbox, with the token `impl-139801`. `$W` is the worktree
`…/.claude/worktrees/bm-st-4-brief`.

## What changed

| File | Change |
|---|---|
| `.claude/skills/brain-maintenance/agents/orchestrator.md` | new: the brief of a judgment run. 9,862 bytes written for this task, then five texts of `SKILL.md` |
| `.claude/skills/brain-maintenance/SKILL.md` | the five texts are gone; a section "What is in `agents/orchestrator.md`" says where each is; seven lines that named one now name the brief |
| `tools/cloud-brain/loop.ts` | `step` starts one judgment run for the entries it gives; `start --role orchestrator --token <t> --give "…"`; `ended` for that role; a verdict `left` in the status |
| `tests/tools/orchestrator-brief.test.ts` | new: 4 tests |
| `tests/tools/loop-step.test.ts` | 4 tests more (27), and the expectations of the tests of health, `review`, `round`, `round` at 3 `rework` moves, `needs-owner`, `start` and `spec`, `awaiting-approval` and the digest, which a judgment run's start changed |
| five tests of `tests/tools` that read a moved section in `SKILL.md` | read it in the brief: `never-list-three-reductions`, `owner-decisions-written-dense`, `pm-2-brief-and-procedure`, `post-mortem-actions-prefer-guards`, `os-2-order-and-pool` |
| `agents/implementer/post-mortem.md`, `tools/cloud-brain/issue-stats.ts` (a comment), `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` | one line each that named `SKILL.md`, "A post mortem" |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 3, "As built (`st-4-orchestrator-brief`…)" |

Sizes, `wc -c` after the last change: `SKILL.md` 97,993 bytes (112,596 before, `git show <the commit
before>:… | wc -c`), `agents/orchestrator.md` 26,226.

## What was moved

`grep -n '^## '` of the brief, its last five headings, with the bytes each text had in `SKILL.md` (printed
by the script that made the cut):

| Heading in the brief | Was in `SKILL.md` | Bytes |
|---|---|---|
| "A quick win" | the section | 2,628 |
| "A post mortem" | the section | 7,574 |
| "Triage" | the section | 4,435 |
| "The `decompose` row" | step 3, the second cell of the row `decompose`, whole | 1,056 |
| "A round at 3 `rework` moves" | step 3, the row of an issue sent back, from "Do not, and instead comment" to the cell's end | 612 |

The three sections are in the order `SKILL.md` had them: "Triage" names "A post mortem" as "above". In the
first commit of this task they stood with "Triage" first; the second put them in order.

**Held by a test that reads two commits.** `tests/tools/orchestrator-brief.test.ts`, "moved and not
rewritten": each of the five texts, as the commit that added the brief has it, is found once in `SKILL.md`
of that commit's parent and not in `SKILL.md` of that commit, each section is the parent's section whole,
and the lines of the parent that the commit lacks, the five texts apart, are seven lines, each named by
its start. It reads `git log --diff-filter=A` and skips with a `skipped:` line where that finds no commit.
That it can fail: two commits made with `git commit-tree`, each the first commit with one word of a
moved text changed ("A duplicate" to "A copy" in "Triage"; "the one before found" to "the last found" in
the judgment), read through `ORCHESTRATOR_BRIEF_COMMIT=<sha>`: 3 pass, 1 fail for each. The worktree
was not touched by either.

## What differs from the spec, and what was read into it

Each is in the spec's part 3 now, under "As built".

- **"The comment for the owner" is no section of `SKILL.md`.** The spec lists six things to move; five
  were found as a section or a row. The form of such a comment is `rules.md`, "What the owner is asked
  to decide". The sentences that send to it are in "Triage", which moved. Step 7 ("Tell the user", with
  "A spec put to him") was left: the spec's part 5 says "Step 7 of `SKILL.md` is a session's, when he
  asks". Nothing was moved under that name. The other reading, to move "A spec put to him", was not
  taken: a judgment run is given no issue at `awaiting-approval`.
- **Four rows a judgment run needs were not moved**: `promote`, `look` (with "Anything else"), `answer`
  (the row labeled `needs-owner`) and `asks`. The spec does not name them. The brief names each by its
  first cell and gives the `grep` that prints the one line. `grep -c -F` of each of the five first
  cells in `SKILL.md`: 1, which the test holds. The cost: a run reads `SKILL.md` for those entries, a
  line of 182 to 2,799 bytes each (`grep -F '<the cell>' | wc -c`), and the moved texts name steps of a file it is told not to read whole.
- **`dead` and the cluster not healthy had no text to move.** The brief has a section for each, written
  from the row of the spec's table.
- **The step makes the token and writes the comments; `start` does the rest.** The comments name the
  token, so it is made first. A start that then fails leaves comments that name a run with no event,
  which `judged` reads as a run that runs, for ever. So the step writes a `cost` event `stopped` for it
  and ends the token: the entry is given once more, and after a second failed start it is under "The
  judgment run died twice". The cost: two failures of the machine (no worktree, origin not reached)
  use up both gives of an entry, and a session has to take it from the status.
- **A verdict `left` is in `status.md`**, with its first line. The spec's part 5 has "`status.md` lists
  each [act with what is his] that is due"; nothing built that list. This is how a judgment run says one
  is due, and the brief gives the word that one use: an entry a run decides to leave gets no verdict and
  is under "Judged and left as it was". The spec has `left` "with the reason" and no more. It is listed
  while the entry is in the queue as it was.
- **One judgment run a machine** is read from the files of `runs/`. A judgment run another machine
  started is not seen here, as for every run (`st-3`, "Two machines").

## The tests

`cd $W && bun test --timeout=30000 ./tests/tools/orchestrator-brief.test.ts`: 4 pass, 0 fail, 63 expect()
calls. `… ./tests/tools/loop-step.test.ts`: 27 pass, 0 fail, 220 expect() calls, 63.9 s (`time`), at 10:13
CEST after the rebase on `origin/main` that brought in 10 files, none of them of this change.
`$W/tests/tools/suite.sh`, 10:14:18 to 10:16:20 CEST, after the last change to a file a test reads: 1164
pass, 0 fail, 120 files, 115.7 s, no `skipped:` line; `uptime`'s first number before it was 6.35.

Without the change, each then put back (`git diff --stat` after: nothing but the file being edited):

```
SKILL.md of the commit before, and no brief        orchestrator-brief: 1 pass, 3 fail
loop.ts of the commit before                       loop-step: 0 pass, 1 fail (the file does not load)
no test of a judgment run that runs                loop-step: 26 pass, 1 fail
a failed start is not written `stopped`            loop-step: 26 pass, 1 fail
```

The first run of the whole suite after the cut (10:04:31 CEST) had 6 fail in 5 files: the tests that read
"Triage", "A post mortem" or the row `decompose` in `SKILL.md`. Each now reads the brief for that text and
`SKILL.md` for the rest. `pm-2-brief-and-procedure` and `post-mortem-actions-prefer-guards` take `SKILL=<file>`
for another copy; they take `ORCHESTRATOR=<file>` as well now, and with a `SKILL.md` of before this task the
brief is that same file.

What the four new tests of `loop-step.test.ts` hold, with the real `start` and `ended` against the stand-in
tracker, `worktree.sh`, `brain.ts` and `agent.sh`:

- Two entries of a step are one run's: one `agent-token orch judgment:<issue>`, a comment on each issue
  `given <do> at <at> to <token>, its run on <issue>` written before the run's `running` event, which is
  on the first entry's issue with the role `orchestrator` and round 1; the worktree `orch-<host>`; the
  prompt, read from what the stand-in `agent.sh` was given, line for line.
- While it runs, a new entry is in `skipped` and has no comment, in a step and in a dry step.
- It returns: `done`, its token ended, `--leave`, the report in the journal of that issue. The two
  entries, left with no verdict, are under "Judged and left as it was" and are not given again.
- A verdict `left: …` is under "What a session with the owner is asked to do".
- A start that failed: the `stopped` event, the revoke, the second give, then "died twice". No token made:
  no comment, the entry in `skipped`.
- `start --role orchestrator` by hand: exit 2 with no `--token` or no `--give`; exit 1 and the token ended
  when another token is in the worktree; with no issue, a file and no event, the report in `_judgment.md`;
  exit 3 for a second beside one that runs.

## One dry step on cb4

`LOOP_TOKEN=impl-139801 bun tools/cloud-brain/loop.ts step --dry` in `$W`, 10:09:51 to 10:10:33 CEST (`date`
around it), with the real tools:

```
exit 0, stderr 0 bytes
{"seq":6374,"dry":true,"health":{"ok":true},"acts":[…3…],"given":[],"skipped":[…2…]}
```

The seq of `queue?limit=1` before it was 6372; `sync?after=6372` after it had 3 events, none by
`impl-139801`. The queue had no entry of a row a model decides at that read, so `given` was empty and no
judgment run was named: **the new path was not entered on cb4.** The status had the five parts of the
judgment, each "Nothing.".

## The comment of the orchestrating session on this issue (event 5877)

It asks the task that first starts writers with `WORK` to name a stand-in for a tab, and to say of each
tool such a process has with nothing asked whether a writer needs it.

- This task starts no writer. The one process it adds is the judgment run, started with `WORK` and so
  with no MCP server and no tab tool. The brief gives it no use for one: an entry is decided from the
  record and the checkout, and a quick win is "no seed built and no deploy".
- Of Workflow, RemoteTrigger, the Cron tools, WebFetch and WebSearch: the brief tells a judgment run to
  use none. `Agent` and `Task` it is told not to call: it starts no agent. Nothing refuses a call: the
  process has the tools (`st-1b`), and the brief's line is all that holds it.
- Whether a writer needs each, and the stand-in for a writer's tab, are left to `st-5-driver`: the first
  step that is not dry is the first to start a writer as a process.

## Not built, not tried

- **A judgment run with a model**, and so every line of the brief's own part.
- **A step that is not dry, on cb4.** It would start agents on the issues of the loop that runs there.
- **The worktree `bm-orch-<host>` with a session in it.** A session that orchestrates commits in that
  worktree (`SKILL.md`, step 1). `worktree.sh --fresh orch-<host> --for <the run's token>` then exits 4,
  the start fails, and the entry is used up as above. In the test the stand-in exits 4; the real script
  was not run for this name. From the switch on no session orchestrates beside the driver.
- **A quick win by a judgment run**: its `start` from `open`, its landing from `bm-orch-<host>`, and what
  the step does with its round when it is sent back. The brief says the last was read in the code
  (`resume`, "A dead writer") and not run.
- **The journal of a run on several issues.** The report is appended to the journal of the issue the
  run's event is on, and not to those of its other entries.
- **A run for a cluster that is not healthy, at every such step.** One is started at each step that finds
  it so and no judgment run running, with no bound. The driver makes such a step once in 1,800 s (`st-5`).
  The test has two such steps and two starts.
- **Two branches of the step's give that no test enters.** A `given` comment answered `duplicate: true`
  (two steps at once gave the entry): the entry is in `skipped`, and when it is the first entry no run is
  started and the token is ended. And a `stopped` event that is refused after a failed start: the comment
  then names a run with no event, the entry reads as one whose run runs at every later step, and no line
  of the status names it. The act of that step has `refused` in `steps.jsonl`.
- **The Brain's search by a judgment run.** The brief does not name it: `rules.md`, "Searching what the
  Brain knows", gives `loop-knowledge` to a writer and a spec writer.
- **`ended` when the `cost` event of a judgment run is refused**: exit 1 and "run it again", as for every
  role. Not entered by a test of this task.
- **The round after 1,000 judgment runs on one issue** (the service's limit of a round) is not handled.
- **The other texts that name a moved section as `SKILL.md`'s** were not changed: `agents/spec.md` line 109
  names the row `decompose`, which is still a row and now names the brief; the specs under `plan/` and the
  records name what was so when they were written. `SKILL.md` says that such a name means the brief.
- **`tests/tools/timings.json`** was left as it is: the new test file is not in it.
