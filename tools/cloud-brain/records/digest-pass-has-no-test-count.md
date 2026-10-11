# digest-pass-has-no-test-count

2026-10-11. One line of `.claude/skills/brain-maintenance/rules.md` and a test file that reads it.
No seed, no build, no deploy. The issue is `major`: the line is the owner's, and after review it
waits for his approval.

## What was wrong

`rules.md`, Never, as it stood:

```
- Submit, or record a `pass`, without a test count from a run you made yourself.
```

`digest-2026-10-11` was the first digest through the loop. Its submit (event 401) gave "55
variables, 0 errors, 216 items, 28 of 28 picks", its review (404) said "No tests exist for a
digest; none were run", and it passed (405). Both agents followed their briefs:
`agents/digest.md` step 8 has the writer "count the same four numbers there; they are the ones you
report". So the line and the briefs disagreed, and each daily digest would cross a Never line.

The overseer filed it (event 413) with two sides: an exception for the label `digest`, or a
`test_*` cell in each digest. The orchestrator put three choices to the owner (event 1085).

## What the owner said

Event 1093, `by.via: "session"`, `tab: true`, at 1791734245726 (2026-10-11 17:57:25 CEST,
`date -r 1791734245`):

> the test is clearly that the digest was published. Maybe say confirmation of action can be a test if the task does not have tests.

He took `needs-owner` off himself in event 1094. This is the first side made general: no
exception for one label, a sentence for any task with no tests.

## What changed

Commit `5aa0ea0c` (2026-10-11 18:00:53 +0200, `git log -1 --format=%ci`). The line now reads:

```
- Submit, or record a `pass`, without a test count from a run you made yourself. For a task that
  has no tests, a confirmation that the act happened is the test: it is made by you, where the
  act took effect, and what you counted there is the count you give. (Tom, 2026-10-11, event 1093
  of `digest-pass-has-no-test-count`, of a digest submitted and passed with no tests: "the test is
  clearly that the digest was published. Maybe say confirmation of action can be a test if the
  task does not have tests.") For a digest that is the four numbers of `agents/digest.md` step 8,
  counted at the library address. The reading from here is the writer's, not his words: a
  confirmation another agent made is not yours, and a change to a file is not such a task, since
  a test can be written for it (`agents/implementer.md`, "The tracker's write calls").
```

