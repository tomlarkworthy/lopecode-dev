# rk-3-as-of: a write to the tracker names the last event its writer read

Task 3 of 6 of `rules-checked-and-stale-knowledge-seen` (`plan/cloud-brain-rules-checked-and-stale-knowledge-seen.md`,
section 2, R3). Written 2026-10-13, started at event 7145. One seed changed,
`tools/cloud-brain/brain-issues.ojs`, with a deploy of `brain-x-issues`. No tool sends the field yet: that is
`rk-4-issue-as-sends-as-of`. What cb4 answered after the deploy is in the writer's comment on the issue, which
is written after this file is pushed.

## What changed

| Cell | Change |
|---|---|
| `issuesLimits` | `said: 20`, `since: 20`, and `asOf`, the nine acts that read the field: `move`, `review`, `comment`, `label`, `link`, `attach`, `hold`, `swap`, `narrow` |
| `issueMatters` (new) | `e.type !== "cost" && e.type !== "waits"`. The test `issueApply` already made for `updated_at`, now one cell that three places read |
| `issueApply` | an opened issue has `said: [{ actor, seq }]`; each later event of the issue that matters puts its actor last in the list, cut to the newest 20. A row with no `said` is left with none |
| `issueSaid` (new) | `said` of one issue from its own events, by `issueApply` over an empty view |
| `issueAct` | `asOf` of the nine acts: left out, or a safe integer of 1 or more, or a 400 |
| `issueAllowed` | after the read guard and before the act's own: 400 past `view.seq`, a refusal when the row has no `said`, and `{ stale: true, asOf, touched }` when another actor's seq in `said` is after `asOf`. `event.asOf` for a guard, 0 with none |
| `issueEvent` | the event of one of the nine acts keeps `asOf` |
| `issuesApp` | `judge` throws 409 `Stale`; `withSaid` makes `said` of a row that has none before the judge is asked; `staleAnswer` reads the issue's events for `since` and the count; both the write and the judge of an attachment before its bytes are kept go through them. `issue.get` answers `issue.touched` |
| the prose | "A write names what it read" under the Methods table, `asOf` among an event's fields, `event.asOf` among what a guard reads, `issue.touched` in the row of `issue.get` |

The spec gained one paragraph, "(As built, `rk-3-as-of` …)", at the end of its section 2.

## The answer

From `test_issues_as_of_refuses_a_write_behind_another_actors_event`, which holds it with `toEqual`: the owner
opens `t1` at seq 2, token b comments at 3, token a comments with `asOf: 2`.

```
409 { "error": "Stale", "message": "1 event of t1 after 2 that this caller did not write",
      "asOf": 2, "touched": 3,
      "since": [ { "seq": 3, "type": "commented", "by": <the event's by>, "at": <the event's at> } ] }
```

## Five choices the spec left open, and what each costs

- **The stale check is asked before the act's own guard.** A stale write that its guard would also refuse is a
  409, not a 403: the test sends a `review` of an issue at `open`, which the review guard refuses, and reads 409.
  The other order tells a writer "the guard of submit refuses" when the cause is a `back` it has not read. The
  cost: a caller that sends `asOf` learns from a 409 that others wrote to an issue it may read, which `issue.get`
  tells it too.
- **`since` lists the events that refuse**, not every event after `asOf`: those that matter and that the caller
  did not write. The message's count is of the same list, before it is cut to 20. The spec's words are "the
  events of the issue after `asOf`, as `issue.get` reads them" and its example message "that this caller did
  not write"; the two differ when a `cost` event or the caller's own is after `asOf`, and the message's reading
  was taken.
- **`by` of an entry is the event's own object.** The spec's example has a holder's name, `"orch-d97e0e"`, which
  is what `issue-as.sh --short` prints of an event and not what the service keeps.
- **A row with no `said` is not begun by a write with no `asOf`.** A `said` begun at the next event would hold
  that event's actor and none before it, and a later write with `asOf` would pass behind the comments it lacks.
  So such a row has none until a write with `asOf` reads the issue's events (`S.of`, the statement `issue.get`
  reads them with) and makes it whole. The cost is that read, once an issue.
- **The judge refuses when it is given `asOf` and a row with no `said`** (`asOf: the row of <id> keeps no said`,
  403). The service never asks it so. Passing would be the same as no check; the page judges with `issueAllowed`
  too, and sends no `asOf`.

`touched` is not kept on the row. `issue.get` answers the greatest seq of `said`, or of the `said` it makes from
the events it reads anyway.

## Tests

Five cells, after `test_issues_rebuild_and_replay_judge_the_record`:
`test_issues_as_of_refuses_a_write_behind_another_actors_event`,
`test_issues_as_of_keeps_the_newest_actors_and_answers_the_newest_events`,
`test_issues_as_of_is_judged_again_by_the_replay`,
`test_issues_as_of_reads_the_events_of_a_row_written_before_said`, `test_issues_a_guard_reads_as_of`.

