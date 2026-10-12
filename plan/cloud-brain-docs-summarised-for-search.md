# Cloud Brain: a long doc is entered as a summary written for search, by the summarizer that exists, and its whole is a file of the Brain

Spec of the feature `docs-summarised-for-search` on cb4's tracker. Written 2026-10-12 from 20:21
CEST (the move to `spec`, event 4253) to the time of its commit, from `lopecode-dev` `1b0d0553`,
`cloud-brain-dev` `ca5299a` and the tracker up to event 4325. `origin/main` moved twice while this
was written: to `e368e1c9` (`ac-3`), and at 20:33 to `a3e883dc`, where `ac-4-docs-tool-marks-a-cut`
changed the tool this spec is about, then `9185a722`. The worktree was rebased onto `9185a722` at
20:43 and what `ac-4` changed was read and run again there; each number says which commit it is of.
Nothing here is built. Names are proposals.

**Round 2, 2026-10-12 from 21:14 CEST to the time of its commit, after the owner sent the spec back
(event 4434).** The worktree was at `origin/main` `1d545375`. What changed, by what he said and by
the notes of review 4341, which passed round 1:

| Said | Answer | Where |
|---|---|---|
| The owner, comment 4382: "coz we switch to use Claude code + popler which seems much more cost effecient", and "C" (4433) | The cost of a doc's summary is measured and no longer the papers' $0.76: 19 dry runs of a Claude Code agent on 13 docs, three models. A doc is $0.0116 at the median with haiku, $0.28 with opus. A doc is markdown read from git, so no `pdftotext` is in its way; the PDFs of papers go on as they do | "What exists today", 4; "What it costs" |
| The owner, comment 4458: "don;t we have a summarizer persona, it should reuse that"; comment 4463: "we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose" | One role, `summarizer`, with one brief that takes a paper or a doc. No `doc-summarizer` and no `summarize-docs.ts`. The run of one text is one function, in `summarize-papers.ts`, that the papers' `run` and the docs tool both call | Design piece 3; R9; tasks 2 to 4 |
| Comment 4463, the session's reading: "the spec says what is checked so those summaries still stand" | Three checks, two run today: the papers' `check` (63 summarized, none failing), the papers' tests, and one paper summarized dry under the new brief | R9 |
| Review 4341, note 1: `check` has no clock for a doc never summarized, and takes no names | The 24 hours are counted from the file's last commit for a doc with no summary, and the check takes names | Piece 2, "When a summary is due"; piece 3 |
| Note 2: a release's docs step can put an older text over a summary put a moment before | The docs step leaves a doc that a summarizer is running on. Two machines are not kept apart: said, with what it costs | Piece 3, step 5 |
| Note 3: `rules.md` says `loop-docs` is used through `knowledge-docs.ts` and nothing else | Every call with `loop-docs` and `loop-doc-files` is made by `knowledge-docs.ts`. There is no second tool | Piece 3 |
| Note 4: a reviewer who lands is shown the `summaries due` line and has no sentence for it | The line says who leaves it | Piece 4 |
| Note 5: a doc that shrinks keeps its `staleSince` | Its put sends `staleSince: 0` | Piece 2 |
| Note 6: `lock.sh` line 171 is the docs step and the exit is line 180 | Both lines named | "What exists today", 6 |

**As built, task 1 (`sd-1-doc-files`, 2026-10-12).** Two things are not as written below. Ten
places that say otherwise have a note "As built"; the other lines are read by the two rules here. The record is `tools/cloud-brain/records/sd-1-doc-files.md`.

- **One token.** The owner chose B of comment 4734 (the approve is event 4735): no `loop-doc-files`.
  `loop-docs` names `knowledge.put knowledge.list static.put static.list` since 22:11:52 CEST
  (comment 4775 of `sd-1-doc-files`), and where a line below says `loop-doc-files`, read `loop-docs`.
- **The prefix is `docs/`, not `knowledge-docs/`.** Section 5 says an entry's `file` is empty. It
  was not for 53 of the 89 docs' entries: each named `docs/lopecode-dev/<path>`, and
  `static.list?prefix=docs/` answered those 53 files, private, put between 12:01 and 12:05 CEST on
  2026-10-10 under a delegation of the owner's (`writer`: `owner by d:56b22a77aae2`). What put them is
  not known: no file of the repository names `docs/lopecode-dev`, and the tool's header said "The
  file is not copied" from its first commit (`a30d2cd0`, 10:31 CEST that day). The spec asked
  only the address under `knowledge-docs/`. The place existed with this job and this shape, so the
  tool puts there and no second place was made (`philosophy.md`, Clarifications, 2026-10-12). Where
  a line below says `knowledge-docs/<source>/<path>`, read `docs/<source>/<path>`.

**As built, task 2 (`sd-2-one-summarizer`, 2026-10-12).** The record is `tools/cloud-brain/records/sd-2-one-summarizer.md`,
which has each of these with why. Where a line below says otherwise, read these:

- **`summarize` takes the agent and writes no journal.** `summarize({ kind, file, lines, title, model, agent })`, with
  `agent` from the export `agentRunner()`; it answers `lead`, `sections`, `numbers` and `answers` beside what piece 3
  lists. The journal's line is its caller's. The canary is the export `canary(agent, state)`.
- **The task line names the brief**: `read your brief, brain/roles/summarizer.md, then summarize a <kind>: <file>, …`.
  Of the first three haiku agents started on a doc through `agent.sh`, one read the doc and no brief.
- **"A line before the first paragraph" is, to the judge, an empty line before the first heading.** A preface on
  the first paragraph's own line is not seen by it.
- **The second line of a summarized entry** has `, and /static/<file> at the Brain's address` only for a public
  doc, as the cut's line has since task 1, and does not say "when the doc is public".
- **A long doc whose entry is answered with no text** is left by `put --stale` alone; `put <name>` and `put --all`
  enter it cut.
- **`put`'s last line has no `due`**: `summarized`, and `noText` and `running` by name. `due` and `refused` are in
  the last line of `status`. The line of piece 4 is task 4's to make.
