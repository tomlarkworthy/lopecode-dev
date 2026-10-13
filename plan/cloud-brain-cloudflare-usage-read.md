# Cloud Brain: a read of the account's billable usage from Cloudflare, and a price on a stored write

Spec of the issue `cloudflare-usage-read` on cb4's tracker. Written 2026-10-11 from 22:40 CEST, changed after a fresh review at 22:58 CEST the same day, from the seeds at `lopecode-dev` `22de1b53` and from what cb4 answered that evening.
Nothing in "The design" is built. No call was made to Cloudflare's billing or analytics API: no
agent of the loop holds a Cloudflare token (see "What exists today"). Every statement about
Cloudflare's API is from a summary of its page made by a fetch tool, and is marked so in "Read".
Names are proposals.

## What was asked

Tom, 2026-10-11, to the orchestrating session, which filed the issue at 22:42 CEST (event 2695):

> I think we are not charging storage again quota. Can U See our real cloudflare usege for calibration?

He was offered two ways: he reads Cloudflare's billing page and pastes the figures, or a service
reads the usage with a permission the deployer mints. His answer:

> No we need 2, file that.

The rest of the issue's body is that session's reading and is treated here as a report.

## The reports gathered

`list?parent=cloudflare-usage-read` answers no parts. The issue is the one report. Its body lists
five things "for the spec to settle"; each is a row.

| what the body says | becomes |
|---|---|
| No read of the account's usage exists. Wanted: a service that reads what the account used. | R1 |
| Which permission group, and that it reads and cannot write. | R2 |
| What is read, and which products Cloudflare answers by Worker or database and which by account only. | R4, and "Not chosen" for the grain by Worker |
| Pass-through as `logs.query` is, or not; who may call it. | R3 |
| How a figure of the account becomes a price a member is charged: storage is by the month, the quota by the day. Storage has a limit in bytes and no price. | R5 |
| Whether it is a metric source of `dashboard-service`. | "Not chosen" |
| Beside `flow-metrics` and `run-cost-is-part-of-the-issue-model`. | Left out: neither reads Cloudflare, and neither changes with this. |

The requirements. The numbering is the writer's.

- **R1.** An agent of the loop reads, with a token, what the account was billed for: by product, the
  quantity used and its cost, for a billing period.
- **R2.** The Cloudflare permission the service holds reads and does not write, and is named.
- **R3.** Nothing a caller sends reaches Cloudflare but two dates. The owner and a token of his that
  names the method read it. A member, a Worker and a stranger do not.
- **R4.** What the answer holds for this account (which products, at what grain, how late) is written
  down from a real answer, with its date.
- **R5.** A write that stores bytes (`static.put`, `blob.upload`) has a price, taken from the
  figures of R4.

## What exists today

**Prices.** `grep -n "price:" tools/cloud-brain/*.ojs` at `22de1b53`, outside tests: `ai.run`,
`ai.v1/chat/completions`, `ai.v1/embeddings`, `browser.extend`, `container.extend`, `git.create`,
`git.token`, `shop.time`. None in `brain-static.ojs`, `brain-blob.ojs`, `brain-db.ojs`,
`brain-knowledge.ojs` or `brain-library.ojs`. The two writes of R5 are declared with no price:

```
brain-static.ojs:63   "com.lopecode.brain.static.put": { type: "procedure", who: "workers" },
brain-blob.ojs:75     "com.lopecode.brain.blob.upload": { type: "procedure", who: "workers" },
```

**The limit in bytes.** `brain-core.ojs:247`: `QUOTA = { calls: 2000, bytes: 20 * 1024 * 1024, workers: 3 }`.
The core sends it as `x-brain-quota-bytes` (line 669). `brain-static.ojs:195` to 197 refuses a put
that takes a person's files over it; `brain-blob.ojs:239` and 240 the same for blobs, counted apart.
A person at both limits keeps 40 MB.

**What a price can read.** A price is one CEL expression over `caller`, `origin` and `request`
(`brain-core.ojs:675`). `request.params` is "the query string as a map of strings"
(`cloudflare-iac.ojs:1636`). The size of a body is not in it. A charge is made in the core, for
one call, before the call is forwarded (`priced`, `brain-core.ojs:741`); a service cannot charge.

