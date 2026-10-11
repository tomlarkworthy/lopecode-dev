# os-3-stats-past-four-hours

2026-10-11. Task 3 of `plan/cloud-brain-loop-order-of-service.md` (approved at event 2611), part 4
of its design, requirement R4. One change in a local tool, `tools/cloud-brain/issue-stats.ts`, with
its tests. No seed, no deploy.

## What the tool prints now

Read from cb4 at event 2683, 22:37:05 CEST, with the feedback rows of the first list left out:

```
open and idle for 4 h or more
  annotate-home-not-on-observable          task     triaged             6.4 h    by issues-reviewer-2
  dv-5-read-first-20-runs                  task     triaged             4.8 h    by issues-implementer-2  held
past 4 h, not started, no reason: 3 (2 more are held)
  n39625a1a                                bug      triaged              11 h with no move
  annotate-home-not-on-observable          task     triaged             6.4 h with no move
  flow-metrics                             project  open                4.3 h with no move
```

How it was run: the worktree has no tokens, so the record was read with the main checkout's
`issue-as.sh impl-8fe743 "sync?after=…&limit=500"` into a file, and `report` and `text` of the
worktree's tool were called on that file by a script of this writing, not kept. The tool's own
`main` was not run on cb4 before the landing; the run after it is in the issue's comment.

Two of the three counted rows are in no line of the list above the count. `n39625a1a` and
`flow-metrics` each got the label `owner` at 22:35:59 and 22:36:00 (events 2676 and 2678, of
`os-1`), which is an event and so ended their idle time; their last move is 11 h and 4.3 h back.
That is the case the spec gives for counting from the last move.

The spec's "Today" for R4 is 1, by hand at event 2310. That 1 was read from the list of the idle.
The line counts 3 at event 2683, and no count of it at 2310 can be made: the clock of the line is
the machine's at the run, with `--until` too (below).

## What a row is, and what a reason is

- A row: not closed, not `feedback`, not labeled `needs-owner` now, at `open`, `triaged` or
  `ready`, and `--idle` hours (4 with no flag) or more since its last `moved` or `swapped` event,
  or since its open when it has neither. The spec says "not at a state where an agent is on it";
  the three states are this writer's reading of that, and they are the three its table "Where the
  time before a start is" counts. A project at `approved` or `building` is no row.
- A reason: a comment whose body, after leading spaces, begins `held:`, or the reason of the
  issue's last `triage` move with the word `held` (`/\bheld\b/i`).
- A row with a reason is in `unstarted.held` of `--json`, is left out of the count, and has
  `held` at the end of its line in the list of the idle when it is in that list.
- `(2 more are held)` and the rows under the line are additions to the spec's line. The line
  begins as the spec has it, so its check (`the line past 4 h, not started, no reason`) reads it.
  With `--idle 2` the line begins `past 2 h`.

Choices the spec does not make, taken here:

- **A reason is read wherever it is in the issue's record.** A triage reason "Held at triaged
  until: x" still marks the issue after a `ready` move, and a `held:` comment after any later
  move. The spec says "a last triage reason", with no bound. The other reading, a reason of the
  present stay only, would un-hide such an issue 4 hours after the move; it needs the orchestrator
  to write `held-2`, and the spec's key is `held-1`, "once". On cb4 at event 2683 neither of the
  two held rows is such a case: both are at `triaged` by the triage that holds them (events 976
  and 1074).
- **`Held:` with a capital marks too.** The spec's "in either case" can be read of the triage
  reason alone.
- **The word rule can mark an issue nobody held.** Event 299 is a triage whose reason has "while
  the test held console.log". That issue (`tests-replace-console-log`) is at `done`, so it is no row. The rule is the spec's.
- **The key is not read.** Any comment that begins `held:` is a reason, whoever wrote it. The
  spec names the key `orch/<id>/held-1` for the orchestrator's; no comment on cb4 begins `held:`
  at event 2683 and no key has `/held-` (a script over the events read as above).

## The tests

Four tests added to `tests/tools/issue-stats.test.ts`, over 23 issues made in the file (`grep -o 'open4("[a-z0-9-]*"' | sort -u | wc -l`) with a
clock given to `report`. They hold: the count from the last move with a comment an hour ago; an
issue never moved; each reason and each thing that is none (`held` not at the start of a comment,
`held` with no colon, an empty body and a body that is not there, `upheld` and `withheld`, a triage
reason replaced by a later triage, `held` in the reason of a `ready` move); the ten
issues that are no row (the `x-` ones and `test-x`); the label `needs-owner` taken off again; `--idle 2` and `--idle 10`; and
`--until` before a `held:` comment.

```
$ bun test ./tests/tools/issue-stats.test.ts          # in the worktree, after the rebase on main at 5e7e04a1
 21 pass
 0 fail
$ git show HEAD~2:tools/cloud-brain/issue-stats.ts > <scratch>/issue-stats.ts                    # the tool before
$ ISSUE_STATS_TS=<scratch>/issue-stats.ts bun test ./tests/tools/issue-stats.test.ts
 17 pass
 4 fail
$ bun test ./tests/tools                              # in the worktree, after build.ts --out there
 395 pass
 1 skip
 0 fail
```

All were run after the rebase. The four that fail on the tool before are the four added.
Before the rebase and before a build in the worktree the last command gave 382 pass, 1 skip,
1 fail: `tests/tools/issue-lock-sql.test.ts` read `tools/cloud-brain/.emitted/cloud-brain.html`,
which a new worktree does not have. With the build it gave 389 pass. The rebase brought in
`tests-tools-fail-in-a-fresh-worktree` and six more tests; the suite was not run there without a build.

## Not tried

- The tool's `main` on cb4 before the landing (above).
- A run two passes after `os-2`, which is the "After" of R4 in the spec (0). `os-2` had not landed
  when this was written: `grep -c "A place goes, in this order" .claude/skills/brain-maintenance/SKILL.md`
  gave 0 in the worktree.
- `--until` with a clock of that event. `report` takes `now` from the machine for both lists, as
  it did for the list of the idle (`records/ta-2-stats-by-prefix.md`, "Not tried"). A count of the
  line "at event N" is therefore a count of the record up to N at the time of the run.
- A `security` issue, and a project at `approved`. The states are read by name, so the first is a
  row at `open`, `triaged` or `ready` and the second is none; no test has either.
- A `swapped` event in a test. On cb4 `n39625a1a` is counted from one (event 489), 11 h.