- **`run --again --dry` of a summarized paper** writes `<id>.dry.summary.txt` and leaves `<id>.summary.txt`.
- **R9's first check**: four assertions of `summarize-papers.test.ts` that hold the role's name or its task line
  were changed with the name, and two cases of `knowledge-docs.test.ts` with the entry answered with no text.
- **A refusal of a `--dry` run** holds a later `--dry` run of that doc at that file, and no run that puts.

The tasks are `sd-1` to `sd-4` on the tracker, where this file says `ds-1` to `ds-4`.

Sections 1 to 3 and 5 of "What exists today", the question sets and "Read" are round 1's and were
not measured again. Each number under "What exists today" has the command that gave
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

In round 1 he had given no words on who writes a doc's summary, and the spec made a second role
with a brief and a tool of its own. He sent it back. His words, each quoted whole on the issue by a
session he was in (token `out-5f56b2`), all of 2026-10-12:

> "docs-summarised-for-search" coz we switch to use Claude code + popler which seems much more cost effecient.

(21:02 CEST, comment 4382; then "C", 21:13, comment 4433, the send-back of the choice he was shown.)

> yeah claude, don;t we have a summarizer persona, it should reuse that

(21:14, comment 4458.)

> yeah I think we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose

(before 21:15:10, comment 4463.)

Read here as: one summarizer role, the one that summarized the papers, made to take a doc as well;
a summary is written by a Claude Code agent, as the papers' are; and what it costs is measured for
a doc. "Popler" is `pdftotext`, which the papers' tool uses for a kept PDF: a doc needs none. That
last sentence is this writer's reading.

## The reports gathered

`list?parent=docs-summarised-for-search` answers no issue (20:20 CEST). The issue is his request,
filed for him by the orchestrating session. Its body lists four things as not known, and they are
taken in the place of reports:

| Not known | Answer here |
|---|---|
| Who writes the summary, and what a run costs | One light agent a doc, of the one role `summarizer`, which is the papers' made general. Measured dry on 13 docs: $0.0116 a doc at the median with haiku and $0.0585 for the longest; $0.18 to $0.82 with opus on three. R2, R6, R9 |
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
`a3e883dc` that was `.slice(0, TEXT)` on its line 75. Since then it is `marked()` (line 78 at `9185a722`), which
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

### 4. What a summary costs: the papers', and 19 dry runs on docs

**The papers.** `tools/cloud-brain/records/ps-3-pilot-ten.md` has ten for $7.78, $0.36 to $0.58 for
a paper accepted at once and $0.81 to $2.08 for one refused once (5 of 10), on texts of 53,133 to
210,535 characters, model opus. The other 53 were put for $40.25
(`plan/cloud-brain-paper-summarizer-persona.md`, the note under its task 4): $0.76 a paper. Round 1
of this spec carried that figure to the docs. It is not carried now.

**The docs, measured 2026-10-12 21:16 to 21:21 CEST.** Nothing was put: each answer was written to
a file of the session's and judged there. One run is one `claude -p` (2.1.296) with the arguments
`DRY=1 READS=<dir> agent.sh` prints (`--tools Read`, `--add-dir <dir>`, `--permission-mode default`,
`--strict-mcp-config`, the advisor off), on a new directory that held two files: the doc as git has
it at `origin/main` with its frontmatter taken off, and a draft brief. Two things differ from a run
through `agent.sh`, and are why task 2 measures again: the agent was started in an empty directory
and not in `cloud-brain-dev/`, and the task line named the brief's file, since a brief that is not
on the Brain cannot be read through `brain/roles/` (the hook removes a file the Brain answers 404
for). The draft brief is the papers' brief (`/static/cloud-brain-dev/roles/paper-summarizer.md`,
read 21:15) with the five headings of piece 3 in the place of the papers' six. An answer was judged
by a script of the session's with `numbers` of `summarize-papers.ts` and the papers' rules: the
first paragraph at most `1498 - title length` and with no line break, the headings in order, the
sections 5000 at most, every number of the answer among the doc's. A refused answer went back once
to the same session (`--resume`) with the list.

The ten docs of sets K and L and the shortest, the median and the longest of section 1, with haiku;
those three with sonnet and with opus. `usd` is `total_cost_usd` of the last line `claude` printed,
which for a second round is of both rounds:

```
model   doc                                             characters   usd      agent   first  sections   outcome
haiku   calling-a-cloud-brain-from-this-checkout             17114  $0.0078    45 s    1110   4005     accepted at once
haiku   vendoring-npm-dependencies                           17743  $0.0096    46 s     988   3450     refused once: a preface line, and its number 353
haiku   pushing-cells-to-observablehq                        22412  $0.0057    29 s     996   3858     accepted at once
haiku   cloud-brain-texts-not-read-again-after-a-change      26019  $0.0086    47 s     957   3771     accepted at once
haiku   cloud-brain-group-invites                            29027  $0.0087    49 s     891   4948     accepted at once
haiku   cloud-brain-record-checked-by-review-alone           31147  $0.0068    32 s    1048   3993     accepted at once
haiku   cloud-brain-answers-cut-and-not-said                 32954  $0.0130    59 s    1029   4482     refused twice: a preface line both times
haiku   maintaining-and-updating-lopecode-and-lopebook-…     33549  $0.0138    60 s     846   4014     refused once: sections 5332
haiku   diagnosing-new-observable-platform-differences       36568  $0.0124    52 s     982   3425     refused once: sections 5537
haiku   cloud-brain-flow-metrics                             38674  $0.0116    48 s     949   4899     refused once: a preface line, and its number 494
haiku   cloud-brain-dashboard-service                        45076  $0.0206    95 s    1037   4226     refused twice: a preface line both times, then a number 3400
haiku   cloud-brain-locks-held-in-the-cluster                66506  $0.0161    61 s    1058   4775     refused once: a preface line, and its numbers
haiku   svg-editor-architecture                             186460  $0.0585   107 s    1005   3701     refused once: sections 6077
sonnet  calling-a-cloud-brain-from-this-checkout             17114  $0.0999    27 s    1064   3399     refused once: a preface line, and its number 1458
sonnet  cloud-brain-answers-cut-and-not-said                 32954  $0.0981    21 s    1003   3369     accepted at once
sonnet  svg-editor-architecture                             186460  $0.3836    41 s     993   3598     accepted at once
opus    calling-a-cloud-brain-from-this-checkout             17114  $0.1803    38 s    1156   4288     accepted at once
opus    cloud-brain-answers-cut-and-not-said                 32954  $0.2845    59 s    1165   4629     accepted at once
opus    svg-editor-architecture                             186460  $0.8207    78 s    1175   4600     accepted at once

haiku, 13 docs   $0.19 in all   a doc: $0.0057 least, $0.0116 median, $0.0585 most   a first answer refused for 8 of the 13, the second too for 2 of those
sonnet, 3 docs   $0.58 in all   opus, 3 docs   $1.29 in all   the 19 runs: $2.06
```

