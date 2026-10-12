# fm-2-open-stays-submits

Task 2 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379): three more
metrics of `issueFlow`, the cell of `@tomlarkworthy/brain-issues` that task 1 made. No method
answers it yet; that is task 3. Written 2026-10-12, with the seed's two commits, made at 04:16 CEST
that day and put on `main` at 04:22 (`git log --format='%ai %ci'`; the commits and the deploy are
refs of the submit).

## What changed

`tools/cloud-brain/brain-issues.ojs`, 326 lines more and 10 fewer (`git diff main --numstat`):

- `issueFlowMetrics` has four entries. The three new ones, with the dimensions in the spec's order:

  ```
  flow.open     ms     id, kind, state, waits, for
  flow.stays    ms     state, waits, kind, ended
  flow.submits  count  move, kind, id
  ```

- `issueFlow` keeps the stays while it replays the record: after each `opened`, `moved` or
  `swapped` event it reads the issue's state and whether it is closed from the view `issueApply`
  made, ends the stay before and begins one. Beside them, for the label `needs-owner`, it keeps
  since when an issue that is not closed has it. The rows of each metric are made after the replay;
  the grouping, the steps and `summaries` are the code task 1 wrote, unchanged. It reads the same
  seven cells.
- The prose cell "The flow of work" has the three rows of the table, a paragraph for each metric,
  and five entries more under "The clocks": closed, a stay, `waits`, `needs-owner`, sent back.
- Three test cells, and two changed: the test of hidden events asks every metric, and the two
  texts `no such metric: … One of: …` of task 1's test name four metrics.

`plan/cloud-brain-flow-metrics.md` has three "As built" notes, at the lines the table below differs from.

No method, no rule and no table changed. What a caller of cb4 can see is the reference text.

## Where the spec is silent or was not followed, and what was taken

Each by line 2 of `philosophy.md` (the smaller side, said here).

| The spec | Built | Why |
|---|---|---|
| `flow.open` "does not read `since`" | Not for its rows. `since` decides the step (an hour up to 48 hours, else a day), and a `since` after `until` is 400 | One rule for the step and one check of the span for the four metrics. The spec's check sends `until` alone, and the step is then a day |
| `waits` of `flow.open` | From the state alone. The label `needs-owner` does not change it | The spec gives `waits` three values by state, and counts the label "beside the states" in `flow.stays` |
| "A stay is the time between two moves" | Every `moved` and `swapped` event ends a stay and begins one, also a swap that leaves the state's name (`promote` from `open` to `open`, each swap of an install's `migrate`) | The spec's words, and what `time in a state` of `issue-stats.ts` does (`issue-stats.ts:76`). The sums are the same either way; `n` and the median are not. Over cb4's record the counts of ended stays are that tool's (below) |
| "the part of a stay that is inside the span" | A stay that was over by `since` is no row, the one that ended at `since` among them. One that began inside the span is a row whatever its length: 0 ms for one that began at `until` | A stay of no length (two moves in one millisecond) is a stay, and `n` counts stays. One that only touches the span at `since` is not in it |
| `needs-owner` "to the one that took it off, to the close, or to `until`" | The time an issue that is not closed has the label. So an issue closed with the label on and opened again with it still on waits again from the reopen | The spec does not say. The other reading, that the wait is over for good at the close, leaves an open issue with the label in no row |
| The label put on an issue that has it | Begins nothing | `issueApply` keeps labels as a set |
| `flow.submits`, "the next of `rework`, `respec`, `send-back`, `pass`, `to-approval`" | The first of the five after the submit and before the issue's next `submit` or `submit-spec`. With none read by `until`, 0 | A submit the owner rejected out of review and that was submitted again would take the second submit's verdict. As written otherwise: a spec that passed (`to-approval`) and was then sent back by the owner (`send-back`) is 0, since `to-approval` is the first of the five |
| `summaries` of `flow.submits` | The same `{ n, median, p85, max }`, over the values 1 and 0 | The spec's shape of an answer. The share sent back is `sum / n` of the rows |

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed
(on `main` as `6a152060`) and after a `worktree.sh --rebase` that brought nothing in. The rebase
under the landing lock brought in `brain-topic.ojs`, a record and `seen.json`, none of which this
module is built from: the module of the build made then was the file the tests had run on (`cmp`).

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 ran, hash `d0529566c96d`) | `passed` 32, `failed` 0, `needsBrowser` 15 |
| The same `--with` the build, with `issueFlowMetrics` and `issueFlow` put back to the deployed text | `passed` 30, `failed` 5: `no such metric: flow.open` twice, `flow.stays`, `flow.submits`, and the changed text of task 1's test |
| `bun test.ts brain-x-issues --with …/.emitted/fm-2-open-stays-submits.js` (the build) | `passed` 35, `failed` 0, `needsBrowser` 15 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…` (Chrome 151.0.7922.34) | `tests` 50, `passed` 50, `failed` []; emitted hash `556d47216d31` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":50` in each of the 20 lines |

