# writer-brief-and-tool-output-smaller

Written 2026-10-13 by the writer of the issue. No seed, no deploy.

The issue's measurement, made 2026-10-12 by its opener and not run again here: a first-round writer makes a median
39 requests, each sends what was read before it, and of the 274,000 characters of tool output of a run 22% were
the brief read whole, 10% `issue-as.sh get` and 9% an output the harness had saved to a file, read whole.

## What changed

**1. The brief is a file of 19,842 characters, and eleven pages.**

```
before  .claude/skills/brain-maintenance/agents/implementer.md   87,858 bytes   git show origin/main:<path> | wc -c
after   the same file                                            19,852 bytes   wc -c   (19,842 characters)
        agents/implementer/*.md, eleven pages                    93,395 bytes   wc -c
```

Each page is a run of lines of the brief as it stood, under a comment of four lines that says what the page has
and when it is read. The eleven, joined in the order the brief had them and with those comments taken off, are
the brief of the commit before, byte for byte: the cut is `tail -n +5` of each file into `cmp`, run at the cut,
and it is the fourth test of `tests/tools/implementer-brief-core.test.ts`, which reads the two commits and so
does not move when a page is edited later.

The file `agents/implementer.md` is written new. It has the thirteen steps by their numbers, with what a change
with no deploy needs at each (the token, the worktree, the search, the stop for the owner, the claim, the test
file, the record, `land.sh` and its exits, the read as the reviewer will, the wait), and a table, "The pages",
that says for each page when a writer reads it.

| Page | Bytes | Lines of the brief of before |
|---|---|---|
| `start.md` | 13,637 | the token, the advisor, "Where you work", steps 1 to 4 |
| `seed-tests.md` | 12,930 | steps 5 to 8 |
| `ready-to-land.md` | 5,829 | step 9 |
| `landing.md` | 17,330 | step 10 |
| `submit-and-wait.md` | 8,196 | steps 11 to 13 |
| `resumed-round.md` | 3,912 | "A resumed round" |
| `post-mortem.md` | 17,034 | "A post mortem" |
| `asking-and-waiting.md` | 6,205 | "When you need the orchestrating session", "Before a wait" |
| `quick-win.md` | 3,304 | "A quick win", "If you see something, say something" |
| `deploy-put-back.md` | 1,302 | "When a deploy is put back on a test" |
| `tracker-calls.md` | 3,716 | "The tracker's write calls", "What a reviewer will check" |

A writer of a seed with a deploy is sent to four of them, `seed-tests`, `ready-to-land`, `landing` and
`submit-and-wait`: 44,285 bytes beside the 19,852, so 64,137 where it read 87,858.

**The choice, and what it costs.** The other way was to cut the brief into a short file and pages with no
sentence in both. It was not taken: a change with no deploy needs a part of nearly every step (the record's rules
of step 9, the list of step 11), each of which stood between that step's cases and dates, so such a cut is a
rewrite of all 87,858 bytes with no check that nothing was lost. As built, a rule of the short file is said a
second time on its page, in the words of before. The cost is two places to change: a rule changed in one and not
the other is not caught by any test here, but for the lines the tests name.

**2. `issue-as.sh NAME "get?id=ID" --short`.** The script asks the service as before and cuts what it prints.
Left out: of each event `prev`, `hash`, `sig`, `ray`, `origin`, `workflow` and `id`; of the `opened` event its
`title` and `body` when they are the issue's; of a `cost` event its usage; of the issue `workflow` and `runs`; the
answer's `cost`. `by` is the caller's name and `at` a time in UTC. One event a line, the whole one JSON value.
The fields are left out by name, so an event of a type the script does not know keeps what else it has. With no
`--short` the answer is printed as it came.

Five issues read both ways on cb4, 2026-10-13 01:46 CEST, characters (`ia "get?id=<id>" | wc -m`, then with `--short`):

```
writer-brief-and-tool-output-smaller   10,708 ->  4,813   45%
implementer-one-advisor-call           24,091 -> 13,913   58%
wt-3-land-by-push                      34,074 -> 21,660   64%
tp-3-take-and-done                     33,352 -> 21,849   66%
ds-1-rows-add-within                   37,972 -> 26,695   70%
```

