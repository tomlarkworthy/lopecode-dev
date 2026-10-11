# lk-1-issue-lock-methods

Task 1 of `plan/cloud-brain-locks-held-in-the-cluster.md` (approved at event 1453): `issue.lock` and
`issue.locks` on `brain-x-issues`. Nothing calls them yet. `lock.sh` is still the directory lock;
task 3 puts the cluster behind it.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

- Two tables, `issues_locks` and `issues_lock_history`, in a cell `issuesLockSchema`.
- Twelve statements in `issuesSql`, each named `lock…`.
- A cell `issueLocking`: for a take, a renew, a release and a force it gives `{ batch, read }`, the
  statements of the call and what their answers say. The app sends `batch` to `sql.batch` and
  throws or returns what `read` says.
- `refuse(status, code, message, body)`, and `run` answers `{ ...body, error, message }`.
- Routes `issue.lock` (procedure) and `issue.locks` (query), under the rule every method of the
  Worker but `key` has.
- Two rows of the method reference and the Storage row.
- `issuesFakeSql` answers the twelve statements and returns `locks` and `history`.
- Five test cells, `test_issues_lock_*`. Two existing cells changed: the method list of
  `test_issues_declares_what_it_needs` (20 to 22), and three stated values in
  `test_issues_reference_states_each_value_and_has_no_hole`.

`tests/tools/issue-lock-sql.test.ts`, new: 7 tests on `bun:sqlite` (SQLite 3.54.0, `select sqlite_version()`).

## Where it is not the spec's text, and why

| The spec | Built | Why |
|---|---|---|
| "The two tables in `issuesSchema`" | A list of their own, `issuesLockSchema`, made by the two lock methods only | Every other method runs `schema()` before it answers (`load`). Had D1 refused one of the two `CREATE`s, every call of the tracker would have failed, on a deploy whose tests (the fake) passed. The spec also says "the other methods of the tracker do not run these statements"; the two sentences could not both hold |
| The holder is `who` and `by.via` | `who` and `issueActor(by)`, in a column `actor` | For a token's call the two are the same text, `delegation:<id>`. For a Worker `via` is empty, so two Workers under one `who` would have been one holder; the actor is `worker:NAME`. Narrower, never wider. It is also what the test rig can tell apart: `rig.a` and `rig.b` both arrive with `via` "" |
| A take is a batch of five | Six: the trim of the history is the last | "the newest 500 kept" names no place for the trim. In the batch it is in the take's transaction. A renew is the spec's three; a release and a force are four |
| The method table gives one 200 body | A release and a force answer `{ held: false, name, who, n, taken, ended, how }` | A released lock has no `until`; the answer is the history row it wrote |
| 409 `Held` | 409 `Held` with a holder, 409 `NotHeld` with `holder: null` | A caller reads `holder`; the code says the same in a word |
| "a test cell with the clock moved past `until`" | The cell sets `until` of the fake's row to a past time | The Worker reads `Date.now()` and a test cell assigns no global (the writer's brief, step 8). `until < now` is the one comparison, met from the other side |
| `refuse` "spreads it into the body beside `error` and `message`" | The body is spread first | A body cannot then replace `error` or `message` |

`issue.locks` answers `history: []` when no `history=` is given, and 400 for one that is not a
whole number from 0 to 500.

## Runs, the writer's own

In the worktree `bm-lk-1-issue-lock-methods`, 2026-10-11, between 19:44:02 (the `at` of the start, event 1508) and 19:52:24 CEST (`date`).

- `bun tools/cloud-brain/build.ts --out … && … && (cd cloud-brain-dev && bun test.ts brain-x-issues --with …/lk-1-issue-lock-methods.js)`:
  `passed 21, failed 0, needsBrowser 11`. The five new cells are among the 21.
- The snippet of step 8 in a headless QA tab on the build: `[32,[]]`. 32 is 21 + 11.
- `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20`, last line:
  `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[]`; `mains` of the first line
  `["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-issues"]`; `tests` of a run 32.
- `bun test ./tests/tools/issue-lock-sql.test.ts`: 7 pass, 0 fail.
- The same file with `BRAIN_NOTEBOOK=<main checkout>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`,
  the notebook before the change: 0 pass, 7 fail.
