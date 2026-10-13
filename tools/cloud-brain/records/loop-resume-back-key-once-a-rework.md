# loop-resume-back-key-once-a-rework: the `back` of a dead writer has a key of its own run

2026-10-13. A fix of a local tool, `tools/cloud-brain/loop.ts`, branch "A dead writer" of `resume`,
and its tests. No seed, no deploy. Nothing of the issue loop calls `loop.ts` yet (`st-7` of
`plan/cloud-brain-orchestrator-as-steps.md`), so no `back` of the record was made with the old key
or the new one. Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the
writer, in the worktree `…/.claude/worktrees/bm-loop-back-key`.

## What was wrong

The reviewer of `st-2-loop-start-and-end` filed it. `resume` sent the `back` of a dead writer with
the key `orch/<id>/back-<at>`, `<at>` the seq of the last `rework` or `respec` move (or a later
`go-on` verdict). A `back` and the next writer's `start` add no `rework`, so a second writer that
died in that round got the first key again. The tracker writes nothing for a key it has and answers
200; `resume` read the status alone.

Reproduced before the fix, with the new test in a copy that had its lines on the key's text taken
out (the copy was deleted after the run): the second `resume` exited 0 and the issue had one `back`.

```
TypeError: undefined is not an object (evaluating 'backs()[1].seq')
 0 pass   1 fail   4 expect() calls
```

The four expectations that passed include `expect(two.code).toBe(0)`: exit 0, and no second `back`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | `backKey(id, token, events)`, exported; `resume` sends the `back` with it, and stops with exit 1 on `duplicate: true`; two lines of the header |
| `tests/tools/loop.test.ts` | one test added (15 in the file); the two expectations of the old key in the test before it now have the new one |

The key is `orch/<id>/back/<token>/<seq>`: `<token>` is the token of the last run of the role in
`runs?id=`, or `no-token` when there is no run or the run names none, and `<seq>` is the seq of the
issue's last `moved` event.

The issue's one line asks for the token, "as the `cost` key does". The token alone leaves two cases
on one key, so the seq is there too:

- **One token, two runs.** `start --token <t>` does not make the token and `resume` does not end it
  (`file.made === false`), so the next `start --token <t>` is the same token in the same round.
- **No run in the record**, twice: the key has no token to differ by.

For an issue to be at `in-progress` or `spec` again after a `back`, a writer made a `start` or a
`spec` move, and that move's seq is later than every seq before it. So the seq of the last move
differs between two `back`s of one issue, and is the same for one call sent twice with nothing
between. The seq alone would do; the token is kept in the key so that a reader of the record sees
which run the `back` was for. The reason of the move still names `<at>`, "the round of event `<at>`".

**A `duplicate: true` answer is exit 1.** stderr has the key, the seq the tracker answered with, the
state of the issue read after it, and whether the token was ended. Nothing is printed on stdout.
The token is ended before the move, as before, so on this exit the dead run's token may be ended
and the issue still at `in-progress`: the line says so. With the new key the writer knows one way
to this exit: two `resume` calls of one issue at once, both having read it before either's `back`.
The second then reads the state after the first's `back` and prints it. That race was not run.

The shape of the answer on cb4, read once: the writer's own `start` of this issue sent again with
its key, 2026-10-13 07:16 CEST (`date`, in the same Bash call).

```
 [200]
{"id":"loop-resume-back-key-once-a-rework","seq":5973,"duplicate":true,"event":{"seq":5973,"key":"impl/loop-resume-back-key-once-a-rework/start", …
```

## The tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop.test.ts`: 15 pass, 0 fail, 237 `expect()`
calls. With `loop.ts` of the commit before (`git show HEAD:tools/cloud-brain/loop.ts` written in its
place, then the fixed file put back): 13 pass, 2 fail, the new test and the one whose two
expectations name the key.

The whole suite, `$W/tests/tools/suite.sh`, after the last edit of `loop.ts` and of the test and after
a `worktree.sh --rebase` made before the landing: 1083 pass, 0 fail, 110 files, no `skipped:` line.
(Before that rebase, which brought in five files under `tests/tools`: 1089 pass, 0 fail, 110 files.
The landing's own rebase comes after this count.)

The new test, against the stand-in tracker of the file (it keeps a key once and answers
`duplicate: true` with the first seq), on one issue with one `rework` move:

| Case | What it holds |
|---|---|
| a run of another machine, `impl-abcdef` | `back`, key `…/back/impl-abcdef/<seq of the rework>` |
| the next writer's `start`, then its run dead, `impl-fedcba` | a second `back` with the key of that token and that `start`; exit 0, the issue at `ready`, the reason names the `rework` |
| a third `start` and a dead run of `impl-fedcba` again | a third `back`, the key differs by the seq |
| no run in the record, twice, a `start` between | two more, `…/back/no-token/<seq>` |
| the key already kept by the stand-in, at seq 103 | exit 1, nothing on stdout, the line of stderr, no move added, the issue at `in-progress` |

## Not tried

- `resume` against cb4. The check of `st-2-loop-start-and-end` on cb4 did not reach this branch
  either (its record, "The check on cb4", has `start`, `ended` and `dead`). The first `back` made by
  the tool will be `st-3-step`'s or later.
- Two `resume` calls of one issue at once.
- What follows the new exit 1. A second `resume` with no move between has the same key and the same
  exit: the exit says what happened and is no way out of it. After the race above the next call
  stops at the state (`is at ready`). After any other cause the issue is at `in-progress` with the
  token ended until a move is made by hand.
- A run with no token (`its last run names no token`): the key is then `no-token` by the same
  expression as for no run, and only the case of no run is in the test.
- A key over 100 characters. `start` refuses a run whose longest `cost` key would be, and this key
  is shorter than that one for the same id and token; a run that `loop.ts start` did not make has
  no such check, and the tracker's refusal would then be the exit 1 `back was not made: 400`, after
  the token was ended.
- An issue that came to `in-progress` by something that is not a `moved` event. The writer knows of
  none.
