# Cloud Brain: topics, for messages between agents and Workers

A proposal, not built. Written 2026-10-10 09:28 CEST for Tom to review. Nothing here has been
measured on a Brain; each fact about the present code or about Cloudflare says where it was read.

## What was asked

Tom, 2026-10-10: "how to do inter-agent communication, and signals in general. We have inbox but I
don;t think it is multi tenancy. I think that concept needs to be upgraded to support reader/writer
permissions, taking from it (its more like pubsub in that regard)." Then: "maybe inboxes can have a
webhook registered? So things can configure what is next?" and "event driven push will be the long
term direction."

## The inbox today

Read from the manifest in `tools/cloud-brain/brain-inbox.ojs` (`inbox_service`) on 2026-10-10:

```
inbox.append   caller.kind in ["worker", "deployer", "owner"]
inbox.list     owner
inbox.done     owner
inbox.reply    owner
inbox.poll     owner
lease.take     owner
lease.get      workers
```

There is one inbox. A member or a token cannot append. `inbox.list` and `inbox.poll` are the owner's
(the service's own guard also passes a token or a DID the owner has given the method). One tab holds
one lease and is handed every entry. Its storage is already a log: `inbox/<id>`, `inboxseq`,
`inboxkey/<key>` (a key is kept once).

## Proposal

A new service, `topic` (`brain-x-topic`). A **topic** is a named, ordered log with a rule for who
appends and a rule for who reads. A **subscription** is a named reader of one topic with its own
position. There are three ways to read.

| way | who keeps the position | who gets an entry | for |
|---|---|---|---|
| read | the caller, as `after=<seq>` | every reader | an agent or a tab following a topic |
| take | the subscription, with a claim that ends | one taker of that subscription | work handed to one of several agents |
| push | the subscription | its target, a method of this Brain named `NAME.receive` | a Worker reacting |

This is the topic and subscription model of Google Pub/Sub and AWS SNS. A webhook is a push
subscription.

### Methods

| | |
|---|---|
| `topic.create` | `{ topic, write, read }`. `write` and `read` are rules in the expressions a method's rule uses. The creator may always change or delete it. |
| `topic.append` | `{ topic, key, body }` → `{ seq, duplicate }`. `key` is kept once, as the inbox does. The entry records `sender`, the caller the core named. |
| `topic.read` | `?topic=&after=&limit=` → `{ entries, next }`. |
| `topic.subscribe` | `{ topic, name, target, params, failed, seconds }`. With `target` (a `NAME.receive` method) it is a push subscription and `params` is the query sent with each push; without, one to take from. Needs the topic's `read` rule. |
| `topic.take` | `{ topic, name, limit }` → entries claimed for `seconds`. A claim that ends unanswered is handed out again. |
| `topic.done` | `{ topic, name, seq, failed }`. |
| `topic.list`, `topic.subs`, `topic.unsubscribe`, `topic.delete` | |

An entry is `{ topic, seq, key, sender, at, body, hops }`. A body is at most 100,000 bytes, the limit
`brain-db` has for a value.

### Push

The service calls each push subscription's target through the core, with the entry as the body and
the subscription's `params` as the query. The core checks the target's rule, charges its price and
writes its log line, as for any call. A 2xx answer moves the subscription's position. Anything else
is tried again with a growing wait, and after 5 tries (a guess) the entry is given up for that
subscription and the position moves. What happens to it is set on the subscription (Tom, 2026-10-10:
"Failed delivery should go to a dead leatter queue which is another topic, or throw away (a
configurable)"): with `failed: "TOPIC"` it is appended to that topic as `{ topic, name, seq, entry,
status, error, tries }`, and with no `failed` it is dropped. The subscriber must pass that topic's
`write` rule when subscribing. A topic of failures is a topic: it is read, taken from or pushed like
any other, and a push from it that fails goes where its own subscription says. Delivery is at least once; a target that must not act twice
keeps the `seq` it has handled.

**A target is a method named `NAME.receive`**, written to take an entry. Two reasons, both from the
core as it is:

- A Worker calls only the methods its service lists in `calls`, fixed when it is deployed
  (`brain-core.ojs:96`). `brain-x-topic` would list `com.lopecode.brain.*.receive`, as the inbox
  lists `com.lopecode.brain.*.send` for its channels. The other choice, `com.lopecode.brain.*`,
  gives one Worker reach to every method of the Brain, held back only by each target's rule.
- An existing method does not take an entry. `container.post` reads `?port=&path=` and finds the
  container from the caller's name; `browser.open` reads `url` from its body; both need bought time
  (`brain-container.ojs:21`, `:41`, `:47`; `brain-browser.ojs:645`). So a push cannot wake a
  container or a browser by naming those methods. Waking one is a `receive` method somebody writes,
  and it needs the subscriber's identity (below) to reach the subscriber's container.

A call to an outside URL is the same: a Worker with a `receive` method written for it. None exists;
`proxy.fetch` is for the owner's tab and takes `{ url, method, headers, body, secret }`, not an entry.

A push does not reach an agent in a tab or in a shell: neither has an address. They read or take.

### Whose call a push is

A push must run with the authority and the allowance of the one who subscribed, not of the one who
appended. Otherwise whoever may write to a topic makes calls they are not allowed to make.

The core as it is gives two choices, and neither is the subscriber:

```
a call a Worker makes while it answers one   origin = the origin of the call it answers  (brain-core.ojs:40)
a call a Worker makes by its own schedule    origin = the Worker, account worker:NAME    (brain-core.ojs:40, :83)
```

So a push made inside `topic.append` is the appender's call: checked and charged as the appender.
That is the hazard. A push made from the service's clock is the Worker's own: `worker:brain-x-topic`,
$0.10 a day by default. The clock ticks once a minute (`cloudflare-iac.ojs:676`), so such a push
lands up to 60 s after the append.

The fix is a change in the core: a way for `brain-x-topic` to start a call as a named subscriber, at
once. It is step 2 below because push is the direction (Tom) and a minute's wait is not it.

### Loops

A target appends to the topic it is subscribed to. Each entry carries `hops`, and an append with
`hops` over 8 (a guess) is refused. This holds only when the target passes on the `hops` of the entry
it was pushed: the signed context of a call holds origin, Worker and end time and nothing else
(`brain-core.ojs:156`). What stops a target that does not is the allowance of whoever pays, and the
5 tries. Carrying `hops` in the context is part of the core change.

## What was not chosen

**Cloudflare Queues.** Read on 2026-10-10 from `developers.cloudflare.com/queues/platform/limits/`
and `…/configuration/pull-consumers/`:

```
queues per account   10,000        message size     128 KB
retention            up to 14 days (paid; free plan 24 h)   retries   100
one consumer configuration at a time: push Worker, or HTTP pull (several pull clients share it)
pull needs an API token with Queues read and write
```

A queue hands each message to one consumer and keeps no position for a second reader, so it is the
"take" row above and not the other two. A Worker writes to a queue through a binding, which is fixed
when the Worker is deployed, or through the HTTP API with a Cloudflare token, which only the deployer
holds. So a topic made on demand would be a deploy or a token handed to a service. What a queue adds
is retries, a dead-letter queue and a throughput (5,000 messages a second) this Brain has no use for.

**A Durable Object for each topic.** It is made by name with no provisioning, keeps an ordered log,
and holds WebSockets, so it could wake a reader at once. It is more to build: a new resource kind in
the wrapper, which today writes Durable Objects for the deployer's rows and for containers only
(`cloudflare-iac.ojs`). Kept for the day a reader needs to be woken in under a second.

**Only widening the inbox's rules.** It gives writers and readers but one log, one lease and no
position per reader.

## Storage

SQL tables in the Brain's D1, through the `sql` cell: `entries(topic, seq, key, sender, at, body,
hops)`, `subs(topic, name, target, params, failed, owner, position, seconds)`, `claims(topic, name, seq, until,
tries)`. An append is one transaction that takes the next `seq` for the topic. Not measured: the
cost of an append in D1 rows, or how many appends a second one topic takes.

Entries are kept 30 days or 10,000 to a topic, whichever is fewer, and removed by the clock. Both
numbers are guesses.

## Order of work

1. `topic.create`, `append`, `read`, `list`, `delete`, with the two rules. A member's topic is named
   `m.<their id>.NAME`, as a member's method is.
2. The core change: `brain-x-topic` starts a call as a named subscriber, and the context carries
   `hops`. Then push subscriptions to `NAME.receive`, made by the owner or a member, pushed at the
   append and retried by the clock.
3. `take` and `done`.
4. The inbox as a topic: `inbox.append` writes to it, the page's lease is a take. Last, because the
   inbox works and carries every conversation.

Without step 2's core change, push can still be built for the owner alone, from the clock, up to 60 s
late and paid by `worker:brain-x-topic`. Not recommended: it is thrown away when the change lands.

A wait in `topic.read` (answer when an entry arrives, or after 25 s) is left out of 1. Reading every
30 s is what the page does now.

## For Tom to decide

- Who may create a topic: the owner only, or members and tokens too. The order above assumes members.
- The core change in step 2: a service that may start calls as another account is a new kind of
  trust in the core. The alternative is the 60 s push above.
- Targets as `NAME.receive` only, or any method (`com.lopecode.brain.*` in the service's `calls`).
- The name: `topic`, or keep `inbox` and call these inboxes.

## Review

2026-10-10, one fresh reviewer: BLOCK, 8 findings, all taken. The first draft said a push after an
append would run as the Worker; the core makes it the appender's. It offered `container.post` and
`browser.open` as targets that wake an agent; neither takes an entry. It did not name the service's
`calls` list. Not checked by anyone: the Pub/Sub and SNS comparison, and `sender`/`key` as column
names against `db.sql`.
