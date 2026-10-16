# health-view-token-use-by-persona

## Round 1, 2026-10-16: two draws of the tracker's runs in a Health panel, the third panel the dollars

The owner, on the page (annotation `fb-a2b7h7j9sd`): "I would like to see token consumption too (stacked bar by
persona?)". Changed in `tools/cloud-brain/cloud-brain.ojs`: `panelDraws` offers "Tokens: usd" and "Tokens: output";
`healthPanels` has a third entry, `{ draw: "usd", worker: "" }`. New cells: `tokenDraws`, `costRuns`, `runsPageLimit`,
`runsRead`, `runsStep`, `runsRows`, `runsNote`, `tokensChart`. `panelView` draws them, `panelDrawing` asks `costRuns()`
only for those two draws, and `panel` leaves out "Worker" for them. `healthView` is unchanged. The Health line of
`cloud-brain-docs.ojs` says what the panel draws.

**The data is `issue.runs`, no new method.** Read with an `out-` token on 2026-10-16 (about 23:15 CEST):

```
runs?limit=3      total.runs 1039, total.usd 1056.01 over usdRuns 585, billed 966, more: true
all pages         3 calls of 500; at from 1791766542783 to 1792184326800; 100 backfilled; 667 with a token
```

A run of `issue.runs` is the cost event in force for an issue, role and round, with its `at`, so a run written again
is drawn once. It has no filter by time: the first read of a session is every run from the first, 500 a page (3 calls
today), and keeps those in the range. The smallest change that makes it one call is `since=` (and
`until=`) on `issue.runs`, a filter on `at`. Not made: the issue says not to change the tracker.

**Persona is `role` as written.** By role over the 1039 runs: implementer 404, reviewer 503, spec-writer 57, approver
41, orchestrator 18, triage 5, summarizer 4, digest 3, overseer 3, paper-summarizer 1. The token's prefix agreed with
the role on every run that had a token, except 4 summarizer runs with an `impl-` token, so it splits nothing.
`paper-summarizer` is the older name of `summarizer` and is its own series.

What the bars do not show, and the note under "Show" counts: a backfilled run (its `at` is the backfill: all 100 between 2026-10-12 00:55:42 and 00:56:19 UTC),
a run with no `usd` (454 of 1039) and a run with no `usage` (73) add nothing to that measure. A run is drawn at its
`at`, the time its cost event was written.

Tests: `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain`
after the build: `"tests":37,"passed":37,"failed":[]` (35 before; new `test_token_runs_are_read_page_by_page_and_not_without_a_client`
and `test_token_bars_sum_to_the_runs_by_persona`, which reads the value from the `title` of each drawn rect and sums
it by persona for both measures). The bun tests that read the two seeds: 41 pass, 2 fail; the 2 are the rows of
`brain-fly` and `brain-loop` in `tp-4-docs` / `usage-service-row-in-the-docs-module` and fail the same with this
change stashed.

`bun tools/cloud-brain/page-redraws.ts --owner --shell tools/cloud-brain/.emitted/cloud-brain.html`: `"ok":true,"computed":{}` at rest over 60 s. Its owner stand-in answers no `issue.runs`, so the bars were not drawn from a real answer there. Not run: the page against cb4 with the owner's session.

## Round 2, 2026-10-16: a session keeps the runs it read; review findings

A fresh review of `9a7488c7` found four things, each checked against the code by the coordinator:

1. Each read began at `after: 0`. At about 200 runs a day the record passes 20 pages (10,000 runs) in early
   December 2026, and from then on a read stops before the newest runs, so a recent span draws none. Now
   `runsKept` (one for each `session` and `client`) keeps the runs read and the last seq, and a new span or "Refresh"
   asks only `after:` that seq. The cap `runsPageLimit` is kept: one read takes 20 pages at most, its note then says
   `Read stopped at 20 pages of 500 runs, oldest first: the newest are missing, and the next read ("Refresh") goes on
   from there.`, and the next read does.
2. Round 1 put the backfilled runs on 2026-10-11. Read again: the 100 have `at` from 2026-10-12 00:55:42 to 00:56:19 UTC.
3. A test comment still said two panels; the panel test is renamed `test_a_panel_draws_one_of_five_for_one_worker_or_all`.
4. The note said "1 runs" and "1 backfilled runs"; it says "1 run" and "1 backfilled run is".
