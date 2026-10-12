# Cloud Brain: the topic service, read, taken from and pushed to one kind of method

Spec of the feature `topics-service` on cb4's tracker. Written 2026-10-11, 22:40 to 23:08 CEST (the first writing ended 23:00, by the time of the file; the eight findings of the fresh review were answered by 23:08). Round 2, 23:15 CEST: the finding of review 2797 and its three notes are answered at the end, and the text they name is changed,
from the seeds at `lopecode-dev` `20dc75fa` and from what cb4 answered between 20:50 and 20:58 UTC
that day. Nothing here is built, and no method or cell named in "The design" was run. Names are
proposals. It takes the place of the proposal `plan/cloud-brain-topics.md` (2026-10-10) as what is
built from; where the two differ, this file says so.

## What was asked

Tom, 2026-10-10, as the proposal quotes him:

> how to do inter-agent communication, and signals in general. We have inbox but I don;t think it is multi tenancy. I think that concept needs to be upgraded to support reader/writer permissions, taking from it (its more like pubsub in that regard).

> maybe inboxes can have a webhook registered? So things can configure what is next?

> event driven push will be the long term direction.

> Failed delivery should go to a dead leatter queue which is another topic, or throw away (a configurable)

Tom, 2026-10-11, of the proposal's four "For Tom to decide", as the issue quotes him (event 2718):

> Call it topic. Support only one method for now. Yes we need the core to support switching if the delegation was setup in advance. Please file as approved

and of the fourth, who may create a topic (event 2719):

> Yes memebers

Everything else in the issue's body is the reading of the session that filed it, and is treated
here as a report.

## The reports gathered

`list?parent=topics-service` answered `{"issues":[]}`. What is gathered is the issue, its one
comment and the proposal.

| what | what it says | becomes |
|---|---|---|
| his words of 2026-10-10 | writers and readers by permission, taking, a webhook, push as the direction, a dead-letter topic or a drop | R1 to R6 |
| event 2718, "Call it topic" | the name | the service is `topic`, the Worker `brain-x-topic` |
| event 2718, "Support only one method for now" | read by the filer as: a push goes to a method named `NAME.receive` and to no other | R5. He can strike the reading: see his list, item 1 |
| event 2718, "the core to support switching if the delegation was setup in advance" | a push is the subscriber's call, under a delegation the subscriber made before | R4. **The core already does this** ("What exists today") |
| event 2719, "Yes memebers" | a member creates a topic | R7. It does not reach a member today without one more act of his (his list, item 2) |
| the proposal, order of work step 4 | the inbox as a topic | left out: "Not chosen" |
| `plan/cloud-brain-issues.md`, lines 135, 149, 241 | asks topics for `chained`, `keep` and `topic.read?seqs=` | left out: the tracker was built on a table of its own (the same file, line 454) and calls no topic |

The requirements. The numbering is the writer's.

- **R1, a topic is a named, ordered log** with a rule for who appends and a rule for who reads.
- **R2, read**: any reader follows a topic from a position the reader keeps.
- **R3, a key is kept once**: an append sent again writes nothing new.
- **R4, a push is the subscriber's call**: checked and charged as the one who subscribed, never as
  the one who appended, and made at the append, not a minute later.
- **R5, a push reaches a method named `NAME.receive`** that the subscriber's delegation names, and
  no other method.
- **R6, a push that fails is tried again, then goes to the topic the subscription names, or is
  dropped.** A chain of pushes ends.
- **R7, a member has topics of their own**, and cannot read, write, subscribe to or delete
  another's but by that topic's rules.
- **R8, take**: work handed to one of several takers, with a claim that ends.
- **R9, none of it deploys the kernel, the core, the database or the deployer.**

## What exists today

**No topic service.** 2026-10-11 20:53 UTC, with no account:

```
GET /xrpc/com.lopecode.brain.getInfo?worker=brain-x-topic   {"error":"NotFound","message":"brain-x-topic"}
ls tools/cloud-brain/brain-topic*                           no file
```

