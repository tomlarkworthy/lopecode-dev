# approver-reads-only-last-submit-refs

`tools/cloud-brain/approver.ts` held the `commit` refs of an issue's last submit against the
approver's own files (R7 of `plan/cloud-brain-approver-persona.md`), and no earlier submit's. Written
2026-10-12 by a writer of the issue loop (`impl-ca369e`), round 1, started at event 4312 (20:39:58
CEST, the event's `at`). A local tool, its two test files, two lines of the approver's brief and one
of the spec: no seed, no deploy. The commits are refs of the submit.

No policy on cb4 names a delegation in an `approve` guard, so the tool has sent no `approve`, before
or after: `approver.ts check --token impl-ca369e` from the worktree, 20:44 CEST, printed
`0 approves by a delegation, 0 that do not stand`.

## What was wrong

A writer's submit after a send-back names the commits its landing added in that round
(`agents/implementer.md`, step 12). The tool read one submit:

```
const lastSubmit = (record, id, before = Infinity) => record.filter((e) => e.id === id && e.seq < before && isMove(e, "submit", "submit-spec")).at(-1);
```

`judge` took its refs for the R7 loop and `facts` listed them. An issue whose first round changed
`agents/approver.md`, `approver.ts`, its test, a policy file or `brain-issues.ojs`, and whose second
round did not, had no R7 reason from the refs, and an approver that ran `facts` was shown the second
round's commits alone.

## What changed

**The refs of every submit of the issue are read.** `submitted(record, id, before)` gives each ref
of every `submit` and `submit-spec` move of the issue before `before`, once (by kind and value as
written), in the order first named, with `submit` the seq of the last submit that names it.

- `judge`: every `commit` ref of that list is a commit the checkout has and touches none of the five
  files, or the reason is the one it was (`the ref <r> touches <f>: the approver does not approve a
  change to itself (R7)`, `the ref <r> is not a commit the checkout has`). `check` passes its
  `before`, so a submit made after an approve is not held against that approve.
- The last submit still needs a `commit` ref of its own. When earlier submits have one and the last
  has none: `the last submit of the issue (event N) has no commit ref to read`. With none in any
  submit the line is the old one.
- `facts`: `refs` is that list, each with `submit`; `submit` of the answer is still the last
  submit's seq. In the text a ref the last submit does not name ends
  ` (of the submit of event N, not of the last)`.

Every case the tool approved before and refuses now is a refusal added: nothing it refused before
is approved now. That is why this side was taken of the two the issue leaves open, by line 1 of
`philosophy.md` as read there ("A change that only narrows what a caller may do is taken") and line
2 (the smaller side).

**The other side, not taken:** every commit between the issue's first ref and `origin/main`. It
reads other writers' commits as the issue's, and an issue landed while a change to the tool landed
beside it would be refused for a commit that is not its own.

**A consequence, seen in the test and not on cb4:** an earlier round's ref that the checkout does
not have (a sha mistyped in round 1, a commit of a repository not cloned) now refuses the approve of
every later round, since a move's refs are not rewritten. The owner approves such an issue.

**The second thing of the issue.** `tests/tools/approver-brief.test.ts` read the brief's leave
reasons with `` /`why: ([a-z ]+)`/g ``, which the apostrophe of `why: the approver's own files` does
not match, and expected four. It reads `` /`why: ([^`<]+)`/g `` and expects five, in the order the
brief has them. `trial` has no count for the fifth and puts it under `other`; the test says so
(`[1, undefined, 1]` where the four give `[1, 1, 0]`). `trial` is not changed.

**Sentences the change made untrue, mended here.** Searched with
`git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
for `last submit` (11 lines), `approver.ts facts` (9), `lastSubmit` (0) and
`no submit with a commit ref` (0), run before the mends and before this file was written:

- the tool's header, under `facts` and under `approve`;
- `agents/approver.md`, step 2: `facts` prints "each `commit` ref of every submit the issue has",
  and what a ref of an earlier submit has after it. A test holds the two sentences against what the
  tool prints;
- `plan/cloud-brain-approver-persona.md`, "Is it secure": an "(As built, …)" note after "the last
  submit".

Left as they are: the records of `ap-1-approver-tool` and `ap-2-brief-and-shadow-step` (the second
names this defect under what was not done), and the overseer's line of this issue in `oversight.md`.

## The blobs

`git hash-object` in the worktree after the last edit of each, 20:45 CEST:

```
89632e99fa43626f4137587a66d58470c9da5393  tools/cloud-brain/approver.ts
9956b9aa3debe4c9d6d3434868f1efaa98b525f7  .claude/skills/brain-maintenance/agents/approver.md
```

