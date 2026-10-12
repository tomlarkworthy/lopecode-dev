# cm-1-cost-event

Task 1 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610): `issue.cost` on `brain-x-issues`, which writes an event of type `cost`. Nothing calls
it yet: the loop still writes its `cost {…}` comments, and tasks 2 to 6 are not built. The seed
commit is `0fbd9827` (2026-10-12 02:10:16 +0200, `git log -1 --format=%ci`).

## What changed

`tools/cloud-brain/brain-issues.ojs`:

- `issuesLimits` has `hows` (`fresh`, `resumed`, `light`), `role` and `outcome` (30), `rounds`
  (1000), `costText` (100) and `cost`, the list of the fifteen fields of a run. `issueAct`,
  `issueEvent` and `issueApply` all read that one list.
- `issueAct("cost", body)`: the shape check. It answers the act or throws 400 `InvalidRequest`.
- `issueAllowed`: a branch for `cost`, `test(wf.cost ?? wf.label, issue)`.
- `issuePolicyAct`: an optional `cost` guard is parsed as `link` and `attach` are.
- `issueEvent`: the event is the fields sent, and `replaced` when the issue has a run of that role
  and round.
- A new cell, `issueRunOf(issue, e)`: the run an issue keeps for a role and round. `issueEvent`,
  `issueApply` and `issueReplay` find the run with it.
- `issueApply`: a `cost` event sets `runs` and `seq` and leaves `updated_at`.
- `issueReplay`: `cost` is in its table, and an event whose `replaced` is not the seq of the run
  the view has (or that has one where the view has no run, or none where it has one) is "names
  another run than the one it replaces".
- `issues_service`: the method `com.lopecode.brain.issue.cost`, a procedure, under the rule the
  other writes have. The route is in the loop the other writes are in.
- The method reference: a row for `issue.cost`, `cost` in the list of event types, `cost` beside
  `link` and `attach` in the prose of a policy.
- `issuesStoreName` answers `brain_issues2 ADDRESS`.
- Three test cells, `test_issues_cost_*`. Three existing cells changed: the method list of
  `test_issues_declares_what_it_needs` (22 to 23), three stated values more in
  `test_issues_reference_states_each_value_and_has_no_hole`, and the two store names in
  `test_issues_panel_draws_and_applies_a_write_before_the_answer`.

## Where it is not the spec's text, and why

| The spec | Built | Why |
|---|---|---|
| "Anything missing, of another type, or not in this list is 400 `InvalidRequest` naming the field, from `issueAct`" | That, and an `event` or `of` past the record's head is 403 `Refused`, from `issueAllowed` | "below this event's own seq" needs the head, which `issueAct` does not have. In `issueAllowed` the replay judges it too |
| `tools`, `event`, `of`: "optional whole numbers" | `tools` 0 or more; `event` and `of` 1 or more | No event has the seq 0 |
| `usage`: "when there, all of { … }" | All nine, and a tenth key in `usage` or in `advisor` is refused | The reason the spec gives for an unknown field of the body holds inside `usage` |
| R1's table: `tokens` in place of `context` names "`context` with `unknown:tokens`" | The message is `tokens: not a field of issue.cost, which are role, round, …, context, …` | Unknown fields are looked for first, and the answer lists the fields, so a caller that sent an old name reads the new one in one answer |
| "`runs`, a list of the events' own fields with `seq` and `at`" | The fifteen fields of `issuesLimits.cost` that were sent, `seq` and `at`. `replaced` is not in a run | The row says which run stands. Which one it replaced is in the event |
| "one for each role and round" | The list is in the order of the events in force: a run written again goes last | `[...the others, the new one]`, with no sort |

A `null` is a value of another type and is refused: `{"agent": null}` is 400 `agent: text, 1 to 100
characters`. The spec's script of task 4 leaves a `null` out for that reason.

