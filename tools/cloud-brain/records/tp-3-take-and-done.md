# brain-x-topic: `topic.take`, `topic.done`, claims (`tp-3-take-and-done`)

Task 3 of `plan/cloud-brain-topics-service.md`, requirement R8: "work handed to one of several takers,
with a claim that ends". Built 2026-10-12 by a writer of the issue loop, round 1. `major`: it adds two
methods other callers use. The owner approved the spec at event 3377. Every time below is from `date`,
a lock's own line or a tool's `at`, in CEST unless it says UTC.

## What changed

- `tools/cloud-brain/brain-topic.ojs`: two methods, one table, 12 statements, and `topic.subscribe`
  with no `target`. The first cell is the method reference and has a section "Take".
- `tests/tools/topic-sql.test.ts`: the new statements on a SQLite.
- `plan/cloud-brain-topics-service.md`: two paragraphs of "Take (R8)" gain "(As built, …)".

| cell | what is new |
|---|---|
| `topic_service` | `topic.take` and `topic.done`, each under `topicRule`. 11 methods. |
| `topicSchema`, `topicSql` | `topic_claims (topic, name, seq, until, tries, taker)`. `again`, `fresh`, `handed`, `taken` (a take), `claimOf`, `spent`, `spentOf`, `lost`, `unclaim`, `unclaimAll`, `dropClaims`, `orphans`. `subscribe` and `resubscribe` take `seconds`; the four selects of a subscription read it. `due`, `dueOf` and `claim` have `target <> ''`. |
| `topicOps` | `failedTo`: the give-up of a push, cut out of `deliver` so a claim takes the same one. `giveUp` (one claim), `expire` (one subscription's spent claims), `expireDue` (every subscription's, at a tick). `trim` removes claims whose entry is gone. |
| `topicApp` | `topic.take`, `topic.done`. `topic.subscribe` with no target. `topic.unsubscribe` and `topic.delete` remove claims. `subShown` has `seconds`, and `null` for the target and delegation of a subscription to take from. |
| `topicFakeSql`, `topicRig` | The new statements in JS. The rig runs one call of `db.sql` whole before the next. `rig.lapse` ends claims. |

One sentence of task 2 is changed too. Its record, "Seen and left", gave the 403 of a refused probe to
this task's writer: it read "…under that delegation: it is one this caller made for brain-x-topic…",
which says what the delegation is where it means what it must be. It now reads "…under that
delegation; a subscription takes one that this caller made for brain-x-topic, with quota.get in its
scope". No test reads that text.

## What was decided here

The spec's section is ten lines. Each of these it left open; the side not taken is beside it.

- **A claim is a row**, `topic_claims`, as the proposal sketched (`plan/cloud-brain-topics.md`, line
  152), with one more column, `taker`: an id made for each take. A take is four statements in one
  call of `db.sql`, and what it claimed is read back by that id in the same call. Not from a count of
  changes, as `deliver` does not for its lease.
- **`position` of a subscription to take from is the `seq` of the last entry handed out.** Entries are
  done in any order, so there is no "all before this are done" to keep without a pass over the
  claims. What is outstanding is the rows of `topic_claims`, which no method lists (below, "Not
  built").
- **A new subscription starts at the topic's `last`**, as a push subscription does. It is the one
  insert. Starting at 0 would hand out up to 10,000 kept entries.
- **`limit` is 1 when left out.** `topic.read` has 50; a take claims what it answers, and a taker
  that asked for nothing in particular should not hold 50 entries for 300 s.
- **`topic.done` carries no claim id.** The spec's shape is `{ topic, name, seq, failed }`, and
  "several agents that call with tokens of the owner are one caller". So a `topic.done` for a `seq`
  ends its claim whether that claim has ended and whether another take has taken it over. Delivery
  is at least once, as a push is. Not taken: an id from `topic.take` that `topic.done` must show.
- **The fifth ending is acted on at the next take of the subscription, and at each tick.** At the
  take, so a taker is not handed a spent entry. At the tick, because the failed topic is where
  somebody learns that every taker has gone, and then no take comes. The tick costs one more call of
  `db.sql` a minute (`spentOf`).
- **The `read` rule is asked again at each take.** A push asks it at the subscribe alone because a
  push has no call of the subscriber's to ask it of; a take has. This only narrows (line 1 of the
  philosophy). `topic.done` asks no rule: it removes the caller's own claim. The `write` rule of
  `failed` is asked at the subscribe alone, as for a push, since the tick has no caller.
- **A subscription stays the kind it was made as.** `position` means the last entry pushed or given
  up for one kind and the last handed out for the other; sent again as the other kind it is 400.
- **`seconds` is 1 to 86400**, a whole number; `delegation` or `params` with no target is 400, and
  `seconds` with a target is 400. Sent again with no `seconds`, a subscription has 300.
