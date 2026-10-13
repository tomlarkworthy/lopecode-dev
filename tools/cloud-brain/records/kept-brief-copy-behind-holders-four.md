# The kept copy of the reviewer's brief is the Brain's again, and its test finds the files that hold it (`kept-brief-copy-behind-holders-four`)

Written 2026-10-13 by the writer of the issue (token `impl-85813d`, `start` at event 5942). The issue was filed by
the overseer `over-1580e3`. No seed, no deploy, nothing put on the Brain. Every run below was made in the worktree
`bm-kept-brief-copy` (bun 1.4.0, macOS, the shell zsh). The runs under "What was wrong, seen" were made before the
change, in calls whose `date` read 06:59:31 to 07:02:02 CEST; those under "The runs" after the rebase of step 9,
from 07:05:59 to 07:08:34 CEST.

## What was wrong, seen

**The copy was behind.** With the test of "What changed" added and nothing else changed:

```
$ BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
Expected: "47118 characters, the same as https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md"
Received: "43869 characters, not the same from line 72 as https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md"
(fail) BRAIN=<address>: the kept copy is what that Brain serves
 6 pass
 1 fail
```

`shasum -a 256` of the copy was `4d40ac520af4…`, 482 lines, and of what cb4 served `98465b6e1166…`, 510 lines,
47,164 bytes, as the issue has them. `diff` of the two printed 40 lines that begin `<` or `>`.

**The list was by hand.** With the new test of the list and the list as it was (four names):

```
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
+   "reviewer-brief-post-mortem.test.ts",
+   "reviewer-brief-q3-what-exists.test.ts",
(fail) a test file that calls briefOf imports it from reviewer-brief.ts, and so is among the files run below
 5 pass
 1 fail
```

Two files were missing, not four. The issue's `grep -l -F 'from "./reviewer-brief.ts"'` gives 8 files; two of
them are not holders. One is `reviewer-brief-kept-copy.test.ts` itself. The other is
`overseer-pre-put-run.test.ts`, which has those words in a string it searches other files for, imports nothing
from the reader and reads `agents/overseer.md`. A grep for the import as a line gives 7, and 6 without the test
of the copy:

```
$ grep -l -E '^import [^;]* from "\./reviewer-brief\.ts";$' tests/tools/*.test.ts | wc -l     7
$ grep -l -F 'from "./reviewer-brief.ts"' tests/tools/*.test.ts | wc -l                        8
```

## The choice

The issue left the third part of "Done when" to the writer: something says who writes the copy again after a
put, or something fails when the copy and the Brain differ.

| Way | Cost |
|---|---|
| A test of the suite that fetches the brief and compares | The suite's count at a commit moves with each put again. `suite-tests-read-the-live-brief` took this out, and its record has the three reports. |
| A check in `land.sh` | Every writer's landing fails after an overseer's put until someone writes the copy, for a change that is not theirs. Not built. |
| The one that puts writes the copy, with a test that runs only when asked and fails when they differ | The check is run by a step of a brief, so a put by someone who skips the step leaves the copy behind as before. |

The third was taken (`philosophy.md`, line 2: the smaller side, easy to undo). It is both halves of the issue's
"or", each partly: a step that names who, and a failing test that the step runs. Nothing runs that test
unasked. That is said under "Not tried".

## What changed

Six files and this record.

- `tests/tools/fixtures/reviewer-brief.md`: the brief as cb4 served it at 07:02:02 CEST, written by the line
  the overseer's brief now has (`curl -sf … -o`, exit 0).
- `tests/tools/reviewer-brief-kept-copy.test.ts`:
  - `HOLDERS` is every `*.test.ts` of the directory, but this file, with a line
    `import … from "./reviewer-brief.ts";`. Six on the day.
  - The last test is named "every file that holds the brief passes where fetch throws". It runs the holders in
    one `bun test` with the preload `fixtures/no-fetch.ts` and expects `across <n> files` in its output, with n the
    number of files it gave. `lock.test.ts` is still run for its one test of the brief, by
    a map `ONE_TEST` of file to test name: it calls `fetch` for stand-ins of its own.
  - A new test: the files that call `briefOf(` are the files of `HOLDERS`, and the two the list of four left
    out are among them by name.
  - A new test that exists only when `BRAIN` is set: the copy is, character for character, what that Brain
    serves, and the message names the first line that differs. With no `BRAIN` the file has 6 tests and with
    it 7, so the suite's count is the same whatever the Brain has.
- `tests/tools/reviewer-brief.ts`, the header only: it no longer names a hash, a size and a time of the copy
  (they were of three puts before), and says who writes the copy again and the two commands.
- `.claude/skills/brain-maintenance/agents/overseer.md`, "What you may do", after the run before a put: after
  the put the overseer writes the copy with `curl -sf`, runs the test of the copy with `BRAIN=`, and commits
  that one file, landed with its entry. It says this is none of its 2 edits.
