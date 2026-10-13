# tracker-limits-in-no-brief: three briefs have the lengths the tracker refuses over

2026-10-13, the judgment run `orch-729601`, as a quick win in the worktree `bm-orch-MacBook-Pro-3`. Three
texts and a test. No seed changed, no deploy.

## What was wrong

Three runs of 2026-10-13 were refused a write for a length, as the issue has them: a judgment run for the
`reason` of a move, an overseer and a writer for an id. The seed has the lengths in two shapes
(`tools/cloud-brain/brain-issues.ojs`, read 2026-10-13):

```
issuesLimits = ({ … body: 20000, title: 300, reason: 2000, key: 100, … })
if (typeof v !== "string" || v.length > max) bad(`${label}: text, ${max} characters at most`);
if (id.length > 40) bad("id: 40 characters at most");
```

So the id's 40 is no entry of `issuesLimits`: it is a number in `issueAct`.

The issue says no brief names either limit, by a `grep` for `40 characters`, `2000 characters` and `2,000`.
One did name the id: the page `agents/implementer/tracker-calls.md`, the `open` row, "`id` is `a-z 0-9 -`, 40 at
most", which those three patterns do not match. `agents/orchestrator.md` and `agents/spec.md` had nothing of an
id's length, and the reason's 2,000 was in no brief (the same `grep` with `characters at most` added, run before the edit, over `agents/` and
`SKILL.md`: three lines, of other lengths).

The journal of the judgment run the issue quotes, `overseer-started-again-before-pull.md`, line 49: "My first
four calls were refused (two 400, two 403 for `open` to `ready`)". That the two 400 were the refusals of the reason is read from that line, which stands under "Reason limit"; the
calls themselves were not read.

## What changed

- `agents/implementer/tracker-calls.md`, after the table of calls: the five lengths (an id 40, a key 100, a
  title 300, a `reason` 2,000, a body 20,000), the message of the refusal, where they are in the seed, and that
  what does not fit a reason goes in a comment. This answers the issue's "Not known" for a key, a title and a body.
- `agents/orchestrator.md`, "Your prompt, and your token": the id, the key and the reason, and where a longer
  triage goes. It is in the brief's own part: the issue asked for "Triage", which is one of the texts moved from
  `SKILL.md` with no word changed, and those were not touched.
- `agents/spec.md`, the item of a spec's tasks: an id is `a-z 0-9 -`, 40 characters at most. A spec writer opens
  no task; it names the ids the orchestrator opens.
- `tests/tools/tracker-limits-in-the-briefs.test.ts`, four tests. The first asks the seed, compiled as the other
  tests of the tracker compile it: `issueAct` takes an id of 40 and refuses 41 with the message above, takes a
  reason of `issuesLimits.reason` and refuses one more, and refuses a title and a body one over. The other three
  read the three briefs for the numbers the seed gave, so a limit changed in the seed fails them.

Not changed, as the issue says: `agents/implementer.md` (19,997 of its 20,000 characters; its table of calls has
no lengths, and its row for the page `tracker-calls` reads "A write is refused"), and `agents/overseer.md`.

## Dead end

A first wording in `agents/spec.md` ended the sentence before it and began "A task that names none can be started
at once". The suite failed, 1271 pass and 1 fail: `tests/tools/issue-watch.test.ts` holds "a task that names none
can be started at once" in that brief. The sentence was put back as it was and the new one stands before it.

## Tests

- Before the briefs were edited: `bun test --timeout=30000 ./tests/tools/tracker-limits-in-the-briefs.test.ts`,
  1 pass, 3 fail. The one that passed asks the seed alone.
- After: the same command, 4 pass, 0 fail.
- The whole suite, `tests/tools/suite.sh`, after the last edit of a brief or a test and before this file was
  written: 1272 pass, 0 fail, "Ran 1272 tests across 131 files. [140.17s]", ended 16:10:06 CEST (`date`). No
  line of its output begins `skipped:` or `(fail)` (`grep -c`, 0).

## Not tried

- No call was sent to cb4 with a text one over a limit. What is held is of the seed of this checkout, and
  whether cb4 runs that seed was not read.
- The lengths of the other calls (`attach`, `wait`, `hold`, `lock`, `cost`) are in `issuesLimits` and in no line
  added here.
- The copies of the briefs on the Brain were not put: a judgment run holds no `loop-roles`.
- No agent has read the new lines and written from them.