- **`failed` of `topic.done` is `true` or text**, kept to 300 characters as `error` of the failed
  entry; `status` is 0. `""`, a number and an object are 400; `false` and `null` are a plain done.
- **`topic.take` and `topic.done` by anyone but the subscription's creator are 404**, the owner and
  the topic's creator among them. They read who is subscribed and end a subscription
  (`topic.subs`, `topic.unsubscribe`); they do not take its work.
- **An entry the clock removes while it is claimed** is not handed out again (`again` and `taken`
  need the entry). Its claim goes at `topic.done` or with the clock's next removal (`orphans`).

## Tests

Four new `test_*` cells, 17 in all, and one new test in `tests/tools/topic-sql.test.ts`, 7 in all.
Four older cells changed for what is no longer true: `take` was the method that is not there, a
subscribe with no target was 400 "not built", a subscription read had 14 fields, and there were 9
methods.

| test | what it holds |
|---|---|
| `test_topic_take_hands_each_entry_to_one_taker` | R8: two takes at once, limit 2, are handed 4 different entries; a subscription to take from is pushed nothing by an append or a tick; the entry's fields, `tries` and `until`; `position`; `limit` left out, 0, text, negative, 1000; ended claims before new entries, the limit over both |
| `test_topic_claim_that_ended_is_handed_out_again_and_the_fifth_ending_fails_the_entry` | R8: a claim that lasts is not handed out, one that ended is, with `tries` 2 to 5; the fifth ending puts the entry in `failed` with `tries: 5` at the next take, and for another entry at a tick with no take; a push subscription on the failed topic hears both; no `failed`, `dropped` is 1 and a tick does not count it twice; an entry at 8 hops is dropped; a `failed` that is the subscription's own topic ends at `hops` 8 |
| `test_topic_done_ends_a_claim_and_failed_sends_the_entry_on` | R8's token check in a cell (take 1 of 2, done, take answers the other); done twice, of a `seq` not taken, of a `seq` that is no number; 7 values of `failed` that are 400; `failed` as text, as `true`, of 400 characters; done of a claim that ended and of one handed out again; no failed topic; an entry the clock removed; unsubscribe and delete remove claims |
| `test_topic_take_is_for_the_caller_that_subscribed` | another member, the owner and a Worker are answered the same 404 by take and done, for a subscription that is there and one that is not; two subscriptions claim the same entries apart; the `read` rule at each take; R7's subscribe of a topic the caller may not read; `seconds` and what is a push subscription's; sent again; a change of kind; take from a push subscription; a token and the owner's tab share one |

The cells run on `topicFakeSql`, which answers a statement by its identity and not its text. The
statements themselves are run by `topic-sql.test.ts` on a SQLite: each of the 42 statements' plans is
given to the check of the deployed `brain-db`, and 159 calls are run on the SQLite and on the
stand-in and compared.

**Each new cell fails without what it holds.** Sixteen mutations of the seed, each built and run with
`cd cloud-brain-dev && bun test.ts brain-x-topic --with <build>` and
`bun test ./tests/tools/topic-sql.test.ts`, then the seed put back (`diff` against the kept copy
printed nothing). The last ended 12:47:56.

```
M1  a deliverer takes a subscription to take from   16 of 17 pass (take_hands)            topic-sql 6 pass, 1 fail
M2  take does not ask the read rule                 16 of 17 (take_is_for_the_caller)     7 pass
M3  anyone takes                                    16 of 17 (take_is_for_the_caller)     7 pass
M4  anyone ends a claim                             16 of 17 (take_is_for_the_caller)     7 pass
M5  a take does not give up what is spent           16 of 17 (claim_that_ended)           7 pass
M6  the tick does not give up what is spent         16 of 17 (claim_that_ended)           7 pass
M7  an entry at 8 hops goes to failed               no result in 120 s, killed            7 pass
M8  done ignores failed                             15 of 17 (claim_that_ended, done)     7 pass
M9  a sixth claim is made (SQL)                     17 of 17                              5 pass, 2 fail
M10 unsubscribe leaves the claims                   16 of 17 (done)                       7 pass
M11 delete leaves the claims                        16 of 17 (done)                       7 pass
M12 a subscription changes its kind                 16 of 17 (take_is_for_the_caller)     7 pass
M13 failed may be "" or a number                    16 of 17 (done)                       7 pass
M14 the rig mixes two calls of db.sql               17 of 17                              7 pass
M15 fresh takes the limit whatever again took (SQL) 17 of 17                              6 pass, 1 fail
M16 the clock leaves a claim whose entry is gone    16 of 17 (done)                       7 pass
```

Three of these say something about the tests.