**The inbox** is as the proposal read it. `getInfo?worker=brain-x-inbox` the same minute: hash
`b3d15dd3dc87`, `inbox.append` `caller.kind in ["worker", "deployer", "owner"]`, the other six
methods the owner's or a Worker's. One log, one lease, no reader but the owner. Its four tests pass
as deployed (`bun test.ts brain-x-inbox` in the worktree's `cloud-brain-dev`: `passed 4, failed 0`).
How many entries it holds was not read: `inbox.list` is the owner's.

**The core change the proposal called step 2 is on cb4.** The proposal was written 2026-10-10
09:28 CEST; `plan/cloud-brain-authority.md` step 2 was deployed the same day at 11:13
(`spec-as-built.md` line 3582). The issue's body still lists it as waiting. Read 2026-10-11:

```
grep -c x-brain-as cloud-brain-dev/deploy/@tomlarkworthy/brain-core.js     12
bun test.ts brain-core      hash 716194d83bd1   passed 34   failed 0
  test_a_worker_calls_under_a_delegation_as_who_made_it_and_not_in_their_tab   passed, "12 calls heard"
```

What the core does with it, from `brain-core.ojs` at `20dc75fa`:

| | line |
|---|---|
| A Worker known by its key sends `x-brain-as: <delegation id>`; a member's Worker cannot | 378 |
| The row's holder must be that Worker, or 403 | 300 |
| The call is then by `from`, who made the delegation: the caller a rule reads, the account that pays, not their tab | 306 |
| It starts a chain of its own: the context of the call the Worker was answering is not read | 392 |
| `x-brain-hops: n` from the holder; the core signs `n + 1` and refuses `n >= 8` | 278, 302 |
| The core sends `x-brain-hops` in clear with each call it forwards | 662 |
| It is not held to the holder's `calls`; the delegation's scope is the bound | 277 |

So the proposal's hazard (a push inside `topic.append` is the appender's call) and its fix are
both settled in code that runs. **No Worker on cb4 has sent the header**: "Not run live: a call
with `x-brain-as`. No Worker on cb4 sends one; the first will be `brain-x-topic`"
(`spec-as-built.md` line 3637). Two things the authority design named are not built
(`spec-as-built.md`, the same step): a cell `xrpc.as`, so a holder sends the two headers with
`xrpc.fetch`; and a member's delegated calls are not counted in `mcalls`.

**A holder cannot read a delegation.** The core's doc cell says "A holder that takes a
delegation's id from a caller must check that the caller made it (`from`). An id is not a secret."
It does not say how. `delegation.list` is behind `delegating` (`brain-core.ojs:413`): a person's
own session, or a secret holder with the cap `delegate`. A Worker's key passes neither. This is
the one gap between the core as built and a push subscription, and "The design" closes it without
a change to the core.

**What a member may call.** `may` (`cloudflare-iac.ojs:1742`) lets a member call the 24 methods of
`MEMBER` (line 1738), any `com.lopecode.brain.m.…` method, and what the owner granted that DID.
`topic.*` is in none. `delegation.create` refuses a member a scope entry the member may not call
(`brain-core.ojs`, `delegation.create`, "may not call"). `MEMBER` is a cell of `cloudflare-iac`,
which the kernel's, the core's and the deployer's hashes cover.

