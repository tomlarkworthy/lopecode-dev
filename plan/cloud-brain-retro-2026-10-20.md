# Cloud Brain issue loop: retro of 2026-10-18 to 2026-10-20

Written 2026-10-20 by the owner's orchestrating session at the owner's request: "I feel like we
have made nearly no progress in 2 days and I am endlessly approving the same things, or approving
structural fixes that turn out not to fix anything. Please do a deep retro on the friction points
and how we get them fixed safely." The owner then answered "yes just do what you think" to the
recommended option on each of six items; the section "How to fix this safely" records what that started.

## What was measured

Source: `issue.get` of the 340 issues opened or touched since 2026-10-18 00:00 UTC (7,547 events),
read 2026-10-20 by `pull.py` in `plan/cloud-brain-retro-2026-10-20/` (the analysis is `an.py` to
`an4.py` there), and `git log origin/main --since=2026-10-18T00:00:00Z` of `cloud-brain-dev`. Categories are regexes over the title and the `about` field, so the splits are
approximate: the regex classifier of `an2.py` counts 168 issues (176 `done` moves; 8 issues reached `done` twice) as 103 loop, 27 other dev-repo work, 38
product, and a split by the `about` field alone (`an.py`) gives 148 about the loop, tracker or
infrastructure and 28 about a service. `owner (tab)` as an actor covers the owner's clicks and the session's moves made on
the owner's word.

| Measure | Value |
|---|---|
| Issues that reached `done`, by day | 93 (10-18), 65 (10-19), 18 (10-20 to 07:40 UTC) |
| `done` about the loop, tracker or dev tooling (regex) | 103 of 168 classified |
| `done` that are other dev-repo work, titles that missed the loop regex (regex) | 27 of 168 |
| `done` that are service or product work (regex) | 38 of 168 |
| Commits to `cloud-brain-dev` since 2026-10-18 00:00 UTC | 254 (152, 96, 6 by day) |
| Agent runs recorded since 10-18 | 829: 269 writer, 227 reviewer, 168 approver, 130 triage |
| Writer runs that submitted | 244 of 269 |
| Owner approvals (`approve` by `owner (tab)`) | 71 |
| ...on loop, tracker or dev issues / docs, specs, briefs / service issues (all four fixes to the deploy and ship flow) / other (`i15004`) | 46 / 20 / 4 / 1 (71 approvals on 64 issues) |
| Issues approved twice or more | 8; 1 more had an approve followed by rework or requeue (9 in all) |
| Issues opened since 10-18 by the orchestrating sessions (`out-*`) | 152 of 340 (176 of the 340 counting any date) |
| Run-stop comments | 642, of which 588 are two refusals repeated on four issues (`landing-not-about`: `i14941` 405, `i15099` 39, `i15112` 2; `two-landings`: `i13936-brain-x-loop-mint-library` 142) |
| Wait from `to-approval` to the next move, all time (not windowed to 10-18) | median 0.24 h, p90 3.5 h, max 26 h (n = 158); from 10-18: n = 142, median 0.23 h, max 10.5 h |

Two readings these numbers do not support: that the loop did little (244 writer submissions, 172 reviewer
passes since 10-18), and that the owner waited long on average. The weight is in what the work was about and in
the tail of the waits.

## Friction points, with the evidence for each

1. **The machine works on itself.** 66 of the owner's 71 approvals (93%) were on loop, tracker, dev or
   docs issues; 4 more were on service issues about `brain-x-deployer`, all fixes to the deploy
   and ship flow (`i17852`, `i17965`, `i18145`, `page-shared-deployer-reads-shared`). None was a
   change a user of a service would see.
2. **A flow fix was tested at the unit and not on the flow.** Six issues aimed at "an approved
   deploy does not ship" were done between 10-19 20:29 and 10-20 03:29 UTC: `i17852`,
   `i17852-ship`, `i17965`, `i18040`, `i18145`, `i17349-redo-ship`. Each carries stub-based tests
   (for example `tests/ship-waiting.test.ts`). On 10-20 four approved deploys (`ad-6-docs`,
   `ad-6a-operator-brief`, `loops-record-holder-for-run-tokens`, `fb-a2li9afmbl-task`) shipped only
   when `bun ship.ts ID` was run by hand on the Fly machine. The symptom was on the tracker in the window: the drain's own ship run on
   `fb-a2jonnqvlh-task` commented it at 2026-10-19 22:15Z, and none of the six fixes acted on it. A by-hand dry run of
   `fb-a2jonnqvlh-task` then printed
   `apply.ts: the deployer did not confirm the shared module(s) @tomlarkworthy/brain-feedback (its answer for brain-x-page has no \`shared\` hash …)`.
   The cause, found by reading `apply.ts:213-216` against `brain-deployer.js` `settleShared`: a
   `waiting` answer carries no `shared`, and `apply.ts` requires it on every answer of a service
   with a shared module, so `ship.ts` never saw the `waiting` answer and never commented the link.
   Filed as `i18769`; fixed in `8f7d351` on `cloud-brain-dev` main (2026-10-20 07:07 UTC), not yet
   run through the real flow. The lines cited are the code before that commit. None of the six
   touched it.