- `.claude/skills/brain-maintenance/agents/implementer/seed-tests.md`: one sentence, that an overseer writes
  the copy after its put.
- `tests/tools/overseer-pre-put-run.test.ts`: a fifth test, which holds the three commands of that step in
  their order, that the path of the `curl` is the `PATH` of `reviewer-brief.ts`, and that the test the step
  names is a test of `reviewer-brief-kept-copy.test.ts` by that name. With `agents/overseer.md` as it was:
  4 pass, 1 fail.

`agents/overseer.md` is not the overseer's to edit, and the issue this one follows,
`overseer-pre-put-run-names-four-files`, was labelled `major` for its edit of that file. This issue has no such
label. The edit adds a step and takes none out.

## The runs

```
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md | shasum -a 256
98465b6e1166d652e6d1a36f6ad27d3cec219ad61e6b9cc156105c89f9517718  -
$ shasum -a 256 tests/tools/fixtures/reviewer-brief.md
98465b6e1166d652e6d1a36f6ad27d3cec219ad61e6b9cc156105c89f9517718  tests/tools/fixtures/reviewer-brief.md
$ wc -l -c tests/tools/fixtures/reviewer-brief.md                                     510   47164

$ bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
 6 pass, 0 fail      Ran 6 tests across 1 file.
$ BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
 7 pass, 0 fail      Ran 7 tests across 1 file.
$ bun test --timeout=30000 ./tests/tools/overseer-pre-put-run.test.ts
 5 pass, 0 fail      Ran 5 tests across 1 file.
$ bun test --timeout=30000 --preload ./tests/tools/fixtures/no-fetch.ts <the five holders but lock.test.ts>
 33 pass, 0 fail     Ran 33 tests across 5 files.
$ BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 $(grep -l -E 'briefOf|reviewer-brief' tests/tools/*.test.ts | sed 's|^|./|')
 85 pass, 0 fail     Ran 85 tests across 10 files.
$ tests/tools/suite.sh
 1090 pass, 0 fail   Ran 1090 tests across 110 files. [117.81s]
```

The fifth line is the overseer's list of before a put, with `BRAIN=` in the place of `BRIEF=`: it answers the
issue's "Whether `BRAIN=` still reads the live brief" for these ten files on this day. The same list with
neither variable was 84 pass in 10 files before the rebase (one fewer: the test that `BRAIN` adds).

Two more, before the rebase and not run again: `BRAIN=http://127.0.0.1:1` on the new test alone, 0 pass and
1 fail on the connection; `BRAIN=` (empty), 6 pass in 6 tests.

The issue's other "Not looked at", which of the files hold a line the three puts changed: none of the six
failed on the new copy, and no test was changed to make one pass.

## Not tried

- **The overseer's step, by an overseer.** Its three commands were run by this writer: the `curl` as written
  with `$W` this worktree, the `BRAIN=` run as written, and a commit of the fixture among the other files of
  this change, not alone and not with the step's message. No overseer has followed the step, and no put was
  made.
- **A put by another than an overseer.** A writer whose task puts the brief is told by the header of
  `reviewer-brief.ts` and by `seed-tests.md`, as before; nothing checks it. The orchestrating session's brief,
  `SKILL.md`, was not changed.
- **A copy that is behind, found with nobody asking.** The suite still passes on a copy of before. The `BRAIN=`
  run is the one thing that fails, and only a step of a brief runs it.
- **`curl -sf` on a status that is not 200.** `-f` is there so that an error's body is not written over the
  copy. Not seen: cb4 answered 200 each time.
- **A seventh holder that calls `fetch` itself.** It would fail the last test until it has a line in
  `ONE_TEST`. No such file was made to see the failure.
- **The reviewer's brief on the Brain** was read and copied, not edited. Its two sentences of step 4 that
  `seen-reviewer-brief-names-a-json-line` reports were mended by the put of 06:54, by the issue; the copy now
  has that text (`grep -c 'JSON line'` of it prints 2, lines 179 and 181).

## Searches

| Words | First answers | Used |
|---|---|---|
| "kept copy of the reviewer brief behind the Brain" | `doc:cloud-brain-lean-reviewer-persona`, `doc:cloud-brain-texts-not-read-again-after-a-change`, `doc:cloud-brain-post-mortems-declared-and-kept` | None. |
| "test fails when a fixture differs from what the Brain serves" | `doc:cloud-brain-backlog`, `doc:cloud-brain-deploy-verdict-from-a-shared-page`, `doc:cloud-brain-dev-agents` | None. |

What bore on it was found by `git grep -n -F 'kept copy'`: `records/suite-tests-read-the-live-brief.md`, "The
choice", which is why no test of the suite fetches, and `records/overseer-pre-put-run-names-four-files.md`,
whose test finds the holders by their import, as `HOLDERS` now does.
