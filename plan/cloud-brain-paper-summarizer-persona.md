# Cloud Brain: a paper summarizer, one subagent a paper, whose summary is what the entry's vector is made from

Spec of the feature `paper-summarizer-persona` on cb4's tracker. Written 2026-10-11, from 19:50
CEST to the time of its commit, from `lopecode-dev` `f7ecb131` and the tracker at event 1544. Nothing here is built. No
summary has been written by the role, so every number under "The design" is an estimate and says
so; every number under "What exists today" is from a command run in that half hour, named beside it (the first writing of this file was committed at 20:03 CEST).

Amended the same evening, after the submit (event 1578): the comment of event 1571 arrived while
this file was being written and was read only afterwards. It says the owner installed poppler,
in his words "ok I also installed poppler for the big ones". `which pdftotext` answered "not
found" at 19:53 CEST and `/opt/homebrew/bin/pdftotext`, version 26.10.0, at 20:06. The first
writing (`2a6b756d`) read the four papers without arXiv HTML from arXiv's TeX source and the
publisher's page; this one reads them from the kept PDF, and the token names `static.get` too.

The issue has no parts: it is the owner's request, filed for him by a session. So there are no
gathered reports to list, and the eight questions the filing session left "for the spec to settle"
are taken in their place.

## What was asked

Tom, 2026-10-11, quoted whole in the issue's body (event 1517), in order:

> yes save copied, but the content should also be indexed by the knowledge vector search too

> Yes we need to upload a detailed summary of the whole paper as the embedded text. Our task  loop can do but it should use subagents on one paper at a time. We need a standard prompt for the subagent, this would be a new persona "paper summerizer"

Between the two he wrote "Use the best model availible in CF for the task." and replaced that
message with the second. The filing session read this as: subagents of the loop, no Cloudflare model.
This spec takes that reading.

