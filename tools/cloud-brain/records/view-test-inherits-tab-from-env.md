# view-test-inherits-tab-from-env

2026-10-12. One line of `tests/tools/reviewer-in-a-view.test.ts` and a comment above it. No seed, no
deploy, `agent.sh` not changed. Every run below was made in the worktree of this issue, on one machine
(bun 1.4.0, macOS), by the writer, whose own environment has none of `TAB`, `MODEL`, `READS`, `ADVISOR`,
`DRY`, `CHECKOUT` (`env | grep -c -E '^(TAB|MODEL|READS|ADVISOR|DRY|CHECKOUT)='` printed 0). Times are
CEST, read from `date` before each group of commands.

## What was wrong

The last test of that file, "agent.sh given a view names it as the checkout, and starts the tab's server
in it", runs `cloud-brain-dev/agent.sh` twice with `DRY=1`: once plain, where it expects no `--mcp-config`,
and once with `TAB=1`. The plain run was given `{ ...process.env, CHECKOUT: view, DRY: "1" }`, so a
variable `agent.sh` reads came through from whoever ran the test. A reviewer that `agent.sh` started with
a tab has `TAB=1` (the issue: `rev-fc6668`, in a view at `c2a6ba0a`, 612 pass and 1 fail from the suite).

Before the edit, at `59959915`, 13:10:38:

```
bun test ./tests/tools/reviewer-in-a-view.test.ts              10 pass, 0 fail
TAB=1 bun test ./tests/tools/reviewer-in-a-view.test.ts         9 pass, 1 fail
  error: expect(received).not.toContain(expected)
  Expected to not contain: "--mcp-config"
      at tests/tools/reviewer-in-a-view.test.ts:122:21
READS=/tmp bun test ./tests/tools/reviewer-in-a-view.test.ts    9 pass, 1 fail
  Expected to contain: "\ncheckout: /var/folders/…/T/bm-rev-Ba9XKe\n"
      at tests/tools/reviewer-in-a-view.test.ts:121:17
MODEL=haiku …                                                  10 pass, 0 fail
ADVISOR=1 …                                                    10 pass, 0 fail
```

`READS` fails it too, at another line: with `READS` set `agent.sh` writes no `checkout:` line in the
prompt (`agent.sh`, lines 36 to 39). `MODEL` and `ADVISOR` change arguments the test does not read.

## What changed

The env of the plain run:

```
const env = { ...process.env, TAB: "", MODEL: "", ADVISOR: "", READS: "", CHECKOUT: view, DRY: "1" };
```

The four names and the empty string are those `tests/tools/light-agent.test.ts` passes at its line 120.
`agent.sh` reads each so that empty is as unset: `[ -n "$TAB" ]`, `[ -n "$READS" ]`, `[ "$ADVISOR" = 1 ]`,
`${MODEL:-opus}`. The second run of the test, `{ ...env, TAB: "1" }`, is as it was.

No test was added. The test that failed is the one that now passes, and what shows the defect is the
variable set around the same command, as above.

## After the edit

13:10:51, the same file under each variable, one command each
(`env <VAR> bun test ./tests/tools/reviewer-in-a-view.test.ts`): `TAB=1`, `READS=/tmp`, `MODEL=haiku`,
`ADVISOR=1`, `DRY=` (empty), `DRY=1`, `CHECKOUT=/nonexistent`, and `TAB=1 READS=/tmp` together: 10 pass,
0 fail, each of the eight. With none of them: 10 pass, 0 fail.

The whole suite with `TAB=1` in the environment, which is what an agent started with a tab runs,
13:11:08 to 13:12:40:

```
TAB=1 tests/tools/suite.sh
 613 pass
 0 fail
Ran 613 tests across 63 files. [91.69s]
```

exit 0, and no `skipped:` line in its output. That run was made after the last edit of the test file and
before this record was written.

## Not done, not tried

- `tests/tools/reviewer-brief-names-token.test.ts`, its test of `agent.sh` (line 51), also passes
  `{ ...process.env, … }` on, with no `DRY`. It did not fail in the `TAB=1` suite above. What it does
  with `DRY=1` or `READS` inherited was not run, and the file is not changed.
- The suite with `TAB=1` before the edit was not run by the writer: 612 pass and 1 fail is the issue's
  count, of a view at `c2a6ba0a`. The writer's count before the edit is of the one file.
- No run was made by an agent that `agent.sh` itself started with a tab. `TAB=1` was set on the command.
- A variable `agent.sh` may read later is not covered: the test names four, and nothing keeps that list
  in step with the script.
