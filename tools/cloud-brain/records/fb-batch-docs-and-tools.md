# fb-batch-docs-and-tools

Written 2026-10-13 by the writer of the issue (token `impl-d6880a`), round 1. The issue is a batch:
four feedback issues about the docs module and three local tools, gathered by title by a session
the owner was in (`out-5bc2ed`, event 6902) and read one by one by a judgment run (`orch-c41c97`,
comment 6964, "triage" below). This run made the mends that comment gave each entry. Every time
below is from `date`, in CEST.

**cb4 does not show the four new rows of the docs module.** `cloud-brain-docs` is a module of the
shell, which reaches cb4 with `brain.ts shell`: a session the owner is in posts it after the
review (`rules.md`, "Two standing leaves of a session the owner is in"). The rows were seen drawn
in a local build only. No Worker is deployed by this change, and the other three mends are tools
of the checkout.

## The four entries

| | Entry | Triage | What this run did | Test file |
|---|---|---|---|---|
| 1 | `seen-d1b8cc-docs-table-four-services` | mend | Four rows in the table "Services outside the core" of `cloud-brain-docs.ojs`, and a test that holds the module to `OWNED` of `build.ts` | `tests/tools/usage-service-row-in-the-docs-module.test.ts` |
| 2 | `seen-sd-2-summary-edges` | mend all four items | `knowledge-docs.ts`: a quoted summary line, `dueOf`, the `.running` file, one header sentence | `tests/tools/knowledge-docs-summaries.test.ts` |
| 3 | `seen-deploy-waits-shows-opening-list` | mend items 1 and 2, leave 3 and 4 | `waiting-deploys.ts`: the list is a comment from the opening on and stays the last comment; `done` and `reverted` are left | `tests/tools/waiting-deploys.test.ts` |
| 4 | `seen-cellwise-placeholder-numbers` | mend | `triage/cellwise.ts`: `sameDef` reads `$0`, `$1` as the inputs they stand for | `tests/tools/cellwise-placeholders.test.ts`, new |

Each entry is closed by this writer after the push, with a comment that names its row here: the
close is an event of that issue and is read there. Nothing was taken out to an issue of its own.

## Row 1: the docs module

The table had 13 rows. `OWNED` of `tools/cloud-brain/build.ts` names 26 modules, and four of them
were named nowhere in the module: `brain-snapshot`, `brain-knowledge`, `brain-git`, `brain-fly`.

- Four rows, after `brain-usage`, in that order. Each sentence is cut from the service's own seed.
  The test has the pairs (`HELD`): what the row says, and the words of the seed it rests on. A row
  with a sentence that is in no pair fails, and so does a method the row names that the seed's
  manifest has not.
- A new test reads `OWNED` and fails for a module with no `${mod("NAME")}` in the docs module.
  That is the rule triage asked for: named, in a row or in the prose. It does not ask for a row:
  `brain-static` and `brain-blob` are named under "Data" and have none.
- The test "one row for brain-usage, the last" now reads "after brain-dashboard", and the test of
  the rows' order has 17 names.

What a row says of who may call is the seed's table, not a call: `snapshot.run` "the owner's own
session", `snapshot.sources` "anyone". The two lines over the table still say "Each is an owner
service", which `snapshot.sources` is not; the row says so and the lines were not changed.

The rows drawn, in the build of this worktree, opened with the module in one pane in a local
headless Chrome (`tools/cloud-brain/.emitted/impl-d6880a-rows-drawn.ts`, not committed, attached to
the issue), on a build made after the rebase on `origin/main` at `ea677aea`, 21:24:48:

```
{"errors":0,"h2":16,"rows":17,"order":["brain-dashboard","brain-usage","brain-snapshot","brain-knowledge","brain-git","brain-fly"],
 "four":[{"link":["brain-snapshot","@tomlarkworthy/brain-snapshot","#open=@tomlarkworthy/brain-snapshot"],"cells":2,"code":["/static/snapshot/<day>/","digest-<day>","snapshot.run","snapshot.sources"],"chars":386},
  {"link":["brain-knowledge","@tomlarkworthy/brain-knowledge","#open=@tomlarkworthy/brain-knowledge"],"cells":2,"code":["knowledge.search","semantic=true","knowledge.put"],"chars":322},
  {"link":["brain-git","@tomlarkworthy/brain-git","#open=@tomlarkworthy/brain-git"],"cells":2,"code":["git.create","git.token","git","public","/git/NAME.git"],"chars":394},
  {"link":["brain-fly","@tomlarkworthy/brain-fly","#open=@tomlarkworthy/brain-fly"],"cells":2,"code":["loop","fly.status","fly.up","fly.down","FLY_API_TOKEN"],"chars":346}]}
```

