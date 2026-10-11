# Cloud Brain: the landing lock and the deploy lock, held in the cluster

Spec of the feature `locks-held-in-the-cluster` on cb4's tracker. Written 2026-10-11 between 17:59
and 18:05 CEST (event 1107's `at`, and `date`) from `lopecode-dev` `f5428cf8` and the tracker at event 1107. Nothing here is built.
The design is a proposal; each number under "The design" that is not under "What exists today" is a
choice and says what it was chosen from.

Round 2, 2026-10-11 18:22 to 18:26 CEST (`date`), from `1788b1a4` and the tracker at event 1173:
review 1169 sent it back with two findings and three notes. Each is answered in place, and the
last part, "Review 1169, answered", says where. The tasks are five now, not four: the task that
was 2 is 3.

## What was asked

Tom, 2026-10-11, comment 1099 on `rules-md-names-lock-sh`, whole. He had been offered three wordings
for two sentences of `rules.md` and took none:

> locks should be in the cluster, we should be able to run parrallel agents on independant machines. This current mechanism is not multiplayer safe and breaks the philosphy, please organize work to remove local locks  entirely.

The body of the feature quotes the first sentence and half of the second. The half it leaves out is
the instruction: "please organize work to remove local locks entirely".

The line of `philosophy.md` he points at, from the Clarifications of 2026-10-10: "in a multi agent
system multiplayer bugs need to be removed."

## The reports gathered

`list?parent=locks-held-in-the-cluster` answers one part.

| Report | Becomes |
|---|---|
| `rules-md-names-lock-sh` (task, `major`, triaged): `rules.md` lines 74 to 81 give `mkdir` and `rmdir` for both locks, and `lock.sh` refuses or fails on a lock taken that way | R7. Its three wordings (A, B, C of comment 1082) are all left out: each words a rule for the directory, which R3 removes |
| The same issue, comment 1099, the owner's | R1, R2, R3 |
| The feature's body, "how a lock of an agent that died ends" | R4 |
| The feature's body, "a session's rmdir removed a writer's lock at 15:25" (`land-lock-any-session-can-remove`, done) | R5: what that fix gave is kept |
| The feature's body, "what an agent does when the cluster cannot be reached" | R6 |
| The feature's body, "what a lock on the landing means when two machines each have a checkout" | R2, and task 3's change to step 10 of the writer's brief |
| The feature's body, "whether lock.sh stays as the command" | it stays: "The design", the tool |

The requirements:

- **R1.** Both locks are kept by a service of cb4. Taking and releasing one is a call to it.
- **R2.** An agent on a second machine, with its own checkout, is refused a lock an agent on the
  first holds, and the reverse.
- **R3.** No local lock is left: no directory under `.emitted/`, no `mkdir` or `rmdir` in `lock.sh`
  or in any brief, and nothing that falls back to one.
- **R4.** The lock of an agent that died ends with no act of the owner's.
- **R5.** A release by anyone but the holder is refused and names the holder. The command of
  2026-10-11 15:25 (`take … && work; release …` after a take that failed) leaves the holder's lock.
- **R6.** With the cluster not reached, `take` fails with an exit code of its own, nothing is
  landed or deployed, and no local lock is made in its place.
- **R7.** `rules.md` names the lock that exists, in the owner's words or on his word.
- **R8.** How long each lock was held, and by whom, is read from the cluster with a token of the loop.

## What exists today, measured

Read on 2026-10-11 between 17:59 and 18:05 CEST.

**The two locks.** `tools/cloud-brain/lock.sh` (56 lines): `take|release|show land|cb4 <who>`. The
lock is a directory, `<main checkout>/tools/cloud-brain/.emitted/<name>.lock`, made with `mkdir`,
with a file `holder` (the name, a tab, the time). `bun test ./tests/tools/lock.test.ts`: 12 pass, 0
fail (run 18:02). Neither directory existed at 17:58 (`ls tools/cloud-brain/.emitted/*.lock`: no
matches).

**Who names them.** Counted again in round 2, at `1788b1a4`, 18:24:
`git ls-files | xargs grep -Il "lock\.sh\|land\.lock\|cb4\.lock"` answers 18 tracked files. (Round 1
said 16, from f5428cf8 and a grep of the directory; two records and this spec came since, and the
lock text of one knowledge page moved to another in `879b7017`, 18:09:15.)

- Eight tell an agent what to do and change with this feature: `lock.sh`,
  `tests/tools/lock.test.ts`, `rules.md`, `SKILL.md` (lines 55, 58, 59, 63, 145, 241),
  `agents/implementer.md`, `agents/overseer.md` (lines 93, 94), `agents/spec.md`, and
  `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4, lines 37 to 41.
- One names `lock.sh` only as a path in a fixture and does not change:
  `tests/tools/review-needs-tab.test.ts` line 32.
- Nine are records and stay as written: four under `records/`, `oversight.md`, `spec-as-built.md`,
  `rpc-performance.md`, `plan/specs/deploy-verification.html`, and this spec.

**A ninth file that tells an agent what to do is in no checkout** (review 1169, finding 1). The
reviewer's brief has been a file of the Brain since 2026-10-11,
`https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md`, read as
`cloud-brain-dev/brain/roles/reviewer.md`. The grep above cannot find it. Its step 3, lines 42 to 44
of the copy fetched 18:22:

```
While `tools/cloud-brain/.emitted/land.lock` exists a landing is under way: wait for it to go
(`until [ ! -d …/land.lock ]; do sleep 20; done`, `run_in_background`), then run `redistil`
and read `HEAD` again before comparing.
```

With no directory ever made, that wait returns at once during a landing, with no error. It is the
only file of the Brain for an agent: `/static/cloud-brain-dev/index.md` lists one path, and
`git -C cloud-brain-dev ls-files`, grepped the same way, answers nothing.

**How long a lock is held.** 13 lines of the loop's journal carry "LOCK TIMES"
(`grep -rhc "LOCK TIMES" tools/cloud-brain/.emitted/issue-loop/*.md`, summed). Those of 2026-10-10
that give both ends:

```
no deploy   19:52:01 to 19:52:08    7 s
no deploy   19:44:33 to 19:44:47   14 s   (waited from 19:43:09)
no deploy   19:45:36 to 19:45:38    2 s
no deploy   23:33:31 to 23:33:42   11 s   (waited about 3 minutes)
deploy      20:21:16 to 20:22:48   92 s
deploy      20:51:18 to 20:53:18  120 s   (waited from about 20:48)
deploy      19:57:31 to 19:59:49  138 s
deploy      20:47:57 to 20:51:16  199 s   (another writer waited behind it)
deploy      19:41:01 to 19:44:24  203 s   (a refused apply and a 56 s apply)
```

The longest hold on that record is 203 s. `SKILL.md`, Runs, gives the same ranges (2 to 17 s, 85 to
203 s). The times are each writer's own report; nothing in the cluster kept them, which is R8.

**What went wrong with it.** One event: 2026-10-11 15:25, a session's `rmdir` after a failed
`mkdir` removed a writer's lock (`records/land-lock-any-session-can-remove.md`). No lock of a dead
agent is on the record; `SKILL.md` step 1 gives such a lock to the owner (`rm -r`) after 20 minutes.

**What already guards the two things the locks are for.** Neither lock is the last guard.

- A deploy. `brain-deployer.ojs`, the method reference, lines 73 and 75: every change carries
  `was`, the hash the caller saw, and is refused when the Worker is no longer that
  (`NAME is A, you saw B`); one change to a Worker runs at a time under the row `deploying/NAME`
  (`putIfAbsent`), taken over after 5 minutes. The same paragraph says of those rows: "The rows have
  no compare-and-swap, so one case is open". `brain.ts apply` does not look at `cb4.lock`
  (`knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4: "Nothing makes `apply` look at it").
- A landing. `git push` to origin refuses a push that is not a fast-forward, and
  `git merge --ff-only` in the main checkout refuses a branch that is not ahead of `main`.

What neither guards: the files of the main checkout between the merge and the push (the built
notebook copied into `lopebooks/`, `seen.json`), and the order of several Workers in one landing.

**What the cluster has to build on.**

- `brain-x-issues` keeps its rows through the `sql` cell: `sql.batch(list)` is `db.sql` on
  `brain-db`, "1 to 600, run as one transaction" (`brain-db.ojs`, "SQL tables"). A Worker owns the
  tables named with its prefix, `issues_*`. An upsert of the form
  `INSERT … ON CONFLICT (…) DO UPDATE SET …` passes the statement check for a Worker's own table
  (`brain-db.ojs` line 839, `expect(says(…)).toBe("w:metrics_calls")`). One with a `WHERE` on the
  update is not among that file's tests. Not tried.
- The three tokens of the loop each name `com.lopecode.brain.issue.*` (`brain.ts token list`, 18:00),
  a prefix: "`browser.*` is every method of that service" (`brain-kernel.ojs`, "Lists of methods").
- The loop deploys `brain-x-issues`: `rules.md`, Never, tells of "a reviewed fix" of it that was on cb4 at 19:32 on 2026-10-10.
- `lease.take` of `brain-x-inbox` is the lease the feature's body names. It is the owner's, for one
  tab, and it is a read then a write of one row (`brain-inbox.ojs` lines 117 to 119), so two takers
  in the same instant can both be told they hold it.
- `db.put { ifAbsent }` takes atomically, and has no way to take over a lock that has ended. With no
  rule on the table it answers "the owner, or a token of theirs", for every table.

## Read

Searches of the Brain, `knowledge.search?semantic=true` with the token `loop-knowledge`, 17:59:

| Words | Found | Used |
|---|---|---|
| distributed lock lease expiry | `module:tomlarkworthy:robocoop-5-spec-lock` (0.77), `doc:cloud-brain-topics` (0.57), `doc:cloud-brain-authority` (0.50) | `plan/cloud-brain-topics.md`: its `topic.take` is "entries claimed for `seconds`. A claim that ends unanswered is handed out again", the same form as the lease here. A proposal, not built; its `claims` table is not there to reuse. The spec-lock module is about a spec, not a mutex |
| mutual exclusion between agents on different machines | seven papers on agents and world models | nothing bore on it |
| landing lock deploy lock | `module:tomlarkworthy:brain-deployer` (0.61), the knowledge doc (0.41) | the deployer's `was` and `deploying/NAME`, quoted above |
| compare and swap row putIfAbsent | `sticky`, `lopefeed`, `ledger` | nothing bore on it |
| merge queue serialise pushes | `doc:pushing-cells-to-observablehq`, `doc:cloud-brain-topics` | nothing more |

Outside. Each of these three was read as a summary a fetch tool made of the page, not the page:

- M. Kleppmann, "How to do distributed locking", 2016,
  `https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html`. A lock is taken for
  efficiency ("saves you from unnecessarily doing the same work twice") or for correctness
  ("prevents concurrent processes from stepping on each others' toes"). A lease does not give
  correctness alone: a holder that pauses past its end does not know. The remedy is a fencing token,
  "a number that increases", checked by the thing written to. Used: the lease here is counted as an
  efficiency lock, and the last guards are the two under "What already guards", which check what the
  caller saw as a fencing token would. The lease gives a number that rises (`n`), which nothing
  checks yet.
- Cloudflare, "D1 Database", `https://developers.cloudflare.com/d1/worker-api/d1-database/`:
  "Batched statements are SQL transactions"; each statement will "execute and commit, sequentially,
  non-concurrently"; a failure "aborts or rolls back the entire sequence". Used: one batch is the
  compare and the swap.
- M. Burrows, "The Chubby lock service for loosely-coupled distributed systems", OSDI 2006,
  `https://research.google/pubs/pub27897/`. Read only in the abstract and in course slides
  (`https://people.cs.rutgers.edu/pxk/417/notes/pdf/06a-chubby-slides.pdf`): coarse locks held for
  long periods, a lease that a dead client's session lets run out, and a sequencer a server can check.
  Used: nothing beyond the two above. Its lock-delay (a dead holder's lock is kept back for a minute)
  is not taken; the lease's own end does that here.

## The design

**Where.** Two methods on `brain-x-issues`, and one table of its own.

```
issue.lock    procedure  { name, who, seconds }            take, or renew when who already holds it
                         { name, who, release: true }      release
                         -> { held: true, name, who, n, taken, until }
                         -> 409 Held  { held: false, holder: { who, taken, until } }      another holds it
                         -> 403 Refused { holder }                                        a release by another
issue.locks   query      ?history=N
                         -> { now, locks: [{ name, who, n, taken, until }], history: [{ name, who, n, taken, ended, how }] }
```

- `name`: `a-z 0-9 -`, 40 at most. `who`: as `lock.sh` takes today, `a-z A-Z 0-9 . _ -`.
- `seconds`: 5 to 1800, 600 when left out. 600 is three times the longest hold measured (203 s) and
  the time of a deploy's probation; 1800 is above the 20 minutes `SKILL.md` calls stale.
- The holder is `who` and the caller's delegation (`by.via`, which the core names on the call). A
  renew or a release with the same `who` from another token is refused as another's.
- A take is one batch: an `UPDATE` of the row where `until < now` or the holder is the caller, then
  an `INSERT OR IGNORE`, then a read. The row is the caller's after it or it is not. Times are the
  Worker's `Date.now()`; no caller's clock is read. If the upsert with a `WHERE` passes
  `brain-db`'s check it is one statement in place of two; `brain-db` is not changed either way.
  Neither form is known to pass that check (review 1169, "what I did not"). The check reads the
  opcodes of the statement and refuses one it does not know (`brain-db.ojs` line 845,
  `"refused: the opcode VOpen is not one this check reads"`); `INSERT OR IGNORE` is nowhere in that
  file (`grep -c "OR IGNORE" tools/cloud-brain/brain-db.ojs`: 0), and no token of the loop names
  `db.sql`, so it cannot be asked before a deploy. Task 1 says what its writer does about it.
- `n` goes up by one at each take that is not a renew.
- A take over a lock that has ended answers `over: { who, until }` beside `held: true`, and the
  history row of the lock that ended has `how: "expired"`. A release writes `how: "released"`.
- `history` is a second table, a row at each end, the newest 500 kept.
- `{ name, release: true, force: true }` releases whoever holds it, for the owner present only
  (`caller.present`). It stands where `rm -r` stood. Nothing in the loop calls it.
- Rule: the one every other method of the Worker has,
  `caller.kind in ["owner", "token", "worker", "deployer"]` (`brain-issues.ojs` line 179).
- Nothing is written to the signed record. A landing with a deploy would add four events to a
  record that `issue.verify` checks whole.

**The tool.** `lock.sh` keeps its name, its arguments and its exit codes, with the cluster behind it:

```
lock.sh take land|cb4 <who> [--wait [seconds]]   exit 0 yours, 1 held (stderr names the holder and until when),
                                                 2 the cluster was not reached or refused the call
lock.sh renew land|cb4 <who>                     the same call; for a hold that nears its end
lock.sh release land|cb4 <who>                   exit 1, and the lock stays, when <who> does not hold it
lock.sh show land|cb4                            the holder, since when, until when; exit 1 when nobody
```

It calls through `issue-as.sh` with the token named in `LOCK_TOKEN`, `issues-implementer-2` when
unset; the overseer's brief sets `issues-overseer-1` and the reviewer's `issues-reviewer-2`. It
makes no directory and reads none. `--wait` asks again every 20 s as now, also while the cluster is
not reached. `show` exits 2, not 1, when the cluster is not reached, so that "nobody holds it" is
never read from a call that failed.

**The reviewer's wait.** Step 3 of the Brain's `roles/reviewer.md` asks the tool in place of the
directory:

```
export LOCK_TOKEN=issues-reviewer-2
until <checkout>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done
git -C <checkout> pull --ff-only && git -C <checkout>/lopebooks pull --ff-only
```

It goes on at exit 1 only. Today's `lock.sh show` reads the directory and exits 1 when there is
none (`lock.sh` line 49) and ignores `LOCK_TOKEN`; the cluster's script answers the same code from
`issue.locks`, which the reviewer's token reaches through `issue.*`. So the same three lines are
right before and after `lock.sh` changes, and the brief is changed first (task 2) with no moment
at which it waits on nothing. The pull is for a reviewer on a second machine, whose `HEAD` is its
own checkout's; on one machine it brings nothing in. With the cluster not reached the wait does
not end; the review needs cb4 for `redistil` and `getSource` in any case.

**Two machines.** The lock is one for all checkouts. Step 10 of `agents/implementer.md` gains one
line after the take: `git -C <root> pull --ff-only` and the same in `lopebooks`, before
`worktree.sh --rebase`, which today rebases on the local `main`. A pull that is not a fast-forward
is a stop: release and report. On one machine it brings nothing in.

**When the lease ends under a live holder.** The next taker gets the lock while the first is still
at work. A push by the slower of the two is refused by origin, an apply by `was`. What is not
refused: both building the notebook into one main checkout, which needs both on one machine. The
holder's `release` then answers exit 1 with the new holder; the brief says to stop and report, not
to push. The margin is 600 s against 203 s, from 9 holds. Step 10 of the writer's brief runs
`lock.sh renew land <id>` before the merge and again before the push: a renew that answers exit 1
is the same stop, met before the checkout is written to and not after. That narrows the case and
does not close it. Closing it means the thing written to checks `n`, and for a deploy that is the
deployer, which is the owner's (his list, below).

**When the cluster is not reached.** `take` exits 2. The agent does not land and does not deploy;
it waits with `--wait` or stops and reports. A deploy needs the cluster in any case. A landing with
no deploy needs only origin, and is held up too: that is the cost of R3 and R6 together. A release
that is not reached is tried again; if never, the lock ends at its time.

**A deploy of `brain-x-issues` itself** is made under locks that Worker keeps. The rows are in D1
and outlive the deploy. A version put back to one from before task 1 has no `issue.lock`: `take`
exits 2 and nobody lands until the Worker is forward again. The tracker's other calls go on.

### Not chosen

- **A new Worker, `brain-x-lock`, with a token `loop-lock`.** Cleaner names. A new Worker and a new
  token are both the owner's acts (`agents/implementer.md` step 3), and a second machine would need
  one more token placed on it. It can be moved there later: the tool hides the method's name.
- **`lock.*` methods on `brain-x-inbox`, beside `lease`.** Its lease is a read then a write, and
  it would need the new token as well.
- **`db.put { ifAbsent }` with a token that names `db.put` and `db.delete`.** No deploy at all. No
  take-over of an ended lock without a second, non-atomic step, a release that cannot check the
  holder, and a token that writes every table that has no rule.
- **The lock as events of the signed record.** History for nothing, and R8 with no second table.
  Two events a hold, four with a deploy, on a record of 1114 events that `issue.verify` reads whole;
  how many a day was not counted.
- **No lock, the two last guards only.** A writer finds out it lost at the push, after a build and
  an apply of 20 to 55 s, and does both again. He asked for locks in the cluster.
- **The deployer refuses an apply by anyone but the lock's holder.** It would make the deploy lock
  more than an agreement. The deployer is the owner's to deploy, and it already refuses by `was`.
- **Dropping the deploy lock**, since the deployer has `deploying/NAME`. That row is per Worker; a
  landing applies, runs `redistil` and writes `seen.json` as one step. Whether the row is enough was
  not measured, so the lock is kept, as a second name in the same table.
- **A lock per machine for the checkout and one in the cluster for the push.** Two agents on one
  machine are already kept apart by the one lock. The cost of one lock for all: machines queue
  behind each other for 2 to 203 s a landing.
- **A heartbeat process that renews.** An agent of the loop has no process between its commands.
  `renew` is a command it runs before a long step.
- **The writer of the `lock.sh` task puts the reviewer's brief in the same landing.** One landing
  in place of two. `rules.md`, "The files of the Brain an agent reads": "The overseer changes a
  brief with it; no other role does", and it would need the owner's word to cross. With the wait
  written as above it does not need to be the same landing, so the overseer makes it, before.
- **The reviewer's brief changed after `lock.sh`, by the overseer, on the orchestrator's word.**
  Between the two the reviewer waits on a directory nobody makes: finding 1 for some minutes.

## How each requirement is known to be met

Each is run by an agent of the loop with `issues-implementer-2` or by `bun test`, with no session
of the owner's and no tab. `ia` is `issue-as.sh issues-implementer-2`. The probes take a name of
their own (`probe-<issue id>`), never `land` or `cb4`.

| | Check |
|---|---|
| R1 | `ia lock '{"name":"probe-x","who":"a","seconds":30}'` answers `held: true`; `ia "locks"` lists it; after `ia lock '{"name":"probe-x","who":"a","release":true}'` it does not. And `test_*` cells of `brain-issues.ojs`, run with `bun test.ts brain-x-issues --with <built module>` in the worktree's `cloud-brain-dev/` |
| R2 | With `a` holding `probe-x`, the same call with `who: "b"` answers 409 and names `a`. The call carries nothing of the machine it is made from, so one made from another is the same call. 20 takes of the one free `name`, each with a `who` of its own (`w1` to `w20`), sent together: the count of `held: true` is 1 (a test cell against the fake, and once against cb4) |
| R3 | After task 3: `grep -c "mkdir\|rmdir" tools/cloud-brain/lock.sh` is 0. A test in `lock.test.ts`: after `take` with `BRAIN_STATE_DIR` at an empty directory, the directory is still empty. The test "the briefs name lock.sh for both locks" reads `SKILL.md`, `agents/spec.md` and the knowledge page too, and fails on a code span with `mkdir`, `rmdir` or `rm -r` of either lock or a path that ends `land.lock` or `cb4.lock`. It does not read `rules.md` until task 4 (R7). After task 2, the Brain's copy, a public read: `curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md \| grep -c "land\.lock\|cb4\.lock"` is 0 (it is 2 today, 18:22) and `grep -c "lock.sh show land"` of the same is 1. The same `curl` is a test in `lock.test.ts` from task 3 on, skipped with its reason printed when cb4 does not answer |
| R4 | A test cell with the clock moved past `until`: `b` takes, the answer has `over`, the history has `how: "expired"`. On cb4: `a` takes `probe-x` for 5 s, and 6 s later `b` takes it |
| R5 | In `lock.test.ts`, against a stand-in for the service: `take land a`, then `take land b && echo landed; release land b` prints no `landed`, exits 1, and `show land` names `a`. A test cell: a release with `a`'s name by the reviewer's token is 403 |
| R6 | In `lock.test.ts`: with the service's address at a closed port, `take` exits 2 within the call's time limit and makes nothing under `BRAIN_STATE_DIR` |
| R7 | After task 4, and not before: `rules.md` is added to the files the brief test of R3 reads, in the commit that changes the two sentences, and the test passes. With today's `rules.md` in the list it fails, on lines 79 and 83 |
| R8 | `ia "locks?history=50"` answers the rows; `issue-stats.ts` prints a line `locks` with the count, the median and the longest hold of `land` and of `cb4` |

The stand-in of R5 and R6 is a server the test starts that answers the three shapes above. It is
not the service's code: the service is tested by its own cells.

Not checked by any of these: two real machines. The loop has one. The first landing from a second
is the owner's to see (below).

## The tasks, in the order they land

1. **`issue.lock` and `issue.locks` on `brain-x-issues`.** The two tables in `issuesSchema`, the two
   methods, their rows in the method reference, test cells for R1, R2, R4, R5 and R8. Deployed by
   the loop under the directory lock, which is still the lock. `major` by `SKILL.md`'s reading: it
   adds something callers may do. Then the probes of R1, R2 and R4 against cb4.
   The first probe after the deploy is the test of the statement form, since nothing before it runs
   `brain-db`'s check on these statements (if `bun test.ts brain-x-issues --with …` does run it, the
   writer learns it at step 7 and says so). A refusal is `issue.lock` answering `brain-db`'s
   `refused: …`; the other methods of the tracker do not run these statements. The writer then
   tries, in this order and each as a deploy: the two-statement form, the one upsert with a
   `WHERE`, and a `SELECT` then an `INSERT` or `UPDATE` whose `WHERE` repeats the condition and
   whose answer's `changes` is read. If all three are refused the change needed is in `brain-db`,
   the owner's: the writer stops with the three refusals quoted and the label `needs-owner`.
2. **The reviewer's brief on the Brain.** The three lines of "The reviewer's wait" in place of the
   wait on the directory, in step 3 of `roles/reviewer.md`. Made by an overseer the orchestrator
   starts for this one edit, with `put.sh` as `agents/overseer.md` says (no commit, no lock, the
   entry in `oversight.md`), since `rules.md` gives that file to the overseer alone. It needs
   neither task 1 nor task 3: today's `lock.sh show land` answers it. Its check is R3's `curl`,
   run by a reviewer, and one review made with the new brief while a writer holds `land`.
3. **`lock.sh` over the cluster, and the briefs** (task 2 of round 1). `lock.sh` as above;
   `lock.test.ts` rewritten against the stand-in (R3, R5, R6) with the `curl` of the Brain's copy;
   `agents/implementer.md` step 10 (the pull, `renew` before the merge and before the push, exit 2,
   what to do when a release or a renew answers exit 1), `agents/overseer.md` (`LOCK_TOKEN`),
   `agents/spec.md` step 6, `SKILL.md` step 1 (a lock past its time is not held; nothing is the
   owner's to remove) and its five other lines, and step 4 of
   `knowledge/changing-and-deploying-a-cloud-brain-worker.md`. Writers call the main checkout's
   `lock.sh` by its path, so the change holds for every writer from the merge on.
   **This landing is under both locks** (review 1169, finding 2). Before `merge --ff-only` its
   writer takes `land` twice: the directory, with the script as it was
   (`git show main:tools/cloud-brain/lock.sh` to a file in its scratch directory, run with
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`), and the cluster's, with the new script of
   its worktree (`$W/tools/cloud-brain/lock.sh take land <id>`). A writer still on the old script
   meets the directory; one that arrives after the merge runs the new script and meets the
   cluster's lock. Both are released after the push, the cluster's last.
   One case the two locks do not cover: a `lock.sh take land … --wait` of the old script that was
   already running at the merge goes on as the old script and takes the directory when it is
   released. So round 1's line stays beside this one, "the orchestrator starts it when no other
   writer is between step 9 and step 10", and before releasing the directory the writer runs
   `pgrep -fl "lock.sh take land"`: with any line but its own it leaves the directory held and
   reports, and the orchestrator stops that waiter and starts it again, on the new script. That
   bash goes on with the script it started was not tried; it is assumed the worse way.
4. **`rules.md`, the two sentences.** The owner's (below). The same commit adds `rules.md` to the
   files the brief test reads (R7), and `rules-md-names-lock-sh` is closed with this spec as its
   answer.
5. **`issue-stats.ts` prints the holds** (R8), and the oversight reads them in place of the
   writers' "LOCK TIMES" lines. The first numbers are compared with the nine above.

Task 3 needs 1 deployed and 2 put. Task 4 needs 3. Task 5 needs 1. Task 2 needs nothing.

## What only the owner can do

- **Approve this spec.** With it, that the three tokens of the loop reach two new methods through
  the prefix `issue.*` they already name. No token is made.
- **Weigh one thing in that approval** (the reviewer, 1169, question 3, asked that he see it). The
  lease is a lock for efficiency, not for correctness. If a holder is still at work when its 600 s
  end (the longest hold measured is 203 s, of 9), a second writer gets the lock. A push is then
  refused by origin and an apply by `was`; two writers on one machine can still both build into the
  main checkout, and a `renew` before the merge and the push narrows that without closing it. `n`
  rises at each take and nothing checks it. To close it the deployer would refuse an apply whose
  `n` is not the lock's, which is a deploy of the deployer and so his. This spec does not ask for
  it. Against it stands his line of 2026-10-10: "in a multi agent system multiplayer bugs need to
  be removed."
- **The two sentences of `rules.md`**, lines 74 to 81, and whether the loop makes the edit on his
  word (one commit that quotes it) or he does. Proposed:
  - "Commit, build or push in the main checkout only while holding the landing lock:
    `tools/cloud-brain/lock.sh take land <who>`, and `lock.sh release land <who>` when done. The
    lock is held in the cluster; no directory is made or removed for it."
  - "Deploy under the lock: `lock.sh take cb4 <who>`, apply, `lock.sh release cb4 <who>`. Exit 1
    names the agent that is deploying: wait and look again. A lock is released by its holder or
    ends at its time. Nobody releases another's."
- **A second machine.** The tokens of the loop are in `.emitted/cb4-issues-tokens.json`, which is
  not in git. Placing them on another machine is his, and so is seeing the first landing from it:
  machine A holds `land`, `lock.sh take land x` on machine B exits 1 and names A's holder.
- **Ending a lock before its time**, if he ever wants to: `issue.lock` with `force: true` in his tab.

No deploy of the kernel, the core, the database or the deployer, no policy install, no new secret.

## Review 1169, answered

Round 2. The review is event 1169, verdict `changes`, at `3a45a6f8`.

| | What it found | Answer |
|---|---|---|
| 1 | The reviewer's brief on the Brain waits on the directory `land.lock`, and is in no inventory, task or check | In "Who names them" with its three lines quoted. "The reviewer's wait" gives the text in its place. Task 2, new, makes the edit: the overseer, by `put.sh`, before `lock.sh` changes, which the text allows because it is right under both scripts. R3 reads the Brain's copy with a `curl` |
| 2 | In the landing of the `lock.sh` task a writer arriving after the merge takes the free cluster lock beside the directory's holder | Task 3: that writer holds both from before the merge until after the push |
| a | The lock text of the knowledge doc moved in `879b7017` | `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4, in the inventory, in "What already guards" and in task 3. The count is 18 files, made again |
| b | R2's "20 names" read two ways | One `name`, 20 values of `who` |
| c | R3's row read `rules.md` before the task that changes it | R3's test does not read `rules.md`; R7 adds it in task 4's commit |
| question 3 | The owner should see that the lease is for efficiency | First under "What only the owner can do", after the approval. A `renew` before the merge and the push is added to step 10 |
| not done | Whether the two statements pass `brain-db`'s check | Still not known, and why it cannot be asked before a deploy is under "The design". Task 1 gives the order of three forms and the stop |

Not done in round 2: the knowledge searches and the three outside sources were not made again,
since no finding asked for another design. The three lines of "The reviewer's wait" were not run:
the exit code of today's `show` was read from `lock.sh`, lines 48 to 50, and the cluster's script
does not exist.