**The day's count of priced calls was used up while this was written.** A second limit beside the
dollars: `CHARGES = 2000` charges an account a day (`brain-core.ojs:683`, `fold`). At 20:44 UTC:

```
$ brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=cloudflare%20usage%20billing" --as loop-knowledge
{"error":"UpstreamFailed","message":"ai.v1/embeddings answered 402 owner has made 2000 priced calls today, which is the most for one day. The count is new at 00:00 UTC"} [502]
```

That is the issue `priced-calls-of-the-day-used-up` (triaged) and the feedback
`seen-priced-calls-day-limit-reached`. It bears on R5: each priced write is one more charge of
that count.

**No read of Cloudflare's usage.** `brain-deployer.ojs:245`:
`GROUPS = ["Workers Observability Read", "Workers AI Read", "Artifacts Write"]`. A service that
declares another group is refused (line 428). `grep -c '"Billing Read"' tools/cloud-brain/brain-deployer.ojs`
answers 0. The issue's body says the token of this checkout answered 401 at `/user/tokens/verify`;
this writer did not try it again.

**The deployer's own token works.** `running-a-cloud-brain.md:202` says it "ends on 2026-10-11 and
has every permission group of the account (read 2026-10-08)". `logs.deploys` with `loop-deploys`,
read 20:50 UTC on 2026-10-11 (519 lines, 1 query): the last upload was `brain-x-page` at 20:36:43
UTC, and `brain-x-dashboard`, which declares a group and so needs a mint, was first deployed at
17:29:56 UTC. So the token minted at 17:29 and uploaded at 20:36 on the day it was to end. Whether
it is the token of 2026-10-08 or a later one, when it ends, and whether it holds `Billing Read`,
were not read: `token.*` lines are not in `logs.deploys`, and the rows `token/WORKER` are the
deployer's.

**How a service calls Cloudflare.** `cloudflare-iac.ojs:992`: the `cloudflareApi` cell sends to
`https://api.cloudflare.com/client/v4/accounts/ACCOUNT` followed by the path the service gives,
with the minted token. An address outside `/accounts/ACCOUNT/` is not reached by it. This decides
between the two sources below.

**The model for a fixed read.** `brain-logs.ojs`: `logs.query` passes Cloudflare's body through and
is `allow: "caller.session"`; `logs.deploys` writes the query itself, takes two times from the
caller, answers a list of fields it names (`deployLine`), and is `allow: 'caller.id == "owner"'`
(lines 224 and 225). `test_logs_declares_one_cloudflare_permission_and_the_owners_session` (line
299) tests both rules against five callers with `decide`.

## Read

**The Brain's knowledge base.** `knowledge.search?semantic=true` was refused (the 502 above), so the
searches were by words, with `loop-knowledge`, 2026-10-11 20:44 UTC. No score is answered for a
search by words.

| searched | hits that bore on it | used |
|---|---|---|
| "cloudflare usage billing" | `doc:cloud-brain-dashboard-service`, `doc:cloud-brain-run-cost-is-part-of-the-issue-model` | The first, read to line 370: its "What the deployer can give a service", its `Account Analytics Read` for stage 2, and the shape of a spec that needs the deployer. The second counts an agent's tokens and reads nothing of Cloudflare. |
| "storage price quota bytes" | `module:tomlarkworthy:brain-ai`, `doc:calling-a-cloud-brain-from-this-checkout` | `brain-ai.ojs:269`: `price: "double(request.params.usd)"`, a price read from a parameter the caller declares. |
| "graphql analytics" | `doc:cloud-brain-dashboard-service` | Nothing more. |
| "permission group deployer mint" | the dashboard doc, `doc:working-with-cloud-brain-remote-lopecode-cluster` | The standing rule: "Only the deployer holds a Cloudflare token … A new permission is still his." |
| "cost D1 rows vectorize" | `web:cf-vectorize-limits`, `module:tomlarkworthy:cloudflare-iac` | Nothing. |
| "pricing metering tenant" | the dashboard doc, `module:tomlarkworthy:rate-estimation` | Nothing. |

