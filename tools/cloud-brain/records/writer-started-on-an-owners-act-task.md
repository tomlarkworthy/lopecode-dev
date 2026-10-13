# writer-started-on-an-owners-act-task: a task that is the owner's and after another task gets the link and the label

2026-10-13, the writer `impl-056489`, in the worktree `bm-writer-started-on-an-owners-act-task`. Three texts and a
test. No seed changed, no deploy.

## What was wrong

fly-4b-first-run is the owner's act: its body (event 3436) has "T4b. The owner's act and a record of it". Its
events, read 2026-10-13 with `issue-as.sh get?id=fly-4b-first-run`:

```
3480 commented  held: after fly-4-loop-files; the owner's act.
5083 linked     after fly-4-loop-files
6664 moved      ready   "waits for nothing, by the queue at 6662"
6666 cost       implementer impl-c62520, running
6673 commented  **For the owner. Not started by a writer: …
6674 labelled   needs-owner
6675 cost       no-submit
```

The comment of 3480 held it for two things. bk-5-holds-become-links wrote the first as the link of 5083, and its
record leaves the second for later (`tools/cloud-brain/records/bk-5-holds-become-links.md`, "What was not moved
to `ready`, though linked"): "`fly-4b-first-run`: "the owner's act" (3480). It gets `needs-owner` then." It says
there that "a session reads before it moves it". The move of 6664 was made by a program, not a session:
`tools/cloud-brain/loop.ts`, the branch `e.do === "ready"`, moves with the reason "waits for nothing, by the queue
at <seq>" and reads no comment. So nothing put the label on, and a writer was started. The two cost events are
267 s apart by their `at`; the issue has the run as 266 s and 2.52 usd from the run's journal, which was not
read here.

The label is what the queue reads. `waits` of `issueQueue` (`tools/cloud-brain/brain-issues.ojs`) begins:

```
if (((i.labels || []).includes("needs-owner") && !begun.includes(i.state)) || i.state === "awaiting-approval" || on(i, "security")) return { why: "owner" };
if (i.hold && i.hold.until > now) return { why: "until", until: i.hold.until };
const ahead = (i.links || []).filter((l) => l.rel === "after" && at(l.to) && !at(l.to).closed).map((l) => l.to);
if (ahead.length && !begun.includes(i.state)) return { why: "after", on: ahead };
```

Seen on cb4 on 2026-10-13, in the call before a `date -u` that printed 14:42:12Z (`issue-as.sh "queue?limit=500"`): fly-4b-first-run, at `ready` with the
label and its link done, is an entry of `waiting` with `why: owner`, and is not in `queue`.

The triage (event 6705) chose the side: a text, in two briefs. The other side, a seed that reads an open `after`
link before the label, was not taken there and is not taken here.

## What changed

- `agents/orchestrator.md`, "The `decompose` row", after the sentence on which tasks are made ready: a task the
  spec leaves to the owner that is also after another task gets its `after` link and the label `needs-owner`,
  put on when the task is opened; the case of fly-4b-first-run with its events; that the label is read before the
  link, so the task is in the owner's list before he can act; and that its comment begins with what the task
  waits for, in one line. The row is still one line. It is one of the five texts moved from `SKILL.md` word for
  word: `tests/tools/orchestrator-brief.test.ts` holds that of the commit that added the brief and of its parent,
  and passes with this edit (the suite's run below).
- `agents/spec.md`, the item of a spec's tasks: a task that is the owner's act says so in a line of its own, "The
  owner's: <the act>", beside the tasks it is after. And in the item of what only the owner can do: each act of
  that list that is a task is named there by the task's id. No spec under `plan/` has such a line
  (`git grep -n -F "The owner's:" -- plan`, 0 lines); the brief says so.
- `SKILL.md`, step 3, where the three ways a wait is written are given to a pass by hand: an issue that waits for
  two of them has both. And "What is in `agents/orchestrator.md`", which says the five texts were "moved as they
  stood with no word changed": a paragraph after its table says that the `decompose` row has been added to since,
  and that the test reads the two commits of the move.
- `tests/tools/owners-act-task-gets-the-label.test.ts`, four tests: the words of each of the three texts (and of
  that paragraph of `SKILL.md`), and
  that `waits` in the seed's source has its `needs-owner` line above its `after` line.

## Tests

- `bun test --timeout=30000 ./tests/tools/owners-act-task-gets-the-label.test.ts` before the edits: 1 pass, 3
  fail (the three texts). After them: 4 pass, 0 fail, 24 `expect()` calls.
- `tests/tools/suite.sh`, after the last edit of a brief: 1276 pass, 0 fail, 132 files, and no `skipped:` line in its
  output (`grep -c`, 0). An earlier run of it, between two edits, was stopped by the harness at its time limit with
  no result printed.

## Seen and not fixed

fly-6-after-seven-days is of the same four of bk-5's record: at `triaged`, one link `after` fly-4b-first-run, no
hold and no label, with its seven days in a comment. A step makes it ready when fly-4b-first-run is done. Opened
as `seen-fly-6-ready-before-its-7-days` (event 6720), linked `related`.

## Not tried

- **No decompose has been made under the new row.** No judgment run has read it, and no spec has the line the
  spec writer's brief now asks for. Whether a run that reads the row labels such a task is not known.
- **The label with an open link was not run.** That `waits` answers `owner` for an issue with `needs-owner` and an
  `after` link to an open issue is read from the order of two lines of the source, which the fourth test holds.
  `issueQueue` was not called with such an issue, and no issue on cb4 was seen in that state. The one case seen
  is the label with its link done.
- **The owner's list.** How a task that is labeled before he can act reads in "For your attention" of the page was
  not looked at. The comment's first line is what tells him; nothing checks that a run writes it.
- **What happens when the other task is done.** The comment's first line is then untrue until someone rewrites
  it. The row of `SKILL.md` for an issue labeled `needs-owner` has it read again each pass; nothing in this change
  makes that read mend the line.
- **ta-1c-parent-revoke-on-cb4**, the other task the issue names: it has a hold (the queue answers it `why: until`,
  same read) and no label. It was not changed.
- **Tasks already open.** The text is for a decompose to come. No open task was labeled by this change.
