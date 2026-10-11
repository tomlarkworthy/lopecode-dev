# lk-5-stats-print-the-holds

## Round 1, 2026-10-11: `issue-stats.ts` prints the holds of the locks

Task 5 of `plan/cloud-brain-locks-held-in-the-cluster.md` (approved at event 1453), requirement R8.
A local tool and its test file: no seed, no Worker, no deploy. The code is commit `63aa24b6`,
2026-10-11 20:17:59 +0200 (`git log -1 --format='%h %ci'` in the worktree, before the rebase of the
landing). The issue was started at 20:12:17 CEST (event 1623's `at`).

### What changed

`tools/cloud-brain/issue-stats.ts`:

- When it is run, one more read after the pages of `issue.sync`: `issue.locks?history=500`, through
  `issue-as.sh` with the same token. 500 is the most the method takes and the most the tracker keeps
  (`issuesLimits.lockHistory`, `brain-issues.ojs` line 191).
- **`holds(answer)`**, exported, counts what that read answered and calls nothing. For each name:
  the rows of the history, how many were released, the median and the longest hold of the released
  rows in seconds (`ended - taken`, one decimal), who held the longest and when it was taken, and the
  count of the rows `expired` and of the rows `forced`. `land` and `cb4` are always named. Any other
  name is named when it has a row of the history, a lock held or a lock ended.
- `report(events, { locks })` puts it under `locks`, so `--json` has it. With no `locks` given the
  report has no such field, and the six tests that were there call it that way.
- `text` prints a line `locks`, a line for each name, a line for each lock held, and a line for each
  row of `ended`.
- An answer with no `history` (a Worker put back to a version before `issue.locks`, a call that
  failed) is `{ unread: <its message> }`, printed as `locks  not read: …`. The rest of the report is
  printed.

The median is the file's own, which was inside `report` and is now above it: the element at
`length >> 1` of the sorted list, so of two holds it is the longer.

No clock of this machine is compared with a time of the tracker's. Which rows are held and which
have ended is the tracker's sorting (the spec, "A lock past its `until`"); the tool prints the two
lists as answered.

### What it prints

From the worktree's tool, on the 1626 events and the lock rows cb4 answered at 20:15:10 CEST. The
worktree has no tokens, so a script in the scratch directory read both with the main checkout's
`issue-as.sh issues-implementer-2` and gave them to `text(report(events, { locks }))`:

```
locks          5 holds in the history (the newest 500 are kept), 0 held and 0 ended and not taken since, at 2026-10-11 20:15:10
  land       0 released
  cb4        0 released
  probe-lk-1-issue-lock-methods   3 released  median 0.7 s  longest 2 s by a, taken 2026-10-11 19:58:07; 1 expired and 0 forced, not measured
  probe-lk-1-issue-lock-methods-20   1 released  median 0.7 s  longest 0.7 s by w5, taken 2026-10-11 19:58:10
```

The five rows are the probes of task 1 (`records/lk-1-issue-lock-methods.md`). The times are in this
machine's zone, as `date` writes them. The time on the first line is the answer's `now`.

`land` and `cb4` have no row: `lock.sh` is the directory lock until task 3, and nothing has taken
either name in the cluster.

The lines of a lock held and of one ended were not seen on cb4, where both lists were empty. From
the test's made rows:

```
  held   cb4 by w-held since 2026-10-12 10:58:20, until 2026-10-12 11:08:20
  ended  land by w-died at 2026-10-12 10:50:00, taken 2026-10-12 10:40:00; no row of the history yet
```

### Where it is not the spec's text, and why

| The spec | Built | Why |
|---|---|---|
| "prints a line `locks` with the count, the median and the longest hold of `land` and of `cb4`" (R8) | A line `locks` with the totals, then a line a name | Two names with five numbers each did not fit one line that is read by eye. `--json` has both under `locks.names` |
| Names `land` and `cb4` only | Every name with a row is printed | A probe's rows are in the same history and count against its 500. Left out, the first line's count would not be the sum of the lines under it |
| "A row of `ended` is printed as a line of its own (the name, who, when it ended)" | The same, and when it was taken | Its `until` less its `taken` is the lease and says nothing of the work; the take's time is what places it beside a writer's report |
| No word of a lock held now | A line for each | R8 asks "by whom". An oversight that runs during a landing reads who holds it from the same call |

### Runs, the writer's own

In the worktree `bm-lk-5-stats-print-the-holds`, 2026-10-11.

- `bun test ./tests/tools/issue-stats.test.ts`: 11 pass, 0 fail. Five are new.
- `ISSUE_STATS_TS=<main checkout>/tools/cloud-brain/issue-stats.ts bun test ./tests/tools/issue-stats.test.ts`,
  the tool before the change: 6 pass, 5 fail. The five that fail are the five new ones.
- `BRAIN_NOTEBOOK=<main checkout>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html bun test ./tests/tools`
  at 20:17:54 CEST (`date`): 265 pass, 0 fail.
- `bun test ./tests/tools` with no `BRAIN_NOTEBOOK`: 258 pass, 1 fail. The one is the `beforeAll` of
  `issue-lock-sql.test.ts`, which reads `tools/cloud-brain/.emitted/cloud-brain.html` of the worktree.
  A task with no build has no such file. Its seven tests are then not run, which is 265 less 7.

The new tests:

- The nine holds of the spec ("How long a lock is held": 7, 14, 2, 11, 92, 120, 138, 199 and 203 s)
  as nine released rows of `land`, beside a row `expired` of 600 s and, for `cb4`, a row `forced` of
  900 s: `land` is 9 released, median 92 s, longest 203 s, 1 expired; neither longer row is the longest.
- What cb4 answered to `locks?history=50` at 20:11:43 CEST (its `now`), whole: the counts by name and the five lines.
- The lines for a lock held and for a lock ended.
- A name that is only held, or only ended, is named.
- An answer with no `history`, no answer, and a report made with no `locks`.

### Not tried

- **The comparison the task asks for**, the first numbers against the nine of the spec. There are no
  first numbers: no hold of `land` or of `cb4` is in the cluster until task 3 puts `lock.sh` on it.
  What the tool says of the nine themselves is the first test above: median 92 s, longest 203 s.
- The part of the tool that reads (`import.meta.main`) is not loaded by a test. It was run from the
  main checkout at 20:19:14 CEST (`date`), after the push, as
  `bun tools/cloud-brain/issue-stats.ts --token=issues-implementer-2`: the five lines above, with
  20:19:17 on the first. With `--json`, `locks.names.land` was
  `{"rows":0,"released":0,"medianS":0,"longestS":0,"longest":null,"expired":0,"forced":0}`.
  With `--token=no-such-token` the tool ended on bun's error at the first read of `issue.sync`, as
  it did before this change; the read of the locks was not reached.
- `locks  not read: …` from a real call. The tests give `holds` an answer with no `history`. A
  tracker without `issue.locks` and an `issue-as.sh` that exits non-zero were not met.
- More than 500 holds. The tool then counts the newest 500 and its first line says so; nothing
  tells it that older rows were trimmed.
- `--after`, `--until` and `--window` do not reach the lock rows. They have times and no event, so a
  count of them written down beside an event's number cannot be made again as the other counts can.
  A window by time was not built: no oversight has read these lines yet.
- A row whose `how` is none of the three is in no test. One run with a made row `how: "odd"` of `land`
  answered `rows` 1 and 0 for `released`, `expired` and `forced`, and printed `land  0 released`: the
  first line counts it and the name's line does not show it. The tracker writes no such row.
- "The oversight reads them in place of the writers' LOCK TIMES lines" (the task). No brief names
  those lines: `grep -rn "LOCK TIMES" .claude/skills/brain-maintenance/` answers nothing. They are in
  the loop's journal, from the two times step 10 of `agents/implementer.md` has a writer put in its
  report. `agents/overseer.md` line 31 has the overseer run `issue-stats.ts`, which now prints the
  holds; that brief says nothing of them, and it is the overseer's to change (the issue's body).
  Step 10 still asks a writer for the two times. Not changed here: until task 3 the cluster has no
  hold of `land` to read in their place.

Searches of the Brain before the design (`knowledge.search?semantic=true`, token `loop-knowledge`):
"how long a lock was held median longest", "issue-stats report of the tracker record", "lease
expired holder died history rows". Each answered the spec itself
(`doc:cloud-brain-locks-held-in-the-cluster`); nothing else bore on it.
