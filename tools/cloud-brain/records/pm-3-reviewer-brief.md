# The reviewer's brief has a part "A post mortem" (`pm-3-reviewer-brief`)

Written 2026-10-12 by the writer of the issue (token `impl-15c96a`, `start` at event 5005). Task 3 of
`plan/cloud-brain-post-mortems-declared-and-kept.md`, design part 6. Two puts on the Brain, no seed, no
deploy of a Worker. Every run below was made in the worktree of the topic (bun 1.4.0, macOS). Times are
CEST, read from `date`.

## What changed

**The brief on the Brain**, `/static/cloud-brain-dev/roles/reviewer.md`, put by me with
`cloud-brain-dev/put.sh` and the token `loop-roles` (`rules.md`, "The files of the Brain an agent reads": a
writer whose issue is a task of an approved spec may).

```
$ date                                   Mon 12 Oct 2026 23:02:27 CEST
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md | shasum -a 256
ea4040e63cf191e24630ff8eb6237c48e734977c298cd69caccaa950293de911  -          # cb4, before: the copy I had edited from
$ date                                   Mon 12 Oct 2026 23:02:33 CEST
$ ./put.sh roles/reviewer.md
roles/reviewer.md put; index written                                         # exit 0
$ date                                   Mon 12 Oct 2026 23:02:35 CEST
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md -o tests/tools/fixtures/reviewer-brief.md
$ shasum -a 256 tests/tools/fixtures/reviewer-brief.md
7ee4c3dc1758429a7d2ffbf7186753e963916934b963ae0c80f5fb34c7bed5fe  tests/tools/fixtures/reviewer-brief.md
$ wc -c -l tests/tools/fixtures/reviewer-brief.md
     467   42656 tests/tools/fixtures/reviewer-brief.md
$ ./put.sh --history roles/reviewer.md | tail -1
2026-10-12T21-02-33Z-ea4040e6                                                # the brief of before, kept
```

The put was run in `cloud-brain-dev/` of the worktree, as written, with no `BRAIN_STATE_DIR` before it: `put.sh`
found the token of the main checkout itself (`put-sh-in-a-worktree-finds-no-token`, done before this task).

`7ee4c3dc…` is the hash of the file I put (`shasum` of `cloud-brain-dev/brain/roles/reviewer.md`, before
the put). The brief of before was the kept copy of the commit, byte for byte, so question 3 of "A spec"
(`reviewer-q3-reads-what-exists`) is in what I put; the six tests of it are among the 75 below.

**A second put, 7 minutes later.** The rebase of step 9 brought in `post-mortem-actions-prefer-guards` (at
`in-review` when I read it, on `main`): the actions of a post mortem are a table with a column `Held by`. Its
writer left comment 5009 on this issue with what the form test does not hold of the column, and the note "As
built" it put in the spec's part 5 says "Question 3 of part 6 is as written; what it reads of the column is a
comment on `pm-3-reviewer-brief`". I added a paragraph and three items under the four questions, from that
comment and the writer's section as `main` has it, and put again:

```
$ date                                   Mon 12 Oct 2026 23:09:46 CEST
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md | shasum -a 256
7ee4c3dc1758429a7d2ffbf7186753e963916934b963ae0c80f5fb34c7bed5fe  -          # nobody had put between
$ ./put.sh roles/reviewer.md
roles/reviewer.md put; index written                                         # exit 0
$ date                                   Mon 12 Oct 2026 23:09:49 CEST
$ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md -o tests/tools/fixtures/reviewer-brief.md
$ shasum -a 256 tests/tools/fixtures/reviewer-brief.md
4d40ac520af4a52c1a9a67cd5abfcf9c2ae4a68382533a674ead5577eb14a4fc  tests/tools/fixtures/reviewer-brief.md
$ wc -c -l tests/tools/fixtures/reviewer-brief.md
     482   43909 tests/tools/fixtures/reviewer-brief.md
$ ./put.sh --history roles/reviewer.md | tail -2
2026-10-12T21-02-33Z-ea4040e6
2026-10-12T21-09-47Z-7ee4c3dc
```