- **A doc with haiku cost a twentieth of the same doc with opus** (three docs: $0.0078 against
  $0.18, $0.0130 against $0.28, $0.0585 against $0.82), and a sixty-fifth of a paper's $0.76.
- **Six of the nine first answers that were refused (haiku's 8 and sonnet's 1) have one defect: a
  line before the first paragraph.** As haiku wrote one: "The brief and the whole of the 494-line document are read.
  Summary:". The judge counts it as the first paragraph with a line break, and its numbers as
  numbers not in the doc. The papers' brief says "No title, no preface" and
  that did not hold. The two docs refused twice had it both times. So the brief of piece 3 says it
  where it cannot be read past, and the pilot measures whether that mends it.
- **Haiku read the brief in all 13 runs** (each transcript has a Read of it before the doc's).
  `records/ps-2-summarizer-role.md` line 66 says its haiku agents "did not read the brief"; those
  were the canary's runs, whose task was to read one other file. An agent that had not read the
  brief could not have answered five headings it was told nowhere else.
- **What was not measured: whether a summary is true to its doc.** One was read by this writer
  against a doc he knows, `cloud-brain-answers-cut-and-not-said` by haiku, second answer: its
  numbers and its tasks are the doc's, and nothing in it was found that the doc does not say. One
  of 19, by the writer of this design. The number rule passed for 17 of the 19 last answers. R7's
  check is the pilot's.
- An agent took 21 s to 107 s, both rounds together.

### 5. Where the whole of a doc is today

The entry's `url`: the file's page on GitHub, or for the three of `cloud-brain-dev` the Brain's git
address, which gives no file. The entry's `file` is empty and its `sha256` is the file's. (As built, `sd-1-doc-files`, 2026-10-12:
not so for 53 entries, which named a file under `docs/`; the note at the head of this file.) The field
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
(`lock.sh` line 171) and is exit 0 whatever that prints (line 180). `--limit` is the time one call to the Brain
may take (`knowledge-docs.ts`, header), and the step starts no agent: a summary by
an agent, 21 s to 107 s by section 4, is not written there.

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
| R9 | There is one summarizer role, with one brief, for a paper and for a doc. The 63 summaries of papers it has written stand, and a paper is summarized as before | comments 4458 and 4463 |

## The design

Five pieces. The first two are changes to `knowledge-docs.ts`, and the first needs a token. The
third makes the papers' role and its runner general: one brief, one function, no new tool. The
fourth is one printed line and a sentence in each of two briefs. The fifth is the token. Nothing
in a Worker changes.

**What the design adds that stands after it, and what exists of the same job.** Round 1 added a
role where one existed and did not write it as a choice
(`tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`). Each standing thing of this round:

| Added | What exists of the same job | Extended, or why not |
|---|---|---|
| No role, no brief of a second name | `paper-summarizer`, `roles/paper-summarizer.md` | Extended and renamed `summarizer` (piece 3) |
| No tool | `summarize-papers.ts`, `knowledge-docs.ts` | Both extended: one function exported by the first, three commands in the second |
| A token, `loop-doc-files` | `loop-docs` (`knowledge.put`, `knowledge.list`), held by the same tool; `loop-roles` (`static.put`, `get`, `list`, `delete`), held by `put.sh` | (As built, `sd-1-doc-files`, 2026-10-12: extended. The owner chose the widened `loop-docs`, and no second token was made.) Not extended. This is the writer's choice and not the owner's word: `loop-docs` can be widened only by a revoke and a make, and a release between the two enters no doc; `loop-roles` can delete and is held to `cloud-brain-dev/`. One token for the one tool is the other way, under "Not chosen" |
| A prefix of `brain-static`, `knowledge-docs/` | `cloud-brain-dev/`, where `put.sh` keeps the briefs, all public. (As built, `sd-1-doc-files`, 2026-10-12: also `docs/`, with 53 of the docs' files, which this row did not know; that prefix is the one used.) | Not used: 49 of the 87 docs are private (`status` at `88fc2add`, 21:53; then 46 are cut, where sections 1 to 3 have the 85 and 43 of `9185a722`) (piece 1) |
| A file of state, `<state>/docs/<name>.running` | none: the papers' runner writes a journal and has no second writer of an entry | New (piece 3, step 5) |

### 1. Every doc's file is put to `brain-static` (R1, R4)

In `knowledge-docs.ts`, a put of a doc is two calls, in this order:

```
static.put?path=knowledge-docs/<source>/<path>&public=<true|false>&tags=knowledge-doc     the file's bytes, as git has them
knowledge.put { …as now, file: "knowledge-docs/<source>/<path>" }
```

`<source>/<path>` is `lopecode-dev/knowledge/<name>.md`, `lopecode-dev/plan/<name>.md` or
`cloud-brain-dev/<FILE>.md`. (As built, `sd-1-doc-files`, 2026-10-12: the first segment is `docs/`, and a post mortem is
`lopecode-dev/tools/cloud-brain/post-mortems/<name>.md`. `put --stale` also puts a doc that `status` names in
`filesWrong`, and its last line counts them: a copy of the tool from before this task puts a changed doc's entry
and no file. `status --check` does not fail for one. The `put --all` took 69.6 s for 89 docs.) `public` is the entry's own (`in-notebook` in the frontmatter's scope)
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

Summary by summarizer (<model>), <day>, of <path> as it was with sha256 <hash of the file read>.
The whole doc is the file <file> in this Brain's brain-static, <n> characters: static.get?path=<file>, and /static/<file> at the Brain's address when the doc is public. Its start follows.

<the doc's text from its start, as the tool makes it today, cut so the whole is 16000>
```

- The first paragraph is the embedded text, whole: the service embeds the title and the first 1500
  characters. With the median title of 69 that is 1429 characters.
- The doc's start follows the summary, as a paper's text as entered follows its summary. The 19
  answers of section 4 were 846 to 1175 characters of first paragraph and 3369 to 4948 of sections,
  so with the two lines a summary takes 4,700 to 6,600 of the 16,000, and 9,400 to 11,300 of the
  doc's own words stay where 16,000 are now. Set K is from character 12500, which this removes from every one of its
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
whose entry has the line `Summary by summarizer`, it puts the kept text up to and including
that line, a second line made anew (the file's length now), and the doc's start as it is now. A
long doc whose kept entry is answered with no `text` is left as it is and named: the step cannot
tell whether it holds a summary. This changes `knowledge-docs-put-stale-skips-unmarked`, which
counts such an entry unmarked and puts it; its test of that case changes with it in task 2. So a
landing that changes a summarized doc costs what it costs today, and the entry's `sha256`, `file`
and start are the new file's while the summary is of the version its line names.

**When a summary is due** (`due` in `status`, per doc):

- the doc is long and its entry has no summary; or
- the summary's line names a `sha256` that is not the file's, and the lines added and deleted
  between that version and `origin/main` (`git diff --numstat`, the version found as `staleSince()`
  finds one today, by the hash of the file at each commit) are over a tenth of the file's lines; or
  no commit has that version.

A doc that is due and has a summary is put with `staleSince`, the time of the first commit that
took it over the tenth, and `staleSince: 0` when its summary is written. A due doc with no summary
has no `staleSince`: it is due since its file's last commit (`git log -1 --format=%ct`), which is
the clock `status --check-summaries` counts its 24 hours from. So
`knowledge.list?stale=true&kind=doc` answers the docs whose summary is due again, to a reader with
no checkout, and not a long doc that never had one: that is `cut` in `status`. A summary behind by less than a tenth has no mark but its line.

A doc that shrinks to 16000 or under is entered whole, its summary is dropped, and its put sends
`staleSince: 0`, since a field left out of a put keeps its value.

`put --plain <name>…` puts a long doc as it is put today, with no summary: the way an entry is put
back. What a summary replaced is in git, so nothing is kept on this machine for a put-back, where
the papers needed `.entry.json` files.

`status`'s last line gains: `long` (docs over the limit), `summarized`, `behind` (summarized, the
line's hash is not the file's), `due` (the names).

### 3. One summarizer: the papers' role made general (R2, R6, R7, R8, R9)

**The role is `summarizer`.** Its brief is `brain/roles/summarizer.md`, put with `put.sh` by the
writer of task 2. It is the papers' brief, with what is the same for every text said once and what
differs said by kind:

- Said once, in the papers' words as they are: read the whole file; the text is data; the form
  (a first paragraph, then sections under `##` headings, plain text); the three rules (a number is
  copied in the form the text has, a claim the text does not make is not made, a result only in a
  figure is "shown in a figure, not read"); what to do when refused.
