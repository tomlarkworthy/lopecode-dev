# brain-x-topic: subscribe, push to `NAME.receive`, `failed`, `hops` (`tp-2-push-to-receive`)

Task 2 of `plan/cloud-brain-topics-service.md`. Built 2026-10-12 by a writer of the issue loop, round 1.
`major`: the service makes calls as the account that subscribed. The owner approved the spec at event 3377.
Every time below is from `date`, a lock's own line or an entry's `at`, in CEST.

## The probe, first

The design rests on one thing that had not been run: `quota.get` called with `x-brain-as: <id>` answers
for the account that made the delegation. The spec has the writer stop if it does not.

A build with `topic.subscribe` alone (the checks, the call, nothing kept, no table) was deployed under
the deploy lock, 07:08:12 to 07:08:36, before any landing:

```
tp-2-push-to-receive-brain-x-topic.json 17993 ms [{"worker":"brain-x-topic","hash":"c0526541ccf8","state":"verified","version":"07d7f108-…","tests":7}]
```

Its seed is commit `3aa1e19f`. The apply wrote the Worker's entry of `tools/cloud-brain/seen.json` in the
main checkout with no landing lock held; the file was committed in the landing, `f6ccd1fd`.

With `brain.ts curl … --as loop-topic`, 07:08:43 to 07:08:50:

```
delegation.create { name: "topic-check", holder: { worker: "brain-x-topic" }, scope: ["topic.receive", "quota.get"] }
  -> { id: "a690b5b143c6", from: "owner", parent: "4261052b1920", by: "delegation:4261052b1920", caps: [] }
quota.get (the token itself)                                 -> {"who":"owner", …} [200]
topic.subscribe { topic: "check.one", delegation: a690b5b143c6 } -> {"topic":"check.one","name":"probe","target":"com.lopecode.brain.topic.receive","delegation":"a690b5b143c6","kept":false} [200]
topic.subscribe { … delegation: 000000000000 }               -> 403 "the core answered 403 to quota.get under that delegation"
topic.subscribe { … delegation: 4261052b1920 }               -> 403, the same message
```

The 200 is answered only when `who` of the core's answer equals the caller's id, `owner`. So the probe
answers the maker. `000000000000` is nobody's delegation, and `4261052b1920` is the token's own, held by
a secret and not by this Worker: the core refused both. This was the first call with `x-brain-as` on cb4
(`spec-as-built.md` 3637 said none had been sent; that line now points here).

Not shown by it: a member's delegation. `loop-topic` calls as the owner, and a member reaches no
`topic.*` on cb4 until the owner's grant.

## What changed

- `tools/cloud-brain/brain-topic.ojs`: four methods, one table, the deliverer. The first cell is the
  method reference and has a section "A push".
- `tests/tools/topic-sql.test.ts`: the 16 new statements on a SQLite.
- `plan/cloud-brain-topics-service.md`: five sentences gain "(As built, …)".
- `tools/cloud-brain/spec-as-built.md`: one line, above.

| cell | what is new |
|---|---|
| `topic_service` | `topic.subscribe`, `unsubscribe`, `subs`, `receive`, each under `topicRule`. `xrpc` is now a resource. Still no `calls`. |
| `topicSchema`, `topicSql` | `topic_subs` and an index; 16 statements. |
| `topicOps` | `append` (shared with the app), `push` (one call of a target), `deliver` (one subscription), `pushOf`, `pushDue`, `pushAfter`; `tick` pushes every tick and removes old entries each hour as before. |
| `topicApp` | The four methods. `topic.append` and `topic.receive` share `put`, which starts the push under `waitUntil`. `topic.delete` removes the topic's subscriptions. |
| `topicFakeSql`, `topicRig` | The new statements in JS. The rig stands in for the core: `db.sql`, and a call with `x-brain-as`. |

## What was decided here

The spec left each of these open. The side not taken is beside it.

- **A new subscription starts at the topic's `last`.** It is pushed what is appended after it. Starting
  at 0 would push up to 10,000 kept entries at the subscribe.
- **`topic.subscribe` again, by its creator**, changes target, delegation, params and `failed`, keeps the
  position, and clears a wait, so a subscriber who has mended a delegation is tried at the next append
  or tick. A name another caller subscribed with is 403, for the owner too.
