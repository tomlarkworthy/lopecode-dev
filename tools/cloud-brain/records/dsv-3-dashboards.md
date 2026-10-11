# brain-x-dashboard: dashboards as data (`dsv-3-dashboards`)

Task 3 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. The seed commit's author time is 20:29:42 +0200 (`git log --format=%ai -1 -- tools/cloud-brain/brain-dashboard.ojs`).

## What changed

One file, `tools/cloud-brain/brain-dashboard.ojs` (`git show --stat` of the seed commit: 306
insertions, 13 deletions).

| cell | what it is |
|---|---|
| `dashboardDefinitions` | The built-in dashboards, a value of the seed. One: `health`, three panels over `core.calls` by `worker`, `method`, `status`, drawn `calls`, `faults`, `methods`, titled "Calls", "Health", "By method" as `healthView` of `cloud-brain.ojs` titles them. |
| `dashboardDraws` | The five names of `draw`. |
| `dashboardTable` | The built-in dashboards as rows of the reference, a row a panel. A cell of its own, as `metricTable` is. |
| `dashboardRules` | `list`, `get`, `put`, `delete`: all `caller.id == "owner" \|\| caller.kind == "did"`, the spec's rule. |
| `dashboardLimits` | `{ kept: 50, panels: 20 }`. Both numbers are the writer's; the spec names none. |
| `dashboardHold` | Whether a caller may write a name: `null`, or a 403. |
| `dashboardOwn` | The body of `dashboard.put` as the dashboard that is kept, or `{ status, error }`. |
| `dashboard_service` | `GET dashboard.list`, `GET dashboard.get`, `POST dashboard.put`, `POST dashboard.delete`. |

A dashboard is a row `dashboard/<name>`, `{ name, title, panels }`, a panel
`{ title, metric, by, filter, draw }`. The first cell (the reference the Worker serves) has a section
"Dashboards", four rows under "Who can call" and four in the method table.

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "dashboard as data panels put get list delete" | `doc:cloud-brain-dashboards-share-series-and-controls` 1.0, `brain-library` 0.722 | The doc's `healthPanels` (`plan/cloud-brain-dashboards-share-series-and-controls.md:210`): three entries `calls`, `faults`, `table`. The spec renamed the third `methods`; the seed follows the spec. |
| "built-in name overwritten by a row owner token writes a member's data" | `doc:cloud-brain-authority` 0.921, `brain-kernel` 0.703, `brain-core` 0.688 | `brain-core.ojs`, read for who a token is to a service (below). |
| "tenant prefix name member own rows 403" | `brain-core` 0.88, `doc:cloud-brain-authority` 0.728 | Nothing new. The hold is `metricTenant` of this seed, from task 2. |

## The two questions of review 1348 (N3), and what was decided

**A token of the owner and a member's dashboard.** The spec says "The owner and his tokens reach
every one". A token's call reaches a service as its maker: `asSecret` sets
`{ caller: d.from, via: "delegation:" + d.id, … }` (`brain-core.ojs:322`) and `forward` writes
`x-brain-caller` from it (line 649). So to this service `loop-dashboard` is `owner`.

Decided: the owner and their tokens **list and read** every dashboard, and **write none** named
`m-…`. `dashboard.put` and `dashboard.delete` of such a name are 403 in the service. By line 1 of
`philosophy.md` (nothing an agent's token holds changes a member's data) and line 2 (the narrower
side; it is one line of `dashboardHold` to undo). Task 2 took the same side for metrics: the owner
writes none. What it costs: the owner has no method that deletes a member's dashboard, as he has
none for a member's metric. The owner in his tab and a token are not told apart, so his tab does
not write a member's either.

A consequence: the owner keeps no name that starts `m-` (`m-notes` is 403), since such a name
could not be told from a member's.

**`dashboard.put` of `health`.** Decided: 403, for every caller, and the same for
`dashboard.delete`. A built-in dashboard is a value of the seed as a built-in metric is; changing
one is a change to the seed, with a review. By line 2, and because task 6 draws the page's Health
section from `health`: a token that names `dashboard.*` would otherwise change what the owner's
page shows. `dashboard.get?name=health` answers the seed's value whatever row is kept under that
name, and `dashboard.list` names it once; no method writes such a row, and the test puts one in the
rig's rows. Not chosen: a row that overrides the built-in one and a delete that restores it, which
is what would let the owner rearrange Health with no deploy. Reopen if he asks for that.

## What else the spec left open

- **One name everywhere**, as task 2 decided for metrics: `put`, `get` and `delete` take the whole
  name `m-ID-NAME`. The spec's "kept as `m-<id>-NAME`" could also be read as the service adding
  the prefix; not chosen, since a dashboard would then have two spellings.
- **403 or 400 or 404.** For a member, a name outside `m-<their id>-` is 403 in `put`, `get` and
  `delete`, kept or not, so the answer does not say whether the owner or another member has a
  dashboard of that name. Their own name that is not well formed is 400 (`put`); not kept is 404
  (`get`, `delete`).
- **A member is not listed and does not read `health`.** The spec: "a member lists, reads and
  writes their own and no other". Its panels are over `core.calls`, which a member is refused.
- **Names only.** `dashboard.put` does not look whether a panel's `metric` is defined or whether
  `by` and `filter` name its dimensions: the spec says a dashboard holds names only, and a
  dashboard may be put before its metric. The test keeps one over `flow.lead-time`.
- **`filter`.** The spec's example panel has `title`, `metric`, `by`, `draw`; its page section
  asks one query "for each distinct `(metric, by, filter)`", and `ds-4`'s panels carry a Worker.
  So a panel keeps `filter`, an object of a dimension's name and a value (text of 200 characters
  at most, or a number), 8 at most. Nothing reads it yet.
