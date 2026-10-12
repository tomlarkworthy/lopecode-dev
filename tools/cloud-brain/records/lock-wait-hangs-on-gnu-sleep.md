# lock-wait-hangs-on-gnu-sleep

`tools/cloud-brain/lock.sh take <lock> <who> --wait <seconds>` left its wait loop on bad seconds
only when `sleep` refused them (round 2 of `lock-sh-wait-bad-seconds-spins`, whose record has
"Not tried: Linux `sleep`"). `/bin/sleep` of macOS refuses `2147483648`. GNU sleep takes it and
sleeps, so behind a held lock the call never returned. Met on the Fly.io machine, ubuntu 24.04,
by the writer of `fly-1-by-hand`: `lock.test.ts` timed out there at 30 s.

## Seen before the change, 2026-10-12 23:04 CEST, on the laptop

GNU sleep is `/opt/homebrew/bin/gsleep` here (`sleep (GNU coreutils) 9.11`; the issue names 9.4).
A directory with a link `sleep` to it was put first on `PATH`.

What that `sleep` does with each value, 0.4 s given to each:

| value | GNU sleep 9.11 |
|---|---|
| `2147483648`, `99999999999999999999`, `1e3`, `inf`, `5s` | sleeps |
| `abc\n5`, `5\nabc` (a newline in the value) | `invalid time interval`, exit 1 |

`PATH=<that directory>:$PATH bun test --timeout=30000 ./tests/tools/lock.test.ts`, on the commit
before this change:

```
(fail) take --wait leaves with exit 2 when sleep refuses the seconds the check let through [30000.57ms]
  ^ this test timed out after 30000ms.
 23 pass
 1 fail
```

`pgrep -fl 'sleep 2147483648'` then printed one process, `14520 sleep 2147483648`, which was
killed by its pid. Before the run it printed none. Load was 14.89 (`uptime`).

## The change

The check of the seconds no longer leaves anything to `sleep`:

- The value is matched whole, with `[[ =~ ]]`. Until now it was matched with `grep`, which
  matches a line, so a value of two lines with a number on one of them passed.
- The number is 600 at most, compared by `awk`. 600 s is the time a lock is held for (the
  header of `lock.sh`, line 2), and a taker that asks less often than that can sleep through a
  whole hold and the free time after it. `philosophy.md` line 2 decided it ("good common sense
  principles without micro-management"). Of the lines that
  `git grep -n -E -- '--wait +[0-9]' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  printed, those of `lock.sh` give it 300 at the most (`oversight.md`, `--wait 300`); the
  `--wait 12000` of `records/ow-3-operator-shown-the-issue.md` is `lope-browser-runner.ts`'s.
- A refused value is exit 2 before a token is read or a call is sent, with one line above the
  usage: `lock.sh: --wait takes seconds above 0 and at most 600; nothing was sent`.
- The exit of `sleep` is still read in the loop (`sleep refused … Not taken.`, exit 2).

The header of `lock.sh` says the limit, and the spec has an "As built" note where it speaks of
`--wait` (`plan/cloud-brain-locks-held-in-the-cluster.md`).

## Tests

`tests/tools/lock.test.ts`: one test changed, two added. They put a `sleep` of their own first
on `PATH`, so they do not depend on the machine's:

- "take --wait with seconds no wait is for is a usage error before any call, with a sleep that
  would take them": the stub takes any value and returns after 0.05 s. Ten values
  (`2147483648`, `99999999999999999999`, `601`, `600.5`, `1e3`, `inf`, `5s`, `abc\n5`, `5\nabc`,
  `5\n`), each exit 2 with the line above; the stand-in got no call and the stub was not run.
- "take --wait takes 600 seconds, the time a lock is held for, and less": `600`, `600.0`,
  `0600`, `599.9`, `0.2`, `.5` each take a free lock, exit 0.
- "take --wait leaves with exit 2 when sleep refuses seconds the check let through": a stub
  that exits 1, `--wait 5` behind a holder: exit 2, one call, the stub run once with `5`.

Runs, each after the last change to `lock.sh` and the test file:

- `bun test --timeout=30000 ./tests/tools/lock.test.ts`: 26 pass, 0 fail.
- The same with `LOCK_SH=` a copy of `git show HEAD:tools/cloud-brain/lock.sh` (the script before
  the change): 25 pass, 1 fail, the first of the three, `Expected: 2 Received: 137` for
  `"2147483648"` (the run was killed at 3 s).
- The same with GNU sleep first on `PATH`, as in the reproduction: 26 pass, 0 fail, and
  `pgrep -f 'sleep 2147483648'` printed nothing after it.
- In a container of `ubuntu:24.04` (`docker run`; bash 5.2.21, `sleep (GNU coreutils) 9.4`, awk
  is mawk), `bash lock.sh take land w --wait <value>` for 14 values: the nine bad ones above but
  `5\n` each printed the new line; `600`, `600.0`, `0.2`, `.5` and `20` went past the check
  (they stopped at line 55, `git: command not found`, as the image has no git).
- `tests/tools/suite.sh` in the worktree, ended 23:08:50 CEST: 769 pass, 0 fail, 81 files (load 8.82).

## Not tried

- The test file on Linux: the container has no bun. The script's check alone was run there.
- `--wait` on the Fly.io machine, and against cb4.
- `--wait 600` behind a holder for its 600 s.
- A sixth argument (`--wait 1 junk`) is still ignored, as the earlier record says.
- `tools/cloud-brain/issue-watch.sh` passes its third argument to `sleep` with no check
  (line 33). Not changed here.
- The second test that failed on that machine (`fly-1-by-hand`: "672 pass, 5 skip, 2 fail") is
  not this issue's and was not looked at.
