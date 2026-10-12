# Cloud Brain: a long doc is entered as a summary written for search, and its whole is a file of the Brain

Spec of the feature `docs-summarised-for-search` on cb4's tracker. Written 2026-10-12 from 20:21
CEST (the move to `spec`, event 4253) to the time of its commit, from `lopecode-dev` `1b0d0553`,
`cloud-brain-dev` `ca5299a` and the tracker up to event 4325. `origin/main` moved twice while this
was written: to `e368e1c9` (`ac-3`), and at 20:33 to `a3e883dc`, where `ac-4-docs-tool-marks-a-cut`
changed the tool this spec is about, then `9185a722`. The worktree was rebased onto `9185a722` at
20:43 and what `ac-4` changed was read and run again there; each number says which commit it is of.
Nothing here is built. Names are proposals. Each number under "What exists today" has the command that gave
it, run by the writer with the token `spec-6ac003` or `loop-knowledge`. Every number under "The
design" that is a cost or a rate after the build is an estimate and says so: no summary of a doc
has been written.

## What was asked

Tom, 2026-10-12 19:01:16 CEST, the reason of his `approve` move on `answers-cut-and-not-said`
(event 4147), whole:

> A, we should summarize the doc for search, with a link to the original in file/blob storage

"A" answered comment 3944 there: approve the spec as written. Its B was "add a task that enters a
long doc in parts, so that the search has the whole text". He took A and named another way in the
same sentence: a summary, and a link. So entering a doc in parts is not what this is.

The day before, of the papers (event 1517, quoted in `plan/cloud-brain-paper-summarizer-persona.md`):

> Yes we need to upload a detailed summary of the whole paper as the embedded text. Our task  loop can do but it should use subagents on one paper at a time. We need a standard prompt for the subagent, this would be a new persona "paper summerizer"

He gave no words on who writes a doc's summary. This spec reads the two together: the loop's
subagents, one a doc, with a brief of their own. That is the writer's reading and not his words;
his approval of this spec is where he says otherwise.

## The reports gathered

`list?parent=docs-summarised-for-search` answers no issue (20:20 CEST). The issue is his request,
filed for him by the orchestrating session. Its body lists four things as not known, and they are
taken in the place of reports:

| Not known | Answer here |
|---|---|
| Who writes the summary, and what a run costs | One light agent a doc, the role `doc-summarizer`, started by a tool as `paper-summarizer` is. A paper cost $0.76 (below); a doc is expected to cost less and has not been measured. Task 2 measures three, task 3 ten, with a stop. R2, R6 |
| Whether the summary is written again when the doc changes | When more than a tenth of the doc's lines differ from the version summarized, not at each change: a long doc was changed 198 times in three days, by 1.9% of its lines at the median. Until then the entry names the version its summary is of. R6 |
| Whether a short doc is entered whole as now | Yes. 42 of 85 docs fit the entry and are searched by every word today. They gain the file and nothing else changes. R1 |
| What `knowledge.get` answers for such an entry | The entry, as now. Its `text` is the summary, one line that says so and names the file, and the doc's start. Its `file` is the path of the whole in `brain-static`. No method changes. R3 |

One issue is beside this and not a part: `ac-4-docs-tool-marks-a-cut`, task 4 of the spec he
approved, `done` at event 4325 (read 20:43). It changed the line of the tool that this design
changes again. "What `ac-4` left" below.

## What exists today

### 1. 43 of 85 docs are longer than an entry

`knowledge.put` refuses a text over 16000 characters (`brain-knowledge.ojs`, `knowledgeLimits.text`
and `knowledgeEntry`), and `tools/cloud-brain/knowledge-docs.ts` cuts before the put. Until
`a3e883dc` that was `.slice(0, TEXT)` on its line 75. Since then it is `marked()`, line 78, which
ends the cut text with a line and keeps the whole at 16000:

```
[the first N of M characters of this entry's text. The whole is the file <path>: <address on raw.githubusercontent.com>]
```

Counted 2026-10-12 20:32:02 CEST at `e368e1c9`, before that change, with one line added to the
worktree's copy of the tool, which printed each doc whose text was over `TEXT` before the cut, run
as `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, and taken back
(`git checkout` of the file; `git diff --stat -- tools/` then printed nothing). The tool's own last
line at `9185a722`, 20:43:08, has the same 43 as `cut`:

```
{"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":0,"entriesWithNoFile":[],"source":"origin/main@9185a722"}
long docs 43      characters in them 1,654,214      past the limit, entered nowhere 966,214      public 7
LONG calling-a-cloud-brain-from-this-checkout 16977      the shortest
LONG cloud-brain-answers-cut-and-not-said 32715          the median
LONG svg-editor-architecture 186433                      the longest
title of a long doc: 69 characters at the median, 183 at most
```

`plan/cloud-brain-answers-cut-and-not-said.md` counted 39 of 82 between 10:17 and 10:26 the same day. Four more in
ten hours: the specs written since.

By a script of the session's over `git show origin/main:<path>` at `1b0d0553` (82 files of
`lopecode-dev`, not the three of `cloud-brain-dev`; it gave 42 long): 14 are of `knowledge/` and 28
are `plan/cloud-brain-*.md`. 35 of the 42 are under 50,000 characters.

### 2. What the search finds of a long doc, inside and past the kept part

Two sets of ten questions, written by this writer from ten of the 42 (sorted by length, every
fourth from the third). Each is a detail in other words than the title's. Set K is from character
12500 of the text the entry keeps. Set L is from three quarters of the way through the doc and
never before character 16994. The sets are at the end of this file. Asked with `loop-knowledge`,
`limit=20`; a rank is the place of the wanted entry, 0 when it is not in the 20. Asked twice: at
20:24 and 20:28, and again at 20:43:29 after `ac-4`'s put of the 43 cut entries (each now ends with
the line above, and holds that line's length less of the doc's own text). The second asking:

```
2026-10-12 20:43:29 CEST   set K, inside the kept 16000
  semantic=true, all kinds   MRR 0.594   first 4   in 3: 7   in 10: 9    not in 20: 0    1 12 1 1 2 2 4 2 9 1
  by words, kind=doc         MRR 0.950   first 9   in 3: 10  in 10: 10   not in 20: 0    1 2 1 1 1 1 1 1 1 1
                             set L, past it
  semantic=true, all kinds   MRR 0.517   first 4   in 3: 7   in 10: 8    not in 20: 2    1 0 1 1 0 1 3 3 3 6
  by words, kind=doc         MRR 0.656   first 5   in 3: 8   in 10: 8    not in 20: 1    1 17 1 1 0 2 1 1 2 2
