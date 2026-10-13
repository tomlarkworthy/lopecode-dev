# The notebook's backup is made after the apply has answered, and an unpushed backup is taken back (`backup-committed-before-apply-answers`)

The issue, filed by the overseer on 2026-10-12 (event 5485) from the feedback note
`seen-backup-kept-of-a-put-back-landing`: step 10 of the writer's brief had the build and
`notebook-backup.sh` before the deploy. On 2026-10-13 at 00:03:05 CEST the first apply of
`tr-1-wait-in-the-record` was put back (`tools/cloud-brain/records/tr-1-wait-in-the-record.md`, "The first
apply"). The day's backup was by then committed in the main checkout's `lopebooks` (`21117b9c`, never
pushed), of a build no Worker ran. The writer undid it with `git reset --mixed origin/main` there, a write
of the main checkout that `rules.md` does not list, because the brief had no step for it. Asked: "a guard
before a sentence", one of two, "which, is the writer's to weigh".

Round 1, by a writer of the issue loop, token `impl-17014b`, on 2026-10-13; its `start` is event 5567.
A local tool, its test file, and four docs. No seed, no deploy.

## What changed

- **`.claude/skills/brain-maintenance/agents/implementer/landing.md`**, step 10. The order with a deploy
  is now: the renew, the deploy under the deploy lock, then the pull of `lopebooks`, `build.ts --out` and
  `notebook-backup.sh`, then the commit of `seen.json`. The build and the backup are for an apply that
  answered `verified`, or a version on `probation` that the writer confirmed. For an apply that is refused,
  answers `failing` or is put back the step says: no build into `lopebooks`, no backup, read
  `git -C <root>/lopebooks log origin/main..HEAD`, and undo a backup it prints with
  `notebook-backup.sh --take-back`, never with a `git reset` by hand.
- **`tools/cloud-brain/notebook-backup.sh`**. Before it reads the day of the last commit, a run undoes
  each commit at `HEAD` that is this tool's and that the branch's upstream does not have, and says
  `took back <sha>: …` on stderr. Its one line of stdout is then of the commit before: `committed` when a
  backup is due, `same` when the build is that commit's file. A commit is the tool's when its subject
  begins `cloud-brain: the notebook of ` and it changes no file but the notebook and its `.json`. The undo
  is `git reset --soft HEAD~1` and a `git reset` of those two paths, so what else is staged stays staged.
  `notebook-backup.sh --take-back` is that undo alone, with no build: it also puts the notebook back as the
  commit before has it, and prints `took back <sha>` or `nothing to take back`.
- **`tests/tools/notebook-backup.test.ts`**: seven tests more (below).
- **`.claude/skills/brain-maintenance/agents/implementer/deploy-put-back.md`**: one paragraph that names
  the step. **`knowledge/changing-and-deploying-a-cloud-brain-worker.md`**, step 7, and
  **`plan/cloud-brain-worktree-per-topic.md`**, part 1 step 3 (an "As built" note): the backup is after
  the apply.

## What was decided, and the other side

| Choice | Taken | The other side, and its cost |
|---|---|---|
| The order, or the tool | Both. The order alone meets "a landing whose apply is put back leaves `log origin/main..HEAD` empty", and is a sentence. The tool's undo is the guard: it holds when a writer follows the old order, or stops between the backup's commit and its push. | The tool alone: the commit of a build that never ran stays in the main checkout until the next landing that builds. The order alone: nothing holds it but the page. |
| What the next run does with an unpushed backup | Undoes it and decides again from the commit before, so the day's backup is of the build of this run. | Keeps it and answers `not due`: the case of the issue, "the day's backup would have stayed the build that never ran". Amends it: the same result when a backup is due, and a commit with a wrong day in its subject when the old one is of the day before. |
| Which commits are undone | Only the tool's own, by subject and by files, at `HEAD`, and only when the branch has an upstream that lacks them. | Everything ahead of the upstream, as the `git reset --mixed origin/main` of 2026-10-13 did: it would undo a commit somebody made by hand in the main checkout. |
| Whether the tool checks that the apply answered | No. The tool has the build and no record of the apply; `seen.json` moves on `deployed` and `probation` too (`brain.ts`, `STANDS`). | A check of cb4 from a shell script, with a token: a second place that reads what a Worker runs. |

