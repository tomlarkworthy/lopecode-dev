# lk-3-lock-sh-over-the-cluster

2026-10-11. Task 3 of `plan/cloud-brain-locks-held-in-the-cluster.md` (approved at event 1453): `lock.sh` asks
cb4 for the landing lock and the deploy lock, and the briefs a writer may edit say so. A local tool, its test
file and five docs. No seed, no deploy. `rules.md` still names the directory; that is task 4, the owner's.

## What changed

- `tools/cloud-brain/lock.sh`, rewritten (189 lines, `wc -l`). `take`, `release` and `show` keep their arguments
  and exit codes; `renew` is new. Each is one `curl -s -m 30` to `issue.lock` or `issue.locks` of `brain-x-issues`.
  The exit code is read from the HTTP status by the spec's table. `grep -c "mkdir\|rmdir" tools/cloud-brain/lock.sh`: 0.
- `tests/tools/lock.test.ts`, rewritten against a stand-in the test starts (`Bun.serve`, the shapes of
  `records/lk-1-issue-lock-methods.md`): 23 tests.
- `agents/implementer.md` step 10, `agents/overseer.md`, `agents/spec.md` step 6, `SKILL.md` (step 1 and four
  other lines), and step 4 of `knowledge/changing-and-deploying-a-cloud-brain-worker.md`.

Not changed: `issue-as.sh`, as the spec says. The docs step bd-2 put after a release of `land` is kept as it was.

## Where it is not the spec's text, and the three notes of review 1414

| The spec, or the note | Built | Why |
|---|---|---|
| "Inside one run of `lock.sh take`, with or without `--wait`", the in-run renew; and exit 2 for a take that was not reached | A plain take asks once. Not reached is exit 2 and no renew is sent. The renew after a lost answer is inside `--wait` only | A plain take has no next attempt to be answered 409. The stderr of that exit 2 names `lock.sh renew <name> <who>`, and step 10 of the writer's brief says to run it before taking again |
| "sends `renew: true` once" | Once for each 409 that names the caller after an attempt of the run that got no answer. A 409 that names another holder forgets the lost attempt | Had the lost attempt taken the lock, the next answer would name the caller, not another |
| The pull of step 10 has a second refusal | The brief names both as stops: histories that have each a commit the other has not, and a file changed in the checkout that the pull brings in | Note of review 1414 |
| Two sessions under one role name on one machine | Said in `SKILL.md` step 1, where the role name is given: the first's take refuses the second's; a `renew` by either is answered as the holder's, and so is the renew `take --wait` sends | Note of review 1414. Not closed by this task |
| `show` for a name nobody holds | `<name> is not held` on stdout, as the script before; whose lock ended and when is on stderr, as the spec has it | The spec gives the stream for the second only |
| "the `curl` of the Brain's copy" in `lock.test.ts` | One test, the two counts of R3. With cb4 not answering it prints `skipped: …` and passes | `tests/tools/reviewer-brief-waits-on-show.test.ts` (lk-2) reads the same file and fails when cb4 does not answer |
| The token on curl's command line, as `issue-as.sh` has it | On curl's stdin (`-H @-`) | It is then in no process list. Not asked for |

Two things the script refuses that the spec does not name: a 200 whose body is not the service's answer is
exit 2 for `show` (no `locks` and `ended` lists) and for a take (no `held: true`), so a page served in the
service's place is read as neither "nobody holds it" nor a lock.

Under `--wait` a 409 that names the caller's own `who`, with no lost attempt before it in the run, is waited
on like any holder. An agent that takes `land` twice with `--wait` waits out its own 600 s and then takes over
its own lock. Not tried against cb4.

## Runs, the writer's own

In the worktree `bm-lk-3-lock-sh-over-the-cluster`, 2026-10-11, between 20:23:08 (the `at` of the start, event
1834) and 20:34:56 CEST (`date`), after the last change to the script, the test and the briefs.

- `bun test ./tests/tools/lock.test.ts`: 23 pass, 0 fail, 16.6 s. No `skipped` line: cb4 answered the last test.
- The same file on the script of `main` (`58096c2d`), `LOCK_SH=<root>/tools/cloud-brain/lock.sh bun test ./tests/tools/lock.test.ts`:
  6 pass, 17 fail. The 6 are the usage errors, the two cases of `--wait` with bad seconds, the kept `BRAIN_BASE`,
  the briefs and the Brain's copy. Before the briefs were edited the briefs test failed too, first on
  `agents/implementer.md`, the line with `.emitted/land.lock/holder`.
- `bun test ./tests/tools`: 288 pass, 0 fail, 33 files. `tests/tools/issue-lock-sql.test.ts` there reads the
  worktree's built notebook, made first with `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`.

The test runs the script with `TZ=UTC`: `bun test` reads the clock in UTC and the script printed CEST, which
failed 4 of the first run's time comparisons.

What the tests hold, by requirement of the spec:

- R3: after a take, a show and a release the state directory holds the token file and nothing else; the script
  has no `mkdir` or `rmdir`; the five briefs have no line with `land.lock` or `cb4.lock` and no code span that
  starts `mkdir`, `rmdir` or `rm -r` on a line that says lock.
- R4: with the stand-in's row past its `until`, `show` is exit 1 with the holder's name and the time on stderr; the
  next take prints `took over a's lock, which ended at …`; the first holder's `renew` and `release` are exit 1.