Also read: `spec-as-built.md` from line 3232, "What a minted token reaches" (2026-10-09): each
group of `GROUPS` was minted alone as a scratch token, tried against other paths, and deleted. No
such run exists for `Billing Read`.

**Outside, 2026-10-11.** Each row was read as a summary made by a fetch tool, not as the page. No
address was called with a token.

| page | what the summary says | used |
|---|---|---|
| <https://blog.cloudflare.com/billable-usage-api/> (dated 2026-08-03 in the page's data) | `GET /accounts/ACCOUNT/billable-usage`, token permission "Billing Read", optional `from` and `to` as dates. Rows of one product and one charge period: `ServiceName`, `ConsumedQuantity`, `ConsumedUnit`, `PricingQuantity`, `ContractedCost`, `CumulatedContractedCost`, `ChargePeriodStart`, `ChargePeriodEnd`. "usage and cost data are updated daily". Self-serve accounts only. | The source of R1. |
| <https://developers.cloudflare.com/api/resources/billing/subresources/usage/methods/get_account_usage_v1/index.md> | Titled "Version 1, Alpha". With no parameters "the current billing period". A range "must include the subscription billing cycle anchor day, otherwise no usage data is returned". 27 fields a row, among them `BillingAccountName`, `InvoiceIssuerName`, `SubscriptionId`, `ZoneName`. No permission is named on it. | The fields kept and left out. |
| <https://developers.cloudflare.com/api/resources/billing/subresources/usage/index.md> | Three paths: `/billable-usage/info` (holds `billing_cycle_anchor_timestamp`), `/billable-usage`, and `/billable/usage` ("Version 2, Alpha, Restricted"). Each is listed twice, once marked deprecated. | The second read, for the anchor. |
| <https://developers.cloudflare.com/fundamentals/api/reference/permissions/> | `Billing Read`: "Grants read access to billing profile, subscriptions, and access to fetch invoices" and entitlements. `Account Analytics Read`: "Grants read access to account analytics". | R2, and why the path is fixed. |
| <https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/> | A table of products an account-owned token works with: Billing yes, Account Analytics yes. | The deployer mints account-owned tokens (`POST /accounts/ACCOUNT/tokens`, `brain-deployer.ojs:261`). |
| <https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/> and the D1, R2 and Durable Objects metrics pages | One address, `https://api.cloudflare.com/client/v4/graphql`, permission `Account Analytics Read`. `workersInvocationsAdaptive` by `scriptName`; `d1AnalyticsAdaptiveGroups` and `d1StorageAdaptiveGroups` by `databaseId`; `r2OperationsAdaptiveGroups` and `r2StorageAdaptiveGroups` by `bucketName`; four `durableObjects…` datasets. Counts, no cost. 31 days. No dataset was found named for Vectorize (its page answered 404), Workers AI, Browser Rendering, Containers or Artifacts. | "Not chosen". |
| <https://developers.cloudflare.com/workers/platform/pricing/>, <https://developers.cloudflare.com/r2/pricing/>, <https://developers.cloudflare.com/vectorize/platform/pricing/> | R2: $0.015 a GB-month after 10 GB, Class A $4.50 a million after 1 million. D1: $0.75 a GB-month after 5 GB, $1.00 a million rows written after 50 million. Workers: $0.30 a million requests after 10 million. Vectorize: $0.05 per 100 million stored dimensions after 10 million. | The arithmetic of R5. |

No literature was searched. The question is which of Cloudflare's two reads fits the Brain's rules.

## The design

### One new Worker, one method

`brain-x-usage`, module `@tomlarkworthy/brain-usage`, seed `tools/cloud-brain/brain-usage.ojs`. It
declares `cloudflare: ["Billing Read"]`, keeps no rows, and has one method:

```
GET usage.account                               the current billing period
GET usage.account?from=2026-09-05&to=2026-10-04 a range, which must hold the anchor day
```

