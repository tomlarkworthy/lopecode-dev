# Cloud Brain: an answer that was cut says so, and says how the rest is read

Spec of the project `answers-cut-and-not-said` on cb4's tracker. Written 2026-10-12 between 10:12
and 10:27 CEST (the move to `spec` is event 3925, 10:12:03), from `lopecode-dev` `5351e624`,
`cloud-brain-dev` `06a4a2b`, and the tracker's record up to event 3928. The code was read at `5351e624`; `origin/main` moved to `f4428237` while this was written (briefs,
tests and one script, no seed and none of the files cited), and the line numbers given for the
briefs are of `f4428237`. Nothing here is built.
Names are proposals. Each number under "What exists today" has the command that gave it beside it,
run by the writer with the token `spec-7040d5` unless it says otherwise.

## What was asked

The owner gave no words for this project. It was opened by the overseer of events 3681 to 3896
(event 3906, token `over-10838d`), and its body is that overseer's reading:

> What the parts have in common: a tool or a method gives the first part of a text, a value or a
> list as if it were the whole. The reader acts on the part, or runs again to get the rest.

and, as what is not known:

> whether one shape serves all six (a mark with the full length and a way to ask for the rest);
> what else cuts. Not searched for: other .slice( on an answer in tools/cloud-brain.

The line of `philosophy.md` it is filed against is the third, Tom, 2026-10-10: "self documenting
and "obvious" how to use it from an agents perspective." The owner's words that led to two of the
parts are his note on the page of 2026-10-11 (`fb-a2vp4smwzq`): "it should have access to
cloudbrain-dev and the knwledge base and be more aware of how things work than it currently does,
not with a big system prompt but to points of where to get more information from".

## The reports gathered

`list?parent=answers-cut-and-not-said` answers three issues. The body names three more places that
were seen and not filed.

| Report | What it says | What it becomes |
|---|---|---|
| `seen-knowledge-get-cuts-long-guides` (feedback, open) | A guide over 16000 characters is answered cut, with no sign. The reviewer did not read whether `knowledge.get` marks it | R1, task 4. The report has the place wrong: the service refuses a longer text, and the tool that puts the docs cuts before the put ("What exists today", 1) |
| `seen-operator-tools-capped-at-8000` (feedback, open) | The page's agent loop shows 8000 characters of a tool's answer, the first and last 4000, with a marker that names grep and sed. Of the four tools of `cloud-brain.ojs` none lifted it | R1, task 3, for the three tools that still do not. `brain_call` was mended on 2026-10-11 by `fb-a2vp4smwzq`, rounds 2 and 3 |
| `test-ts-cuts-returned-value` (bug, done, review 3698) | `test.ts` cut a value at 120 and an error at 600 with no mark | Nothing to build. In force since `cloud-brain-dev` `06a4a2b`. Its mark is the shape R1 takes for a line a person or an agent reads |
| `tab-tests.ts` line 85, in the body | A failed test's message is cut at 400 with no mark. One reviewer ran a probe a second time for it | R1, task 1 |
| `issue.list`, in the body | 100 issues are answered and nothing says more remain. One reviewer's search for an open ticket covered those 100 | R2, task 2 |
| `issue.sync`, in the body | 200 events a call. The sign that more remain is the answer's `seq` against the last event's, which no brief says. One writer and two overseers met it | R2 and R3, tasks 2 and 5 |

## What exists today

### 1. The docs of the knowledge base: 39 of 82 are cut, by the tool and not by the service

`knowledge.put` does not cut. A text over the limit is refused (`brain-knowledge.ojs`,
`knowledgeEntry`):

```
if (typeof v !== "string" || v.length > max || …) return { error: `${k}: text of ${max} characters at most…` };
```

The cut is one line of the tool that puts the docs (`tools/cloud-brain/knowledge-docs.ts`, line 75,
`TEXT = 16000`):

```
const text = [topics && "Topics: " + topics, body.replace(/^# +.+\n/m, "").trim()].filter(Boolean).join("\n\n").slice(0, TEXT);
```

`knowledge.get` answers `view(r)`, which is the row; it has no field that says a text was longer.
So the service cannot mark what it was never sent, and the mark has to come from the caller that
cut.

Counted 2026-10-12 between 10:17 and 10:26 CEST (the time of the run was not read) with one line added to the worktree's copy of the tool, which printed
each doc whose text was over `TEXT` before the slice, run as `knowledge-docs.ts status`, and then
taken back:

```
cut docs 39 characters not entered 882790 of 1506790 in those docs
CUT module-exporter-runtime-self-serialization 17103     the shortest of them
CUT svg-editor-architecture 186433                       the longest
```

`status` the same minute: `{"docs":82,"fresh":82,"stale":0,"missing":0,…}`. By directory, counted
with a script of the session's over `git show origin/main:<path>` (not the tool; it gave 38, and
the tool's 39th is `philosophy.md` of `cloud-brain-dev`, 17,893 characters): 13 of the 53 files of
`knowledge/` and 25 of the 26 `plan/cloud-brain-*.md`. The second number is the one that costs the
loop: a spec writer who reads an earlier spec through the Brain reads its first 16000 characters.

What the cut does not touch: search by meaning. The service embeds
`(title + "\n\n" + text).slice(0, V.chars)`, 1500 characters (`brain-knowledge.ojs`, line 328), so a
doc's vector was never made from the part that is missing. Search by words reads the kept text, so
a word that is only past character 16000 does not find its doc.

An agent of the loop has the file in its checkout. The reader that has only the entry is the
operator of the page, which `fb-a2vp4smwzq` pointed at `knowledge.search` and `knowledge.get`, and
a caller from outside.

Where the whole of a doc is: the entry's `url` is the file on GitHub
(`https://github.com/tomlarkworthy/lopecode-dev/blob/main/<path>`), a page of HTML. The file's
text is at `https://raw.githubusercontent.com/tomlarkworthy/lopecode-dev/main/<path>`: fetched
2026-10-12 for `knowledge/reading-a-list-from-a-paged-web-api.md`, which answered the file. That a
page of the Brain's origin may read that address (CORS) was not tried. The three files of
`cloud-brain-dev` have the Brain's git address as `url`, which gives no file by address.

Three other callers cut before a put. None was reported:

| Caller | Cut | Where the whole is |
|---|---|---|
| `summarize-papers.ts` (`TEXT_MAX = 16000`) | the text as entered, after the summary, "cut so the whole is 16000 characters" | the entry's `file` in `brain-static`, and the line "As entered before the summary:" stands before the cut part |
| `brain-snapshot.ojs` line 203 | an arXiv abstract at 16000 | no abstract of that length was looked for |
| `brain-library.ojs` line 109 | a module's card: 900 characters of prose, 60 cell names, 4000 in all | a card is a summary by design; its `file` is the notebook |

### 2. The tools the page registers for the operator: one of four is mended

The loop of `robocoop-5-core` (as cb4 serves it, `cloud-brain-dev/deploy/@tomlarkworthy/robocoop-5-core.js`):

```
function truncate(text, limit, how = 'use grep/sed to narrow') { …
      '\n...[' + cut + ' bytes truncated — ' + how + ']...\n' + …
let output, cap = toolOutputLimit;                                  // 8000
if (Number(r?.outputLimit) > 0) cap = Number(r.outputLimit);
```

`grep -c outputLimit tools/cloud-brain/cloud-brain.ojs` is 4: a comment, `callAnswer`'s return and two lines of its tests. The two `brain_call` tools return
through `callAnswer`. Its last line when there is more:

```
[characters 0 to 20000 of 27094. The rest: the same call with offset 20000]
```

`brain_services`, `brain_status` and `brain_apply` return `{ title, output: JSON.stringify(…, null, 1) }`
and no `outputLimit` (`cloud-brain.ojs`, `assistantTools`), so each is shown at 8000 with the
grep and sed marker. `attention_draft` and the watch already mark their own cuts
(`attentionLimits`, "[the first 3000 of N characters. The rest: brain_call issue.get …]").

**Not measured: how long the three answers are.** `brain_services` is `viewof services.value`
whole, a row for each of 24 declared Workers with its methods, paths and secrets, read with the
owner's session in his tab. No token of the loop reads it, and a notebook opened from a file has
no `brainOrigin`. The report did not measure it either ("their length was not measured"). The
check below stands a list of rows in for it.

`eval_js` cuts a text at 6000 and says `…(+N chars)`. It is `robocoop-5`'s, which the loop does not
change (`rules.md`, Never), and the operator's brief says how to read past it since
`fb-a2vp4smwzq` round 3.

### 3. The tracker's two lists

Run 2026-10-12 between 10:12 and 10:17 CEST, each `tools/cloud-brain/issue-as.sh spec-7040d5 "<query>"`:

```
list                    100 issues   107,927 bytes   keys: issues
list?limit=500          345 issues   387,411 bytes   keys: issues
list?limit=501          345 issues                   (501 is read as 500, and nothing says so)
list?state=done&limit=500   168
sync?after=0            seq 3926, 200 events, the last is 200      keys: seq, wait, events
sync?after=0&limit=500  seq 3926, 500 events, the last is 500
sync?after=3900         seq 3926, 26 events, the last is 3926
snapshot                345 issues   514,946 bytes   0.41 s
```

- `issue.list` has no field beside `issues`. The default is 100 and the most is 500
  (`issuesLimits.page`; `brain-issues.ojs`, the handler of `list`). The record is 345 issues,
  46.3 hours after its first open (`opened_at` 1791626006727), which is 7.5 an hour. At that rate
  `limit=500` stops answering every issue in about 21 hours of the loop running.
- `issue.snapshot` answers every issue the caller may read, with the body of a closed one left out
  and `bodyLeftOut: true` in its place. It takes no filter.
- `issue.sync` says there is more only through `seq`. The tools that follow it already page:
  `issue-stats.ts` and `cost-events.ts` ask `limit=500` in a loop, `issue-wait.sh` follows "a full
  answer … at once by the next". What does not say so is the prose an agent reads:
  `agents/overseer.md` lines 18 and 148 give `io "sync?after=<seq>"` and no more, and the method's
  row of the reference gives `{ seq, wait, events }` with no sentence on a second page.
- `issue.runs`, added 2026-10-12, is the tracker's own answer to the same question:
  `{ runs, total, more }`, "`more`: runs past this page match; the next page is `after=` the `seq`
  of the last run read", and a `limit` out of range is 400.

### 4. The local tools a reviewer reads a failure from

`grep -n "slice(0, [0-9]*)" tools/cloud-brain/tab-tests.ts tools/cloud-brain/verify-run.ts`,
the cuts of a message (the others there are hashes at 12):

| File, line | What is cut | At |
|---|---|---|
| `tab-tests.ts` 85 | a failed test's message | 400 |
| `tab-tests.ts` 124 | the first line of why a cell did not emit | 300 |
| `tab-tests.ts` 112, `verify-run.ts` 197 | a page error | 160 |
| `verify-run.ts` 124 | a failed test's message, in the count by test | 200 |
| `verify-run.ts` 207 | why a run had no verdict, first line | 200 |
| `verify-run.ts` 211 | a failed test's message, in a run's line | 160 |

None carries a mark. `cloud-brain-dev/test.ts` since `06a4a2b`:

```
const cut = (text: string, n: number) => (whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`);
```

### 5. What else cuts

Searched 2026-10-12 in the worktree: `.slice(0, N)` with N of two digits or more, `head -c` and
`cut -c`, in `tools/cloud-brain/*.ts`, `*.sh`, `cloud-brain-dev/*.ts` and outside the tests of
`tools/cloud-brain/*.ojs`. About 150 lines, not counted closer; many are a hash cut to 12. Sorted by
who reads the result:

- **A cut that already says so.** `browser.text` and `container.exec` answer `truncated: true`;
  `db.list` and `issue.runs` answer `more`; `knowledge.list` answers `cursor`; `issue.snapshot`
  answers `bodyLeftOut`; `callAnswer` and the operator's attention text end with a line in
  brackets; `test.ts` ends with `(cut: …)`.
- **An error's text bounded for a log line or a row**, about 60 lines in the seeds at 120 to 500
  characters (`String((e && e.message) || e).slice(0, 300)` and the like). Left out: such a text is
  what went wrong in an upstream's words, no report names a reader that acted on one, and the
  bound keeps a log line and a row small.
- **A panel of the page drawn for the owner's eye** (`cloud-brain.ojs` 660, a log line at 400;
  `brain-container.ojs` 474, a run's output at 4000). Left out; the method under each answers whole
  or with `truncated`.
- **The same kind as the six, and not reported**: `brain.ts` 130 (an answer that is not JSON, at
  600) and 270, 301, 321 (an answer at 300 or 400), which are the owner's commands;
  `cloud-brain-dev/test.ts` 71 (why a module did not load, 300) and `all.ts` 17 (200);
  `knowledge.list?stale=true`, one page of 100 with no `cursor` and no `more`
  (`knowledge-vectors.md` says so; the service's row of the reference says "one page and no
  cursor"); the failed test's message in a deploy's verdict (`brain-shell.ojs` 163, 300, and the
  `reason` of `deploy.report` at 300), where the name of the test is whole. Left out, each to be
  opened as a part when a report names it.

So the body's "six places" are four kinds of place and thirteen edits: one putter of four, three
tools of four, two list methods, and seven lines of two local tools.

## Read

**The Brain, `knowledge.search?semantic=true` with `loop-knowledge`, 2026-10-12, four searches:**

| Words | Found | Used |
|---|---|---|
| "a long answer is cut and the reader is not told truncation mark" | nothing above 0.55; `doc:cloud-brain-texts-not-read-again-after-a-change` at 0.50 | nothing |
| "pagination cursor more remain list limit" | `doc:reading-a-list-from-a-paged-web-api`, 0.795 | read whole (`knowledge/reading-a-list-from-a-paged-web-api.md`). It is the same defect from the caller's side: "nothing errors: the cells compute and the numbers look plausible", and an account under one page hides it, as the tracker under 100 issues did until 2026-10-11 |
| "tool output limit truncated agent context offset" | `module:tomlarkworthy:robocoop-5-core`, 0.801 | its `truncate` and `outputLimit`, read in the module cb4 serves; quoted above |
| "entry text 16000 characters long document split into sections chunks" | `doc:cloud-brain-paper-summarizer-persona`, 0.787 | read where it measures the cut: 56 of 63 papers "at the limit of 16000 characters", and that questions from past the kept part were still answered by rank after a summary was put first. It is why splitting a doc is not chosen below |

**Outside, one web search** ("API pagination design next_page_token has_more cursor AIP-158 Model
Context Protocol nextCursor"), read in the search's summary only, no page opened:

- Google's AIP-158 (`https://aip.bybutter.com/158`, `https://linter.aip.dev/158`): a method that
  returns a collection has pagination from the start, "as it is a backwards-incompatible change to
  add pagination to an existing method"; the answer's `next_page_token` is left out when there is
  no further page; the default and the most of a page are documented. Used: adding a field that
  says more remain is not a breaking change, while making `list` refuse what it took is; and the
  default is in the reference.
- Nothing was found on the Model Context Protocol's `nextCursor`. Not searched again.

No literature was looked for on marking a cut text. The shapes in use in this repository were
enough to choose from.

## Requirements

| | Requirement | From |
|---|---|---|
| R1 | A text that was cut says so where it was cut: how much is shown, how long the whole is, and a way to the rest that the reader has. A way the reader does not have (grep for a tool with no grep) is not one | all three parts; line 3 |
| R2 | A list that did not answer everything that matches says so in the answer, with how many match or how the next page is asked | the body's `issue.list` and `issue.sync` |
| R3 | The prose an agent reads before it calls a list says the size of a page and the sign that more remain | the body's `issue.sync`: "which no brief says" |
| R4 | Nothing that is whole today is cut, and no caller that works today is refused | AIP-158, above; `rules.md`, `major` |

## The design

The body asks whether one shape serves all six. It does not, and the repository already has the
two that do:

- **A field, for an answer a program reads.** `more: true` and `total`, as `issue.runs` has them.
- **A last line in the text, for a text a person or a model reads**, since a model shown a text
  has no field beside it. `test.ts`'s `… (cut: 120 of 1421 characters; --whole prints all)` for a
  line of a tool, and `callAnswer`'s `[characters 0 to 20000 of 27094. The rest: …]` for a tool's
  answer in the page.

Each place takes the one that is already beside it.

### The local tools (R1)

`tools/cloud-brain/cut.ts`, one function, the text of `test.ts`'s:

```ts
export const cut = (text: string, n: number, whole = false) =>
  whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`;
```

`tab-tests.ts` and `verify-run.ts` take `--whole` and use `cut` at the seven lines of the table.
One of them runs in the page (`tab-tests.ts` line 85 is in `runTests`, which is passed to
`page.evaluate`), where an import of the tool is not in scope: `runTests` takes `whole` in its
argument and has the expression in its body, and the test holds the two texts equal. The other six
are in node.

A failed test's message reaches `verify-run.ts` already cut at 300 with no mark, by the page
(`brain-shell.ojs` line 163, `message: String(…).slice(0, 300)`). So the mark of lines 124 and 211
says how much of what the tool received is shown, and `--whole` prints what it received, 300 at
most. `brain-shell` is a module of the shell, posted by the orchestrating session alone
(`rules.md`, "Two standing leaves"); its cut is under "What else cuts" and is not in this task. The
task's writer says this in the header of `verify-run.ts`.

`test.ts` keeps its own copy. It is a file of another repository that is run with nothing of
`lopecode-dev` beside it.

### The tracker's lists (R2, R4)

In `brain-issues.ojs`, two answers gain fields and nothing else changes:

```
issue.list   { issues, total, more }    total: how many issues match the filters and may be listed;
                                        more: total is over the issues answered
issue.sync   { seq, wait, events, more } more: the last event answered is before seq; false with
                                        no events, and in the answer that has reset: true
```

The reference's two rows say the default, the most, and what to do when `more` is true: for
`sync`, the same call with `after=` the `seq` of the last event; for `list`, a `limit` up to 500, a
narrower filter, or `issue.snapshot` for every issue.

`issue.list` gets no second page. The whole is one call of `issue.snapshot` (345 issues, 0.41 s),
and the largest filtered list today is `state=done`, 168. A `limit` over 500 is still read as 500:
`more` then says what was left out.

Neither is `major`: no caller's call changes and no answer loses a field. The page's copy
(`issuesPanel`) reads `wait`, `reset` and `events` of a sync and is not changed. No test compares a
whole answer of either method with `toEqual` (read by the fresh review, below).

### The operator's tools (R1)

In `cloud-brain.ojs`, `brain_services` and `brain_status` take `offset` and return
`{ title, ...callAnswer(out, offset, "query") }`: both are reads, so the rest is the same call with
the offset, 20000 characters at a time. Their `parameters` are `properties: {}` today: each gains
`offset: { type: "number" }`, and each description gains the sentence `brain_call`'s has ("An
answer is shown 20000 characters at a time and its last line says when there is more"). `brain_apply` returns
`{ title, ...callAnswer(out.results, 0, "procedure") }`: its long answer ends "The rest is not
read: a procedure called again would run a second time", as `brain_call`'s does. With these, the
only tool of the page that returns no `outputLimit` is `attention_draft`, whose answer is one
short line, and the grep and sed marker is shown for an answer of none of them. An error a tool
throws is still cut by the loop at 8000 with that marker (`robocoop-5-core`, the `catch` of the
tool call); none of that length was seen.

(As built, `ac-3-operator-tools-through-call-answer`, 2026-10-12: as above, and two things more.
`brain_apply` refuses an `offset` before it emits or applies, as `brain_call` does for a procedure;
`callAnswer` shows an answer of `undefined` as an empty text. The function is `operatorTools({ brain,
client, services, declared, origin, attention })`. The three tools were not run in the owner's tab;
the record.)

The three tools are closures in the cell `assistantTools` over `brain`, `client` and
`viewof services`, and each calls `need()` first, which throws with no owner session. A test
cannot reach them. So the task moves the list into a function of what they close over, as
`turnTool(turn)` is for a turn's `brain_call`, and `assistantTools` calls it with the page's own;
the test calls it with a `brain`, a `client` and a `services` of its own.

Each is asked again by an offset, and the answer may have changed between the two calls:
`brain_status` has `secondsAgo` and `secondsLeft`, which differ on every call, and the services may
have changed. The second part is then of another text. The last line gives the whole's length, so a
changed length shows; a change of the same length does not. Not mended here.

### The docs (R1)

In `knowledge-docs.ts`, a doc whose text is over `TEXT` is cut so that the text with its last line
is `TEXT` characters, and the last line is (the first number here is made up; it is `TEXT` less
the line's own length):

```
[the first 15850 of 186433 characters of this entry's text. The whole is the file knowledge/svg-editor-architecture.md: https://raw.githubusercontent.com/tomlarkworthy/lopecode-dev/main/knowledge/svg-editor-architecture.md]
```

The two numbers are of the text the tool makes (the topics first, the heading taken out), not of
the file: an offset into one is not an offset into the other, and the line does not say it is.
(Since `sd-1-doc-files`, 2026-10-12, the line names the file the Brain keeps in place of that address:
`The whole is the file <file> in this Brain's brain-static: static.get?path=<file>`; `tools/cloud-brain/records/sd-1-doc-files.md`.)

For the three files of `cloud-brain-dev` the whole is named as the file and its repository
(`philosophy.md` of `<the submodule's url>`), since no address gives it.

`status` and `put` count them: the last line of each gains `cut`, the docs whose text was cut, and
`status` gains `unmarked`, the cut docs whose entry does not end with the line the tool would put.
An entry is `fresh` by the SHA-256 of its file and by `public`, which a change to the tool does not
move, so the
task puts the cut docs once (`put <name>…`, $0.00005 a doc whose text changed) and `unmarked` is
what shows it was done. (As built, `knowledge-docs-put-stale-skips-unmarked`, 2026-10-12: `put --stale`,
which every release of a landing runs, also puts an unmarked doc; the record.)

The line adds its words ("first", "characters", "whole", the path) to 39 entries of the search by
words. A match in the text counts once against four for the title and the id; no question set was
run on it. The vector is made again, since the service drops it when `text` differs (`brain-knowledge.ojs`,
the `vid` line of the put), from the same first 1500 characters as before.

### The prose (R3)

- `agents/overseer.md`, where it gives `io "sync?after=<seq>"`: 200 events an answer, 500 with
  `limit=500`; `more: true` says to ask again with `after=` the `seq` of the last event.
- `agents/overseer.md`, "Before you open one", and `SKILL.md`, step 3, "The owner's" (`list?label=owner&limit=100`):
  `more: true` says the list is not all that match.
- `knowledge/calling-a-cloud-brain-from-this-checkout.md`: one paragraph, the two shapes, and that
  a cut doc's last line names its file.
- The operator's brief (`assistantPrompt`) is not changed: a cut entry now says where its whole is,
  and the brief already says how an address is read with `eval_js`.

## Not chosen

- **A field on the entry (`textLength`, `cutAt`) in place of a line in the text.** The reader the
  report is about is a model shown `text`; it would read the field only if the brief told it to.
  And it is a new field of `knowledge.put`, a method three other callers use. Reopen when a program
  needs to tell cut entries apart without the tool.
- **A larger limit for `text`.** The longest doc is 186,433 characters. The words index and a D1
  row would hold it; what an entry costs to read through `knowledge.search` with a snippet, and
  through the operator's 20000 a call, was not measured. Not started without that number.
- **A long doc as several entries, one a section.** It changes what a search answers (several
  entries for one doc) and `plan/cloud-brain-paper-summarizer-persona.md` measured that a summary
  first serves questions about the rest. A design of its own.
- **The doc's file kept in `brain-static` and named in `file`.** The whole would then be read with
  a method of the Brain. It needs `static.put` on the token `loop-docs`, which today names
  `knowledge.put` and `knowledge.list`; a wider token for a reader that has an address already.
- **`after=<seq>` pages for `issue.list`, as `issue.runs` has.** A second order for the list (by
  `seq`, not last changed first) and a guard on `after`. `issue.snapshot` is the whole today.
  Reopen when a list with a filter passes 500.
- **`issue.list` and `issue.sync` refusing a `limit` over 500**, as `issue.runs` does. A caller
  that sends 1000 today is answered; R4.
- **A brief line alone for `issue.sync`, no field.** Three agents derived the sign from `seq` after
  meeting the cut. A field is read without the brief.
- **Changing the loop's `truncate` marker.** It is in `robocoop-5-core` (`rules.md`, Never). With
  the three tools lifted it is not shown for a tool of the page.
- **The other cuts of "What else cuts".** No report names them.

## How each requirement is known to be met

Each is a command an agent of the loop runs with its own token or with none. No tab of the owner's
is needed. Today's result is from a run of 2026-10-12; a result after a task is given only as what
the answer must hold, since none of the tasks is built.

| | Check | Today | After its task |
|---|---|---|---|
| R1, task 1 | `bun test ./tests/tools/tab-tests.test.ts ./tests/tools/verify-run.test.ts ./tests/tools/cut.test.ts` in the worktree | the first two with `knowledge-docs.test.ts`: 40 pass, 0 fail; `cut.test.ts` is not there | cannot be run before task 1. Run in the task's worktree: tests added that give each tool a message one character over its cut and expect `(cut: <n> of <n+1> characters; --whole prints all)`, and the message whole with `--whole`; each fails on the files of `5351e624` |
| R2, task 2 | `issue-as.sh <token> "list?limit=100"` and `"sync?after=0"`, on cb4 | keys `issues`; keys `seq, wait, events` | cannot be run before task 2 is deployed. Then: `list?limit=100` has `more: true` and `total` equal to the count of `issues` in `list?limit=500` while that is under 500; `list?state=spec` has `more: false`; `sync?after=0` has `more: true`; `sync?after=<seq>` has `more: false` and no events |
| R2, R4, task 2 | `bun test.ts brain-x-issues --with <the built module>` in the worktree's `cloud-brain-dev` | as deployed, `d53d1c8d7e47`: 36 passed, 0 failed, 15 need a browser | run in the task's worktree: no test that passes today fails, and a test of the two fields is among the passed (it needs no browser: it calls the service's rig) |
| R1, task 3 | `bun test.ts brain-x-page --with <the built module>` | as deployed, `595290468923`: 14 passed, 0 failed, 16 need a browser | run in the task's worktree: a test that gives `brain_services` a list of rows over 20000 characters and passes each answer through the loop's `truncate` with the `outputLimit` returned, as `test_brain_call_shows_a_long_answer_in_parts_and_the_loop_cuts_none` does; the parts joined are the whole and none holds "bytes truncated". The tools are reached through the function "The operator's tools" names, with a `brain`, a `client` and a `services` of the test's own, so no session is read. If the cell reads `brainOrigin` it is among those that need a browser, and is then run in a QA tab on the build |
| R1, task 3 | `grep -c "outputLimit\|callAnswer(" tools/cloud-brain/cloud-brain.ojs` | 4 and 6 (two commands, run apart) | not a count to meet; the writer gives the count of its run. What is checked is the test above. (As built, `ac-3-operator-tools-through-call-answer`, 2026-10-12: 7 and 9; the record.) |
| R1, task 4 | `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, last line | `{"docs":82,"fresh":82,"stale":0,"missing":0,…}`, no `cut` | cannot be run before task 4. Then: `cut` is the number of docs over `TEXT` at that commit (39 at `5351e624`, by the run above) and `unmarked` is 0 after the put. It reads `knowledge.list` with `loop-docs`, which answers each entry's text |
| R1, task 4 | `bun test ./tests/tools/knowledge-docs.test.ts` | in the 40 above | a doc of 16001 characters is put as 16000 that end with the line; one of 16000 is put as it is |
| R3, task 5 | `grep -n "more" .claude/skills/brain-maintenance/agents/overseer.md` at the lines of `sync?after=` | no line | the lines of "The prose" are there, and what cb4 answers is quoted from a call the writer made after task 2 |

Not checkable by the loop, and no condition of a task: whether the operator, in a turn with a
model, follows a doc's last line to its file. `fb-a2vp4smwzq` left the same thing untried in each
of its three rounds.

## Tasks, in the order they land

Each is one writer and one review. 1, 2, 3 and 4 do not wait for each other; 5 waits for 2 and 4.

1. **`ac-1-local-tools-mark-a-cut`.** `tools/cloud-brain/cut.ts`; `tab-tests.ts` and
   `verify-run.ts` at the seven lines, with `--whole`; tests. No seed, no deploy.
2. **`ac-2-tracker-lists-say-more`.** `brain-issues.ojs`: `total` and `more` of `issue.list`,
   `more` of `issue.sync`, the two rows of the reference, tests. A deploy of `brain-x-issues`.
3. **`ac-3-operator-tools-through-call-answer`.** `cloud-brain.ojs`: the tools as a function of
   what they close over, the three through `callAnswer`, `offset` in two schemas, a test. A
   deploy of `brain-x-page`.
4. **`ac-4-docs-tool-marks-a-cut`.** `knowledge-docs.ts`: the last line, `cut` and `unmarked`; its
   test; the one put of the cut docs with `loop-docs` through the tool; closes
   `seen-knowledge-get-cuts-long-guides` with what `status` then printed.
5. **`ac-5-prose-names-the-two-shapes`.** The lines of "The prose" in `agents/overseer.md`,
   `SKILL.md` and the knowledge doc. A writer of a task of an approved spec may change a brief
   (`rules.md`, "The files of the Brain an agent reads"). Closes
   `seen-operator-tools-capped-at-8000` when 3 is done.

## What only the owner can do

- Approve this spec.

Nothing else. No kernel, core, database or deployer is changed, no policy, no rule, no permission.
`brain-x-issues` and `brain-x-page` are deployed by the loop today.

## What the orchestrator makes

Nothing. The spec names no token: every check is run with the agent's own tracker token, with
`loop-docs` through `knowledge-docs.ts` as its header has it, or with none.

## The fresh review before submitting (2026-10-12, answered by 10:26 CEST)

One agent with none of the session's context read the file against the code it cites. Nine
findings, each checked in the code and each answered above: the three tools had no seam for a test
and no `offset` in their schema; a message reaches `verify-run.ts` already cut at 300; one line and
not two runs in the page; `brain_status` differs on every call; the `reset` answer of `issue.sync`
had no `more`; the last line's numbers are of the entry's text and not of the file;
`attention_draft` returns no `outputLimit`; `fresh` is also by `public`; the vector is made again.
It found the other citations to hold, and "40 pass, 0 fail" when it ran the three test files.

## Not tried

- `knowledge.get` was not called. `loop-knowledge` names `knowledge.search` only. That its answer
  has no mark is read from `view` in the seed.
- The three tools' answers were not measured in the owner's tab.
- No seed was edited or built. The fields and the last lines above are as designed, not as run.
- Whether `raw.githubusercontent.com` answers a page of the Brain's origin.
- The outside search was one query, read in its summary.