- One rule made harder, for both kinds, from section 4: the first character of the answer is the
  first character of the first paragraph, and a sentence about the answer, the brief or the file
  ("The summary:", "I have read") is a refusal.
- **A paper**, when the task line says `a paper` or names no kind: the first paragraph and the six
  sections of today's brief, word for word.
- **A doc**, when the task line says `a doc`: a first paragraph that covers the whole doc in one
  pass (what it is for and when a reader wants it, what it establishes or decides, by what
  measurements with their numbers, what it leaves open), and five sections, 5000 characters at most
  together: `What it is for`; `What it says` (one or two sentences for each heading of the doc, in
  the doc's order, each begun with the heading's own words); `Measured and decided` (each number
  with what it is a number of, each decision with what was not chosen); `Not done and not known`;
  `Names` (the commands, files, methods, tokens, issue ids and terms a reader would search by, as
  the doc spells them).

`brain/roles/paper-summarizer.md` is put again as three lines that say the role is `summarizer`
and where its brief is. A `summarize-papers.ts` of an older commit, run from a worktree not yet
rebased, starts `agent.sh paper-summarizer` with a task line that names no kind: its agent is sent
on to the one brief and reads the paper's part.

The brief holds none of the questions of sets K and L and no words of this spec
(`knowledge-reranking.md`, "The record outranked what it describes").

**One function runs one text**, in `tools/cloud-brain/summarize-papers.ts`, where all of it is
today as closures inside `if (cmd === "run")` (line 384): the start of the agent (`agent()`, lines
388 to 394), the canary (401 to 413), the judging, the one `--resume` and the journal's line. Task
2 lifts them out as one exported function, named here `summarize`:

```
summarize({ kind: "paper" | "doc", file, lines, title, model, journal })
  -> { outcome: "accepted" | "refused" | "failed", result, session, usd, context, ms, rounds, refused }
```

It starts `READS=<a new directory outside the checkout, holding the one file> cloud-brain-dev/agent.sh summarizer "summarize a <kind>: <file>, N lines; the title is T characters, so the first paragraph is at most 1498-T characters"`.
`judge` (line 199) and `check` (line 366) read the six headings from a constant (`HEADINGS`, line
182): they take the kind, and the headings are by kind. The canary is a second exported function,
as it is today, and is not inside `summarize`: each caller runs it once, before its first text, and
a `--due` with no doc to run starts none. The papers' `run` calls `summarize`
with `kind: "paper"` and does the rest as now: its text from arXiv or the kept PDF with
`pdftotext`, its put, its `.entry.json`.

The line a summary's entry carries is `Summary by summarizer (…)` from task 2 on, for both kinds.
The 63 entries of papers have `Summary by paper-summarizer (…)` and are not put again:
`SUMMARY_LINE`, `summarized()` and `lineOf` (lines 77, 151, 210) read either. The tag
`paper-summary` and the method `paper-summarizer` of a paper's put stay as they are; they are a
paper's, not the role's.

