# brain-x-dashboard: a member's metrics (`dsv-2-member-metrics`)

Task 2 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. The seed commit's author time is 19:53:09 +0200 (`git log --format=%ai`). `major`: the owner's
word is his approval of the spec at event 1371, quoted on the issue at event 1404.

## What changed

One file, `tools/cloud-brain/brain-dashboard.ojs` (`git diff --stat HEAD~1 HEAD` at the seed
commit: 216 insertions, 30 deletions).

| cell | what it is |
|---|---|
| `metricRules` | `put` and `delete` added, both `caller.kind == "did"`, as the spec gives them. |
| `metricLimits` | `{ kept: 50 }`: how many metrics a member keeps. The number is the writer's; the spec names none. |
| `metricTenant` | Who a caller is to the service: `{ id: "" }` for `owner`, `{ id }` for a name that starts `did:` (10 hex of the SHA-256 of the DID, as `brain-git.ojs:67` and `memberId` of the deployer), `null` for anyone else. |
| `metricOwn` | The body of `metric.put` as the definition that is kept, or `{ status, error }`. |
| `metricAsk` | One condition added: `since >= 0`. |
| `dashboard_service` | `POST metric.put`, `POST metric.delete`; the tenant in `metric.list` and `metric.query`; `rows` beside the Cloudflare token. |

A member's definition is a row `metric/<name>` with the shape of a built-in one,
`{ name, worker, at, value, dims }`. The DID is not kept: the id is in the name.

## What the spec left to this task, and what was decided

- **No price**, on any method. The issue leaves it to the writer. A price is a number, and no cost
  of one `calculations` query was found to make it from: the spec's own reading is that Cloudflare
  prices Workers Logs by lines written and gives no price for a query after 2026-12-01
  ("Read", the pricing page). A declared number would be invented. Decided by line 2 of
  `philosophy.md` (the smaller side, easier to undo): the owner adds one with `price.put` and no
  deploy, since `priced` of `brain-core.ojs` reads `set ? set.price : rule.price`. That path was
  read and not run. What bounds a member today is the owner's grant of the method. The core's count of
  2000 calls a day (`brain-core.ojs:247`, `spend`) was found at two places: a call made by a member's
  Worker (`asAuthor`) and a call answered by one (line 1091). It was not found for a DID's own call of a granted method.
  The reference of the Worker says all of this under "No price".
- **One name everywhere.** `metric.put`, `metric.delete` and `metric.query` all take the whole
  name `m.ID.NAME`. A member reads their `ID` from `member.whoami` (`brain-core.ojs:497` answers
  `id`). Not chosen: a short `NAME` in `put` that the service prefixes, which gives a metric two
  spellings.
- **403 or 400.** A `name` that does not start `m.<their id>.`, or a `worker` that does not start
  `brain-m-<their id>-`, is 403, checked before anything else. A definition with their own name
  and Worker that is not well formed is 400. For `metric.query` a member is answered 403 for
  every name outside `m.<their id>.`, kept or not, so the answer does not say whether another
  member has a metric of that name.
- **The owner and a token write nothing** (403 in the service, and the rule refuses them). The
  owner in a tab reads a member's metric by `metric.query`: the rule passes `caller.session`, and
  he reads every line with `logs.query` already. A token is refused `m.` by the rule.
- **A caller that is neither `owner` nor a `did:` is 403 for every method, in the service.**
  dsv-1 left a Worker and a stranger to the rule alone (its record, "Callers that are neither",
  and a note of review 1502 quoted at event 1515). With rows of members in the service a
  `rule.put` that passed a Worker would have listed every member's definition. A narrowing, taken
  by line 1. A DID spelled `DID:` is such a caller now: refused, where dsv-1's hold passed it as
  not a member.
- **A kept row is checked again at the read.** `metric.query` answers 500, and does not ask
  Cloudflare, for a kept definition whose `worker` does not start `brain-m-<the id in its name>-`.
  No method writes such a row; the test puts one in the rig's rows.
- **`until` alone under an hour is 400** (`since >= 0`). The note of review 1502 at event 1515:
  it sent Cloudflare a negative `from`. Folded in here, one condition and two lines of a test,
  because the orchestrator put the note on this issue.
