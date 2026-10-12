# fm-6-restores

Task 6 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379), R6: the time
from a put-back to the next deploy of that Worker that stood. `logs.deploys` answers it as
`restores`, the page draws it as the metric `deploys.restore`, and the dashboard `flow` on cb4 has
the row "Time to restore". Written 2026-10-12 by a writer of the issue loop, round 1. The commits
and the two deploys are refs of the submit.

## What changed

`tools/cloud-brain/brain-logs.ojs` (Worker `brain-x-logs`):

- `deployRestores(lines)`: one row for each `deploy.put-back` line that names a Worker, oldest
  first, `{ target, hash, putBack, restored, ms }`. `restored` is the `t` of the first
  `deploy.confirmed` or `deploy.verified` line of that `target` with a later `t` whose `hash` is not
  the put-back's `previous`; `null`, with `ms`, when the lines have none.
- The answer of `logs.deploys` has `restores: deployRestores(lines)` beside `workers` and `tests`.
- The reference: the field in the shape block, and a paragraph "Time to restore".
- No rule and no query of Cloudflare changed: the rows are made from the lines the method already
  answered, with fields a member's line already leaves with (`target`, `hash`, `t`).

`tools/cloud-brain/brain-dashboard.ojs` (Worker `brain-x-dashboard`):

- `panelMethod("deploys.restore")` is `logs.deploys`. Only that name: `deploys.restores`,
  `deploys.restore.x` and a member's `m.ID.deploys.restore` stay `metric.query`'s.
- `restoreRows(answer, filter)`: the answer a panel draws. A row
  `{ t: restored, id: target + "@" + the first 8 of hash, target, n: 1, sum: ms, max: ms }` for each
  of `restores` that has a `restored`, `unit: "ms"`, no `summaries`, and `unrestored`, the count of
  those with none.
- `dashboardRead` sends `logs.deploys` with `{ from: range.since, to: range.until }` and nothing of
  a panel, once for a dashboard, and each query of `deploys.restore` is `restoreRows` of that answer.
- `panelBody` writes under the panel, and beside "No rows in this span.":
  `Put-backs of this span with no later deploy that stood by its end, and so no row: 1.`
  Its fork between "lines" and "rows", the axis label of `bars` and the note of 500 groups now turn
  on the method being `metric.query`, where they turned on it being `issue.flow`.
- `flowDashboardBody` has the eleventh row, and the reference names the third method in three places.

## Where the spec is silent

Each by line 2 of `philosophy.md` (the smaller side). The spec has an "(As built …)" note.

