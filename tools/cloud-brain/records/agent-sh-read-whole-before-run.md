# agent-sh-read-whole-before-run

2026-10-11. A local tool (`cloud-brain-dev/agent.sh`), its test and one paragraph of `SKILL.md`. No
seed, no deploy.

**Not in force.** The change to `agent.sh` is commit `d6f4632` of the repository `cloud-brain-dev`
(`9948cbb` when first made on `726671a`; `main` there moved twice while this was written, see the end),
on the branch `agent-sh-read-whole-before-run` there, made in the writer's worktree and not pushed:
a push to that repository needs the owner's session (comment 2250 of the issue). Until he pushes it
and the pointer in `lopecode-dev` moves, the `agent.sh` the loop starts is the one without the block.

## The defect, made again

`agent.sh` at `726671a` is 44 lines and ends with a pipeline into `python3 -c '…'`. The new test
starts it with a stand-in `claude` that waits for a file, writes `agent.sh` over in place
(`writeFileSync`, the same inode) while it waits, and lets it go. Against that file, with a `#` line
put after the first line (two bytes more):

```
agent.sh: line 45: unexpected EOF while looking for matching `''
agent.sh: line 46: syntax error: unexpected end of file
```

exit 2, after the whole JSON line. Those are the two messages of the ticket, one line on because
the file is one line longer. With a line of 47 characters put in instead, bash reads the end of the
python text as a command: `line 45: syntax error near unexpected token `1'`, exit 2. A file made
shorter, one of the same length and an empty one each gave exit 0: bash had no more to read.

## What changed

The body of `agent.sh` is one `{ … }` block whose last statement is `exit`. bash parses a block to
its `}` before it runs any of it, and the `exit` inside keeps it from reading a next command. A bare
`exit` gives the status of the pipeline before it, so python's 0, 1 and 2 are the script's as before.

The ticket named a second way, a script that runs from a copy of itself. Not taken: it adds a file
to make and remove, and the block is five lines.

`SKILL.md`, step 4, has four lines more: a JSON line with exit 2 is not the case "spawn the reviewer
once as an Agent"; the issue is read, and a review recorded there stands.

## Tests

`bun test ./tests/tools/light-agent.test.ts`, in the worktree, 21:32 CEST, the test as first committed, on `726671a`:

```
agent.sh of 9948cbb (the branch)                                   15 pass, 0 fail, 49 expects
agent.sh of 726671a, AGENT_SH_WRITTEN_OVER=1                        14 pass, 1 fail
agent.sh of 726671a, as any writer runs it                          14 pass, 1 skip, 0 fail
```

The second and third are with `CLOUD_BRAIN_DEV=<root>/cloud-brain-dev`. One test is new. It writes
the file over five ways (47 characters longer, two bytes longer, a line shorter, as long, empty) in
both forms (`reviewer "t"`, `--resume s-1 more`) and reads, for each of the ten, exit 0, `result`
of the JSON line, an empty stderr and, in the first form, no scratch directory.

**The test is skipped on `main` until the push.** It reads the `agent.sh` under test and runs only
when the file ends `exit` and `}` (or with `AGENT_SH_WRITTEN_OVER=1`). Without the skip every
writer's `bun test ./tests/tools` would have one failure that is not theirs until the owner pushes.
To run it on the fix before then: `git -C <root>/cloud-brain-dev worktree add <dir> agent-sh-read-whole-before-run`
and `CLOUD_BRAIN_DEV=<dir>`.

The whole directory, `bun test ./tests/tools` in the worktree after the rebase onto `main`, with the
branch's `agent.sh` and the notebook built there (`issue-lock-sql.test.ts` reads it): 318 pass, 0 fail.

By hand, on the file of `9948cbb`, with a `claude` that prints nothing: exit 2. With one that prints
a result with `is_error`: the JSON line and exit 1.

## Not reproduced, not tried

- **The scratch directories left.** In every failing case of the test the scratch directory was
  gone after the run (the last field of each row was `false`), so the EXIT trap ran. The ticket says
  three were left; this does not show how. `ls -d $TMPDIR/cloud-brain-agent-*` gave 24 at 21:28 CEST
  and 23 a few minutes later, so some are of runs under way. None was removed.
- **A checkout as the cause.** The ticket says one of the three writes was a checkout of the
  submodule. In a repository of one file, `git checkout` of another commit (git 2.55.0) gave the
  file a new inode (`stat -f %i`: 59764234, then 59764282). A script that bash has open would then
  keep the old file. Whether that checkout wrote in place some other way was not looked into; the
  test covers a write in place only.
- A write over while bash is still reading the block (the first milliseconds of a run).
- bash other than 3.2.57 (`/bin/bash` here).
- A real `claude` under the new file: the run of the loop's reviewer is what will show it, after the push.

## After `main` moved, 21:58 CEST

The first landing was refused at 21:37: `SKILL.md` and `tests/tools/light-agent.test.ts` were changed
and not committed in the main checkout by the writer of `agent-sh-returns-at-first-result`, so
`git merge --ff-only` stopped ("Aborting"), nothing was pushed and the lock was released. That
writer committed at 21:56 (`412fc043`), and the pointer of `cloud-brain-dev` is now `3801492`, two
commits of `agent.sh` on from `726671a` (68 lines). The branch was rebased onto it: `d6f4632`,
`bash -n` 0. The counts above are of the file before that.

A second take of the lock, 22:01, met a conflict in the test file with `5b4d3054` (`ps-2-summarizer-role`,
the rig's `READS` and `DRY`); the lock was released, the conflict resolved by keeping both, and the
tests run again at 22:03 CEST. These are the counts submitted, `bun test ./tests/tools/light-agent.test.ts`:

```
agent.sh of d6f4632 (the branch)                 19 pass, 0 fail
agent.sh of 3801492, AGENT_SH_WRITTEN_OVER=1     18 pass, 1 fail (the new test)
agent.sh of 3801492, as any writer runs it       18 pass, 1 skip, 0 fail
```

The whole directory, `bun test ./tests/tools` with the branch's `agent.sh`: 344 pass, 4 fail. The four
are in `atproto-publish.test.ts`, each at its 5000 ms limit; that file alone, straight after: 5 pass, 0 fail.

## In force, 2026-10-12 08:34 CEST

`d6f4632` is `main` of `cloud-brain-dev` on the cluster and the pointer of `lopecode-dev` since
`wt-1-land-the-agent-sh-block`, pushed with the loop's token `loop-git` and not the owner's session
(`tools/cloud-brain/records/wt-1-land-the-agent-sh-block.md`). "Not in force" at the top was true until then.
The test is no longer skipped: its condition and `AGENT_SH_WRITTEN_OVER` were taken out with that landing.