"Persona" is the word he used the same day for the reviewer ("reviewer becomes a persona with a
smaller knowledge knowledgebase and reduced tooling", `plan/cloud-brain-lean-reviewer-persona.md`).
What was built from it is `cloud-brain-dev/agent.sh ROLE "task"`: a `claude -p` with a four-line
prompt whose brief is a file of the Brain, `brain/roles/ROLE.md`. So "a new persona" is read here
as a second role of that kind, not a new brief under `.claude/skills/brain-maintenance/agents/`.
That is this writer's reading, not his words. If it is not what he meant, the approval of this
spec is where he says so.

## The requirements

| | Requirement | From |
|---|---|---|
| R1 | A standard prompt exists for the role `paper-summarizer`, and one subagent is run for one paper. | "a standard prompt for the subagent", "subagents on one paper at a time" |
| R2 | Each kept paper's entry holds a detailed summary of the whole paper, and the entry's vector is made from that summary. | "a detailed summary of the whole paper as the embedded text" |
| R3 | A summary states nothing the paper does not state. | the filing session's eighth question; `philosophy.md` line 5 (reliable) |
| R4 | The entry says its text is a model's summary, of what and when. | the filing session's fourth question |
| R5 | What the search finds today it still finds. | measured below: the search is near its ceiling on what is kept |
| R6 | The loop can run it again on papers entered later, with no session's memory. | "Our task loop can do" |

The eight questions of the issue's body, each in one line:

| Question | Answer here |
|---|---|
| Where the summary goes | First in `text`. A lead paragraph that fits the embedded 1500 characters, then the summary by section, then what the entry held before (R2, R5). |
| "Detailed" against 1500 embedded characters | `chars` is not raised. The lead paragraph is the embedded text; the detail is found by words. See "Not chosen". |
| How a subagent reads a whole paper | It is handed the text as a file. A tool makes it: arXiv's HTML, else `pdftotext` of the kept PDF. All 63 have one of the two (below). |
| How the entry records that it is a summary | The put's `method`, which the service keeps as `changed.method`; a tag; and one line in the text with the address read and the SHA-256 of the text read (R4). |
| Which papers | The 63 with the tag `awesome-rsi` first. The tool takes a tag, so the others are a later task (R6). |
| The two `research:memento-3` entries | Treated as the rest: their text stays, after the summary. |
| How the loop is told to run it | Ordinary tasks whose writer runs one command. No new label. One row is added to `SKILL.md` for the cost line. |
| A check that a summary says what the paper says | A number in a summary that is not in the text read refuses the put, mechanically. A reviewer locates three claims of each of five summaries in the text read (R3). |

## What exists today

Measured 2026-10-11 19:50 to 20:01 CEST on cb4 with the token `loop-knowledge` (which names
`knowledge.search` alone). The search by words answers each entry with its `text`, so one call
reads the set: `knowledge.search?kind=paper&tag=awesome-rsi&limit=100&q=the+a+of+and+we+in`.

```
entries with the tag awesome-rsi          63   (61 method research:awesome-rsi, 2 research:memento-3)
  file under corpus/…/arxiv/              61   (59 awesome-rsi, 2 memento-3)
  file under corpus/…/nature/              2
  public                                   0   each reads by: owner, which a token's put reads too
  text at the limit of 16000 characters   56
  with "Body, from arXiv's HTML version"  57   the marker is at character 942 to 2177, median 1727
  title + abstract longer than 1500       47 of those 57
```

**The body of a paper is in no vector today.** The service embeds
`(title + "\n\n" + text).slice(0, 1500)` (`brain-knowledge.ojs`, `index`, and
`knowledgeVectors.chars`). The body starts at character 1727 of the median text. For 47 of the 57
the abstract itself is cut before its end. So each vector is the title and most of an abstract.

The six without a body, and what was fetched for each at 19:55 CEST:

```
arxiv:2508.07407   arxiv.org/html 404   arxiv.org/e-print 200, gzip, 6.7 MB
arxiv:2310.02304   arxiv.org/html 404   arxiv.org/e-print 200, gzip: main.tex and math_commands.tex, 146,288 characters of TeX
nature:s41586-023-06924-6   nature.com/articles/… 200, "Open access", 154,305 characters with the tags taken out
nature:s41586-026-10265-5   nature.com/articles/… 200, "Open access", 141,417 characters
arxiv:2303.11366, arxiv:2605.09998   (memento-3) text of 3890 and 4492 characters written by that work; arxiv.org/html not tried for them
```

So each of the four the issue's body calls without text has one at a public address. Those
routes are not used (see "Not chosen"): since 20:06 CEST this machine has `pdftotext`. The
session that filed the issue ran it on the kept files of the four (event 1571; its numbers, not
run again here): 138,046 characters for `arxiv:2310.02304`, 248,661 for `arxiv:2508.07407`, 62,249
and 74,525 for the two Nature papers, each in 2 s or less. It did not compare `pdftotext`'s text
with arXiv's HTML on a page of two columns, and neither did this writer.

**No token of the loop writes to the knowledge base.** The names kept in `.emitted/cb4-tokens.json`
(names only, read with `json.load(...).keys()`): `loop-bluesky`, `loop-deploys`, `loop-knowledge`,
`loop-library`, `loop-roles`. `loop-docs`, which `knowledge-docs.ts` asks for, is not among them.
A token that named `knowledge.put` entered 75 entries on 2026-10-11
(`records/knowledge-by-says-owner-for-a-token.md`, which landed while this file was being landed);
which token, and whether it is the one that entered these papers, was not found: it is not kept under a name of the loop.

**The search already finds a paper by what its kept text says.** Two sets of ten questions were
written by this writer from ten of the 57 entries (sorted by id, every sixth from the third), each
a detail of the body in other words than the title's. Set A is from the text the entry keeps
(characters 8800 and 13600 of 16000). Set B is from the paper past what is kept, read from
`arxiv.org/html/<id>` at 62% and 90% of the body, never before character 17500. Asked at 19:59
and 20:00 CEST, `knowledge.search?semantic=true&limit=20`, all kinds:

```
        MRR    first  in 3  in 10
set A   0.950    9     10    10     kept text; by words alone, kind=paper: 1.000, 10 first
set B   0.753    6      9    10     past the kept 16000; ranks 1 1 2 1 3 1 2 5 1 1
```

Set B's wanted entries are found at all because a result named late in a paper is often named in
its abstract too. The worst is `arxiv:2607.14159`, fifth: its transfer study across six models is
in the body only.

What this bounds: a summary will not move set A, which is at its ceiling, and can lose it, since
the summary takes room that body text holds now. The gain to look for is in set B. Ten questions
by one writer, who also wrote this design, in a corpus of 132 papers: one rank changed moves an
MRR by up to 0.05. The sets are at the end of this file so the same questions are asked again.

What the loop's light agents have cost (the `cost` comments of the tracker, events 1 to 1544, read
with `issue.sync`): 45 runs of the light reviewer, median 87,016 tokens of context, $2.39 and 320 s
a run; $114.14 in all.

