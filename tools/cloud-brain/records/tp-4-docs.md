# The docs name the topic service (`tp-4-docs`)

Task 4 of `plan/cloud-brain-topics-service.md`, the last of that spec. Written 2026-10-12 by a writer of
the issue loop, round 1. Docs and one test file; no Worker is deployed. Every time below is from `date`,
in CEST unless it says UTC.

**cb4 does not show the new row of the docs tab.** `cloud-brain-docs` is a module of the shell, which
reaches cb4 with `brain.ts shell`: the orchestrating session's, after the review (`rules.md`, "Two
standing leaves of the orchestrating session"). The row was seen drawn in a local build only.

## What was wrong

`brain-x-topic` has run on cb4 since tasks 1 to 3, and three documents did not say so. The test of this
task, run on the four files as `HEAD` had them before the edit (22:13:36):

```
DOCS=… HUB=… PROPOSAL=… BACKLOG=… bun test ./tests/tools/tp-4-docs.test.ts
(fail) the modules table of the docs has one row for brain-topic, after brain-inbox, …
(fail) the knowledge page lists topic among the services, with its reads, its seed and its spec
(fail) the knowledge page's table of documents names the spec as what was built from, …
(fail) the backlog no longer says the topics are not started
(fail) the proposal has one line at its head that names the spec and the five tasks, …
 2 pass
 5 fail
```

The two that pass there read the seed of the service alone.

## What changed

- `tools/cloud-brain/cloud-brain-docs.ojs`, the table "Services outside the core": one row for
  `brain-topic`, after the row of `brain-inbox`. Its sentences are cut from the first sentences of the
  service's own first cell, and name five methods: `topic.append`, `topic.read`, `topic.subscribe`,
  `topic.take`, `topic.done`.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, two places. "The shape, in six
  lines": `topic (…)` in the line of services, after `dashboard (…)`. "Where the documents are": the
  row that read "Proposal: topics (read, take, push) in place of one inbox; its step 2 is the design
  above" now names the spec as what the service was built from, and the proposal as what it replaced.
- `plan/cloud-brain-topics.md`: one quoted line under the title, with the spec and the five task ids.
  The line after it, "A proposal, not built. Written 2026-10-10 09:28 CEST…", is as it was: the file
  is the proposal of that day.
- `plan/cloud-brain-backlog.md`, the line of "Designs in progress (2026-10-10)" that read "Not
  started … Four choices in it are Tom's": it says what was built and what the line read before.
  The task does not name this file. It was found by the search below and was untrue since task 1.
- `plan/cloud-brain-topics-service.md`, task 4: an "(As built, …)" note for the two things above that
  the task's sentence does not name.
- `tests/tools/tp-4-docs.test.ts`, new, 7 tests.

Not changed: `tools/cloud-brain/brain-topic.ojs`. The spec says its first `md` cell "is the method
reference and is written with each task"; this task wrote nothing in it, and deploys nothing.

## The method reference against what cb4 runs

`getInfo?worker=brain-x-topic` with no account, 22:12: hash `89f54186cea0…`, `deployedAt`
`2026-10-12T19:51:49.808Z`, and 11 methods under `access`:

```
append create delete done list read receive subs subscribe take unsubscribe
```

The first table of the seed's first cell has one row for each of the 11 (the first test of the file;
a row there starts `| \`topic.NAME\` | procedure.` or `query.`). So the reference names what cb4
answers for. Whether each row says what its method does was not read by this task: that is the tests
of tasks 1 to 3b.

One read on cb4, `topic.list` with `--as loop-topic`, 20:13:15 UTC: 200, topics named `check.…` that
the earlier tasks left (`check.a`, `check.b`, `check.failed` first). No write was made on cb4.

## What the lines rest on

Each sentence added about the service is held to the seed's text by the test, not to a run:

| the docs say | held by |
|---|---|
| a rule for who appends, a rule for who reads; a position the reader keeps; a target named `NAME.receive`; one taker | the same words in the seed's first cell (test 3) |
| each `topic.NAME` the row and the knowledge line name | a row of the reference (tests 2 and 4) |
| "a member calls no `topic.*` method without his grant" | `MEMBER` in `cloudflare-iac.ojs` names no `topic.` (test 4). Not tried on cb4: no member was called as. |
| "the owner and a token of his create topics" | read in the seed's table "Names". No test of this file holds it. |
| "since 2026-10-12" | the records of tasks 1 to 3b, each dated that day. The first deploy's time was not read from cb4. |
| `loop-topic` "for the loop's checks, on topics named `check.…`" | the spec, "What the orchestrator makes". An agreement; nothing refuses another use. |

