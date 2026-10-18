# The seeds of the Cloud Brain notebook, 2026-10-18

Task `seed-inventory` (i13479) of the project i13287, done by the owner's Claude session. Read at `lopecode-dev`
`a0a2aaa0` with `cloud-brain-dev` at `a63e82d` (its `main`, after `git pull --ff-only`) and
`bun sync.ts https://cb4.endpointservices.workers.dev` there, which printed `27 services, 78 shared modules, 62 files`.

**14 seeds, not 33.** The issue counted 33 files. 21 were deleted on 2026-10-14, each `same` as what cb4 ran:
`brain-git` and `brain-fly` (`8cbaa35c`), `brain-issues` (`88f03840`), and the 18 in `ad513872` (`brain-ai`, `blob`,
`bluesky`, `browser`, `container`, `dashboard`, `feed`, `inbox`, `knowledge`, `library`, `logs`, `loop`, `proxy`,
`snapshot`, `static`, `topic`, `usage`, `whatsapp`). Their `build.ts` entries are `running: "brain-x-NAME"` and the
tests read `cloud-brain-dev/deploy/`. So the 18 retire tickets i13488 to i13556 have nothing left to do.

## The 14 seeds

Bytes are `wc -c`. **deploy/** is whether `cloud-brain-dev/deploy/@tomlarkworthy/NAME.js` exists after the sync, and
whether that file is committed in `cloud-brain-dev` (`git ls-files`) or git-ignored as a service's module. **Same** is
`differ` of `tools/cloud-brain/waiting-deploys.ts`: the seed compiled as `build.ts` compiles it
(`moduleSource(splitSeed(…))`) against the file the sync wrote, cell by cell (each named cell's body signature and
inputs, the cells with no name as a sorted list, the imports). Not bytes. For `cloud-brain` the other side is
`getSource?worker=brain-x-page` (hash `b7f2f255d8b6`), and the deploy file gave the same list.

| seed | bytes | module | deploy/ | tests/tools that read it | same as cb4 |
|---|---|---|---|---|---|
| `brain-core.ojs` | 213058 | brain-core (Worker `brain-core`, owner's) | ignored | agent-token, approver, never-list-three-reductions | same |
| `brain-db.ojs` | 78693 | brain-db (owner's) | ignored | approver, issue-lock-sql, needs, never-list-three-reductions | same |
| `brain-deployer.ojs` | 261680 | brain-deployer (owner's) | ignored | approver, brain-info-size, brain-seen, cu-1-record, never-list-three-reductions, verify-run | same |
| `brain-kernel.ojs` | 195525 | brain-kernel (Worker `brain`, owner's) | ignored | approver, loop-step, never-list-three-reductions | same |
| `cloudflare-iac.ojs` | 161569 | cloudflare-iac (the deployer's, owner's) | ignored | approver, never-list-three-reductions, rows-add-within-sql, tp-4-docs | same |
| `cloudflare-iac-fixtures.ojs` | 200 | cloudflare-iac-fixtures (owner's; not a main) | committed | none | same |
| `cloud-brain.ojs` | 189219 | cloud-brain (Worker `brain-x-page`) | ignored | ac-5-prose-names-the-two-shapes, ds-3-record, dsv-5-docs-name-the-dashboard-service, health-docs-say-what-the-page-does, operator-tab-check, pm-2-page-changes-kept, tx-1-six-lines | **differs**, 28 entries (below) |
| `cloud-brain-specs.ojs` | 108934 | cloud-brain-specs (page module) | committed, modified by the sync | none | **differs**, 8 cells the build adds (below) |
| `cloud-brain-docs.ojs` | 33407 | cloud-brain-docs (page module) | committed, modified by the sync | dsv-5-docs-name-the-dashboard-service, health-docs-say-what-the-page-does, tp-4-docs, usage-service-row-in-the-docs-module | same |
| `brain-shell.ojs` | 43397 | brain-shell (page module) | committed, modified by the sync | pm-2-page-changes-kept | same |
| `brain-feedback.ojs` | 98108 | brain-feedback (page module) | written by the sync, never committed | feedback-cell, pm-2-page-changes-kept | same |
| `brain-operator.ojs` | 3933 | brain-operator (page module) | written by the sync, never committed | approver-brief, issues-policy-v5, learnings-gate-deploy-page-for-a-record, operator-tab-check, needs (as fixtures, a path or `seedModule`) | same |
| `brain-secrets.ojs` | 7535 | brain-secrets (page module) | committed | none | same |
| `xrpc-client.ojs` | 4911 | xrpc-client (page module) | committed | needs (a fixture of `seedModule`) | same |

"Tests that read it" is `grep -lF NAME.ojs tests/tools/*.ts`; a test that names the file in a fixture string is
listed too. Outside `tests/tools` the seeds are named by `tools/cloud-brain/verify-run.ts` (comments naming
`brain-deployer.ojs`, `brain-shell.ojs`, `cloud-brain.ojs`), `brain-info-size.ts` and `brain.ts` (`brain-deployer.ojs`),
`.claude/skills/brain-maintenance/rules.md` (`brain-feedback.ojs`), `oversight.md` and `seed-tests.md` there
(`cloud-brain.ojs`), and `spec-as-built.md`.

**The page modules are not Workers.** Only `cloud-brain` has a `getSource?worker=`. The other seven are blocks of the
page the kernel serves at `/` (the shell that `brain.ts shell` posted from an earlier build), which `sync.ts` writes
to `deploy/` and lists in `deploy/shared.json`. So `running: "brain-x-NAME"`, the form of 2026-10-14, does not apply
to them: a retired page module is read from its `deploy/` file.

**Three committed copies are behind what is served.** After the sync, `git -C cloud-brain-dev status` showed
`brain-shell.js` (`293 ++++…` in `diff --stat`), `cloud-brain-docs.js` and `cloud-brain-specs.js` modified, and
`brain-feedback.js` and `brain-operator.js` untracked. A build that reads `deploy/` in a clone with no sync would take
the committed `brain-shell.js`, which is older than the seed and than what is served.

## The two that differ

`cloud-brain`: cb4 is ahead of the seed. `-` is a cell only cb4 has, `~` a cell both have with another body.

```
~healthView ~healthPanels ~panelInstances ~panelDraws ~panelView ~tokenDraws ~workerLink ~calls
~test_health_draws_calls_and_methods_and_no_strip_of_faults ~test_a_panel_draws_one_of_five_for_one_worker_or_all
~applySource ~loadService -applyLine -applyRow -panelShared -roleTable
-test_a_failed_cell_of_a_panel_is_named_under_its_error -test_health_panels_read_nothing_that_loads_the_services
-test_panels_are_given_the_inputs_of_the_page -test_health_panels_are_given_inputs_and_do_not_bridge_it
-test_tokens_by_role_total_the_runs_of_issue_runs_for_each_role -applyLog -applyCount -applySourceOf
-test_applying_a_source_is_counted_and_shown_under_health -loadServiceOf -test_an_unchanged_hash_applies_the_source_once
a cell with no name
```

`loadServiceOf`, `applySourceOf` and `test_an_unchanged_hash_applies_the_source_once` are the names of the task
`page-same-source` (i13467, done). A build from `cloud-brain.ojs` today would take those cells away from the page, as a
build of `brain-git.ojs` would have on 2026-10-14. Not retired here; the seed must first be the same as `brain-x-page`
(or be deleted on the owner's word with `brain-x-page` taken as the source).

`cloud-brain-specs`: every difference is a cell only the served copy has, and each is one the build adds:

```
-viewof specStatus -specStatus -built_summary -built_exists -built_verified -built_not_verified -built_not_built -built_limits
```

`specStatus` is carried from the previous build (`SPEC.keep`, `build.ts` line 68, `carryCells`), and the `built_*`
cells are written by `patchSpec` (`tools/cloud-brain/spec-patch.ts`) from `spec-as-built.md`. The seed's own cells are
the same. It is still not retired: `build.ts` treats it apart (`SPEC`, lines 66 to 76 and 184: the carry, the anchored
ids, `patchSpec`), and the build's citation check reads it as a seed (line 100).

## The lines of build.ts that read seeds

At `a0a2aaa0`:

```
27-33, 55-60   the entries with seed: (xrpc-client, brain-shell, cloudflare-iac-fixtures, cloudflare-iac, brain-deployer,
               brain-core, brain-kernel, cloud-brain, cloud-brain-docs, brain-secrets, brain-feedback, brain-operator, brain-db)
67             SPEC.seed: "cloud-brain-specs.ojs"
87             textOf: readFileSync(HERE/m.seed) for a seed entry
88-90          testsOf: the names of test cells, from `^test_… = ` of a seed or `$def("…", "test_…"` of a running module
100-102        the citation check reads SPEC.seed and cloud-brain-docs.ojs as files, and their own test cells as seed text
159            a seed entry is compiled: moduleSource(splitSeed(textOf(m)), compile)
184            the spec compiled from SPEC.seed
```

## The order the retire tickets take

Each in its own commit that leaves `build.ts` and the touched tests passing. What each turned out to be is in its
ticket's comment and in `git log` of this branch:

- i13488 to i13556, the 18 services: nothing to do (deleted in `ad513872`).
- i13482 `cloud-brain`: not retired, differs (above).
- i13600 `cloud-brain-specs`: not retired, the build's own carry and patch (above).
- `brain-secrets`, `brain-feedback`, `brain-operator`, `brain-shell`, `xrpc-client`, `cloud-brain-docs`: same, retired
  if the tests that read each can be moved to its `deploy/` file.
- The owner's six (`brain-kernel`, `brain-core`, `brain-db`, `brain-deployer`, `cloudflare-iac`,
  `cloudflare-iac-fixtures`): all `same` on this day, left for the owner (i13610 to i13620).