The file keeps its name. 22 files of the repository name `summarize-papers` (`git grep -l`), the
records of four tasks among them, and its other commands (`text`, `compare`, `restore`) are a
paper's alone.

**The docs' side is in `knowledge-docs.ts`**, the one tool that calls with `loop-docs` and
`loop-doc-files` (`rules.md` has `loop-docs` "used through `tools/cloud-brain/knowledge-docs.ts`
… and for nothing else"):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize --due [--usd-max N] [--model M] [--dry]   one agent a due doc, one after another
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize <name>… [--again] [--dry]                 the named docs, due or not
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check-summaries [<name>…] [--except name=issue,…]   reads only; exit 1 on a failing doc
```

For one doc, `summarize`:

1. Reads the file from `origin/main` with git and writes its text (the frontmatter taken off, no
   line over 1500 characters) into the new directory. Nothing is fetched.
2. Calls `summarize` of `summarize-papers.ts` with `kind: "doc"`. Refused twice, nothing is put,
   and the journal says `refused` with the file's hash; a later `--due` starts no agent for that
   doc at that hash without `--again`. Such a doc is still `due` in `status`, and is in a list of
   its own there, `refused`; the release's line of piece 4 leaves it out, so no landing is sent to
   run a command that would do nothing. Its writer's task (3 or 4, or after them the agent that saw
   the refusal) runs it once more with `summarize <name> --again --model opus`; refused again, it
   opens one `feedback` issue with what was refused, and the doc is named with that issue in
   `--except`, as the papers' `check` has it.
3. Puts the doc as `put` does: the file with `loop-doc-files`, then the entry with `loop-docs`, its
   text the one of piece 2. It reads `origin/main` again first: when the file is no longer the one
   the agent read, the summary is put with the hash it was made from in its line, and the doc's
   start and `sha256` are the newer file's.
4. Appends one line to `<state>/docs/journal.jsonl`: the name, the outcome, `session`, `usd`,
   `context`, `ms`, the lengths, what each round refused, the put's answer.
5. Before the agent it writes `<state>/docs/<name>.running` with the time and removes it after. A
   `summarize` that finds one under ten minutes old skips that doc. So does the docs step of a
   release (`put --stale`), which leaves the doc stale for the next landing: it read the kept text
   a moment before its put, and would put the older text over a summary that landed in between.
   `<state>` is one machine's. A summarizer on the laptop and a release on the worker machine
   (`plan/cloud-brain-worker-machine-on-fly.md`) are not kept apart: the doc is then due again at
   the next landing and its summary is paid for twice, 1 to 6 cents by section 4. Not mended.

`status --check-summaries` fails a doc whose entry has the line and not: a first paragraph within
its limit, the five headings in order, a second line that names the entry's own `file`, a text of
16000 at most. It fails a doc due for over 24 hours (the clocks of piece 2), and one the journal
has as `refused` at its file's hash and `--except` does not name. With names it reads those docs only. `status --check` is as it
is today.

**The model for a doc is haiku**, `--model` to say another; a paper's stays opus. Haiku is a
twentieth of opus on the same three docs, and what it was refused for is the form, which the judge
sees. What the judge does not see is a summary that is untrue or thin, and the papers' spec chose
opus for that ("a wrong summary is found by nobody afterwards"). So task 3 gates on it: the search
(R5) and a reader's check of claims (R7). If either fails with haiku, the same ten are run with
opus, about $3 by section 4, and the task says which model the rest take.

### 4. Who runs it (R6)

The agent whose landing leaves a doc due. `lock.sh release land` prints one more line after
`docs (cb4): …` when `knowledge-docs.ts put --stale` reports any, made from the tool's last line:

```
summaries due (cb4): cloud-brain-x, cloud-brain-y. A writer or a spec writer runs, and names the journal's lines in its report: BRAIN_BASE=cb4 bun <the copy of knowledge-docs.ts that lock.sh ran, by its whole path> summarize --due --usd-max 1 (a reviewer leaves it: the next landing prints it again)
```

The release stays exit 0 and starts nothing. `agents/implementer.md` step 10, where it says what
the `docs (cb4)` line is (line 430 at `9185a722`), gains one sentence: run the command the line
gives as a background command, read its last line, and name in your report the `at` of its first
journal line. `agents/spec.md` step 6 does not describe the release's lines (it points at that step
of the implementer's brief), so it gains a sentence of its own that names the `summaries due` line:
a spec is the doc most often due. The orchestrator then writes one `cost` event beside the agent's own, as it does for the
papers (`SKILL.md`, step 5, "The role `paper-summarizer`"): key `cost/<id>/summarizer/<round>`,
`role` `summarizer`, `how` `light`, `usd` the sum of the lines. That paragraph of `SKILL.md` is
renamed for the one role and says that the events of the papers' tasks carry the old name.

- Why that agent: 28 of the 30 runs of section 3 are a doc's first summary, and a doc first passes
  the limit in the landing of the spec writer or the writer who wrote it. The summary is in the
  search before the review of that doc starts, and its cost is on the issue that caused it.
- What heals: the line names every doc that is due, not only this landing's. A summary that a dead
  agent, a refused run or a push with no landing left behind is named again at the next landing of
  anyone, and `--usd-max 1` bounds what one agent pays for others: 17 docs at the dearest of section 4.
- What does not: with no landing, nothing runs. `status --check-summaries` fails a doc due for over 24 hours, and
  `knowledge.list?stale=true&kind=doc` lists them; no agent is told to look. Not mended here.

### 5. A token, `loop-doc-files`

`static.put` and `static.list`. Under "What the orchestrator makes". (As built, `sd-1-doc-files`, 2026-10-12: not made. `loop-docs`
names these two as well.)

### What it costs

From section 4, measured dry on 13 docs with the draft brief; the rates of change are section 3's.

| | haiku | opus |
|---|---|---|
| A doc, measured | $0.0116 at the median, $0.0585 the longest | $0.18, $0.28, $0.82 on three |
| The first 43, estimated from those | about $0.60 (13 docs were $0.19) | about $15, from three docs |
| A day, at about ten summaries (section 3) | about $0.12 | about $3 |

Round 1 said $33 once and about $8 a day, from the papers' $0.76. The agent's time, 21 s to 107 s a
doc, is now the larger cost: it is why a summary is still written again only past a tenth of the
doc's lines, and not at each of 198 changes.

Task 3 stops when ten docs cost over $1 with haiku, or when R5 or R7 fails with both models, and
says the figures to the owner.

### What `ac-4` left

`ac-4-docs-tool-marks-a-cut` landed at `a3e883dc` while this was written and is `done`: a cut doc's
last line, and `cut` and `unmarked` in `status` (`{"cut":43,"unmarked":0}` at 20:43). This design
keeps both counts, and task 2 changes what they count: `cut` is the long docs with no summary yet
(0 when every long doc has one), and `unmarked` counts only those. A summarized entry does not end
with the cut's line and is not one that should.

Comment 4514 of this issue (2026-10-12) asked that: an entry with a summary that is still counted
unmarked "would be put again at every landing". The change is in task 2, with the first summary's
tool, and not in task 4 as an earlier draft of this round had it.

**A copy of the tool from before task 2 undoes a summary.** Since `73ad331f` (2026-10-12),
`put --stale` also puts a fresh doc whose entry is `unmarked` (`knowledge-docs.ts`, the `pick` of
`put`), and to a copy that knows no summary every summarized entry is unmarked: it would put the
cut text over each. The docs step runs the copy beside the `lock.sh` that was called, a worktree's
own. A landing rebases its worktree under the lock, before the release (`agents/implementer.md`, step
10: take, rebase, renew, push, release), so after task 2 has landed a landing's copy has it; task 3 puts the first summary after that. What is
left is a release from a worktree not rebased since before task 2, which
`records/ac-4-docs-tool-marks-a-cut.md` saw once for its own change ("A writer in a worktree behind
this change unmarks a doc"). Not mended: such a release costs every summary again, about $0.60 for
all 43 with haiku, and `status` shows it the same minute as `cut` risen from 0. Task 3 puts
no summary while a worktree is behind task 2's commit: for each name that `worktree.sh --list`
prints, `git -C <root>/.claude/worktrees/bm-<name> merge-base --is-ancestor <task 2's sha> HEAD`
exits 0, or the worktree is named in task 3's record with why it will make no release (`--list`
prints `head=` as a short sha, which does not say before or after).

