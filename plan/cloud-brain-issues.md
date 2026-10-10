# Cloud Brain: issues, on topics

**Status, 2026-10-10 11:57 CEST.** The design below was amended by Tom the day it was written, and a
service was built from the amended design the same day: `brain-x-issues` on cb4. Read
[Amended 2026-10-10](#amended-2026-10-10) and [Built](#built) before the design: the state table, the
`major` field, `issue.split`, `issue.approve`, `issue.revert` and the topic are not what was built. The
design is kept as it was pasted into the session that built it, so that what changed can be seen.

A design, not built. Written 2026-10-10 by Claude (a cloud session holding a sign-in link of cb4) for Tom
to review. First draft; no reviewer has read it. It builds on two designs that are not built either:
`plan/cloud-brain-topics.md` (topics) and `plan/cloud-brain-authority.md` (delegations). Both were read
on 2026-10-10 from the knowledge base (`knowledge.get`, ids `doc:cloud-brain-topics` and
`doc:cloud-brain-authority`). The knowledge copy of the authority design ends at 16,000 characters,
inside "What this changes for a token made today", so its order of work, open decisions and review were
not read. Facts about cb4 were read on 2026-10-10 with `logs.query`, `infra.getState`, `getSource` and
`getInfo`, and are marked where used. Nothing here was run.

## What was asked

Tom, 2026-10-10:

- "each service should have a license so people can pick and choose on a per service basis. Ideally we
  have a issue/feedback service for leaving these."
- "everything needs to go through adversarial /security review, major decisions need owner approval.
  Large tasks split into subtasks and we need a state store to manage that kind of work, with
  attestation at each step so if something turns out badly we can reverse engineer the chain of events
  that caused it."
- "how would I browse the issue tracker? Each issue is a topic?"

Answers to four questions asked in the same session:

| question | answer |
|---|---|
| who may file | "wait until we have the delegated auth spec finalized" |
| attestation | signed chain only (no anchor outside the Brain) |
| who reviews | tracker only for now: the states and the records, nobody assigned |
| default licence | MIT |

## What exists today

- **One inbox** (`brain-x-inbox`): append by a Worker, the deployer or the owner; read by the owner.
  Its rows are already a log (`inbox/<id>`, `inboxseq`, `inboxkey/<key>`). Read from its source on cb4.
- **Topics**, proposed: a named, ordered log with a `write` and a `read` rule; `read`, `take` with a
  claim that ends, and `push` to `NAME.receive`. Entries `{ topic, seq, key, sender, at, body, hops }`,
  `sender` named by the core. Stored in D1 through `sql`. Kept "30 days or 10,000 to a topic, whichever
  is fewer" (both called guesses).
- **Delegations**, proposed: one record `delegation/<id>` with `from`, `holder` (secret, Worker or DID),
  `scope`, `caps` (`session`, `deploy`, `unattended`, `delegate`), `until`, `daily`, `parent`, `note`,
  `created`, `by`. A service is sent `x-brain-caller`, `x-brain-via` (`delegation:<id>` under one),
  `x-brain-tab` and `x-brain-holder`. The cap `session` makes a holder "the owner's own tab"; the guard
  of `delegation.create` refuses it and asks for the via `session` itself.
- **Workers Logs** keep 7 days on Workers Paid (brain-logs reference). The core writes one line a call
  with `ray caller via origin method worker status error ms price rule by`.
- **Licences**: none. No module on cb4 names one (searched every `getSource` text on 2026-10-10), and
  `llms.txt` does not say the Brain may be copied.

## The design

### Two things, kept apart

```
caller ──► brain-x-issues ──► topic "issues"   the record: append-only, chained, signed, kept
                 │                   │
                 │                   ▼
                 └──────────► the view            SQL tables, made from the record, rebuilt at will
                                     │
                    issue.list / issue.get, the page's Issues panel, agents
```

The **record** is what happened, in order, and is the only thing attested. The **view** is what is
true now, for browsing; it holds nothing the record does not, so it is never attested and can be
dropped and rebuilt (`issue.rebuild`).

An issue is **not** a topic. `topic.list` answers names; a title or a state would need each log read
again. One topic for every event of the tracker gives one order across issues ("what happened before
this went wrong", across issues) and one chain to check, where a topic an issue gives hundreds.

### The service

`brain-x-issues`, `cloudflare.Service("issues", …)`. Platform cells: `xrpc` (to append to and read the
topic), `sql` (the view), `secrets` (its signing key, below). It is the only writer of the topic
`issues`: the topic's `write` rule is `caller.id == "worker:brain-x-issues"`, so every event passes
through the service's state rules. Its `calls`: `topic.append`, `topic.read`, `topic.take`,
`topic.done` on the topic service.

### Methods

| method | who | does |
|---|---|---|
| `issue.open` | see *Who may file* | `{ title, body, about, kind, parent }`. `about` is a Worker name (`brain-x-bluesky`) or `brain`. `kind`: `bug`, `feedback`, `task`, `security`. Answers `{ id }`. |
| `issue.comment` | who may read the issue | `{ id, body }` |
| `issue.move` | per the state table | `{ id, to, reason, refs }` |
| `issue.split` | who may triage | `{ id, children: [{ title, body }] }`: subtasks, each an issue with `parent` |
| `issue.review` | not the implementer | `{ id, verdict: pass \| changes \| block, body, refs }` |
| `issue.approve` | the owner, present (below) | `{ id, reason }` |
| `issue.revert` | the owner | `{ id, reason, refs }`: a done issue was wrong; names what undoes it |
| `issue.list` | who may read | `?state=&about=&kind=&assignee=&parent=&awaiting=me&after=&limit=` |
| `issue.get` | who may read | `?id=`: the issue, its children and its timeline (its events in order) |
| `issue.verify` | anyone who may read the topic | walks the chain from `after`, answers the first break or `{ ok, head }` |
| `issue.key` | anyone | the public key that signs events |
| `issue.rebuild` | the owner | drops the view and makes it again from the record |

### An event

The body of one entry of the topic `issues`:

```
id          the issue
type        opened | commented | triaged | split | ready | claimed | submitted | reviewed
            | approved | closed | rejected | reverted | moved
from, to    states, when the event moves one
body        text, at most 20,000 characters
refs        [{ kind, value }]: deploy (worker, hash, version), source (module, hash), issue, log
            (ray, traceId), commit, url
by          { caller, via, tab, holder, delegation }: copied from the headers the core sent
            (x-brain-caller, -via, -tab, -holder) with this call
origin      the same four for the origin, from x-brain-origin-*
ray         the cf-ray of the call that made the event, as the core logs it
at          ms
prev        the hash of the entry before it in the topic
hash        sha256 of the canonical JSON of every field above (keys sorted, no whitespace)
sig         Ed25519 signature of hash, by the service's key
```

`by` and `origin` are copied into the event because the log lines they point at last 7 days and the
record is kept. A `ref` of kind `log` is a convenience while it lasts. The topic's own `sender` is
always `worker:brain-x-issues`; who acted is in `by`.

### The chain

- Each event names the hash of the entry before it in the topic, and is signed. Changing or removing an
  entry breaks every later `prev`; `issue.verify` names the first break.
- **The chain must be made where `seq` is taken.** Two calls appending at once would each read the same
  head and fork the chain. The topics design takes the next `seq` in one transaction; `prev` belongs in
  that transaction. So this design asks topics for a topic option `chained: true`: the topic service
  writes `prev` and `hash` in the append's transaction, and `brain-x-issues` signs what comes back and
  stores `sig` beside it (`sig/<seq>` in its view). The alternative, a lock row in the issues service as
  the deployer's `alone` does, holds every write of the tracker behind one row.
- **Signing key**: an Ed25519 key pair, the private key a secret of `brain-x-issues` (`ISSUES_SIGNING_KEY`;
  the deployer refuses only names starting `BRAIN_` or `CF_`, per the running-a-cloud-brain wiki). The
  public key is answered by `issue.key` and written in `llms.txt`, so anyone can check a copy of the
  record without a secret. HMAC was not chosen: checking it needs the key that makes it.
- **What it does not prove** (the answer "signed chain only" accepts this): whoever holds the key and the
  database can write a whole new chain. Anchoring the head outside the Brain is left out by Tom's answer.
- **A key change** is an event, `type: "key"`, with the new public key, signed by the old key.

### Kept

The topics design drops entries after 30 days or 10,000. The topic `issues` needs a topic option
`keep: "always"`, set at create by the owner only. Its size, from cb4's rates, is small: not measured.

### States

```
open ─► triaged ─► ready ─► in-progress ─► in-review ─┬─► done
  │        │                      ▲                    ├─► awaiting-approval ─► done
  └────────┴─► rejected           └──── changes ───────┘        (major only)
done ─► reverted
```

| move | who | the service checks |
|---|---|---|
| open → triaged, rejected | who may triage | `reason` |
| triaged → ready | who may triage | `major` is set, true or false; a parent with open children may not be `ready` |
| ready → in-progress | a taker of the topic `work` | the claim (below); the claimant is the **implementer** |
| in-progress → in-review | the implementer | at least one `ref` (a source hash, a deploy, a commit) |
| in-review → done | a reviewer | a `reviewed` event with `pass`, by someone not the implementer; not `major` |
| in-review → awaiting-approval | a reviewer | as above, and `major` |
| in-review → in-progress | a reviewer | a `reviewed` event with `changes` or `block` |
| awaiting-approval → done | the owner, present | see *Approval* |
| done → reverted | the owner | `reason`, and a `ref` to what undoes it |
| any → rejected | the owner | `reason` |

A parent goes to `in-review` only when every child is `done` or `rejected`. A `reverted` parent leaves
its children as they are; each is reverted on its own.

**Not the implementer.** The actor of an event is its holder when there is one (`delegation:<id>`),
else its principal. A reviewer's actor must differ from the implementer's. Two delegations of the
owner are two actors under this rule: see *For Tom to decide*.

**Review is recorded, not done.** Tom's answer: the tracker holds the states and the records; who
reviews is decided later. Any caller allowed `issue.review` may review.

### Approval

`issue.approve` is the owner's own act, and no holder of a delegation may do it, whatever its caps.
The guard, named `ownerPresent`:

```
x-brain-caller == "owner"  and  x-brain-via == "session"
```

Under the authority design a call under a delegation has the via `delegation:<id>`, so a holder with
the cap `session` does not pass. This is the guard of `delegation.create`, made a cell that any service
can use, and not `caller.session`, which a holder with the cap `session` passes.

**Today it cannot be built.** A sign-in link's token with `unattended` is passed to the core as
`owner` via `session` (authority design, row 7, K:508-510), so a service cannot tell it from Tom's tab.
On cb4 on 2026-10-10 there were three such tokens (authority design, "On cb4"), and this design was
written with one. `issue.approve` waits for the authority step that gives such a token its own via.

### Work for agents

When an issue becomes `ready`, the service appends `{ id, title, about, parent }` to the topic `work`.
An agent takes from a subscription of `work` (topics, `take`), and the service records `claimed` with
the claim's holder as the implementer. A claim that ends unanswered is handed out again and the
service records `moved` back to `ready`. A failed hand-off goes to the subscription's `failed` topic.

### Who may file and read

Left for the authority design, by Tom's answer. Until then: the owner, tokens and the Brain's Workers
may open, comment and read; nobody else. After it: `issue.open` and `issue.comment` are methods a
delegation names in its scope, and a DID's grant can name them for outside feedback.

**Security reports are not public.** An issue of kind `security` is read by the owner and by whoever
the owner names on it (`readers`), whoever may read other issues. Its events are still in the one
chain; their `body` is stored encrypted with a key of the service and `hash` covers the ciphertext, so
`issue.verify` works for anyone and the text does not leak. Not designed further here.

### Browsing

- **The Issues panel** on the Brain's page, as the inbox has `inboxPanel`: a table of `issue.list`,
  filtered by state, `about`, kind, assignee, and "awaiting my approval". One issue opens its fields,
  its children as a tree with their states rolled up, and its timeline: each event with who, under
  which delegation, its refs as links (a deploy to the deployer's page, a source hash to `getSource`).
- **Each service's own section** on the page shows its licence and "issues about this service"
  (`issue.list?about=brain-x-NAME`).
- **Agents** call `issue.list` and `issue.get` over XRPC; `llms.txt` lists them.

### The view

SQL in the Brain's D1, through `sql`:

```
issues(id, title, kind, about, state, major, parent, implementer, assignee, opened_at, updated_at, head_seq)
issue_events(id, seq)            the timeline: issue → its entries in the topic
sigs(seq, sig)                   until topics can keep it beside the entry
```

`issue.get` reads `issue_events` and then `topic.read` for those `seq`s. A read of entries by a list of
`seq` is not in the topics design (`topic.read` takes `after` and `limit`): this design asks for
`topic.read?seqs=`.

## Licences

Separate from the tracker, and small:

1. A `license` option on `cloudflare.Service` (SPDX id, `MIT` by default), carried into the service's
   metadata, `service.list`, `getInfo` and `llms.txt`. This touches `cloudflare-iac`, which was not read
   for this design.
2. An `md` line in each module: `Licence: MIT`, with a link to the licence text.
3. A section of `llms.txt`, "Run your own": that the Brain may be copied, under what licence, and the
   Clone form of the page.
4. Redeploys: every service. The kernel and the core go on probation for 10 minutes each.

A request about a licence is an issue with `about` the service and `kind: feedback`.

## Order of work

Each step after 1 needs the one before.

1. **Licences.** Needs nothing below.
2. **Topics, step 1**, with two options asked for here: `chained` and `keep`. And `topic.read?seqs=`.
3. **`brain-x-issues` without approval**: open, comment, split, move, review, list, get, verify, key,
   rebuild; the chain and the signatures; filing by the owner, tokens and Workers. `major` issues stop
   at `awaiting-approval`.
4. **The Issues panel.**
5. **Topics, step 3** (`take`, `done`): the topic `work` and claims.
6. **Authority**: the steps that give a delegation its own via. Then `ownerPresent` and `issue.approve`,
   and filing by delegations and grants.

## What was not chosen

- **A topic for each issue.** Browsing needs a view whichever way; hundreds of short chains are harder
  to check than one, and an order across issues is lost.
- **The inbox.** One log, one lease, no position per reader (the topics design's reason).
- **Rows** (`rows.put` of each issue). No order across keys, and an issue would be rewritten in place:
  what it was before is gone.
- **GitHub issues.** Outside the Brain's callers and delegations, so `by` could not name a delegation,
  and the record would be GitHub's.
- **An anchor of the head outside the Brain** (a record in Tom's atproto repo each day). Tom chose a
  signed chain only. It would stop a holder of the key and the database writing a new chain.

## For Tom to decide

- **Two delegations of the owner as two actors.** As written, an agent under delegation A may review the
  work of an agent under delegation B, though both act for the owner. The stricter rule: a reviewer must
  be a different principal, which with one owner means a member reviews or Tom does.
- **What makes an issue major.** As written, whoever triages sets it. A rule could set it: a `ref` to the
  kernel, the core or the deployer; a secret; a delegation; a price over a sum.
- **`chained` and `keep` in topics, or a lock row in the issues service.**
- **The name**: `issues`, `work`, or `tracker`.
- **Who may triage**: the owner only, or delegations that name `issue.move`.

## Not checked

- `cloudflare-iac`: the `sql` and `secrets` cells, `Service` options, and whether a `license` option is
  passed through. Not read.
- Ed25519 in Workers' WebCrypto: expected to work; not run on a Brain.
- The authority design past 16,000 characters.
- `plan/cloud-brain-backlog.md`: not in the knowledge base; whether any of this is already there.
- Sizes and costs: none measured.

## Review

None yet.

## Amended 2026-10-10

Three decisions by Tom, in the session that then built the service. His words are quoted as typed.

**1. Guards are data, not the tracker's code.**

> "I would have the workflow guards configurable externally rather than ridigle enforces in the tracker
> as stated. Mayeb the gaurds can be installed ridgidle but those we be cofnigurable and can be changed
> per issue type and perhaps dynamically as the work progresses."

So the state table above is not code. The tracker enforces whatever guards are installed; which guards
those are is a **policy**, a document installed by an event of the same record. A kind of issue names a
workflow; a workflow is states, moves and one CEL guard for each move and act. This fits a standing
rule, "All access control is CEL rules on methods. There is none anywhere else"
(`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`): the draft's table was access control
written in a service's code. Three of the five points under *For Tom to decide* (two delegations as two
actors, what makes an issue major, who may triage) became lines of the default policy.

**2. A swap the workflow lists needs no owner. Any other does.**

> "We want a label in triage to be asses and perhaps be moved to a very stingent workflow (secruity
> issue), but that would be a preparpoved move in the workflow? The ownser shoul dnot be need for that,
> anything else yes the owner should have to intervene, it should basically not happen except during
> upgrades."

A workflow lists the swaps it allows, each with a target workflow, a landing state and a guard. The
owner approved a listed swap when they installed the workflow that lists it. A swap that is not listed
needs the owner present; that is the upgrade case, and `issue.install` carries a `migrate` for it. The
tracker never compares two workflows for strictness.

**3. Build the service, with a simple front end.**

> "ok lets build the backend service! With a simple front end than Zero."

Said after a look at `https://bugs.rocicorp.dev/p/zero`, whose page is a 1,816-byte shell (fetched
2026-10-10) and draws from a copy kept in the browser. What the cluster gives a page for that: one
snapshot, the events after a `seq`, writes named by the caller's own key and id, and the policy as data
so the page can judge a move before it sends it.

## Built

`brain-x-issues`, module `@tomlarkworthy/brain-issues` (`tools/cloud-brain/brain-issues.ojs`), deployed
to cb4 2026-10-10 11:52 CEST and again 11:55 (`7539488939bc`). The method reference is the module's
first cells; what was measured and what went wrong is in `tools/cloud-brain/spec-as-built.md`, "Issues:
a signed record, and guards as data". Where the build left the design above:

| the design | built |
|---|---|
| the record is the topic `issues` | Topics are not built. The record is the table `issues_events`, through `sql`. `seq` is the table's key, so of two writers at one head one fails and writes after the other: the chain is made where `seq` is taken, without `chained` and without a lock row. |
| a state table in the service | a policy, installed by an event (amendment 1). The table is the cell `issuesDefaultPolicy`, installed as event 1 of an empty record. |
| `major`, a field set at triage | the label `major`. An issue without it is not major. |
| `issue.split`, `issue.approve`, `issue.revert` | not methods. A subtask is `issue.open` with `parent`; approval and revert are moves whose guard is `caller.present`. |
| `ownerPresent`: caller `owner`, via `session` | `caller.present`: that, and not `x-brain-tab: 0`. On cb4 a token's call arrives as `owner` via `delegation:<id>` with `tab: false`, so it is refused. A sign-in link's `unattended` token was not tried. |
| the actor is the holder | the actor is `delegation:<id>`. On cb4 every token's call carried the holder `secret`, so two tokens would have been one actor. |
| security bodies encrypted | not built. An issue its `read` guard refuses is answered as `{ id, kind, state, hidden }`, and a caller who may not read it does nothing to it (404). `readers` is not built: the default lets the owner present and the opener read. |
| `issue.list` with `assignee`, `awaiting=me` | `state`, `kind`, `about`, `parent`, `label`. |
| a key change is an event | not built. |
| `issue.verify` judges the record | the chain and the signatures, yes. With `guards=true` each event is judged again under the tracker's code as deployed now: an event names its workflow's hash and not the tracker's version. |
| licences; the topic `work` and claims; filing by members; a push channel | not built. |
