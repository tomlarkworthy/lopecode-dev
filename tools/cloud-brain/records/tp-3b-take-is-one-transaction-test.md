# brain-x-topic: a test of "a take is one transaction" that can fail (`tp-3b-take-is-one-transaction-test`)

The owner's B on `tp-3-take-and-done` (comment 4378 there, the `approve` at event 4415): "Approve, and a
task before the docs that makes "one transaction" a test that can fail (the mutation M14 caught)." Written
2026-10-12 by a writer of the issue loop, round 1. Test cells and the stand-in of
`tools/cloud-brain/brain-topic.ojs`, and one test on a SQLite. `topic.take` is not changed. Every time
below is from `date` or a tool's `at`, in CEST unless it says UTC.

## What was wrong

The record of `tp-3-take-and-done` has it as M14: with the queue of `topicRig` taken out, so that two
calls of `db.sql` run their statements mixed, 17 of 17 cells passed. Run again here on the seed as it
was (`git show HEAD:tools/cloud-brain/brain-topic.ojs`, with `last.then(` made `Promise.resolve().then(`):

```
old M14a x1: passed 17 failed 0 needsBrowser 0
```

Two things kept the mutation from showing, and the second is the finding of this task.

- **Nothing held the two takes together.** `test_topic_take_hands_each_entry_to_one_taker` sends them
  with `Promise.all` and the order of what follows is the runtime's.
- **The stand-in answered a mix as the SQL does not.** `fresh` in `topicSql` selects the entries after
  the position, `LIMIT` what is left, and `INSERT OR IGNORE`s them: one of those that has a claim is
  ignored. `fresh` in `topicFakeSql` left claimed entries out before it counted, so it passed over them
  to the next. After a whole take no claim is past the position, and the two agree. Between another
  take's `fresh` and its `handed` they do not: the SQL hands the second take nothing, the stand-in
  handed it the next entries. So a mix in the stand-in did no harm that a cell could read.

What one transaction is for, then, on a SQLite (`tests/tools/topic-sql.test.ts`, the new test; four
entries wait, each take has `limit` 2, each statement run in a transaction of its own):

```
order of the statements (a = first take, b = second)          first take   second take   pos
a.again a.fresh a.handed a.taken b.again b.fresh b.handed b.taken    [1, 2]       [3, 4]         4
a.again b.again a.fresh b.fresh a.handed a.taken b.handed b.taken    [1, 2]       []             2
a.again a.fresh b.again b.fresh b.handed b.taken a.handed a.taken    [1, 2]       []             2
```

No entry is handed out twice in either mixed order (the key of `topic_claims` is `topic, name, seq`).
The second take is answered nothing while two entries wait, and they are handed out by the take after.

## What changed

- `topicFakeSql`: `fresh` counts what is left of the limit from the position and then ignores an entry
  that has a claim, as the statement does. `db.before`, which a test sets: it is asked before each
  statement runs and may keep it waiting.
- `topicRig`: `rig.arriving(fn)`: `fn(statements)` is asked as each call of `db.sql` arrives, before
  the call waits its turn in the rig's queue, and may keep it there.
- A new cell, `test_topic_take_is_one_transaction`, 18 in all. Two takes of `limit` 2, of one
  subscription with four entries waiting. The call of each that has `fresh` is kept at its arrival
  until both are there. The first take to come to `handed` waits before it for one turn of the event
  loop (`setTimeout(done, 0)`). It reads: both answered 200 with two entries each, the four `seq`
  are 1 to 4, the position is 4, each take's `again, fresh, handed, taken` arrived as one call, and
  the four statements of one take ran before the four of the other.
- The first cell, "Take": "A take is one transaction, so two takes at once are handed different
  entries" named `test_topic_take_hands_each_entry_to_one_taker`. It now says a take is one call of
  `db.sql`, which a Brain runs as one transaction, what the take needs that for, and names the new
  cell. The cell "Tests" names the two hooks.
- `tests/tools/topic-sql.test.ts`: one new test, 8 in all, the table above, on the SQLite and on
  `topicFakeSql`, which are compared for each order.
- `tools/cloud-brain/records/tp-3-take-and-done.md`, "Not tried", the line that no test of the module
  holds it: a parenthesis that names this record.

Not changed: `topicApp`, `topicOps`, `topicSql`, `topicSchema`. `git diff origin/main -- tools/cloud-brain/brain-topic.ojs`
has hunks in the first cell, the cell "Tests", `topicFakeSql`, `topicRig` and the new cell.

## The test fails on the mutation, and passes on the seed

Each line is a build of the seed with one change, run with
`cd cloud-brain-dev && bun test.ts brain-x-topic --with <build>`, 20 times, then the seed put back
(`diff` against the kept copy printed nothing). The last ended 21:25:22.

```
the seed                                       x20: passed 18 failed 0 needsBrowser 0
M14a  the rig's queue is Promise.resolve()     x20: passed 16 failed 2   take_is_one_transaction, take_hands_each_entry_to_one_taker
M14b  the rig runs a call where it arrives     x20: passed 16 failed 2   the same two
SPLIT the take sends again, fresh and then
      handed, taken as two calls               x20: passed 16 failed 2   the same two
SPLIT3 again, fresh, handed and then taken     x1:  passed 17 failed 1   take_is_one_transaction
OLDFRESH the stand-in's fresh as it was        x1:  passed 18 failed 0
OLDFRESH + M14a                                x1:  passed 17 failed 1   take_is_one_transaction
```