`ac-5-prose-names-the-two-shapes` writes in the calling doc "that a cut doc's last line names its
file". Task 4 here rewrites that paragraph.

## Not chosen

- **A second role, `doc-summarizer`, with a tool `summarize-docs.ts`.** Round 1's design. He sent
  it back: "we don;t have two seperate roles, we just make the summarizer more general".
- **The role keeping the name `paper-summarizer`.** No constant changes and the 63 entries need no
  second spelling read. A doc's entry would then say a paper summarizer wrote it, and his word is
  "the summarizer".
- **The tool renamed `summarize.ts`, with the docs' side in it.** One file for the one role. 22
  files name it, and the docs' put would then be made with `loop-docs` from a tool that is not
  `knowledge-docs.ts` (review 4341, note 3).
- **Opus for a doc, as for a paper.** No refusal in three runs, and twenty times the cost. It is
  what task 3 falls back to.
- **A summary made with no model: the doc's headings, each with the start of its section, to
  16000.** No cost, never behind, written inside the release. It spreads the entry's words over the
  whole doc and leaves the vector as it is. He said "summarize", and the papers' pilot measured a
  model's summary raising questions from past the kept part from 0.737 to 0.883 by meaning
  (`records/ps-3-pilot-ten.md`). Reopen if task 3 stops: this is what is built in its place.
- **One call of a model on Cloudflare (`ai.run`) from the tool.** Short enough to run in the
  release. He named Claude Code; no model there has been measured on a text of 30,000 to 186,000
  characters here.
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
  least 167,000 tokens, to run a command that judges its own output and costs about 12 cents.
- **Written again at every change.** 198 runs in three days against 30. In money that is now
  about $0.80 a day against $0.12; in an agent's waiting it is 198 times 21 s to 107 s, at landings
  that changed nine lines.
- **Widening `loop-docs`** in place of a second token: one token for the one tool, which is what
  his words on the role would say of a token too. `brain.ts token` refuses a kept name, so it is a
  revoke and then a make, by the orchestrating session; a release between the two enters no doc and
  the next one enters it. That cost is small. It is taken as the larger of the two because a
  second token is ended by one revoke that touches nothing in use. His approval is where he says
  otherwise, and the comment for it should name this.
- **`knowledge.get?whole=true` answering the file.** `brain-x-knowledge` calls `ai.v1/embeddings`
  and nothing else; this is a call to `brain-x-static`, a rule for it, and an answer of 186,433
  characters. The entry names the file and the method that reads it.
- **A file only for a long doc.** Two shapes of entry for one kind, and the three of
  `cloud-brain-dev` would still have no address.

## How each requirement is known to be met

Each is run by an agent of the loop with its own tracker token, with `loop-docs` or
`loop-doc-files` through `knowledge-docs.ts`, with `loop-knowledge`, or with none. "Today" is a run
of 2026-10-12 by this writer. No task is built, so each result after a task is what the answer must
hold, and says where it is run.