```

By words every rank is as it was twenty minutes before. With `semantic=true` three ranks moved by
one or two places (K: 1 to 2 and 8 to 9; L: 1 to 3) and the two MRRs were 0.646 and 0.583 the first
time: that order moves between two askings with no summary put, as the papers' pilot also found
(`records/ps-3-pilot-ten.md`, "one rank of set B had moved by one place in two hours").

**By words among the docs, a detail the entry keeps is found first 9 times of 10, and one it does
not keep 5 times of 10.** That difference is what the cut costs a search, and the second line of
set K is what a summary must not lose: a summary takes room in the entry that the doc's own words
hold now.

With `semantic=true` the two sets are near each other (0.594 and 0.517). The vector is made from the title
and the first 1500 characters (`brain-knowledge.ojs`, `index`, `knowledgeVectors.chars`), so it
holds neither set's passage. Ten questions by one writer, who also wrote this design: one rank
moved changes an MRR by up to 0.1.

### 3. How often a long doc changes

`git log --since=2026-10-10T00:00 --numstat origin/main` over the 42 long files, 20:22 CEST:

```
changes of a long doc (a file in a commit)   198     43 on 10-10, 83 on 10-11, 72 on 10-12
docs changed                                  29 of 42
docs changed, counted once a day              43      3, 21, 19
lines added and deleted by a change           9.5 at the median, 1.9% of the file's lines
changes of over a tenth of the file           66      first writings and rewrites (90% or more): 12
```

A summary written at each change would be 198 runs in three days. Simulated over the same commits
with one run of the summarizer at the end of each day, a doc counted when it is new or differs
from the version last summarized by more than a share of its lines:

```
written again on any change        42 runs in the three days
over a tenth of the lines          30
over a quarter                     28
```

A run every six hours gave the same 30 and 28. Most of the 30 are first summaries: 28 docs first
passed the limit in those three days. So the rate is set by new specs, about ten a day while the
loop runs as it did, and the threshold removes the small edits (12 of 42).

### 4. What a summary by a light agent has cost

The papers, the only measurement: `tools/cloud-brain/records/ps-3-pilot-ten.md` has ten for $7.78,
$0.36 to $0.58 for a paper accepted at once and $0.81 to $2.08 for one refused once (5 of 10), 33 s
to 82 s of the agent, on texts of 53,133 to 210,535 characters, model opus. The other 53 were put
for $40.25 (`plan/cloud-brain-paper-summarizer-persona.md`, the note under its task 4): $0.76 a
paper. Haiku was not measured on a summary: `records/ps-2-summarizer-role.md` line 66 says its
haiku agents "did not read the brief".

### 5. Where the whole of a doc is today

The entry's `url`: the file's page on GitHub, or for the three of `cloud-brain-dev` the Brain's git
address, which gives no file. The entry's `file` is empty and its `sha256` is the file's. The field
is made for this (`brain-knowledge.ojs`, "An entry"):

> `file`, `sha256` | the path of the kept copy in `brain-static`, 200 characters at most, and the SHA-256 of its bytes

`brain-static` keeps a file private until it is put public, serves a public one at
`/static/<path>` with `Access-Control-Allow-Origin: *`, and takes `?public=` on a put as "adds or
removes that one" (`brain-static.ojs` line 199). A token "reaches the paths the owner does, bar
`shell/` and `library/`". `curl -s -o /dev/null -w '%{http_code}'` of
`https://cb4.endpointservices.workers.dev/static/knowledge-docs/lopecode-dev/knowledge/notebook-programming-concepts.md`
answered 404 at 20:32 CEST: nothing is under that prefix.

The token `loop-docs` names `knowledge.put` and `knowledge.list`. `brain.ts token` refuses a name
that is kept ("a token … is kept already; "token revoke …" first", `brain.ts` line 500), and a
revoke of `loop-docs` would stop the docs step of every landing until it is made again.

### 6. What enters a doc

`lock.sh release land`, the last command of a landing, runs `knowledge-docs.ts put --stale --limit=30`
and is exit 0 whatever that prints (`lock.sh` line 171). `--limit` is the time one call to the Brain
may take (`knowledge-docs.ts`, header), and the step starts no agent: a summary of 33 s to 82 s by
an agent is not written there.

## Requirements

