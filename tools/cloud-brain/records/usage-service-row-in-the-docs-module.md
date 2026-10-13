# The docs module names the usage service (`usage-service-row-in-the-docs-module`)

Written 2026-10-13 by a writer of the issue loop, round 1. One row of a seed and one test file; no
Worker is deployed. Every time below is from `date`, in CEST unless it says UTC.

**cb4 does not show the new row.** `cloud-brain-docs` is a module of the shell, which reaches cb4
with `brain.ts shell`: the orchestrating session's, after the review (`rules.md`, "Two standing
leaves of the orchestrating session"). The row was seen drawn in a local build only.

## What was wrong

cb4 runs `brain-x-usage`. `getInfo?worker=brain-x-usage`, with no account, at 07:12:

```
"deployedAt":"2026-10-13T04:59:59.310Z","hash":"ca6839f91025…","module":"@tomlarkworthy/brain-usage","cloudflare":["Billing Read"]
```

The table "Services outside the core" of `tools/cloud-brain/cloud-brain-docs.ojs` had 12 rows and
none for it. The test of this change on the file before the edit, 07:13:22:

```
bun test --timeout=30000 ./tests/tools/usage-service-row-in-the-docs-module.test.ts
 0 pass
 4 fail
```

## Every service, or a chosen few

The issue asks which the table is, and to close it if a chosen few. The module does not say. The
two lines over the table are "Each is an owner service. Its module documents it." and no line
names a choice. The table is not every service either:
`grep -c 'mod("brain-NAME")' tools/cloud-brain/cloud-brain-docs.ojs` is 0 for `brain-snapshot`,
`brain-knowledge`, `brain-git` and `brain-fly`, each of which `OWNED` of `build.ts` names.
`brain-static` and `brain-blob` have no row and are named once each, in one line under "Data".
Each of the four answered `getInfo?worker=brain-x-NAME` with its methods at 07:17, so cb4 runs them.

The row was added and the issue not closed, for two reasons. Two earlier tasks each added the row
of a service new that day (`tp-4-docs` for `brain-topic`, `dsv-5-page-section` for
`brain-dashboard`), so a new service has been given a row twice. And a row is one line that is
taken out again by deleting it (`philosophy.md`, line 2: the side that is smaller and easier to
undo). The four services with no row are not this issue: `seen-d1b8cc-docs-table-four-services`
is the feedback ticket for them.

## What changed

- `tools/cloud-brain/cloud-brain-docs.ojs`, the table "Services outside the core": one row for
  `brain-usage`, the last, after `brain-dashboard`. Its sentences are cut from the first cell of
  `tools/cloud-brain/brain-usage.ojs` and name one method, `usage.account`.
- `tests/tools/usage-service-row-in-the-docs-module.test.ts`, new, 4 tests.

Not changed: `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, whose line of
services has had `usage (since 2026-10-13, …)` since `cu-2-usage-service`.

## What the row rests on

Each sentence of the row is held to the seed's text by the third test, not to a run of the service:

| the row says | the seed's first cell says |
|---|---|
| What the Cloudflare account was billed for, by product, read from Cloudflare's billable usage. | "what the Cloudflare account was billed for, by product, read from Cloudflare's billable usage API" |
| a row of its answer is one product and one charge period | "A row is one product and one charge period." |
| with its quantity and cost | the table of kept fields: `quantity`, `cost` |
| two days, `from` and `to`, or neither for the current billing period | "With neither, Cloudflare answers the current billing period." |
| The figures are the whole Cloudflare account's, which holds more than this Brain. | the same sentence |
| It answers the owner, or a token of the owner that names the method. | "The owner, or a token of the owner that names the method (`caller.id == "owner"`)." |
| It keeps no rows. | "It keeps no rows and has one method." |

The second test reads the manifest of the seed: one method, `usage.account`, a query, with the rule
`caller.id == "owner"`. The fourth holds the 12 rows the table had, in their order.

`usage.account` was not called by this task. Its first answer on cb4 is in
`tools/cloud-brain/records/cu-2-usage-service.md`.

## The row, drawn

`cloud-brain-docs` has no `test_*` cell, as `tp-4-docs` found. Run again on this build, ended 07:15:54:

```
bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain-docs
tab-tests: @tomlarkworthy/cloud-brain-docs was not defined with a test_ cell in 120 s; …     exit 70
```

So "its tests pass in the tab", of the issue, has no test to run. The build was opened with that
module in the one pane, in a local headless Chrome, by the script of `tp-4-docs` with the name of
the row changed (`tools/cloud-brain/.emitted/impl-d1b8cc-usage-row-drawn.ts`, not committed). After the rebase
on `origin/main`, on a build made then, 07:17:04:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html
bun tools/cloud-brain/.emitted/impl-d1b8cc-usage-row-drawn.ts tools/cloud-brain/.emitted/cloud-brain.html
{"errors":0,"h2":16,"rows":13,"index":12,"before":"brain-dashboard",
 "link":{"text":"brain-usage","title":"@tomlarkworthy/brain-usage","href":"#open=@tomlarkworthy/brain-usage"},
 "code":["usage.account","from","to"],"text":"What the Cloudflare account was billed for, by product, … It keeps no rows."}
```

`errors` is the count of `.observablehq--error` in the document; `rows` the rows of the table. The
link was not clicked. `rows` was 12 before: the fourth test names them.

## The search for other mentions

`git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
before this record was written: `brain-usage` 9 lines, `brain-x-usage` 12, `usage.account` 13,
`Services outside the core` 1. The lines are the knowledge page's line of services, the spec
`plan/cloud-brain-cloudflare-usage-read.md` and the records of `cu-1`, `cu-2` and `tp-4-docs`.
None says what the docs table has, so none was made untrue.

## Prior art

Three searches of the Brain, `knowledge.search?semantic=true` as `loop-knowledge`, 07:12: "docs
module row for a service services outside the core", "cloudflare billable usage account
usage.account", "docs name the service modules table cloud-brain-docs". The second answered
`doc:cloud-brain-cloudflare-usage-read` first, the third `module:tomlarkworthy:cloud-brain-docs`.
What was used is the record and the test of `tp-4-docs`, found by `git log` of the seed: the shape
of this test and the drawn check are theirs.

## Tests

Both after the rebase and with this record in place, before this section was filled in:

```
bun test --timeout=30000 ./tests/tools/usage-service-row-in-the-docs-module.test.ts     4 pass, 0 fail
tests/tools/suite.sh              1086 pass, 0 fail, "Ran 1086 tests across 111 files. [116.57s]", ended 07:19:25
```

The count submitted is the suite's. No line `skipped:` in its output.

## Not tried

- The row in the docs tab of cb4: the shell is not posted by a writer.
- The link of the row, clicked. On cb4 the shell loads `brain-usage` from its Worker; in a build
  from disk the module is in the file.
- `usage.account` on cb4, and whether its answer is as the row says: the row is held to the seed's text.
- `/llms.txt` of the kernel and `getSource?worker=brain-x-usage&part=reference` were not read.