The tool was `6d3fa1c9d631b58a655ae41317b184ec069c10d3` before. `ap-4-policy-v3` was at `triaged`
when this was written (`issue-as.sh impl-ca369e "get?id=ap-4-policy-v3"`, 20:40 CEST): the policy
file it writes names these two, or whatever `origin/main` has when it is written.
`git grep -n 6d3fa1c9` in the worktree printed no line, so no file pins the old one.

## The tests

`tests/tools/approver.test.ts`, three tests added (30 in the file, 27 before), on a made record of
an issue sent back once (`twice(first, second)`: the first submit's refs, a `rework`, the second
submit's, a pass and a second move to `awaiting-approval`, the verdict keyed `verdict-2`):

- `approve sends nothing (R7): a ref of an earlier submit …`: one case for each of the five files,
  with the second submit naming a commit to `brain-core.ojs` alone; each has the one reason. Then:
  two rounds with none of the five are approved with the key `approve-2`; a ref both submits name
  gives one reason; an earlier ref of forty zeros is refused; a last submit with no ref is refused;
  and a commit to the tool put among the refs of the project's `submit-spec` does not refuse the
  task.
- `check: a submit made after an approve is not held against it`, and one made in an earlier round
  is: the one reason.
- `facts: the refs of every submit of the issue …`: four refs from two submits of which one is in
  both, each with its submit and its marks, and the text's lines.

`tests/tools/approver-brief.test.ts`, one test added (12 in the file, 11 before) and one changed:
the brief's sentence of `facts` against the tool's line, and the five leave reasons.

Against the tool as committed before this change (`git cat-file -p 6d3fa1c9d631b58a655ae41317b184ec069c10d3`,
written to a directory of its own with `issue-as.sh` beside it), 20:45 CEST,
`APPROVER_TS=<that file> bun test ./tests/tools/approver.test.ts`:

```
(fail) approve sends nothing (R7): a ref of an earlier submit touches the approver's own files, and the last submit leaves it out
(fail) check: a submit made after an approve is not held against it
(fail) facts: the refs of every submit of the issue, each once, and an earlier one says which submit named it
 27 pass
 3 fail
```

The first stopped at a `send` with the key `approver/task/approve-2` where none was expected: the
defect. The second failed at its second half (the first half holds before and after). With the
brief and `SKILL.md` of before the change, `BRIEFS=<that directory> bun test ./tests/tools/approver-brief.test.ts`
was 11 pass, 1 fail, the new test.

With the change, `bun test ./tests/tools/approver.test.ts ./tests/tools/approver-brief.test.ts`:
42 pass, 0 fail, 509 `expect()` calls. The count of the whole suite is in the issue's comment and
the submit, from a run made after this file was written.

## On cb4

Reads only, with the writer's own token, from the worktree, 2026-10-12 20:44 CEST.
`approver.ts facts ds-1-rows-add-within --token impl-ca369e` (an issue with two submits, events 3819
and 3862, at `done`):

```
last submit: event 3862; passing review: event 3863; verdicts: none
commit lopecode-dev@61f74c22: 6 files (of the submit of event 3819, not of the last)
…
commit lopecode-dev@fadc7924: 1 file (of the submit of event 3819, not of the last)
commit lopecode-dev@ada6fcca: 1 file (of the submit of event 3819, not of the last)
commit lopecode-dev@92f3d259: 3 files
```

The tool before the change listed the last of the four alone (read in the code, not run).
`facts ap-2-brief-and-shadow-step` (one submit) printed its ref with no such words after it.

## Not done, not tried

- No `approve` was run on cb4 and none could be: no guard names a delegation. `judge` on a record
  of two submits is the test's made record, not a record read from cb4.
- A `submit-spec` of the issue's parent is not read for a task, as before. The issue asks whether it
  should count; it was left: the project has an approve of its own, and the files a spec's commit
  touches are held there. The first test above has the case.
- Refs are held apart by the value as written: `lopecode-dev@<sha>`, `<sha>` and a shorter `<sha>`
  of one commit are three refs, and a file one of them touches is named three times in the reasons.
  Not tested.
- A hidden submit (an event the token does not read) is counted as `lastSubmit` counted it. Not
  tested, and whether such an event carries refs was not looked at.
- `tests/tools/approver-brief.test.ts` is not one of the five files `own` names, so a change to it
  is not refused by R7. Seen while reading; not changed.
- `trial` gives `why: the approver's own files` no count of its own. Not changed: the spec's part 6
  names four.
- A two-round issue was not given to an approver.
