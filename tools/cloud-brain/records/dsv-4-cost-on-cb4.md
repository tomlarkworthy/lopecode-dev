# The cost of `metric.query` on cb4 (`dsv-4-cost-on-cb4`)

The token half of `dsv-4-cost`, task 4 of `plan/cloud-brain-dashboard-service.md`. Done
2026-10-11 by a writer of the issue loop, round 1, once the owner had made the token
`loop-dashboard` (event 2024 of the issue).

## Where the numbers are

In `tools/cloud-brain/records/dsv-4-cost.md`, section "Measured on cb4", as the issue asked: the
five spans cold and warm, how many asks made again were `cached` (32 of 32), `n` against the
lines of `logs.deploys` (equal over 1 hour and 24 hours), and the 7-day answer, which is made
from a sample (160, and once 100, where the lines are 173). They are not repeated here. The asks
were made between 19:01:00 and 19:06:20 UTC against `brain-x-dashboard` at `f8667794afd8`,
before the seed was touched: a deploy writes `deploy.confirmed` lines and starts new instances.

## What changed

- `tools/cloud-brain/brain-dashboard.ojs`, the first cell (the reference) and one test. The seed
  commit is the last of that file; its author time is 2026-10-11 21:09:17 +0200
  (`git log --format=%ai -1 -- tools/cloud-brain/brain-dashboard.ojs`), 32 insertions, 3 deletions
  (`git show --stat` of it).
  No cell the Worker runs for a call changed.
- `test_dashboard_declares_one_cloudflare_permission_and_its_rows`: four lines. The reference
  holds the sentence on the sample and the 24-hour row of the table, and no longer holds four
  phrases that waited for the token ("not counted yet", "Whether Cloudflare samples", "and none
  is kept", "an ask does not wait for another's (read in").
- `tools/cloud-brain/records/dsv-4-cost.md`: "Waits for the token" became "Measured on cb4".
- `plan/cloud-brain-dashboard-service.md`: one sentence after "The cost task compares", naming
  the result.

The triage of the issue (event 2025) says "No code". Item 5 of the body changes the reference,
which is a cell of the seed, so there is a deploy.

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches, before the asks:

| searched | top hits | used |
|---|---|---|
| "measure cost of metric.query cold and warm spans" | `doc:cloud-brain-dashboard-service` 0.846 | The spec's R7 and R3 lines, which give the asks. |
| "calculations answer sampled over 7 days" | `brain-snapshot` 0.735, `doc:cloud-brain-dashboards-share-series-and-controls` 0.632 | Nothing. |
| "compare deploy.confirmed count with logs.deploys" | `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.713, `doc:cloud-brain-dashboard-service` 0.661 | Nothing more. |

## Tests

Nine `test_*` cells, one changed, none added.

**Before the change**, the four test lines added to the seed with the reference as deployed:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-dashboard > tools/cloud-brain/.emitted/dsv-4-cost-on-cb4.js && (cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/dsv-4-cost-on-cb4.js)
FAIL test_dashboard_declares_one_cloudflare_permission_and_its_rows
     Expected value:  "can be made from a sample of the lines, and nothing in it says so"
"passed":8,"failed":1,"needsBrowser":0
```

**After**, the same command on the build of the seed commit: `"passed":9,"failed":0,"needsBrowser":0`.

**In a browser**, the step-8 snippet of `agents/implementer.md`, one headless tab, `r=52011`,
`mod` found by `test_dashboard_declares_one_cloudflare_permission_and_its_rows`: `[9,[]]`.

**The deployer's run address, 20 times on the build** (this machine's Chrome 151):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"exit":0,"at":"2026-10-11T19:09:16.302Z"}
```

The first and the last run's lines have `"tests":9`.

## Not tried

- A caller other than the two tokens. `core.calls`, the metric with the most lines, is not read
  by a token, so no time is known for it.
- Asks from more than one machine, or over more than five minutes. No ask reached an instance
  without the answer, and that says nothing of how long an instance lives.
- Why Cloudflare sampled the 4-day and 7-day asks and not the 5-day and 6-day ones. Each of 2 to
  6 days was asked once.
- Cloudflare's own statement that an answer is sampled (`result.run.statistics`): no method a
  token reads passes it on.
- The setting `memoryMs` on cb4: `config.set` is the owner's.
- A fix for the sample. `metric-query-sampled-unsaid` is opened for it and nothing is built.
- The tests run together on the owner's page.
