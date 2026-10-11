# lock-sh-wait-bad-seconds-spins

`tools/cloud-brain/lock.sh take <lock> <who> --wait <seconds>` passed the seconds to `sleep`
unchecked. Against a held lock, `--wait abc` looped with no pause printing
`sleep: invalid time interval`, and `--wait 0` did the same silently. Found by the reviewer of
`land-lock-any-session-can-remove` (event 914), whose two probes hung its shell until the 120 s
and 60 s timeouts. No brief gives a number after `--wait`, and the holder was never changed.

## The change

A quick win by the orchestrator, 2026-10-11 16:17:56 CEST. The seconds must be a number above 0
(`20`, `0.2`, `.5`); anything else is the usage error, exit 2, before the lock is looked at. A
bare `--wait` is 20 s as before.

## Runs, the orchestrator's own, main checkout

- `bun test ./tests/tools/lock.test.ts` before the change: 10 pass, 0 fail.
- After, with the new test: 11 pass, 0 fail.
- The new test file against the tool of HEAD (`LOCK_SH=<copy of git show HEAD:…/lock.sh>`): 10 pass, 1 fail, the new test.
- `bun test ./tests/tools` at 16:17:41 CEST: 146 pass, 0 fail.

## Not tried

- `--wait` with a valid number against a real holder for longer than the test's 0.5 s.
- What `sleep` accepts on Linux that this check refuses (`1s`, `1e-1`, `inf`): they are usage errors here.

## Round 2

Review 927, changes: the check was before the loop and the exit of `sleep` was still ignored.
Two kinds of value passed the check and were refused by `sleep` (macOS `/bin/sleep`), so the
loop spun as before: a number of 2^31 or more (`2147483648`: 538 lines of `usage: sleep` in the
reviewer's 3 s), and a value with a newline (`$'abc\n5'`), since `grep` matches per line.

The loop now leaves with exit 2 when `sleep` exits nonzero, whatever the check let through. The
check stays, so that a bad value is refused when the lock is free too.

Runs, the orchestrator's own, main checkout: `bun test ./tests/tools/lock.test.ts` gave 12 pass  0 fail; the same file against the tool of `273f81a2` gave (fail) take --wait leaves with exit 2 when sleep refuses the seconds the check let through [5000.81ms]  11 pass  1 fail; `bun test ./tests/tools` at 16:22:29 CEST gave 147 pass  0 fail. Not tried: Linux `sleep`; `--wait 1 junk`, which still ignores the sixth argument.