Not checked by the service, beside the four of the spec's "What is not checked": that a `usd` is
on a `light` run (the spec's "usd and not light 0" is a count of the record, not a rule), and the
shape of a `cost` event at replay. `issueReplay` judges the guard, the bound of `event` and `of`,
and `replaced`; it does not run `issueAct` on the event, as it does not for any other type.

## Tests

Counts, each from the command beside it, run in the worktree after the last edit of the seed.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 ran before, hash `e3b34e862cd1`) | `passed` 21, `failed` 0, `needsBrowser` 14 |
| `bun test.ts brain-x-issues --with …/.emitted/cm-1-cost-event.js` (the build) | `passed` 24, `failed` 0, `needsBrowser` 14 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…` (Chrome 151.0.7922.34) | `tests` 38, `passed` 38, `failed` [] |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `mains` brain-shell and brain-issues; `tests` 38 in a run |

38 is 24 and 14: no count differs between the two runners.

**The new tests fail without the change.** This task adds a method, so there was no defect to
reproduce. The three new cells were put into the seed as `HEAD` had it, and the seed as changed
was run with one line of the change taken out, seven times. Each row is one build and one
`bun test.ts brain-x-issues --with` of it:

| The seed | `failed` | Which |
|---|---|---|
| `HEAD` with the three cells | 3 | all three |
| no check of `replaced` in `issueReplay` | 1 | `…run_is_replaced…` |
| `updated_at` set for a `cost` event | 1 | `…run_is_replaced…` |
| an unknown field not refused | 1 | `…refused_by_its_shape…` |
| `wf.cost ?? wf.comment` in place of `wf.label` | 2 | `…run_is_replaced…`, `…guard_is_the_policys…` |
| no `cost` guard parsed in `issuePolicyAct` | 1 | `…guard_is_the_policys…` |
| `event` and `of` not held under the head | 1 | `…refused_by_its_shape…` |
| no `replaced` written by `issueEvent` | 1 | `…run_is_replaced…` |

The first run of the third row passed, 24 of 24: the test compared `updated_at` before and after
a call of the rig, and the two events were of one millisecond. The cell now also applies the event
to a copy of the row with `at` a minute later, with `issueApply` and no clock, and that row fails.

What the cells hold, against the spec's task list:

- R1: 29 bodies, the six of the spec's table among them, each answered 400 with the message
  written in the cell, and the record's last event and its length the same after them.
- R2: a run with no `usage`, then the same role and round with one under another key. The second
  event has `replaced`, the row has one run, and it has the `usage`.
- R8: one key sent twice writes one event (`duplicate: true`, to another caller with no `event`);
  `verify?guards=true` answers `ok: true` over a record with five `cost` events; a forged `cost`
  with a wrong `replaced`, with none where one is due, and with one where none is due, each fails it,
  while `verify` with no guards passes.
- Beside those: `runs` is the same in `issue.get`, `issue.list` and `issue.snapshot`, and
  `issue.rebuild` from an emptied view gives the snapshot back; a Worker of the Brain, which may
  comment, is refused; a policy with a `cost` guard is judged by it.

## Not tried

- A `cost` event on cb4. None is written by this task: the spec holds that for task 4, after
  tasks 1 and 2 stand verified, because the Worker's earlier version answers
  `verify?guards=true` with "no such type of event" at such an event.
- A tab that has a copy under `brain_issues ADDRESS`. That the page with the new module does not
  read it rests on the name alone (`test_issues_reference…` and the store names of
  `test_issues_panel_draws…`); no browser with an old copy was opened. The old entry stays in
  that browser's `localStorage`; nothing removes it.
- The panel with a `cost` event in its view. `said(e)` has no line for the type; that is task 6.
- A `cost` on an issue under each of the workflows cb4 has in force. The rig's are the default
  policy and `issuesExamplePolicy`.
- 288 writes in a row, and the size of `issue.list` and `issue.snapshot` with runs in them.
- A call by a member, whom the method's rule does not let in.
