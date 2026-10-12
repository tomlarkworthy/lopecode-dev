# philosophy-test-no-skip-without-clone

A quick win of the orchestrating session, 2026-10-12: the test is its own (`philosophy-one-role-for-one-job`, round 2), and
the reviewer of that round filed this with the fix.

## What changed

`tests/tools/philosophy-one-role.test.ts` takes `test` from `testNeeding("philosophy-one-role.test.ts", [path])` of
`tests/tools/needs.ts` and reads the file only when it exists. With no file it prints a `skipped:` line and fails nothing.

## Commands, with results

| Command | Result |
|---|---|
| `bun test ./tests/tools/philosophy-one-role.test.ts` in the worktree | 3 pass, 0 fail |
| the same with `PHILOSOPHY=/nonexistent/philosophy.md`, before the change (the reviewer's run, in the issue) | 0 pass, 1 fail, 1 error |
| the same, after | 0 pass, 3 skip, 0 fail, and the line `skipped: philosophy-one-role.test.ts: no /nonexistent/philosophy.md…` |

## Not tried

- A plain `git worktree add` with an empty submodule: the path that does not exist stands for it, as in the issue.
- The whole suite of `tests/tools`.