Before the fix, with the cells in the seed and nothing else changed (the build, then
`cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>`):

```
brain-x-issues @tomlarkworthy/brain-issues no hash (--with): 51 passed, 5 failed, 17 need a browser
```

The 5 were the five cells. After the fix, the same command:

```
brain-x-issues @tomlarkworthy/brain-issues no hash (--with): 56 passed, 0 failed, 17 need a browser
```

In a browser, `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit …`,
the run that emitted: `"tests":73,"passed":73,"failed":[]`.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20`, from the main
checkout, on the build that was emitted, ended 2026-10-13T19:51:17Z by its last line:

```
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-issues"]
{"worker":"brain-x-issues","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…}
```

The whole suite, `tests/tools/suite.sh`, after the last edit of the seed: 1306 pass, 1 fail, 1 error.
The fail is a test of `tests/tools/loop-step.test.ts` ("labeled `needs-owner`: nothing until the owner has written
after the label …") that timed out at 30000 ms, and the error is the same test's, after the time; `uptime` after the
run gave 33.04 as its first number. That file alone, `bun test --timeout=30000 ./tests/tools/loop-step.test.ts`,
then gave 40 pass, 0 fail, with `uptime` at 13.16. `grep -c brain-issues.ojs` prints 0 for that
file and 1 for `tools/cloud-brain/loop.ts`, a comment at its line 235.

**A first shape of the write failed one test of the suite**, and was changed for it. The write called a helper,
`judged`, in place of `judge`, and `tests/tools/approver.test.ts` then failed (1306 pass, 1 fail): its case of
the approver's policy mark changes the text `[act, verdict] = judge(view, ctx.by, given)` of the seed and
asks that the text stands once. The helper was taken out and the write calls `judge` in those words, inside a
`try`, so the approver's test file is as it was; `bun test --timeout=30000 ./tests/tools/approver.test.ts` then
gave 34 pass, 0 fail. The counts above are of the seed after that.

What the cells hold, beyond the answer above:

- Written: behind the caller's own event, behind a `cost`, behind a `waits`, with no `asOf`, and behind a link
  another issue says of it and a part opened under it.
- The same key is 409 twice, then written with the seq the refusal showed.
- 400 for `asOf` of the head plus one, a string, 0, 1.5, `null` and -1; written at the head itself.
- 404 for an issue the caller may not read, with `asOf: 99999`.
- Each of the nine acts is 409 behind another token's comment, no event is written and no bytes are kept.
- `issue.wait` passes over the field, `issue.cost` answers 400, `issue.open` writes an event with none.
- With 22 actors after the opener: `said` has 20, `since` has 20 and the message says 22; `touched` is the
  caller's own event when that is the last.
- `issue.verify?guards=true` passes a record with `asOf` in it, names a forged event behind another actor's
  comment by the judge's words, and names one whose `asOf` is past the event before it. `issue.rebuild` makes
  the rows `issue.snapshot` answered before it.
- A row with `said` taken off it: `issue.get` answers `touched`, a write with no `asOf` leaves it off, a stale
  write is 409 with both events in `since` and leaves it off, a write at the head keeps `said` whole, and an
  attachment meets the same. `issue.rebuild` then makes the same row.
- A guard `event.asOf > 0` narrowed onto one issue's `submit` refuses a submit with none and passes one with.

## Not tried, not known

- **A put-back between two deploys.** A Worker from before this change writes a row back with the `said` it read
  and does not add to it. If `brain-x-issues` is put back after rows have `said` and this change is deployed
  again, those rows' `said` lacks the events written between, and a write with `asOf` behind one of them passes.
  `issue.rebuild`, the owner's, makes every `said` whole. Nothing detects it. Before `rk-4` no caller sends
  `asOf`, so only an issue opened under this change has `said` then.
- No call with `asOf` was made through the core or by a tool: the cells call the Worker's routes in a rig. The
  one call on cb4 is in the comment.
- The page. It sends no `asOf` and was not opened. Its copy of a row has `said` from a snapshot and adds to it
  with each event it syncs, as the service does; nothing reads it there.
- `asOf` on a swap of an install's `migrate` and on a move the service makes itself: neither is given one, by
  the code. No test asks.
- Two writes with `asOf` at one head. The insert of the second fails on its seq and it is judged again at the
  new head, as every write is; the new cells do not race two.
- How long the read of an issue's events takes on cb4 for an issue with many, and what a 409 costs there.
- Whether a CEL guard may compare `event.asOf` with anything but a number written in it: `event.asOf > 0` is
  the one guard run.
