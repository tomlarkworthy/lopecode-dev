# fb-batch-loop-tools: ten feedback entries about the loop's local tools, as one batch

2026-10-13, writer `impl-895c7e`, in the worktree `bm-fb-batch-loop-tools`. No seed, no deploy. The issue was
opened by a session the owner is in, on his words "please look at all our feedbacks … grouped by service
perhaps so they can be batched effeciently?". Its triage (comment 6917, a judgment run) read each entry and
gave the list this record follows: five to close as already mended, four to mend, one to take out.

## The ten entries

| # | Entry | What was done |
|---|---|---|
| 1 | `seen-agent-sh-changed-under-a-run` | Closed, mended before: `agent-sh-read-whole-before-run` and `wt-1-land-the-agent-sh-block`, both `done`. |
| 2 | `seen-main-checkout-edited-outside-lock` | Closed, mended before: `wt-3-land-by-push` and `wt-5-docs`, both `done`. |
| 3 | `seen-overseer-due-by-its-own-filings` | Closed, mended before: `overseer-runs-too-often`, `done`. |
| 4 | `seen-view-suite-reads-linked-notebook` | Closed, mended before: `view-isolated-from-main-notebook` and `suite-tests-read-the-live-brief`, both `done`. |
| 5 | `seen-worktree-left-after-landing` | Closed, mended before: `wt-2-worktree-sh` and `wt-3-land-by-push`. No worktree of an ended issue stood when I read the list; none was removed. |
| 6 | `seen-approver-spawned-for-a-sure-leave` | Mended: a step starts no approver for an issue whose commits change the approver's own files, and writes a comment and `needs-owner`. |
| 7 | `seen-fly-6-ready-before-its-7-days` | Mended: a hold on `fly-6-after-seven-days`, and a sentence in `SKILL.md`. |
| 8 | `seen-fresh-exit-3-writes-no-occupant` | Mended: `worktree.sh --occupy`, run by `loop.ts start`; the two briefs say it. |
| 9 | `seen-st6-papers-test-fails-in-suite` | Mended as far as seeing it: the helper `kept` fails with what the tool printed. No cause is known. |
| 10 | `overseer-sweep-jobs-have-no-home` | Taken out: the project `overseer-sweep-jobs-get-homes`. |

## Rows 1 to 5: what I read before each close

The triage named the issue that mended each. I read the state of those issues (`issue-as.sh get?id=…`, each
`done`; `worktree-per-topic` itself is `building`) and one line of the tree at c58fb733 for four of them:

```
grep -c notebookOf tests/tools/needs.ts                          -> 0          (row 4, item 1)
grep -n 'OVERSEE_ONE_IN = ' tools/cloud-brain/loop.ts            -> 267: OVERSEE_ONE_IN = 10, OVERSEE_WINDOW = 500   (row 3)
grep -n -F 'Write no tracked file of `lopecode-dev` in the main checkout' rules.md -> line 331   (row 2)
grep -n 'whole before' cloud-brain-dev/agent.sh                  -> 38: "bash reads a block whole before it runs it"  (row 1)
```

Items 2 and 3 of row 4 (a put of 2026-10-12, and `suite-tests-read-the-live-brief`) are taken from the triage
and the state of that issue; I ran nothing for them.

**Row 5, the list against the states.** `tools/cloud-brain/worktree.sh --list` at 21:08:57 CEST (`date`) printed
20 lines (`wc -l`); the triage counted 30 directories at 18:58. For each name I read the state of its issue:

- 7 are topics of a project at `building`: `approver-persona.2`, `bookkeeping-in-the-tracker`,
  `orchestrator-as-steps`, `record-names-token-not-agent`, `record-names-token-not-agent.2`,
  `worker-machine-on-fly`, `worktree-per-topic`. Each `clean`, `occupant=-`.
