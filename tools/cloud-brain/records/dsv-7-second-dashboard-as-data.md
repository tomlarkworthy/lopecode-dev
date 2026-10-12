# A second dashboard on cb4, put as data (`dsv-7-second-dashboard-as-data`)

Task 7 of `plan/cloud-brain-dashboard-service.md`, the check of R4. Done 2026-10-12 by a writer of
the issue loop, round 1. Every call below was made with `brain.ts curl … --as loop-dashboard` from
the main checkout, and every time is this machine's `date -u` printed beside the call.

## What changed

One row on cb4: `dashboard/deploys` of `brain-x-dashboard`. No seed changed and nothing was
deployed. The commit of this task holds this file and two "(As built …)" notes in the spec.

The body sent is the spec's example ("A dashboard"), as it stands there:

```json
{"name":"deploys","title":"Deploys","panels":[
  {"title":"Confirmed, by Worker","metric":"deploys.confirmed","by":["target"],"draw":"bars"},
  {"title":"Put back","metric":"deploys.put-back","by":["target"],"draw":"table"}]}
```

## The check of R4

2026-10-12, 00:47:51 to 00:47:53 UTC, in this order:

| call | answer |
|---|---|
| `dashboard.get?name=deploys` | 404 `no dashboard deploys is kept: dashboard.list names them` |
| `dashboard.list` | 200 `{"dashboards":[{"name":"health","title":"Health"}]}` |
| `POST dashboard.put`, the body above | 200, the dashboard as kept: each panel gained `"filter":{}` |
| `dashboard.get?name=deploys` | 200, the same text as the put's answer: `name`, `title`, 2 panels |
| `dashboard.list` | 200 `{"dashboards":[{"name":"health","title":"Health"},{"name":"deploys","title":"Deploys"}]}` |
| `POST dashboard.put`, the same body again | 200, the same text |
| `dashboard.get?name=deploys` | 200, the same text |
| `dashboard.list` | 200, the same two names, each once |

The count of the task, as the spec gives it ("its count is what `dashboard.get` answers"): **2
panels of 2 put**, and `dashboard.list` names 2 dashboards where it named 1.

**No deploy between.** `deploy/services.json` of the worktree's `cloud-brain-dev` is what
`sync.ts` reads from cb4: a line a Worker with its hash, 23 Workers. It was read by `worktree.sh` and copied aside in one command, which then printed 00:47:41 UTC, and again at 00:48:09 UTC (`bun sync.ts https://cb4.endpointservices.workers.dev`):

```
cmp services-before.json cloud-brain-dev/deploy/services.json   → identical
shasum -a 256, both                                             → b1e7c14074b6…
brain-x-dashboard                                               → hash 567fadfef4db…
```

**No commit to a seed between.** The last commit of `tools/cloud-brain/brain-dashboard.ojs` is
`64db274b`, 2026-10-11 22:18:49 +0200 (`git log --format='%h %ci' -1 -- tools/cloud-brain/brain-dashboard.ojs`),
4 hours 29 minutes before the put. The commit that holds this file came after the get and changes no seed.

## What else was sent

Before the put, 00:47:50 to 00:47:51 UTC, five bodies that the service refused. The `get` and the
`list` of the first two rows of the table above came after them, and show that none of the five
was kept under `deploys` or listed.

| body | answer |
|---|---|
| `name: "health"` | 403 `health is built in: a value of the seed, which no method writes` |
| `name: "m-x-y"` | 403 `a member's dashboard is written by the member, and the owner keeps no name that starts m-` |
| `name: "deploys"`, one panel with `draw: "pie"` | 400 `panel 1: draw is one of calls, faults, methods, bars, table` |
| `name: "deploys"`, `panels: []` | 400 `panels is a list of 1 to 20` |
| `{}` | 400 `name is 1 to 30 of a-z, 0-9 and -` |

After it, 00:48:06 to 00:48:09 UTC:

| call | answer |
|---|---|
| `metric.query?metric=deploys.confirmed&by=target`, the 24 hours to 00:48 UTC | 200, 22 groups, 71 rows, `n` summed 80, `cost.cached` false |
| `metric.query?metric=deploys.put-back&by=target`, the same span | 200, 5 groups, 6 rows, `n` summed 9, `cost.cached` false |
| `POST dashboard.put` of the body with the token `loop-knowledge` | 403 `this token does not name com.lopecode.brain.dashboard.put` |
| `dashboard.get?name=deploys` with no token and no session (plain `curl`) | 401 `not allowed by the rule for this` |

So the token that reads the dashboard is answered by `metric.query` for each of its two panels.
The two counts are of one ask each and were compared with nothing; the comparison with
`logs.deploys` is in `tools/cloud-brain/records/dsv-4-cost.md`, "Measured on cb4".

These were the first `dashboard.put` calls on cb4 that this writer knows of: comment 1946 of the
issue lists "a put, a delete" as not tried on 2026-10-11, and `dashboard.list` named `health` alone
before the put.

## Which count, of three texts

- `agents/implementer.md`, "The tracker's write calls": a change with no seed and no local tool
  "still needs a count for the submit: a test file under `tests/`".
- `rules.md`, Never, the last item: when a task is an act and has no tests, "the confirmation that
  the act happened is the test: it is made by you, where the act took effect".
- The spec, task 7: "the check of R4 is the test, and its count is what `dashboard.get` answers".

Taken: the second and third. The task is an act on cb4 (a row put), and the owner approved the
spec's line at event 1371. No file under `tests/` was added: a test that reads cb4 would fail the
day the owner deletes or changes the dashboard, and one that reads this record would test the
record.

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "dashboard.put of deploys with a token second dashboard as data" | `doc:cloud-brain-dashboard-service` 0.965, `doc:cloud-brain-dashboards-share-series-and-controls` 0.702 | The spec: the body, R4's check. |
| "check a put needs no commit and no deploy services.json hashes" | `doc:cloud-brain-dev-readme` 1.000, `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.787 | `sync.ts` as the read of what cb4 runs. |
| "deploys confirmed put-back by target panels bars table" | `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.762, `doc:cloud-brain-flow-metrics` 0.500 | Nothing. `plan/cloud-brain-flow-metrics.md` puts its own dashboard the same way, later. |

## Not tried

- `dashboard.delete`, of any name. `deploys` is left on cb4 as the task's result.
- The dashboard drawn. The select and the panels are for the owner signed in; no tab was opened.
  Whether `bars` and `table` draw these two answers on cb4 was not seen.
- A put by a member, or by the owner in his tab.
- Two puts sent at the same moment. The second put here followed the first's answer.
- A name of 30 characters, a dashboard of 20 panels, and the 51st dashboard.
- The Worker's hash read between the put and the get. It was read 10 s or more before the put and 16 s
  after the last list, and was the same; a deploy and a put-back between the two reads would not show.
- `getSource?worker=brain-x-dashboard&part=reference` with `loop-dashboard`: 403, the token does
  not name it. The reference was read in the seed.
