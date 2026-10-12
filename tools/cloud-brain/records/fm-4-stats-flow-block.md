# fm-4-stats-flow-block

Task 4 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379), "The tool"
(R7): `issue-stats.ts` prints a block `flow` from the method `issue.flow` of task 3. Written
2026-10-12. The tool's commit was made at 05:10:45 CEST that day (`git log --format=%ci`). A local
tool and its test file: nothing was built, emitted or deployed.

## What changed

`tools/cloud-brain/issue-stats.ts`, 64 lines more and 4 fewer; `tests/tools/issue-stats.test.ts`,
161 more; the spec, 5 more and 1 fewer, its two notes "As built" (`git show --numstat` of the commit).

- `flowAsks(record, untilSeq)` writes the four paths the tool gives `issue-as.sh`:

  ```
  flow?metric=flow.lead&by=to,kind&since=0
  flow?metric=flow.lead&by=for&to=deploy&since=0
  flow?metric=flow.open&by=waits
  flow?metric=flow.stays&by=waits&since=0
  ```

  With `--until SEQ` each ends `&until=` and the `at` of the last event of the record read whose
  `seq` is SEQ or less, 0 when there is none.
- `flow(answers)` takes the four answers and gives, for each, `{ since, until, events, rows }` or
  `{ unread }`. A row is an object of the answer's `summaries` as it came, in ms. The rows are put in
  the order printed: `to` as `response, submit, deploy, done`, `waits` as `start, owner, work`,
  `for` as `owner, loop`, a value outside those lists after them by name, and `kind` by name.
- `report(record, { flow })` has the key `flow` when the answers were given, as `locks` is; `--json`
  prints it.
- `text` prints the block between the lines of `locks` and `open and idle`.
- The main block makes the four calls after `issue.locks`, each in a `try` of its own.
- `ISSUE_AS` in the environment names another `issue-as.sh`. The test uses it for a stand-in, and
  it is how the tool was run from the worktree, which has no tokens, on the main checkout's script.
- The header comment of the tool, which is its reference, says the above.

The block at `--until 2727`, run from the worktree after the tool's last edit and before 05:09:55 CEST
(`ISSUE_AS=<main checkout>/tools/cloud-brain/issue-as.sh bun tools/cloud-brain/issue-stats.ts --token impl-c31679 --until 2727`):

```
flow, as issue.flow answered: n, the median and the 85th of its summaries
  from opened to a clock, by kind, of 2727 events to 2026-10-11 22:51:51
    response  bug         59  median    0.02 h  85th    1.41 h
    response  feature      8  median    0.02 h  85th    0.12 h
    response  feedback    43  median    1.03 h  85th    2.63 h
    response  project     11  median    0.12 h  85th    0.32 h
    response  task       105  median    0.00 h  85th    0.05 h
    submit    bug         36  median    0.40 h  85th    2.86 h
    submit    feedback     6  median    0.56 h  85th    1.47 h
    submit    task        77  median    0.43 h  85th    1.78 h
    deploy    bug         14  median    0.52 h  85th    2.05 h
    deploy    feature      3  median    0.95 h  85th    2.03 h
    deploy    feedback    31  median    1.01 h  85th    7.26 h
    deploy    project      5  median    0.99 h  85th    6.10 h
    deploy    task        27  median    0.43 h  85th    2.41 h
    done      bug         36  median    0.60 h  85th    2.91 h
    done      feature      2  median    1.38 h  85th    3.14 h
    done      feedback    51  median    0.39 h  85th    1.46 h
    done      project      2  median    1.34 h  85th    1.95 h
    done      task        74  median    0.61 h  85th    2.30 h
  from opened to deploy, by whom it was for, of 2727 events to 2026-10-11 22:51:51
    owner                 11  median    0.67 h  85th    1.47 h
    loop                  69  median    0.93 h  85th    2.47 h
  open, by what it waits for: its age, of 2727 events to 2026-10-11 22:51:51
    start                 82  median    3.25 h  longest   27.77 h
    owner                  2  median    0.75 h  longest    2.26 h
    work                  15  median    1.62 h  longest   11.10 h
  stays, by what was waited for: the hours of them, added from its series, of 2727 events to 2026-10-11 22:51:51
    start                568  total   710.86 h
    owner                 95  total   201.04 h
    work                 448  total   129.77 h
```

Against what is written elsewhere of that event:

- **R7's check**: the line `deploy feedback` is 31, 1.01 h and 7.26 h, the R1 call of
  `records/fm-3-issue-flow-method.md`. With `--json` the row is
  `{"to":"deploy","kind":"feedback","n":31,"median":3645001,"p85":26131642,"max":36012844}`.
- The block has the line by `for`: 11 for the owner and 69 for the loop, 80, which is the five
  `deploy` lines by kind added (14, 3, 31, 5, 27).
- `open`: 82, 2 and 15 are 99, and the line `states` of the same run less its closed states is
  58 `open`, 24 `triaged`, 10 `building`, 3 `spec`, 2 `awaiting-approval`, 2 `in-progress`: 99.
- `stays`, `owner`: 201.04 h is the 192.50 h of `needs-owner` and the 8.54 h of
  `awaiting-approval` in the record of task 3.

## Where the spec is silent or was not followed, and what was taken

