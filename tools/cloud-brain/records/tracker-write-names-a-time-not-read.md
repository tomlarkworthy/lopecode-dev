# tracker-write-names-a-time-not-read

## Round 1, 2026-10-11: `issue-as.sh` does not send a time that is ahead of the clock

Agents wrote estimated clock times into the tracker ("Checked 11:10" in a reason stamped 11:06:03,
event 418). Three brief edits said to read the time from `date` and it went on (the issue, event
536). Triage took the issue's side (a): the tool refuses (event 543). The change is in
`tools/cloud-brain/issue-as.sh` and `tests/tools/issue-as-time-check.test.ts`, first committed
2026-10-11 11:57:46 +0200 (`git log --format=%ai`). No seed, no Worker, no deploy.

### What it does

Before the token file is read or `curl` is started, a POST body that parses as a JSON object has its
`reason` and `body` read for `HH:MM` and `HH:MM:SS`. A time more than 60 s ahead of the machine's
clock is printed with the clock, and the script exits 3:

```
issue-as.sh: not sent. The reason names 11:10, 4 min ahead of the clock (2026-10-11 11:06:00 CEST).
issue-as.sh: a time in a tracker write is read from `date` or an event's `at`, never estimated. A time of another day: write its date (YYYY-MM-DD) beside it. A time that is rightly ahead (a lease's end), or quoted from a text that has it wrong: ISSUE_AS_TIME_AHEAD=1.
```

Which day a time is of: the `YYYY-MM-DD` nearest to it in the same field, the one before it on a
tie. A time whose nearest date is not today is not compared. A time with no date in the field is
taken as today's. A time followed by `Z` or `UTC` is compared with the clock in UTC.

### Decisions, each by line 2 of `philosophy.md` (the smaller side, easier to undo)

- **The nearest date, not "the text names another date".** The issue's wording was "the same text
  names today's date or no date". Read for the whole text, one earlier date anywhere would switch
  the check off, and the texts that failed quote earlier commits beside today's estimate (review
  466: a record line "at 11:35" beside commit `3cb43d9b`). The other per-time rule was the nearest
  date before the time only. It refuses "at 20:47, 21:08, 23:46 on 2026-10-10", a phrase of the
  issue's own body, when the text has no earlier date.
- **A way past it, `ISSUE_AS_TIME_AHEAD=1`.** The issue did not know how often a body rightly names
  a time ahead. The replay below found a second case it did not name: a correction or a review that
  quotes the estimate. Without the variable those writes could not be sent. With it an agent can
  send an estimate too; the refusal has by then printed the clock beside the time.
- **A check that cannot run sends.** The Python exits 3 for a refusal and the shell stops on 3 only.
  A body that is not JSON, or a failure of the check itself, goes out as before
  (test "a check that cannot run sends").
- **`reason` and `body` only**, as the issue says. `title` is not read.

### Replay over the record

Each event of cb4's record with a `reason` or a `body`, sent through a copy of the script with a
stand-in `curl` and `ISSUE_AS_NOW` set to the event's own `at` (`issue.sync?after=0,200,400&limit=200`,
read 2026-10-11 11:56:18 CEST by `stat` of the files, events 1 to 546):

```
events 1-200     168 with text    2 refused
events 201-400   189 with text    6 refused
events 401-546   118 with text   15 refused
```

23 of 475. By what the text around the time says:

| Events | What | Count |
|---|---|---|
| 104, 343, 344, 345, 346, 348, 360, 417 to 421, 445 | a time given as read that the stamp shows was ahead: "17:59 to about 18:05 CEST by `date`" stamped 18:03:00, "Seen 2026-10-10 23:30 CEST" stamped 23:24:45, "Checked 11:10" stamped 11:06:02 to 11:06:04 | 13 |
| 105, 422 to 426, 466 to 469 | a quote of such a time, to correct it or to report it in a review: `not the "about 18:05" its body says`, `record line 219 says 11:35, its commit is 11:19:55` | 10 |

I read the text of 104, 105, 343, 344, 346, 360, 422, 466 and 468. The others are placed by the
same time in an event of the same second or the next (345 with 344, 348 with 346, 423 to 426 with
422, 467 and 469 with 466 and 468); their text was not read.

The issue counted events 417 to 421 and 445. Seven more estimates from 2026-10-10 are in the record
(104, 343 to 346, 348, 360). The 452 events that pass were not read for estimates the check misses.

### Tests

`bun test ./tests/tools/issue-as-time-check.test.ts`, in the worktree, 2026-10-11 (`date` after the two runs: 11:56:48 CEST):
14 pass, 0 fail, 49 expect() calls. `bun test ./tests/tools` there: 104 pass, 0 fail, 12 files.

Against the script as it was before the change, with the first 13 tests written: 6 pass, 7 fail,
each `Expected: 3, Received: 0`. The 14th ("a check that cannot run sends") was added after the
change and passes against both.

The test copies the script beside a token file of its own and puts a stand-in `curl` first on
`PATH`; no call leaves the machine.

### What it does not catch

- A time behind the clock: the reviewer's first check, given as 11:13 when it "was about 11:20"
  (the issue, review 467).
- A date with no time, and words ("this morning", "ten minutes ago").
- A time ahead whose nearest date is another day's: "the edit of 2026-10-10 did not hold; checked 12:10".
- A time in a record file or a commit message. `records/review-the-default-workflow.md` line 219,
  "Found by the fresh review at 11:35" in a commit of 11:19:55, went through `git commit`, not this tool.
- A write that does not go through `issue-as.sh`: `brain.ts curl --as`, the tracker's panel.
- `1:30 pm` is read as 01:30.

### What it refuses that is right

- A time of another day with no date beside it: "the loop was stopped at 21:25", written the next
  morning. The refusal says to write the date. Just after midnight this is every time of the evening before.
- A quote of a time that is ahead, and a lease's end or a schedule later today. Both are sent with
  `ISSUE_AS_TIME_AHEAD=1`.

### Not tried

- No brief was changed. The issue did not propose a fourth line, and the refusal says what to do.
- A machine whose clock is wrong, or an agent in another time zone than the one it writes
  (the test sets `TZ=Europe/Berlin`; this machine is CEST).
- Whether agents now set `ISSUE_AS_TIME_AHEAD=1` to pass an estimate. The count that would show it
  is the replay above over a later window. The replay was a scratch script and is not kept: for
  each event, `ISSUE_AS_NOW=<the event's at, local> issue-as.sh t x '{"reason":…,"body":…}'` on a
  copy with a `curl` that does nothing, counting exit 3.
