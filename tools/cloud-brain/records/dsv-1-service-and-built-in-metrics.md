# brain-x-dashboard: the service and the built-in metrics (`dsv-1-service-and-built-in-metrics`)

Task 1 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. The seed commit is `1ec0be30`, committed 19:25:42 +0200 (`git log --format=%ci`). A new
Worker and `major`: the owner approved the spec at event 1371 and answered "A" on this issue at
event 1401.

## What changed

Two files (`git diff --stat HEAD~1 HEAD` at the seed commit: `brain-dashboard.ojs` 324 lines added,
`build.ts` 3 changed).

- `tools/cloud-brain/brain-dashboard.ojs`, new. Module `@tomlarkworthy/brain-dashboard`, Worker
  `brain-x-dashboard`. Its first cell is the method reference.
- `tools/cloud-brain/build.ts`: one line in `MODULES` and the name in `OWNED`, as `7f67ac85` did
  for brain-git.

| cell | what it is |
|---|---|
| `metricDefinitions` | Four definitions: `core.calls` (brain-core, `at: "call"`, value `ms`, dims `worker`, `method`, `status` as a number), `deploys.confirmed`, `deploys.put-back`, `deploys.failed` (brain-deployer, counted, dim `target`). |
| `metricRules` | The two rules as text, as the spec gives them. The manifest and the reference both read this cell. |
| `metricAsk` | The query string as `{ since, until, by, where }`, or an error for a 400. |
| `metricBody` | Cloudflare's telemetry body for one ask, through `logsScope` of brain-logs with the definition's Worker named. |
| `metricSeries` | Cloudflare's `result` as rows `{ t, …dims, n, sum, max }`. |
| `dashboard_service` | `GET metric.list`, `GET metric.query`. Declares `cloudflare: ["Workers Observability Read"]`. |