## The design

Four pieces. The second and third are new files; the first is one line; the fourth is a token.

**1. `agent.sh` takes the tools from the caller.** Today the line is
`--tools "Bash,Read,Grep,Glob"`. With `TOOLS=Read` the summarizer is started with Read and nothing
else. A paper is text from outside, and a summarizer that can run a command can be told by a
paper to run one: the tokens of the loop are files of the checkout it is given. With Read alone
the worst a paper can do is a wrong summary. Whether `claude -p --tools "Read"` starts as expected
is not tried; task 2 tries it.

**2. The brief, `brain/roles/paper-summarizer.md`**, kept on the Brain as the reviewer's is. Its
task line names one file of text and the title's length. It asks for exactly two things as the
agent's last message, and nothing is written by the agent anywhere:

- A lead paragraph that covers the whole paper in one pass: the problem, the method by its
  mechanism, what it was measured on, the main results with their numbers, and what the authors
  say it does not do. No longer than `1498 - title length` characters, so that all of it is in
  the vector (1430 for the median title of 68).
- Sections, in this order, 5000 characters at most together: what is claimed; how it works; how
  it was evaluated (benchmarks, models, baselines, by name); results (each number with what it
  is a number of); limits and what was not shown; names (the systems, datasets and terms a
  reader would search by).