| The spec | Built | Why |
|---|---|---|
| "The numbers are the answer's `summaries`; the tool computes none of them", and "the hours of `flow.stays` by `waits`" | `n`, the median, the 85th and the longest are rows of `summaries`. The hours of the stays are the `sum` of the answer's `series` rows, added by the tool for each `waits` | A row of `summaries` is `{ n, median, p85, max }` and has no sum. The other reading, the median and the longest stay, is not "the hours of" them: R5 of the spec reads `sum`. The heading of the lines says they are added from the series |
| The unit | Hours to two places, `(ms / 3600000).toFixed(2)` | The check names 1.01 h. `H` of the tool is one place and would print 1.0 |
| "`--until SEQ` sends the `at` of that event as `until`" | The `at` of the last event read at or before SEQ. A SEQ past the record sends the last event's `at`, one before the first sends 0 | The rest of the tool reads `--until` as `e.seq <= until`. `until=0` answers no rows (task 3's record) |
| No `--until` | No `until` is sent | The method then takes the `at` of the record's last event. An event written between the tool's read of `issue.sync` and its asks is in the block and not in the lines above it; each heading of the block prints the answer's own `events` and `until` |
| `--after`, `--window` | Not sent | The spec names `--until` alone. The header says they do not reach the block |
| An ask that is refused | `not read: <the answer's message>` in the place of that list; the other three are printed and the tool is exit 0 | As the line `locks` does for a Worker put back to before the method |
| One ask or four | Four, one for each list | Each list is another `by`. On cb4 one took 0.77 to 0.89 s from this machine in task 3's record; the four were not timed here |

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the tool and
of the test file.

| Command | Result |
|---|---|
| `bun test ./tests/tools/issue-stats.test.ts` at `main` (`4bcab152`), before any edit | 27 pass, 0 fail. The spec has "21 pass"; the file has grown since it was counted |
| The same after the change | 32 pass, 0 fail, 161 `expect()` calls |
| `TZ=Asia/Tokyo bun test ./tests/tools/issue-stats.test.ts` | 32 pass, 0 fail |
| `ISSUE_STATS_TS=<scratch>/before.ts bun test ./tests/tools/issue-stats.test.ts`, `before.ts` being `git show main:tools/cloud-brain/issue-stats.ts` | 27 pass, 5 fail: the five new tests |
| `bun test ./tests/tools` | see "The whole suite" below |

The five tests: `flow` over four answers made in the file (the first has six of cb4's rows for
event 2727, out of order, and one `to` the order does not know); the lines printed; an answer with
no `summaries`, with `summaries` of another type, no answer, and no `flow` given; `flowAsks` with
no `--until`, a SEQ in the record, one between two events, one past the last, one before the first,
an empty record and a record out of order; and the tool run whole with a stand-in for `issue-as.sh`
that writes down each call, for a run with no flag, a run with `--until 4 --json`, and a run where
one ask answers a refusal and one exits 7.

Ten changes of one line each were made to a copy of the tool, and the file's tests were run on
each copy with `ISSUE_STATS_TS`. Each failed a test:

| The line changed | pass, fail |
|---|---|
| Hours to one place | 29, 3 |
| No `until` sent with `--until` | 30, 2 |
| `until` is the SEQ and not its `at` | 30, 2 |
| The rows left in the answer's order | 30, 2 |
| A stay's sum is of every `series` row | 30, 2 |
| The first list prints `max` as the 85th | 29, 3 |
| The answers not given to `report` | 31, 1 |
| The ask by `for` sent by `kind` | 30, 2 |
| A failed ask thrown again | 31, 1 |
| `ISSUE_AS` not read | 31, 1 |

On its first run the last test failed, 31 pass and 1 fail: the tool it spawned, given the test's
`process.env` as it was, printed the heading's time as 22:51:51, this machine's zone, and the test's
own `local` gave 20:51:51. `echo $TZ` in the shell printed nothing. The test now gives the spawned
tool `TZ`, the zone `Intl.DateTimeFormat()` names in the test.

## On cb4

Besides the run above, from the worktree with `ISSUE_AS`, the tool as committed:

- No `--until`, 05:09:55 CEST (`date`): the line `record` read 3653 events, and each of the four
  headings read `of 3653 events to 2026-10-12 05:01:14`. 18, 2, 3 and 3 rows.
- `--until 2727 --json`: `events` 2727, and each of the four parts of `flow` has `until`
  1791751911704 and `events` 2727, with 18, 2, 3 and 3 rows.
- `--until 99999999`: the headings read `of 3653 events`.

The run the spec names, from the main checkout after the landing, is in the comment of the submit.

## The whole suite

`bun test ./tests/tools` in the worktree, after the last edit of the test file and before the rebase
of the landing: 497 pass, 1 skip, 0 fail, 498 tests in 54 files. Each file run alone
(`for f in tests/tools/*.test.ts; do bun test ./$f; done`), `tests/tools/light-agent.test.ts` is the
one that reports a skip: 18 pass, 1 skip, 0 fail. Its line 230 skips the test "agent.sh written over
while claude runs" unless `AGENT_SH_WRITTEN_OVER` is set or `agent.sh` is read whole. Not looked at
further.

## Not tried

- A row of `summaries` that lacks `median`, `p85`, `max` or its dimension. The tool prints what
  `toFixed` gives of it; `flow.lead` on cb4 answered each.
- An ask that times out (`issue-as.sh` gives curl 30 s) or answers no body. The test's failed ask
  is an exit 7; the refusal with a body is a made one, not a 400 or a 501 of cb4 through the tool.
- A token that has ended. `issue.sync` is then refused first, and the tool reads that as a record
  of no events, as it did before this change.
- A record of more than 500 events through the stand-in (the stand-in answers 3).
- How long the four asks add to a run of the tool.
- `--after` and `--window` with the block: they are not sent, and no test holds that the block is
  the same with them.
- The briefs that send a reader to the tool (`agents/overseer.md`, "Measure first"; `agents/spec.md`,
  step 3) do not name the block. They were not changed.
