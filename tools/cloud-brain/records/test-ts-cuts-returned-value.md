# test-ts-cuts-returned-value

2026-10-12. A local tool (`cloud-brain-dev/test.ts`), two lines of its documents there, and a test file
in `lopecode-dev`. No seed, no deploy, no call on cb4.

**Not in force.** The change to `test.ts` is commit `79d3ff5` of the repository `cloud-brain-dev`, on
the branch `test-ts-cuts-returned-value` there (on `3801492`, its `main`), and it is not pushed. A push
to that repository needs a write token of the owner's session (comment 2250 of
`agent-sh-read-whole-before-run`, whose branch waits the same way). Until the push, and until the
pointer in `lopecode-dev` moves, the `test.ts` every writer and reviewer runs is the one that cuts
with no mark.

## The defect, made again

`test.ts` at `3801492`, lines 91 and 92: `String(value).slice(0, 120)` and `.slice(0, 600)` of an
error's message. A probe cell put into a copy of the deployed `brain-git` module, returning 1421
characters of JSON, run with `bun test.ts brain-x-git --with <copy>` on that file (05:50 CEST):

```
7 passed   test_probe: 120 characters, ends   row4"},{"i":5,"n
```

Nothing in the line says the other 1301 were there.

## What changed

In `test.ts`, one function and one flag (7 lines added, 2 removed):

```
const whole = rest.includes("--whole");
const cut = (text, n) => (whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`);
```

The same probe on `79d3ff5`:

```
default    7 passed   test_probe: 171 characters, ends   {"i":5,"n… (cut: 120 of 1421 characters; --whole prints all)
--whole    7 passed   test_probe: 1421 characters, ends  {"i":58,"name":"row58"},{"i":59,"name":"row59"}]
```

`--whole` before `--with` gave the same 1421. `brain-x-git` as deployed, no probe: 6 passed, 0 failed,
the longest value 96 characters, so no mark.

The cut stays the default. The issue left that to the writer; the two other ways:

- No cut at all. One test's value of some megabytes is then in every report, and `all.ts` reads each
  service's report into memory. No value of that size was looked for.
- A separate field (`cut: 1421`) beside an unchanged `value`. The reviewers who lost a run read the
  line by eye, and a mark where the text stops is in front of them.

The first 120 characters of a cut value (600 of an error) are what they were, with the mark after
them, so a cut value is 120 characters, the mark's 47 and the digits of its length: 171 above, with 1421.
`all.ts` reads `name` and `state` of a test and neither text (`all.ts`, line 21).

`README.md` there has a paragraph on `value`, `error`, the mark and `--whole`; `AGENTS.md` one line
in "The loop of a change". Both are in `79d3ff5`.

## Tests

`tests/tools/test-ts-cut.test.ts`, new, three tests. It copies the `test.ts` under test beside a
`deploy/` of one module it writes (cells that return 120, 121 and 5000 characters and `undefined`,
and throw messages of 600 and 601), with the runtime and the bootloader the repository commits, so it
reads no service of the checkout's `deploy/` and makes no call.

In the worktree after the rebase, 05:51 CEST, `bun test ./tests/tools/test-ts-cut.test.ts`:

```
test.ts of 79d3ff5 (CLOUD_BRAIN_DEV=<a worktree of the branch>)    3 pass, 0 fail, 17 expects
test.ts of 3801492, TEST_TS_MARKS_A_CUT=1                           1 pass, 2 fail
test.ts of 3801492, as any writer runs it                           1 pass, 2 skip, 0 fail
```

The two that fail on `3801492` are the mark (`Expected … /cut.*\b120 of 121\b.*--whole/`, `Received: ""`)
and `--whole` (120 `v` received where 120 `v` and a `W` were expected). The third test passes on both:
120 characters and 600 are printed as they are.

**Two of the three are skipped on `main` until the push.** They run when the `test.ts` under test
has `--whole` in its text, or with `TEST_TS_MARKS_A_CUT=1`. Without the skip every writer's
`bun test ./tests/tools` would have two failures that are not theirs. The skip prints one line that
names the file and the variable. To run them on the fix before the push:
`git -C <root>/cloud-brain-dev worktree add <dir> test-ts-cuts-returned-value` and `CLOUD_BRAIN_DEV=<dir>`.

The whole directory, `bun test ./tests/tools` in the worktree, 05:51 to 05:55 CEST:

```
CLOUD_BRAIN_DEV=<a worktree of the branch>    500 pass, 1 skip, 0 fail, 501 tests in 55 files
as it is (test.ts of 3801492)                 498 pass, 3 skip, 0 fail
```

`CLOUD_BRAIN_DEV` there moves `light-agent.test.ts` to the branch's files as well, which are those of
`3801492` but for `test.ts`, `README.md` and `AGENTS.md`.

`bun all.ts` and `bun all.ts --whole` in a `cloud-brain-dev` at `79d3ff5` with cb4 synced, 05:50 CEST:
`total 372 passed, 0 failed, 44 need a browser`, both.

## For the overseer: the reviewer's brief

The issue also asks that the reviewer's brief name how a probe's answer is read whole. The brief is
on the Brain (`roles/reviewer.md`, changed with `put.sh`), and `rules.md` gives that put to the
overseer or to a writer on a task of an approved spec; this issue is neither's. Not put. The line,
for after the push, where step 4 has "`bun test.ts <worker> --with <copy>`, shows whether a test
fails without the fix" (line 120 of the copy read at 05:40 CEST):

> A probe cell's answer is the `value` of its test in the JSON line. `test.ts` cuts a value at 120
> characters and an error at 600 and marks the cut with the full length; `--whole` prints both whole.

Until the push that sentence is false of the `test.ts` a reviewer has: a probe's answer over 120
characters is read by `console.log` in the cell, as the reviewers of `tm-1-ai-tomarkdown-method` and
`tp-1-topics-append-read` did.

## Not tried

- A real reviewer's run with `--whole`. The probe above is the writer's, on `brain-git`.
- A value that is not a string beyond `undefined`: an object prints as `[object Object]`, as before; the
  cut is of `String(value)`.
- `--whole` with a value of megabytes, and what a terminal or an agent's tool does with such a line.
- A flag given twice. `bun test.ts brain-x-git --with --whole`, no file between, was run: `--with: no file at --whole`, exit 2.
- The 300-character cut of a module that did not load (`test.ts`, line 71 of `79d3ff5`): left as it is,
  with no mark. The issue names the two lines above.
- bun other than 1.4.0.