| | Check | Today | After its task |
|---|---|---|---|
| R1, task 1 | `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, last line | 20:43, at `9185a722`: `{"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":0,…}`, no `files` | cannot be run before task 1 and its token. Then, after the task's `put --all`: `files` equals `docs` and `filesWrong` is empty. (As built, `sd-1-doc-files`, 2026-10-12: so after a `put --stale` by a copy of the tool that has the task; a release by an older copy leaves a changed doc in `filesWrong` until then) |
| R1, R4, task 1 | `curl -s https://cb4.endpointservices.workers.dev/static/knowledge-docs/lopecode-dev/knowledge/notebook-programming-concepts.md \| shasum -a 256` (a public doc), and `curl -s -o /dev/null -w '%{http_code}'` of `…/knowledge-docs/lopecode-dev/plan/cloud-brain-backlog.md` (a private one), no token | 20:32: the first address answers 404; the second was not asked | after task 1: the first hash is that of `git show origin/main:knowledge/notebook-programming-concepts.md \| shasum -a 256`; the second is not 200. (As built, `sd-1-doc-files`, 2026-10-12: the two addresses are under `/static/docs/`, not `/static/knowledge-docs/`. At 22:52:44 CEST the first hash was git's, `496ebd6e…`, and the second answered 401) |
| R4, task 1 | `bun test ./tests/tools/knowledge-docs.test.ts` | 21:26 to 21:35, at `1d545375`, with the two files of the next row: 47 pass, 0 fail | run in the task's worktree: tests added that a private doc is put with `public=false` and a public one with `public=true`, on every put, and that the file is put before the entry; each fails on the tool of `1d545375` |
| R9, task 2 | `bun test --timeout 60000 ./tests/tools/summarize-papers.test.ts ./tests/tools/paper-sets.test.ts ./tests/tools/knowledge-docs.test.ts` | 21:26 to 21:35: 47 pass, 0 fail. Without `--timeout`, at 21:22 and 21:24, 8 and then 13 of the first file's 26 failed, each at bun's 5 s: the machine's load was 19.9 (`uptime`) | run in the task's worktree: no test that passes today fails. Added: `summarize` with `kind: "paper"` judges by the six headings and with `kind: "doc"` by the five; an answer with a line before its first paragraph is refused; `summarized()` and `lineOf` read a line of either name; the assembly of piece 2 from a summary and a doc of 40,000 characters is 16000 and has the two lines; a put of a changed doc keeps the summary and its line and has the new start; a doc of 16000 has no summary and its put has `staleSince: 0`; `due` at a tenth of the lines and not under; `--plain`; the docs step leaves a doc with a `.running` file under ten minutes old |
| R9, task 2 | `BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi`, last line | 21:22:02: `{"entries":63,"summarized":63,"excepted":[],"failing":[]}`, exit 0 | the same line and exit, run with the tool of the task's worktree after the brief is put. It reads with `loop-knowledge` |
| R9, task 2 | `summarize-papers.ts run --tag awesome-rsi --ids arxiv:2310.01798 --again --dry`, the paper the pilot summarized twice ($0.36 each time). Today `run` skips an entry that has a summary of the same text (its header, step 3) and `--again` is for a paper refused before; task 2 makes `--again --dry` summarize such a paper too, with nothing put | not run: the brief is not put, and the paper would be skipped | cannot be run before task 2. Then: the journal's line is `dry` with no round refused for a heading, and the answer has the papers' six headings. Nothing is put |
| R8, task 2 | the canary, in `knowledge-docs.ts summarize` | not there | each run's first journal line is `"canary":"refused"`, as R7 of the papers' spec |
| R2, R6, task 2 | `knowledge-docs.ts summarize --dry` on the shortest, the median and the longest doc of section 1, through `agent.sh` | section 4's runs of the same three, not through `agent.sh`: $0.0078, $0.0130, $0.0585 | cannot be run before task 2. Then: three journal lines with `usd`, each `dry`; the record says how many had a line before the first paragraph. A second `summarize --due --dry` on a doc refused twice starts no agent for it |
| R2, R3, task 3 | `knowledge-docs.ts status --check-summaries <the ten names>` | not there | cannot be run before task 2. After task 3: exit 0, with `--except` for a doc that opus too refused twice and the issue opened for it. After task 4: exit 0 with no names, and in the last line of `status` no doc in `due` that is not in `refused` |
| R2, task 3 | the put's answer in each journal line | not there | `vectors: 1` for each put of a new summary |
| R5, task 3 | set K, by words, `kind=doc`, `limit=20` (`knowledge-eval/paper-sets.ts`, which task 3 gives `--plan FILE --kind doc`; the sets are at the end of this file in the form it reads) | 20:28:45 and 20:43:29: 1 2 1 1 1 1 1 1 1 1 | no wanted entry lower than third. The ten docs of the pilot are the sets' ten |
| R6, task 4 | `bun test ./tests/tools/lock.test.ts`, whose cases of the docs step set `LOCK_DOCS` to a stub | 20:36: 24 pass, 0 fail | a stub that prints a last line with `due` of two names makes the release print the `summaries due` line with both and exit 0; one with no `due` prints no such line |
| R6, task 4 | `issue-as.sh <token> "get?id=<an issue whose writer ran it>"` | no event of role `summarizer` | a `cost` event of that role whose `usd` is the sum of the journal lines the report names |
| R7, tasks 3 and 4 | the journal | not there | no put with a refused number. The reviewer of task 3 takes five of the ten (the first five by SHA-256 of the name) and locates three claims of each summary's sections in the doc's file; a claim the doc does not make fails R7 for that model |

Reported and not a condition: set L by words and with `semantic=true`, and set K with
`semantic=true`, asked again after the pilot (0.656, 0.517 and 0.594 at 20:43); the cost a doc; how
many were refused once, and for a line before the first paragraph. If set L does not rise, the
record says so.

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
   (As built, `sd-1-doc-files`, 2026-10-12: `sd-1-doc-files` on the tracker; the note at the head of this file.)
2. **`ds-2-one-summarizer`.** The brief `roles/summarizer.md`, and `roles/paper-summarizer.md` as
   the three lines that point at it, both put with `put.sh`. In `summarize-papers.ts`: `summarize`
   as one exported function, the headings by kind, the role's name, a summary's line read in either
   name; the papers' `run` calls it. In `knowledge-docs.ts`: the text of piece 2, a kept summary
   carried over a put, `due`, `staleSince`, `--plain`, the four counts and `refused`, what `cut`
   and `unmarked` count ("What `ac-4` left"), `summarize`, `status --check-summaries`. Tests, and the three checks of R9. `summarize --dry` on three docs.
   No summary is put, of a doc or of a paper.
   (As built, `sd-2-one-summarizer`, 2026-10-12: the note at the head of this file; the record.)
