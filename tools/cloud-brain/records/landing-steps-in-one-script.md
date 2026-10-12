# The landing with no deploy, its comment and its submit are one command (`landing-steps-in-one-script`)

The issue, measured 2026-10-12 from `issue.runs`: "About 15 of an implementer's 46 tool calls are
bookkeeping, not the work: per run `issue-as.sh` 5.1 calls, `lock.sh` 4.1, `git` 3.9, `worktree.sh` 2.6",
each a request that reads the whole context again. Asked: "one command in `tools/cloud-brain/` that a
writer runs once its change is committed in its worktree." Round 1, by a writer of the issue loop, token
`impl-f9a7c7`, on 2026-10-13; its `start` is event 5297. A new local tool, a test file, and the
implementer's brief. No seed, no deploy.

## What changed

- **`tools/cloud-brain/land.sh`**, new. Its header has each step and each exit. In order: a read of the
  issue, the take of the landing lock, `worktree.sh --rebase`, each `--test` command, the renew,
  `git push origin HEAD:main`, the comment, the submit with one `commit` ref for each pushed commit, the
  release. A step that fails ends the run: the lock is released when the run holds it, stdout is that
  step's output, stderr one line that names the step and what stands.
- **`tests/tools/land.test.ts`**, new: the script against a rig (below).
- **`.claude/skills/brain-maintenance/agents/implementer.md`**, step 10: a landing with no deploy is the
  command, with what each exit means for the writer. The five lines stay under it as what the command
  runs and as the landing by hand; `tests/tools/worktree.test.ts` runs them as written. Step 12 says the
  command has written the comment and the submit.

## What was decided, and the other side

| Choice | Taken | The other side, and its cost |
|---|---|---|
| A landing with a deploy | Not in the tool. A commit that changes `tools/cloud-brain/*.ojs` is refused before the lock (exit 64), so that a seed is not landed undeployed by the short path. | The build, the backup, the deploy lock, `apply`, `probation` and `confirm`, `seen.json` and the `lopebooks` pointer in the same script. The brief says of that path "an `apply` from a worktree was not run when this was written"; a script of it would be untested where a mistake deploys. It is the larger share of the saving the issue estimates, and is not made. |
| Where the tests run | Under the lock, after the rebase: the commits tested are the commits pushed. The brief asks for the change's own test files there. | Before the take, which holds the lock for less, and lands commits that were tested on an older `origin/main` when another writer landed between. The issue's order is "takes the landing lock, merges, runs the tests". The whole suite took 196 s, 434 s and 528 s here on 2026-10-13 (below), a third to most of the lock's 600 s, so the brief names the files and not the suite. |
| A submit that would be refused | Read first: the issue is `in-progress` and its last `start` is the token's, or nothing is sent. | Found at the submit, after the push, as a 403. |
| The comment | `--comment @file`, the file's bytes as the body, written after the push and before the submit. | Left to the writer as a call of its own: one request more a run, and the body as JSON in a shell argument. |
| A failure after the push | Exit 5, and stderr has the key and the refs to submit by hand. The push is not undone. | Nothing else was weighed: a push to `main` is not taken back by a tool. |

## The test

`tests/tools/land.test.ts`: every case makes a bare repository for origin, a main checkout with the four
tools committed, a worktree by the real `worktree.sh`, and a stand-in in the test's process for
`issue.get`, `issue.lock`, `issue.move` and `issue.comment`. `lock.sh`, `worktree.sh` and `issue-as.sh`
are the real ones. The stand-in is not the tracker's code.

```
cd $W && bun test --timeout=30000 ./tests/tools/land.test.ts
 16 pass
 0 fail
Ran 16 tests across 1 file. [27.37s]
```

Run three times one after another on 2026-10-13, between 00:17 and 00:24 CEST (two reads of `date`): 16 pass each. Before that the case of a
held lock failed once of two runs with `--wait 1` (one take was sent, two wanted: the clock is read in
whole seconds); it waits 3 s now. Before the change there is no `land.sh`, and the rig fails at the copy.

The two cases the issue names: "the success path" (origin's `main` is the worktree's `HEAD` on top of
another machine's landing; the calls are `get`, take, renew, `move`, release; the move's refs are the
two pushed commits) and "a failing test" (origin's `main` unchanged, no `move`, the calls take and
release, stdout `2 fail\nto-stderr`). The other 13 cases of the script: a lock held for the whole wait, a lock
let go during it, a second round with a comment, another token's issue and one not `in-progress`,
`--no-submit`, a submit refused 403, a reason with a time ahead of the clock, a key used before, a push
refused once, a lock lost before the renew, a rebase conflict, the arguments and worktrees refused, and
nothing ahead. The last case reads the brief.