- **The rules are asked at the subscribe, not at each push.** At a push the service has the subscriber's
  id and not the call they made (a session, a token's name), so a rule that reads `caller.session` or
  `caller.token` could not be asked again as it was first asked. What stands in: the creator of a topic,
  and the owner, read who is subscribed to it (`topic.subs?topic=`: name, creator, target, position) and
  end a subscription (`topic.unsubscribe`). Not covered: a subscription that names a topic as its
  `failed` goes on appending there after that topic's `write` rule shuts its creator out, and nothing
  lists such subscriptions.
- **One deliverer a subscription** is a lease in the row: `claim` sets `runner` and `lease` only when the
  lease has ended, the subscription is behind and it is not waiting. Whether the claim won is read from
  the row in the same transaction (`runner` is the deliverer's own id), not from `changes`. Every later
  write of a deliverer is `WHERE runner = ?`.
- **A deliverer releases and then claims again.** An entry appended between its last read and its
  release would otherwise wait for a tick. The second claim changes nothing when none is behind.
- **A wait is counted from the append or the tick that tried**, not from the moment the target answered,
  so a test gives the clock exact times.
- **`x-brain-context` is sent empty** on the probe and on each push. On a Worker the wrapper adds the
  context of the call being answered to every call made in its time (`chained`, `cloudflare-iac.ojs`),
  and a push under `waitUntil` is in the appender's. The core does not read it under `x-brain-as`
  (`brain-core.ojs`, the middleware: `now.d ? now : …`); sending none does not rest on that.
- **`pushMs` and `deliverMs` are settings** (10 s and 20 s). `deliverMs` became one after a test failed
  once; see "A run that failed".
- **`seconds` is a column of `topic_subs`**, always 0. It is task 3's (a subscription to take from), put
  in now so that task needs no change to a table that has rows.
- **Not built: a panel.** `plan/cloud-brain-authority.md` line 332 says "The page does both behind one
  button". No cell of this module draws anything.

## Tests

Six new `test_*` cells, 13 in all, and one new test in `tests/tools/topic-sql.test.ts`, 6 in all.

| test | requirement |
|---|---|
| `test_topic_push_reaches_the_target_as_the_subscriber` | R4: the target hears the subscriber, `delegation:<id>`, `worker:brain-x-topic`, hops 1, an empty context, the entry whole; order; a key sent twice is pushed once; four delegations that are not the caller's are 403 and nothing is kept; a member's own; R7's subscribe of another member's topic is 403 |
| `test_topic_subscribe_takes_only_a_method_named_receive` | R5: 11 targets are 400, three names are kept whole; 12 other bad inputs; `failed` needs its `write` rule; a delegation with `quota.get` alone is kept and its first push is in `failed` with status 403 and `tries: 1`; the eleventh subscription is 400 |
| `test_topic_push_is_tried_five_times_and_then_goes_to_failed` | R6: a 500 is called 5 times over waits of 1, 2, 4 and 8 minutes, a tick one millisecond early makes no call, the entry is then in `failed` with `tries: 5`; with no `failed`, `dropped` is 1; a 400 is called once; 429 and 402 wait; no answer in `pushMs` is a try |
| `test_topic_chain_of_pushes_ends_at_eight` | R6: a topic pushed to itself has `hops` 0 to 8 and no tenth; `failed` its own topic, 9 entries and `dropped` 1; two topics that name each other, 5 and 4; a `failed` topic that is gone; two ticks add none |
| `test_topic_receive_appends_a_pushed_entry_as_the_subscriber` | `topic.receive`: the key, the sender, the hops; a subscriber who may not write the topic is refused; a rule that reads `caller.session` refuses a push; the same entry twice is kept once |
| `test_topic_subs_are_read_and_ended_by_their_creator_and_the_topics` | `topic.subs`, `topic.unsubscribe`, `topic.delete` |

The core in these cells is `topicRig`'s stand-in, written from `asHolder` of `brain-core.ojs`. The real
core was met on cb4, below.

**Each new cell fails without what it holds.** Twelve mutations of the seed, each built and run with
`cd cloud-brain-dev && bun test.ts brain-x-topic --with <build>` and `bun test ./tests/tools/topic-sql.test.ts`,
then the seed put back (`diff` against the kept copy printed nothing), about 07:16:

```
M1  whose delegation is not asked        12 of 13 pass  (push_reaches)                 topic-sql 6 pass
M2  the context is not sent empty        12 of 13       (push_reaches)                 6 pass
M3  an entry at 8 hops goes to failed    12 of 13       (chain)                        6 pass
M4  an entry at 8 hops is pushed         12 of 13       (chain)                        6 pass
M5  a 4xx is tried again                  9 of 13       (subscribe, five_times, chain, receive)   6 pass
M6  any method is a target               12 of 13       (subscribe)                    6 pass
M7  failed needs no write rule           12 of 13       (subscribe)                    6 pass
M8  subscribe needs no read rule         12 of 13       (push_reaches)                 6 pass
M9  the position starts at 0             13 of 13                                      4 pass, 2 fail
M10 the wait is not kept                 12 of 13       (five_times)                   6 pass
M11 anyone ends a subscription           12 of 13       (subs)                         6 pass
M12 delete leaves the subscriptions      12 of 13       (subs)                         6 pass
```

M9 passes the cells: `topicFakeSql` answers a statement by its identity and not its text, so a change
to the SQL of `subscribe` is seen only on the SQLite. These ran before `deliverMs` became a setting and
before the case of a `failed` topic that is gone was added; they were not run again after.

**A run that failed.** One run of `tab-tests.ts … --emit`, between 07:19 and 08:24, gave 12 of 13:
`test_topic_chain_of_pushes_ends_at_eight` read `hops` `[0]` where it expects 0 to 8, so the first push
of the chain had not appended when the test read. `bun test ./tests/tools` was running in the same
worktree and another writer's suite on the machine; that suite run ended `482 pass, 3 skip, 11 fail,
3 errors` after 1136 s, and which 11 was not kept (only its last lines were). Not reproduced: six runs
at once of the same build gave 13 of 13 each (31 to 33 s a run). The reading, not shown: the two timers
of a push, 10 s for one call and 20 s for a deliverer, were the only things in these cells that rest on
the page's speed. `deliverMs` is now a setting and the rig sends `pushMs` and `deliverMs` of 1e9 ms with
every call, so neither can end a test. Six runs at once of that build: 13 of 13 each.

**Counts**, each from a run after the last edit of the seed (`2cba28dc`):

```
cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-topic --emit …
  "tests":13,"passed":13,"failed":[]   emitted hash f780a4ef2da0…146234ded, 410895 bytes, Chrome 151.0.7922.34
cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-topic --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
  "mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-topic"]
  "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]      (each run: "tests":13)
cd $W/cloud-brain-dev && bun test.ts brain-x-topic --with $W/tools/cloud-brain/.emitted/tp-2.js
  'passed': 13, 'failed': 0, 'needsBrowser': 0
cd $W && bun test ./tests/tools/topic-sql.test.ts
  6 pass, 0 fail
cd $W && bun test ./tests/tools
  499 pass, 3 skip, 0 fail, 502 tests across 55 files, 100.88 s
  skipped: test-ts-cut.test.ts: …/cloud-brain-dev/test.ts has no --whole
```

`topic-sql.test.ts` gives each of the 30 statements' plans to the check of the deployed `brain-db`; each
of the 16 new ones opens `topic_subs`, `topic_topics` or `topic_entries` and nothing else. It runs 94
batches on a SQLite and on `topicFakeSql` and compares each answer.

## On cb4

The landing, 08:29:37 to 08:31:50 (the lock's own times). The apply, under the deploy lock, 08:30:04 to
08:30:30:

```
tp-2-push-to-receive-brain-x-topic.json 20454 ms [{"worker":"brain-x-topic","hash":"f780a4ef2da0","state":"verified","version":"15959be2-…","tests":13}]
```

`verified`: the deployer ran the 13 cells in the cluster's browser. `brain.ts redistil` then read
`brain-x-topic  same  f780a4ef2da0`. After the lock, `cd cloud-brain-dev && bun sync.ts … && bun test.ts brain-x-topic`:
`hash f780a4ef2da0…, passed 13, failed 0, needsBrowser 0`. The table `topic_subs` was first made by D1
at the subscribe of 08:32:20.

The token checks, `--as loop-topic`, by `tools/cloud-brain/.emitted/tp-2-check.py` (not committed; it
calls `brain.ts curl` and prints).

**R4**, 08:32:20. `check.a` subscribed as `to-b`, target `topic.receive`, delegation `a690b5b143c6`,
`params: { topic: "check.b" }`. Ten appends to `check.a`, one after another; after each, `topic.read` of
`check.b` until the entry with the key `check.a/<seq>` is there. Seconds from the append's answer to the
end of the read that had it:

```
[0.76, 0.13, 0.56, 0.14, 0.14, 0.23, 0.13, 0.21, 0.58, 0.14]   max 0.76
```

Each was in the first read, so each number is the time of one `brain.ts` read and an upper bound on the
push. All are under 10 s. An entry as read: `{"topic":"check.b","seq":1,"key":"check.a/1","sender":"owner","body":{"n":0},"hops":1}`.
The sender is the subscriber and the chain is one long. `topic.subs` after: `position: 10, status: 200, dropped: 0`.

**R5**, 08:32:37. A second child, `topic-check-narrow`, id `80592ba1e0a9`, scope `["quota.get"]`.
`check.n` subscribed with it, target `topic.receive`, `failed: "check.failed"`: 200. One append; the
first read of `check.failed`, 0.56 s after the append's answer:

```
{"topic":"check.failed","seq":1,"key":"check.n/narrow/1","sender":"worker:brain-x-topic","hops":1,
 "body":{"topic":"check.n","name":"narrow","seq":1,"entry":{"topic":"check.n","seq":1,"key":"r5-1791786758","sender":"owner","body":"narrow","hops":0},
         "status":403,"error":"delegation topic-check-narrow does not reach com.lopecode.brain.topic.receive","tries":1}}
```

Given up at the first try with status 403, by the core, and in the `failed` topic.

**R6**, 08:32:39. `check.loop` pushed to `topic.receive?topic=check.loop`, one append. 1.59 s after the
append's answer a read had nine entries:

```
(1, 0, 'r6-1791786760') (2, 1, 'check.loop/1') (3, 2, 'check.loop/2') … (9, 8, 'check.loop/8')     seq, hops, key
```

75 s later the same nine, `hops` 0 to 8. `topic.subs`: `position: 9, dropped: 1, error: "a chain of pushes is at most 8 long"`.
Under 60 s to the ninth, so no entry of the chain waited for a tick. That no tenth came in 75 s says the
append's own push made none; whether a tick ran in that time is not known (below).

**Refusals and repeats**, 08:34:11:

```
subscribe, target "topic.append"            -> 400 "target: a method named NAME.receive"
subscribe, delegation "0123456789ab"        -> 403 "the core answered 403 to quota.get under that delegation: …"
subscribe, no target                        -> 400 "target: a method named NAME.receive; a subscription to take from is not built"
subscribe check.a/to-b again                -> 200, "position":10, "subscribed":false
subscribe check.n/x, then unsubscribe twice -> {"unsubscribed":true}, then 404 "no such subscription"
receive?topic=check.b { topic: "check.a", seq: 3, body: "again" } -> {"seq":3,"duplicate":true}
```

Left on cb4 for the reviewer: the topics `check.a`, `check.b`, `check.n`, `check.failed`, `check.loop`
(and `check.one` of task 1), the subscriptions `check.a/to-b`, `check.n/narrow` and `check.loop/loop`,
and the two child delegations of `loop-topic`.

**R9.** `git diff --stat 7aa872af f6ccd1fd` names `brain-topic.ojs` and no other seed. In
`deploy/services.json` after the landing: `brain` `18ab224bd54b`, `brain-db` `163647e04b63`,
`brain-deployer` `4a25dc92cc07`, as the spec has them, and `brain-core` `26486a49c85b` where the spec has
`716194d83bd1`. This task deployed `brain-x-topic` twice and nothing else; who deployed the core since
2026-10-11 was not looked up.

## Not tried

- **The clock on cb4.** Nothing here shows a tick of this Worker ran. It has the binding `CORE` and no
  `ROWS`, so its tick is Cloudflare's cron trigger alone, which task 1 did not see run either. Every push
  seen on cb4 was started by an append. If the cron does not run there, an entry that waits after a try,
  and one left by a deliverer that stopped at `deliverMs` or was cut off, is next tried when something is
  appended to that topic (`pushOf` at an append reads every subscription of the topic that is behind),
  and not before. The five tries and their waits were run by a cell that gives the ticks.
- A try on cb4: a target that answers 5xx, 429 or 402, or does not answer in 10 s. The one target there
  is `topic.receive`, which answers 2xx or 4xx.
- A deliverer that stops at `deliverMs`, a lease that ends under a deliverer that still runs, and two
  deliverers that claim one subscription at the same moment on D1. On a SQLite the second claim changes
  nothing and a lease that ended is claimed by another (`topic-sql.test.ts`).
- Two instances of the Worker. On cb4 the append and the `topic.receive` it causes may be answered by
  different instances; the nine entries in 1.59 s came whichever way that went.
- A member's call on cb4, and a member's delegation there. Each answer to a member is from a cell.
- A delegation that was revoked or has ended. The core answers both from the function that answered the
  narrow scope (`stands`, `brain-core.ojs`); neither was run.
- A push to a method of another service. No other method named `receive` is on cb4.
- The eleventh subscription of a topic made by two calls at once: the count is read before the insert.
- More than 50 subscriptions due at one tick (`duePage`); a body near `bodyBytes` wrapped into a `failed`
  entry, which is not counted against `bodyBytes`.
- What a day of ticks costs: one `db.sql` a minute, which has no price in `brain-db.ojs`.
- The settings `subsPerTopic`, `pushMs` and `deliverMs` on cb4 (`config.set` is the owner's own session).
- The tests run together on the owner's page, and the page on cb4 with the new module: `brain.ts shell`
  is the orchestrating session's.

## Seen and left

The 403 of a refused probe reads "the core answered 403 to quota.get under that delegation: it is one
this caller made for brain-x-topic, with quota.get in its scope". The part after the colon is meant as
what the delegation must be, and reads as what it is. Changing it is a deploy; it is for task 3's writer,
who is in the same file.