3. **`ds-3-pilot-ten`**, `major`. `summarize` on the ten docs of the sets, with haiku.
   `status --check-summaries` of the ten. One of the ten put back with `put --plain`, read to be
   the text the tool makes today, and summarized again. Sets K and L asked again, both ways. The
   reviewer's five of R7. The cost of the ten and what the other long docs would cost at that rate.
   If R5 or R7 fails: the ten are put back plain and run again with opus, once, and the same gates
   are read. The task ends with the figures on the issue for the owner, and the ten put back plain,
   when both models fail a gate or the ten cost over $1 with haiku. A doc refused twice is run
   again as piece 3, step 2 says, before `status --check-summaries` is read. Before the first put:
   the check of "What `ac-4` left" that no worktree is behind task 2.
4. **`ds-4-the-rest-and-the-release-line`**, `major`. `summarize --due` on the rest with the model
   task 3 kept, `--usd-max 2` for haiku and `--usd-max 20` for opus; `status --check-summaries`.
   The line of `lock.sh` with its test; the sentence in `agents/implementer.md` step 10 and the one
   in `agents/spec.md` step 6; the paragraph of `SKILL.md` step 5 for the role `summarizer`; the
   calling doc's paragraph, and its lines on `summarize-papers.ts` where they name the role;
   `rules.md` is not edited by any task (who records the token there is the orchestrating
   session's, under "A token an approved spec names"). Closes this feature.

Tasks 3 and 4 are `major`: they rewrite the text of kept entries (`SKILL.md`, Triage). As the
papers' spec has it for its tasks 3 and 4: the owner's approval of this spec is his word for the
plan, the orchestrator opens the two with `major` and quotes the approval event in a comment on
each, so `needs-owner` is not put on; each passes review to `awaiting-approval` with its puts made.
`put --plain` is what undoes one. Tasks 1 and 2 rewrite no text but a cut doc's last line, which
`ac-4` wrote without the label, and are not `major`. Task 2 changes the brief of a role that has
run: it puts no entry, and R9's three checks are what its review reads.

A writer of a task of an approved spec may put a brief (`rules.md`, "The files of the Brain an
agent reads"): task 2's two puts under `roles/`, and task 4's two sentences.

## What only the owner can do

- Approve this spec, knowing that tasks 3 and 4 put a summary in the place of 4,700 to 6,600
  characters of each of 43 kept entries, that the papers' role and its brief are changed to take a
  doc (the 63 summaries of papers are not put again), that a summary of a doc cost 1 to 6 cents in
  19 dry runs with haiku and 18 to 82 cents with opus, and that the spec names a token,
  `loop-doc-files`, a second one for `knowledge-docs.ts` where `loop-docs` could be widened ("Not
  chosen"). (As built, `sd-1-doc-files`, 2026-10-12: he chose the widened `loop-docs`, his "3 B" of comment 4734.)
- Approve task 3 and task 4, each after its review: they are `major`.

Nothing else. No kernel, core, database or deployer is changed, no Worker is deployed, no policy
and no rule.

## What the orchestrator makes

(As built, `sd-1-doc-files`, 2026-10-12: not this token. The orchestrating session revoked `loop-docs` and made it again with
`knowledge.put knowledge.list static.put static.list`, comment 4775 of `sd-1-doc-files`. What is said below of
`loop-doc-files` is that token's now, with `docs/` where it says `knowledge-docs/`.)

One token, when task 1 is next, from the main checkout:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-doc-files static.put static.list
```

- **Its methods and no more:** `static.put`, to put a doc's file; `static.list`, for `status` to
  compare each kept file's `sha256` and `public` with the doc's. No `static.get`, no
  `static.delete`, no `static.setPublic`.
- **The tasks that need it:** 1, and every put of a doc after it: the docs step of each landing,
  and `knowledge-docs.ts summarize`.
- **What holds it to its use.** `static.put` by a token writes any path the owner writes but
  `shell/` and `library/`, and `static.list` lists every file. The token is not held to
  `knowledge-docs/`. It is used through `knowledge-docs.ts` and for nothing else, and only under
  `knowledge-docs/`: an agreement, as `loop-roles` is held to `cloud-brain-dev/`. A file a token
  put is served sandboxed, with no script and no origin (`brain-static.ojs`, "Each put records its
  caller").
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

- No summary was put. The 19 of section 4 were written to files of the session's, with a draft
  brief, by an agent not started through `agent.sh`; the scripts of those runs, of the sets and of
  the simulation of section 3 are the session's and are not in the repository.
- No paper was summarized under the draft brief: its paper part was not written. R9's third check
  is task 2's.
- Whether the rule on the answer's first character ends the preface line. Six of nine refused
  first answers had it; the draft brief had the papers' words for it.
- Whether a haiku summary is true to its doc, beyond the one read by this writer.
- Sets K and L, sections 1 to 3 and the outside search were not run again in round 2.
- `static.put` and `static.list` were not called: no token of the loop that may be used for it
  names them (`loop-roles` is held to `cloud-brain-dev/`). That a token's put under a new first
  segment is taken, and what `static.list` answers a token, are read from the seed.
- How long 85 puts of a file take.
- `knowledge.get` was not called: `loop-knowledge` names `knowledge.search` only. That it answers
  the row is read from `view` in the seed.
- The simulation of section 3 took every commit of `origin/main` as a landing and three days as the
  rate. Those days are the loop's busiest on record.
- The simulation of section 3 was not run again at `9185a722`.

## The fresh review before submitting, round 2 (2026-10-12)

One agent with none of the session's context read the changes since `619354c2`. Verdict FIX, seven
findings, each checked and answered above: a `knowledge-docs.ts` from before task 2 puts the cut
text over every summary ("What `ac-4` left", and not mended beyond the order of the tasks); a doc
refused twice stayed due at every landing and made two exit conditions unreachable; "seven of ten"
was not the table's count (six of nine first answers); the printed command named the main
checkout's copy of the tool; `parseSummary` reads no headings and the canary had no place in the
function; a line number of another commit; and a kept entry answered with no `text`. It ran the
three test files (47 pass, 0 fail), `lock.test.ts` (24 pass) and the papers' `check` (63 of 63),
and found `status` at `2be5f382` answering 86 docs and 44 cut, one more than this file's 85 and 43
of `9185a722`. It could not read the tracker or the session's scripts.

## The fresh review before submitting, round 1 (2026-10-12, answered by 20:50 CEST)

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