The message of the new cell under M14a, M14b and SPLIT is the second take's count: `[200, 200, 2, 2]`
expected, `[200, 200, 2, 0]` received. Under SPLIT3 it is the calls: `taken` arrived in a call of its
own. Under OLDFRESH + M14a both takes are handed two entries and the cell fails on the order the
statements ran in (`[1, again], [2, again], [1, fresh], [2, fresh], …`).

`take_hands_each_entry_to_one_taker` fails beside it headless, with nothing held: with the stand-in's
`fresh` as the statement, a mix now shows there too when the runtime mixes the two. In a browser it did
not. `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-topic`
on a build of each, Chrome 151.0.7922.34, between 21:25 and 21:31:

```
M14a   x5: tests 18, passed 17, failed test_topic_take_is_one_transaction      [200, 200, 2, 0]
SPLIT  x3: tests 18, passed 16, failed both
the seed x1: tests 18, passed 18, failed []
```

So under M14a in Chrome the older cell passed 5 of 5 and the new one failed 5 of 5.

The SQLite test with the stand-in's `fresh` as it was (`bun test ./tests/tools/topic-sql.test.ts` on the
OLDFRESH build): 7 pass, 1 fail, the new test, where the stand-in handed the second take `[3, 4]` and the
SQLite `[]`.

**What the pass on the seed rests on.** Nothing of time: the first take waits one turn at `handed`,
and with one call run whole before the next the second take's call is behind it in the rig's queue
for as long as that takes. A longer turn changes nothing. **What the fail on M14 rests on:** that the
second take's four statements, whose call has arrived and is not held, run within that one turn. In
the stand-in a statement is answered with no timer and no I/O. It was so in 60 of 60 headless runs (M14a, M14b and SPLIT, 20 each)
and 5 of 5 in Chrome 151.

## Counts

Each from a run after the last edit of the seed. There were two rebases on `origin/main`. The first
(`worktree.sh --rebase topics-service`, before the landing) printed seven files and no seed, `build.ts`
or `cloudflare-iac*.ojs`. The second, under the landing lock at 21:46:45, printed 20, with
`tools/cloud-brain/cloudflare-iac.ojs`, `tools/cloud-brain/brain-issues.ojs` and
`tests/tools/topic-sql.test.ts` among them: the lock was released at 21:46:57 with nothing landed, and
the build, the headless run, the SQLite test, the browser run with its emit and the suite were made
again. The emitted record's `hash` was `89f54186cea0…` before that rebase and after it. `verify-run`
was run again after the landing, on the build of the landed seed.

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && … && (cd cloud-brain-dev && bun test.ts brain-x-topic --with $W/tools/cloud-brain/.emitted/tp-3b.js)
  "passed":18,"failed":0,"needsBrowser":0
cd $W && bun test ./tests/tools/topic-sql.test.ts
  8 pass, 0 fail, 245 expect() calls
cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-topic --emit topic_service=…
  "tests":18,"passed":18,"failed":[]     Chrome 151.0.7922.34, ended 21:47:43; the run that emitted
cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-topic --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
  "mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-topic"]
  "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]     (each run: "tests":18), ended 2026-10-12T19:55:25Z, after the landing; deployed 89f54186cea0
  the same, before both rebases, ended 2026-10-12T19:32:12Z: runs 20, passed 20, failed 0, none 0, byChance []
cd $W && tests/tools/suite.sh        (bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools)
  695 pass, 0 fail, 4635 expect() calls, 695 tests across 70 files, 149.08 s; no line "skipped:"; ended 21:50:18
```

The suite was run three times, the last after the second rebase. The second, ended 21:45:18, was 692
pass, 0 fail. The first, after the first rebase and ended 21:37:19, was 689 pass, 3 fail in 298.60 s:
three tests of `tests/tools/summarize-papers.test.ts`, each at the 30 s a test has, with the machine's
load at 12 to 18 (`uptime`). That file alone, `bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts`:
26 pass, 0 fail in 131.56 s. This change names nothing that file reads. The record was edited after the
last run; no seed and no test was.

## On cb4

The landing lock was taken at 21:51:12. The apply, under the deploy lock, 21:51:47 to 21:52:07 (the
locks' own lines):

```
tp-3b-take-is-one-transaction-test-brain-x-topic.json 18553 ms [{"worker":"brain-x-topic","hash":"89f54186cea0","state":"verified","version":"9face5d2-…","tests":18}]
```

`verified`: the deployer ran the 18 cells in the cluster's browser, the new one among them. `brain.ts redistil`
then read `brain-x-topic  same  89f54186cea0`. No call of `topic.*` was made on cb4 for this task: no
method is changed.

## Not tried

- **`brain-db` itself.** The cell holds that the service sends a take as one call and that the take
  needs that call run whole. That `brain-db` and D1 run a batch as one transaction is theirs; no test
  here calls them. On cb4 two takes started together were handed `[6,7,8]` and `[3,4,5]`, once (the
  record of `tp-3-take-and-done`); that was not run again.
- **Two takes whose `again` mix**, with ended claims waiting: the cell has new entries only. By the
  statement, `again` moves `until` in the same statement that picks the claim, so a second `again`
  does not pick it; not run mixed, on the SQLite or the stand-in.
- **A take mixed with `topic.done`, with `expire`, with `topic.unsubscribe` or with the clock's removal.**
- **More than two takes held together, and a `limit` of one take that covers what the other took.**
- **The fail on M14 in the cluster's browser** (Chrome 128), and in a tab that is hidden, where a timer
  of 0 may be late. The pass on the seed does not rest on the timer.
- **The mutations after the commit and the rebase.** They were run on the seed as last edited, before
  its commit; the rebase printed no file the module is built from.
- **The first cell's sentence in `knowledge.search`**: the method reference is read from what is
  deployed; no search was made for it after the deploy.
