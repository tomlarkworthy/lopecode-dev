# loop-resume-says-token-ended-unread: `loop.ts` reads the exit of the revoke before it says a token is ended

2026-10-13. A fix of a local tool, `tools/cloud-brain/loop.ts`, and its tests. No seed, no deploy.
Nothing of the issue loop calls `loop.ts` yet (`st-7` of `plan/cloud-brain-orchestrator-as-steps.md`),
so no `back` of the record has a reason written by either version. Every run below was made on one
laptop (macOS, bun 1.4.0) from Bash calls of the writer, in the worktree
`…/.claude/worktrees/bm-loop-token-ended`.

## What was wrong

The reviewer of `loop-resume-back-key-once-a-rework` filed it, from a read of the code. In `resume`,
branch "A dead writer", the result of `brain.ts agent-token revoke <token>` was kept as an object and
tested for being there, not for its exit. So three texts said the token was ended whatever the
command exited with: the reason of the `back` move ("Its token … is ended."), the printed
`token: "… ended"`, and the stderr line of exit 1 at a key the tracker has ("The token … is ended.").

`unmake`, which ends the token of a `start` that fails after the token is made, had the same
defect in a fourth text: it did not keep the result at all and wrote "; the token … is ended". The
issue does not name it. It is mended here with the same function.

Reproduced before the fix with the new test, against the stand-in `brain.ts` of the test file made
to exit 1 on a revoke:

```
-   "token": "impl-abcdef not ended: exit 1, 200: "impl-abcdef" still answers a read of issue.policy after its revoke, on read 13, 12004 ms after. Its entry is kept",
+   "token": "impl-abcdef ended",
```

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | `revoke(token)`: one call of `agent-token revoke`, answered as a text, `ended` at exit 0 and `not ended: exit N, <what the command answered>` at any other; `resume` and `unmake` write that text in the four places; two lines of the header and a clause of one comment |
| `tests/tools/loop.test.ts` | one test added (16 in the file); the stand-in `brain.ts` exits 1 on a revoke, with the text of the file `brain-revoke-exit` on stdout, when that file is there |

What the command answered is its stdout and stderr, trimmed, with each run of white space made one
space, so that the reason of the move is one line. A command that prints nothing is
`not ended: exit N, it answered nothing`.

The `back` is made whatever the revoke exited with, and `resume` exits 0 as before. The issue asks
for the three texts and not for a stop. The issue is then at `ready` for the next writer, and the
reason of its `back` says that the dead run's token was not ended and what the command said.

`ended`, in the same file, already read the exit (`if (r.code !== 0) notes.push(…)`) and is not changed.

## What `not ended` means

It means the command did not exit 0. Six exits of 1 of `brain.ts agent-token revoke`, read from
`tools/cloud-brain/brain.ts` (the command `agent-token`, each `stop(` and `refused(` from its first
line to the end of `revoke`) and not run. Whether it has others was not looked for:

- the token `loop-agents` is not kept;
- the list of the delegations under it was refused;
- no row under `loop-agents` has the name and no value is kept: `no token "<name>" was made under loop-agents or is kept here`;
- `delegation.revoke` was refused;
- the value still answers a read of `issue.policy` 12 s after the revoke;
- the value is refused (401) and its entry could not be removed from the file.

In the third the token may be gone already (a name with no row and no kept value), and in the last
it no longer works; the text still begins `not ended`. The
reader has the command's own words after it, which say which case it was.

## The tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop.test.ts`: 16 pass, 0 fail, 254 `expect()`
calls. With `loop.ts` of the commit before (`git show HEAD~1:tools/cloud-brain/loop.ts` written in
its place, then `git checkout -- tools/cloud-brain/loop.ts`): 15 pass, 1 fail, the new test.

The whole suite, `$W/tests/tools/suite.sh`, after the last edit of `loop.ts` and of the test and
after a `worktree.sh --rebase` that brought nothing in, at 08:39 CEST (`date`): 1096 pass, 0 fail,
112 files, no `skipped:` line. The run before it, at 08:37, was 1095 pass and 1 fail: "a run that is
told to stop (TERM, INT) while bun runs leaves nothing either", of
`tests/tools/tests-tools-suite-parallel.test.ts`, at its limit of 30 s. That file alone, run
between the two, was 14 pass, 0 fail. The test is of the suite's own script and not of this change;
why it took 30 s once was not looked into. The landing's own rebase comes after these counts.

The new test, against the stand-in tracker and the stand-in `brain.ts`:

| Case | What is expected |
|---|---|
| A dead writer (a run of another machine), the revoke exits 1 with two lines | exit 0; one `back`; the printed `token` is `impl-abcdef not ended: exit 1, <the answer as one line>`; the reason of the `back`, whole, has "Its token impl-abcdef is not ended: exit 1, …" |
| The same, at a key the tracker has | exit 1, nothing on stdout; stderr has "The token impl-fedcba is not ended: exit 1, …" and no "is ended" |
| The revoke exits 1 and prints nothing | `token` is `impl-fedcba not ended: exit 1, it answered nothing` |
| `start` of an implementer, the worktree refused (exit 2), the revoke exits 1 | exit 2; stderr ends "; the token impl-… is not ended: exit 1, …" and has no "is ended" |
| The same `start`, the revoke exits 0 | exit 2; stderr has "; the token impl-… is ended" |

The cases at exit 0 of the revoke in `resume` are those of the two tests before it, which pass unchanged.

## Not tried

- **The real `brain.ts agent-token revoke`.** A writer does not run `agent-token`. Its six exits
  above are read from the source. That its failures print on stdout, as the stand-in's do, is read
  from `const stop = (text) => { console.log(text); process.exit(1); }` there.
- **A revoke that is killed or cannot be started.** `sh` gives `r.status ?? 1`, so the text would be
  `not ended: exit 1, …`. No test makes the stand-in do that.
- **`unmake` from its other two callers** (origin not reached, and `worktree.sh --at` refused, both
  for a reviewer or an approver). They call the same function; the test enters it by the first
  caller, a writer's refused worktree.
- **An answer of many lines or of great length.** The test has two lines. Nothing cuts the text, so
  a long answer is a long reason of the `back`. Whether the tracker refuses a reason over some
  length was not looked for.
- **`loop.ts` on cb4.** No run of this change wrote to the tracker of cb4.