- 5 are of a task at `in-progress` with its writer as occupant: the five `fb-batch-*`, this one among them.
- 4 are a host's: `orch-Mac`, `orch-MacBook-Pro-3`, `over-Mac`, `over-MacBook-Pro-3`.
- 4 have a name that is no issue's id (`get?id=` answered no issue) and an occupant: `never-page-up`
  (`impl-4f8cb6`, `ahead=1`), `spec-fly-exec`, `spec-page-mods`, `spec-rules-checked` (a `spec-…` token each).
  Whose they are I did not find out; each has an occupant, so none is one "nobody is in".

None is the worktree of an issue that is `done`, `closed` or `rejected`. I removed none: the brief of a writer
says it removes none, and the driver held the lock `loop` at that time (`lock.sh show loop`: held by
`orchestrator-Mac` until 21:17:29), so its steps do the removal.

## Row 6: no approver for the approver's own files

`approver.ts` refuses to approve an issue of which a commit touches the approver's brief, tool or test, a
policy file, or a policy cell of the tracker's seed (`rules.md`, "The approver", "Its own files"). The entry
and its comments name nine runs that could only leave for that reason or for a spec with letters, each about
110,000 tokens of context. `approver.ts facts` printed the marks before each run began.

**What a step did.** The row of `loop.ts` for `waiting`, `owner`, at `awaiting-approval` called `facts` with a
git that answered no files (`{ files: () => null, parents: () => [] }`), so no mark was read, and it began an
approver whenever the round had no verdict and no approver had left the issue.

**What it does now.** The row calls `facts` with the git of the main checkout (`gitOf(root)`, the function
`approver.ts` uses itself). `ownFiles(f)` is the files marked `approver` or `policy` of every ref of every
submit, each once. With one or more, the step starts no approver and makes the act `no-approver`:

1. a comment keyed `orch/<id>/no-approver-<n>`, `<n>` the count of moves to `awaiting-approval`:

   > No approver read this one. Its commits change files that are the approver's own or the tracker's policy,
   > and the approver's tool refuses to approve a change to those, so a run could only have left it to you. It
   > is built and reviewed (the passing review is event N). Your answer is your approve or your send-back.
   >
   > The files, as `approver.ts facts` marks them: [approver] .claude/skills/brain-maintenance/agents/approver.md.

2. the label `needs-owner`, keyed `orch/<id>/needs-owner-<n>`, the key `SKILL.md` already names for it.

At the next step the issue is labeled, and the row above this one takes it as the owner's. A comment that was
written and a label that was not are both sent again at the next step; the comment's key answers `duplicate`.

`approver.ts` is not changed: a landed change to it stops every approval until the owner installs a policy
that names its new blob.

**The comment is for the owner and is not in the whole form of `rules.md`, "What the owner is asked to
decide".** That form begins with what the project is for and what the thing is, in words a reader chooses. A
step has no model and writes neither. The text is modelled on comment 6457 of
`approver-policy-mark-takes-every-route`, which a session wrote in this case and he answered (6507). The
files stand in its last line, where that section allows one line of where the rest is. The other side was a
judgment run for each such issue to write the two sentences; that is a model run again, which the entry asks
to save.

**The leaves of a spec that puts letters are not taken**, as the triage has it: a program cannot read that a
spec asks him to choose.

**On seven records of cb4**, read with `issue-as.sh get?id=…` and the git of this worktree, between 21:08:57 and 21:17:36 CEST (the `date` of the command before it and of
the one after):

```
tr-4-held-read                          refs 6, with files 5   []
approver-policy-mark-takes-every-route  refs 9, with files 9   [approver] agents/approver.md; [policy] plan/cloud-brain-issues-policy-v6.json; [approver] tests/tools/approver.test.ts; [approver] tools/cloud-brain/approver.ts
bk-2-finish-by-the-service              refs 4, with files 3   [policy] tools/cloud-brain/brain-issues.ojs: issuesDefaultPolicy, issueAllowed, issueEvent, issuesApp (…), issuesLimits (…)
policy-v5-names-the-approver-as-it-is   refs 3, with files 3   [approver] agents/approver.md; [policy] plan/cloud-brain-issues-policy-v5.json
sd-4-the-rest-and-the-release-line      refs 3, with files 3   []
st-7-switch-and-texts                   refs 3, with files 3   []
fly-exec-for-blessed-services           refs 2, with files 2   []
```