`logsScope` and `logsScript` are imported from `@tomlarkworthy/brain-logs`, not written again. No
service's function reached a cell of another service before this one, as far as was read:
`grep -n "^import" tools/cloud-brain/brain-*.ojs` names three seeds that import from another
service's module, and the two looked at use it in their tests (`brain-library.ojs:347`,
`simulate(static_service, {})`; `brain-feed.ojs`, `coreRig` and `blueskyRig`). The third,
`brain-proxy.ojs:6`, is an example inside its `md` cell. The deployer
has a path for it (`brain-deployer.ojs:671`, "An import of another module is answered from this
apply first, then from the source of what is deployed"). The emitted Worker carries both cells:
`test_dashboard_declares_one_cloudflare_permission_and_keeps_nothing` reads `const logsScope = ` and
`const logsScript = ` in `parts[0].text`. A later change to `logsScope` in brain-logs changes what
this Worker distils to, and `redistil` would then read it as differing; that was not tried.

## What was decided here, and what the spec left to this task

- **No `rows`.** The spec says the service "uses `rows`". Nothing is kept in task 1, so the
  binding is not declared (`meta.resources` is `[]` in the test). The combination of `rows` and a
  Cloudflare token, which the spec calls untried, is still untried and is task 2's or 3's.
- **A member is answered 403 for every metric, and listed none.** The spec holds a member to
  `m.<their id>.…`. No member's metric exists until task 2, so the hold in the service is on any
  caller that is a DID. The method's rule already passes a DID for a name that starts `m.`; the
  service refuses it.
- **Callers that are neither the owner nor a DID** (a Worker, a stranger) are refused by the rule
  and not by the service. A `rule.put` by the owner that passes a Worker would give it every
  built-in metric. The spec names the tenant hold for members only; that reading was kept.
- **A parameter that is not a dimension is a 400**, as a filter as well as in `by`. The spec names
  `by=caller`; `caller=owner` would otherwise be dropped silently and the answer would look filtered.
- **No bound on the span's length.** The spec says a span older than 7 days answers what the logs
  have. What Cloudflare answers for one was not tried.
- **`sum` and `max` are `null` for a counted metric**, not 0.
- **Left out, by the spec's own split**: the cut to whole minutes, the 60 s of memory and `cost`
  (task 4); `metric.put` and `metric.delete` (task 2); dashboards (task 3).
- `metricSeries` does what `callsSeries` of the page does, for any dimensions. The page's cell is
  not touched here and is not imported: a service that imports the page's module would carry it.
  Task 6 moves Health onto this answer.

## Tests

Four `test_*` cells, on `simulate(dashboard_service, …)` with a stand-in for Cloudflare.

| test | requirement |
|---|---|
| `test_metric_query_sends_cloudflare_one_body_written_from_the_definition` | R1: the body for `deploys.confirmed` by `target`, whole; for `core.calls` by `worker,status` with two filters; with no span and no `by` |
| `test_metric_rules_give_a_token_the_deploy_counts_and_the_owners_tab_the_rest` | R3: the five callers of `brain-logs.ojs:313` against `core.calls`, `deploys.confirmed`, `m.x.y`, no `metric`, and `metric.list` |
| `test_metric_query_refuses_what_the_definition_does_not_name` | R3: `by=caller` and 11 other asks are 400; `metric.put` for the owner is 404; a DID is 403; none of it reaches Cloudflare |
| `test_dashboard_declares_one_cloudflare_permission_and_keeps_nothing` | the manifest, the token's binding, the imported cells in the Worker |

This is the first run of the spec's rule, which it says "was not run". With no `metric` the rule
passes the owner in a tab and refuses the other four, as the spec expected.

**No failing run before the change**: the task adds a service, and describes no defect. In its
place, one mutation of the seed, built to a scratch file and put back: the 400 for an unknown
parameter changed to `continue`, and the member's hold to `false`.

```
bun tools/lope-tests.ts <scratch>/mut.html --filter test_metric --timeout 60000
  ✗ test_metric_query_refuses_what_the_definition_does_not_name
      "?metric=core.calls&since=1791676800000&until=1791680400000&caller=owner",  - 400  + 200
Tests: 2 passed, 1 failed
```

**Step 7 of the brief could not be run as written.** `cloud-brain-dev/test.ts` reads the services
from `deploy/services.json`, and a Worker that is not on cb4 is not there (`--with` needs the
Worker's entry). The older runner was used, on the worktree's build:

```
bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_metric --timeout 60000
Tests: 3 passed, 0 failed, 0 timed out, 0 skipped, 3 total
bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_dashboard_declares --timeout 60000
Tests: 1 passed, 0 failed, 0 timed out, 0 skipped, 1 total
```

**In a browser**, the step-8 snippet of `agents/implementer.md` (each `test_*` of the module
imported into a side module), headless Chromium, three fresh tabs on the same build, `r=71001` to
`71003`:

```
[4,[]]   [4,[]]   [4,[]]
```

`verify-run.ts brain-x-dashboard --shell … --times 20` does not apply before a first deploy:

```
verify-run: the deployer of https://cb4.endpointservices.workers.dev has no module of brain-x-dashboard
```

So the three tabs stand in for it, as the brief says for a Worker that gives no verdict.

The record was emitted in the third tab: hash `d14fc1ce29288e40769376aeb83bb49b786203998af78cd9dc6dd59ed2a1d789`,
`meta.cloudflare` `["Workers Observability Read"]`, `meta.resources` `[]`, no `test_` in `parts[0].text`.

## Not tried

- Any call of `metric.query` or `metric.list` on cb4. No token names them: the spec leaves
  `brain.ts token loop-dashboard metric.query metric.list 'dashboard.*'` to the owner (his list,
  item 2). So nothing here shows a real answer of Cloudflare read by `metricSeries`; its shape in
  the tests is the page's fixture of 2026-10-09.
- The rule on cb4. It was run with `decide` in a test.
- An answer of Cloudflare with no `groupBys`. The test's shape for it (a row with a `value` and no
  `groups`) is a guess.
- Whether a `calculations` answer is sampled; a span that starts before the 7 days kept; a span of
  7 days.
- A member's call, on cb4 or through the kernel. The hold was run in `simulate` with
  `x-brain-caller` a DID.
- `redistil` after a change to `logsScope` in brain-logs.
- The tests run together on the owner's page, and the deployer's own run of them: a first version
  has no probation, as the spec reads `knowledge/changing-and-deploying-a-cloud-brain-worker.md` line 43.