## The row, drawn

`cloud-brain-docs` has no `test_*` cell: `tab-tests.ts … @tomlarkworthy/cloud-brain-docs` on the build
was exit 70 after 120 s, "was not defined with a test_ cell" (22:16:03). So the build
was opened with that module in the one pane, in a local headless Chrome, by a script kept in the
worktree's `.emitted` (`tp-4-docs-drawn.ts`, attached to the issue). After the rebase on `origin/main`:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html
bun tools/cloud-brain/.emitted/tp-4-docs-drawn.ts tools/cloud-brain/.emitted/cloud-brain.html
{"errors":0,"h2":16,"rows":12,"index":1,"before":"brain-inbox",
 "link":{"text":"brain-topic","title":"@tomlarkworthy/brain-topic","href":"#open=@tomlarkworthy/brain-topic"},
 "code":["topic.append","topic.read","topic.subscribe","NAME.receive","topic.take","topic.done"], "text":"Named, ordered logs. …"}
```

`errors` is the count of `.observablehq--error` in the document; `rows` the rows of the table, 11
before. The link was not clicked.

## R9

The spec's check for this task: no seed but `cloud-brain-docs.ojs`, and the four Workers the loop does
not deploy are not moved by it.

```
git diff --stat origin/main HEAD      (before the record was added)
 knowledge/working-with-cloud-brain-remote-lopecode-cluster.md |  7 +-
 plan/cloud-brain-backlog.md                        |  2 +-
 plan/cloud-brain-topics-service.md                 |  4 +-
 plan/cloud-brain-topics.md                         |  2 +
 tests/tools/tp-4-docs.test.ts                      | 93 ++++++++++++++++++++++
 tools/cloud-brain/cloud-brain-docs.ojs             |  1 +
```

`cloud-brain-dev/deploy/services.json` as the rebase read it from cb4, about 22:14: `brain`
`76711b62e6ad`, `brain-core` `470753465969`, `brain-db` `bde50895fac7`, `brain-deployer`
`753641455e0b`. None is the hash the spec has under "before" (2026-10-11). This task made no apply, so
it moved none; who deployed them since was not read.

## The search for other mentions

`git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
before the record was written: `brain-x-topic` 72 lines, `brain-topic` 57, `cloud-brain-topics` 23.
Outside the two topic plans, the knowledge page and the records, the lines that name the proposal:

- `plan/cloud-brain-backlog.md:793`, "Not started": mended, above.
- `plan/cloud-brain-authority.md:18`, "The topics proposal is `plan/cloud-brain-topics.md`. Its step 2
  is this document.": true as written, left.
- `plan/cloud-brain-issues.md:11`, and four tables of searches in other specs: what was read on
  their day, left.

`tools/cloud-brain/spec-as-built-short.md` has a table of Workers with no row for `brain-x-topic`. It
has none for `brain-x-git` or `brain-x-dashboard` either, so it is not a list of every Worker; left.

## Prior art

Three searches of the Brain, `knowledge.search?semantic=true`, 22:11: "topic service docs line",
"named ordered log push take subscribe", "user-facing docs module services outside the core". The
first answered `doc:cloud-brain-topics-service` (1.0) and `doc:cloud-brain-topics`; the third
`module:tomlarkworthy:cloud-brain-docs`. Nothing but the spec and the seed was used. The shape of the
test and of the drawn check is that of `dsv-5-page-section` and `dsv-6-health-through-the-service`,
whose records were read.

## Tests

Both after the rebase and with the record in place, before this section was filled in:

```
bun test ./tests/tools/tp-4-docs.test.ts          7 pass, 0 fail
tests/tools/suite.sh                              731 pass, 0 fail, "Ran 731 tests across 75 files. [86.42s]", ended 22:18:06
```

The count submitted is the suite's. No line `skipped:` in its output. The test of this file that reads
the proposal's head also asks for a record of each of the five tasks, so it failed until this file
was written (6 pass, 1 fail at 22:13:36).

## Not tried

- The row in the docs tab of cb4: the shell is not posted by a writer.
- The link of the row, clicked. On cb4 the shell loads `brain-topic` from its Worker; in a build from
  disk the module is in the file.
- A member's call of a `topic.*` method on cb4.
- `/llms.txt` of the kernel and `getSource?worker=brain-x-topic&part=reference` were not read for
  whether they show the service.
- The knowledge page as the Brain's search has it: the release of the landing lock enters the docs,
  and the entry was not read back.