| | Requirement | From |
|---|---|---|
| R1 | The whole of every doc is a file kept by the Brain, and the doc's entry names it in `file` with its `sha256`. A doc that fits an entry is entered whole as now | "a link to the original in file/blob storage"; the body's third question |
| R2 | The entry of a doc too long for an entry has a summary of the whole doc as the first of its text, and its vector is made from the summary's first paragraph | "we should summarize the doc for search" |
| R3 | Such an entry says that its text is a summary, of which version of which file, and how the whole is read | the body's fourth question; `philosophy.md`, the third of the seven |
| R4 | The file of a doc that is not public is read by nobody the entry is not read by | `philosophy.md`, the first of the seven |
| R5 | What the search finds of a long doc today it still finds | set K by words, 0.950 |
| R6 | A summary is written again when its doc has changed by more than a tenth of its lines, by the loop, with no session's memory and no step for the owner. What it cost is on the tracker | the body's first two questions; `philosophy.md`, the second and fifth of the seven |
| R7 | A summary states nothing the doc does not | as R3 of the papers' spec |
| R8 | The agent that reads a doc reads no other file of the checkout or the machine | as R7 of the papers' spec: a doc quotes text from outside (a paper, a web page, an issue's body) |

## The design

Five pieces. The first two are changes to `knowledge-docs.ts`, and the first needs a token. The
third is two new files, a brief and a tool. The fourth is one printed line and a sentence in each
of two briefs. The fifth is the token. Nothing in a Worker changes.

### 1. Every doc's file is put to `brain-static` (R1, R4)

In `knowledge-docs.ts`, a put of a doc is two calls, in this order:

```
static.put?path=knowledge-docs/<source>/<path>&public=<true|false>&tags=knowledge-doc     the file's bytes, as git has them
knowledge.put { …as now, file: "knowledge-docs/<source>/<path>" }
```

