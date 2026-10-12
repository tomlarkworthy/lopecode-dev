# The kept copy of the reviewer's brief has question 3 as cb4 serves it (`reviewer-q3-reads-what-exists`)

Written 2026-10-12 by the writer of the issue (token `impl-0ae747`, `start` at event 4860). The issue
is the second half of the first next action of the post mortem
`tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`. The first half is
`tools/cloud-brain/records/spec-names-what-exists-of-the-job.md`: step 5 of the spec writer's brief.

The issue asks for two acts. The first was the overseer's and was done before this round. This
landing is the second. No seed, no deploy, nothing put on the Brain. Every run below was made in the
worktree of this issue (bun 1.4.0, macOS). Times are CEST, read from `date`.

## The first act, not mine

The put of `roles/reviewer.md`, by the overseer (token `over-0798f5`), comment 4823 of this issue:
question 3 of "## A spec" as the issue's body proposes it, sha256 `295cbef580cd` before and
`ea4040e63cf1` after, between 22:21:49 and 22:21:54. I did not make it and did not run it again.
What I read of it is the file cb4 served at 22:31:41, below.

## What changed

Three files.

- `tests/tools/fixtures/reviewer-brief.md`, written again with the line the header of
  `tests/tools/reviewer-brief.ts` gives:

  ```
  $ date
  Mon 12 Oct 2026 22:31:41 CEST
  $ curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md -o tests/tools/fixtures/reviewer-brief.md
  $ shasum -a 256 tests/tools/fixtures/reviewer-brief.md
  ea4040e63cf191e24630ff8eb6237c48e734977c298cd69caccaa950293de911  tests/tools/fixtures/reviewer-brief.md
  $ wc -c -l tests/tools/fixtures/reviewer-brief.md
       423   39022 tests/tools/fixtures/reviewer-brief.md
  $ git diff --stat -- tests/tools/fixtures/reviewer-brief.md
   tests/tools/fixtures/reviewer-brief.md | 17 ++++++++++++-----
  ```

  The sha is the one comment 4823 gives for the brief after the put. The copy before was
  `52bfc2e5…6a00a3`, 416 lines, three puts behind. `diff` of the two has three hunks, so the copy
  brings in two changes of step 4 with question 3: that a test of the brief reads this copy (the
  put of 20:28:13) and that a file alone is run with `--timeout=30000` (the put of 21:51:28). The
  times of those two puts are from `.claude/skills/brain-maintenance/oversight.md`, lines 739 and
  772, not from a run of mine. No test of this landing holds either of the two.
- `tests/tools/reviewer-brief-q3-what-exists.test.ts`, new, six tests. It reads the brief with
  `briefOf()` and finds question 3 by its part and its number, not by a line number.
- `tests/tools/reviewer-brief.ts`, the header: the time, the sha, the bytes and the lines of the
  copy, and that the first copy was `52bfc2e5…6a00a3` of 13:34:15. No code of the file changed.

## What the test holds

Of question 3, from its number to question 4's, with wrapped lines joined:

1. The part "A spec" has one line that starts `3. `, and it still starts with the question as it was.
2. "List the standing things the design adds (…)." with the six kinds, in order.
3. The sentence of what exists today, "under "Not chosen" why that is not extended", "or that
   nothing exists, with the search or the listing that showed it", and the pointer to step 5 of
   `agents/spec.md`.
4. "A thing the design adds with no such sentence is a `no` to this question."
5. Review 4341, and the post mortem's path, which is a file of the checkout.
6. The six kinds are the six of step 5 in `.claude/skills/brain-maintenance/agents/spec.md` as the
   checkout has it. This one reads no brief of the Brain.

## Tests

The test was written before the copy was changed, and run on the copy of before:

```
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-q3-what-exists.test.ts     # the copy 52bfc2e5
 2 pass
 4 fail
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-q3-what-exists.test.ts     # the copy ea4040e6
 6 pass
 0 fail
```

The two that passed before are 1 and 6, which hold nothing the put added.

Four briefs made from the copy with one thing wrong each, given as `BRIEF=<file>`, and the Brain itself:

| The brief | pass | fail |
|---|---|---|
| the sentence of the `no` taken out | 5 | 1 |
| the list with five kinds (no "a store") | 5 | 1 |
| an empty file | 1 | 5 |
| a second line that starts `3. ` in the part | 5 | 1 |
| `BRAIN=https://cb4.endpointservices.workers.dev`, after 22:31:41 | 6 | 0 |

The files that read the copy, and the test of the post mortem, after the copy was written:

```
$ bun test --timeout=30000 ./tests/tools/reviewer-brief-waits-on-show.test.ts ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/reviewer-brief-names-token.test.ts ./tests/tools/lock.test.ts ./tests/tools/reviewer-brief-kept-copy.test.ts ./tests/tools/pm-second-summarizer-role.test.ts
 52 pass
 0 fail
Ran 52 tests across 6 files. [19.41s]
```

The whole suite, run twice: after the last edit of a file under `tests/` (746 pass, 0 fail, 119.74 s)
and again after this record was written, which is the run shown (`uptime` after it: load 9.92):

```
$ tests/tools/suite.sh
 746 pass
 0 fail
 4973 expect() calls
Ran 746 tests across 78 files. [100.25s]
```

## Read before the change

Two searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`):

| Words | First answers | Used |
|---|---|---|
| "reviewer brief kept copy fixture test" | `doc:cloud-brain-texts-not-read-again-after-a-change` 0.753, `doc:cloud-brain-lean-reviewer-persona` 0.721 | Neither. How the copy is written again is in `tests/tools/reviewer-brief.ts` and `records/suite-tests-read-the-live-brief.md`, found by `git grep`. |
| "spec review question what exists today same job" | `doc:pm-second-summarizer-role` 0.862, `doc:cloud-brain-post-mortems-declared-and-kept` 0.773 | The first: the post mortem this issue comes from. |

`git grep -n -F 'reviewer-brief.md' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 10 lines, 9 of them outside `oversight.md`. Of the 9, two say which brief the copy is:

- `tools/cloud-brain/records/suite-tests-read-the-live-brief.md` line 62, "as cb4 served it at
  13:34:15, 37,481 bytes, 416 lines": a record of that landing, true of it. Not changed.
- `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md` line 90, "`tests/tools/fixtures/reviewer-brief.md`
  line 370, the copy of the brief at this commit". Question 3 is line 377 of the copy now. The post
  mortem says of itself that the texts were "read at 619354c2", and `pm-second-summarizer-role.test.ts`
  reads that line with `git show 619354c2:…` (one of the 52 above). Not changed, as the issue's body says.

## Not tried

- No spec was reviewed under the new question 3, by a reviewer of the loop or by me. Whether a
  reviewer that reads it lists what a design adds is not known. The issue's body says the same.
- The test holds phrases of the brief. It does not show a reviewer does what they say.
- `pm-3-reviewer-brief` puts the same file and writes this copy again. It was at `triaged` when I
  read it (22:35:05, `issue.get`). Its copy and this test together were not run: question 3 has to
  be in the brief it puts, or test 2 to 5 here fail on its copy.
- A brief in which question 3 is wrapped over several lines was not given to the test. The helper
  joins the lines up to question 4, and the copy has it on one line.
- `tests/tools/suite.sh --parallel=1` was not run.