- **M7 does not fail, it does not end.** With no bound on the way to `failed`, a chain has no ninth
  entry to stop at and the run was killed after 120 s. Which cell was running was not read.
- **M9 and M15 pass the cells**, as M9 of task 2 did: a change to the text of a statement is seen
  only on the SQLite.
- **M14: no test fails when the rig lets two calls of `db.sql` mix.** The two takes "at once" in
  `test_topic_take_hands_each_entry_to_one_taker` are sent together, and the stand-in happened to
  run one whole before the other with and without the rig's queue. So that cell shows that two
  takes one after the other are handed different entries, and the SQLite test shows the same of the
  statements. That two takes at the same moment are one transaction each is D1's and `brain-db`'s;
  it was tried on cb4, below.

**Counts**, each from a run after the last edit of the seed:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && … && (cd cloud-brain-dev && bun test.ts brain-x-topic --with $W/tools/cloud-brain/.emitted/tp-3.js)
  "passed":17,"failed":0,"needsBrowser":0
cd $W && bun test ./tests/tools/topic-sql.test.ts
  7 pass, 0 fail, 241 expect() calls
cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-topic
  "tests":17,"passed":17,"failed":[]     Chrome 151.0.7922.34
cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-topic --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
  "mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-topic"]
  "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]     (each run: "tests":17), ended 2026-10-12T10:48:51Z
cd $W && tests/tools/suite.sh        (bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools)
  609 pass, 0 fail, 3818 expect() calls, 609 tests across 63 files, 89.05 s; no line "skipped:"
```

The suite was run at 12:50, after the rebase on `origin/main` and after the last edit of a seed or a
test; this record was edited after it.

Against what cb4 ran before this change (`f780a4ef2da0`, 13 cells) `topic.take` answered
`MethodNotImplemented`: `test_topic_refuses_what_is_no_name_no_key_and_too_long_a_body` of that
version asserted it.

## On cb4

The landing lock was taken at 12:52:14. The apply, under the deploy lock, 12:52:41 to 12:53:34 (the
locks' own lines):

```
tp-3-take-and-done-brain-x-topic.json 40305 ms [{"worker":"brain-x-topic","hash":"e4b8866d8a2b","state":"verified","version":"a769188f-…","tests":17}]
  the deployer distilled e4b8866d8a2b; the browser emitted 57caa2dea40f
```

`verified`: the deployer ran the 17 cells in the cluster's browser. `brain.ts redistil` then read
`brain-x-topic  same  e4b8866d8a2b`, and `issue.verify?guards=true` answered `"ok":true`.

The token checks, `--as loop-topic`, 12:54:18 to 12:54:41, by a script that calls `brain.ts curl` and
prints each answer's body (not committed; it did not print the HTTP status, so a refusal below is
given by its `error`). This was the first time D1 ran the statements of a take; `fresh` has a
subquery in its `LIMIT`, which the SQLite of `bun` took and which nothing had shown D1 would.

**R8**, 12:54:18. `check.work` created; subscribed as `takers` with `seconds: 2` and
`failed: "check.failed"`, which answered `"target":null,"seconds":2,"position":0`. Two appends, `seq` 1 and 2.

```
take limit 1        -> entries: [{ seq 1, key "r8-1791802457-1", body {"job":1}, hops 0, tries 1, until 1791802463544 }]
done 1              -> {"done":true}
done 1 again        -> {"error":"NotFound","message":"no such claim"}
take limit 1        -> entries: [{ seq 2, …, tries 1, until 1791802464071 }]          the other
```

`until` of the first is 2,347 ms after the entry's `at`: a claim of 2 s made about a third of a second
after the append.

**A claim that ended is handed out again.** A take straight after, limit 5: `{"entries":[]}`, while
the claim of `seq` 2 lasted. The same take 2.5 s later: `seq` 2 with `tries: 2`.

**Two takes at the same moment.** Six more appends, `seq` 3 to 8, then two `topic.take` with `limit: 3`
started together from two threads (each a `brain.ts` process; they answered in 207 and 198 ms):

```
[(6, 1), (7, 1), (8, 1)]        seq, tries
[(3, 1), (4, 1), (5, 1)]        six entries, none twice
```

One run. It does not show that the two calls overlapped in `brain-db`.

**`done { failed }`**, 12:54:26. `done` of `seq` 6 with `failed: "tp-3 check: given up"` answered
`{"done":true,"failed":"check.failed"}`, and the next read of `check.failed` had:

```
{"topic":"check.failed","seq":2,"key":"check.work/takers/6","sender":"worker:brain-x-topic","hops":1,
 "body":{"topic":"check.work","name":"takers","seq":6,"entry":{"topic":"check.work","seq":6,"key":"r8-1791802457-6","sender":"owner","body":{"job":6},"hops":0},
         "status":0,"error":"tp-3 check: given up","tries":1}}
