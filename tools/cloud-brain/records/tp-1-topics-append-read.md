# brain-x-topic: create, append, read, list, delete (`tp-1-topics-append-read`)

Task 1 of `plan/cloud-brain-topics-service.md`. Built 2026-10-12 by a writer of the issue loop, round 1.
The seed commit's author time is 03:52:36 +0200 (`git log --format=%ai`). A new Worker and `major`:
the owner approved the spec at event 3377, and the orchestrating session made the token `loop-topic`
(comment 3493).

## What changed

- `tools/cloud-brain/brain-topic.ojs`, new. Module `@tomlarkworthy/brain-topic`, Worker
  `brain-x-topic`. Its first cell is the method reference.
- `tools/cloud-brain/build.ts`: one line in `MODULES` and the name in `OWNED`.
- `tests/tools/topic-sql.test.ts`, new: the statements on a SQLite.
- `plan/cloud-brain-topics-service.md`: three sentences gain "(As built, …)".

| cell | what it is |
|---|---|
| `topicRule` | The rule of each of the five methods, as the spec gives it. |
| `topicLimits` | The name's pattern, the lengths, the defaults of the four settings, the hour between removals. |
| `topicSchema`, `topicSql` | Two tables, `topic_topics` and `topic_entries`, two indexes, 14 statements. |
| `topicOps` | The tables made once an instance; `tick`, the clock's removal. |
| `topicApp` | The five methods. |
| `topic_service` | `crons: ["* * * * *"]`, no `calls`, no secret, no Cloudflare permission. |
| `topicFakeSql`, `topicRig` | The stand-in for SQL in a page, and the callers of the tests. |

## What was decided here

**The `seq` is the topic's own count, not `MAX(seq) + 1`.** The spec names
`INSERT … SELECT COALESCE(MAX(seq), 0) + 1 … WHERE topic = ?` and a counter row as the way out "if
it does not" pass `brain-db`'s plan check. It passes. A scratch script gave each candidate's plan,
made with `EXPLAIN` on `bun:sqlite`, to `sqlNeeds` of the deployed `brain-db.js`:

```
maxAppend | data | r:topic_entries w:topic_entries
append    | data | r:topic_topics w:topic_entries
```

The counter was taken for another reason. The same task removes old entries by the clock, and when
every entry of a topic is gone `MAX(seq) + 1` is 1: a reader that kept `next: 3` asks `after=3`
and is never answered the new entry, and `(topic, 1)` names two different entries over time. So
`topic_topics.last` is the count, and an append is one batch of four statements (`byKey`, `append`,
`counted`, `byKey`): the insert takes `last + 1`, and `last` moves only when an entry with that
`seq` is there. `tests/tools/topic-sql.test.ts`, "no seq is used twice", holds it on a SQLite: three
appends, all removed, the next is `{ seq: 4 }`, and the spec's expression on the emptied table is
`{ seq: 1 }`. `last` is also what `topic.list` answers as `last`.

**Whether a key was kept is read, not counted.** `duplicate` is whether the first `byKey` of the
batch found a row, not `changes` of the `INSERT OR IGNORE`. What D1 reports as `changes` for an
ignored insert was not known when the seed was written, and the answer does not rest on it.

**What the spec left open**, with the side not taken:

- *A topic that is not there.* 404 to a caller who could create the name (the owner; a member under
  their own `m.<id>.`), and to anyone else the same 403 and message a refused rule answers. A 404 for
  all would tell one member which names another has (line 1 of the philosophy).
- *`topic.create` again.* By the creator or the owner it changes the rules and answers
  `created: false`; a rule left out stays as it is. The other reading, that a rule left out goes back
  to the default, would close a topic that a caller meant only to open further.
- *The rule alone decides an append and a read*, the creator's and the owner's too. The spec's threat
  table rests on it ("a topic of his that it must not reach gets a rule that reads `caller.session`").
- *The removal's pace.* The cron is each minute, as the spec has it for task 2's push. The removal
  runs on an instance's first tick and then when an hour has passed, held in the instance's memory:
  entries are kept 30 days, and each run is a `db.sql` call. Each minute was the other choice.
- *`topicsPerCreator`* is refused here (400), since `topic.create` is this task's; the spec has it in
  the row of the threat table that task 2's `subsPerTopic` is in.
- *No `xrpc`.* Nothing in task 1 calls another method. `meta.resources` is `["sql"]`.
- *No panel.* The module has no cell that draws a topic on the page.
- *A body over `bodyBytes`* is 400 `InvalidRequest`; the spec gives no status.

## Tests

Seven `test_*` cells on `simulate(topic_service, { sql })`, and five tests in
`tests/tools/topic-sql.test.ts`.

