# token-checks.ts: an `--after` that is no number read every check as pass

Issue `token-checks-after-nan-reads-pass`, opened by the reviewer of `ta-6-checks-after-three-issues`
(event 4013). Written 2026-10-12. A local tool and its test file: no seed, no build, no deploy.

## What was wrong

`bun tools/cloud-brain/token-checks.ts --token NAME --after abc` printed `N = NaN`, `pass` for the
first and third checks of R1 and for the parent, and was exit 0. The tool made `Number("abc")` and
`checks` kept the events with `e.seq > NaN`, which is none of them. A check that counts events after
N then has nothing to fail on. An N past the last event (`--after 99999`) read the same way.

The test file as it is now, run against the tool as `origin/main` had it
(`git show origin/main:tools/cloud-brain/token-checks.ts` written over the file, 12:46:36 CEST by `date`):

```
$ bun test ./tests/tools/token-checks.test.ts
+ R1, first check: pass
+ R1, third check: pass, of what the record has (the live children are agent-token list's)
+ the parent: pass; secret:loop-agents wrote 0 events after N, 0 in all
(fail) an --after or --until that is no whole number is exit 2, with nothing read and no check printed
(fail) a pass with no event after N says so on its line, and a pass with one does not
(fail) --until 0 is the record before its first event, not the whole record
 10 pass
 3 fail
```

The three `+` lines are the stdout of `--after abc` where the test expects none.

## What changed

In `tools/cloud-brain/token-checks.ts`:

- **`--after` and `--until` take digits only.** A flag that is given with anything else is exit 2,
  with a line on stderr that names the flag, before the first read of `issue.sync`. The values the
  test sends and sees refused: `abc`, `-5`, `1.5`, `1e3`, `0x10`, ` 7`, the empty string,
  `--after=abc`, `--after=`, `--after` as the last argument, `--after --json`, and a bad one beside
  a good one of the other flag. "Nothing read" is counted in the test: the tool is given a stand-in
  for `issue-as.sh` that writes a line to a file each time it is called, and the file has 0 lines
  after each refused run and 1 after each accepted one (`--after 0`, `--after=12`, `--until 7`, both, neither).
- **A pass with no event after N says so.** `checks` returns `afterN`, the count of events after N
  among those read. When it is 0, `text` writes `; no event is after N` in the first line and
  `pass (no event is after N)` for each check that passes. The words are not `0 events after N`, as
  the issue has them, because each old role token's line already reads `issues-reviewer-2: 0 events
  after N` in a run where events are after N (`--after 3962` below, at 4028 events). A check that fails is `FAIL` with nothing added.
  The exit is not changed: 0 when the three pass.
- **`--until 0`** read the whole record (`opt.until ?` is false for 0). It now reads no event. Met
  while in the line; not in the issue.

Two alternatives, not taken. Exit 1 when no event is after N: the issue asks for the sentence, and a
record with no event since N is a true pass of "no old role token wrote after N". A guard inside
`checks` against a `NaN`: see "Not tried".

## The runs on cb4's record

With the fix, from the worktree, 2026-10-12 12:46:12 CEST by `date`, at 4028 events:

```
$ bun tools/cloud-brain/token-checks.ts --token impl-a5a587 --after abc
token-checks.ts: --after is not a whole number; nothing was read
  --after SEQ is the seq of an event of the record, digits only: --after 2666
exit 2
$ bun tools/cloud-brain/token-checks.ts --token impl-a5a587 --after 99999
read 4028 events to 4028; N = 99999; no event is after N (the first start by an impl- token on an issue is 2667, os-1-owner-label, impl-4e8be2)
R1, first check: pass (no event is after N)
R1, third check: pass (no event is after N), of what the record has (the live children are agent-token list's)
the parent: pass (no event is after N); secret:loop-agents wrote 0 events after N, 0 in all
exit 0
$ bun tools/cloud-brain/token-checks.ts --token impl-a5a587 --after 3962
read 4028 events to 4028; N = 3962 (the first start by an impl- token on an issue is 2667, os-1-owner-label, impl-4e8be2)
R1, first check: pass
R1, third check: FAIL, of what the record has (the live children are agent-token list's)
exit 1
$ bun tools/cloud-brain/token-checks.ts --token impl-a5a587
read 4028 events to 4028; N = 2666 (…)
R1, first check: FAIL
  issues-implementer-2: 20 events after N, 2682 to 3962, keys {"impl":11,"orch2":9}
exit 1
```

Lines of each run are left out here; those shown are as printed. The run with no `--after` is as
the issue quotes it from before the change.

## Tests

Both after the rebase on `origin/main` at `d7cc9ed9` and after the last edit of the tool and its test file;
the suite's run ended 12:50:35 CEST by `date`, before this section of the record was written.

```
$ bun test ./tests/tools/token-checks.test.ts
 13 pass
 0 fail
Ran 13 tests across 1 file.
$ tests/tools/suite.sh
 612 pass
 0 fail
Ran 612 tests across 63 files. [94.01s]
```

Four of the 13 are new. A run of the suite before that rebase (ended 12:48:14 CEST) gave 601 pass
and 1 fail in 62 files: the third test of `tests/tools/reviewer-brief-waits-on-show.test.ts`, which
reads the reviewer's brief as the Brain has it. `d7cc9ed9` (`wt-4-reviewer-in-a-view`) had put a new
brief and landed that test's new lines, and the worktree did not yet have them.

## Not tried

- `checks` called by another program with `after: NaN`. The refusal is where the argument is read;
  `checks` itself still answers a pass for a `NaN`, with `afterN` 0 and so with the new words.
- `--json` beside a refused flag, and the words of `text` are not in `--json`: one run,
  `--after 99999 --json`, printed `"afterN":0` and `"after":99999` at 4031 events. No test reads `--json`.
- A number of more than 15 digits. It is accepted and made a float; every such N is past the last event.
- `--token` given a flag as its value (`--token --after`): as before, the tool's first refusal.
- `--after` given twice: the first is read, as `arg` reads `--token`.