`errors` is the count of `.observablehq--error` in the document, `order` the last six rows of the
table, `chars` the length of a row's text. `<day>` is drawn as text inside its code span. No link
was clicked.
`tab-tests.ts` was not run: the module has no `test_*` cell
(`grep -c '^test_' tools/cloud-brain/cloud-brain-docs.ojs` is 0).

## Row 2: knowledge-docs.ts

1. **A doc that quotes a summary's line.** `summaryOf` took the first line of the form
   `Summary by summarizer (…), <day>, of <path> as it was with sha256 <64 hex>.` anywhere in the
   kept text. It now takes the first such line that has the line `The whole doc is the file …`
   next after it, which is where `withSummary` puts the two. Not mended: a doc that quotes the two
   lines one after the other in its first 16,000 characters is still read as summarized. The
   header says so.
2. **Due by any commit since.** `dueOf` answered at the first commit after the version summarized
   that was over a tenth. It now compares that version with the newest commit, which is piece 2 of
   the spec ("between that version and `origin/main`"). When that is over, it is due since the
   oldest commit from which every commit to the newest is over: a doc that went over, came back
   and went over again is due since the second time. The other choice was the first commit that
   ever took it over, as before; that clock would fail `--check-summaries` at 24 hours for a doc
   that had been within a tenth for most of them.
3. **The `.running` file.** It was removed when the agent ended. It now stands until the doc's put
   has answered, and is removed on each way out of that doc's block: a put, a refusal, a failure,
   a `--dry` write, an error thrown.
4. **The header.** The sentence that said an entry answered with no text is put by `put --stale`
   now says it is left and named, as a sentence further down the same header does. A test reads
   both in the header.

The release of a landing runs `put --stale` with the worktree's copy of the tool, and a stricter
`summaryOf` could read a kept summary as none and put the doc over it cut. So cb4 was read with
both copies before the landing, `status` with `loop-docs`, which writes nothing, 21:32:49 to
21:33:01:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status          this change
the same with knowledge-docs.ts of origin/main                        before
both, last line: "docs":96,"fresh":96,"stale":0,"missing":0,"cut":1,"unmarked":0,"long":54,"summarized":53,"behind":17,
                 "due":["cloud-brain-design-process-for-services"],"refused":[],"files":96,"filesWrong":[],"source":"origin/main@5a9e34c1"
```

`diff` of the two outputs printed nothing: each of the 96 docs has the same line with both. The
53 summaries are read as summaries by the changed tool, and no doc that was due stopped being so.

## Row 3: waiting-deploys.ts

The owner's page shows an issue's body and under it the last comment (the entry's reading of
`brain-issues.ojs`; the page was not opened by this run). Triage has that the tracker has no call
that changes a body. Its grep, `grep -n 'issue\.\(edit\|retitle\|body\)' tools/cloud-brain/brain-issues.ojs`,
prints one line in this checkout, 2125, which reads `got.issue.body` to draw it and is no call.
The write calls of the writer's brief are `open`, `comment`, `attach`, `label`, `move` and `link`.
So the tool cannot keep a list in the body true.

- **Item 1.** `plan` opens an issue with a body that has no list (`opening`): what waits for him,
  that the list is the last comment, and that the loop closes the issue. The list is a comment in
  the same run, keyed `deploys/<worker>/list-0`. When the last comment of the issue is not the
  tool's, the same list is said again, so the list is the last comment again. The last line names
  each comment: `list said` at an opening, `list changed`, `list said again`.
- When the open is refused no list is sent for that Worker: the next run opens it and says the
  list. This was found by reading the loop of the writes, not met.
- **Item 2.** An issue at `done` or `reverted` is left as one at `rejected` is: no call is sent,
  and the last line has `deploy-waits-<worker> left as it is (<state>)`. Run through `--file` in
  the test with `done`. `rejected` and `reverted` are the same line of the tool (`LEFT`) and were
  run through `plan` alone; by that line a rejected issue is now named too, where until now it
  was left with nothing printed.
- The two issues open on cb4 keep their bodies, which are their first lists
  (`deploy-waits-brain-core`, `deploy-waits-brain-deployer`, read with `issue.get` at 21:23:26: both
  `open`, and the last comment of each is the tool's). `plan` still reads such a body as the list
  when the tool has no comment.
- Left, as triage has them, with what opens each again: whose reject it was, the shape of the
  tool's keys, and `ISSUE_AS_TIME_AHEAD=1`.

A comment by anyone on such an issue now costs one comment of the tool at the next landing. An
owner's answer and the list under it is what the page then shows; that is the cost of the side
triage took (`philosophy.md`, line 2) over a change to the row "To answer" of `brain-issues.ojs`.

## Row 4: cellwise.ts

`sig(def, inputs)` reads a parameter named `$n` as `inputs[its position]` and writes that input
in place of the name wherever the body's tokens have it. `sameDef` passes each side's inputs.
`waiting-deploys.ts` calls `sig(def)` with no inputs and is as it was. The shortcut
`a.def === b.def` is gone from `sameDef`: one text over `["viewof a", "viewof b"]` and over
`["viewof b", "viewof a"]` is two cells, and with the shortcut they were the same.

Parsed with acorn, as the file was: the parameters from the AST, the names from the token list.
A token after `.` or `?.` is a property and is left. A comment that names `$1` is compared as
written.

On the cell the entry is about, 21:20:20:

```
bun tools/triage/cellwise-diff.ts @tomlarkworthy/annotate lopebooks      prints no line "#####"
the same with cellwise.ts of before this change                          ##### DIFFER: a2Store
```

Over the corpus, `bun tools/triage/cellwise.ts --all-minority` with the file of before and with
this one, ended 21:20:36: 27 modules in each, and `diff` of the two outputs has one module,
annotate, whose `lopebooks canonical` goes from `differ 1` (`a2Store`) to `== OBSERVABLE`. No
other line changed.

## Tests

Each file with the change, and with the file of before in the tool's place:

```
bun test --timeout=30000 ./tests/tools/cellwise-placeholders.test.ts                  3 pass, 0 fail     before: 0 pass, 3 fail
bun test --timeout=30000 ./tests/tools/waiting-deploys.test.ts                        14 pass, 0 fail    before: 10 pass, 4 fail
bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts               18 pass, 0 fail    before: 14 pass, 4 fail
bun test --timeout=30000 ./tests/tools/usage-service-row-in-the-docs-module.test.ts   9 pass, 0 fail     before: 3 pass, 6 fail
```

How "before" was run: `CELLWISE_TS`, `KNOWLEDGE_DOCS_TS` and `DOCS` name the file of `HEAD` before
the change. `waiting-deploys.test.ts` imports the tool, so the file of before was given one line,
`export const opening = (_) => ""`, and the test's two paths were pointed at it for that run; with
no such line the file does not load (0 pass, 1 fail). The line of the refused open was checked
apart, with that one line taken out of the tool: 13 pass, 1 fail.

The whole suite, after the rebase and the last edit of a tool or a test. It was read by its last
12 lines, so a line `skipped:` above them was not looked for:

```
tests/tools/suite.sh      1307 pass, 0 fail, "Ran 1307 tests across 136 files. [195.88s]", ended 21:28:34
```

## The search for other mentions

`git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
lines printed: `sameDef` 4, `cellwise-diff` 8, `cellwise.ts` 6, `.running` 9, `a tenth` 20,
`noText` 3, `Services outside the core` 4, `waiting-deploys.ts` 9, `list changed` 3,
`deploy-waits` 12. Mended in this landing:

- `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, the item of `--file <token>`: the
  list as a comment, the two issues of before, the three states left.
- `knowledge/calling-a-cloud-brain-from-this-checkout.md`, three items: where the summary's line
  counts, how long the `.running` file stands, and what "changed by over a tenth" is read between.
- `knowledge/resyncing-modules-across-the-corpus.md`, under `cellwise-diff`: the placeholders.

Read and left: `agents/implementer/start.md` line 152 (`deploy-waits-<worker> opened`, or
`list changed`) is still what a landing prints, with `list said` after `opened` now.
`plan/cloud-brain-docs-summarised-for-search.md`, step 5 of piece 3, says the file is removed
"after", which is now after the put. The records are of their day.

## Prior art

Three searches of the Brain, `knowledge.search?semantic=true` as `loop-knowledge`: "cellwise
viewof placeholder $0 $1 input order DIFFER", "summary line of a long doc due a tenth of the lines
running file", "deploy-waits issue list comment owner page waiting-deploys". The second answered
`doc:cloud-brain-docs-summarised-for-search` first, whose piece 2 decided item 2 of row 2. Nothing
else that was answered bore on a mend. Used from the checkout: the record and the test of
`usage-service-row-in-the-docs-module` (the shape of the row test and of the drawn check), and the
script in `records/annotate-home-not-on-observable.md` that first read `$n` as its input.

## Not tried

- The four rows in the docs tab of cb4, and their links clicked.
- Any method a row names, called on cb4: the rows are held to the seeds' text.
- `knowledge-docs.ts` on cb4: `status` alone was run there (row 2); no `put` and no `summarize`. A
  `put --stale` that starts while a summary is being put was not run as two processes: the test
  reads that the file stands at the two calls of the put.
- A thrown error between the agent's end and the put: the `finally` is entered by the refused put
  and the refusal in the tests, not by a throw.
- `waiting-deploys.ts --file` against cb4 by hand. The release of this landing runs it; its line is
  in the writer's report.
- A deploy-waits issue at `done`, `reverted` or `rejected` on cb4: none is.
- `cellwise.ts` on a cell whose placeholder is shadowed by a name of its own body, and on a
  parameter that is a pattern (`{$0}`): such a parameter is left as written.
- A second push to Observable judged by `cellwise-diff` after this change.
