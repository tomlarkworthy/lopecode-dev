# `issue-stats.ts --window` prints the time in a state of the window (`stats-window-time-in-a-state`)

Round 1, by a writer of the issue loop on 2026-10-12, in a worktree made at `6b40ceb0`. A local
tool, its test file, one sentence of the overseer's brief with that brief's test, and a note in one
row of a spec. No seed, no deploy.

## What was wrong

`plan/cloud-brain-loop-order-of-service.md`, the table of checks, R3, reads "the line `in-review`"
of `issue-stats.ts --window <seq>`. The tool had no such line. From the main checkout, before the
change, `bun tools/cloud-brain/issue-stats.ts --token=<token> --window=2849 --until=3367` printed
the stays of the whole record and one line for the window:

```
  in-review          188 stays  median    5.8 min  total  27.2 h  max 2.1 h
window         518 events after 2849: 13 submits, 0 sent back; verdicts {"pass":12,"changes":1}; 0 of 126 texts name a time ahead of their own stamp []
```

The cause is one line of `report`: a stay was kept as `[state, milliseconds]`, with nothing that
says when it began, so no stay could be put in or out of a window.

## What changed

`tools/cloud-brain/issue-stats.ts`:

- An issue keeps `sinceSeq`, the seq of the event that put it in its state (the `opened` event, or
  the move or swap), and a stay is `[state, milliseconds, sinceSeq]`.
- `report(...).window.timeInState` has, by state, the stays whose `sinceSeq` is greater than
  `--window`, in the shape of `timeInState` of the whole record and made by the same function
  (`timeIn`). It is `{}` with no `--window`.
- `text` prints them above the `window` line, under the heading
  `time in a state, of the stays that began after <seq>`, with the formatter of the whole record's
  lines. When no stay is in the window the line under the heading is
  `  none: no stay began after it and ended`.

The same driver over the same record after the change (`report` and `text` of the worktree's file,
the events read with the main checkout's `issue-as.sh`, since a worktree keeps no token), window
2849, record cut at 3367, run 2026-10-12 03:55 CEST:

```
time in a state, of the stays that began after 2849
  ready               13 stays  median    2.7 min  total   0.6 h  max 0.1 h
  in-progress         10 stays  median     13 min  total   2.3 h  max 0.5 h
  in-review           10 stays  median    4.8 min  total   0.8 h  max 0.1 h
  spec                 3 stays  median   11.4 min  total   0.7 h  max 0.3 h
  spec-review          3 stays  median    2.4 min  total   0.1 h  max 0.1 h
  triaged              3 stays  median      0 min  total     0 h  max 0 h
  open                 3 stays  median    0.7 min  total   0.3 h  max 0.3 h
```

**10 stays, as the hand count; 4.8 min where the hand count has 4.6.** The record of
`overseer-md-lacks-order-of-service-reads` has "stays 10 median 4.6 min 2.8 max 8.7" at event 3367.
A second count by hand in this round (each move to `in-review` after 2849, to the next move of that
issue, up to 3367) gave these ten, in minutes:

```
[2.8,2.8,3.9,4.4,4.4,4.8,5.1,6.3,7.3,8.7]
```

The two middle ones are 4.4 and 4.8. Their mean is 4.6; the tool's `median` is
`sorted[length >> 1]`, the upper of the two, for every line it prints. It was left as it is: the
figure the spec reads against (6.3 min, 147 stays) was made by that function, and a window line
made another way would not compare with it. The brief now says which of the two the tool takes.

With no `--until`, at 03:55 CEST the same driver read 3566 events: the whole record
`in-review 193 stays median 5.7 min`, the window `in-review 15 stays median 4.4 min`.

## Three choices

**Every state, not `in-review` alone.** The issue asks for a line for `in-review` and leaves the
other states "not looked at". They come from the same loop, and the overseer reads `open` and
`ready` of the whole record already. One state alone would have been a filter added to that loop.

**`--after` does not cut the window's stays.** The header says of `--window`: "counts the events
after that one, whatever issue they are of", and the `window` line is counted that way. The whole
record's stays are of the issues `--after` leaves. The window's are of every issue but a `test-`
one, as the `window` line is. The other side, to follow `--after`, would make the two lines of one
window count different issues.

**The sentence of `agents/overseer.md` was replaced in this change.** The issue has "the edit is a
major task or part of this one"; the record of `overseer-md-lacks-order-of-service-reads` has "When
it lands, the sentence of the brief that begins "On 2026-10-12" is out of date and is that issue's
to replace"; triage gave this issue no `major` label. `SKILL.md`, "Why the overseer may edit briefs
and not rules", keeps the overseer from its own brief and from removing a check. This edit is a
writer's, is read by a reviewer, and removes no check: the fifth line of the entry, the figure 6.3
and the 40 stays stand as they were. `philosophy.md`, lines 2 and 3, decided it: the smaller side,
and a brief that told its reader to count by hand what a tool prints would be at fault. In the
spec, the row of R3 keeps the owner's approved text and gained a second "(As built, …)" note.

## Tests

`tests/tools/issue-stats.test.ts`, 3 new tests over 23 events made for them: a stay that began
before the window and ended in it is of the whole record only; the event `--window` names is not
after itself; a stay whose move out is after `--until` is not counted; an issue still in the state,
a `test-` issue and a hidden move give no stay; `--after` does not cut the window; the lines
printed, their place above the `window` line, no heading without `--window`, and the `none` line.

`tests/tools/overseer-md-order-of-service-reads.test.ts`: the second test reads the new sentence
and that `io "sync?after=2849"` is gone from the section, and a fifth test reads that the heading
the brief names is in `issue-stats.ts`.

Run in the worktree on 2026-10-12, after the last edit of these files:

```
bun test ./tests/tools/issue-stats.test.ts                                                  27 pass, 0 fail
ISSUE_STATS_TS=<main checkout>/tools/cloud-brain/issue-stats.ts bun test ./tests/tools/issue-stats.test.ts
                                                                                            24 pass, 3 fail (the 3 new)
bun test ./tests/tools/overseer-md-order-of-service-reads.test.ts                           5 pass, 0 fail
BRIEF=<overseer.md of main, by git show> bun test ./tests/tools/overseer-md-order-of-service-reads.test.ts
                                                                                            4 pass, 1 fail (the second)
```

The count of the whole of `./tests/tools` is in the comment of the issue, from a run made after
this file was written.

## Not tried

- The tool's own `main` in the worktree: it calls the `issue-as.sh` beside it, which has no token
  there. The lines above are `report` and `text` of the changed file over events read by a short driver
  in the scratchpad. The tool as landed is run once from the main checkout after the
  landing, and that run is in the comment.
- `--json` with `--window`: the report has `window.timeInState`; no run printed it.
- A `swapped` event in a window. The fixture has moves only; a swap sets `sinceSeq` on the same
  line of the tool as a move does.
- No overseer has run from the new sentence of the brief.
- The older entries of `oversight.md` and the record of `overseer-md-lacks-order-of-service-reads`
  say the tool has no such line. They are dated and were left as they are.
