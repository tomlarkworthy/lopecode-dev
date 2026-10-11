# lk-2-reviewer-brief-waits-on-show

2026-10-11. Task 2 of `plan/cloud-brain-locks-held-in-the-cluster.md`: step 3 of the reviewer's brief on
cb4 waits for a landing by asking `lock.sh show land`, and compares against `origin/main` after a fetch.
One file of the Brain was changed. No seed, no deploy, no commit in `cloud-brain-dev`.

## Who made the put

The spec gives this task to an overseer, since `rules.md` keeps the token `loop-roles` for that role. The
owner's answer at event 1406 (on `ta-4-reviewer-brief-names-token`) is later: "a writer may put a brief when
its issue is a task of a spec you approved". This issue is a part of `locks-held-in-the-cluster`, approved at
event 1453, so its writer made the put, with `cloud-brain-dev/put.sh` of the main checkout. So no entry in
`oversight.md` was written, which the spec's task 2 has for the overseer; this file is the record.

## What changed

`/static/cloud-brain-dev/roles/reviewer.md`. `put.sh` ran between two reads of `date`, 19:40:54 and
19:40:56 CEST.

```
before  sha256 642cf35b…  13301 bytes  kept by put.sh as 2026-10-11T17-40-54Z-642cf35b   (put.sh --history roles/reviewer.md, last line)
after   sha256 15e8cf88…  14197 bytes                                                    (curl -s <brain>/static/cloud-brain-dev/roles/reviewer.md | shasum -a 256; | wc -c)
```

The before is the copy ta-4 put at 19:21 (its record gives the same `642cf35b`), fetched 19:39 and equal to
the file on disk. `diff` of the two is one hunk, `41,50c41,61`: 10 lines out, 21 in, all in step 3. The lines
that went:

```
   still the ref's commit, and the deployed text then matches neither. While
   `tools/cloud-brain/.emitted/land.lock` exists a landing is under way: wait for it to go
   (`until [ ! -d …/land.lock ]; do sleep 20; done`, `run_in_background`), then run `redistil`
   and read `HEAD` again before comparing. Then
```

Step 3 now opens with the wait and the fetch, as fetched from cb4 after the put:

```
   until LOCK_TOKEN=<token> <checkout>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done
   git -C <checkout> fetch origin && git -C <checkout>/lopebooks fetch origin
```

and after them `merge-base --is-ancestor <sha> origin/main`, `git -C lopebooks show origin/main:notebooks/@tomlarkworthy_cloud-brain.html`
in place of the two `HEAD`s, and the sentence "When a fetch fails, compare against `HEAD` in place of
`origin/main`, and say in the review that you did and what the fetch answered."

R3's check of the Brain's copy, run 19:40 after the put:

```
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md | grep -c "land\.lock\|cb4\.lock"
0                                   (2 on the copy before)
$ … | grep -c "lock.sh show land"
1
```

## Where the text is not the spec's

- **`LOCK_TOKEN=<token>`, where the spec has `LOCK_TOKEN=issues-reviewer-2`.** The spec's line was written
  between 18:56 and 19:14. ta-4 landed at 19:21 and made the brief name the token of the reviewer's task as
  `<token>`, with the role's name once as the fallback; `tests/tools/reviewer-brief-names-token.test.ts` holds
  the brief to one `issues-reviewer-2`. The spec's spelling would make that 2 and put the role's token in a
  command. With `<token>` the count is still 1 (`grep -c issues-reviewer-2` of the served copy). Today's
  `lock.sh` does not read `LOCK_TOKEN`; task 3's will, and it reads the file of agent tokens too (the spec, "How it finds the token").
- **"Any other exit is asked again after 20 s"** and **"do not pull"** are this writer's sentences. The first
  is what the line does (the last test below); the second is the spec's reason for a fetch (review 1236, note a).
- **The copy of `origin/main` is saved as `<your scratchpad>/nb-main-<id>.html`.** Step 4 already saves the
  notebook of the submit's commit as `nb-<id>.html`.
- **"a landing is under way, so run the two lines and `redistil` again"** closes the sentence the brief had
  on a hash that matches neither. Before, the brief said to read `HEAD` again after the wait.

## Tests

`tests/tools/reviewer-brief-waits-on-show.test.ts`, 5 tests. Four read the brief from cb4 with no token
(`BRIEF=<file>` reads a file in its place): R3's two greps, the wait line whole, the fetch and both
`origin/main` commands with no `HEAD` in their place, the fetch-fails sentence. The fifth takes the wait line
out of the brief and runs it in bash on a stand-in `lock.sh` that exits 0, then 2, then 1: the line asks
three times, with `LOCK_TOKEN` set each time, and goes on after the 1.

```
before the put   $ cd <worktree> && BRIEF=<scratch>/before.md bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts
                 0 pass, 5 fail, 5 expect() calls
after the put    $ bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts ./tests/tools/reviewer-brief-names-token.test.ts
                 9 pass, 0 fail, 25 expect() calls        (5 of this issue, 4 of ta-4's)
```

`<scratch>/before.md` was the `curl` of 19:39. It can be made again with
`put.sh --restore roles/reviewer.md 2026-10-11T17-40-54Z-642cf35b`, which writes the file on disk and needs `loop-roles`.

The whole directory, in the worktree at 19:41: `bun test ./tests/tools`, 239 pass, 0 fail, 1521 expect() calls, 29 files.

## The lines, run once by the writer

In the main checkout at 19:41, with nobody holding `land` (`lock.sh show land`: "land.lock is not held", exit 1):

```
$ git -C <root> fetch origin && git -C <root>/lopebooks fetch origin                      exit 0
$ git -C <root>/lopebooks show origin/main:notebooks/@tomlarkworthy_cloud-brain.html > <scratch>/nb-main.html
                                                                                        exit 0, 8579098 bytes
$ git -C <root>/lopebooks merge-base --is-ancestor HEAD origin/main                       exit 0   (both 0b1feafa)
$ until LOCK_TOKEN=issues-implementer-2 <root>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done
                                                                                        returned at once
```

The spec says of the fetch and the `show`: "Not run". They are run here once, by a writer and not in a review.

## Not tried

- **A review made with the new brief while a writer holds `land`**, the second check the issue names. It is
  a reviewer's to make. The part below is what this writer saw of the wait behind its own hold.
- **A fetch that fails.** The sentence for it is in the brief; no fetch failed here, and what a reviewer
  writes then was not seen.
- **A second machine.** `origin/main` and `HEAD` were the same commit in this checkout.
- **The cluster's `lock.sh`** (task 3). The wait ran against today's script, which reads the directory. That
  the same line is right after task 3 is the spec's reading of exit codes not yet built.
- **Other mentions of `HEAD` in the brief.** Step 4's `git -C cloud-brain-dev worktree add … HEAD` is of
  another repository and was left. The compare of step 3 for a hash that equals the ref's still reads the
  working file (`bun tools/lope-reader.ts lopebooks/notebooks/…`), as before.
- **The test reads the network.** With cb4 not answering, four of the five fail; no skip was written. The
  spec has such a `curl` in `lock.test.ts` from task 3 on, skipped with its reason; this file is where it is until then.
- The kept copy was not restored, so a return to it is not shown.