`philosophy.md`, line 2 ("autonomously self healing") is why the tool undoes the commit itself and the
writer is not asked to; line 3 is why the step has a command for it.

## Tests

`cd $W && bun test --timeout=30000 ./tests/tools/notebook-backup.test.ts`: 19 pass, 0 fail (12 before
this change). The seven, each on repositories made in a temporary directory, six of them with a bare
repository as `origin`:

1. A backup committed and not pushed, then a second run of the same day with another build: `committed`,
   `took back <sha>` on stderr, the first commit is in no log, `HEAD~1` is `origin/main`.
2. The same, where the second build is the file `origin` has: `same`, and nothing ahead of `origin`.
3. `--take-back`: `took back <sha>`, nothing ahead, the notebook as the commit before has it, another
   staged file still staged, the `.json` the commit had added left untracked; a second call answers
   `nothing to take back`.
4. A backup that was pushed: the next run is `not due`, stderr empty, and `--take-back` finds nothing.
5. An unpushed commit with another subject, and one with the tool's subject and another file in it: both left.
6. A repository with no `origin`: `--take-back` finds nothing and the second run of a day is `not due`.
7. The brief: in step 10 the apply comes before the pull of `lopebooks`, that before the backup, that
   before the commit of `seen.json`; the step names `--take-back` and the put-back with no backup.

Run on the files of before, with the seven tests added and nothing else changed: 12 pass, 7 fail. Tests 4,
5 and 6 failed there only at their `--take-back` call, which the old tool answered with exit 1; their
`not due` lines held before the change as after.

The whole suite, `tests/tools/suite.sh`, after the last edit of the tool and the tests, ended 02:11:03
CEST on 2026-10-13: 978 pass, 0 fail, 99 files, no `skipped:` line.

One run outside the tests: `$W/tools/cloud-brain/notebook-backup.sh --take-back` on the main checkout's
`lopebooks` at about 02:09 CEST, where `git log origin/main..HEAD` printed no line: `nothing to take
back`, exit 0, and the log was empty after as before.

## Not tried

- A landing with a deploy in the new order. This change has no deploy, and no writer had landed one by
  the page as it now reads when this was written. Whether the 600 s of the landing lock, renewed before
  the apply, last through an apply, a `redistil`, a `saw` and then a build was not measured; the step has
  a second renew before the push, as before.
- An apply that is put back, met by a writer who follows the step.
- The undo in the real `lopebooks` with a commit to undo: only the call that found nothing. The hook of
  `lopebooks` runs on a commit and not on a reset; that was read, not seen there.
- That an apply answers `verified` in its own line was read in `tools/cloud-brain/brain.ts` (`STANDS`) and
  in `brain-deployer.ojs` (`state: "verified"`), not seen in a run of mine.
- A `HEAD` of `lopebooks` that is detached, or a branch with no upstream: the tool then undoes nothing,
  as in test 6, and says nothing of it.
- A merge commit with the tool's subject, and more than ten backup commits ahead (the loop stops at ten).
- The working file after a put-back that followed the old order: a run with a build writes over it;
  `--take-back` restores it. A writer who does neither leaves it as the build that never ran, uncommitted.

## For the overseer

`rules.md`, "Always", the item on the main checkout (line 231 at this commit): "writes the built notebook
there with `tools/cloud-brain/notebook-backup.sh`, which commits the file once a day; that commit is
pushed." The tool now also undoes a commit of its own there that was not pushed. A mend: after "once a
day", add "and undoes a backup commit of its own that was never pushed".