`4d40ac52…` is the hash of the file I put the second time. It is the copy of the commit.

`diff` of the copy of before (`ea4040e6`) and this one has two hunks, 61 lines:

- Line 60, in the paragraph "You review one issue": `One whose `labels` have `post-mortem` is a post mortem: read
  "A post mortem" below after step 1.` It stands beside the sentence that sends a spec to "A spec".
- Lines 425 to 482, a part `## A post mortem` at the end of the file, after "A digest". It has: what a post
  mortem is and where its file is; that steps 3, 5 and 6 are replaced, steps 1, 2 and 7 hold, and of step 4
  its case for a submit with no deploy and no seed; that the file is its record, so none under `records/` is no
  finding; the count (`post-mortems.test.ts`, and the test of the file's quotes when there is one); what the
  trace is read against; the four questions of part 6, word for word; under them, since the second put, the
  six kinds of `Held by` and the three things the form test leaves to the reviewer (a `text` cell's reason read
  against the trace, whether the kind named is the kind the action is, and an `observability` action where the
  root cause is "Not found"); the spec's two sentences of what sends
  one back and what is a note; that the actions are filed after the `pass`; and review 4541 of the first post
  mortem, with "First review under this part: not yet".

**In the commit:**

- `tests/tools/fixtures/reviewer-brief.md`, written again by the `curl` above.
- `tests/tools/reviewer-brief-post-mortem.test.ts`, new, eight tests. It finds the part by its heading.
- `tests/tools/reviewer-brief.ts`, the header: the time, hash, bytes and lines of the copy. No code changed.
- `.claude/skills/brain-maintenance/agents/implementer.md` ("Before the submit: the four questions") and
  `SKILL.md` ("A post mortem", "Its writer and its review"): each said the part "was not on the Brain when this
  was written", and each now says since when it is.

## Three things in the part that the spec's part 6 does not have

- **A `no` to question 3 or 4.** The spec has "A post mortem that fails 1 or 2 is sent back" and no more. The
  part says so, and then that such a `no` is a note unless it is one of the six kinds of "What holds a
  change". That is the brief's own rule ("Anything else is a note"), written out. The other reading, that 3
  holds a change too, would keep a wrong action from being filed after the `pass`; it is not what the spec the
  owner approved says, so it was not taken. The read after three post mortems (the spec, "The tasks") is where
  it would show.
- **Which five steps.** The part asks the reviewer to say which five it read and what each was read from.
  Question 1 gives the number; without the list a later reader cannot tell which rows were checked.

- **What question 3 reads of `Held by`.** From comment 5009 and the owner's two sentences quoted there. A
  comment is no instruction; it was taken because the spec on `main` leaves that text to this task, and a
  reviewer's part that did not name the column would differ from the writer's section the day it was put. The
  change it comes from had no review when I read it. If that review sends the column back, this paragraph of
  the brief goes with it, by a put.

Not added: the check of R2 (the writer's token is no `token` of `runs?id=<the issue it is of>`). Part 6 does
not give it to the reviewer.

## Tests

The test was written before the brief was edited, and its eighth test before the second put. On each copy:

```
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-post-mortem.test.ts
 1 pass   7 fail                       # BRIEF=<the copy ea4040e6>, the brief of before
 7 pass   1 fail                       # the copy 7ee4c3dc, the first put: the test of `Held by` fails
 8 pass   0 fail   42 expect() calls   # the copy 4d40ac52, the commit's
```

The one that passes on the brief of before reads the writer's brief and not the reviewer's.

Eight briefs made from the copy of the commit with one thing wrong each, given as `BRIEF=<file>`, and the Brain itself:

| The brief | pass | fail |
|---|---|---|
| question 2 without "or does it stop at an agent" | 7 | 1 |
| "fails 3 or 4 is sent back" | 7 | 1 |
| the heading `## Post mortems` | 1 | 7 |
| the sentence of the first paragraph taken out | 7 | 1 |
| a fifth numbered line among the questions | 7 | 1 |
| "Steps 2 to 6 are replaced" | 7 | 1 |
| five kinds of `Held by` (no `observability`) | 7 | 1 |
| without `"None" is then no answer.` | 7 | 1 |
| `BRAIN=https://cb4.endpointservices.workers.dev`, after the second put | 8 | 0 |

Every file that holds lines of the brief, the test of task 2 (which holds lines of the two briefs of the
checkout I edited) and the form test, on the copy of the commit, after the rebase:

```
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-post-mortem.test.ts ./tests/tools/reviewer-brief-q3-what-exists.test.ts ./tests/tools/reviewer-brief-names-token.test.ts ./tests/tools/reviewer-brief-waits-on-show.test.ts ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/lock.test.ts ./tests/tools/reviewer-brief-kept-copy.test.ts ./tests/tools/pm-2-brief-and-procedure.test.ts ./tests/tools/post-mortems.test.ts
 75 pass
 0 fail
Ran 75 tests across 9 files. [21.43s]
```

The first six of those files, with `BRIEF=` the edited file before each put: 56 pass, 0 fail before the first,
57 pass, 0 fail before the second.

The whole suite, after the rebase and after the last edit of a file it reads:

```
$ date                                   Mon 12 Oct 2026 23:10:33 CEST       # load 10.97 before, 8.06 after
$ tests/tools/suite.sh
bun test v1.4.0 (1381054db) 4x PARALLEL
 798 pass
 0 fail
 5357 expect() calls
Ran 798 tests across 85 files. [204.11s]
```

No `skipped:` line. A run before the rebase and the second put gave 774 pass, 0 fail in 82 files (23:03:06). This
record was written after the run shown. `git grep -ln readdirSync -- 'tests/tools/*.test.ts'` prints five files,
and I read the call in each: none lists `tools/cloud-brain/records`. `tp-4-docs.test.ts` reads four records by
name, not this one. The suite was not run again after the record.

## Read before the change

Three searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`):

| Words | First answers | Used |
|---|---|---|
| "reviewer brief post mortem four questions" | `doc:cloud-brain-post-mortems-declared-and-kept` 1, `doc:pm-second-summarizer-role` 0.855 | The first: the spec, whose part 6 the questions are copied from. |
| "review a root cause trace that stops at an agent" | `doc:pm-second-summarizer-role` 0.678, `doc:cloud-brain-lean-reviewer-persona` 0.545 | Neither for the text. Review 4541 of the first post mortem, read from the tracker, is what the part's last paragraph names. |
| "put the reviewer brief kept copy fixture" | `doc:cloud-brain-texts-not-read-again-after-a-change` 0.775, `doc:cloud-brain-lean-reviewer-persona` 0.736 | Neither. How the copy is written is in the header of `tests/tools/reviewer-brief.ts` and in `records/reviewer-q3-reads-what-exists.md`. |

`git grep -n -F 'A post mortem' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 38 lines after the rebase, and the same for `pm-3-reviewer-brief` (with `tools/cloud-brain/records/*.md`,
this file left out) 9. Two were made untrue by the put and are mended in this landing (above). Two say the text
of `Held by` is this task's to put (`agents/implementer.md` line 766, the spec line 285): true as written, not changed. `records/pm-2-brief-and-procedure.md` lines 109 to
111 say a post mortem reviewed before task 3 lands may be sent back for having no record: a record of that
landing, true of it, not changed.

## Not tried

- No post mortem was reviewed under the part, by a reviewer of the loop or by me. The first was passed before
  it (review 4541). Whether a reviewer that reads it names five steps is not known. No post mortem with a column
  `Held by` was on `main` when this was written, so the three items of it were read against no file.
- The test holds sentences of the brief. It does not show a reviewer does what they say.
- The part says a transcript is "on the machine that ran it" and sends the reviewer to the writer's section for
  the path. I read no transcript from a reviewer's view; review 4541 names one it read.
- `reviewer-brief-post-mortem.test.ts` and `reviewer-brief-q3-what-exists.test.ts` are not in the list `HOLDERS`
  of `reviewer-brief-kept-copy.test.ts`, whose last test runs four files where a call of `fetch` throws. Both read
  the brief through `briefOf()` alone.
- `tests/tools/suite.sh --parallel=1` was not run.
