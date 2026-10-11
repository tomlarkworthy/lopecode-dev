# Cloud Brain: the landing lock and the deploy lock, held in the cluster

Spec of the feature `locks-held-in-the-cluster` on cb4's tracker. Written 2026-10-11 between 17:59
and 18:05 CEST (event 1107's `at`, and `date`) from `lopecode-dev` `f5428cf8` and the tracker at event 1107. Nothing here is built.
The design is a proposal; each number under "The design" that is not under "What exists today" is a
choice and says what it was chosen from.

Round 2, 2026-10-11 18:22 to 18:26 CEST (`date`), from `1788b1a4` and the tracker at event 1173:
review 1169 sent it back with two findings and three notes. Each is answered in place, and the
last part, "Review 1169, answered", says where. The tasks are five now, not four: the task that
was 2 is 3.

Round 3, 2026-10-11 18:34 to 18:38 CEST (`date`), from `9b5a97bc` and the tracker at event 1239:
review 1236 sent it back with one finding and four notes. The finding is answered under "The
tool" (`lock.sh` makes the call itself and reads the token from the main checkout), the notes in
place, and "Review 1236, answered" says where. One thing was measured that rounds 1 and 2 left
as not known: `brain-db`'s check lets the lock's statements through, on plans made here.

Round 4, 2026-10-11 18:56 to 19:06 CEST (`date`), from `2edceb8e` and the tracker at event 1280:
review 1277 sent it back with one finding and three notes. The finding is answered by a new part
of the design, "A lock past its `until`", which says what every call answers for such a row.
Writing it found one more case of the same kind, which no review named: `lock.sh renew` was the
same call as a take, and so could take a name it no longer held. It now sends `renew: true`.
Before the submit the draft was read by an agent with no context of the session; it gave eight
findings and all eight changed the spec. Three of them change the design: a refusal that carries
`holder` needs two lines of the tracker's `run` and `refuse` changed, a take of a held name is
refused to the holder's own name too, and a release empties the row so that `n` is kept.
"Review 1277, answered" says where each thing is.

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

**The two locks.** `tools/cloud-brain/lock.sh` (53 lines, `wc -l`; rounds 1 to 3 said 56): `take|release|show land|cb4 <who>`. The
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
  update is not among that file's tests. Tried in round 3, below.
- The three tokens of the loop each name `com.lopecode.brain.issue.*` (`brain.ts token list`, 18:00),
  a prefix: "`browser.*` is every method of that service" (`brain-kernel.ojs`, "Lists of methods").
- The loop deploys `brain-x-issues`: `rules.md`, Never, tells of "a reviewed fix" of it that was on cb4 at 19:32 on 2026-10-10.
- `lease.take` of `brain-x-inbox` is the lease the feature's body names. It is the owner's, for one
  tab, and it is a read then a write of one row (`brain-inbox.ojs` lines 117 to 119), so two takers
  in the same instant can both be told they hold it.
- `db.put { ifAbsent }` takes atomically, and has no way to take over a lock that has ended. With no
  rule on the table it answers "the owner, or a token of theirs", for every table.

**What `brain-db`'s check says of the lock's statements** (round 3, 18:35; review 1236, note c).
The check reads a plan: `sqlNeeds(plan, master)`, with `plan` the rows of `EXPLAIN` as
`[opcode, p1, p2, p3, p5]` (`brain-db.ojs` lines 245 and 471). The plans were made in a local
SQLite (`bun:sqlite`, 3.54.0) over two tables `issues_locks` and `issues_lock_history`, and given
to `sqlShape`, `sqlNeeds` and `sqlSignature` of `cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js`
(the main checkout's copy; `services.json` there gives `brain-db` the hash `0af12bd0d64e`), read
with `tools/notebook-import.ts`. The first line is the control, the statement of line 839, and it
answers what that test expects:

```
upsert, no WHERE (line 839)                              w:metrics_calls
UPDATE issues_locks SET … WHERE name = ?1 AND (until < ?4 OR (who = ?2 AND via = ?3))      w:issues_locks
INSERT OR IGNORE INTO issues_locks (…) VALUES (…)        w:issues_locks
SELECT … FROM issues_locks WHERE name = ?1               r:issues_locks
INSERT INTO issues_locks (…) VALUES (…) ON CONFLICT (name) DO UPDATE SET … WHERE issues_locks.until < excluded.taken OR (…)   w:issues_locks
INSERT INTO issues_locks (…) VALUES (…)                  w:issues_locks
DELETE FROM issues_locks WHERE name = ?1 AND who = ?2 AND via = ?3                         w:issues_locks
INSERT INTO issues_lock_history (…) SELECT … FROM issues_locks WHERE name = ?1 AND until < ?2   r:issues_locks w:issues_lock_history
```

None is refused, and each opens only tables with the Worker's prefix. What this does not show:
D1 plans with its own SQLite (`brain-db.ojs` line 427 names 3.53.4), and a plan there may hold an
opcode this one did not. The script was a probe in a scratch directory and is not kept; task 1's
writer makes it again as a test. Round 4 changed some of these statements and added others
("Review 1277, answered", row c); the lines above are what was tried at 18:35 and are left as tried.

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
issue.lock    procedure  { name, who, seconds }                 take; 409 when the name is held, under the caller's own `who` too
                         { name, who, seconds, renew: true }    renew only: never takes a name that is free or another's
                         { name, who, release: true }           release
                         -> { held: true, name, who, n, taken, until }
                         -> 409 Held  { held: false, holder: { who, taken, until } }      another holds it
                         -> 403 Refused { holder }                                        a release by another
issue.locks   query      ?history=N
                         -> { now, locks:   [{ name, who, n, taken, until }],      held at `now`
                                   ended:   [{ name, who, n, taken, until }],      past their `until`, not taken since
                                   history: [{ name, who, n, taken, ended, how }] }
```

The 409 and the 403 carry `holder`, and the tracker has no way to answer that today (review
1277, note a, and the fresh read of round 4). Every method goes through `run`
(`brain-issues.ojs` lines 718 to 722):

```
return c.json(await fn(c, …));                                                       line 720
if (e && e.status) return c.json({ error: e.code, message: e.message }, e.status);   line 722
```

A method that returned `c.json(body, 409)` would have that Response wrapped by line 720 and sent
as a 200, and `lock.sh take` would exit 0 on another's lock. A refusal thrown with
`refuse(status, code, message)` (line 642) answers `error` and `message` only. So task 1 changes
two lines: `refuse` takes a fourth argument, an object, and line 722 spreads it into the body
beside `error` and `message`. The 409 is then `refuse(409, "Held", …, { held: false, holder })`.
No other method passes the argument, so no other answer changes. The test cells of R2 and R5 read
the status and `holder` of the answer through the app (`simulate(issues_service, …)`, as line
2115 does), not from the method's return.

- `name`: `a-z 0-9 -`, 40 at most. `who`: as `lock.sh` takes today, `a-z A-Z 0-9 . _ -`.
- `seconds`: 5 to 1800, 600 when left out. 600 is three times the longest hold measured (203 s) and
  the time of a deploy's probation; 1800 is above the 20 minutes `SKILL.md` calls stale.
- The holder is `who` and the caller's delegation (`by.via`, which the core names on the call). A
  renew or a release with the same `who` from another token is refused as another's.
- A take of a name that is held answers 409 to every caller, the holder's own `who` and token
  among them, as a second `mkdir` does today (`lock.sh` lines 32 to 34). Rounds 1 to 3 made such a
  take a renew. The fresh read of round 4 found what that lets through: the briefs take `land`
  under role names (`lock.sh take land orchestrator`, `SKILL.md` line 58; `take land overseer`,
  `agents/overseer.md` line 93), the tokens are the same on a second machine, and so an
  orchestrator on each would both be answered `held: true`. That is R2 not met. A renew is asked
  for by name, `renew: true`. When the 409 names the caller's own `who`, `lock.sh` adds
  `if that take was yours and its answer was lost: lock.sh renew`.
- `who` with the token names one agent, and task 3 makes it so in the briefs: a writer's `who`
  is its issue's id, as now, and the two role names carry the machine,
  `orchestrator-$(hostname -s)` and `overseer-$(hostname -s)`. What is left open: two sessions on
  one machine under one role name. The first's take refuses the second. But if the first's lock
  ends and the second takes it, the row has the same `who`, and the first's `renew: true` is
  answered as its own. The loop runs one orchestrator and one overseer a machine (`SKILL.md`
  line 145: "One overseer at a time").
- A take is one batch: an `UPDATE` of the row where `until < now` (round 3 had "or the holder is
  the caller" here), then
  an `INSERT OR IGNORE`, then a read. The row is the caller's after it or it is not. Times are the
  Worker's `Date.now()`; no caller's clock is read. The one upsert with a `WHERE` does the same in
  one statement; the writer takes either. `brain-db` is not changed.
  Both forms, as they were in round 3, pass `brain-db`'s check on plans made locally ("What `brain-db`'s check says", above).
  On cb4 it is not known until the first call: no token of the loop names `db.sql`, so D1's own
  plan cannot be asked for before a deploy. Task 1 says what its writer does if D1 differs.
- A release of a name nobody holds answers 409 with `holder: null`.
- `n` goes up by one at each take; a renew leaves it. A release does not delete the row. It
  empties it (`who` the empty string, `until` 0), so `n` is kept and rises for as long as the
  name has a row: a row a name, and a probe's name leaves one. An emptied row is in neither
  `locks` nor `ended`, and a take of it is a take of a free name, with no `over`. Its `until` of
  0 is before every `now`, so the three places that read `until < now` treat it differently. The
  take's `UPDATE` matches it, which is how a free name is taken. The statement that writes the
  history row `how: "expired"` reads `who != ''` beside `until < now`, and so does the line of
  `issue.locks` that sorts a row into `ended`; `over` is answered only when the row taken had a `who`. Rounds 1 to 3
  deleted the row and did not say where `n` then came from.
- A take over a lock that has ended answers `over: { who, until }` beside `held: true`, and the
  history row of the lock that ended has `how: "expired"`. A release writes `how: "released"`.
- `history` is a second table, a row at each end, the newest 500 kept. `ended` of a row is the
  time of the release for `how: "released"`, of the call for `"forced"`, and the lock's own
  `until` for `"expired"`, not the time of the take that wrote it.
- `{ name, release: true, force: true }` releases whoever holds it, for the owner present only
  (`caller.present`). It stands where `rm -r` stood. Nothing in the loop calls it.
- Rule: the one every other method of the Worker has,
  `caller.kind in ["owner", "token", "worker", "deployer"]` (`brain-issues.ojs` line 179).
  So any Worker of the Brain can hold `land` for 1800 s and renew, as it can call every other
  method of the tracker. A member's Worker calls as a DID and is not let in. Seen (review 1236,
  note d) and left: those Workers are the owner's own.
- Nothing is written to the signed record. A landing with a deploy would add four events to a
  record that `issue.verify` checks whole.

**A lock past its `until`** (review 1277, the finding). A row of `issues_locks` whose `until` is
before the Worker's `Date.now()` is not a lock. Rounds 1 to 3 said so of a take and of nothing
else, and the row stays as it is until the name is taken again or its holder releases it. What each call
answers for such a row:

| Call | For a row past its `until` |
|---|---|
| `issue.locks` | The row is not in `locks`. It is in `ended`, with `who` and `until`. `now` is the time it was compared with |
| `lock.sh show <name>` | Exit 1, as for a name with no row. Stderr: `land is not held; <who>'s lock ended at <until>` |
| a take, by anyone, the row's own `who` too | As rounds 1 to 3 had it of another: `held: true`, `over: { who, until }`, `n` up by one, a history row `how: "expired"` with `ended` the row's `until` |
| a `renew: true` by the row's holder | Renewed. `held: true`, `n` as it was, `over: { who, until }` with the caller's own `who`, no history row. Nobody held the name between: a take would have raised `n` and written the taker's `who`, and a release empties the row. `lock.sh` exits 0 and prints `renewed after it had ended at <until>; nobody held it between`. (True while `who` and the token name one agent; the case where they do not is above) |
| a release by the row's holder | 200. The row is emptied and the history row has `how: "released"`, `ended` the time of the release |
| a release by another | 403 with `holder`, as for a live lock: the row is not the caller's. Exit 1 |
| `force: true`, the owner present | The row is emptied, `how: "forced"` |

- The comparison is one line of the method, in JS, over the rows of one read of the table with
  no `WHERE` (two names, and a probe's). It is `until < now` with a `who` that is not empty, the same as the take's `WHERE` for a row
  that has a holder, so a row is ended for a reader at the instant it can be taken over. It is not in the SQL because the
  tracker's test cells run on `issuesFakeSql`, which answers only for statements it was written
  for (`brain-issues.ojs` line 1280): a filter in JS is the same line under the fake and on cb4
  (review 1277, note b). A read with no `WHERE` is not among the eight statements of "What
  `brain-db`'s check says"; task 1's plan test has it.
- It is in the service and not in `lock.sh` because every reader of a lock asks `issue.locks`:
  `lock.sh show`, the reviewer's wait, the orchestrator's check of `SKILL.md` step 1, the
  `ia "locks"` of R1 and `issue-stats.ts`. None of them then compares a time of the Worker's with
  a clock of its own machine.
- A lock that ended and that nobody takes or releases has no history row: `how: "expired"` is
  written by the next take. Until then it is in `ended`, which is where R8 and the orchestrator
  read that a holder died. `land` is taken at every landing and `cb4` at every deploy (a landing
  with no deploy does not take it, `agents/implementer.md` step 10), so each stays there until
  the next of its kind.
- `renew: true` is new in round 4. In rounds 1 to 3 `lock.sh renew` sent a take. The case that
  was open: A's lease ends, B takes `land`, lands and releases, and A's `renew` before its merge
  is then a take of a free name, answered `held: true`, exit 0. The stop that the renew is for
  (under "When the lease ends under a live holder") does not happen. On one machine A's
  `merge --ff-only` is refused next, since `main` has B's commit; on two, A's merge goes through
  and its push is refused. With `renew: true` a row that is not the caller's, or no row, answers
  409 with the holder or `holder: null`, and A stops at the renew. Not seen on the record; found
  while writing the table above. The renew's `UPDATE` has the `WHERE` `name`, `who`, `via`, and
  no `INSERT` follows it.
- `take --wait` asks with a take, not with `show`, and is as it was.

**The tool.** `lock.sh` keeps its name, its arguments and its exit codes, with the cluster behind it:

```
lock.sh take land|cb4 <who> [--wait [seconds]]   exit 0 yours, 1 held (stderr names the holder and until when),
                                                 2 the cluster was not reached or refused the call
lock.sh renew land|cb4 <who>                     the call with `renew: true`, for a hold that nears its end;
                                                 exit 1, and nothing is taken, when <who> does not hold it
lock.sh release land|cb4 <who>                   exit 1, and the lock stays, when <who> does not hold it
lock.sh show land|cb4                            the holder, since when, until when; exit 1 when nobody,
                                                 also when the last holder's lock has ended
```

It calls as the token named in `LOCK_TOKEN`, `issues-implementer-2` when unset; the overseer's
brief sets `issues-overseer-1` and the reviewer's `issues-reviewer-2`. `--wait` asks again every
20 s as now, also while the cluster is not reached. `show` exits 2, not 1, when the cluster is not
reached, so that "nobody holds it" is never read from a call that failed.

**How it finds the token and the address** (review 1236, the finding). `lock.sh` makes the call
itself, with `curl`, and does not go through `issue-as.sh`.

- The token is read from `cb4-issues-tokens.json` in the state directory, and is not printed. The
  state directory is `BRAIN_STATE_DIR` when set, else the main checkout's
  `tools/cloud-brain/.emitted`, found as line 20 of today's script finds it
  (`git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir`). So the copy in a
  worktree reads the main checkout's token: that expression, run from
  `.claude/worktrees/bm-locks-held-in-the-cluster/tools/cloud-brain` at 18:37, answers
  `/Users/tom.larkworthy/dev/lopecode-dev/tools/cloud-brain/.emitted`, where the token file is,
  and the worktree's own `.emitted` is empty (`ls`).
- `BRAIN_STATE_DIR` therefore means one thing to the new script: where the token file is read.
  Nothing is written there. "It makes no directory and reads none" in round 2 was of the lock;
  the token file is the one thing it reads.
- The address is `LOCK_BASE`, `https://cb4.endpointservices.workers.dev` when unset. Only the
  tests set it.
- The exit code is read from the HTTP status, which `curl` gives with `-o <file> -w '%{http_code}'`:

```
200                              0   (show: 0 when the name is in `locks`; 1 when it is not, and when it is
                                     in `ended` stderr says whose lock ended and when. `show` reads no clock:
                                     the service has sorted the rows by its own)
409                              1   stderr names the holder and until when (and, when the holder's name is
                                     the caller's own, the hint to `renew`), or "not held; nothing released",
                                     or for a renew "not yours to renew" with the holder if there is one
403 with `holder` in the body    1   a release by another; stderr names the holder (a renew by another is a 409)
403 without, 4xx, 5xx            2   stderr has the status and the body
curl exits non-zero (000)        2   a closed port answers ` [000]` and curl exit 7 (tried 18:35, 127.0.0.1:9)
no token file, or no such token  2   before any call
```

`issue-as.sh` cannot be the way as it is: it reads the token beside itself
(`$D/.emitted/cb4-issues-tokens.json`), has the address written in it, puts the status on stderr
and exits 0 for a 409. "Not chosen" has the other way.

**The reviewer's wait.** Step 3 of the Brain's `roles/reviewer.md` asks the tool in place of the
directory:

```
export LOCK_TOKEN=issues-reviewer-2
until <checkout>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done
git -C <checkout> fetch origin && git -C <checkout>/lopebooks fetch origin
```

It goes on at exit 1 only. Today's `lock.sh show` reads the directory and exits 1 when there is
none (`lock.sh` line 49) and ignores `LOCK_TOKEN`; the cluster's script answers the same code from
`issue.locks`, which the reviewer's token reaches through `issue.*`. So the same three lines are
right before and after `lock.sh` changes, and the brief is changed first (task 2) with no moment
at which it waits on nothing. With the cluster not reached the wait does not end; the review
needs cb4 for `redistil` and `getSource` in any case. The lock of a writer that died is exit 1
from its `until` on ("A lock past its `until`"), so the wait is 600 s at the most behind it, or
what the writer asked for, 1800 s at the most. The directory of today has no such end.

After the wait the reviewer compares against `origin/main`, not `HEAD`
(`git -C <checkout>/lopebooks show origin/main:notebooks/@tomlarkworthy_cloud-brain.html`, saved
to its scratchpad as step 3 already says of `HEAD`). A landing ends with a push, so on the
writer's machine the two are the same commit, and on a second machine `origin/main` is the one
that has the landing. Round 2 had a `pull --ff-only` here. Review 1236, note a: the main checkout
is not clean (`M tools/cloud-brain/seen.json`, and the notebook in `lopebooks`, at 18:30), a pull
that brings in such a file is refused, and a pull writes the working files of a checkout the
reviewer holds no lock on, beside a writer that has just taken `land`. A fetch writes refs only.
When the fetch fails the reviewer compares against `HEAD`, as the brief has it today, and says in
the review that it did and what the fetch answered. Not run: the fetch and the `show` were not
tried in a review.

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
is the same stop, met before the checkout is written to and not after. The renew sends
`renew: true`, so it answers exit 1 also when the second writer has come and gone and the name
is free. A renew that prints `renewed after it had ended` is exit 0 and the writer goes on:
nobody held the lock between. That narrows the case and
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
- **`lock.sh` calls the main checkout's `issue-as.sh`, which gains a variable for the address and
  one for the token file** (review 1236 gave the two ways). One place would read the token. It
  puts `issue-as.sh` and its two tests (`issue-as-time-check.test.ts`, `tool-status-stderr.test.ts`)
  in task 3, makes `lock.sh` read a status from another script's stderr, and in task 3's own
  landing the worktree's `lock.sh` would call the main checkout's `issue-as.sh` of before the
  merge, which has neither variable, so `lock.test.ts` could not pass in the worktree. The cost
  of the way taken: a second place that reads the token file, four lines or so.
- **The reviewer pulls after its wait** (round 2). Above, under "The reviewer's wait".
- **`lock.sh show` compares `until` with the answer's `now` and exits 1 past it** (the second of
  the two ways review 1277 gave). `issue.locks` would still list a dead writer's lock as a lock
  to `ia "locks"`, to `issue-stats.ts` and to any reader that is not `lock.sh`, each of which
  would need the comparison too.
- **`issue.locks` leaves an ended row out and names it nowhere** (the first of the two, alone).
  It meets the finding. A dead writer's lock is then in no answer until the next take writes its
  history row, and `show` cannot say whose lock ended. `ended` is the same read, sorted in two.
- **`issue.locks` deletes the rows that have ended.** A query that writes, and the next take
  would have no row to write `how: "expired"` from.
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
| R2 | With `a` holding `probe-x`, the same call with `who: "b"` answers 409 and names `a`, and so does the same call with `who: "a"` again (the status and `holder` read through the app). The call carries nothing of the machine it is made from, so one made from another is the same call. 20 takes of the one free `name`, each with a `who` of its own (`w1` to `w20`), sent together: the count of `held: true` is 1 (a test cell against the fake, and once against cb4) |
| R3 | After task 3: `grep -c "mkdir\|rmdir" tools/cloud-brain/lock.sh` is 0. A test in `lock.test.ts`: after `take` with `BRAIN_STATE_DIR` at a directory that holds a token file of the test's and nothing else, and `LOCK_BASE` at the stand-in, the directory holds that file and nothing else. The test "the briefs name lock.sh for both locks" reads `SKILL.md`, `agents/spec.md` and the knowledge page too, and fails on a code span with `mkdir`, `rmdir` or `rm -r` of either lock or a path that ends `land.lock` or `cb4.lock`. It does not read `rules.md` until task 4 (R7). After task 2, the Brain's copy, a public read: `curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md \| grep -c "land\.lock\|cb4\.lock"` is 0 (it is 2 today, 18:22) and `grep -c "lock.sh show land"` of the same is 1. The same `curl` is a test in `lock.test.ts` from task 3 on, skipped with its reason printed when cb4 does not answer |
| R4 | For the next taker: a test cell with the clock moved past `until`: `b` takes, the answer has `over`, the history has `how: "expired"`. For a reader (review 1277): in the same cell, after the clock passes `until` and before `b` takes, `issue.locks` answers the name in `ended` and not in `locks`; a second cell for the other rows of "A lock past its `until`" (the holder's `renew: true` answers `over` with its own `who` and the same `n`; a take under the holder's own `who` raises `n` and writes `how: "expired"` with `ended` the old `until`; the holder's release is 200; `renew: true` on a row that is another's is 409 with the holder, and on an emptied row or none 409 with `holder: null`; after a release the name is in neither `locks` nor `ended`, and the next take of it answers no `over`, writes no history row and has `n` one above). In `lock.test.ts`, against the stand-in: with the name in `ended` and not in `locks`, `show` exits 1 and stderr has the holder's name and the `until`; a `renew` answered 409 exits 1. On cb4: `a` takes `probe-x` for 5 s; 6 s later `ia "locks"` has `probe-x` in `ended` and not in `locks`; then `b` takes it and the answer has `over`; `b` releases, and `probe-x` is in neither list; a take after that has an `n` one above `b`'s |
| R5 | In `lock.test.ts`, against a stand-in for the service: `take land a`, then `take land b && echo landed; release land b` prints no `landed`, exits 1, and `show land` names `a`. A test cell: a release with `a`'s name by the reviewer's token is 403 |
| R6 | In `lock.test.ts`: with `LOCK_BASE` at a closed port, `take` and `show` exit 2 within the call's time limit and make nothing under `BRAIN_STATE_DIR`; with `BRAIN_STATE_DIR` at an empty directory `take` exits 2 and the stand-in got no call; a 500 and a 403 with no `holder` from the stand-in are exit 2 |
| R7 | After task 4, and not before: `rules.md` is added to the files the brief test of R3 reads, in the commit that changes the two sentences, and the test passes. With today's `rules.md` in the list it fails, on lines 79 and 83 |
| R8 | `ia "locks?history=50"` answers the rows; `issue-stats.ts` prints a line `locks` with the count, the median and the longest hold of `land` and of `cb4` |

The stand-in of R3, R5 and R6 is a server the test starts that answers the three shapes above.
The test points the script at it with `LOCK_BASE` and gives it a token file of its own making
through `BRAIN_STATE_DIR`; neither needs a change to another tool. It is not the service's code:
the service is tested by its own cells.

Not checked by any of these: two real machines. The loop has one. The first landing from a second
is the owner's to see (below).

## The tasks, in the order they land

1. **`issue.lock` and `issue.locks` on `brain-x-issues`.** The two tables in `issuesSchema`, the two
   methods, their rows in the method reference, test cells for R1, R2, R4, R5 and R8 (R4's are a
   cell for the next taker and the reader, and a cell for the rest of the table of "A lock past
   its `until`"). The 409 and the 403 are thrown with `refuse`, which gains a body that `run`
   spreads (under the method table). Deployed by
   the loop under the directory lock, which is still the lock. `major` by `SKILL.md`'s reading: it
   adds something callers may do. Then the probes of R1, R2 and R4 against cb4.
   Before any deploy the writer gives the plan of each statement it wrote to `sqlNeeds` of the
   deployed `brain-db`, as round 3 did ("What `brain-db`'s check says"), in a test under `tests/`
   that makes the plans with `bun:sqlite` and imports the module with `tools/notebook-import.ts`.
   The same test runs the take's batch itself on that `bun:sqlite` database: two holders of one
   name (one row after, the first's), and a lock that has ended (the second holder's after, `n`
   up by one, one history row). The test cells cannot show this: they run on `issuesFakeSql`,
   whose reading of a `WHERE` is written by the hand that wrote the statement (review 1277, note b).
   Every form of round 3 passed there on 2026-10-11, so one deploy is expected, not three; the
   statements round 4 changed or added have no plan made yet, and this test is where they get one.
   The first probe after the deploy is still the test on D1's own plans. A refusal is `issue.lock`
   answering `brain-db`'s `refused: …`, which names the opcode; the other methods of the tracker
   do not run these statements. The writer then deploys the other form (two statements, or the one
   upsert), and after it a `SELECT` then an `INSERT` or `UPDATE` whose `WHERE` repeats the
   condition and whose answer's `changes` is read. If all three are refused the change needed is
   in `brain-db`, the owner's: the writer stops with the three refusals quoted and the label
   `needs-owner`.
2. **The reviewer's brief on the Brain.** The three lines of "The reviewer's wait" in place of the
   wait on the directory, in step 3 of `roles/reviewer.md`. Made by an overseer the orchestrator
   starts for this one edit, with `put.sh` as `agents/overseer.md` says, since `rules.md` gives
   that file to the overseer alone. The put is no commit and takes no lock. The entry in
   `oversight.md` that records it is a commit and a push, made under the landing lock as that
   brief's lines 92 to 95 say (`lock.sh take land overseer`), which at this task is still the
   directory (review 1236, note b). The step 3 it puts also says `origin/main` in place of `HEAD`
   after the wait, and what to do when the fetch fails. It needs
   neither task 1 nor task 3: today's `lock.sh show land` answers it. Its check is R3's `curl`,
   run by a reviewer, and one review made with the new brief while a writer holds `land`.
3. **`lock.sh` over the cluster, and the briefs** (task 2 of round 1). `lock.sh` as above, with
   the call, the token file and `LOCK_BASE` of "How it finds the token and the address";
   `issue-as.sh` is not changed.
   `lock.test.ts` rewritten against the stand-in (R3, R4's two lines, R5, R6) with the `curl` of the Brain's copy;
   `agents/implementer.md` step 10 (the pull, `renew` before the merge and before the push, exit 2,
   what to do when a release or a renew answers exit 1), `agents/overseer.md` (`LOCK_TOKEN`),
   `agents/spec.md` step 6, `SKILL.md` step 1 (a lock past its time is not held, and `show` says whose it was; the role names with `$(hostname -s)` there and in `agents/overseer.md`; nothing is the
   owner's to remove) and its five other lines, and step 4 of
   `knowledge/changing-and-deploying-a-cloud-brain-worker.md`. Writers call the main checkout's
   `lock.sh` by its path, so the change holds for every writer from the merge on.
   **This landing is under both locks** (review 1169, finding 2). Before `merge --ff-only` its
   writer takes `land` twice: the directory, with the script as it was
   (`git show main:tools/cloud-brain/lock.sh` to a file in its scratch directory, run with
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`), and the cluster's, with the new script of
   its worktree (`$W/tools/cloud-brain/lock.sh take land <id>`, which reads the main checkout's
   token file as the tool says; the writer runs `$W/tools/cloud-brain/lock.sh show land` first,
   and an exit 2 there is a stop before either lock is taken). A writer still on the old script
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
   writers' "LOCK TIMES" lines. The first numbers are compared with the nine above. A row of
   `ended` is printed as a line of its own (the name, who, when it ended): it is a holder that
   died or overran, and has no history row yet. The median and the longest hold are of the rows
   `how: "released"`; the rows `"expired"` and `"forced"` are counted beside them and not
   measured, since the end of such a row is the lease's and not the work's.

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

## Review 1236, answered

Round 3. The review is event 1236, verdict `changes`, at `4afeac1e`.

| | What it found | Answer |
|---|---|---|
| 1 | The spec does not say how `lock.sh` finds the token and the address; through `issue-as.sh` the take from the worktree in task 3 exits 2, and the stand-in tests of R5 and R6 cannot be written | "How it finds the token and the address": the review's way (b). `lock.sh` makes the call, reads the token from the state directory (the main checkout's, found by the line it has today; shown from this spec's worktree), takes the address from `LOCK_BASE`, and reads its exit code from the status by the table there. `BRAIN_STATE_DIR` is where the token file is read. Way (a) is under "Not chosen" with why. Task 3 says it; R3, R5 and R6 name the two variables |
| a | The reviewer's pull has no line for a failure and writes a shared checkout with no lock | No pull. A fetch, and the compare is against `origin/main`; a failed fetch is said in the review and the compare is against `HEAD` |
| b | Task 2's "no lock" read as if of the `oversight.md` commit too | Task 2: the put takes no lock, the commit of the entry is under the landing lock, the directory at that time |
| c | The statement forms can be tried against `sqlNeeds` with a local `EXPLAIN` before a deploy | Done here, eight statements, none refused: "What `brain-db`'s check says". Task 1 makes it a test and expects one deploy. D1's own planner is the part still not known |
| d | `issue.lock` is let to the kind `worker` | One paragraph under the rule, in "The design" |

Not done in round 3: no new search of the Brain or outside, since the finding is about two
scripts of this checkout and no design changed. The fetch and the `git show origin/main:…` of the
reviewer's wait were not run. The exit-code table was not run against anything: of its rows only
the closed port was tried, with `curl` alone. Task 3's two-lock landing was not acted out, and
whether a running bash goes on with the script it started is still assumed the worse way.

## Review 1277, answered

Round 4. The review is event 1277, verdict `changes`, at `760c76a6`.

| | What it found | Answer |
|---|---|---|
| 1 | The spec does not say what `issue.locks` and `lock.sh show` answer for a lock past its `until`; as written a dead writer's lock reads as held, and the reviewer's wait and the check of `SKILL.md` step 1 wait with it | "A lock past its `until`", under "The design": the review's first way, in the service. `issue.locks` sorts the rows by the Worker's clock into `locks` and `ended`; `show` exits 1 for a name in `ended` and says whose lock ended and when. The exit-code table's row for 200 says it, "The reviewer's wait" gives the longest wait behind a dead writer, and R4 has a check for a reader: a test cell, a line of `lock.test.ts`, and a read on cb4 between the end of `a`'s lock and `b`'s take. The second way, and the first without `ended`, are under "Not chosen" |
| a | A 409 or a 403 that carries `holder` is returned by the method, not thrown | Neither as the code is: a returned Response is wrapped by `run` and sent as a 200 (line 720). `refuse` gains a body and line 722 spreads it. Under the method table, and in task 1 |
| b | The test cells run on `issuesFakeSql`, so they test the fake's reading of the `WHERE` | The filter of `issue.locks` is in JS, the same line under the fake and on cb4. Task 1's test under `tests/` runs the take's batch on `bun:sqlite` for two holders and for an ended lock |
| c | The eight statements of the `brain-db` check are written with `…` and the script is not kept | Not changed. They were not made again: the review says a second making would test other statements than the writer's, and task 1 makes them as a test that is kept. "One deploy is expected" rests on round 3's word until then. After round 4 the eight are no longer the statements of the design, and no plan was made of what changed: the take's `UPDATE` has lost `OR (who = … AND via = …)`; the release is an `UPDATE` that empties the row, not the `DELETE`; the `INSERT` of the history row `how: "expired"` reads `who != ''` too; new are the read of `issues_locks` with no `WHERE`, the `UPDATE` of a `renew: true` (`WHERE` `name`, `who`, `via`), the history rows of a release and of a `force`, the read of `?history=N` and the trim to the newest 500. This list is what the spec names and may not be all the writer needs: task 1's rule is "each statement it wrote" |

Not asked by the review and changed: `lock.sh renew` sends `renew: true` (the last bullet but one
of "A lock past its `until`"). It is a third body of `issue.lock`, no new method.

**The fresh read.** Before the submit the draft (`01924da8` on `main`; `e71cbe3b` in the worktree before the landing rebased it) was read by an agent
with no context of this session (`/review-notebook`, 19:01 to 19:05). It gave eight findings. Each
was checked against the file it names, and all eight changed the spec. One of the answers made a
gap of its own, found by the session's adviser before the submit: an emptied row has `until` 0,
which every `until < now` matches. The `n` bullet of "The design" says which of the three places
means it.

| What it found | Checked by | Answer |
|---|---|---|
| A returned `c.json(body, 409)` is wrapped by `run` and sent as a 200 | `sed -n 716,722p tools/cloud-brain/brain-issues.ojs` | `refuse` gains a body; under the method table |
| A take under the holder's own `who` and token was a renew, so two orchestrators on two machines both hold `land` | `SKILL.md` line 58, `agents/overseer.md` line 93 | A take of a held name is 409 to everyone; the role names carry the machine; what is left open is said |
| A placeholder left in the header for the round's last time | the line | The time |
| The history statements changed and were not listed as new | the answer to note c | The list there, and that it may not be whole |
| Where `n` comes from after a release | "a release deletes the row" | A release empties the row and keeps `n` |
| "`land` and `cb4` are taken at every landing" | `agents/implementer.md`, step 10, "With no deploy" | `cb4` at every deploy |
| `ended` of an `expired` row not defined; R8 measures from it | the history bullet | The row's `until`; task 5 measures the released rows only |
| `lock.sh` is 53 lines, not 56 | `wc -l tools/cloud-brain/lock.sh`: 53 | 53 |

Not done in round 4: no new search of the Brain or outside; the finding is about what one read
answers, and the lease of round 1 is the design still. The spec was not read afresh a second time
after the eight answers. Nothing was run against cb4 or against
SQLite: the two new statements have no plan made, and every row of the table of "A lock past its
`until`" is a proposal that task 1's cells test. The three lines of the reviewer's wait were not
run again. Rounds 1 to 3 gave no `how` for a release with `force`; `"forced"` is new here.