- `bun test ./tests/tools` at 19:52:24 CEST, after the rebase: 258 pass, 0 fail.

## What brain-db's check says of the statements

`tests/tools/issue-lock-sql.test.ts`, the second test. Plans made by `EXPLAIN` on `bun:sqlite` with
the arguments a call binds, given to `sqlShape`, `sqlNeeds` and `sqlSignature` of
`cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js` (`services.json` there: `brain-db` `163647e04b63`;
the spec's round 3 read `0af12bd0d64e`). The first line is the control, the upsert of that module's own test:

```
upsert, no WHERE   w:metrics_calls
lockOne            r:issues_locks
lockAll            r:issues_locks
lockExpired        r:issues_locks w:issues_lock_history
lockTakeOver       w:issues_locks
lockTakeNew        w:issues_locks
lockRenew          w:issues_locks
lockReleased       r:issues_locks w:issues_lock_history
lockRelease        w:issues_locks
lockForced         r:issues_locks w:issues_lock_history
lockForce          w:issues_locks
lockHistory        r:issues_lock_history
lockTrim           r:issues_lock_history w:issues_lock_history
```

The two `CREATE TABLE` statements are `schema` by `sqlShape`, name tables that start `issues_`, and
`sqlNeeds(…, { schema: true })` refuses neither. None of the twelve is refused. The test fails on any
change to these lines, so a statement added later gets a plan or a failure.

What this does not show is the same as in the spec: D1 plans with its own SQLite. The probes below
are that test.

## Deployed, and the probes against cb4

`brain.ts apply lk-1-issue-lock-methods-brain-x-issues.json`, under `cb4.lock` from 19:56:36 to 19:57:21 CEST
(`lock.sh`'s own lines), answered:

```
44308 ms [{"worker":"brain-x-issues","hash":"40a30d5d086f","state":"verified","version":"0a2326e8-2b4e-48b5-8a16-2e7bc44f3ad7","tests":32}]
```

`redistil` after it: `brain-x-issues     same  40a30d5d086f`. `issue.verify?guards=true`:
`{"ok":true,"seq":1555,…,"checked":1555,"guards":true}`, so the record is as it was; the locks wrote no event.

The probes of R1, R2 and R4, sent as `issues-implementer-2` through `issue-as.sh` by one script, whole
as it printed. D1 took the first form of every statement: no answer is brain-db's `refused: …`, so the
other two forms of the spec were not deployed. The names are `probe-lk-1-issue-lock-methods` and the
same with `-20`; each has a row in `issues_locks` from now on, emptied.

```
# R1 2026-10-11 19:58:07 CEST
lock {"name": "probe-lk-1-issue-lock-methods", "who": "a", "seconds": 30} -> 200 {"held": true, "name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 1, "taken": 1791741487993, "until": 1791741517993}
locks -> 200 {"locks": [{"name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 1, "taken": 1791741487993, "until": 1791741517993}], "ended": [], "history": []}
# R2
lock {"name": "probe-lk-1-issue-lock-methods", "who": "b", "seconds": 30} -> 409 {"held": false, "holder": {"who": "a", "taken": 1791741487993, "until": 1791741517993}, "error": "Held", "message": "probe-lk-1-issue-lock-methods is held by a"}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "a", "seconds": 30} -> 409 {"held": false, "holder": {"who": "a", "taken": 1791741487993, "until": 1791741517993}, "error": "Held", "message": "probe-lk-1-issue-lock-methods is held by a"}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "b", "release": true} -> 403 {"holder": {"who": "a", "taken": 1791741487993, "until": 1791741517993}, "error": "Refused", "message": "probe-lk-1-issue-lock-methods is held by a, and not by this caller under the name b; left where it is"}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "a", "release": true} -> 200 {"held": false, "name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 1, "taken": 1791741487993, "ended": 1791741489963, "how": "released"}
locks -> 200 {"locks": [], "ended": [], "history": []}
20 takes at once of probe-lk-1-issue-lock-methods-20: statuses ['200', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409', '409'] held:true 1 holders named by the 409s ['w5'] winner w5
lock {"name": "probe-lk-1-issue-lock-methods-20", "who": "w5", "release": true} -> 200 {"held": false, "name": "probe-lk-1-issue-lock-methods-20", "who": "w5", "n": 1, "taken": 1791741490601, "ended": 1791741491307, "how": "released"}
# R4
lock {"name": "probe-lk-1-issue-lock-methods", "who": "a", "seconds": 5} -> 200 {"held": true, "name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 2, "taken": 1791741491641, "until": 1791741496641}
6 s later, locks -> 200 {"locks": [], "ended": [{"name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 2, "taken": 1791741491641, "until": 1791741496641}], "history": []} now 1791741498023
lock {"name": "probe-lk-1-issue-lock-methods", "who": "b", "seconds": 30} -> 200 {"held": true, "name": "probe-lk-1-issue-lock-methods", "who": "b", "n": 3, "taken": 1791741498287, "until": 1791741528287, "over": {"who": "a", "until": 1791741496641}}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "a", "renew": true} -> 409 {"held": false, "holder": {"who": "b", "taken": 1791741498287, "until": 1791741528287}, "error": "Held", "message": "probe-lk-1-issue-lock-methods is held by b; not yours to renew"}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "b", "release": true} -> 200 {"held": false, "name": "probe-lk-1-issue-lock-methods", "who": "b", "n": 3, "taken": 1791741498287, "ended": 1791741498938, "how": "released"}
locks?history=10 -> 200 {"locks": [], "ended": [], "history": [{"name": "probe-lk-1-issue-lock-methods", "who": "b", "n": 3, "taken": 1791741498287, "ended": 1791741498938, "how": "released"}, {"name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 2, "taken": 1791741491641, "ended": 1791741496641, "how": "expired"}, {"name": "probe-lk-1-issue-lock-methods-20", "who": "w5", "n": 1, "taken": 1791741490601, "ended": 1791741491307, "how": "released"}, {"name": "probe-lk-1-issue-lock-methods", "who": "a", "n": 1, "taken": 1791741487993, "ended": 1791741489963, "how": "released"}]}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "c", "seconds": 5} -> 200 {"held": true, "name": "probe-lk-1-issue-lock-methods", "who": "c", "n": 4, "taken": 1791741499513, "until": 1791741504513}
lock {"name": "probe-lk-1-issue-lock-methods", "who": "c", "release": true} -> 200 {"held": false, "name": "probe-lk-1-issue-lock-methods", "who": "c", "n": 4, "taken": 1791741499513, "ended": 1791741499867, "how": "released"}
n: a 2 b 3 c 4 | over in c: False
# done 2026-10-11 19:58:19 CEST
```

Read from it:

- R1: the take is 200 `held: true`; `issue.locks` lists it; after the release it is in neither list.
- R2: `b` is answered 409 naming `a`, and so is `a` again. Of 20 takes sent together for one free
  name (20 threads, one `curl` each) one is 200 and 19 are 409, each naming the winner, `w5`. This is the
  only run of the batch as a transaction beside other callers. It was made once.
- R4: `a` took the name for 5 s. 6 s later it is in `ended` and not in `locks`. `b`'s take answers
  `over: { who: "a", … }` with `n` 3 after `a`'s 2, and the history row of `a`'s lock is `how: "expired"`
  with `ended` 1791741496641, its own `until`. `a`'s renew is then 409 naming `b`. After `b`'s release
  the name is in neither list, and `c`'s take has `n` 4 and no `over`.
- Beside the three: a release by another name is 403 with `holder`, and the lock stayed (R5).

Not probed on cb4: a renew that succeeds, a release from another token, `force`, a 400.

## Not tried

- Two machines.
- A take whose answer is lost. Nothing in the service is for it; the spec gives it to `lock.sh` (task 3).
- More than one batch at once on a real database: the SQLite test runs its 20 takes one after another.
  The 20 sent together are in the probes.
- `force: true` on cb4: it is the owner's, in their tab. In the cells only.
- A Worker of the Brain as a caller, on cb4. In the cells only (`rig.worker`).
- A mutation of the method to see each test cell fail. The SQLite test was seen to fail (7 of 7) on
  the module before the change; the test cells were not run against a broken method.
- The trim on cb4: 500 history rows were not made there. On SQLite: 503 holds leave 500 rows.
- The panel shows nothing of a lock. No task of the spec asks for it.
