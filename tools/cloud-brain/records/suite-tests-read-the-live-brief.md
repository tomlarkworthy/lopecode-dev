# suite-tests-read-the-live-brief

2026-10-12. Four test files of `tests/tools` read the reviewer's brief from a copy kept in the repository,
where they fetched it from cb4. No seed, no deploy, nothing put on the Brain. Every run below was made in the
worktree of this issue, on one machine (bun 1.4.0, macOS), by the writer, with neither `BRAIN` nor `BRIEF` in
its environment (`env | grep -c -E '^(BRAIN|BRIEF)='` printed 0). Times are CEST, read from `date`.

## What was wrong

The brief is a file of the Brain, `/static/cloud-brain-dev/roles/reviewer.md`, changed by `put.sh` and by no
commit. `reviewer-brief-waits-on-show.test.ts`, `reviewer-in-a-view.test.ts` and
`reviewer-brief-names-token.test.ts` each fetched it when `BRIEF` was not set, and the last test of
`lock.test.ts` fetched it always. So a test file of one commit was run against the brief of another hour.

Reproduced between 13:29:10 and 13:34:15, with the worktree at `96b73640`: the test file at `ee2c86fc` (on
`origin/main`; `d7cc9ed9`, which changed the file for the put of 12:44:50, is a later commit), against the brief
cb4 served.

```
$ git show ee2c86fc:tests/tools/reviewer-brief-waits-on-show.test.ts > tests/tools/zz-old-waits.test.ts
$ bun test ./tests/tools/zz-old-waits.test.ts
  expect(lines(s, /fetch origin/).map((l) => l.trim())).toEqual(["git -C <checkout> fetch origin"]);
  -   "git -C <checkout> fetch origin",
  +   "machine. A fetch writes refs only, and it is that line as written: in a view a plain `git fetch origin` enters",
(fail) after the wait it fetches and compares against a build of origin/main, not HEAD and not a lopebooks commit
 4 pass
 1 fail
```

That is the count the issue quotes from review 4046 of `wt-4-reviewer-in-a-view` for that file at that commit. The temporary
file was removed after the run. The second way the count moved, a Brain that does not answer, in the same span
and before any edit:

```
$ BRAIN=http://127.0.0.1:1 bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts \
    ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/reviewer-brief-names-token.test.ts
 5 pass
 14 fail
```

## The choice

The issue left open whether such a test should hold the brief at all, or a kept copy beside a check that the
Brain has the same text. Triage gave the measure: "the suite's count at a commit should not change with the
Brain". Three ways, held against it:

| Way | The count at a commit | Cost |
|---|---|---|
| Fetch, and say in the briefs that a fail may be the Brain's | moves with each put | what the issue reports |
| Fetch, and skip when the Brain's text is not the one a kept hash names | moves, from pass to skip | a skip at `origin/main` after each put by the overseer, three on 2026-10-12 |
| Read a copy kept in the repository; the Brain only when asked | does not move | the copy can be behind the Brain, and no run of the suite says so |

The third was taken (`philosophy.md`, line 2: the smaller side, easy to undo; it is one file and one helper).
A check in the suite that the Brain has the same text as the copy was left out: it is the first row again.

What the third gives up: until this change a run of the suite at `origin/main` read the brief as it was that
minute. That read is now the run on the edited file before a put, which `agents/overseer.md` did not have
written and now has.

## What changed

- `tests/tools/fixtures/reviewer-brief.md`: the brief as cb4 served it at 13:34:15, 37,481 bytes, 416 lines
  (`wc -c`, `grep -c ""`), sha256 `52bfc2e502e70587358dddad68acfb8c8cfe0abfd658fb022d1cb7141b6a00a3`. `cmp`
  with the file `cloud-brain-dev/put.sh --get roles/reviewer.md` wrote, between 13:34:15 and 13:36:57, found no difference.
- `tests/tools/reviewer-brief.ts`, new: `briefOf(env)`. `BRIEF=<file>` reads that file; otherwise
  `BRAIN=<address>` fetches the brief's path from that address, and a status that is not 200 is an error;
  with neither it reads the kept copy. Its header has the line that writes the copy again.
- The three files of the brief call it in place of their own fetch. `BRIEF=<file>` does what it did. `BRAIN`
  was the address to fetch from and had cb4 as its default; it now has no default, and with it unset
  nothing is fetched.
- `lock.test.ts`, its last test (R3 of `plan/cloud-brain-locks-held-in-the-cluster.md`): it calls `briefOf()`
  too. It no longer prints `skipped: … did not answer` and passes without reading: there is no fetch to fail.
- `tests/tools/fixtures/no-fetch.ts`, new: a preload in which a call of `fetch` throws.
- `tests/tools/reviewer-brief-kept-copy.test.ts`, new, 5 tests (below).

Lines that spoke of the old behaviour, found with the search of step 11 of the writer's brief (`BRIEF=` 8 lines,
`reviewer-brief-` 53, `roles/reviewer.md` 52, `only copy` in the two places below), and mended here:

- `.claude/skills/brain-maintenance/agents/reviewer.md`: "the only copy" is "the only copy an agent follows",
  with the kept copy named.