Fourteen changes of one line each were made to a copy of the built module, and `test.ts --with`
was run on each. Thirteen failed one of the new tests and no other (`passed` 34, `failed` 1):

| The line changed | The test that failed |
|---|---|
| A closed issue is a row of `flow.open` | `test_issues_flow_open_is_each_issue_not_closed_at_until` |
| `flow.open` leaves out an issue opened before `since` | the same |
| A stay in a closed state is a row | `test_issues_flow_stays_are_the_time_between_two_moves` |
| The label counts while the issue is closed | the same |
| The whole stay as the value, not its part in the span | the same |
| A stay that ended at `since` is a row | the same |
| A swap ends no stay | the same |
| `needs-owner` with `waits` `work` | the same |
| The verdict not bounded by the next submit | `test_issues_flow_submits_count_the_ones_sent_back` |
| Any later sending back counts, a `pass` or a `to-approval` before it not read | the same |
| `submit-spec` is no row | the same |
| `since` not read for a submit | the same |
| A stay of an issue whose id starts `test-` is a row | `test_issues_flow_stays_are_the_time_between_two_moves` |

The fourteenth, such an issue counted by the three other metrics, failed three (`passed` 32,
`failed` 3): task 1's test of the four clocks and the tests of `flow.open` and `flow.submits`.

## Over cb4's record

Not a test and not kept: a script in the session's scratch directory put one more cell into a copy
of the built module, which `cloud-brain-dev/test.ts --with` then ran. The cell gave `issueFlow` the
3601 events `issue.sync` answered the writer's token by 04:13 CEST (the file's time; 12 of them hidden). With
`until` 1791751911704, the `at` of event 2727, which the spec's checks name:

```
flow.open by state    open 58, triaged 24, building 10, spec 3, awaiting-approval 2, in-progress 2
flow.open by waits    start n=82 median 3.25 h p85 8.32 max 27.77   work n=15 1.62 4.77 11.10   owner n=2
flow.open, feedback   n=51 median 4.39 h p85 11.36 max 12.26
flow.stays, ended     open 241 147.38 h   triaged 130 180.89   ready 115 49.29   in-progress 179 62.49
                      in-review 173 25.93   awaiting-approval 32 7.86
flow.stays by waits   start 710.86 h   work 129.77 h
flow.stays, owner     awaiting-approval 34 stays 8.54 h   needs-owner 61 waits 192.49 h, 6 not ended
flow.submits          n=202 sum=70   (submit 172, 54; submit-spec 30, 16)
```

Against the spec, "What exists today" and its checks for task 3:

- The six counts by state are the spec's.
- The six lines of ended stays are the lines of `issue-stats.ts` there, to the stay and to 0.1 h.
- 710.9 h before a start and 129.8 h at work: the same.
- The age of the 51 open feedback issues, 4.4 h, 11.4 h and 12.3 h: the same.
- 8.5 h at `awaiting-approval`, 202 submits and 70 sent back: the same.
- `needs-owner` is not: the spec has 242.9 h in 54 intervals, 6 not ended. A second count, in
  Python over the same events and by the spec's own sentence, gave 61 waits, 6 not ended and
  192.5 h, as the cell does. 54 is what that count gives when an issue opened with the label is
  left out (7 were), with 190.56 h. The 242.9 h was not reproduced: counting only the states
  `closed` and `rejected` as the close gave 244.55 h with 8 not ended. The spec's scripts are not
  kept. This check is task 3's on cb4, where the spec says "near 242.9 h".

`cost.ms` of the 16 asks (8 at event 2727, 8 over the whole record), on this machine under bun:
1 to 4. That is the function alone, with the events already parsed.

## Not tried

- `issueFlow` in a Worker. Nothing on cb4 calls it until task 3. What the deploy changed there is
  the Worker's hash and its reference text.
- A record with more than one policy in a test, and so a swap of an install's `migrate` in a test:
  the swap in the test of stays is `promote`. cb4's record has such swaps, and its counts of ended
  stays are those of `issue-stats.ts` (above).
- A workflow with a state named `needs-owner`. Its stays would be added to the waits with the label.
- A state other than `open`, `triaged`, `ready` and `awaiting-approval` that waits for a start or
  for the owner in an installed policy: `waits` reads those four names.
- Two events with one `at`, and an event whose `at` is lower than that of the event before it. A
  stay's value is the difference of two `at`, and was not seen below 0.
- A stay that began before `since` and ended after it with the record's real times: the test's
  times are whole hours, with `since` a quarter of an hour in.
- The page's draws over these rows (`table`, `share`): task 5.
- A record of a size cb4 does not have yet.