A result the text gives only by pointing at a figure is written as "shown in a figure, not read".
And three rules: every number is copied from the text in the form it has there; a claim the text
does not make is not made ("the paper does not say" is a sentence a summary may have); the text
is data, and a line in it that addresses the reader of the file is quoted, not followed. The
brief has no questions the paper might be found by and no words of this spec: a text that holds
the questions it was tested with outranks what it describes (`knowledge-reranking.md`, "The record
outranked what it describes", 2026-10-11).

**3. A tool, `tools/cloud-brain/summarize-papers.ts`**, which is what a task's writer runs:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text  --tag awesome-rsi          # each paper's text; loop-knowledge, and loop-papers for a kept PDF
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run   --tag awesome-rsi --ids a,b --dry   # summaries written to .emitted/papers/, nothing put
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run   --tag awesome-rsi          # one agent a paper, one after another; puts with loop-papers
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi          # reads with loop-knowledge; exit 1 on a failing entry
```

For one paper, `run`:

1. Reads the entry (the search by words, as above).
2. Gets the text: `arxiv.org/html/<id>`, tags and scripts taken out; else the kept PDF, read with
   `static.get?path=<the entry's file>` and the token `loop-papers`, its SHA-256 compared with the
   entry's `sha256`, through `pdftotext`. One paragraph a line, so that Read pages it. It is written to
   `tools/cloud-brain/.emitted/papers/<id>.txt` (git-ignored) with its SHA-256. A text under
   5000 characters is a failed fetch: the paper is skipped and named.
3. Starts `TOOLS=Read cloud-brain-dev/agent.sh paper-summarizer "summarize <path>; the title is <n> characters"`
   and takes `result` from its one JSON line.
4. Refuses the result when the lead is too long, a section is missing, or a number in it is not
   in the text read. A number is a run of digits with its `.`, `,` and `%`; it is looked for as
   written, in the same `.txt` the agent was given and nowhere else. Refused once, the same agent is sent the list (`agent.sh --resume`); refused twice,
   the paper is skipped and named.
5. Puts, with the token `loop-papers`: `{ id, text, tags: ["paper-summary"], method: "paper-summarizer" }`,
   where `text` is, in order: the lead; the sections; the line
   `Summary by paper-summarizer (<model>), <day>, of <address read>, sha256 of the text read <hash>.`;
   the line `As entered before the summary:`; and what the entry held, cut so the whole is 16000
   characters. On a second run what the entry held is what follows that line, so a summary is
   replaced and not stacked.
6. Appends one line to `.emitted/papers/journal.jsonl`: the id, the agent's `session`, `usd`,
   `context`, `ms`, the put's answer, the numbers refused.

A paper whose entry already has the tag and whose line names the same hash is skipped, so a run
that died is run again. The entries have 3 or 4 tags today and the limit is 16, so the tag fits
(61 with 3, 2 with 4; counted 20:05 CEST).

No change is made to `brain-x-knowledge`. Three things it does already carry R2 and R4, read in
`brain-knowledge.ojs` on 2026-10-11:

- a put whose `text` differs clears the vector's id and embeds again in the same call
  (`const vid = old && old.vid && … old.text === r.entry.text … ? old.vid : null`), and answers
  `vectors: 1`;
- the put's `method` is kept as `changed.method` (`said`), while `method` stays as first entered;
- `tags` given are joined with those kept.

With a lead of at most `1498 - title` characters first in `text`, the 1500 embedded characters are
the title and the lead, whole.

**4. A token, `loop-papers`**, naming `knowledge.put`, `knowledge.search` and `static.get` (the kept PDFs are private files). It is the owner's to
make (below). It is held by the tool, never by the summarizer.

### What one run is expected to cost (an estimate, not measured)

The median body is 32,660 characters and the longest 201,006 (the issue's body; not measured
again). The summarizer reads its brief and one file and writes about 6500 characters, with no
tool loop. The light reviewer's median of $2.39 a run is an upper mark, not a forecast: at that
price 63 papers are $151. The pilot of task 3 gives the first measured figure, from `usd` of
`agent.sh`'s JSON line. The model is `agent.sh`'s default, opus: his withdrawn message asked for
the best model, and a wrong summary is found by nobody afterwards. Run one after another, 63
papers at the reviewer's 320 s would be 5.6 hours; that too is an upper mark.

### Not chosen

- **Raising `chars`, or another embedder that reads the whole text.** The model reads 512 tokens,
  which 1500 characters of English nearly fill. `knowledge-reranking.md` measured
  `qwen3-embedding-0.6b` over 16000 characters on 126 questions the same day: with the words
  joined, the three models were within 0.014 of each other. It needs a second index and every
  entry embedded again.
- **A vector for each part of a paper** (a tree of summaries, `arxiv:2401.18059`; a vector a
  proposition, `arxiv:2312.06648`). The service keeps one vector an entry and says so; this is a
  change to its table, its index and its search, for 63 entries.
- **The summary as an entry of its own.** A question would then be answered with two rows for
  one paper, and the kept PDF's entry would still have the abstract's vector.
- **A model on Cloudflare writing the summary in a Worker.** He replaced that message with one
  that names the loop's subagents.
- **The kept PDF for every paper.** One route in place of two, and the summary would always be
  of the file the entry names. Not taken because `pdftotext` on two columns, tables and formulas
  has not been compared with arXiv's HTML here; task 1 compares them on three papers and its
  record says which should be first. The cost of HTML first: it is arXiv's newest version, and
  the kept file may be an earlier one. The line in the entry names what was read.
- **arXiv's TeX source and the publisher's page for the four without HTML.** Both answered 200
  (above). Two more fetchers, for text the kept PDF now gives.
- **The Read tool on the PDF's pages**, which shows figures and tables as images, 20 pages a
  request (event 1571). A summary from text alone can miss a number that is only in a figure;
  the brief says to write "shown in a figure, not read" there. Not tried, and its cost a paper is
  not known.
- **Cloudflare's Markdown conversion** (`ai-tomarkdown-pass-through`, linked to this issue at
  event 1553). Not needed for these 63 on this machine. A summarizer run where there is no
  `pdftotext` would need it.