```

**The fifth ending**, 12:54:30 to 12:54:38. `seq` 3, 4, 5, 7 and 8 were done. `seq` 2 had had two
claims. A take each 2.3 s, limit 5:

```
[(2, 3)]   [(2, 4)]   [(2, 5)]   []
```

The fourth was handed nothing, and `check.failed` then had `seq` 3: key `check.work/takers/2`,
`"status":0,"error":"5 claims ended with no topic.done","tries":5`, `hops` 1. `topic.subs?topic=check.work`:
`"position":8,"dropped":0,"error":"5 claims ended with no topic.done"`. The take gave it up, not a tick:
the entry's `at` is 1791802478260, inside that take.

**Refusals**, 12:54:38:

```
take { topic: "check.a", name: "to-b" }          -> InvalidRequest "that subscription is pushed to its target; nothing is taken from it"
take { topic: "check.work", name: "nope" }       -> NotFound "no such subscription"
subscribe takers again, with a target             -> InvalidRequest "that subscription is taken from; unsubscribe it to make one that is pushed"
subscribe { name: "zero", seconds: 0 }           -> InvalidRequest "seconds: a whole number from 1 to 86400"
done { seq: 99 }                                 -> NotFound "no such claim"
```

**The push of task 2 after this deploy.** One append to `check.a`, `seq` 11; 1.5 s later
`topic.subs?topic=check.a` read `to-b` at `"position":11,"status":200,"seconds":null`.

After the apply, at 12:55, `cd cloud-brain-dev && bun sync.ts … && bun test.ts brain-x-topic`:
`hash e4b8866d8a2b…, passed 17, failed 0, needsBrowser 0`.

Left on cb4 for the reviewer: the topic `check.work` with 8 entries and no claim, its subscription
`takers` (`seconds: 2`, `failed: "check.failed"`), two new entries in `check.failed` (`seq` 2 and 3) and
one in `check.a` and `check.b` each, beside what task 2 left.

**R9.** `git diff --name-only origin/main HEAD`, before the record and `seen.json` were committed, names
`plan/cloud-brain-topics-service.md`, `tests/tools/topic-sql.test.ts` and `tools/cloud-brain/brain-topic.ojs`: no other seed. In
`cloud-brain-dev/deploy/services.json` as `sync.ts` read it at 12:55: `brain` `18ab224bd54b`, `brain-core` `26486a49c85b`, `brain-db`
`163647e04b63`, `brain-deployer` `4a25dc92cc07`, each as the record of task 2 has it. This task deployed
`brain-x-topic` once and nothing else.

## Not built

- **A read of the claims.** No method lists what is claimed, by which take and until when.
  `topic.subs` shows `position` (the last handed out), `dropped` and the last `error`.
- **A longer claim.** A taker that needs more than its `seconds` has no call to ask for it; the entry
  is handed out again when the claim ends.
- **Giving an entry back** before its claim ends, to be handed out at once.
- **A panel.** No cell of this module draws anything.

## Not tried

- **A member's call on cb4.** A member reaches no `topic.*` there until the owner's grant. Each answer
  to a member, and the 404 that keeps one member's subscription from another, is from a cell.
- **The clock on cb4.** The fifth ending at a tick with no take, and the removal of a claim whose
  entry is gone, were run by cells that give the ticks. Task 2 did not see a tick of this Worker run
  on cb4, and neither did this task.
- **Two takes that overlap in `brain-db`.** The two on cb4 were started together and answered apart;
  nothing read whether they overlapped. That a batch is one transaction is `brain-db`'s, and no test
  of this module holds it (M14, above).
- **The `read` rule refusing a take on cb4**, `topic.take` by a caller that is not the subscription's
  creator there, and `topic.unsubscribe` and `topic.delete` of a subscription with claims there: cells only.
- **`failed: true` on cb4**, an entry at 8 hops given up by its takers there, and a `failed` topic that
  is the subscription's own there: cells only.
- **More than 50 spent claims of one subscription at one take, or of 50 subscriptions at one tick**
  (`duePage`): the rest wait for the next take or tick, by reading; not run.
- **A take of 200**, and a subscription with thousands of outstanding claims: `again` reads every
  claim of the subscription that has ended; `topic_claims` has no index but its key.
- **What the second call of `db.sql` a minute costs** (`spentOf` at each tick).
- **The tests run together on the owner's page, and the page on cb4 with the new module**:
  `brain.ts shell` is the orchestrating session's.
- **The mutations after the commit.** They were run on the seed as it was last edited, before its
  commit. The two rebases after them printed no seed, `build.ts` or `cloudflare-iac*.ojs` among
  the files that came in, and they were not run again.