What is left is the comments, the reasons and the reviews, which a writer reads. The issue's own number is 5,486
characters a call; which issues it was counted over is not in its body.

**3. The brief says an output the harness saved to a file is searched, not read whole**, under "What a tool
prints is sent again at every request", with the short form and with a test run read by its end.

**Other texts.** Five lines that sent a reader into the brief now name the page: the message of a resumed round
and the orchestrator's own landing in `SKILL.md`, `agents/spec.md` (where `ia` is defined), `agents/digest.md`
(the landing by hand), `agents/overseer.md` (that the brief is held to 20,000 characters and a kind of task has a
page), and `knowledge/changing-and-deploying-a-cloud-brain-worker.md` (the order of a landing).
`git grep -n -F 'implementer.md' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
prints 279 lines outside the brief and its pages; those of `SKILL.md`, the other briefs, `rules.md` and the two
knowledge docs were read as the search prints them, and the records and post mortems, which say what was so at their date, were not changed.
The lines that name a step or a section and were left are answered by one sentence of the table: such a name
means the page of that row.

## Tests

`tests/tools/suite.sh`, after the rebase and the last change of a test or a tool, 2026-10-13 01:48 CEST:
969 pass, 0 fail, 99 files, 75.34 s. No `skipped:` line.

Two new files, `cd $W && bun test --timeout=30000 ./tests/tools/issue-as-short.test.ts ./tests/tools/implementer-brief-core.test.ts`:
17 pass, 0 fail.

- `issue-as-short.test.ts`, 10 tests, runs the script with the real curl against a local server that answers
  `tests/tools/fixtures/issue-get-ds-1-rows-add-within.json`: the answer of `issue.get` for that issue as cb4 gave
  it on 2026-10-13, 15 events with two reviews and one rework. One thing was changed before it was kept: the
  `session` of each cost event and run reads `kept-out` (6 places). With the script of `origin/main`
  (`ISSUE_AS_SH=<that copy>`): 3 pass, 7 fail.
- `implementer-brief-core.test.ts`, 7 tests. With the brief of `origin/main` in the file's place: 2 pass, 5 fail
  (the two that pass read the pages).

Nineteen test files that read a sentence of the brief now read the pages joined, `inFull()` of
`tests/tools/implementer-brief.ts`, between the anchors they had. Before that change the suite gave 37 fail of
942, each of a test that reads the brief. `owner-decisions-written-dense.test.ts` was not changed and reads step 3 of the
short file, which has the words it holds.

## Not tried

- **A run of a writer from the short file.** This change was written by a writer that read the brief of before,
  whole, in two reads (the first answered lines 1 to 664 of 1003, "32071 tokens, cap 25000"). Whether a writer of
  a change with no deploy finishes from the short file with no page is not known; the file says so in its second
  paragraph.
- **The third measure of the issue**: the median `context` of `issue.runs` over the 30 first-round implementer
  runs after this change, 160,000 or less. It can be read when 30 have run. The 7% is the opener's estimate.
- "Above" and "below" in a page are of the brief before the cut, and a page's steps point at steps on other
  pages. The comment at the top of each page says so; the sentences were not rewritten.
- `--short` with a method other than `get`: an answer with no `events` is printed as it came (tested for a list,
  a 404 and a body that is no JSON), and nothing else was run. With a write (`comment --short`) the script makes a
  read of that method; not run.
- An event a session wrote from the page (`by` with no `holder`) is in the test as a made-up event. None was read
  from cb4 through `--short`.
- A time in the short form is UTC, and the tracker's check of a time ahead of the clock reads a time followed by `Z`
  as UTC (`issue-as.sh`, the line that sets `clock`). A comment that copies such a time with its `Z` was not sent.

## For the overseer

- The reviewer's brief on the Brain names `agents/implementer.md` step 8, step 6 and "A post mortem"
  (`tests/tools/fixtures/reviewer-brief.md`, lines 167, 199 and 430). They are on the pages `seed-tests.md` and
  `post-mortem.md`. Not changed: the file is not a writer's.
- `rules.md` names "The tracker's write calls" and step 2 of the brief (lines 76 and 306). The first is the page
  `tracker-calls.md`, and the short file has a part of that name too; the second is in the short file.