- **The summarizer holding the token and putting its own summary.** One call fewer, and a paper's
  text then reaches an agent that can write to every entry of the Brain.
- **Dropping the abstract and the body from the entry.** It would leave room for a longer
  summary and lose set A, which is found by the body's own words.
- **Several papers at once.** His words are "one paper at a time". The tool runs them one after
  another.

## How each requirement is known to be met

Each is run by an agent of the loop with `loop-knowledge` or no token.

| | Check |
|---|---|
| R1 | `curl -s -o /dev/null -w '%{http_code}' https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/paper-summarizer.md` answers 200. `journal.jsonl` has one `session` for each id and no `session` twice. |
| R2 | `summarize-papers.ts check`: every entry of `knowledge.search?kind=paper&tag=paper-summary&q=summary&limit=100` has `changed.method` `paper-summarizer`, the line `Summary by paper-summarizer`, a first paragraph of at most `1498 - title length` characters, and the six sections. The journal's put answers each have `vectors: 1`. And for each entry, `knowledge.search?semantic=true&kind=paper&limit=1&q=<the lead's first 300 characters>` answers that entry. |
| R3 | The journal has no put with a refused number. The reviewer takes five entries (the first five by SHA-256 of the id), and for each locates three claims of the sections in `.emitted/papers/<id>.txt`, which `summarize-papers.ts text --ids …` writes again; the hash in the entry's line is the file's. |
| R4 | In `check`, above: the method, the tag and the line. |
| R5 | Set A asked again: no wanted entry lower than third (today: 9 first, 1 second). |
| R6 | `summarize-papers.ts run --tag awesome-rsi` a second time puts nothing and says 63 skipped. The command is in `knowledge/calling-a-cloud-brain-from-this-checkout.md`, beside `knowledge-docs.ts`. |

Reported and not a condition of landing: set B asked again (0.753 today), and the cost a paper.
If set B does not rise, the record says so. The owner asked for the summary as the embedded text;
that it also improves the order is a guess of this spec, with ten questions behind it.

The search by words for `paper-summarizer` among papers answers 0 entries today (20:01 CEST), and
`summarizer` 32. That the tag filter and the word `summary` find exactly the summarized entries
after a put is not verified; task 3 finds out on ten.

## The tasks, in the order they land

1. **`ps-1-paper-text`**: `summarize-papers.ts text`, with tests on two kept fixtures (an arXiv
   HTML page, a PDF of two columns). Run over the 59 with arXiv HTML, with `loop-knowledge`; the
   record has the address and the character count of each. The four from a kept PDF, and the
   comparison of the two routes on three papers, are run when the token exists.
2. **`ps-2-summarizer-role`**: `TOOLS` in `agent.sh`; the brief, put with `put.sh`; `run --dry`
   and `check`, with tests of the assembly, the length rule, the number rule and the second-run
   rule. Run dry on three papers; the record has the three summaries' lengths, the numbers
   refused, and `usd` of each. No put to the knowledge base.
3. **`ps-3-pilot-ten`**: after the token exists. `run` on the ten papers of the question sets.
   `check`; sets A and B asked again; the cost of the ten and what 53 more would cost at that
   rate. If that is over $50, the task ends there with the figure on the issue for the owner;
   otherwise task 4 goes on.
4. **`ps-4-the-rest`**: `run` on the other 53, in the way described under the list; `check`; the doc line of R6; in `SKILL.md` step 5,
   `paper-summarizer` added to the roles of a `cost` comment, one comment a task with the sum of
   the journal's `usd` and `"light":true`.

A run is longer than a writer's turn: ten papers at the reviewer's 320 s are 53 minutes and 53
papers 4.7 hours, against a median of 538 s for an implementer of the loop (79 runs, the `cost`
comments). So the writer of tasks 3 and 4 starts `run` as a background command, which outlives
no session but its own, and reads `journal.jsonl` when it is told the command has ended. A
writer that ends first leaves a run that stopped with it; the next writer starts the same
command, which skips what is done. If the pilot measures more than 3 minutes a paper, task 4 is
opened as tasks of 15 papers (`--ids`), each one writer and one review.

Who puts the brief: `rules.md` says of the token `loop-roles`, "The overseer changes a brief with
it; no other role does." The reviewer's brief was first put by the writer of its task
(`records/light-reviewer-tab-and-docs.md`, line 84). A new brief is not a change to one, so the
writer of task 2 puts it and the review reads the Brain's copy. If the owner reads the rule as
covering the first put too, the overseer puts the file task 2 wrote.

## What only the owner can do

1. Make the token, once, from the main checkout:
   `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-papers knowledge.put knowledge.search static.get`.
   Tasks 3 and 4 wait for it, and the PDF half of task 1; task 2 does not. `static.get` by a
   token reads every file of the store, as `loop-roles` does; the tool reads only the `file` of a
   paper entry. It is the first token of the loop that writes to
   the knowledge base, and `knowledge.put` by the owner's token changes any entry of the Brain's,
   not papers only: that the tool puts nothing but `{ id, text, tags, method }` of a paper entry
   is an agreement, as `loop-roles` is.

## Read

In the Brain, 2026-10-11 19:52 CEST, `knowledge.search?semantic=true&limit=8` with `loop-knowledge`:

| Search | Found | Used |
|---|---|---|
| summarize a whole paper for embedding | `finding:2026-10-11:knowledge-search:embedder`, `arxiv:2212.10496` | the finding, read in `knowledge-reranking.md` |
| document summary as retrieval text for dense vector search | `arxiv:2212.10496` (HyDE), `arxiv:1904.08375` (doc2query) | both, as below |
| faithful scientific paper summarization hallucination | `arxiv:2309.11495` (Chain-of-Verification), `arxiv:2608.17906` | the first |
| subagent one paper at a time standard prompt | `doc:effective-use-of-fable`, papers of the corpus | nothing bore on it |
| what text of an entry is embedded 1500 characters | the embedder finding | as above |
| reading a PDF without pdftotext | `module:tomlarkworthy:sign-a-pdf` | nothing bore on it |

`tools/cloud-brain/knowledge-reranking.md` was read in its parts on the embedder, the question
sets and "Not done". Its "Not done" names writing a sentence of what a thing is for into its
entry (document expansion, `arxiv:1904.08375`) as the one method read there whose cost is not
paid at each search, and not tried. This project is that method on the papers.

Outside, the arXiv records (title and abstract from `export.arxiv.org/api/query`, 19:57 CEST).
**Each was read in its abstract only; no claim below was checked in a paper's body.**

- `arxiv:1904.08375`, Document Expansion by Query Prediction: text added to a document before it
  is indexed improves retrieval at no cost at search time. The ground for a summary in the entry.
- `arxiv:2401.18059`, RAPTOR, and `arxiv:2312.06648`, Dense X Retrieval: retrieval over summaries
  at several levels, and over single propositions, each reported better than passages. Both need
  more than one vector a document. Under "Not chosen".
- `arxiv:2309.04269`, Chain of Density: a summary rewritten to hold more named things in the same
  length was preferred by readers to a plain one. The lead paragraph's instruction (name the
  method, the benchmarks, the numbers; fixed length) follows it. The iteration itself is not asked
  of the agent.
- `arxiv:2309.11495`, Chain-of-Verification: a draft checked by questions answered apart from it
  has fewer invented facts. Here the check apart from the draft is the tool's, on numbers, and the
  reviewer's, on claims.
- `arxiv:2307.03172`, Lost in the Middle: a model uses the middle of a long input worst. A reason
  for the reviewer to take claims from the sections on evaluation and results, which are from the
  middle of a paper. Whether it holds for the model used is not known here.

Not read: anything on how often a model's summary of a scientific paper misstates it. The number
rule and the sample are this spec's guard, with no measured rate behind them.

## The question sets

Asked with `knowledge.search?semantic=true&limit=20&q=`. `want` is the entry; the rank on
2026-10-11 follows each.

Set A, from the kept text:

```
arxiv:2305.11738  1  verify a model's first answer with external tools and feed the critique back, with an oracle variant that fixes only the wrong samples
arxiv:2310.01798  1  how often does GPT-3.5 keep its first answer on grade school math after two rounds of revising itself
arxiv:2410.04444  1  agent that reads its own local and global Python variables at run time to know itself
arxiv:2506.13131  1  ensemble of a fast cheap model for many candidates and a stronger model for occasional better suggestions in evolutionary code search
arxiv:2510.23601  1  run each task several times and keep generated MCP tools only from the runs that got the right answer
arxiv:2603.06333  1  ratio of capability gain to goal drift falls from near 1.0 to about 0.6 after two or three improvement cycles
arxiv:2604.25850  1  every edit to the harness is a falsifiable file-level claim in a versioned manifest that the next round confirms or reverts
arxiv:2607.14159  1  harness configuration as a product of six functional dimensions with a controller that retrieves evidence from an experience bank
arxiv:2609.14857  2  roll out the agent K times per task with binary rewards and split tasks into three groups, keeping a memory of past trajectories
arxiv:2609.35596  1  synthetic personal workspace with 84 months of email, calendar and finance records for one fictional user to test self-evolving agents
```

Set B, from the paper past the kept 16000 characters:

```
arxiv:2305.11738  1  lowers toxic generations while keeping fluency and diversity, on par with supervised methods without extra training data
arxiv:2310.01798  1  multi-agent debate does not outperform self-consistency on GSM8K with the same number of responses
arxiv:2410.04444  2  outperforms Meta Agent Search by 11% on the MGSM mathematics task starting from only a chain-of-thought policy
arxiv:2506.13131  1  discovered a scheduling heuristic for data center workloads and optimized Pallas JAX kernels used to train Gemini
arxiv:2510.23601  3  ablation of retrieving tools by description only, by triggering use case only, or by both concatenated
arxiv:2603.06333  1  fabrication prevention had 91 violations, a 28.2% task-level rate, and overconfidence constraints 48
arxiv:2604.25850  2  77.0% on Terminal-Bench 2 after ten iterations in about 32 hours, against Codex 71.9% and Terminus-2 62.9%
arxiv:2607.14159  5  learned harness transferred without re-search to Claude, Gemini, Qwen, GLM and DeepSeek and every model improved
arxiv:2609.14857  1  share of tasks where successful and failed trajectories coexist falls over evolution epochs
arxiv:2609.35596  1  chain-of-thought monitor with an ExtraTrees classifier flags risky reasoning traces at a low false positive rate
```

A summary that holds a set-B question's own figures will be found by them. That is the purpose
and also why set B is easy to raise: the task that reports it says how many of the ten wanted
entries' summaries hold the question's numbers.