- **50 metrics a member.** A put of a new name when 50 are kept is 400; a kept name is written over.
- **A dimension's key is not `metric`, `since`, `until` or `by`**: a filter is a parameter named
  for the dimension, and one of those four could never be asked.
- Left out, by the spec's split: dashboards (task 3); minutes, the 60 s of memory and `cost` (task 4).

## Tests

Five `test_*` cells. One is new, three are changed, one is as it was.

| test | what changed |
|---|---|
| `test_a_member_keeps_and_reads_metrics_of_their_own_workers_and_no_others` | new: the metric half of R6 |
| `test_metric_rules_give_a_token_the_deploy_counts_and_the_owners_tab_the_rest` | four methods in `meta.access`; `put` and `delete` pass the member alone of the five callers; no method has a price |
| `test_metric_query_refuses_what_the_definition_does_not_name` | `metric.put` and `metric.delete` by the owner in a tab are 403 where they were 404, with a body over `brain-core`, and no row is written; `until=5` and `until=3599999` are 400 |
| `test_dashboard_declares_one_cloudflare_permission_and_its_rows` | renamed from `…_and_keeps_nothing`; `meta.resources` is `["rows"]`; the reference has the four rules and the limit |

**Before the change.** The new test and the rig's `member`, with the service as dsv-1 left it
(the worktree's build, `--with` over what cb4 ran, `9dfb05e93a08`):

```
cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/dsv-2.js
FAIL test_a_member_keeps_and_reads_metrics_of_their_own_workers_and_no_others    Expected: 403  Received: 404
"passed":4,"failed":1,"needsBrowser":0
```

**After**, the same command on the build of the seed commit:

```
"passed":5,"failed":0,"needsBrowser":0
```

**Five mutations of the seed**, each built to a scratch file, run with the same command, and put
back. Each failed the new test; the first failed a second test too.

| mutation | failed |
|---|---|
| a member's `metric.query` not held to `m.<their id>.` | 2 (`passed 3, failed 2`) |
| `metric.put` takes a `worker` that starts `brain-m-`, any id | 1 (`Expected: 403 Received: 200`) |
| a member's `metric.list` answers every member's rows | 1 |
| `metric.delete` not held to their own name | 1 (`Expected: 403 Received: 200`) |
| every caller that is not a DID is the owner | 1 |

**In a browser**, the step-8 snippet of `agents/implementer.md`, one headless tab, `r=72001`:

```
[5,[]]
```

**The deployer's run address, 20 times on the build** (Chrome 151 on this machine):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"at":"2026-10-11T17:56:44.723Z"}
```

Run twice; this is the second, and `grep -c '"tests":5,'` over its output is 20, one a run.

The record emitted in that tab: hash `4bc3ad7cfb30…`, `meta.resources` `["rows"]`,
`meta.cloudflare` `["Workers Observability Read"]`, four methods, a reference of 9376 characters,
no `test_` in `parts[0].text`.

## Not tried

- Any call of the four methods on cb4 by a member. No DID has a grant for them (the owner's list
  of the spec, item 3), so R6 on cb4 is the tests. The caller's name reaches the service in the
  tests as the header `x-brain-caller`; that the core sends a member's DID there for a granted
  method was not seen in a run.
- A call by a token on cb4: `loop-dashboard` is the owner's to make (his list, item 2).
- A real answer of Cloudflare for a member's Worker's lines. Whether a member's Worker's lines
  carry `at` and the fields a definition names is the member's to know; the service does not
  look. A definition over a Worker that does not exist is kept and counts nothing.
- `rows` beside a Cloudflare token before this apply: the spec calls the pair untried. The test
  reads `meta.resources`; the binding itself is first made by this deploy.
- `price.put` on `metric.query`, and which account it charges for a member.
- A query string that names a parameter twice: the core refuses it (`brain-core.ojs:1085`) before the service, which reads the first for `metric` in the hold and in the lookup alike.
- Two puts at once by one member at 49 kept: the count is read and then written, so both can
  land and 51 be kept.
- A member's Worker's call on cb4. Round 1 wrote here that it "is refused by the rule and by the
  service". That was false (review 1615): see round 2 below.
- The tests run together on the owner's page.

## Round 2, 2026-10-11 (review 1615, one finding)

The seed commit's author time is 20:13:35 +0200 (`git log --format=%ai`).

**The finding.** The reference said "A Worker, a member's Worker included, and a stranger are
answered 403 by every method", and this record said the same under "Not tried". Both were false.
The core sends a member's Worker's call on as its author's: `asAuthor` of `brain-core.ojs` sets
`who` to `{ caller: author, via: "worker:" + worker }` after checking the author's grant, and
`forward` writes `x-brain-caller` from `who.caller` and `x-brain-via` from `who.via`. The service
is given the DID. Round 1's test gave the name `worker:brain-m-<id>-todo` as `x-brain-caller`,
which the core does not send for a member's Worker, so its 403 said nothing of one.

**Decided: answered, as the member.** The reviewer left the choice to the writer. The service's
behaviour is not changed. By line 2 of `philosophy.md`, the smaller side: it is what the core
means by a member's Worker (its test is named `test_a_members_worker_calls_as_its_author_and_no_more`),
and what `brain-git.ojs` says of a member ("that account's Workers", line 29). The Worker reaches
its author's metrics and no other's, so nothing between members is opened (the reviewer's
reading too). `brain-blob.ojs:192` to 196 does the same: a DID whose `x-brain-via` names a Worker
`brain-m-<their id>-…` is answered as the member. It also refuses a DID whose `via` names any
other Worker. This service does not read `x-brain-via` at all, so a DID that arrives by another
Worker, a portal or a turn is the member here; which of those the core can send for these four
methods was not read. Refusing a member's own Worker would be one condition on `x-brain-via` in
the service; not chosen, since it is the larger change and nothing between members needs it.

**What it costs, said in the reference under "No price".** A member's Worker is called by whoever
its own rule lets in. With the grant, such a caller can make it send `metric.query`, each a logs
query on the owner's account, up to the author's calls for a day (2000 by default, counted in
`asAuthor`). That count was read in `brain-core.ojs` and not run.

**What changed.** `brain-dashboard.ojs`, 24 insertions and 5 deletions (`git show --stat` of the
seed commit).

- The reference: the sentence of "Who can call" now says a Worker of the Brain and a stranger
  are 403 and a member's Worker is answered as the member; "No price" says the paragraph above.
- `test_a_member_keeps_and_reads_metrics_of_their_own_workers_and_no_others`: a caller with
  `x-brain-caller` alice's DID and `x-brain-via: worker:brain-m-<alice>-todo`. Its `metric.put` is
  200, over the Worker `todo` and over another Worker of alice; `metric.list` is alice's two;
  `metric.query` of alice's is 200 with one body, script `cb4-m-<alice>-todo`; `metric.delete` of
  alice's is 200. Six asks are 403: a put under bob's name, a put over bob's Worker, a delete and
  a query of bob's metric, a query of `deploys.confirmed` and of `core.calls`. The comment on the
  `worker:` caller now says the core sends that name for a Worker of the Brain.
- `test_dashboard_declares_one_cloudflare_permission_and_its_rows` reads the new sentence in
  `source.reference` and the absence of the old one.

**Tests.** Five `test_*` cells, none added.

```
cd cloud-brain-dev && bun test.ts brain-x-dashboard                 (what cb4 ran, 4bc3ad7cfb30)   "passed":5,"failed":0,"needsBrowser":0
cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/dsv-2.js   "passed":5,"failed":0,"needsBrowser":0
```

The service's answers did not change, so no behaviour test fails on round 1's service. The one
assertion that does is the reference's: with round 1's sentence put back in a scratch build,

```
bun test.ts brain-x-dashboard --with <scratch>/mut.js
FAIL test_dashboard_declares_one_cloudflare_permission_and_its_rows   Expected value: "So a member's Worker is answered as the member is"
```

In a browser, the step-8 snippet, one headless tab, `r=72102`: `[5,[]]`.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"at":"2026-10-11T18:13:55.350Z"}
```

`grep -c '"tests":5,'` over its output: 20. The record emitted in that tab: hash `942bf844cbe8…`,
a reference of 10060 characters that holds the new sentence, no `test_` in `parts[0].text`.

**Not tried in round 2.** A member's Worker's call on cb4, or through the core in a rig: the
headers are the ones `forward` writes, read in its source, and the test gives them to the service
by hand. The count of 2000 a day. A DID with any other `x-brain-via` (another Worker, `portal:`,
`turn:`, `jwt`, a delegation). Everything under "Not tried" above still stands.