| The spec | Built | Why |
|---|---|---|
| `hash` of a row of `restores`, not said which | The hash that was put back (the put-back line's `hash`) | The row is of a put-back and exists when nothing was restored |
| "whose hash is not the one put back to" | A later `confirmed` or `verified` at the hash that was put back is a restore | As written. `brain-x-git` in the test: put back twice at `g1`, then `g1` confirmed |
| A put-back whose `previous` is `null` (a first version) | Any later deploy of the Worker that stood | Nothing was put back to |
| Two restore panels on one dashboard | One `logs.deploys` for both | It reads the span's lines whole; the call is timed under "On cb4" |
| A panel's `filter` | Taken by `restoreRows` on the row's fields (`target`, `id`); a name no row has keeps no row | `logs.deploys` takes a span and nothing else; a filter that did nothing would be drawn as if it had |
| A `brain-x-logs` that answers no `restores` | That query's error: `logs.deploys failed: its answer has no restores` | The page and the Worker are deployed apart |
| `step` of the answer | One hour | The rows are not in steps; `bars` draws a row that wide. `points` and `table` do not read it |

Not built: a percentile of the restores (the spec: "a percentile is computed in the tracker's
module alone"). `dashboardNote` counts queries by metric, `by` and filter, so a dashboard with three
restore panels reads "from 4 queries" where two calls were sent; the test holds that sentence as it is.

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seeds.
`…` is `tools/cloud-brain/.emitted`.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-logs` (what cb4 ran before, hash `21e8deb3c2c9`) | `passed` 7, `failed` 0 |
| The build with the new tests of `brain-logs.ojs` and no other change: `bun test.ts brain-x-logs --with …/fm-6-logs.js` | `passed` 5, `failed` 3: `deployRestores is not defined`, and `restores` `undefined` in two tests of the method |
| `bun test.ts brain-x-logs --with …/fm-6-logs.js` (the build) | `passed` 8, `failed` 0, `needsBrowser` 0 |
| `bun test.ts brain-x-dashboard` (what cb4 ran before, hash `7ce3ae629c3f`) | `passed` 14, `failed` 0, `needsBrowser` 3 |
| The build with the new tests of `brain-dashboard.ojs`, the eleventh row and no other change: `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-dashboard` | `tests` 18, `passed` 16; failed `test_time_to_restore_…` (`restoreRows is not defined`) and `test_a_flow_panel_…` (no panel is `logs.deploys`'s) |
| `bun test.ts brain-x-dashboard --with …/fm-6-dashboard.js` (the build) | `passed` 14, `failed` 0, `needsBrowser` 4: the new test reads `document` |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-logs` (Chrome 151.0.7922.34) | `tests` 8, `passed` 8, `failed` [] |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-dashboard` | `tests` 18, `passed` 18, `failed` [] |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-logs --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":8` in 20 lines (`grep -c`) |
| the same for `brain-x-dashboard` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":18` in 20 lines |

Two test cells are new, `test_deploy_restores_pairs_each_put_back_with_the_next_deploy_that_stood`
and `test_time_to_restore_is_read_from_logs_deploys_and_drawn_as_points`. Three are changed: the two
tests of the method in `brain-logs.ojs` hold `restores` of their fixtures, and
`test_a_flow_panel_…` holds eleven panels.

Ten changes of one line each were made to the seeds in turn, each built and run with
`tab-tests.ts`. Each failed a test:

| The line changed | Failed |
|---|---|
| logs: a `confirmed` at the hash put back to is a restore | the new test, 7 of 8 |
| logs: a line at the put-back's own time is after it (`>=`) | the new test, 7 of 8 |
| logs: `deploy.verified` is no restore | the new test and the test of the span, 6 of 8 |
| logs: `restores` not in the answer | the two tests of the method, 6 of 8 |
| dashboard: `logs.deploys` sent for each query | the new test, 17 of 18, as each below |
| dashboard: the filter not taken | |
| dashboard: a put-back with no end has a row | |
| dashboard: the count not written under the panel | |
| dashboard: `since` and `until` sent in place of `from` and `to` | |
| dashboard: the `id` has the whole hash | |

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "time to restore put-back deploy lines" | `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.867, `doc:cloud-brain-flow-metrics` 0.632 | The spec, "Time to restore (R6)" and the R6 row of its checks |
| "dashboardRead logs.deploys restoreRows points" | `doc:cloud-brain-dashboard-service` 0.915, `doc:cloud-brain-flow-metrics` 0.89 | The same |
| "failed deployment recovery time DORA" | `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.8, `doc:cloud-brain-flow-metrics` 0.644 | Nothing more: the spec cites the DORA page for this clock |

Also read: the record of `fm-5-page-and-dashboard` (`pointsChart` with no `summaries`, the put and
its check).

## Not tried

- The dashboard `flow` in the owner's tab on cb4: the panel "Time to restore" drawn by the page's
  own client with his session. The loop has no session of his, and `loop-dashboard` does not name
  `logs.deploys`. The spec leaves this to him.
- The panel drawn from an answer of cb4. The tests draw a fixture of four put-backs.
- How long the dashboard waits for this panel in a tab. `dashboardRead` awaits every query
  together, so the ten other panels are drawn when `logs.deploys` has answered; the call alone is
  timed under "On cb4".
- A span of the page under 7 days on cb4. A put-back before the span has no row and its restore
  inside the span is not drawn; the reference says so and no test holds it.
- A member's dashboard with a `deploys.restore` panel. `logs.deploys` refuses a member
  (`caller.id == "owner"`), and the panel would say `logs.deploys failed`; not run.
- More put-backs than one answer of 7 days has. `deployRestores` looks through the lines that
  stood once for each put-back.
- `deploy.deployed` and `deploy.uploaded` as an end. The spec names `confirmed` and `verified`.