```js
{ from, to,                 // as asked, or null
  anchor,                   // billing_cycle_anchor_timestamp of /billable-usage/info, and nothing else of that answer
  currency,                 // BillingCurrency of the first row
  rows: [{ service, family, unit, quantity, pricingUnit, pricingQuantity, cost, cumulatedCost, start, end }],
  total,                    // the sum of cost over the rows
  cloudflare: { status, ms, cached } }
```

A row is `ServiceName`, `ServiceFamilyName`, `ConsumedUnit`, `ConsumedQuantity`, `PricingUnit`,
`PricingQuantity`, `ContractedCost`, `CumulatedContractedCost`, `ChargePeriodStart`,
`ChargePeriodEnd`, renamed, and `currency` is `BillingCurrency`. The other 16 fields are left out, as `deployLine` leaves a member out:
the account's name, the invoice's issuer, the subscription's id and the names of the owner's zones
are no part of a usage figure.

- **Not a pass-through, and line 1 of the owner's seven is why** (`cloud-brain-dev/philosophy.md`: "Ensures secure from outsides and between members"). The standing rule is "No abstractions over
  Cloudflare's own API where a pass-through will do". Here it will not do: the token also reads the
  billing profile, the subscriptions and the invoices (the permissions page). So the two paths are
  constants of the service (`/billable-usage` and `/billable-usage/info`), the verb is GET, and a
  caller gives `from` and `to` only, each refused unless it matches `^\d{4}-\d{2}-\d{2}$`. That is
  `logs.deploys`, not `logs.query`.
- **The rule** is `caller.id == "owner"`: the owner, and a token of his that names the method. The
  figures are the whole account's, which holds more than this Brain (the account `endpointservices`
  has other Workers; how many was not counted). A member is not answered, and no grant is proposed.
- **An answer is kept in the Worker's memory for 600 s** under its two dates. Cloudflare updates the
  data daily (the launch post), so a newer answer than that is the same answer.
- **No price.** Cloudflare states none for the call, and the callers are the owner's.
- **When no token is bound** (the mint failed: `token.mint-failed`, tried again each tick of the
  deployer) the method answers 502 and says so. When Cloudflare refuses, its status and its
  `errors` are passed on, as `brain-logs` passes them.
  (As built, `cu-2-usage-service`, 2026-10-13: there is no 502 of the service's own. A service that
  reads `secrets.CF_TOKEN` declares a secret of that name in its manifest, so the call is sent as it
  is, Cloudflare's refusal is the answer, and the message of a 400, 401 or 403 names the line
  `token.mint-failed`. A refusal of `/billable-usage/info` alone leaves `anchor` null, and
  `cloudflare` has a fourth field, `info`, the status of that read; the record.)

### Why this source and not the analytics

Two reads exist. The billable usage is chosen because:

- It is what he asked for: what the account is billed, in dollars, with the quantity beside it. The
  analytics give counts, and the Brain would hold a list of Cloudflare's prices and included
  amounts to turn them into dollars, which goes out of date.
- It is under `/accounts/ACCOUNT/`, which `cloudflareApi` reaches as it is. The analytics are at
  `/client/v4/graphql`, which it does not: that is a change to the wrapper in `cloudflare-iac.ojs`,
  and so to every Worker's hash.
- It is one call for every product. The analytics are a dataset a product, with fields that are
  found by introspection with a token nobody of the loop has, and none was found for five of the
  products the issue names.

Against it, each untried: it is "Alpha"; it is by product and not by Worker; it is a day late; and
its permission reads more than usage. The last is met by the fixed path. The others are what task 2
finds out, and "Not chosen" says what reopens the analytics.

### The deployer gains one group

```
brain-deployer.ojs:245
- const GROUPS = ["Workers Observability Read", "Workers AI Read", "Artifacts Write"];
+ const GROUPS = ["Workers Observability Read", "Workers AI Read", "Artifacts Write", "Billing Read"];
```

Run in the worktree on 2026-10-11 between 22:45 and 22:50 CEST with that one line changed and then taken back
(`build.ts --out`, then `tab-tests.ts … @tomlarkworthy/brain-deployer`, Chrome 151, 25.5 s):

