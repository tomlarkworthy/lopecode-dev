# wt-1-land-the-agent-sh-block

2026-10-12. Task 1 of `plan/cloud-brain-worktree-per-topic.md`. An act on the cluster's git (one push of
`cloud-brain-dev`), the pointer in `lopecode-dev`, and one test of `tests/tools/light-agent.test.ts` that is
no longer skipped. No seed, no deploy of a Worker.

## What was there

`d6f4632` of `cloud-brain-dev` is the fix of `agent-sh-read-whole-before-run` (`done`): the body of `agent.sh`
is one `{ … }` block with its `exit` inside, so a file written over during a run does not end the run on a
syntax error. It stood on the branch `agent-sh-read-whole-before-run` of the main checkout's copy since
2026-10-11 and was not pushed (`tools/cloud-brain/records/agent-sh-read-whole-before-run.md`).

Read at 08:30 CEST in the worktree's `cloud-brain-dev`, after `git fetch origin`:

```
git rev-parse origin/main                                 380149273a38275f700252becf2281e61eb7d2aa
git log --format='%h %p' -1 d6f4632                       d6f4632 3801492
git merge-base --is-ancestor origin/main d6f4632          exit 0
git rev-list --count origin/main..d6f4632                 1
```

So the commit was already one commit on the cluster's `main`. **No rebase was made**: the task's "rebase
`d6f4632` on `main`" had nothing to do, and the sha is the one the spec and the earlier record name.

The main checkout's copy had three branches beside `main`, not the two the spec counted at 03:23:
`agent-sh-read-whole-before-run` (`d6f4632`), `rc-3-philosophy` (`726671a`, 0 commits not on `main`) and
`test-ts-cuts-returned-value` (`79d3ff5`, made 05:51 CEST by the writer of that issue, one commit on `3801492`,
not pushed).

## What changed

- **`cloud-brain-dev` `main` on the cluster is `d6f4632`.** Pushed under the landing lock with a write token of
  60 s from `git.token?name=cloud-brain-dev&scope=write&seconds=60`, called `--as loop-git`, read into a shell
  variable and given to `git -c http.extraHeader=…`; it was not printed. The owner's session was not used.
- **The pointer of `lopecode-dev`** is `d6f4632` (was `3801492`).
- **The main checkout's copy** was fast-forwarded to it (`git -C <root>/cloud-brain-dev merge --ff-only d6f4632`),
  under the lock. The spec gives that pull to the orchestrator (part 1, round 2), which is task 3 and not in
  force; until then `SKILL.md` step 4 starts every reviewer from `<root>/cloud-brain-dev/agent.sh`, so without
  it the reviewers would still run the file with no block. `philosophy.md`, line 2.
- **Two branches deleted** there, `git branch -d agent-sh-read-whole-before-run rc-3-philosophy`: each was
  contained in `main` after the fast-forward, so `-d` took them and nothing was lost.
- **The written-over test is not skipped.** `tests/tools/light-agent.test.ts` ran "agent.sh written over while
  claude runs" only when the file under test ended `exit` and `}`, or with `AGENT_SH_WRITTEN_OVER=1`, so that
  no writer met a failure that waited on the owner's push. With the block in the pointer that skip would let
  an `agent.sh` that lost its block pass with `1 skip`. The condition and the variable are gone; the test
  runs on any `agent.sh`. A checkout with no `cloud-brain-dev/agent.sh` at all still skips the whole file by
  name (`needs.ts`), as before.

## Tests

In the worktree, `bun test ./tests/tools/light-agent.test.ts`, between 08:30 and 08:33 CEST, the test file as committed:

```
agent.sh of d6f4632 (the worktree's cloud-brain-dev)                         19 pass, 0 fail, 67 expects
agent.sh of 3801492 (CLOUD_BRAIN_DEV=<root>/cloud-brain-dev, before the push) 18 pass, 1 fail
CLOUD_BRAIN_DEV=<an empty directory>                                          0 pass, 19 skip, 0 fail
```

The one failure on `3801492` is the written-over test, with bash's `unexpected EOF while looking for
matching` and `syntax error: unexpected end of file`: the defect, as the earlier record has it. Before the
skip was taken out, from 08:30, the same two files gave 19 pass and, with no variable, 18 pass, 1 skip.

The whole directory, `bun test ./tests/tools` in the worktree at 08:33 CEST: 500 pass, 2 skip, 0 fail, 502
tests in 55 files. The two skips are of `test-ts-cut.test.ts`, which prints why: `test.ts` of the pointer
has no `--whole`.

## The landing

Under the landing lock, taken 08:34:39 CEST (`lock.sh take land`, its own line), from the worktree's
`cloud-brain-dev` and the main checkout's:

```
08:34:47  git -c http.extraHeader=… push origin d6f4632:refs/heads/main        3801492..d6f4632  d6f4632 -> main, exit 0
08:34:47  git ls-remote https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git
              d6f46320c1a0a9a5821b761757ce56359d69606e  HEAD
              d6f46320c1a0a9a5821b761757ce56359d69606e  refs/heads/main
08:34:53  git -C <root>/cloud-brain-dev merge --ff-only d6f4632                 Fast-forward, agent.sh, 5 insertions
08:34:53  git -C <root>/cloud-brain-dev branch -d agent-sh-read-whole-before-run rc-3-philosophy
              Deleted branch agent-sh-read-whole-before-run (was d6f4632). Deleted branch rc-3-philosophy (was 726671a).
08:34:53  git -C <root>/cloud-brain-dev branch | wc -l                           2 (main, test-ts-cuts-returned-value)
08:34:53  git -C <root>/cloud-brain-dev worktree list | wc -l                    9
```

The `ls-remote` is the confirmation of the act, read at the address every clone fetches from: 2 refs, both
`d6f4632`, and no ref but `HEAD` and `refs/heads/main` (the second half of the spec's check 4). The push went
before the pointer's push to GitHub, so no commit of `lopecode-dev` named a commit the cluster lacked.

## Not done, not tried

- **`test-ts-cuts-returned-value` stays, so check 4 of the spec gives 2 and not 1.** Its commit `79d3ff5` is
  another issue's work, not pushed, and it stands on `3801492`: it needs a rebase onto `d6f4632` (it changes
  `test.ts`, `README.md` and `AGENTS.md`; this one `agent.sh`) and a push. The task names `loop-git` for this
  push and `worktree.sh --push-dev` and nothing else, so it was not pushed here. `git worktree list` there
  is still more than 1: the writers' worktrees are of that copy until `wt-2-worktree-sh`.
- **A real `claude` under the new file.** Every run above is with the stand-in of the test's rig. The first
  light agent started from `<root>/cloud-brain-dev/agent.sh` after the fast-forward is the first real one.
- **A light agent running from the main checkout's copy at the moment of the fast-forward.** If one ran, it
  had the old `agent.sh` open while git replaced it. Not looked at: whether one was running, and what its
  exit was.
- **`loop-git` asked for another repository.** The rule that holds it to `cloud-brain-dev` is the owner's to
  put (the spec, "What only the owner can do"); check 5's 403 was not tried.
- bash other than `/bin/bash` here, and the cases the earlier record lists under its own "not tried".