Three parts of it are not his words. (As first written this sentence ended "and the line says
which". The line marked one of the three; review 1148 found it, and round 2 below changed the line.)

- "made by you, where the act took effect" keeps the first sentence's "a run you made yourself".
  Without it a submitter could cite a count another agent made.
- The digest's four numbers. `agents/digest.md` step 8 already has them; the line points there
  and that brief is not changed.
- "a change to a file is not such a task". `agents/implementer.md` already says a doc alone
  "still needs a count for the submit: a test file under `tests/`". Without this sentence the new
  one could be read as ending that. This change is itself a doc alone and has its test file.

The other side, a `test_*` cell in each digest, was not built. The owner's answer names the
publication as the test. It would have cost a change to `digests/build.ts` and both briefs.

## The test

`tests/tools/rules-count-for-a-task-with-no-tests.test.ts` reads the item of the Never list that
starts "- Submit, or record a `pass`" and holds five things: the helper that cuts one item out of a
list; the first sentence is still there; the clause for a task with no tests; the owner's words with
the date and the event; and that step 8 of `agents/digest.md`, which the line names, still has the
four numbers counted at the library address.

Run in the worktree, 2026-10-11, by the writer:

```
bun test ./tests/tools/rules-count-for-a-task-with-no-tests.test.ts
  before the edit to rules.md   2 pass  3 fail   7 expect() calls
  after                         5 pass  0 fail  13 expect() calls
bun test ./tests/tools          181 pass  0 fail  1437 expect() calls, 21 files
```

The 2 that passed before the edit are the helper and the first sentence, which the edit keeps.

The test reads words. It fails when the sentence or the quote is taken out of the line, and when
step 8 loses its count. It does not show that an agent follows the line.

## Not tried, and not covered

- `seen-brief-edit-submitted-no-count` (linked; read from the overseer's comment here, event 962,
  which names events 851, 872 and 887; those were not read): the overseer edits a brief
  and runs the tests, and the orchestrator submits because the overseer may not move an issue.
  There a count exists and the submitter did not make it. The owner's words are about a task with
  no tests and do not answer that. By the line as it now reads such a submit still crosses it. Not
  changed here.
- The reviewer's brief. Since commit `35a6da21` it is a file of the Brain, put by the overseer with
  `loop-roles` (`rules.md`, "The files of the Brain an agent reads"). It was not read or changed.
  If `rules.md` is also kept there, that copy is the overseer's to put; this change is the file
  in `lopecode-dev` alone.
- `philosophy.md`, Clarifications. The orchestrator adds the owner's quotes there; the writer does not.
- No digest has been submitted under the new line. The next one, `digest-2026-10-12`, is the
  first that can be read against it.
- Prior art, `knowledge.search?semantic=true` with three queries ("test count for a task with no
  tests", "confirmation of an action as a test", "digest published library count"): the answers
  were the modules `@tomlarkworthy/tester` and `@tomlarkworthy/tests`, a paper on test-time world
  models and the digest of 2026-10-11 itself. None bore on the wording of a rule.

## Round 2, 2026-10-11

The submit of round 1 was event 1116 (18:01:55 CEST). Review 1148 (18:07:32) sent it back with two
findings, both in the words; it got the same test counts.

**1. The marker covered one part of three.** The line's one marker, "The reading from here is the
writer's, not his words:", stood after "it is made by you, where the act took effect" and after the
digest's four numbers. The first of those stood directly before "(Tom, 2026-10-11, event 1093 …)"
and read as what he said. The record said the line marked all three. The reviewer cut the marker
from the line and round 1's test gave 5 pass 0 fail: nothing held it.

**2. The closing reading left out the digest.** "a change to a file is not such a task, since a
test can be written for it": a digest adds `tools/cloud-brain/digests/<day>.ojs`, and the issue's
own body proposes a test for it. So the sentence before said a digest is such a task and this one
said it is not. The owner's condition is "does not have tests"; the sentence had made it "a test
can be written".

Commit `e62efcd3` (2026-10-11 18:10:35 +0200). The item now reads:

```
- Submit, or record a `pass`, without a test count from a run you made yourself. Tom, 2026-10-11,
  event 1093 of `digest-pass-has-no-test-count`, of a digest submitted and passed with no tests:
  "the test is clearly that the digest was published. Maybe say confirmation of action can be a
  test if the task does not have tests." The rest of this item is the writer's reading, not his
  words. When a task is an act (a notebook published, a message sent) and has no tests, the
  confirmation that the act happened is the test: it is made by you, where the act took effect,
  and what you counted there is the count you give. A confirmation another agent made is not
  yours. A digest is such a task, though it also adds a seed: its act is the publish, and its
  count is the four numbers of `agents/digest.md` step 8, counted at the library address. A task
  that ends with the files it changed, nothing published and nothing sent, is not: a doc alone
  still gets a test file (`agents/implementer.md`, "The tracker's write calls").
```

Before the marker: the rule as it stood before this issue, and his words. After it: every sentence
is a reading. The other way, to leave the line and correct the record's sentence, was not taken:
the owner approves the line as it reads, and he would have read "made by you, where the act took
effect" as his own.

For finding 2 the reading names the act and not the file, as the review suggested. A consequence:
"is an act … and has no tests" is narrower than his "the task does not have tests". A task that is
neither an act nor a change to files is not named by the item. None is known.

The test file was rewritten to hold what the reviewer showed it did not. It compares the text
before the marker with the rule and the quote, letter for letter, and reads the sentences after it.
Run in the worktree by the writer, 2026-10-11:

```
bun test ./tests/tools/rules-count-for-a-task-with-no-tests.test.ts
  against the line of 5aa0ea0c (git stash of rules.md)   3 pass  3 fail
  against the line of e62efcd3                            6 pass  0 fail  17 expect() calls
bun test ./tests/tools                                    186 pass  0 fail  22 files
```

The line altered ten ways, one a run, the same command (of 6 tests):

```
marker cut                               5 pass 1 fail
marker moved to the end                  5 pass 1 fail
'made by you' cut                        5 pass 1 fail
another-agent sentence cut               5 pass 1 fail
digest sentence cut                      4 pass 2 fail
doc-alone sentence cut                   4 pass 2 fail
owner's quote cut                        5 pass 1 fail
first sentence widened                   5 pass 1 fail
a reading put before the marker          5 pass 1 fail
round 1's closing sentence put back      5 pass 1 fail
```

Round 1's test passed all of its 5 on three of these in the reviewer's run: the marker cut, both
closing readings cut, the first sentence widened.

Not tried in round 2: a sentence added after the marker that contradicts the rule is not caught,
since the test reads for sentences there and does not compare the whole. The "Not tried" list of
round 1 stands, but for one line the review settled: no copy of `rules.md` is kept on the Brain
(the reviewer read `brain/index.md`, which lists `roles/reviewer.md` alone).
