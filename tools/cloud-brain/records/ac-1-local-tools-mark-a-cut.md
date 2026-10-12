# ac-1-local-tools-mark-a-cut

2026-10-12. Task 1 of `plan/cloud-brain-answers-cut-and-not-said.md` (approved at event 4147). Two
local tools, one new file they share, and their tests. No seed, no deploy, no call on cb4.

## What changed

`tools/cloud-brain/cut.ts`, new, one function, the text of `cloud-brain-dev/test.ts`'s:

```ts
export const cut = (text: string, n: number, whole = false) =>
  whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`;
```

`tab-tests.ts` and `verify-run.ts` take `--whole` and call `cut` where they had `.slice(0, N)` on a
text. The seven places, by the line each had at `1b0d0553` (the spec's table, read again there with
`grep -n "slice(0, [0-9]*)"`):

| File, line | What is cut | At | In |
|---|---|---|---|
| `tab-tests.ts` 85 | a failed test's message | 400 | `runTests`, which runs in the page |
| `tab-tests.ts` 112 | a page error | 160 | `main` |
| `tab-tests.ts` 124 | the first line of why a cell did not emit | 300 | `main` |
| `verify-run.ts` 124 | a failed test's message, in the summary's count by test | 200 | `judge` |
| `verify-run.ts` 197 | a page error | 160 | `main` |
| `verify-run.ts` 207 | why a run had no verdict, first line | 200 | `main` |
| `verify-run.ts` 211 | a failed test's message, in a run's line | 160 | `main` |

After the edit the same grep prints no line of a text in either file (what is left is a hash at 12,
`errors.slice(0, 3)` and the header's quote of `brain-shell`).

- `runTests` is passed to `page.evaluate`, where an import is not in scope. It takes `whole` in its
  argument and has the expression written out in its body. A test holds its text equal to `cut`'s.
- `judge` takes `whole` beside `module` and `expect`. `main` is its one caller in the tool.
- In `verify-run.ts` a message's runs of white space are made one space before the cut, as before, so
  the mark's second number is the length after that.
- `--whole` takes no value. `--whole=1` is exit 64 with `--whole takes no value` and the usage, in
  both tools (run by hand after the edit). The usage line of each ends `[--whole]`.
- A text at its bound or under it is printed as before, so a line with no long text is unchanged.

The header of `verify-run.ts` says what its mark does not cover: a failed test's message reaches the
tool from `brain-shell`, which keeps the first 300 characters and marks nothing (`brain-shell.ojs`
line 163, `message: String((e && e.message) || e).slice(0, 300)`, read at `1b0d0553`). So "of N" in a
mark of `verify-run.ts` is the length of what the tool received, and `--whole` prints that. The cut in
`brain-shell` is not in this task (the spec, "The local tools").

## Tests

`bun test ./tests/tools/tab-tests.test.ts ./tests/tools/verify-run.test.ts ./tests/tools/cut.test.ts`
in the worktree, the check the spec names:

```
with cut.ts, and the two tools as at 1b0d0553 (20:23 CEST)    29 pass, 9 fail, 38 tests in 3 files
after the edit (20:24 CEST)                                    38 pass, 0 fail
```

Before `cut.ts` was written the three files failed to load (`Cannot find module … cut.ts`, 0 pass).
The 9 that failed:

- `cut.test.ts` is new, 3 tests, none among the 9: a text at the bound, one over, and `whole`.
- `tab-tests.test.ts`, 3 new and 1 changed. With a real `@observablehq/runtime` and no browser: a
  message of 400 characters is as it was, one of 401 ends `… (cut: 400 of 401 characters; --whole
  prints all)` and equals `cut(message, 400)`, and `runTests({ …, whole: true })` gives it whole. Two
  tests run the tool in a headless Chrome on a page of the shape `runTests` and `emitCell` read (a
  stand-in for the runtime, written in the test; no notebook): a test's message of 401, a page error
  of 161 and a first line of 301 of why a cell did not emit, each with its mark, and each whole with
  `--whole`. The changed one is the arguments: `whole: false` in what `parseArgs` answers, `--whole`
  before and between the others, and `--whole=1` thrown.
- `verify-run.test.ts`, 4 new and 1 changed. `judge` with a message of 200 and of 201 after its white
  space is made one space, and with `whole: true`. Three run the tool in a headless Chrome against
  the file's stand-in for the Brain: a failed test's message of 201 (cut at 160 in the run's line
  and at 200 in the summary) with a page error of 161, and both whole with `--whole`; a message of
  161, cut in the run's line and whole in the summary; and a run with no verdict whose first line is
  201, with its mark and whole with `--whole`. The changed one is the arguments, as above.

Two of those texts begin with words Playwright puts before the page's message (`evaluate: Error: `
for an emit that throws, `forFunction: Error: ` for a predicate that throws, as the tool printed them
on 2026-10-12 with Chrome 151.0.7922.34). The tests name them in a constant and assert the `--whole`
text first, so another prefix fails there by name.

The whole directory, `tests/tools/suite.sh` in the worktree after the last edit of a tool or a test,
20:25:49 to 20:27:22 CEST:

```
667 pass, 0 fail, 667 tests in 67 files, 92.97 s
```

No line `skipped:` in its output.

One run of the edited `tab-tests.ts` on a build of the worktree
(`bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`, then
`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-static`):
`"tests":12,"passed":12,"failed":[]`, exit 0, and the same with `--whole`. So `runTests` as edited
runs in the page of a real notebook; no test of that module failed, so no mark was printed there.

## Not tried

- `verify-run.ts` against cb4, with or without `--whole`. Its tests run it against a stand-in on
  127.0.0.1.
- A real failed test of a module of the Brain over 400 characters in `tab-tests.ts`. The long
  messages are the tests' own.
- A message of more than 300 characters through `brain-shell`: the stand-in's verdict is written by
  the test and is not cut at 300.
- `--whole` with a text of megabytes.
- A text with a character outside the Basic Multilingual Plane at the bound: the cut and both numbers
  are of UTF-16 units, as `slice` and `length` are, and a pair may be split.
- The other cuts of the spec's "What else cuts" (`brain.ts`, `cloud-brain-dev/test.ts` line 71,
  `all.ts`): not in this task.
- bun other than 1.4.0, and Playwright's prefixes with another Chrome.
