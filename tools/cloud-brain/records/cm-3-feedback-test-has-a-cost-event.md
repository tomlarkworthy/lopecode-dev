# cm-3-feedback-test-has-a-cost-event

## Round 1, 2026-10-12

Task 3 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610). The seed commit is `61b769cb` (2026-10-12 02:34:24 +0200, `git log --format=%ci`). It was `580184d1`
(02:31:05) when the runs below were made; the rebase under the landing lock, onto `962c8151`, gave it
the new name and brought in no file this module is built from (`cloud-brain.ojs` and
`cloud-brain-docs.ojs` among nine, and the seed imports neither).
Times below are CEST, from `date`.

## What changed

`tools/cloud-brain/brain-feedback.ojs`, three lines added in one test cell,
`test_feedback_a_close_waits_for_its_link_and_a_cost_comment_is_not_progress` (line 722 today, and line 474 in
the seed as the spec's commit `a3124e62` has it; the spec says line 426). After the two `cost {…}`
comments the rig is given two events of type `cost`, with a comment line above them:

```
rig.say("proj", { type: "cost", role: "reviewer", round: 2, how: "fresh", outcome: "pass", seconds: 410, context: 106356 });
rig.say("fb-late", { type: "cost", role: "implementer", round: 1, how: "resumed", outcome: "in-review", seconds: 977, context: 201310 });
```

The fields are the six that `issueAct("cost")` of `brain-issues.ojs` requires (line 692). The
events are written by the rig's `say`, not by `issue.cost`: the rig's client answers `issue.open`
and `issue.label` and throws `no <method>` for another procedure (line 357).

No line of code changed, and no assertion. The assertion that follows was there before: the note of
`fb-late` reads `proj: pass (review round 2).` as the last thing said. It now holds that with a
`cost` event as the newest event of the note's own issue and of the project it is part of. The
spec's reason (its section on `issuesPanel`): `lastOf` takes an event only when `said(e)` is not
empty, and a `cost` event has no `body` and no `reason`. `said` is line 66 and `lastOf` line 68 today.

The spec says one `cost` event. Two were added because the test has a cost comment on each of two
issues, and the two events are caught separately (the table below, rows 2 and 3).

## The test fails when the code stops passing a cost event over

There was no defect to reproduce: the task is a test that holds what the code does. Each row is
one build of a changed seed and one run of
`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/mut.html @tomlarkworthy/brain-feedback`
in the worktree, between 02:29:31 and 02:30:56. The seed was put back after each, and `cmp` with the copy taken
before said so. In every failing row the one failed test is this one, and what differs is the
second value of its assertion, `"proj: pass (review round 2)."` expected.

| The seed | `tests`, `passed` | Received |
|---|---|---|
| `lastOf` without `said(e) &&` | 14, 13 | `""` |
| that, and the event of `proj` only | 14, 13 | `"proj: "` |
| that, and the event of `fb-late` only | 14, 13 | `""` |
| `said` ends with `e.type` in place of `""` | 14, 13 | `"cost"` |
| the seed of `ccf2b1af` (before this change) with `lastOf` without `said(e) &&` | 14, 14 | |
| the seed of `ccf2b1af` with `said` ending in `e.type` | 14, 14 | |

The last two rows are the control: before this change neither edit of the code failed a test of
the module.

## Tests

The seed is the committed one (`git diff --quiet HEAD -- tools/cloud-brain/brain-feedback.ojs`
exited 0), built with `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`
after `worktree.sh --rebase`, which brought nothing in.

| Command, in the worktree | When | Result |
|---|---|---|
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback` | 02:31:25, 02:31:29, 02:31:32 | each `"tests":14,"passed":14,"failed":[]`, Chrome 151.0.7922.34 |
| `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback` | 02:31:35 | `Tests: 14 passed, 0 failed, 0 timed out, 0 skipped, 14 total` |

The count submitted is 14 of 14, the first command's.

R7 of the spec, for this file: `grep -cE 'cost \\?\{|cost-usage' tools/cloud-brain/brain-feedback.ojs`
prints 5, and 5 for the file as `ccf2b1af` has it. The new lines have no `cost {`.

## Which deploy it is

None. The issue asks which of two it is: the spec calls the task "a deploy of its Worker,
`brain-x-page`", and `brain-feedback` is a module of the shell. What was read:

- `cloud-brain-dev/deploy/services.json` in the worktree, read from cb4 by `worktree.sh` at the
  rebase: 23 services, none with the module `@tomlarkworthy/brain-feedback`. `brain-x-page` has
  one module, `@tomlarkworthy/cloud-brain`.
- `getSource?worker=brain-x-page` on cb4 at 02:32:03: 176,619 bytes, and `grep -c test_feedback`
  prints 0.
- `rules.md`, "Two standing leaves of the orchestrating session", names `brain-feedback` among six
  modules of the shell, posted by the orchestrating session with `brain.ts shell` after a reviewed
  change.

So nothing was emitted and nothing applied, and no Worker's hash moved. The test cell that cb4
serves is the old one until the shell is posted: the copy of `brain-feedback.js` that
`worktree.sh` read from cb4 has no `type: "cost"` (`grep -c` prints 0), and it differs from the
build's module (`cmp`). The post is not a writer's to make and was not made. The spec's line of
task 3 has an "As built" note with this.

## Not tried

- `verify-run.ts` and `cloud-brain-dev/test.ts`: each takes a Worker's name, and this module has
  none. `tab-tests.ts` was run three times in their place, as
  `records/feedback-draft-box-redrawn-on-ask.md` did.
- A `cost` event as the tracker writes it. The rig's events are literals with the six required
  fields; none has `usage`, `agent`, `replaced`, `seq` or a `key`. A field named `body` or `reason`
  is not among the fifteen of `issuesLimits.cost`, which was read and not run against. The rig's `say` also sets the
  issue's `updated_at` for every event, and the tracker leaves it for a `cost` event
  (`records/cm-1-cost-event.md`); no assertion of this test reads it after the two events.
- The owner's page, the cluster's Chrome 128, and a note on cb4 of an issue with a `cost` event.
  When this was written no caller writes that event (the spec's tasks 4 and 5).
- The test run with the other test cells of the page beside it other than by `tab-tests.ts`, which
  reads the page's first run.
