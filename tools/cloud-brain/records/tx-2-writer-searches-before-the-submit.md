# A writer searches the docs for what it changed, before the submit (`tx-2-writer-searches-before-the-submit`)

Task 2 of `plan/cloud-brain-texts-not-read-again-after-a-change.md` (R5 and R3), round 1, by a
writer of the issue loop on 2026-10-11. The edit of the brief and its test are one commit, whose
subject begins "tx-2-writer-searches-before-the-submit: step 11" (author time 22:14:05 +0200,
`git log --format=%ai`), made in a worktree at `ce424593` and brought up to `12b28fb5`. This record is a second commit. Their
names on `main` are the refs of the submit: a rebase gives them others. No seed, no deploy.

## What changed

`.claude/skills/brain-maintenance/agents/implementer.md`, step 11, the list under "Before the
submit, read your change as the reviewer will": a ninth item after "Each ref of the submit is a
commit that is pushed." Eight lines added, none taken out (`git show --stat` of the commit: 96
insertions in two files, 88 of them the test). The words are the spec's, under "R5", letter for
letter; the test holds them.

The writer's brief was not found on the Brain: `/static/cloud-brain-dev/roles/implementer.md` on cb4
answered 404 at 22:11 CEST and `reviewer.md` there 200, and `cloud-brain-dev/brain/index.md` listed two
roles, the reviewer and the paper summarizer. So a writer whose prompt names the file of this
repository reads the item from the commit. No other place was looked in.

## The test

`tests/tools/tx-2-writer-searches-before-the-submit.test.ts`, four tests, run in the worktree.

```
before the edit, no record     bun test ./tests/tools/tx-2-writer-searches-before-the-submit.test.ts    0 pass  4 fail
after the edit, no record      the same                                                                 3 pass  1 fail
with this record               the same                                                                 4 pass  0 fail
```

1. The item is the ninth of the list, after the one on refs, and its opening words are in the brief once.
2. Six clauses of the item, by their own words.
3. The command is taken out of the brief and run. Each of its four paths names a tracked file
   (`git ls-files -- <path>`). With `release land` for `<name>`, the name the spec measured for
   ticket 1841, it prints lines of more than one file, the writer's brief among them. With a name
   that is in no file it prints nothing and exits 1.
4. This record has the two texts below: the line of "A spec" before and after, the owner's answer by its event, and the words of choice A.

The test reads the brief as it is, as the test of `tx-1-six-lines` does. An overseer that rewords
the item fails tests 1 to 3 and is to change them with it. The spec lists "a test that holds each
sentence by its letters" under "Not chosen" as a way to keep docs true and asks for this file all
the same, for the count of the submit; test 3 is the part that is not letters.

The whole directory is in the comment of the issue, from a run made after the last edit of this file.

## The item, run on this change

What this change altered is step 11 of the writer's brief. Searched with the item's own command, in
the worktree after the edit and before this record was in git (the record has some of these words):

```
"Before the submit"                         6 lines in 5 files
"step 11"                                   3 lines in 3 files
"read your change as the reviewer will"     2 lines in 2 files
"eight"                                   136 lines in 47 files   (the letters, so "height" and "weight" too)
"For the overseer"                           5 lines in 5 files
```

One line speaks of the list's length: `tools/cloud-brain/records/fewer-review-rounds.md` line 35,
"eight things to read the change for before the submit". It is the record of the change that added
the eight and says what that change did, so it is left. Nothing was mended. The reviewer's brief is
not in git and the command does not read it (the spec, "Not done"); the copy fetched for the texts
below (the first, of 22:13:45) was searched by `grep -n -i "step 11\|before the submit\|eight"` and printed nothing.

`tools/cloud-brain/records/tx-3-two-references.md` line 96 is a heading "The search of step 11":
the writer of task 3 ran the item from the spec before it was in the brief. That section was not read here.

## For the overseer

The spec gives this record two texts for the reviewer's brief on the Brain. Both were put by the
overseer while this task was being written, and what is left for the next put is two sentences.

**The brief changed after it was first read here.** The copy fetched at 22:13:45 CEST on 2026-10-11
(`date`) was 231 lines, SHA-256 `6df0e7e0af96…`. The overseer put the brief at 22:14:16
(`oversight.md`, the entry of events 2236 to 2506; `put.sh --history roles/reviewer.md` ends
`2026-10-11T20-14-14Z-6df0e7e0`, the copy read here, kept when it was replaced) and said so on the
issue (comment 2533). Fetched again at 22:19:24: 258 lines, 20818 bytes, SHA-256 `0a2703eca54f…`.
Line numbers below are of that copy, and `diff` of the two copies is where "put" is read from.