- R5: `take land b && echo landed; release land b` behind `a` prints no `landed`, exits 1, and `show` names `a`.
- R6: a closed port is exit 2 with `[000]` for all four commands and makes nothing; no token file is exit 2 with
  no call; a 500 and a 403 with no `holder` are exit 2; `take --wait 5` ends on that 403 after one call;
  `take --wait` over a 502 and then a take that is kept with its answer lost exits 0 after one renew.

## The script against cb4

From the worktree, with the main checkout's token file (the script finds it; the worktree's `.emitted` held four
build files and no token). The deploy lock's row was used, since the script takes `land` and `cb4` only and
every other writer was still on the directory. Whole, as printed:

```
Sun 11 Oct 2026 20:33:16 CEST
$ tools/cloud-brain/lock.sh take cb4 lk-3-lock-sh-over-the-cluster
cb4 taken by lk-3-lock-sh-over-the-cluster at 2026-10-11 20:33:16 CEST, until 2026-10-11 20:43:16 CEST
exit 0
$ tools/cloud-brain/lock.sh show cb4
cb4 is held by lk-3-lock-sh-over-the-cluster since 2026-10-11 20:33:16 CEST, until 2026-10-11 20:43:16 CEST
exit 0
$ tools/cloud-brain/lock.sh take cb4 lk-3-lock-sh-over-the-cluster
lock.sh: cb4 is held under your own name since 2026-10-11 20:33:16 CEST, until 2026-10-11 20:43:16 CEST. Not taken.
exit 1
$ tools/cloud-brain/lock.sh take cb4 someone-else
lock.sh: cb4 is held by lk-3-lock-sh-over-the-cluster since 2026-10-11 20:33:16 CEST, until 2026-10-11 20:43:16 CEST. Not taken.
exit 1
$ tools/cloud-brain/lock.sh renew cb4 lk-3-lock-sh-over-the-cluster
cb4 renewed by lk-3-lock-sh-over-the-cluster, until 2026-10-11 20:43:18 CEST (taken 2026-10-11 20:33:16 CEST)
exit 0
$ env LOCK_TOKEN=issues-reviewer-2 tools/cloud-brain/lock.sh release cb4 lk-3-lock-sh-over-the-cluster
lock.sh: cb4 is held under your name by another token; this call used issues-reviewer-2. Left where it is.
exit 1
$ env LOCK_TOKEN=issues-reviewer-2 tools/cloud-brain/lock.sh renew cb4 lk-3-lock-sh-over-the-cluster
lock.sh: cb4 is held under your name by another token; this call used issues-reviewer-2; not yours to renew. Nothing taken.
exit 1
$ tools/cloud-brain/lock.sh release cb4 someone-else
lock.sh: cb4 is held by lk-3-lock-sh-over-the-cluster since 2026-10-11 20:33:16 CEST, until 2026-10-11 20:43:18 CEST, not by someone-else. Left where it is.
exit 1
$ tools/cloud-brain/lock.sh release cb4 lk-3-lock-sh-over-the-cluster
cb4 released by lk-3-lock-sh-over-the-cluster at 2026-10-11 20:33:19 CEST (taken 2026-10-11 20:33:16 CEST)
exit 0
$ tools/cloud-brain/lock.sh show cb4
cb4 is not held
exit 1
$ tools/cloud-brain/lock.sh release cb4 lk-3-lock-sh-over-the-cluster
lock.sh: cb4 is not held; nothing released
exit 1
Sun 11 Oct 2026 20:33:20 CEST
```

Two of these lk-1's record lists as not probed on cb4: a renew that succeeds (the `until` moved from 20:43:16 to
20:43:18, 600 s from the renew), and a release from another token (exit 1, the lock stayed). Eleven commands in 4 s.

Before it, at 20:32, `show land` and `show cb4` as `issues-implementer-2`, and `show land` as
`issues-reviewer-2`, answered `… is not held`, exit 1, while the directory `land.lock` of the main checkout was
held by another writer (`dsv-3-dashboards`, by the script of `main`). The two locks did not know of each other
then, which is why this task lands under both.

## The landing

It is made as the spec's task 3 says, under the directory (the script of `main`, saved from
`git show main:tools/cloud-brain/lock.sh`) and under the cluster's `land` (the worktree's script), and it is
the first landing that takes `land` in the cluster. It happens after this file is committed, so its lines are
in the issue's comment and not here.

## Not tried

- Two machines. One checkout on one machine made every call above.
- A take whose answer is lost on the way from cb4. In the test the stand-in keeps the lock and answers 500.
- A real timeout: `curl -m 30` was not waited out. The closed port answers at once.
- `--wait` against cb4, and a wait behind a holder of 600 s.
- The `pull --ff-only` of step 10 with something to bring in, and either of its two refusals.
- A release or a renew that answers exit 1 in the middle of a landing, and the stops the brief gives for them.
- The overseer's and the orchestrator's commands as their briefs now have them, with `$(hostname -s)` in the
  name. `hostname -s` here gives `Mac`; a machine whose short name
  has another character would be a usage error, exit 2.
- A lock past its `until` read by this script on cb4. lk-1's probes read it with `issue-as.sh`; here it is the stand-in's.
- That a `lock.sh take land … --wait` of the old script, already running at the merge, goes on as the old
  script. The spec assumes so, and the landing looks for one with `pgrep` before it releases the directory.
- `force`: the owner's, and the script has no command for it.