**What storage costs**, from `tools/cloud-brain/rpc-performance.md` (cb4, 2026-10-08, p50): a
`sql.exec` read of one row 24 ms, an upsert 33 ms, each through the core and `brain-db`; a token
or a session adds 18 ms. `rows.list(prefix)` answers every row under the prefix and takes no
limit (`cloudflare-iac.ojs`, the wrapper's `list`). A read of the tracker, which keeps its events
in `sql`, took 0.32 to 0.40 s from this machine with a token (three calls of `issue.sync`,
2026-10-11 20:56 UTC).

**The clock** of a Worker ticks once a minute (`cloudflare-iac.ojs:677`). A service is handed
`waitUntil` (line 1200 for the simulated one).

**The four Workers the loop does not deploy**, as `cloud-brain-dev/deploy/services.json` had them
at 20:52 UTC: `brain` `18ab224bd54b`, `brain-core` `716194d83bd1`, `brain-db` `163647e04b63`,
`brain-deployer` `4a25dc92cc07`.

## Read

In the Brain first. `knowledge.search?semantic=true` answered 502 for every query at 20:50 UTC:
`ai.v1/embeddings answered 402 owner has made 2000 priced calls today, which is the most for one
day`. So the search by meaning was not made. The same eleven queries were sent without
`semantic`, which matches words:

| query | found, and used |
|---|---|
| `topic`, `pubsub`, `subscription`, `dead letter`, `webhook`, `at least once` | `doc:cloud-brain-topics` each time: the proposal. Read whole. |
| `topic`, `inbox`, `delegation` | `doc:cloud-brain-issues`: asks topics for three options; the tracker was built without them (line 454). Read by `grep topic`. |
| `delegation`, `topic` | `doc:cloud-brain-authority`: lines 318 to 395 and the threats table read. The design of the delegation a push runs under, and the rule "a subscription is two calls by the subscriber". |
| `inbox` | `module:tomlarkworthy:brain-inbox`: the seed read whole. Its key-once and its three tests' shape are reused; no code is copied. |
| `subscription` | `module:tomlarkworthy:cloudevents-explorer`: the title only. Not opened; the CloudEvents text was read at its source, below. |
| `queue`, `message` | `flow-queue`, `firestore-messaging` and others by title: none is a log on the Brain. Not used. |
| `x-brain-as` | 0 entries. The id search and the word search do not find a header's name. |

Outside. Each page was read through a summary that a small model made of it, on 2026-10-11, and
the quotes are that summary's; none was read in full by the writer.

| page | what it says | used for |
|---|---|---|
| Google Pub/Sub, `docs.cloud.google.com/pubsub/docs/push` | A push is acknowledged by 102, 200, 201, 202 or 204. "To send a negative acknowledgment for the message, return any other status code." Repeated failures start a push backoff of "100 milliseconds to 60 seconds" for the whole subscription. | A 2xx moves the position. One subscription waits as a whole while its head is retried. |
| Google Pub/Sub, `docs.cloud.google.com/pubsub/docs/handling-failures` | A dead-letter topic takes what a subscriber cannot acknowledge. Maximum delivery attempts: default 5, minimum 5, maximum 100. "The maximum number of delivery attempts is approximate". | The proposal's 5 tries was called a guess; it is Pub/Sub's default and minimum. A failed entry goes to a topic. |
| AWS SNS, `docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html` | "Amazon SNS considers all 5XX errors and 429 (too many requests sent) errors as retryable. … All other errors are considered as permanent failures and retries will not be attempted." Total retry time for HTTP/S at most 3,600 seconds. When the policy is exhausted the message is discarded "unless a dead-letter queue is attached to the subscription". | A 4xx that will not change is not tried again (R6). The drop with no `failed` topic is SNS's default. |
| CloudEvents 1.0.2, `github.com/cloudevents/spec` | Required: `id`, `source`, `specversion`, `type`. "Producers MUST ensure that `source` + `id` is unique for each distinct event." "Consumers MAY assume that Events with identical `source` and `id` are duplicates." | `key` kept once in a topic is that rule. The attribute names are not taken: see "Not chosen". |

The proposal's review left two things "not checked by anyone". The comparison with Pub/Sub and SNS
is checked as far as the table above. `key` as a column name against `db.sql`: the tracker's table
`issues_events` has a column `key` on cb4 (`brain-issues.ojs:266`), so the name passes. `sender` is
in no table today and is first tried by task 1. (As built, `tp-1-topics-append-read`, 2026-10-12: `topic_entries`
has the columns `key` and `sender`; what D1 answered is in the record.)

## The design

### One new Worker

`brain-x-topic`, module `@tomlarkworthy/brain-topic`, seed `tools/cloud-brain/brain-topic.ojs`, and two
lines of `tools/cloud-brain/build.ts`: the module's entry, and its name in `OWNED`, which the build
reads to cut the shell (as `brain-dashboard` was added, commit `6ddf9eb0`: the seed and those two
lines, no other file). It uses `sql`, `xrpc` and `config` (As built, `tp-1-topics-append-read`, 2026-10-12: `sql` and `config`;
nothing of task 1 calls another method, so `xrpc` is not declared until task 2; the record. As built, `tp-2-push-to-receive`, 2026-10-12: `xrpc` is declared.), declares no Cloudflare
permission and no secret, has `crons: ["* * * * *"]`, and lists no `calls`: every call it makes
to another method is under `x-brain-as`, which the core does not hold to that list, and `db.sql`
is implicit (`brain-core.ojs`, `IMPLICIT`). Its tables are `topic_*`, which `brain-db` gives a
Worker by its name.

`sql` and not `rows`, as the proposal has it: `topic.read?after=&limit=` is a range of one
topic's entries, and `rows.list` answers the whole prefix. The cost is in the tests: no SQL
engine runs in a page (`cloudflare-iac.ojs:1152`), so the seed carries a stand-in that answers its
own named statements, as `issuesFakeSql` (`brain-issues.ojs:1454`) and `knowledgeFakeSql` do. A
statement is first run by D1 at the check on cb4.

### A topic (R1, R7)

`topic.create { topic, write, read }` makes a row. `write` and `read` are CEL expressions over
`caller` and `origin`, the fields a method's rule reads (`callerOf`, `cloudflare-iac.ojs:1676`),
decided with `decide` (line 1779). One that does not parse is 400. Left out, each is
`caller.id == "<the creator>"`.

| caller | names it may create |
|---|---|
| the owner, or a token of his that names `topic.create` (its caller is `owner`) | `[a-z0-9][a-z0-9.-]{0,59}` that does not start `m.` |
| a member | `m.<their id>.NAME`, the id the core gives a member (`idOf`, `brain-core.ojs:491`) |
| a Worker, the deployer, anonymous | none |

The creator, and the owner, change the rules (`topic.create` again), list and delete. A member's
Worker calls as its author and so has its author's names. He "did not speak of tokens apart from
members" (event 2719): a token is the owner's call in the core as built, so it needs no case of
its own.

The method rule of every `topic.*` method is
`caller.kind in ["owner", "token", "did", "worker"]`: the topic's own rule is the decision, in the
service, as `brain-db` decides per table.

### Append and read (R2, R3)

| | |
|---|---|
| `topic.append` | `{ topic, key, body }` → `{ seq, duplicate }`. Needs `write`. `key` is 1 to 200 characters and is kept once for a topic: a second append with it answers the first `seq` and `duplicate: true`. `body` is JSON of at most `config.bodyBytes ?? 100000`. |
| `topic.read` | `?topic=&after=0&limit=50` → `{ entries, next }`, `limit` at most 200. Needs `read`. The caller keeps `next`. |
| `topic.list` | the topics the caller created; the owner, all. `{ topics: [{ topic, creator, write, read, last, created }] }` |
| `topic.delete` | `{ topic }`: the row, its entries, its subscriptions and claims. |

An entry is `{ topic, seq, key, sender, at, body, hops }`. `sender` is `x-brain-caller` as the
core sent it, and `hops` is `x-brain-hops` of the append. The `seq` is taken in the insert itself
(`INSERT … SELECT COALESCE(MAX(seq), 0) + 1 … WHERE topic = ?`, primary key `(topic, seq)`, unique
`(topic, key)`), so of two appends at once one writes after the other. Whether `brain-db`'s plan
check passes that statement is not tried; if it does not, the writer takes the `seq` from a
counter row in the same batch. (As built, `tp-1-topics-append-read`, 2026-10-12: the check of the deployed
`brain-db` passes the plan of that statement on a SQLite, and the counter was taken all the same, as
a column `last` of the topic's row: after the clock has removed every entry of a topic,
`MAX(seq) + 1` is 1 again and a reader's position is past it; the record.)

Entries are kept `config.keepDays ?? 30` days and `config.keepEntries ?? 10000` to a topic, and
removed by the clock. Both numbers are the proposal's guesses and are settings.

No wait in `topic.read`. The page polls every 30 s today.

### Push (R4, R5, R6)

A push subscription is two calls by the subscriber, as the authority design has it (`plan/cloud-brain-authority.md` line 331):

```
delegation.create { name, holder: { worker: "brain-x-topic" }, scope: ["<target>", "quota.get"] }   → { id }
topic.subscribe   { topic, name, target, delegation: id, params, failed }
```

`topic.subscribe` needs the topic's `read` rule, and with `failed` that topic's `write` rule.
(As built, `tp-2-push-to-receive`, 2026-10-12: a new subscription starts at the topic's `last`, so it is pushed what is appended after it;
sent again by its creator it takes the new target, delegation, params and `failed`, keeps its position and is tried
at once; a name another caller subscribed with is 403. Both rules are asked at the subscribe and not at each push;
the record.)
`target` is a method's name, whole or without `com.lopecode.brain.` as a token's list takes it
(`topic.receive`); the service writes it whole and it must then match
`^com\.lopecode\.brain\.[A-Za-z0-9]+(\.[A-Za-z0-9]+)*\.receive$`, the characters a delegation's
scope takes (`scoped`, `cloudflare-iac.ojs:1732`). That check is the service's:
the core does not hold a call under `x-brain-as` to the Worker's `calls` (`brain-core.ojs:277`), so a list of
`*.receive` there would bound nothing, and none is declared. The two bounds on where a push goes
are this check and the delegation's scope, which the core reads on every push.

**Whose delegation.** Before it keeps the subscription the service calls `quota.get` with
`x-brain-as: <id>`. The core answers that call for the delegation's `from`
(`brain-core.ojs:817`: `accountOf(origin)`, and the origin of a call under a delegation is its
maker). The service compares the `who` of the answer with its own caller and refuses the
subscription when they differ, or when the core refuses the call (the id is nobody's, another
Worker's, ended, or its scope has no `quota.get`). So one member cannot subscribe with another's
delegation. This is why the scope has `quota.get`. It is
untried: a call with `x-brain-as` has not been sent on cb4, and that `quota.get` answers
`who: "owner"` or the DID under one is read from the code. It is the first thing task 2 runs, on cb4
with `loop-topic` and a child delegation, before the rest of the task is written; a stand-in for the core in
`simulate` cannot settle it. (As built, `tp-2-push-to-receive`, 2026-10-12: run on cb4 at 07:08:50 CEST from a build with `topic.subscribe`
alone. Under the child delegation `quota.get` answered for `owner` and the subscribe was 200; under an id that is
nobody's, and under the token's own delegation, the core answered 403; the record.)

Not chosen for this: a method `delegation.get` for a holder, in the core. It is the direct way and
it is a deploy of the core, which the loop does not make; it would put push behind an act of his.
And a method of the topic service's own that echoes its caller, called under the delegation: it
makes the Worker call itself through the core, and gives nothing `quota.get` does not.

**The push.** After an append has answered, under `waitUntil`, and again at each tick of the
clock, the service takes each push subscription of the topic that is behind and not waiting, one
deliverer a subscription (a row update that only one caller wins). The deliverer reads the next
entry behind the position again after each one it has pushed, and stops when none is behind, the
head is waiting, or 20 s have gone; so an entry appended while it works, by its own target too, is
pushed by it and not by the next tick. For each entry in order:

```
xrpc.fetch("<target>?<params>", { method: "POST",
  headers: { "x-brain-as": <delegation>, "x-brain-hops": String(entry.hops), "content-type": "application/json" },
  body: JSON.stringify(entry) })
```

| answer | then |
|---|---|
| 2xx | the position moves to this `seq` |
| 5xx, 429, 402, no answer in 10 s (a race in the service against a timer: `xrpc.fetch` takes no `signal`, `cloudflare-iac.ojs:447`, so the call itself is not ended and its late answer is not read; as built, `tp-2-push-to-receive`, 2026-10-12, the 10 s is the setting `pushMs`) | a try. The subscription waits 1, 2, 4, 8 minutes, and after 5 tries the entry is given up |
| any other 4xx | given up at once (SNS's rule: it will not change by trying). 403 is what a revoked or ended delegation answers |
| `entry.hops >= 8` | given up with no call: the core would refuse it |

An entry given up moves the position. With `failed: "TOPIC"` on the subscription,
`{ topic, name, seq, entry, status, error, tries }` is appended to that topic, with `sender`
`worker:brain-x-topic` and the key `<topic>/<name>/<seq>`; with none it is dropped, and the
subscription's row counts it (`dropped`).

**The way to `failed` ends too.** The entry appended to a `failed` topic carries the `hops` of the
entry given up, plus one. An entry whose `hops` is 8 or more is never appended to a `failed`
topic: it is counted in `dropped`, whatever the subscription names. So a failure is one more link
of the chain it came from. A subscription on `F` with `failed: "F"` and a target that answers 403
writes `F` eight times for one append (`hops` 1 to 8) and stops, and two topics that name each
other as `failed` do the same between them. The rule is the same for an entry that fails by
`topic.done { failed }` or by five claims that ended. Not chosen: refusing a `failed` that is the
subscription's own topic at `topic.subscribe`. It does not see a route through a second topic, and
the count does. Delivery is at least once: a target that must not act
twice keeps the `seq` it has handled.

A subscription is delivered in order, so one entry being retried holds the ones behind it for up
to 15 minutes. Pub/Sub's push backoff holds a whole subscription the same way.

**A chain ends.** The target answers a push whose chain is `hops + 1` long; what it appends
carries that as `x-brain-hops` from the core (`brain-core.ojs:662`) and is stored with it. The ninth entry of
a chain is kept and read, and is not pushed. This needs nothing of the target and nothing new of
the core.

**`topic.receive`**, the one target this service has itself: `?topic=B`, body an entry. It
appends the pushed entry's `body` to `B` with the key `<from topic>/<seq>`, when the caller (the
subscriber) passes `B`'s `write` rule. It joins two topics, and it is what lets an agent of the
loop check a push on cb4, where no other method named `receive` exists.

`topic.subs?topic=` lists the caller's subscriptions (the owner: all) with `position`, `tries`,
`dropped` and the last error. `topic.unsubscribe { topic, name }`. (As built, `tp-2-push-to-receive`, 2026-10-12: the creator of a topic
also reads who is subscribed to it and to what target, and ends such a subscription, since the `read` rule is not
asked again at a push; the record.) A push does not reach an agent
in a tab or in a shell. They read or take.

### Take (R8)

`topic.subscribe { topic, name, seconds }` with no `target` is a subscription to take from.

| | |
|---|---|
| `topic.take` | `{ topic, name, limit }` → the next entries that are not claimed, or whose claim has ended, each claimed for `seconds` (300 when the subscription names none). |
| `topic.done` | `{ topic, name, seq, failed }`. With `failed`, or after 5 claims that ended unanswered, the entry goes where a failed push goes. |

Both are for the caller that made the subscription. Several agents that call with tokens of the
owner are one caller, `owner`, and share a subscription; a member's is the member's own.

### Who is kept from what (line 1 of the philosophy)

| threat | what holds it |
|---|---|
| A writer to a topic makes the subscriber's calls | The push reaches the one target, which the subscriber named and the delegation's scope names. The appender's context is not sent (`brain-core.ojs:392`). The body is the appender's: a `receive` method trusts `entry.sender` and nothing else in it. |
| A member subscribes with another's delegation | The `quota.get` probe at subscribe. Tested with the core stood in, and tried on cb4 in task 2. |
| A token of the owner subscribes with a delegation another of his tokens, or he, made for `brain-x-topic` | Nothing. Every token is `owner` to the core (`asSecret`, `brain-core.ojs:322`), so the probe passes, and a token that names `topic.subscribe` reaches a `receive` method its own list does not name, when he has made a delegation whose scope names it. What bounds it is which delegations he makes for this Worker, and which tokens he gives `topic.subscribe`. |
| A member reads or writes another's topic | Names under `m.<id>.` are made by that member only; the default rules name the creator; a rule that lets others in is the creator's own. |
| A subscriber points `topic.receive` at a topic it may not write | The append there is checked against that topic's `write` rule with the subscriber as caller. |
| A loop of pushes | `hops`, 8, for a push and for the way to `failed` alike ("The way to `failed` ends too"). The entries kept to a topic, 10,000. A member's 2,000 calls a day (`QUOTA`, `brain-core.ojs:247`) for what a member appends. |
| A wide chain: many subscriptions that push to each other | `hops` bounds the length of a chain and not its width. Two settings bound the width: `config.subsPerTopic ?? 10` subscriptions to a topic and `config.topicsPerCreator ?? 50` topics to a member (the owner has no such count); over either, `topic.subscribe` or `topic.create` is 400. Both numbers are guesses. What is left: one append can still cause up to 10 pushes a link over 8 links, and a member's pushes are not counted in `mcalls` (the core, "What exists today"). Nothing in this design counts them; `topic.subs` shows each subscription's position, and the owner deletes a topic. |
| A redeploy of `brain-x-topic` holds every subscriber's delegation | True, as the authority design says of it (`plan/cloud-brain-authority.md` line 493). The loop's `apply` is made with the recovery key and is not held by the deployer (`plan/cloud-brain-dashboard-service.md`, "One new Worker"), so a writer of the loop can do this. His approval of this spec accepts that for this Worker; what stands against it is review of each task. |

## Not chosen

- **Cloudflare Queues, a Durable Object for each topic, only widening the inbox's rules.** The
  proposal's reasons stand; nothing read since changes them.
- **The inbox as a topic** (the proposal's step 4). The inbox carries every conversation and has
  a lease the page depends on; the issue's title does not name it. It is a feature of its own
  when topics have run for some days. Until then the inbox has no member and no reader but him,
  which is what he said of it on 2026-10-10.
- **`chained`, `keep` and `read?seqs=`**, which the issues design asked of topics. Nothing calls
  them.
- **Any method as a target**, with a wider scope. His word is one kind for now.
- **A push from the clock alone**, up to 60 s late. He said no (the issue's body).
- **CloudEvents' attribute names** for an entry. An entry is read by methods of this Brain; `type`
  and `specversion` would be constants. `key` does the work of `source` + `id`.
- **Stopping a subscription whose delegation is refused**, to keep its entries until it is made
  again. More to build; a revoke is the subscriber's way to stop, and what is given up goes to
  `failed` when one is named.
- **Adding `topic.*` to `MEMBER`.** His list, item 2, choice B.

## How each requirement is known to be met

Three kinds of check. None needs the owner's session or his tab.

- **test**: a `test_*` cell of `brain-topic.ojs` on `simulate(topic_service, …)`. Run in the
  worktree with `cd cloud-brain-dev && bun test.ts brain-x-topic --with <the emitted .js>`. It
  cannot be run before task 1: no module `brain-topic` exists (`getInfo` above). It is run by each
  task's writer and again as deployed (`bun test.ts brain-x-topic`).
- **token**: a call on cb4 with `--as loop-topic` ("What the orchestrator makes"), on topics named
  `check.…`, from the main checkout. None can be run before task 1 is deployed; each is run by the
  writer of the task named, after its deploy, and its answer goes in the task's record.
- **read**: a command anyone runs. Each was run for this spec and its result is under "before".

| | check | before (2026-10-11) |
|---|---|---|
| R1 | test: an append by a caller the `write` rule refuses is 403, a read the `read` rule refuses is 403; a rule that does not parse is 400; the creator changes a rule and the next call follows it. | No topic. |
| R2 | token, task 1: `topic.create` of `check.one`, three appends, `topic.read?topic=check.one&after=1` answers `seq` 2 and 3 and `next: 3`. | |
| R3 | test, and token in task 1: the same `key` twice answers one `seq`, the second with `duplicate: true`; `topic.read` has one entry. | The inbox does this for its one log (`test_inbox_once_per_key_in_order`, passed). |
| R4 | test in `simulate(topic_service, { core })`, the core stood in by a function that answers a call with `x-brain-as` as `asHolder` does (the holder, then `from` as the caller). The real core is not in this test: its own test is in `brain-core.ojs`, which the loop does not change, and whether a seed can import the core's service for a test without carrying it into its Worker is not tried. The real core is met on cb4, in the token check below. The target hears `x-brain-caller` the subscriber, `x-brain-via delegation:<id>`, `x-brain-holder worker:brain-x-topic`, and no context of the appender. A subscribe with a delegation another account made is 403. | The core's own test passes; no Worker sends the header. |
| R4 | token, task 2: a child delegation made with `loop-topic` for `brain-x-topic`, scope `topic.receive` and `quota.get`; `check.a` pushed to `topic.receive?topic=check.b`; an append to `check.a`, then `topic.read` of `check.b` each second. The entry is there, and the seconds from the append's answer to the first read that has it, for 10 appends, are in the record: each is under 10 s, or R4 is not met (a tick is up to 60 s). The first call with `x-brain-as` on cb4. | Not run live (`spec-as-built.md` 3637). |
| R5 | test: `topic.subscribe` with target `com.lopecode.brain.browser.open`, `com.lopecode.brain.topic.append`, `com.lopecode.brain.m.0a.x.receiver` and `https://example.com/receive` is 400 each; `topic.receive` and `com.lopecode.brain.topic.receive` are kept as the one whole name. token, task 2: a subscription made with the second child, whose scope is `quota.get` alone, target `topic.receive`: the entry is given up at the first try with status 403 and is in the `failed` topic. | |
| R6 | test, the clock stood in: a target that answers 500 is called 5 times over the waits and the entry is then in the `failed` topic with `tries: 5`; with no `failed`, `dropped` is 1; a 400 is called once. token, task 2: `check.loop` pushed to `topic.receive?topic=check.loop`, one append: `topic.read` then has entries with `hops` 0 to 8 and no tenth, and the seconds from the append to the ninth are in the record (under 60 says no entry waited for a tick). test: a subscription on `f` with `failed: "f"` and a target that answers 403, one append: `f` then has 9 entries, `hops` 0 to 8, the subscription's `dropped` is 1, and a tick of the clock adds none; the same with `f` failing to `g` and `g` to `f`, 9 entries between them. test: the eleventh subscription to a topic is 400. | |
| R7 | test, callers as DIDs: a member creates `m.<their id>.x` and is refused `m.<another id>.x` and `x`; another member's read, append, subscribe and delete of it are 403 under the default rules. Not checked on cb4: a member there needs his grant (his list, item 2). | `may` gives a member no `topic.*`. |
| R8 | test: two takers of one subscription are handed different entries; a claim that ended is handed out again; the fifth ending sends the entry to `failed`. token, task 3: take 1 of 2 on `check.work`, `done`, take again answers the other. | |
| R9 | read, after each task: `cd cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev` and the hashes of `brain`, `brain-core`, `brain-db`, `brain-deployer` in `deploy/services.json`. `git diff --stat` of the task names no seed but `brain-topic.ojs` (tasks 1 to 3) and `cloud-brain-docs.ojs` (task 4). | `18ab224bd54b`, `716194d83bd1`, `163647e04b63`, `4a25dc92cc07`. A later deploy of one of them by him changes the value; the check is that no task of this project did. |

What only he can see: nothing here. What a member sees is checked by tests until he grants one.

## Tasks, in the order they land

Each is one writer and one review. Each writes `tools/cloud-brain/records/<its id>.md`.

A writer's brief stops at a new Worker and at a `major` change (`agents/implementer.md` step 3).
Task 1 is a new Worker, and tasks 1 to 3 are `major`: they add methods other callers use, and
task 2 makes calls as another account. His approval of this spec is his word for the new Worker,
as it was for `brain-x-dashboard`. The orchestrator opens tasks 1 to 3 with `major` and quotes the
approval event in a comment on each. A `major` task that passes review waits at
`awaiting-approval`, already deployed, for his `approve` (his list, item 3).

1. **`tp-1-topics-append-read`.** The seed, the service, the two lines of `build.ts`, the tables and
   their stand-in for tests, `topic.create`, `append`, `read`, `list`, `delete`, the two rules,
   the names, the clock's removal of old entries. The tests of R1, R3 and R7 (topics). Deploys
   `brain-x-topic`. Then the token checks of R2 and R3, and the time of 20 appends and 20 reads
   from this machine.
2. **`tp-2-push-to-receive`.** First the probe: `quota.get` under a delegation, on cb4, from a
   build of the service that has `topic.subscribe` and nothing else of this task. If it does not answer the maker, the writer stops and comments;
   the choice is then `delegation.get` in the core, which is his. Then `topic.subscribe`,
   `unsubscribe`, `subs`, the push at the append and by the clock, the tries, `failed`, `hops`,
   `topic.receive`. The tests and the token checks of R4, R5 and R6.
3. **`tp-3-take-and-done`.** `topic.take`, `topic.done`, claims. The checks of R8.
4. **`tp-4-docs`.** A line for the service in `cloud-brain-docs.ojs` and in
   `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`; the first `md` cell of the
   seed is the method reference and is written with each task. The proposal
   `plan/cloud-brain-topics.md` gets one line at its head that names this file and the tasks. Not
   `major`.

After task 2 his words of 2026-10-10 and 2026-10-11 are met for the owner and for tokens; task 3
adds taking. For a member they are met in tests until item 2 of his list.

## What the orchestrator makes

One token, when task 1 is next:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-topic 'topic.*' quota.get --delegate
```

- **Name** `loop-topic`. **Methods** `topic.*` and `quota.get`, and the cap `delegate`
  (`brain.ts` line 12, `--delegate`), so that the writer of task 2 makes the one child delegation
  the check of R4 needs: `delegation.create { name: "topic-check", holder: { worker: "brain-x-topic" }, scope: ["topic.receive", "quota.get"] }`,
  and a second for the check of R5, `topic-check-narrow`, the same but with scope `["quota.get"]`.
  A child reaches no more than its parent, has no caps and ends with it (`brain-core.ojs`,
  `stands`).
- **Needed by** tasks 1 to 3, for the token checks.
- **What holds it to its use.** Its calls are the owner's, so a topic whose rule is
  `caller.id == "owner"` lets it in, and with `delegate` it can make other children inside its two
  methods. Neither is refused by anything: it is an agreement that it is used through
  `brain.ts curl --as loop-topic`, on topics named `check.…`, and makes the two children named above.
  A topic of his that it must not reach gets a rule that reads `caller.session` or
  `caller.token`.

## What only the owner can do

For a reader with none of this: the Brain has one inbox, which only you read. This feature adds
topics: named logs that an agent, a Worker or a member appends to and reads by a rule, that work
is taken from, and that push each entry to a method of the Brain as the subscriber. You said to
call it `topic`, to support one method for now, that the core should switch the caller when the
delegation was set up in advance, and that members create topics. The core has done that switch
since 2026-10-10 11:13 CEST, so nothing below is a deploy of the core.

1. **Approve this spec, or send it back.** Approval is taken as your word for a new Worker,
   `brain-x-topic`, which holds each subscriber's delegation and which the loop deploys and can
   redeploy, and for the token `loop-topic` above with the cap `delegate`. Two readings in it are
   the writer's, and a word from you changes either:
   - "one method" is read as one kind of target, a method named `NAME.receive`. The service has
     one such method itself, `topic.receive`, which copies an entry to another topic.
   - a token is not a third kind of creator: it creates as you, in your names.
2. **Let a member in**, when you want one to use it. Until then R7 is tests only.
   - **A.** `grant.put` for that DID, in your session, of the eleven whole names: `topic.create`,
     `topic.append`, `topic.read`, `topic.list`, `topic.delete`, `topic.subscribe`,
     `topic.unsubscribe`, `topic.subs`, `topic.take`, `topic.done`, `topic.receive`. The last is
     what lets the member name `topic.receive` in a delegation's scope; a `receive` method of the
     member's own Worker (`m.<id>.NAME.receive`) needs no grant. For: no deploy, one member at
     a time, taken back by a `grant.put` without them. Against: once for each member.
   - **B.** Add them to `MEMBER` in `cloudflare-iac.ojs`. For: every member, at once. Against: it
     moves the kernel, the core and the deployer, which you deploy.
   - The writer takes A, by line 2 (the smaller side, easier to undo). Nothing is asked of you
     until a member wants it.
3. **Approve tasks 1 to 3**, each when it shows under "To approve" after its review, or say so of
   each to a session. By then it is deployed.

No task installs a policy, adds a rule or a secret, or deploys the kernel, the core, the database
or the deployer. If the probe of task 2 fails, a fourth item comes to you then: a read of a
delegation for its holder, in the core.

## The fresh review before submitting (2026-10-11)

One agent with the file and no other context (`/review-notebook`), 23:01 to 23:07 CEST: FIX, eight
findings and a note, each checked against the source and taken.

- The grant of item 2.A had ten names and no `topic.receive`: a granted member could not put the
  service's own target in a scope. Eleven now.
- `calls` listed `quota.get` for a call the core does not hold to `calls`. No `calls` now.
- "One line in `build.ts`": `6ddf9eb0` changed two (`OWNED`). Said.
- The token check of R5 needed a second child delegation that the token's agreement ruled out. Named.
- The time at the head ended after the file was written. Corrected from `stat`.
- The target's pattern took only whole names while the checks wrote `topic.receive`, and allowed a
  `-` that no scope takes. The service writes a short name whole; the pattern is `scoped`'s characters.
- A deliverer that worked from a list fixed at its start would push a chain one hop a minute. It
  reads again after each push; the check of R6 times the nine entries.
- "No answer in 10 s" had no mechanism. It is a race in the service; the call is not ended.
- Four bare line numbers now name their file.

Not reviewed by it, and so resting on this writer alone: the two events of the tracker, the test
runs' pass counts, the refused search, the four outside pages, and the timings of `issue.sync`.

## Review 2797, round 2 (2026-10-11)

Verdict `changes`, one finding and three notes. The round was resumed by the agent that wrote the
first. `git diff --stat 1fb1a9c5 b0312e36` over `brain-core.ojs`, `cloudflare-iac.ojs`, `build.ts`
and `brain.ts` prints nothing, so nothing the first round read has moved.

- **The way to `failed` had no end** (the finding). True as read: round 1 gave the appended entry
  no `hops`, and an entry at 8 went to `failed` again with no call. The rule is now under "Push":
  a failed entry carries the given-up entry's `hops` plus one, and one at 8 or more is counted in
  `dropped` and not appended. It is in the row "A loop of pushes", and R6 has a test for a
  subscription whose `failed` is its own topic and for two topics that name each other. Counted
  by hand for the first: `hops` 0 is appended by the caller, 1 to 8 by the service, and the entry
  at 8 is dropped; 9 entries. Not run: nothing is built.
- **Breadth** (note). Taken as two settings and a row in the threats table, which also says what
  they do not bound.
- **One token of the owner and another's delegation** (note). A row in the threats table.
- **R4 had no number to pass** (note). Each of the 10 is under 10 s.