`<source>/<path>` is `lopecode-dev/knowledge/<name>.md`, `lopecode-dev/plan/<name>.md` or
`cloud-brain-dev/<FILE>.md`. `public` is the entry's own (`in-notebook` in the frontmatter's scope)
and is sent on every put, as `true` or `false`: with `tags` given, the file's labels are replaced
by them (`brain-static.ojs` line 199, "`?tags=a,b` replaces them, `?public=` adds or removes that
one"), so a put that left `public` out would make a public doc's file private, and `public=false`
is what takes the label off a doc whose scope changed. The file first: when the second call fails the entry still has the old `sha256`, is `stale`,
and the next landing puts both again.

A doc is `fresh` when its entry has the file's `sha256`, the same `public`, and that `file`. So
every entry is stale once, at this task. Its writer runs `put --all` by hand and gives the time it
took: how long 85 calls of `static.put` take, one a file, is not measured, and a writer's landing
should not be the one that waits for them.

`status` reads `static.list?prefix=knowledge-docs/` and its last line gains `files` (docs whose
kept file has the doc's `sha256` and `public`) and `filesWrong` (the names of the others).

Not `brain-blob`: the entry's `file` is by its definition a path of `brain-static`, the papers'
tool already reads a kept file by `static.get?path=<file>`, and a path stays the same when the doc
changes, where a CID is new at each change and "a blob is kept until it is deleted".

Not under `cloud-brain-dev/`: that prefix is `put.sh`'s, with the token `loop-roles`, and every
file there is public.

A doc removed from the repository keeps its file and its entry, as its entry is kept today;
`status` names both (`entriesWithNoFile`). No delete is in the token.

### 2. The text of a long doc's entry (R2, R3)

For a doc whose text is over 16000 characters, in this order, 16000 characters in all:

```
<the first paragraph of the summary, at most 1498 - title length characters>

<the summary's sections, 5000 characters at most>

Summary by doc-summarizer (<model>), <day>, of <path> as it was with sha256 <hash of the file read>.
The whole doc is the file <file> in this Brain's brain-static, <n> characters: static.get?path=<file>, and /static/<file> at the Brain's address when the doc is public. Its start follows.

<the doc's text from its start, as the tool makes it today, cut so the whole is 16000>
```

- The first paragraph is the embedded text, whole: the service embeds the title and the first 1500
  characters. With the median title of 69 that is 1429 characters.
- The doc's start follows the summary, as a paper's text as entered follows its summary. About
  6,700 characters are the summary and the two lines, so about 9,300 of the doc's own words stay
  where 16,000 are now. Set K is from character 12500, which this removes from every one of its
  ten entries: R5 is checked on exactly what is lost.
- No tag. `tags` of an entry are only added to, and a doc that shrinks under the limit would keep
  one. The line is the mark, and `status` counts by it.
- A long doc that has no summary yet is entered as today, cut, with `ac-4`'s last line. Task 1
  changes what that line names as the whole (`more.whole` of `doc()`): the file of the Brain, with
  `static.get?path=<file>`, in place of the address on `raw.githubusercontent.com`. The three files
  of `cloud-brain-dev` have no such address today and are "named with its repository" (the tool's
  header); the Brain's file is one address for all 85.

**The docs step keeps a summary it did not write.** `knowledge-docs.ts put` reads the kept entries
already (`kept()`, `knowledge.list` with `loop-docs`, which answers each `text`). For a long doc
whose entry has the line `Summary by doc-summarizer`, it puts the kept text up to and including
that line, a second line made anew (the file's length now), and the doc's start as it is now. So a
landing that changes a summarized doc costs what it costs today, and the entry's `sha256`, `file`
and start are the new file's while the summary is of the version its line names.

**When a summary is due** (`due` in `status`, per doc):

- the doc is long and its entry has no summary; or
- the summary's line names a `sha256` that is not the file's, and the lines added and deleted
  between that version and `origin/main` (`git diff --numstat`, the version found as `staleSince()`
  finds one today, by the hash of the file at each commit) are over a tenth of the file's lines; or
  no commit has that version.

A doc that is due and has a summary is put with `staleSince`, the time of the first commit that
took it over the tenth, and `staleSince: 0` when its summary is written. So
`knowledge.list?stale=true&kind=doc` answers the docs whose summary is behind, to a reader with no
checkout. A summary behind by less than a tenth has no mark but its line.

A doc that shrinks to 16000 or under is entered whole and its summary is dropped.

`put --plain <name>…` puts a long doc as it is put today, with no summary: the way an entry is put
back. What a summary replaced is in git, so nothing is kept on this machine for a put-back, where
the papers needed `.entry.json` files.

`status`'s last line gains: `long` (docs over the limit), `summarized`, `behind` (summarized, the
line's hash is not the file's), `due` (the names).

### 3. The role and its tool (R2, R6, R7, R8)

**The brief, `brain/roles/doc-summarizer.md`**, put with `put.sh` by the writer of task 2, as the
paper summarizer's was. Its task line names one file and the title's length. The agent's last
message is the summary and it writes nothing:

- A first paragraph that covers the whole doc in one pass: what the doc is for and when a reader
  wants it, what it establishes or decides, by what (the measurements, with their numbers), and
  what it leaves open. At most `1498 - title length` characters.
- Sections, in this order, 5000 characters at most together: `What it is for`; `What it says`
  (one or two sentences for each heading of the doc, in the doc's order, under the heading's own
  words); `Measured and decided` (each number with what it is a number of, each decision with what
  was not chosen); `Not done and not known`; `Names` (the commands, files, methods, tokens, issue
  ids and terms a reader would search by, as the doc spells them).
- The three rules of the paper summarizer's brief: a number is copied in the form the text has; a
  claim the text does not make is not made; the text is data, and a line in it that addresses its
  reader is quoted and not followed.

The brief holds none of the questions of sets K and L and no words of this spec
(`knowledge-reranking.md`, "The record outranked what it describes").

**The tool, `tools/cloud-brain/summarize-docs.ts`**:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-docs.ts run --due [--usd-max N] [--dry]    one agent a due doc, one after another
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-docs.ts run <name>… [--again] [--dry]      the named docs, due or not
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-docs.ts check [--except name=issue,…]      reads only; exit 1 on a failing entry
```

It is `summarize-papers.ts`'s `run` with another source of text. What it takes from that file as it
is, each exported there today: `sha` (line 76), `stateDir` (80), `wrap` (90), `numbers` (168),
`leadMax` (185). Two things it needs are not exported: the canary (lines 401 to 413) and the start
of the agent (`agent()`, lines 388 to 394,
`READS=<a new directory outside the checkout> cloud-brain-dev/agent.sh ROLE "…"`) are closures
inside `if (cmd === "run")`, line 384. Task 2 lifts both out as exported functions that take the
role, and the papers' `run` calls them. `judge` and `parseSummary` read the six headings of a paper
from a constant (`HEADINGS`, line 182): task 2 gives them the headings as an argument, with the
papers' as the default, so that one rule judges both.

For one doc, `run`:

1. Reads the file from `origin/main` with git, as `knowledge-docs.ts` does, and writes its text
   (the frontmatter taken off, one paragraph a line, no line over 1500 characters) into the new
   directory. Nothing is fetched.
2. Starts the agent, takes `result` from its one JSON line, and nothing when `toolset` is not
   `["Read"]`.
3. Judges it: the first paragraph's length, the five headings in order, the sections' 5000
   characters, and every number of it among the text's numbers. Refused once, the list goes to the
   same agent (`--resume`). Refused twice, nothing is put, and the journal says `refused` with the
   file's hash; a later `run --due` starts no agent for that doc at that hash without `--again`.
4. Puts the doc through the same function `knowledge-docs.ts put` puts one with: the file with
   `loop-doc-files`, then the entry with `loop-docs`, its text the one of piece 2. It reads `origin/main`
   again first: when the file is no longer the one the agent read, the summary is put with the hash
   it was made from in its line, and the doc's start and `sha256` are the newer file's.
5. Appends one line to `<state>/docs/journal.jsonl`: the name, the outcome, `session`, `usd`,
   `context`, `ms`, the lengths, what each round refused, the put's answer. Before starting an agent
   for a doc it writes `<state>/docs/<name>.running` with the time and removes it after; a `run`
   that finds one under ten minutes old skips that doc, so two agents whose landings name the same
   doc do not both pay for it.

`check` reads the entries with `knowledge.list` (`loop-docs`) and fails an entry that has the line
and not: a first paragraph within its limit, the five headings in order, a second line that names
the entry's own `file`, a text of 16000 at most. It fails a doc that is `due` and older than 24
hours as due, and one the journal has as `refused` with no `--except`.

The model is `agent.sh`'s default, opus, as for the papers. Haiku is not proposed: section 4.

### 4. Who runs it (R6)

The agent whose landing leaves a doc due. `lock.sh release land` prints one more line after
`docs (cb4): …` when `knowledge-docs.ts put --stale` reports any, made from the tool's last line:

```
summaries due (cb4): cloud-brain-x, cloud-brain-y. Run, and give the journal's lines in your report: BRAIN_BASE=cb4 bun <root>/tools/cloud-brain/summarize-docs.ts run --due --usd-max 3
```

The release stays exit 0 and starts nothing. `agents/implementer.md` step 10, where it says what
the `docs (cb4)` line is (line 430 at `9185a722`), gains one sentence: run the command the line
gives as a background command, read its last line, and name in your report the `at` of its first
journal line. `agents/spec.md` step 6 does not describe the release's lines (it points at that step
of the implementer's brief), so it gains a sentence of its own that names the `summaries due` line:
a spec is the doc most often due. The orchestrator then writes one `cost` event beside the agent's own, as it does for the
papers (`SKILL.md`, step 5, "The role `paper-summarizer`"): key `cost/<id>/doc-summarizer/<round>`,
`role` `doc-summarizer`, `how` `light`, `usd` the sum of the lines.

- Why that agent: 28 of the 30 runs of section 3 are a doc's first summary, and a doc first passes
  the limit in the landing of the spec writer or the writer who wrote it. The summary is in the
  search before the review of that doc starts, and its cost is on the issue that caused it.
- What heals: the line names every doc that is due, not only this landing's. A summary that a dead
  agent, a refused run or a push with no landing left behind is named again at the next landing of
  anyone, and `--usd-max 3` bounds what one agent pays for others.
- What does not: with no landing, nothing runs. `check` fails a doc due for over 24 hours, and
  `knowledge.list?stale=true&kind=doc` lists them; no agent is told to look. Not mended here.

### 5. A token, `loop-doc-files`

`static.put` and `static.list`. Under "What the orchestrator makes".

### What it is expected to cost (estimates, not measured)

- The first 43: at the papers' $0.76, $33. The docs are shorter (median 32,715 characters against a
  median paper body of 32,660 and texts of 53,000 to 210,000 in the pilot) and half the pilot's
  papers were refused once, mostly for the sections' length. No better figure exists before task 2.
- After: about ten summaries a day while the loop writes specs as it did on 10-11 and 10-12
  (section 3), so about $8 a day at that rate. On a day with no new long doc, the docs that passed
  a tenth: 2 of 30 in the three days.
- Against: a light reviewer is $2.39 a run at the median
  (`plan/cloud-brain-paper-summarizer-persona.md`, "What exists today"), and a round of one writer
  and one reviewer 167,000 to 266,000 tokens (`philosophy.md`, under the fifth of the seven).

Task 3 stops when ten docs cost over $10 or R5 fails, and says the figures to the owner.

### What `ac-4` left

`ac-4-docs-tool-marks-a-cut` landed at `a3e883dc` while this was written and is `done`: a cut doc's
last line, and `cut` and `unmarked` in `status` (`{"cut":43,"unmarked":0}` at 20:43). This design
keeps both counts. After task 4, `cut` is the long docs with no summary yet (0 when `due` is
empty), and `unmarked` counts only those: a summarized entry does not end with the cut's line and
is not one that should.

`ac-5-prose-names-the-two-shapes` writes in the calling doc "that a cut doc's last line names its
file". Task 4 here rewrites that paragraph.

## Not chosen

- **A summary made with no model: the doc's headings, each with the start of its section, to
  16000.** No cost, never behind, written inside the release. It spreads the entry's words over the
  whole doc and leaves the vector as it is. He said "summarize", and the papers' pilot measured a
  model's summary raising questions from past the kept part from 0.737 to 0.883 by meaning
  (`records/ps-3-pilot-ten.md`). Reopen if task 3 stops on cost: this is what is built in its place.
- **One call of a model on Cloudflare (`ai.run`) from the tool.** Cents a doc, and short enough to
  run in the release. For the papers he replaced "Use the best model availible in CF" with the
  loop's subagents; no model there has been measured on a text of 30,000 to 186,000 characters
  here. Reopen with the one above.
- **A doc in parts, one entry a section.** B of comment 3944, which his sentence set aside.
- **A larger limit for `text`.** The whole doc in the words' index and no summary. It leaves the
  vector as it is, the entry answers up to 186,433 characters to a reader shown 20,000 a call, and
  it is not what he asked.
- **The summary alone in the entry, without the doc's start.** Room for a longer summary. Set K is
  found by the doc's own words (0.950), and the papers kept the text as entered for the same reason.
- **The summary as a section of the doc's own file**, written by whoever changes the doc. No tool
  and no agent. 198 changes in three days would each owe a rewrite of it, by a writer whose change
  was nine lines, and the review of each would have to judge it.
- **The summarizer started by `lock.sh` itself, detached.** No brief changes. It would spend with
  no issue to put the cost on, from a script whose other work is a lock.
- **A task a day, opened for the summaries**, as `digest-<day>` is. One writer and one review, at
  least 167,000 tokens, to run a command that judges its own output and costs about $8.
- **Written again at every change.** 198 runs in three days against 30.
- **Widening `loop-docs`** in place of a second token. `brain.ts token` refuses a kept name, and
  the revoke between would stop the docs step of every landing.
- **`knowledge.get?whole=true` answering the file.** `brain-x-knowledge` calls `ai.v1/embeddings`
  and nothing else; this is a call to `brain-x-static`, a rule for it, and an answer of 186,433
  characters. The entry names the file and the method that reads it.
- **A file only for a long doc.** Two shapes of entry for one kind, and the three of
  `cloud-brain-dev` would still have no address.

## How each requirement is known to be met

Each is run by an agent of the loop with its own tracker token, with `loop-docs` or
`loop-doc-files` through the two tools, with `loop-knowledge`, or with none. "Today" is a run of
2026-10-12 by this writer. No task is built, so each result after a task is what the answer must
hold, and says where it is run.

| | Check | Today | After its task |
|---|---|---|---|
| R1, task 1 | `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, last line | 20:43, at `9185a722`: `{"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":0,…}`, no `files` | cannot be run before task 1 and its token. Then, after the task's `put --all`: `files` equals `docs` and `filesWrong` is empty |
| R1, R4, task 1 | `curl -s https://cb4.endpointservices.workers.dev/static/knowledge-docs/lopecode-dev/knowledge/notebook-programming-concepts.md \| shasum -a 256` (a public doc), and `curl -s -o /dev/null -w '%{http_code}'` of `…/knowledge-docs/lopecode-dev/plan/cloud-brain-backlog.md` (a private one), no token | 20:32: the first address answers 404; the second was not asked | after task 1: the first hash is that of `git show origin/main:knowledge/notebook-programming-concepts.md \| shasum -a 256`; the second is not 200 |
| R4, task 1 | `bun test ./tests/tools/knowledge-docs.test.ts` | 20:43, at `9185a722`: 15 pass, 0 fail (12 at `1b0d0553`, before `ac-4`'s tests) | run in the task's worktree: tests added that a private doc is put with `public=false` and a public one with `public=true`, on every put, and that the file is put before the entry; each fails on the tool of `9185a722` |
| R2, R3, task 2 | `bun test ./tests/tools/summarize-docs.test.ts ./tests/tools/knowledge-docs.test.ts` | the first file is not there | run in the task's worktree: the assembly of piece 2 from a summary and a doc of 40,000 characters is 16000 and has the two lines; a put of a changed doc keeps the summary and its line and has the new start; a doc of 16000 has no summary; `due` at a tenth of the lines and not under; `--plain`; the judge with five headings, and the papers' tests of it as they pass today |
| R8, task 2 | the canary of `summarize-papers.ts`, in `summarize-docs.ts run` | not there | each `run`'s first journal line is `"canary":"refused"`, as R7 of the papers' spec; the tests of `agent.sh READS` are that task's and pass today (not run again here) |
| R2, R3, task 3 | `BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-docs.ts check` | not there | cannot be run before task 2. After task 3: exit 0 for the ten; after task 4: exit 0 with `status` showing `due` empty |
| R2, task 3 | the put's answer in each journal line | not there | `vectors: 1` for each put of a new summary |
| R5, task 3 | set K, by words, `kind=doc`, `limit=20` (`knowledge-eval/paper-sets.ts`, which task 3 gives `--plan FILE --kind doc`; the sets are at the end of this file in the form it reads) | 20:28:45 and 20:43:29: 1 2 1 1 1 1 1 1 1 1 | no wanted entry lower than third. The ten docs of the pilot are the sets' ten |
| R6, task 2 | the test of `due`, above; and `summarize-docs.ts run --due --dry` a second time on the same `origin/main` | not there | the second run starts no agent but the canary's |
| R6, task 4 | `bun test ./tests/tools/lock.test.ts`, whose cases of the docs step set `LOCK_DOCS` to a stub | 20:36: 24 pass, 0 fail | a stub that prints a last line with `due` of two names makes the release print the `summaries due` line with both and exit 0; one with no `due` prints no such line |
| R6, task 4 | `issue-as.sh <token> "get?id=<an issue whose writer ran it>"` | no event of role `doc-summarizer` | a `cost` event of that role whose `usd` is the sum of the journal lines the report names |
| R7, tasks 3 and 4 | the journal | not there | no put with a refused number. The reviewer of task 3 takes five of the ten (the first five by SHA-256 of the name) and locates three claims of each summary's sections in the doc's file |

Reported and not a condition: set L by words and with `semantic=true`, and set K with
`semantic=true`, asked again after the pilot (0.656, 0.517 and 0.594 at 20:43); the cost a doc; how many were refused once. If set
L does not rise, the record says so.

What only the owner can measure, and no condition of a task: whether the page's operator, shown
such an entry by `knowledge.get`, reads the file with `brain_call static.get { path }`. That call
answers a file's text and not JSON; whether `callAnswer` shows it in parts was not tried, and it
needs his tab.

## Tasks, in the order they land

Each is one writer and one review, and each waits for the one before: 1 and 2 both change `doc()`
and the put of `knowledge-docs.ts`, and the second line of a summarized entry names the `file` that
task 1 makes. 1 waits for the token.

1. **`ds-1-doc-files`.** `knowledge-docs.ts`: the file put before the entry, `file` in the entry,
   `fresh` by it, the cut doc's last line names the Brain's file, `files` and `filesWrong` in
   `status`; tests; `put --all` once by hand, and the two `curl` checks. The tool's header and the
   paragraph of `knowledge/calling-a-cloud-brain-from-this-checkout.md` on what the tool calls with.
2. **`ds-2-summarizer-role`.** The brief, put with `put.sh`. `summarize-docs.ts`: `run`, `check`.
   In `summarize-papers.ts`: the canary and the start of the agent as exported functions, `judge`
   and `parseSummary` with the headings as an argument, and its tests as they pass today. In `knowledge-docs.ts`: the text of
   piece 2, a kept summary carried over a put, `due`, `staleSince`, `--plain`, the four counts.
   Tests. Run `--dry` on three docs (the shortest, the median and the longest of section 1); the
   record has each summary's lengths, what was refused, and `usd`. No summary is put.
3. **`ds-3-pilot-ten`**, `major`. `run` on the ten docs of the sets. `check`. One of the ten put
   back with `put --plain`, read to be the text the tool makes today, and summarized again. Sets K
   and L asked again, both ways. The cost of the ten and what the other long docs would cost at
   that rate. Over $10 for the ten, or R5 fails: the task ends there with the figures on the issue
   for the owner, and the ten are put back plain when it is R5 that failed.
4. **`ds-4-the-rest-and-the-release-line`**, `major`. `run --due` on the rest, `--usd-max 40`;
   `check`. The line of `lock.sh` with its test; the sentence in `agents/implementer.md` step 10
   and the one in `agents/spec.md` step 6; `doc-summarizer` beside `paper-summarizer` in `SKILL.md` step 5; the
   calling doc's paragraph; `rules.md` is not edited (the orchestrator adds the token to "A token
   an approved spec names" when it makes it). Closes this feature.

Tasks 3 and 4 are `major`: they rewrite the text of kept entries (`SKILL.md`, Triage). As the
papers' spec has it for its tasks 3 and 4: the owner's approval of this spec is his word for the
plan, the orchestrator opens the two with `major` and quotes the approval event in a comment on
each, so `needs-owner` is not put on; each passes review to `awaiting-approval` with its puts made.
`put --plain` is what undoes one. Tasks 1 and 2 rewrite no text but a cut doc's last line, which
`ac-4` wrote without the label, and are not `major`.

A writer of a task of an approved spec may put a brief (`rules.md`, "The files of the Brain an
agent reads"): task 2's first put of `roles/doc-summarizer.md`, and task 4's two sentences.

## What only the owner can do

- Approve this spec, knowing that tasks 3 and 4 put a summary in the place of about 6,700
  characters of each of 43 kept entries, that a summary costs money at each long doc written or
  rewritten (estimated $33 once and about $8 a day at the rate of the last two days, neither
  measured), and that the spec names a token.
- Approve task 3 and task 4, each after its review: they are `major`.

Nothing else. No kernel, core, database or deployer is changed, no Worker is deployed, no policy
and no rule.

## What the orchestrator makes

One token, when task 1 is next, from the main checkout:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-doc-files static.put static.list
```

- **Its methods and no more:** `static.put`, to put a doc's file; `static.list`, for `status` to
  compare each kept file's `sha256` and `public` with the doc's. No `static.get`, no
  `static.delete`, no `static.setPublic`.
- **The tasks that need it:** 1, and every put of a doc after it: the docs step of each landing,
  and `summarize-docs.ts`.
- **What holds it to its use.** `static.put` by a token writes any path the owner writes but
  `shell/` and `library/`, and `static.list` lists every file. The token is not held to
  `knowledge-docs/`. It is used through `knowledge-docs.ts` (and the function `summarize-docs.ts`
  takes from it) and for nothing else, and only under `knowledge-docs/`: an agreement, as
  `loop-roles` is held to `cloud-brain-dev/`. A file a token put is served sandboxed, with no
  script and no origin (`brain-static.ojs`, "Each put records its caller").
- **It is never held by the summarizer**, which is started with `READS` and the one tool Read.

`loop-docs` stays as it is and puts the entries.

## Read

**The Brain, `knowledge.search?semantic=true&limit=6` with `loop-knowledge`, 2026-10-12 20:23:26 CEST, six searches:**

| Words | Found | Used |
|---|---|---|
| summary of a long document as the text that is searched, with the original kept as a file | `doc:cloud-brain-paper-summarizer-persona` 0.696, `doc:cloud-brain-answers-cut-and-not-said` 0.581, `arxiv:1904.08375` 0.517 | the first two, read whole in the checkout; this design is the first's on another kind |
| document expansion summary index retrieval long documents chunking | `arxiv:1904.08375` 1.000, `arxiv:2212.10496` 0.632 | the first, as the papers' spec read it (its abstract): text added to a document before it is indexed |
| write the summary again when the source document changes stale summary | `doc:cloud-brain-paper-summarizer-persona` 0.909, `doc:cloud-brain-brain-docs-entered-by-hand` 0.500 | the second, read to its design: what `fresh` and `stale` are, and the release's step. Nothing found on a rule for when to write again; section 3's count is this spec's ground |
| hierarchical summary of a document by section extractive outline headings | nothing that bore on it above 0.5 | nothing |
| kept file static path sha256 entry links to the original | `module:tomlarkworthy:brain-static` 1.000, `module:tomlarkworthy:brain-blob` 0.645 | both, read in their seeds: the references quoted in section 5 and under piece 1 |
| cheap model summarization cost per document Workers AI | reranker pages and papers | nothing |

Also read whole: `tools/cloud-brain/records/ps-3-pilot-ten.md`, the header of
`summarize-papers.ts`, `knowledge-docs.ts`, `cloud-brain-dev/put.sh`, and `brain-knowledge.ojs` to
line 480.

**Outside, one web search** ("index document summary instead of chunks for retrieval "document
summary index" LLM-generated summary long documents BM25 dense evaluation"). **Read in the search's
summary only; no page was opened and no claim below was checked in a paper.**

- `arxiv.org/pdf/2508.11386`, "Retrieval-augmented reasoning with lean language models": one
  summary a page against the page in chunks, by vectors: 0.51 against 0.47 at the first place, 989
  units against 5,824. The ground, with the papers' pilot, for a summary and not parts.
- `arxiv.org/pdf/2404.15103`, "Multi-view Content-aware Indexing for Long Document Retrieval": a
  model's summary indexed beside the raw section text and a list of keywords, the keywords for what
  a summary drops. It is why the sections end with `Names` and why the doc's start stays.
- LlamaIndex's "Document Summary Index"
  (`llamaindex.ai/blog/a-new-document-summary-index-for-llm-powered-qa-systems-9a32ece2f9ec`): a
  summary a document made when it is indexed. The same pattern, named.
- The summary said it found no measurement of a search by words over summaries. Set K is this
  spec's guard for that, with ten questions behind it.

Not searched: when to write a summary again after a change.

## Not tried

- No summary of a doc was written, by any model. Every cost here is the papers'.
- `static.put` and `static.list` were not called: no token of the loop that may be used for it
  names them (`loop-roles` is held to `cloud-brain-dev/`). That a token's put under a new first
  segment is taken, and what `static.list` answers a token, are read from the seed.
- How long 85 puts of a file take.
- `knowledge.get` was not called: `loop-knowledge` names `knowledge.search` only. That it answers
  the row is read from `view` in the seed.
- The simulation of section 3 took every commit of `origin/main` as a landing and three days as the
  rate. Those days are the loop's busiest on record.
- The sets were not asked a third time after the fresh review's fixes, and the simulation of
  section 3 was not run again at `9185a722`.

## The fresh review before submitting (2026-10-12, answered by 20:50 CEST)

One agent with none of the session's context read the file against the code it cites, at
`1b0d0553` with `origin/main` at `9185a722`. Verdict FIX, eleven findings, each checked and each
answered above: the canary and the start of the agent are not exported from `summarize-papers.ts`;
`ac-4` had landed and five statements were of the tree before it (the worktree was rebased and the
status, the tests and both sets run again); `$2.39` was cited to `philosophy.md`, and "line 5"
there meant the fifth of the seven; `agents/spec.md` step 6 has no sentence on the `docs` line;
the reason for sending `public` was that of a put with no `tags`; the list of the five pieces did
not follow their numbers; `--limit=30` is a call's time and not a release's; tasks 1 and 2 change
one function and were not ordered; step 4 of `run` named one token for two calls; a time more exact
than its source; and this section, which a line named and the file lacked. It reproduced section 1
(42 of 82, 14 and 28, 35 under 50,000) and the first five lines of section 3, and found the other
citations and the arithmetic to hold. It did not read the tracker's events, ask the sets, or have
the script of the simulation, which is the session's and not in the repository.

## The question sets

Asked with `knowledge.search?limit=20&q=`, with `semantic=true` (all kinds) and with `kind=doc`
(by words). `want` is the entry. The number after it is its rank on 2026-10-12 at 20:43:29 with
`semantic=true`, 0 when it was not among the 20; the ranks by words are in section 2, in this order.

Set K, from character 12500 of the kept text:

```
doc:vendoring-npm-dependencies  1  blocks loaded through importShim that are in no FileAttachment map do not survive an export
doc:pushing-cells-to-observablehq  12  the builtin that hands a cell its own Variable decompiles to the parameter name and arrives as a dependency on a cell called _v
doc:cloud-brain-texts-not-read-again-after-a-change  1  in a file that is not yours the line and its mend go in your comment under For the overseer
doc:cloud-brain-group-invites  1  multi-use invitation link expiry max uses capability url, searched and nothing bore on it
doc:cloud-brain-record-checked-by-review-alone  2  linked events up to 11:53, 15 of them, 12 by the overseer's token
doc:maintaining-and-updating-lopecode-and-lopebook-content-repositories  2  the jumpgate script launches Chromium with web security disabled and pre-sets a global that the query field view reads in place of location.search
doc:diagnosing-new-observable-platform-differences  4  dollar signs in a replacement string silently mangle the new source into invalid JS; the callback form disables substitution
doc:cloud-brain-flow-metrics  2  a service level expectation is a period of elapsed time and a probability, 85% of work items finished in eight days or less
doc:cloud-brain-dashboard-service  9  a Worker that holds a token reading every log line of the account is live before that task's review; probation is for a Worker with a version before it
doc:cloud-brain-locks-held-in-the-cluster  1  the probe script in a scratch directory is not kept and a plan there may hold an opcode this SQLite did not
```

Set L, from the doc past the kept 16000 characters:

```
doc:vendoring-npm-dependencies  1  WASM sibling modules attach a gzipped wasm file beside the JS and hand the bytes to the library
doc:pushing-cells-to-observablehq  0  turn compiled runtime variable definitions back into Observable source, passing both definitions of a viewof
doc:cloud-brain-texts-not-read-again-after-a-change  1  the reviewer mends an untrue sentence in a doc the change did not touch when the fix is one sentence
doc:cloud-brain-group-invites  1  checks run with the kernel diff and the page diff applied in the worktree and the edits then taken back
doc:cloud-brain-record-checked-by-review-alone  0  doctest executable documentation and knitr inline computed values in prose
doc:maintaining-and-updating-lopecode-and-lopebook-content-repositories  1  lopebooks submodule sits at a detached HEAD one commit ahead of main; update submodule pointers with git update-index cacheinfo
doc:diagnosing-new-observable-platform-differences  3  two error badges save_options and editor_jobs, Failed to construct Blob, still open on the editor's new-site page
doc:cloud-brain-flow-metrics  3  hours the loop was stopped taken out of a lead time, and a span longer than 7 days on the page
doc:cloud-brain-dashboard-service  3  a member's metrics put as a second task, the tasks opened with major and the approval event quoted in a comment
doc:cloud-brain-locks-held-in-the-cluster  6  the reviewer's wait takes the place of the wait on the directory in step 3 of the reviewer's brief, put by an overseer
```

A summary that holds a set-L question's own words will be found by them, which is the purpose and
is why set L is easy to raise. This file is itself a doc of the search and holds all twenty
questions: it will be found by them, at whatever rank, beside the wanted entries
(`knowledge-reranking.md`, "The record outranked what it describes"). The ranks above were read
before this file was entered.