- `cloud-brain-dev/README.md`, the same sentence.
- `agents/overseer.md`: the run of the four files on the edited brief before a put, with its command.
- `agents/implementer.md`, step 6: that these tests read the kept copy, and who writes it again.
- `plan/cloud-brain-locks-held-in-the-cluster.md`, R3's row: an "As built" note. The sentence stays.

The lines in `tools/cloud-brain/records/` are records of their day and were left.

## The tests

`bun test ./tests/tools/reviewer-brief-kept-copy.test.ts`: 5 pass, 0 fail.

1. With neither variable `briefOf` gives the kept copy's bytes, with `fetch` replaced by a function that
   counts and throws: 0 calls. The same with both variables set to the empty string.
2. `BRIEF=<file>` reads that file, and a stand-in Brain given as `BRAIN` beside it is asked nothing. A file
   that is not there is `ENOENT`.
3. `BRAIN=<stand-in>` asks the stand-in for `/static/cloud-brain-dev/roles/reviewer.md`, with or without a
   `/` at the end of the address. A stand-in that answers 404 is the error `… answered 404`.
4. No `.ts` file of `tests/tools` but `reviewer-brief.ts` has the brief's path in it, and each of the four
   files imports the helper.
5. `bun test --preload ./tests/tools/fixtures/no-fetch.ts` of the three files exits 0 with `0 fail`, and of
   `lock.test.ts -t "R3: the reviewer's brief"` with `1 pass`. Only that test of `lock.test.ts` is run this
   way: the others call their own stand-in with `fetch`.

With the four files as `HEAD` had them and the new files in place (each written back from
`git show HEAD:<file>`, then restored from a copy):

```
(fail) no file of tests/tools names the brief's address but reviewer-brief.ts
(fail) the four files that hold the brief pass where fetch throws
 3 pass
 2 fail
```

After the change, between 13:34:15 and 13:36:57:

```
BRIEF=<W>/cloud-brain-dev/brain/roles/reviewer.md bun test <the four files>    43 pass, 0 fail   (the command of overseer.md)
BRAIN=https://cb4.endpointservices.workers.dev bun test <the four files>       43 pass, 0 fail
BRAIN=http://127.0.0.1:1 bun test <the three files of the brief>               5 pass, 14 fail  (asked for, and not there)
bun test --preload ./tests/tools/fixtures/no-fetch.ts <the three files>        19 pass, 0 fail
BRIEF=<an empty file> bun test ./tests/tools/reviewer-brief-names-token.test.ts  1 pass, 3 fail
```

The whole suite, `tests/tools/suite.sh`, 13:42:34 to 13:44:04, at `d448fbae` (the change as it is on
`origin/main`): 618 pass, 0 fail, 64 files, no `skipped:` line.

Two runs before the landing, at 13:36:57 and at 13:39:55, printed 618 pass, 0 fail in 65 files. The 65th was
an empty file of the writer's own making: a loop over a shell variable of four file names, which zsh does not
split, wrote `tests/tools/<the four names with spaces between>` at 13:35, a name that ends `lock.test.ts`. It
was untracked, was not committed (`git ls-files 'tests/tools/*.test.ts' | wc -l` printed 64 with it there),
and was removed before the run of 13:42:34. `worktree.sh --list` named it after the landing: `untracked=1`.

## Not done, not tried

- **A put of the brief after this change.** None was made. That a put moves no count is shown by the two
  stand-ins (a `fetch` that throws, and none called), not by a put.
- **A worktree or a view at a commit before this one.** Its test files still fetch, and still fail after a put
  that changes a line they hold. The issue's own "not run", the suite at a commit before `d7cc9ed9`, was not
  run here either; one file of `ee2c86fc` was, above.
- **The copy behind the Brain.** Nothing in the suite compares them. After a put that changes no test, the copy
  is the text of before, and the tests pass on it. `BRAIN=https://cb4.endpointservices.workers.dev bun test …`
  is the read of today's.
- **A reviewer reading a kept copy of before** (`cloud-brain-dev-history/` answers 401 to its token; the
  issue, and `seen-view-suite-reads-linked-notebook` item 3). Not changed. For the tests it is no longer
  needed: a view has the copy of its commit in `tests/tools/fixtures/`.
- **The reviewer's brief on the Brain.** Its step 4 has a paragraph, "A test there that reads this brief from
  the Brain …", which is untrue for a view at this commit or later. A writer of an issue that is no task of
  an approved spec does not put a brief (`rules.md`, "The files of the Brain an agent reads"): the paragraph
  and its mend are in the comment on the issue, for the overseer. The kept copy has the paragraph as it is.
- **`BRIEF=` in `tests-tools-suite-parallel.test.ts` and `overseer-md-order-of-service-reads.test.ts`** names
  another brief there (`implementer.md`, `overseer.md`). Left: with `BRIEF=<file> tests/tools/suite.sh` those
  files read the reviewer's brief as theirs, as `records/wt-4-reviewer-in-a-view.md` says (6 fail).
- **A `BRAIN` in an agent's environment.** None of the loop's tools exports one that was found
  (`grep -n 'BRAIN\b' cloud-brain-dev/agent.sh` prints nothing; `put.sh` sets it for itself). With one set,
  these files fetch from it.