```
"tests":56,"passed":55,"failed":["test_a_cloudflare_permission_is_refused_off_the_list_and_outside_a_recipe … Expected: "…A service may declare: Workers Observability Read, Workers AI Read, Artifacts Write"
```

So the change is that line, the expected text of that test (line 1893), the comment above `GROUPS`,
the sentence of the first cell that lists the groups (line 69), and
`running-a-cloud-brain.md:201`, which says "Only `Workers Observability Read` and `Workers AI Read`
can be declared" and already lacks `Artifacts Write`. `mint` finds a group by its
name among those of account scope and throws `Cloudflare has no account permission group "Billing Read"`
when there is none (line 257): a wrong name fails at the mint, with that sentence.

This is the deployer, so it is the owner's (`rules.md`, Never), and so is a new permission
("A new permission … is still the owner's", philosophy, Clarifications, 2026-10-11). It is task 1
and is built by no writer of the loop. His approval of this spec is his word for the group and for
the new Worker; the deploy is still his hand.

### A price on a stored write (R5)

What 20 MB kept costs at Cloudflare's list prices, with the included amounts ignored (arithmetic
from the pricing pages above, not a bill):

```
R2   20 MB x $0.015 / GB-month  = $0.00029 a month   = $0.0000098 a day
D1   20 MB x $0.75  / GB-month  = $0.0146  a month   = $0.00049   a day
one R2 Class A operation (a put)                      = $0.0000045
one D1 row written                                    = $0.000001, which is the core's smallest unit (MICRO)
a member's allowance                                  = $0.10 a day (PRICING, brain-core.ojs:682)
```

A person's whole limit in R2 is a ten-thousandth of their day's allowance. The account is also
inside the included 10 GB unless it keeps more than that, which is not known until task 2. So the
figure is small, and the mechanism must cost less than it.

**Chosen: a flat price a write, declared in the two seeds.** `static.put` and `blob.upload` get
`price: "<usd>"`. The limit in bytes stays as it is and bounds what one price buys. The number is
not in this spec. Task 3 takes it from the answer of `usage.account`: the cost of the R2 rows of one
whole billing period (storage and Class A), divided by the Class A operations of that period, and
rounded up to a whole millionth of a dollar. Both numbers are the whole account's, every bucket
of it and not this Brain's alone, and Class A counts lists and the parts of a multipart upload as
well as puts: the quotient is the account's cost of one such operation, which is the nearest the
bill gives. When that cost is 0 (all inside the included amounts)
the price is 12 months of a 1 MB file at list price with one operation, $0.00018, and the record
says the bill gave nothing to divide. The owner changes either with `price.put` and no deploy.

This is the smaller side (line 2 of the seven, as that file reads it): two lines in two seeds the
loop deploys. It is undone with no deploy by `price.put` with the price `"0"`: a price of 0 is
forwarded with no charge (`brain-core.ojs:748` and 749). `price.delete` does not undo it: it
removes the owner's own price (line 812 to 814), and the declared one then stands. It does not charge by size and does not charge for time kept. "No refunds"
(standing rules) is kept: a delete gives nothing back.

**It waits for `priced-calls-of-the-day-used-up`.** A priced write is one of an account's 2000
charges a day, and that count ran out today on embeddings alone. Task 4 is not started until that
issue is closed, and its writer reads what it changed.

## Not chosen

- **He pastes the figures.** His words: "No we need 2".
- **The GraphQL analytics, `Account Analytics Read`.** By Worker, database and bucket, which the
  billable usage is not. Left out for the three reasons above. Reopen when task 2's record shows a
  product whose cost cannot be placed on a Worker by the Brain's own counts (`core.calls` by Worker
  and method, a service's own row counts). It is also the group stage 2 of `dashboard-service`
  needs, so one change of the deployer would then serve both.
- **`cloudflareApi.fetch("/../../graphql")`**, to reach the analytics with no change to the wrapper.
  It rests on how a URL is normalised, was not tried, and would let any service with a token leave
  `/accounts/ACCOUNT/`.
- **A pass-through, `usage.query`, for the owner's session.** Nothing asks for it, and no agent
  could read it. The owner has Cloudflare's own page.