3. **Retries without a bound.** 588 of 642 run-stops are two refusals repeated on four issues.
   `i13936-brain-x-loop-mint-library` was taken 142 times by 06:02 UTC on 10-20 (`two-landings`, usd 0 each); each run
   counted against `max-runs`, so the drain printed "stop (max-runs) still waits for 0 runs" and
   started no agent from 06:03 to 06:27 UTC. Filed as `i18718`.
4. **A pass review without a green dry run.** `pds-vendor` (104 tests, 404 on
   `api.observablehq.com/@atproto/repo.js?v=4`) and `fb-a2q7qas27d-task`
   (`test_every_chart_has_a_tip_that_names_its_bar`) were passed and then failed the deployer's tests.
5. **Two gestures for one approval.** The owner approves the issue, then answers a second link
   (60 minutes) for the same patch. The machine commented 15 links on 11 issues from 10-19 to 10-20; 2 of those issues
   (`install-says-reviews-dropped`, `pds-vendor`) are still not done. A by-hand `ship.ts` renews a
   request id.
6. **Premises not checked.** `i15515` asked the toolchain to emit `importShim`; the exporter
   already rewrites it to `import()` (`exporter-3._restoreCanonicalImports`), and the difference
   comes from `cloudflare-iac.js:917,986` (in `cloud-brain-dev/deploy/@tomlarkworthy/`, a gitignored build output, read 2026-10-20 06:21 UTC), which build `worker.js` from `String(def)` of live
   functions. `i17349-redo-ship-brain` assumed `rules.md` and `approver.md` are Brain files;
   neither is on the Brain (`static.list`, 773 files; both URLs 404) and `approver.md` is
   `roles/approver.md` in git. A session subagent building `i13852` on a worktree (not a loop run; no event on the tracker records it) found `build.ts` writing a broken notebook, with no
   error, from a module whose text holds `</script` (the deployer's, lines 981 and 2972 of the build output).

## The session's part

The orchestrating sessions opened 152 of the issues opened since 10-18. The same session deployed, approved on
the owner's word, and watched the queue, so the flow depended on it and its context resets. On
10-20 it spent the afternoon on unattended deploy tokens (`core-delegate-mints-a-deploy-child`,
`i18788`). Three adversarial reviews each blocked the deployer patch for a different route to what
the owner's tab runs (`shared`; the page Worker and any path; a module name sent with the source,
`keepSource` at line 364 of the `brain-deployer` build output). A route list will keep growing while the page runs
module source from the store tokens write to. Patches, not deployed, kept in
`plan/cloud-brain-retro-2026-10-20/`: `core-child-3.patch`, `dep-shell-2.patch`. Parked. "The owner's
four" are the kernel, the core, the database and the deployer, which the loop never deploys.

## How to fix this safely

State at 2026-10-20 14:50 UTC; the doc's data was pulled at 07:40 UTC. `i18718` was approved at 06:50 and `i18868` at 08:12; `i18866` has its spec written and `i18867` its spec submitted, neither approved; `i18768` is a project awaiting its spec. The canary has not run. The memory note and the post-mortem tasks have no issue of their own.

| Rule | Issue |
|---|---|
| A flow fix is done only when the real flow has run end to end on the live system: a canary service and a nightly canary issue through writer, pass, ship, hold, approval, deploy, `done` | `i18866` |
| Every retrying step has a bound, and a refusal that costs nothing does not count toward `max-runs` | `i18718` |
| One gesture per approval, invalidated by a changed patch or base and not by a clock | in `i18768` |
| Docs-only patches (md cells only, byte-compared by code) approve and ship by code; the owner's four stay the owner's | `i18867` |
| The triager attaches the command output that proves each fact a ticket rests on | `i18868` |
| From 2026-10-20 for 48 hours the session files no loop-mechanism ticket except the canary, the breakers and the post-mortem tasks | memory note |
| Post-mortem tasks filed: `i18808`, `i18811`, `i18814`, `i18817` | |

Alternatives not taken, with their cost: build the unattended token path and close its routes one
by one (each review found one more; the owner would still approve each deploy of the deployer);
serve service paths from another origin (the real separation, a spec and a migration of every
path).

## What this doc does not know

- Whether tier 0 can define "md cell only" safely where a test reads a md cell.
- The cost of the canary and how its approval is signed without widening a token.
- The weekly numbers it should report (share of `done` that is product, owner clicks per product
  deploy, hours from pass to deployed) have no baseline beyond this window.
- Counts older than 2026-10-18 were not read.
- To rerun the tables: from the repo root, `S=<scratch dir> python3 plan/cloud-brain-retro-2026-10-20/pull.py` writes `$S/retro/issues.json` (about 5.3 MB, not kept in the repo; pulled 2026-10-20 07:40 UTC), then `S=<scratch dir> python3 plan/cloud-brain-retro-2026-10-20/an.py` and `an2.py` to `an4.py`. The run counts by role (829, 269 writer, 244 submitted, 172 passes) are printed by no script; they were counted from the same file in a throwaway session.
