# land-lock-any-session-can-remove

2026-10-11. The landing lock and the deploy lock of the main checkout
(`tools/cloud-brain/.emitted/land.lock`, `cb4.lock`). A local tool, a test file and four docs; no
seed, no build, no deploy.

## What happened

`tools/cloud-brain/.emitted/issue-loop/_orchestrator.md`, the entry headed "2026-10-11 15:25:29 CEST
a slip with the landing lock": the orchestrating session ran `mkdir land.lock && edit && commit;
rmdir land.lock`. The mkdir failed, because the writer of `attention-block-unreadable-to-owner` held
the lock. The `&&` skipped the edit and the commit, and the `rmdir` after the `;` removed that
writer's lock. The session saw it and made the directory again. Nothing landed in between.

The lock was an empty directory. It named no holder, so `rmdir` worked for any session.

## What changed

`tools/cloud-brain/lock.sh take|release|show land|cb4 <who>`. The lock is still the directory
`rules.md` names, made with `mkdir`, so a session that uses a bare `mkdir` still finds it held. `take`
writes a file `holder` in it (the name, a tab, the time from `date`). `release` removes the file and
the directory only when the name given is the one in the file.

The slip, run again with the tool in a temporary directory (`BRAIN_STATE_DIR=$(mktemp -d)`,
2026-10-11 16:07:25 CEST):

```
$ lock.sh take land writer-a
land.lock taken by writer-a at 2026-10-11 16:07:25 CEST
$ lock.sh take land orchestrator && echo landed; lock.sh release land orchestrator
lock.sh: land.lock is held by writer-a, since 2026-10-11 16:07:25 CEST. Not taken; do not remove it.
lock.sh: land.lock is held by writer-a, since 2026-10-11 16:07:25 CEST, not by orchestrator. Left where it is.
$ rmdir $BRAIN_STATE_DIR/land.lock
rmdir: …/land.lock: Directory not empty
```

The third command is the form of that day. It fails because the directory holds the file, so a
session that has not read the new briefs cannot repeat the slip on a lock taken with the tool.

- `take … --wait [seconds]` looks again until the lock is taken (20 s when no number is given). It
  stands in for the `until mkdir …; do sleep 20; done` of the brief, so the name is written by the
  call that made the directory.
- A lock made with a bare `mkdir` has no `holder`. The tool takes it for held and refuses to release
  it under any name. `show` says "nobody this tool knows".
- A second `take` by the name that holds the lock is refused like any other (exit 1).
- The directory is the main checkout's also when the script that runs is a worktree's copy
  (`git rev-parse --git-common-dir`, as `worktree.sh` does). `BRAIN_STATE_DIR` puts it elsewhere;
  the tests use that and never touch the checkout's `.emitted/`.

The docs that gave `mkdir` and `rmdir` now give the tool: `agents/implementer.md` step 10 (the
landing lock, the deploy lock, the release, the stop while holding), `agents/overseer.md` (its
commit), `SKILL.md` step 1 (`show` for the health check; a stale lock is removed by the owner with
`rm -r`; the orchestrator's own commit), and step 4 of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` (`cb4.lock`).

## Not chosen

The issue's smaller side was one form in each brief, `if mkdir …; then …; rmdir …; fi`. It rests on
each agent copying it, and nothing tests it. Triage (event 879) took the tool by line 2 of
`philosophy.md`.

A lock made by renaming a prepared directory into place would write the holder atomically. On POSIX a
rename onto an empty directory replaces it, so it would take a lock held by a bare `mkdir`. Not built.

## Tests

`tests/tools/lock.test.ts`, 10 tests. Run in the worktree after the last change, 2026-10-11 16:07 CEST:

| Command | Result |
|---|---|
| `bun test ./tests/tools/lock.test.ts` | 10 pass, 0 fail |
| `bun test ./tests/tools` | 145 pass, 0 fail, 17 files |
| the first, with `lock.sh` moved aside (before the fix: there was no tool) | 0 pass, 10 fail |
| the first, with the tool and before the docs were edited | 9 pass, 1 fail ("the briefs name lock.sh for both locks") |

The second test is the slip above. The last reads `implementer.md`, `overseer.md` and the knowledge
doc and fails on a code span that is `mkdir` or `rmdir` of either lock.

## Not done, not tried

- `rules.md` still reads "(`mkdir`, and `rmdir` when done)" for `land.lock` and "`mkdir …/cb4.lock`,
  apply, `rmdir`" for `cb4.lock`. It is the owner's file. What it says of taking stays true. Its
  `rmdir` now fails on a lock taken with the tool. The sentence proposed is in the linked issue
  `rules-md-names-lock-sh`.
- Two `take`s at the same instant. `mkdir` lets one through. Between that `mkdir` and the write of
  `holder` (two lines of the script) the directory is empty and a bare `rmdir` would remove it. Not
  measured.
- A session that calls `release` with another holder's name. The name is not a secret and the tool
  does not check who calls. It stops the slip, where the session gives its own name; it does not
  stop a session that sets out to remove a lock.
- `brain.ts apply` does not look at `cb4.lock`. Unchanged.
- A lock left by an agent that died is still removed by the owner by hand. No expiry was built.
- The knowledge doc's entry in the Brain's search was not put again (`knowledge-docs.ts put --stale`).
