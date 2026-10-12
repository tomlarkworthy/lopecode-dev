# The overseer's brief has the two reads the order-of-service spec gives it (`overseer-md-lacks-order-of-service-reads`)

Round 1, by a writer of the issue loop on 2026-10-12, in a worktree made at `e6cbcadf`. One
paragraph was added to `.claude/skills/brain-maintenance/agents/overseer.md` under "Measure first",
with a test file and a note in one row of the spec. No seed, no tool, no deploy.

The issue is labeled `major`: the overseer does not edit its own brief, so it filed the text
(event 3361) and a writer made the edit. The change takes effect when the owner approves it.

No overseer has run from the new paragraph. What follows is what the file says, what the test reads
in it, and one run of the count the paragraph asks for.

## What the spec gives the overseer, and the brief did not have

`plan/cloud-brain-loop-order-of-service.md`, two places:

```
the table of checks, R3   `issue-stats.ts --token=<own> --window <seq of the landing of os-2>`, the line `in-review`,
                          once 40 stays are in the window | median 6.3 min, 147 stays, whole record | read by the
                          overseer at its next oversight; ... A median over 6.3 is a finding for it
part 3, "Not known"       If that or memory binds first, the rule above does not see it, and the overseer adds the
                          sign that would have (its brief lets it edit the procedure).
```

`git grep -n -F 'in-review' e6cbcadf -- .claude/skills/brain-maintenance/agents/overseer.md`
printed nothing (exit 1).

## What changed

The paragraph stands after the one that ends "a number it lacks is a change you may make to it".
It differs from the text the issue proposed in four places:

- **The events of `os-2`.** The issue has "events 2844 to 2849". `issue-as.sh <token> "get?id=os-2-order-and-pool"`
  gives the `submit` at 2844 (23:29:34 CEST, 2026-10-11, by `date -r` of its `at`) and the `pass`
  to `done` at 2849 (23:34:40). The brief says which is which.
- **Where 6.3 is from.** The issue has "It was 6.3 min over the whole record before". The brief has
  "6.3 min over 147 stays, the whole record when the spec was written on 2026-10-11". The record
  moves: on 2026-10-12 at 03:21 CEST `issue-stats.ts --token=<token> --window=2849` printed
  `in-review 188 stays median 5.8 min` for the whole record. 6.3 is kept as the figure to read
  against, since it is the one in the spec the owner approved.
- **What a stay in the window is.** "the stays that began after event 2849": a move to `in-review`
  after that event, to the next move of the same issue out of it.
- **How the line is made.** The spec's check names a line the tool does not print. The same run
  printed, for the window, one line:

  ```
  window         517 events after 2849: 13 submits, 0 sent back; verdicts {"pass":12,"changes":1}; 0 of 125 texts name a time ahead of their own stamp []
  ```

  So the brief says to make it from `sync?after=2849`, and that `sync` answers 200 events a call.
  The first call of this run returned events 2850 to 3049 and gave 7 stays; four calls reached
  3367 (the fourth returned none) and gave:

  ```
  calls 4 events 518 2850 to 3367 stays 10 median 4.6 min 2.8 max 8.7 at in-review now 0      2026-10-12 03:24:58 CEST
  ```

  made by this, with `ev` the events of the four calls in order:

  ```python
  for e in ev:
      if e['type'] != 'moved': continue
      if e.get('from') == 'in-review' and e['id'] in inn: stays.append((e['at'] - inn.pop(e['id'])) / 60000)
      if e['to'] == 'in-review': inn[e['id']] = e['at']
  # statistics.median(stays)
  ```

  It is the count the overseer of events 2842 to 3358 made by hand (the issue: "10 stays at
  in-review after 2849, median 4.6 min (2.8 to 8.7)"). The window's "13 submits" is not 10 stays;
  which 3 submits are not a move to `in-review` was not looked at.

The sentence on a machine that carries no more writers is the issue's, with the place in the spec
after it.

In the spec, the R3 row of the table of checks gained "(As built, `overseer-md-lacks-order-of-service-reads`,
2026-10-12: …; the record.)" in its last cell. The row's check is the owner's approved text and stays.

## Two choices

**The tool was not changed.** The other side was to make `issue-stats.ts --window` print time in a
state for the window in this change, so that the brief names a line and no hand count. The issue
says "Not proposed here", triage took it as "the proposed paragraph in one brief", and the issue is
`major`: what the owner approves should be the text he is shown. Filed as
`stats-window-time-in-a-state` (event 3385, linked `related`). When it lands, the sentence of the
brief that begins "On 2026-10-12" is out of date and is that issue's to replace.

**The read is kept after the 40 stays.** The issue's "Not known: whether the owner wants this read
kept after the 40 stays". `philosophy.md`, "2. Self-healing, common sense": "Take the side that is
smaller and easier to undo". The brief sets no end to the fifth line; taking it out later is one
edit, and a line that ended by itself would be a second rule to write now.

## The test

`tests/tools/overseer-md-order-of-service-reads.test.ts`, 4 tests: the fifth line and its place
after the four, the figure with its source and the hand count, the sign and where it goes, and that
the spec still has the three texts the brief rests on. Run in the worktree, 2026-10-12:

```
bun test ./tests/tools/overseer-md-order-of-service-reads.test.ts                       4 pass, 0 fail
BRIEF=<the file of e6cbcadf, by git show> bun test ./tests/tools/overseer-md-order-of-service-reads.test.ts
                                                                                        1 pass, 3 fail
bun test ./tests/tools                                                                  468 pass, 1 skip, 0 fail, 469 tests across 51 files
```

The 1 pass before the change is the test of the spec. The suite's run was made after the last edit
of the brief, the test and the spec's row. The skip printed no `skipped:` line; `grep -n "always.skip" tests/tools/*.test.ts` names
one test, `light-agent.test.ts:230`, which runs only with `AGENT_SH_WRITTEN_OVER` set.

## Not tried

- An oversight run from the new paragraph. No overseer has read it.
- The 40 stays: the window had 10 at event 3367, so no median has been judged against 6.3 by the rule.
- An edit of `SKILL.md` step 2 with a sign. No report was read for one; step 2 still says "Not known".
- Whether a stay that began before 2849 and ended after it should count. None did: `os-2` itself
  left `in-review` at 2849.
