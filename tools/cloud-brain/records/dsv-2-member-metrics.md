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
- What a member's Worker (`worker:brain-m-…`, running as its author) would need to read its own
  metric: it is refused by the rule and by the service.
- The tests run together on the owner's page.