The whole suite, after the last edit of the tool, the test and the brief (the record alone was mended
after it), on 2026-10-13, ended 00:48 CEST with `uptime` at 9.32:

```
cd $W && tests/tools/suite.sh
(fail) check: a summarized entry passes; not summarized, restored, refused twice, and a search that answers another first each fail it; --except names one [30002.79ms]
(fail) put --stale: an entry with another line is put; one with no text or with a text that is no string is left and named (sd-2: it may hold a summary) and put by name; a missing cut doc is not counted unmarked [30007.58ms]
(fail) put --stale puts a stale short doc beside an unmarked one; put <name> and put --all pick as before and count the same way [30004.99ms]
(fail) i1546: a doc whose name gives no id the service takes is listed as badname, fails --check and is left out of every put [30002.88ms]
 894 pass
 4 fail
Ran 898 tests across 92 files. [528.39s]
```

The four fails are each at the 30 s timeout, in `knowledge-docs.test.ts` and `summarize-papers.test.ts`.
Neither file names `implementer.md` (`grep -c`, 0 and 0) and this change touches neither. The two alone,
straight after: `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts ./tests/tools/summarize-papers.test.ts`,
61 pass, 0 fail, 300 s, `uptime` 5.25 at its end. So the count of this round is 894 pass and 4 fail of
898 in the suite's own run, and the 4 pass when their two files run with no other beside them.

Two runs of the suite before it, the same day. At 00:32 CEST, before the brief's last edit: 896 pass, 2
fail of 898, 434 s, `uptime` 10.54, the two fails at the timeout in the same two files. And the first,
before the case of the time ahead was added and before the rebase of the first landing brought 14 files
in: 878 pass, 0 fail, 90 files, 196 s, `uptime` 7.62.

## Not done, not tried

- **The issue's second measure**, "over the 30 first-round implementer runs after the change, the median
  of `usage.requests` is 32 or less (39 today)": not measurable by this round. The runs do not exist yet.
- **A landing with a deploy**: as the table has it. A writer of a seed makes the same calls as before.
- `agents/spec.md` (step 6 or near it, the line with `push origin HEAD:main`) and `agents/overseer.md`
  give the same five lines to a spec writer and the overseer. `land.sh … --no-submit` would make them;
  neither brief was changed, and neither role was run with it.
- A quick win's landing: its key in the brief is `impl/<short>/submit`, the tool's is
  `impl/<short>/submit-1`. Not run.
- The take that got no answer and had arrived (exit 2 of `lock.sh`, then a renew that says yours): the
  line is in the script and no case enters it.
- The release that gets no answer (exit 7): no case.
- A run cut by the Bash timeout or a signal while it holds the lock: the script has a trap that
  releases; not run.
- `--wait 0`: not run.

## The first landing made with it

The commit of the tool, the test and the brief was landed by the tool itself on cb4, with `--no-submit`,
from this worktree. `date` before it read 00:24:19 CEST and after it 00:25:02, on 2026-10-13:

```
$W/tools/cloud-brain/land.sh impl-f9a7c7 landing-steps-in-one-script --no-submit --test "bun test --timeout=30000 ./tests/tools/land.test.ts 2>&1 | tail -4"
land taken by landing-steps-in-one-script at 2026-10-13 00:24:19 CEST, until 2026-10-13 00:34:19 CEST
pushed 736f34857e8ab9c6c9dc9bc93330442b1ed03c54 to origin/main; 14 file(s) came in at the rebase; 1 test command(s) passed
land released by landing-steps-in-one-script at 2026-10-13 00:25:00 CEST (taken 2026-10-13 00:24:19 CEST)
docs (cb4): nothing to put
exit=0
```

One call where the brief's five lines are five, and the lock held for 41 s, of which the test file is
about 27. The test command of that call ends in `| tail -4`, which was a mistake of the writer: the
exit the tool read was `tail`'s, so a failed test would have passed. The header and the brief now say so.

The landing of this record is the second, with `--comment` and the submit. Its lines are not here,
since the record is in the commit it pushes; the writer's report has them.