| test | requirement |
|---|---|
| `test_topic_append_is_kept_once_for_a_key_and_read_from_a_position` | R2, R3: three appends, the second key again answers `{ seq: 2, duplicate: true }` and writes nothing; `read?after=1` answers 2 and 3 and `next: 3`; `sender` and `hops` are the core's headers |
| `test_topic_rules_decide_who_appends_and_who_reads` | R1: an append and a read the rule refuses are 403; five rules that are no rule are 400 and change nothing; the creator changes a rule and the next call follows it; a rule that reads `caller.session` refuses a token of the owner's |
| `test_topic_member_has_names_of_their_own` | R7: a member creates `m.<their id>.x`, is refused another's prefix and `x`; another member's read, append, rule change and delete are 403; an absent name answers them the same; the owner creates nothing under `m.`; the third topic with `topicsPerCreator: 2` is 400 |
| `test_topic_delete_takes_the_entries_and_the_name_starts_again` | `topic.delete` |
| `test_topic_clock_removes_old_entries_and_no_seq_is_used_twice` | the removal by age and by count, the hour between two removals, the `seq` after every entry is gone |
| `test_topic_refuses_what_is_no_name_no_key_and_too_long_a_body` | 10 names, 5 keys, a body counted in bytes |
| `test_topic_declares_what_it_needs` | the manifest; the method's rule for six callers |

R7's "subscribe" of another member's topic is task 2's.

**The fake cannot see a statement's text.** `topicFakeSql` matches a statement by identity and
answers from JS. Four mutations of the seed, each built to a scratch file and put back
(`diff` of the seed against the kept copy printed nothing after):

```
== M1 the write rule not asked             2 of 7 cells fail (rules, member)       topic-sql 5 pass
== M2 INSERT OR REPLACE for OR IGNORE      7 of 7 cells pass                       topic-sql 2 fail
== M3 a member owns any name under m.      1 of 7 cells fail (member)              topic-sql 5 pass
== M4 seq from MAX(seq) + 1                7 of 7 cells pass                       topic-sql 3 fail
```

So the cells hold the service's rules, and the SQLite test holds the SQL: it runs 37 batches on a
SQLite and on the fake and compares each answer, and gives each statement's plan to `brain-db`'s
check. D1 plans with its own SQLite; the first run there is under "On cb4".

There is no failing run before the change: the task adds a service. M1 to M4 stand in for it.

**Counts**, each from a run after the last edit of the seed:

```
cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-topic
{"tests":7,"passed":7,"failed":[], "emitted":[{"cell":"topic_service","hash":"d61233bea3c6…207df6ad","bytes":252216}], "browser":"151.0.7922.34"}   (with --emit; the line is cut here)
cd $W && bun test ./tests/tools/topic-sql.test.ts
 5 pass
 0 fail
Ran 5 tests across 1 file.
cd $W && bun test ./tests/tools
 482 pass
 1 skip
 0 fail
Ran 483 tests across 53 files.
```

The one skip is `tests/tools/light-agent.test.ts:230`, which runs only with `AGENT_SH_WRITTEN_OVER`
set; no line `skipped: <file>` was printed.

Step 7 of the brief as written does not run for a Worker that is not on cb4:

```
cd cloud-brain-dev && bun test.ts brain-x-topic --with …/tp-1.js
--with takes a Worker of one module, or the module's name
```

`bun tools/lope-tests.ts <build> --filter test_topic` was used while writing (7 passed). And
`verify-run.ts brain-x-topic --shell <build> --times 1` answered `the deployer of
https://cb4.endpointservices.workers.dev has no module of brain-x-topic`, so three runs of
`tab-tests.ts` on one build stood in for the 20: 7 of 7 each (Chrome 151.0.7922.34), before the
rebase. The rebase brought in `brain-core.ojs`, `brain-issues.ojs` and `brain-ai.ojs`, none of which
this module is built from.

## On cb4

