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
