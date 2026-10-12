# implementer-one-advisor-call: two briefs name one call of the advisor

Written 2026-10-13 by the writer of the issue (token `impl-e19726`). No seed, no deploy.

## What was so

Neither brief spoke of the advisor. Run in the worktree before the edit:

```
git grep -n -i advisor -- .claude/skills/brain-maintenance/agents     -> no line
```

The two calls a run the issue counts (a median 2, mean 1.75, of 179 first-round runs; its body, measured
2026-10-12 by its opener and not run again here) are asked for by the tool, not by a brief. The tool's
description, as this writer's own prompt had it on 2026-10-13:

> Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption.

> Also call advisor: - When you believe the task is complete.

> On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done.

## What changed

- `.claude/skills/brain-maintenance/agents/implementer.md`: a part "The advisor: one call, before the submit",
  before "Where you work", so a writer reads it before it plans. It quotes the tool's two asks, says the brief
  holds where they differ, puts the one call at step 11 (the change and the record committed, the landing not
  begun), leaves the call before the approach out unless the issue and its spec can be read two ways, and asks
  for the count of calls in the report. Step 11 has one line that points at it.
- `.claude/skills/brain-maintenance/agents/spec.md`: the same part, with the call before step 6 (the landing),
  since the ref of a spec's submit cannot be changed after the move. Step 6 points at it. The numbered steps
  there gained a heading `## Steps`, as the other briefs have, so that the part ends where they begin.
- `tests/tools/brief-one-advisor-call.test.ts`: 8 tests, four a brief.

## The counts

```
bun test --timeout=30000 ./tests/tools/brief-one-advisor-call.test.ts   before the edit of the briefs: 0 pass, 8 fail
the same, after                                                         8 pass, 0 fail
tests/tools/suite.sh, after the last edit of a brief or a test          930 pass, 0 fail, 96 files, 209 s (load 8.03)
```

## Alternatives weighed

- **Take the tool away from a writer**, as `agent.sh` does for a reviewer (`--settings {"advisorModel":""}`;
  `tests/tools/light-agent.test.ts`). It would hold the count at 0 with no agent's judgment. Not taken: the issue
  asks for one call and not none, and a writer is started by the `Agent` tool of the orchestrating session
  (`SKILL.md`, step 3), whose settings are the session's. Whether an `Agent` call can be given a setting of its own
  was not looked for.
- **Change the tool's description.** It is not a file of this repository.
- **A pointer at step 11 alone.** By step 11 a writer has made the first call. The part stands before the steps.

## Not tried, not known

- Whether a sentence of a brief moves the count. The tool's description stands beside it in every writer's
  prompt and asks for two. This writer made the call before the approach, before the part existed, and one
  before the landing: 2 calls, which is the old count and no run under the new text.
- The issue's measure: over the 30 first-round runs of a writer after this landing, the mean of
  `usage.advisor.calls` in `issue.runs?role=implementer&round=first` is 1.2 or less, and the share of `submit`
  moves sent back (`flow.submits`; 39 of 192 for a task on 2026-10-12, the issue's number) is not more than it was.
  Neither is read here: no run has been made under the text.
- The saving "about 10% of a run" is the issue's estimate. Nothing here measures it.
- No spec writer and no second writer has read the part. "Cannot plan from the issue and the spec" is this
  writer's wording of the issue's "cannot plan from the spec", made narrower by "can be read two ways"; whether
  writers take the exception more or less often than was meant is in the same 30 runs.
- The digest writer's, the overseer's and the approver's briefs are not changed: the issue names two briefs.

## How it is known later

A mean of `usage.advisor.calls` over those 30 runs that is still near 1.75 says the sentence does not hold
against the tool's description. The next thing is then the first alternative above: a setting, which decides
without a writer's reading.