Three of the entry's cases name files, as their verdicts did. `tr-4-held-read` names none today: its approver
left it on 2026-10-13 for the mark `[policy] brain-issues.ojs: issuesApp, issuesLimits`, and
`approver-policy-mark-takes-every-route` changed that mark the same day, so an approver of today would not be
stopped by it either. The two that were approved name none, and the spec with letters names none.

## Row 7: the 7 days of `fly-6-after-seven-days`

A step makes the move `ready` from the queue's entry and reads no comment. `fly-6-after-seven-days` was at
`triaged` with one link, `after fly-4b-first-run`, hold `null`, and its "7 days after" in a comment (read
21:08 CEST). `fly-4b-first-run` is `ready` and labeled `needs-owner`.

- **A hold on it**, the smaller side the triage chose over a rule of the queue that reads a time after a
  link: until 30 days from the call, the most a hold has, with the reason "7 days after `fly-4b-first-run` is
  done: at this hold's end, or when that issue is done, hold again to that day and 7". The call and its answer
  are in my comment on the issue. A hold whose time has come is a `look`, which a judgment run reads with
  that reason.
- **`SKILL.md`, step 3, the row `ready`**: the read of a `held:` comment is made in a pass by hand alone, and
  what an issue waits for beside its links is a hold or `needs-owner` before its last link ends.
- `ac-5-prose-names-the-two-shapes`, the fourth of that list, is `done`: nothing to hold.

Not mended: if `fly-4b-first-run` is done and nobody holds `fly-6` again to that day and 7, the hold ends at
its 30 days and the issue is looked at then, 23 days late and not early.

## Row 8: the occupant of a writer put in a worktree at exit 3

`worktree.sh --fresh <topic> --for <token>` is exit 3 for a worktree with unlanded work, before the lines
that write `bm-occupant`. `loop.ts start` (`place`) then puts the writer of that issue in it as it stands. So
that writer had no occupant written, and after its landing, clean and waiting for its review, a second
`--fresh … --for <another token>` answered 0.

**Not what the triage asked, and why.** It asked that exit 3 write the occupant when `--for` is given.
`place` also meets exit 3 for another issue's work, takes the next name, and says on that issue "nothing there
was touched"; a session by hand does the same. With the occupant written at exit 3, each of those would leave
its token in a worktree it did not take, and every later `--fresh` there would be exit 4 until that token
ended. So exit 3 writes nothing, as before, and a call of its own writes the occupant when the writer is put
there:

```
worktree.sh --occupy <name> <token>    exit 0, prints the path; exit 4, another token is in it; exit 1, no such worktree
```

It fetches nothing and touches no file of the worktree. An occupant whose token is gone is taken over, by the
same read `--fresh` makes. `place` runs it on the branch "exit 3 and the work is this issue's"; when it is not
exit 0, no writer is started and the start is exit 1 with the line of `worktree.sh`.

Texts: the header of `worktree.sh` (and `usage`, which prints through the line it printed through before);
`SKILL.md` step 4, "Exit 3", for a pass by hand; `agents/implementer/start.md` step 4, whose sentence "the
orchestrator made it at `origin/main` and wrote your token in it as its occupant" now has both cases;
`plan/cloud-brain-worktree-per-topic.md`, "One agent in a worktree", a note "As built".

## Row 9: the papers test that failed twice in the suite

Two cases on 2026-10-13, each `expect(r.code).toBe(0)` in the helper `kept` of
`tests/tools/summarize-papers.test.ts`, each passing alone and in the next run. The second report: "What the
tool printed at its exit 1 was not kept". `kept` now throws an error with the command, the exit, stdout and
stderr. No cause is guessed and nothing else of the file is changed. I did not meet the fail: see the runs
below.

## Row 10: the five jobs of the overseer's sweep

Opened as the project `overseer-sweep-jobs-get-homes`, with the entry's five items and its own split of where
each could go, linked `related` to the entry and to this issue. Its spec is what says where each goes. Two
sentences of `philosophy.md` say what no agent does now; that file is the owner's, and the project's body
says so.