The apply, under the deploy lock (04:01:20 to 04:01:44 CEST, the lock's own times):

```
tp-1-topics-append-read-brain-x-topic.json 14020 ms [{"worker":"brain-x-topic","hash":"d61233bea3c6","state":"verified","version":"f7c2b766-27f2-43c1-9cce-bb54ee9bbadd","tests":7}]
```

`verified`: the deployer ran the 7 cells in the cluster's browser. `brain.ts redistil` then read
`brain-x-topic  same  d61233bea3c6`, and no line `differs` or `MOVED`.

The token checks of R2 and R3, with `brain.ts curl … --as loop-topic` from the main checkout,
04:03:54 CEST. The time after each is the wall time of the `brain.ts` process, start to end.

```
create check.one  -> {"topic":"check.one","creator":"owner","write":"caller.id == \"owner\"","read":"caller.id == \"owner\"","created":true} (745 ms)
append k1         -> {"seq":1,"duplicate":false} (304 ms)
append k2         -> {"seq":2,"duplicate":false} (262 ms)
append k3         -> {"seq":3,"duplicate":false} (279 ms)
append k2 again   -> {"seq":2,"duplicate":true} (254 ms)
read after=1      -> {"entries":[{"topic":"check.one","seq":2,"key":"k2","sender":"owner","at":1791770635774,"body":{"n":"k2"},"hops":0},
                      {"topic":"check.one","seq":3,"key":"k3","sender":"owner","at":1791770636050,"body":{"n":"k3"},"hops":0}],"next":3} (247 ms)
read after=3      -> {"entries":[],"next":3} (293 ms)
list              -> {"topics":[{"topic":"check.one", … "last":3,"created":1791770635188}]} (245 ms)
create check.one, write "caller.id =="  -> {"error":"InvalidRequest","message":"write: the rule does not parse: Unexpected token: EOF"}
append to check.none                    -> {"error":"NotFound","message":"no such topic"}
create m.0000000000.x                   -> {"error":"Forbidden","message":"a name under m. is created by its member"}
```

R2 is met as the spec writes it: `seq` 2 and 3 and `next: 3`. R3: the same key twice answers one
`seq`, the second with `duplicate: true`, and the read after it has `k2` once, with the first body.
These calls are the first run on D1 of the four schema statements and of `one`, `make`, `byKey`,
`append`, `counted`, `read` and `all`. The columns `key` and `sender` are in a table of the table
database. `rules` was run after, at 04:04:39 CEST: `topic.create` of `check.one` again with a `read`
rule answered `"created":false` with the new rule and the `write` rule as it was, and a read after
it answered `seq` 3.

The time of 20 appends and 20 reads, one after another, on a topic `check.time`, 04:04:03 CEST:

```
append n 20  min 233  median 265.5  max 1286 ms
read   n 20  min 208  median 240.5  max 264 ms
quota.get, for comparison: 188 ms (one call)
```

Each number has the start of a `bun` process and the token's check in it; `quota.get`, which reads
no table, took 188 ms the same way. `check.time` was then deleted with the token
(`{"deleted":true}`, and a read of it after answered `no such topic`), which ran `dropEntries` and
`drop` on D1. `check.one` is left, with its three entries and the `read` rule
`caller.id == "owner" || caller.kind == "worker"`, for the reviewer. Not run on D1 by any of this:
`mine` and `owned` (a member's), `old` and `over` (the clock's).

## Not tried

- **The clock on cb4.** The removal was run by a test that gives the tick. The Worker has the
  binding `CORE` and no other, so its tick on cb4 is Cloudflare's cron trigger alone
  (`brain-deployer.ojs:532`); the minute alarm of `cloudflare-iac.ojs:691` is armed only for a Worker
  with `ROWS`. A comment there says cron triggers "had run 0 times after 30 minutes" on 2026-10-05.
  `brain-x-snapshot` has a cron and no `ROWS` either, and opened `digest-2026-10-11` as
  `worker:brain-x-snapshot` at 06:48:18 UTC that day (its cron is `0 6 * * *`), so a cron has run a
  service there; this Worker's was not seen to. With the defaults nothing is removable for 30 days.
- A setting on cb4: `bodyBytes`, `keepDays`, `keepEntries`, `topicsPerCreator`. `config.set` is the
  owner's own session. Each was given to the simulated Worker in `x-brain-settings`. A removal reads
  the settings of the last call the instance answered; a changed setting and then a tick with no call
  between was not run.
- A member's call on cb4. `may` gives a member no `topic.*` until the owner's grant (the spec, his
  list, item 2). Every answer to a member above is from the cells, with `x-brain-caller` a DID.
- A Worker's call on cb4, and the deployer's or a stranger's (refused by the method's rule, which was
  run with `decide` in a cell).
- Two appends at the same moment on D1. On a SQLite a batch is one transaction and the test runs them
  one after another.
- Two `topic.create` of one new name at the same moment (the 409 path), and a member's fifty-first
  topic made by two calls at once, which the count read before the insert does not hold.
- A topic deleted between an append's rule and its write (the 404 after the batch).
- 10,000 entries in a topic, and the time of `topic.list` with many topics. It has no limit.
- The tests run together on the owner's page, and whether the page on cb4 boots the new module:
  `brain.ts shell` is the orchestrating session's.