- **Kept whole.** A panel is kept with `by` a list and `filter` an object when they were left out.
  A field that is not one of a dashboard's or a panel's is not kept.
- **`dashboard.list` answers `{ name, title }`**, no panels: the page's select needs no more, and
  `dashboard.get` is the read.
- **50 dashboards a caller, 20 panels a dashboard.** A member's count is their own; the owner's,
  with their tokens, is of the names that are not a member's. A put of a new name at 50 is 400.
- **No price**, as task 2 left the metrics.
- Left out, by the spec's split: minutes, the 60 s of memory and `cost` (task 4); the page (task 5);
  Health through the service (task 6); the dashboard `deploys` on cb4 (task 7).

## Tests

Seven `test_*` cells (`grep -c "^test_" tools/cloud-brain/brain-dashboard.ojs`: 7). Two are new,
three are changed, two are as they were.

| test | what changed |
|---|---|
| `test_a_dashboard_is_kept_as_data_and_health_is_built_in` | new: R4 and R8 for the service, and N3's `health` |
| `test_a_member_keeps_dashboards_of_their_own_and_the_owner_writes_none_of_them` | new: the dashboard half of R6, and N3's token |
| `test_metric_rules_give_a_token_the_deploy_counts_and_the_owners_tab_the_rest` | eight methods in `meta.access`; each `dashboard.*` passes the owner in a tab, a token and a member, and not a Worker or a stranger; none has a price |
| `test_metric_query_refuses_what_the_definition_does_not_name` | `POST dashboard.put` was in its list of methods that are 404. In its place: `metric.define`, `GET dashboard.put`, `POST dashboard.get`, `dashboard.query`, `constructor` |
| `test_dashboard_declares_one_cloudflare_permission_and_its_rows` | the reference has the four rules, a row a panel of `health`, the draws and both limits |

**Before the change.** The deployed module cannot run the new tests (they read cells it does not
have). What was run in its place: the new seed with one line added to the service that answers
every `dashboard.*` 404, as the deployed `942bf844cbe8` does (its `verbs` has no such name):

```
cd cloud-brain-dev && bun test.ts brain-x-dashboard --with <scratch>/mut.js
FAIL test_a_dashboard_is_kept_as_data_and_health_is_built_in
FAIL test_a_member_keeps_dashboards_of_their_own_and_the_owner_writes_none_of_them
"passed":5,"failed":2,"needsBrowser":0
```

**After**, the same command on the build of the seed:

```
cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/dsv-3-dashboards.js
"passed":7,"failed":0,"needsBrowser":0
```

**Seven mutations of the seed**, each built to a scratch file, run with the same command, and the
seed put back (`git diff --stat` after: the seed's 306 and 13).

| mutation | failed |
|---|---|
| the owner writes a name that starts `m-` (that line of `dashboardHold` removed) | 1, the member test |
| `health` is put and deleted (that line of `dashboardHold` removed) | 1, the data test |
| a member's `dashboard.get` not held to `m-<their id>-` | 1, the member test |
| a member's `dashboard.list` answers every row | 1, the member test |
| a member writes any name that starts `m-` | 1, the member test |
| a row under `health` is read before the seed's value | 1, the data test |
| every caller that is not a DID is the owner | 2: the member test, and task 2's metric test |

**In a browser**, the step-8 snippet of `agents/implementer.md`, one headless tab, `r=73001`,
`mod` found by `test_a_dashboard_is_kept_as_data_and_health_is_built_in`:

```
[7,[]]
```

**The deployer's run address, 20 times on the build** (this machine's Chrome, not the cluster's):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"at":"2026-10-11T18:30:34.618Z"}
```

`grep -c '"tests":7,'` over its output: 20, one a run.

The rebase after it brought in three files (`.claude/skills/review-notebook/SKILL.md` and two under
`plan/`), none that the module is built from, so the tests were not run again. The record emitted
in the tab, read from the file the receiver saved: hash `8702e47fd338…`, `meta.resources`
`["rows"]`, `meta.cloudflare` `["Workers Observability Read"]`, eight methods, a reference of
14902 characters, no `test_` in `parts[0].text`.

## Not tried

- Any call of the four methods on cb4 by a token or by a member. `loop-dashboard` is the owner's to
  make (the spec, his list, item 2) and no DID has a grant (item 3). R4's check on cb4 (a put with
  no commit and no deploy between) is task 7's. Every answer in the reference's section
  "Dashboards" is from the tests, with the caller's name given to the service as a header.
- The four rules on cb4. The test decides them with `decide` over `meta.access`, with the five
  callers of `brain-logs`' rule test.
- That the core hands a member's call, or a member's Worker's, to this service for `dashboard.*`.
  `asAuthor` and `forward` were read (`brain-core.ojs:260` to 270, 649 to 650); the test gives
  the headers by hand. The kernel's refusal of a DID with no grant was read at
  `brain-kernel.ojs:357` and not run.
- A DID that arrives with another `x-brain-via` (a portal, a turn, a delegation): the service does
  not read `x-brain-via`, as task 2 left it.
- Two puts at once at 49 kept: the count is read and then written, so 51 can be kept.
- `rows.list` of more rows than one answer of the database holds. The owner's `dashboard.list`
  reads every row under `dashboard/`, each member's among them.
- A page that draws a dashboard. Whether `draw`, `by` and `filter` as kept are what task 5 needs
  is not known until it is written.
- The tests run together on the owner's page.