## Tests

Each run in this worktree after the last edit of a file that is not this record, 2026-10-13. The six files
were run one after another, ended 21:45:52 CEST (`date`). The machine carried other writers' suites: `uptime`
gave load averages of 11 to 32 between 21:17 and 21:32, and the suite took 302.80 s where its header has 80 to
110 s.

| Command | Result |
|---|---|
| `bun test --timeout=60000 ./tests/tools/loop-step.test.ts` | 42 pass, 0 fail, 328 expect() calls |
| `bun test --timeout=60000 ./tests/tools/loop.test.ts` | 20 pass, 0 fail, 285 expect() calls |
| `bun test --timeout=60000 ./tests/tools/worktree.test.ts` | 45 pass, 0 fail, 440 expect() calls |
| `bun test --timeout=60000 ./tests/tools/summarize-papers.test.ts` | 34 pass, 0 fail, 296 expect() calls |
| `bun test --timeout=60000 ./tests/tools/fb-batch-loop-tools.test.ts` | 4 pass, 0 fail, 17 expect() calls |
| `bun test --timeout=60000 ./tests/tools/wt-5-docs.test.ts` | 9 pass, 0 fail, 52 expect() calls |
| `tests/tools/suite.sh`, ended 21:38:43 CEST | 1300 pass, 0 fail, 10695 expect() calls, 136 files, 302.80 s |

New: two tests in `loop-step.test.ts` (the row, on commits made in the rig's repository; `ownFiles` and the
text), one in `worktree.test.ts` (`--occupy`), one in `summarize-papers.test.ts` (`kept`), four in the new
`fb-batch-loop-tools.test.ts` (the texts), and lines added to one test of `loop.test.ts` (the start that
writes the occupant, and the start refused when `--occupy` is exit 4).

**A fail of the suite that was this change's.** The run before the one above, ended 21:32:46 CEST: 1299
pass, 1 fail, `each worktree.sh command the four docs name is one the tool's header has` of
`tests/tools/wt-5-docs.test.ts`, which read the header as lines 2 to 35 of `worktree.sh`; the four lines of
`--occupy` pushed `--remove` past line 35. The test now reads the lines `usage` prints, by the number in
`usage` itself. A first run of the suite, before those two, was stopped by the harness at its time limit with
no count.

**Each fails without its fix.** With the two lines of `loop.ts` put back as they were (`if (false)` for the
row; no call of `--occupy`): the row's test received `start a approver` and `start c approver` where it
expects `no-approver a` and `no-approver c`, and the start's test lacked `--occupy proj impl-000003`. With
`SKILL.md`, `start.md`, `worktree.sh` and `loop.ts` as `HEAD` has them: 0 pass, 4 fail of the texts' file, and
the `--occupy` test fails. With `kept` as it was: its test fails.

## Not tried

- **A step of the driver on cb4.** No step was run with this `loop.ts`, dry or not: the row was run in the
  rig of `loop-step.test.ts`, and `ownFiles` over seven real records. The first issue a step leaves without
  an approver is not yet.
- **A loop with no state file** (the machine's). The new lines stand before the line that leaves an approver
  to the laptop, so the machine's loop writes the comment and the label too; no test runs that case.
- **A comment that is refused.** Then no label is sent in that step; not run.
- **A commit of `cloud-brain-dev`** among the refs: `gitOf` reads it in `<root>/cloud-brain-dev`. Not in the
  new test.
- **An owner who takes `needs-owner` off and leaves the issue at `awaiting-approval`.** By the code the step
  sends both keys again, each answers `duplicate`, and no approver is started. Not run.
- **Two calls of `--occupy` at one moment.** The file is written with `noclobber`, as `--fresh` writes it; no
  test starts two.
- **`--occupy` under a real start.** `loop.test.ts` runs the start with a stand-in for `worktree.sh`, and
  `worktree.test.ts` runs the real script by itself. No writer has been put in a worktree at exit 3 since.
- **The cause of row 9.**
- **The hold's end.** That a judgment run holds `fly-6` again as the reason asks was not seen.