### R3, the last line of "A spec": put

Line 199 of the first copy, "does not apply. First written 2026-10-11; not yet run.", is line 226
of the second: "does not apply. First written 2026-10-11; 19 reviews of a spec by event 1920." The
words are the spec's. The count is the body of `seen-spec-brief-says-not-yet-run` (event 1920), which
lists the 19 `reviewed` events made while their issue was at `spec-review`; not counted again here.
That ticket read `closed` at 22:19 (`get?id=`). The spec's check of R3 is in the comment of the issue.

### The reviewer's reach, as the owner's answer A: put, but for two sentences

The spec put one choice to the owner: a reviewer that meets an untrue sentence in a `knowledge/` or
`plan/` file the change under review did not touch mends it (A), or files it as today (B). He
answered on the project, event 2400 of `texts-not-read-again-after-a-change`, his comment whole:

> A

The brief has it since the put, lines 191 to 194:

```
test, not a seed, not a brief or `rules.md`, and not a file the change did not touch, but for one case
(the owner's `A`, event 2400 of `texts-not-read-again-after-a-change`, 2026-10-11): a `knowledge/*.md` or
`plan/*.md` the change did not touch, when the change under review is what shows a sentence of it untrue
and the fix is one sentence. Say in the review that the file was not of the change. In the main checkout:
```

Read against choice A as the spec wrote it ("when the change under review is what shows the
sentence untrue and the fix is one sentence. Never a brief, a seed or `rules.md`."): the case and
its two conditions are there, and "not a seed, not a brief or `rules.md`" stands in the same
sentence before the exception, which names two kinds of file and no other. The commands and the
line on where a mend is written in the review (lines 204 and 205, "Each mend is in the review's body with
its commit") follow it unchanged and apply to it. Nothing of that is to be put again.

What the next put changes, each one sentence:

1. **Line 231**, the parenthesis that ends "A small thing you find while reviewing", still says one thing is mended:

   ```
   (A note in a document of this issue's own change is the one thing you mend: "What holds a change, and what is a note".)
   ```
   becomes
   ```
   (Two things you mend, both under "What holds a change, and what is a note": a note in a document of this issue's own
   change, and one sentence of a `knowledge/*.md` or `plan/*.md` that this change shows untrue.)
   ```
   Lines 228 to 230 say of a small thing "not of this issue's change" that "you do not fix it" and
   to open the ticket "with the fix in one line". A reviewer that reads that paragraph and not
   line 191 files the sentence the owner's A lets it mend.

2. **After "and the fix is one sentence."** on line 194, the spec's line for a sentence the owner approved:

   ```
   In a spec, a sentence that is a choice the owner approved stays and gains "(As built, `<id>`, <date>: …; the record.)" after it.
   ```
   The spec says the writer's item goes into the reviewer's brief in "the same words", and the
   item has this. `tx-1-six-lines` mended `plan/cloud-brain-dashboard-service.md` so. Without it a
   reviewer under A may rewrite an approved sentence of a `plan/*.md` to what was built, which the
   spec lists under "Not chosen".

Neither is put by this task: the issue and the spec give the reviewer's brief to the overseer.

What the spec said against A, for the overseer to weigh: "nobody reads the reviewer's mend, and a
reviewer may then change a guide that every agent reads on a judgment of its own." Lines 204 and 205 have
each mend in the review's body with its commit, which is where an oversight can count them.

## Not tried

- No put to the Brain by this task. Whether a reviewer has mended a sentence under the put of 22:14:16 was not read.
- The item has been run by one writer under the brief (this one). Whether a later writer's comment
  says what it searched is the overseer's read (the spec, "R5, in use").
- The item's command was run with five names. That a name of a method or a flag finds the line a
  change made untrue is the spec's measurement (two of six), not made again.
- The `git grep` does not read the reviewer's brief or any other file of the Brain.
- `SKILL.md`, `spec.md` and `overseer.md` were searched by the command above and not read whole for
  other sentences this item makes untrue.
- No call was sent to cb4 for the record but reads: the issue, the project, ticket 1920, fetches of
  the reviewer's brief, `put.sh --history`, three searches of `knowledge.search`.