- **Two more methods on `brain-x-logs` or `brain-x-dashboard`.** Either Worker's token would then
  read every log line and the billing profile. A Worker of its own holds one group.
- **A metric source of the dashboard service.** A metric there is a definition over log lines with a
  series of `{ t, n, sum, max }` (`plan/cloud-brain-dashboard-service.md`, "A metric"). A row here
  is a product and a day with a cost. Reopen when he wants cost drawn: `brain-x-dashboard` then
  calls `usage.account` (`calls`), and no token moves.
- **Rent by the day**, a cron that charges each account for the bytes it keeps. It is what storage
  costs in fact. A charge is written by the core alone, so it is a change to `brain-core`, the
  owner's deploy, for $0.0000098 a person a day at the limit.
- **A price by size**, `blob.upload?bytes=N` with `price: "double(request.params.bytes) * RATE"` and
  the service refusing a body of another size, as `ai.run?usd=` is priced. It changes the call of
  every writer (`put.sh`, the page, a member's Worker) for a difference of at most $0.00029.
- **A price on `knowledge.put`, `library.put` and the rows a service writes.** D1 is 50 times R2 a
  byte, and one row written is the smallest unit the core counts. Reopen from the D1 rows of task
  2's record.
- **Keeping each day's answer in rows**, for a history past what Cloudflare answers. How far back a
  range goes is not known. Reopen from the record.

## How each requirement is known to be met

No check that calls cb4 can be run before task 1, the owner's, and none was. Each says where it is
run then. The two that could be run were, on 2026-10-11.

| | check | result |
|---|---|---|
| R2 | `grep -c '"Billing Read"' tools/cloud-brain/brain-deployer.ojs` | 0 today (run). 1 with the edit of "The deployer gains one group" (run in the worktree, then taken back). |
| R2 | `bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-deployer` with that edit alone | 56 tests, 55 passed (run). With the test's text changed too it is the owner's task, not run. |
| R2, R3 | In the seed, a test with `simulate` and a stand-in for Cloudflare that records each request: over a call with no dates, with two dates, and with `from=../tokens`, every request recorded is a GET of `/billable-usage` or `/billable-usage/info`, and the third is answered 400 with nothing sent. | Not run: there is no seed. Run by task 2's writer in the worktree, `tab-tests.ts <build> @tomlarkworthy/brain-usage`; the count is in its record. |
| R3 | In the seed, the five callers of `brain-logs.ojs:313` against the method's rule with `decide`: `[true, true, false, false, false]`. And the manifest: `meta.cloudflare` is `["Billing Read"]`, `meta.resources` is `[]`. | Not run, as above. |
| R3 | A row of the answer has the ten names of "One new Worker" and no other, tested against a stand-in row that holds all 27 fields. | Not run, as above. |
| R1 | `BRAIN_BASE=cb4 bun <root>/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.usage.account" --as loop-usage`: 200, `rows` not empty, `total` a number. | Not run: no Worker, no token. Run by task 2's writer after its apply and by its reviewer. If it is not 200, see task 2. |
| R3 | The same call with `--as loop-knowledge`: 403 from the kernel, "this token does not name". That shows the token's scope, not the rule; the rule is the `decide` test. | Not run. Run by task 2's writer. |
| R4 | `tools/cloud-brain/cloudflare-usage.md` exists and quotes one whole answer with its time. The reviewer calls `usage.account` with `loop-usage` for the same range and compares three rows. | Not run. Task 3. |
| R5 | In each of the two seeds, a test that `meta.access["com.lopecode.brain.static.put"].price` (and `blob.upload`) is the text the record of task 3 gives. | Not run. Task 4's writer, `tab-tests.ts` on each module. |

What only the owner can measure is in his list (item 4) and is no condition of a task landing.

## Tasks, in the order they land

1. **`cu-1-deployer-gains-billing-read`, the owner's.** The edit of "The deployer gains one
   group" with its test and two sentences, and the deploy of the deployer. Built by no writer of
   the loop; kept open with `needs-owner` and a comment in the form the philosophy asks, once this
   spec is approved. Done when `getSource?worker=brain-deployer` holds `"Billing Read"`.
2. **`cu-2-usage-service`.** The seed `brain-usage.ojs` with the method and the tests of the table,
   its place in the build, its reference as the first cell, the apply, and a record
   `tools/cloud-brain/records/cu-2-usage-service.md` with the first answer of cb4. Waits for task 1
   and for the token `loop-usage`. The loop deploys it: the clarification of 2026-10-11 asks for "a
   multi tenant interface", and here no tenant but the owner is answered at all.
   The first call settles what this spec could not, and the record says which held: that the group
   is named `Billing Read` at account scope; that an account-owned token is answered; that this
   account has data (self-serve); what `ConsumedQuantity` is for usage inside an included amount; and whether the ten kept fields
   tell an R2 storage row from an R2 Class A row. If they do not, `ChargeDescription` is kept as an
   eleventh, in this task, and the record says so.
   **If the mint fails or Cloudflare refuses the token**, the writer does not try another path or
   group: it comments with Cloudflare's answer, and the issue goes back to this spec for a round.
3. **`cu-3-figures-and-the-price`.** Reads one whole billing period (a range that holds the anchor)
   and writes `tools/cloud-brain/cloudflare-usage.md`: the rows by product with quantity and cost,
   the total, how late the newest row is, and beside each product the Brain's own price where there
   is one (`ai.run` beside Workers AI, `browser.extend` beside Browser Rendering,
   `container.extend` beside Containers, `git.create` beside Artifacts). It gives the price of R5
   by the rule of "A price on a stored write", with the division shown. It adds one line for
   `usage.account` to `knowledge/calling-a-cloud-brain-from-this-checkout.md`. No seed changes.
   (As built, 2026-10-13: the period read is 2026-08-19 to 2026-09-19, 475 rows, every `cost` 0, so the bill
   gave nothing to divide and the price for task 4 is `price: "0.00018"`. The whole answer is not quoted in the
   file: it is kept beside it, `tools/cloud-brain/cloudflare-usage/2026-08-19_2026-09-19.json`, the file's tables
   are printed from it by `tools/cloud-brain/cloudflare-usage.ts`, and four of its rows are quoted for the
   comparison of R4. The Brain's prices are beside the products of the period under way, which is the one that
   has them. The record is `tools/cloud-brain/records/cu-3-figures-and-the-price.md`.)
4. **`cu-4-price-on-a-stored-write`.** `price` on `static.put` and `blob.upload` with the number of
   task 3, the two tests, the sentence in each seed's reference, the two applies. Waits for task 3
   and for `priced-calls-of-the-day-used-up` to be closed.

## What only the owner can do

1. **Approve this spec.** That is his word for a new permission group in the deployer
   (`Billing Read`), for a new Worker (`brain-x-usage`), and for the token under "What the
   orchestrator makes".
2. **Task 1**: the deployer's change and its deploy.
3. **The deployer's own Cloudflare token holds `Billing Read`** ("each group it hands out",
   `brain-deployer.ojs:71`). Nothing to do if it is still the token of 2026-10-08, which had every
   group. If the first apply of task 2 leaves `token.mint-failed`, the token he makes next names
   `Billing Read` beside what it has. That token was also to end on 2026-10-11 and was working at
   20:36 UTC that day; when it ends was not read.
4. **After task 4**, on his page: a put of a file shows its price in the day's spend under Quota.
   No token of the loop reads `quota.list`.

Not asked of him: what else a token with `Billing Read` reaches. The run of 2026-10-09 for the
other groups needed a token that mints, and this checkout's has ended. The service sends two paths.

## What the orchestrator makes

| token | methods | command | for | what holds it to its use |
|---|---|---|---|---|
| `loop-usage` | `usage.account` | `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-usage usage.account` | task 2 (its checks), then tasks 3 and 4 and any agent that calibrates a price | Nothing more is needed: it names the one read, and that read answers the ten fields and no billing profile. |

Made when task 2 is next, after task 1 is done. Whether `token.create` takes a method that no
Worker declares yet was not traced: if it refuses, the token is made after task 2's apply, on the
writer's comment, and the two checks on cb4 are run then.
