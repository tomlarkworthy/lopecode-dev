# Ranking the knowledge search: what was read, measured and changed

Record of 2026-10-11, 08:25 to 09:20 CEST, on `cb4`. Tom, after the call log showed 10 searches by
token or delegation in two days (13 look-ups in all, with those an agent made on the owner's session) and poor answers to them: "yes we need a reranking step. Please do serious research,
record that research in the cluster (more knowledge) and come up with a better algorithm based in
research."

The result is not the one asked for. A model that reads each candidate again (a cross-encoder, the
"reranking step" of the literature) ordered the answers worse than the list it was given on the
questions agents asked and on the builder's, and no better on all 126 together. What
improved the order was joining the search by words to the search by meaning. That is deployed
(`brain-x-knowledge` `ae5ebb4b7608`, 07:16:53 UTC). Every figure below is from a command run in that
hour; the tables are the output of `tools/cloud-brain/knowledge-eval/knowledge-eval.ts run`, the second its
`pooled` part. The ranks they were made from are kept in `knowledge-eval/ranks-2026-10-11.json`.

## What agents had asked

`logs.query` for `method = knowledge.search`, in two-hour windows (one query over seven days answered
no events; the count view answered 189, all on 2026-10-09 and 2026-10-10). The query string is kept
beside each log line, so each question is known.

```
176  the session that built the search: fixed phrases repeated ("export a notebook" 10 times,
     "how do I lease a browser 1" to "10", "zebra", "lighthouse"); 171 of them in two hours
  5  token:claude-knowledge-3725, 2026-10-10 09:56 UTC, about the delegated-authority design
  8  the owner's session, 08:55 UTC, each paired with an unlogged twin: "hash chain audit log",
     "review before deploy", "task subtasks work queue", "backlog", …
```

The 13 are the only questions not written by a session tuning the search. What they were answered,
re-run at 08:30 CEST with a token:

```
delegation holder scope caps widen token   0.59 paper TokenRouter, 0.58 doc cloud-brain-authority
scope approval [module]                    0.55 Sheet, 0.54 Spreadsheet Lens, 0.53 robocoop-5 spec-lock
hash chain audit log                       0.65 robocoop-5-sessions, 0.61 brain-logs
cloud-brain-authority (by words)           three docs, none of them doc:cloud-brain-authority
backlog (by words)                         the cluster doc, SVG editor architecture
```

Two of these are not ranking failures. `doc:cloud-brain-backlog` has the title "Cloud Brain: bugs and
rough edges to fix" and no "backlog" in its 16,000 kept characters: the word is in the file name only.
And "scope approval" has no entry to find: `brain-scopes`, `brain-issues` and `brain-git` have no
module card, because the Brain's notebook has not been put in the library since they were added. That
is not fixed here.

## The question sets

`tools/cloud-brain/knowledge-eval/queries.json`. `want` is the entry that answers a question, or any of several.

| set | questions | who wrote them | who chose the wanted entry |
|---|---|---|---|
| `real` | 12 (the 13 less "scope approval") | agents, on 2026-10-10 | this session, by reading the corpus (grep of the dump for each question's words), before any arm was run |
| `builder` | 18 | the session that built the search (`knowledge-vectors.md`) | that session, at the time |
| `synthetic` | 96 | a fresh agent given 60 entries (a fixed sample by hash of the id: 24 modules, 14 docs, 10 papers, 8 findings, 4 articles and posts), told to write a need in plain words and a keyword form without the title's own words; it skipped 12 with too little text | the entry each was written from |

Limits of these, which bound every figure below:

- 10 of the 12 `real` questions want one of two entries (`doc:cloud-brain-authority`, `doc:cloud-brain-issues`). It is two agents on one day.
- `synthetic` is easy: the search as it was puts the wanted entry in the first three for 97%. A question written from an entry shares its vocabulary whatever the instruction.
- The corpus is 527 entries (400 module cards, 54 docs, 28 findings, 27 papers, 10 articles, 8 posts), dumped with `knowledge.list` at 08:36 CEST.
- A wanted entry is one judgement. No second person labelled anything.

Measures: MRR over the first ten, and the share with the wanted entry first, in the first three, in the first ten.

## What was read

26 sources, each fetched by a research agent (arXiv's API record for title, authors and abstract; the
HTML full text for what is cited from inside a paper; Cloudflare's and Hugging Face's own pages). Eight
arXiv records were fetched again by this session and compared: title and abstract equal in 8 of 8.
They are entries in the Brain (see "In the cluster") and in `knowledge-eval/sources.json` with what
each could not verify. What bears on the decision:

| claim | source | what it says |
|---|---|---|
| A words list finds what vectors miss | `arxiv:2109.08535` | entity questions: BM25 72.0% against DPR 49.7% top-20 accuracy |
| | `arxiv:2508.21038` | a 46-document task that single-vector models fail and BM25 nearly solves |
| Fuse by rank when nothing is labelled | `web:cormack-2009-rrf` | RRF, k=60, "near-optimal, but not critical"; it fused 30 runs, not a words list with a vector list, and CombMNZ beat it on TREC 3 |
| Fuse by score once there are labels | `arxiv:2210.11934` | a convex combination of normalised scores beats RRF in and out of domain; RRF is sensitive to its constant; the one weight settles on few queries |
| Cosine values are not a threshold | `web:hf-bge-reranker-base` and the BGE card | similarities sit "about in the interval [0.6, 1]"; only the order means anything |
| A cross-encoder over the first stage's top | `arxiv:1901.04085`, `arxiv:2104.08663` | the best zero-shot configuration in BEIR, on 16 of 18 datasets over BM25 |
| It can also make things worse | `arxiv:2411.11767` | reranking more candidates ended below retrieval alone in 53.3% (academic) and 44.4% (enterprise) of experiments; it tested `bge-reranker-v2-m3` |
| `bge-reranker-base` on English technical text | `web:hf-bge-reranker-base` | not evaluated: the card lists Chinese and English and reports Chinese and cross-lingual sets; 512 tokens for question and passage together |
| An LLM as the reranker | `arxiv:2304.09542`, `arxiv:2310.09497` | about 20k tokens and 10 requests a query; 10 to 54 s listwise on one GPU |
| Cloudflare's own recipe | `web:cf-ai-search-hybrid-rerank` | BM25 and vectors, RRF by default, `bge-reranker-base` optional; its keyword side defaults to `and` with `or` as an option |

No source was found for three things asked of the review: a quota for each kind when one kind
dominates an index, a length bias of the BGE embedder, and how deep a pool a reranker needs over a
corpus of hundreds. Corrections the review made to this session's brief: C-Pack (`arxiv:2309.07597`)
never mentions the reranker, and RRF "did not beat everything".

## The arms

Nothing was deployed to try them. The runner ranks each question on this machine from: the dump of the
entries; the live search by meaning asked 100 deep (the service as it was); a local SQLite FTS5 table
made with the service's tokenizer and weights; and `@cf/baai/bge-reranker-base` through `ai.run`.
Every answer is cached in `.emitted/rerank/cache.json`.

```
arm                             real (12): MRR  @1   @3   @10     builder (18): MRR  @1   @3   @10  synthetic (96): MRR  @1   @3   @10
as asked                                   0.403 0.25 0.58 0.58                 0.835 0.78 0.89 0.94                0.854 0.76 0.97 0.97
dense                                      0.396 0.25 0.50 0.67                 0.835 0.78 0.89 0.94                0.854 0.76 0.97 0.97
words, all (as it was)                     0.458 0.42 0.50 0.50                 0.250 0.22 0.28 0.28                0.328 0.32 0.33 0.33
words, any                                 0.625 0.50 0.75 0.75                 0.595 0.44 0.72 0.89                0.872 0.81 0.92 0.97
words, any +name                           0.792 0.67 0.92 0.92                 0.602 0.44 0.72 0.89                0.871 0.81 0.91 0.97
rrf dense + any                            0.540 0.42 0.58 0.92                 0.796 0.72 0.89 0.89                0.893 0.82 0.96 0.99
rrf dense + any +name                      0.694 0.58 0.75 1.00                 0.802 0.72 0.89 0.94                0.893 0.82 0.96 0.99
rrf k=10 +name                             0.692 0.58 0.75 0.92                 0.801 0.72 0.89 1.00                0.900 0.82 0.97 1.00
cc a=0.3 +name                             0.792 0.67 0.92 0.92                 0.748 0.67 0.83 0.94                0.904 0.85 0.93 0.99
cc a=0.5 +name                             0.743 0.67 0.75 0.92                 0.772 0.67 0.83 1.00                0.921 0.85 0.98 1.00
cc a=0.7 +name                             0.694 0.67 0.67 0.83                 0.805 0.72 0.89 1.00                0.906 0.82 0.99 1.00
cc a=0.8 +name                             0.583 0.50 0.67 0.67                 0.813 0.72 0.89 1.00                0.884 0.79 0.97 1.00
dense > ce30 head                          0.361 0.25 0.50 0.50                 0.688 0.61 0.72 0.89                0.895 0.83 0.95 0.99
rrf+name > ce30 head                       0.319 0.17 0.50 0.50                 0.654 0.56 0.72 0.89                0.889 0.82 0.95 0.99
rrf+name > ce30 window                     0.514 0.33 0.75 0.75                 0.626 0.50 0.72 0.89                0.852 0.76 0.94 1.00
rrf+name > ce50 window                     0.514 0.33 0.75 0.75                 0.625 0.50 0.72 0.89                0.846 0.75 0.94 1.00
rrf+name > ce30 window, fused              0.656 0.50 0.83 0.92                 0.759 0.67 0.89 0.89                0.901 0.83 0.97 1.00
qwen3 16000                                0.559 0.42 0.67 0.92                 0.863 0.83 0.89 0.94                0.837 0.73 0.96 1.00
qwen3 16000 cc0.5 +name                    0.778 0.58 1.00 1.00                 0.801 0.72 0.83 0.94                0.908 0.83 0.98 1.00
m3 16000                                   0.633 0.50 0.67 0.92                 0.782 0.72 0.83 0.89                0.808 0.70 0.92 0.98
m3 16000 cc0.5 +name                       0.861 0.75 1.00 1.00                 0.736 0.61 0.83 0.89                0.895 0.83 0.95 1.00
```

- `as asked`: what the caller got, by words or by meaning as they asked. `dense`: by meaning for all.
- `words, all`: the search by words as it was, every word needed. `any`: any word, with 37 words that say nothing left out. `+name`: a fourth full-text column with the entry's name (in these rows the last part of the id and the file name of the url; the service has the whole id, and the `live` rows below are that).
- `rrf`: reciprocal rank fusion of the two lists, k=60 unless said. `cc a=`: each list's scores to 0..1 over the list, an absent entry 0, `a` the weight of the meaning.
- `> ceN`: the first N of the list before it, ordered again by the cross-encoder. `head`: it reads the title and the first 1200 characters. `window`: the title and the 1200 characters of the text with most of the question's words. `fused`: its order and the order it was given, by RRF with k=10.
- `qwen3`, `m3`: `@cf/qwen/qwen3-embedding-0.6b` and `@cf/baai/bge-m3` in place of `bge-base-en-v1.5`, every entry embedded through `ai.run` and the cosine worked out on this machine, with 16000 characters of an entry where the deployed model reads 1500. No second index was made.

All 126 questions together, against `as asked`. The interval is a paired bootstrap, 4000 resamples; "better/worse" counts questions whose wanted entry moved up or down within the first ten (a move from 40th to 25th is not counted):

```
arm                              MRR    change  95% interval       better/worse  in first ten
live (what is deployed)          0.877  +0.068  [ 0.018, 0.119]    24/10         125
cc a=0.5 +name                   0.883  +0.074  [ 0.025, 0.124]    24/9          125
qwen3 16000 cc0.5 +name          0.880  +0.072  [ 0.017, 0.129]    26/11         125
m3 16000 cc0.5 +name             0.869  +0.061  [-0.003, 0.124]    26/16         124
rrf dense + any +name            0.861  +0.053  [-0.000, 0.104]    24/9          124
rrf+name > ce30 window, fused    0.857  +0.049  [-0.005, 0.104]    25/14         123
dense > ce30 head                0.814  +0.006  [-0.050, 0.064]    18/20         117
rrf+name > ce30 window           0.787  -0.021  [-0.083, 0.042]    19/28         121
words, all (as it was)           0.329  -0.479  [-0.569, -0.389]   8/76          43
```

## What the figures say

**The search by words was the weakest part.** It needed every word, so "how do I lease a browser"
found nothing. The wanted entry was in the first ten for 43 of 126 questions; with any word, 118; with
the name searched too, 120.

**The two lists together are the best over all the questions, and not on each set.** Words alone are
best on `real` (0.792, above the 0.743 of the two together) and worst on `builder` (0.602); vectors
alone the reverse (0.396, 0.835). `shortest path in a graph` is found by meaning
only: the card of `@tomlarkworthy/dijkstra` is its title and "Cells: step, PriorityQueue, suite,
testing". `backlog` is found by words only.

**The cross-encoder made the order worse where it mattered.** Every arm that lets `bge-reranker-base`
decide the order is below the list it was given, on `real` and on `builder` (30 questions). On
`synthetic` (96) it is level with that list or above the vectors alone (0.895 against 0.854), and over
all 126 the best of its arms is 0.814 against 0.808 for the search as it was and 0.861 for the list it was given. Three of its answers, from the cache:

```
export a notebook [module]        0.948 editor, 0.931 editor-4, 0.899 editor-5 … 0.832 exporter-3 (first by meaning, 0.736)
shortest path in a graph [module] 0.097 d3/scatterplot, 0.051 scrubber … dijkstra 23rd
licence per service (head)        best score 0.0048; the passage that answers is 5,000 characters into the doc
```

It scores a shared surface word highly ("After an export, the import…") and does not know that
Dijkstra is a shortest path, which the embedder does. Reading the window of the text that has the
question's words mends the third case and not the others. Fused back with the order it was given it
is no better than that order (0.857 against 0.861). 502 calls, 30 candidates each, median 929 ms
through `brain.ts`, 5.5 M tokens, about $0.017. The model's card reports no English evaluation; this
is one, on 126 questions, and it is not a statement about cross-encoders in general. A larger one
(`bge-reranker-v2-m3`) is not on Workers AI's list read at 08:35 CEST.

**Another embedder did not help once the words were joined.** `qwen3` reading the whole text is
better than the deployed model alone on `real` (0.559 against 0.396) and no better on `synthetic`
(0.837 against 0.854). Joined with the words the three models are within 0.014 of each other, inside
every interval. A second index and 527 embeddings for that is not taken. It is the cheaper model
($0.0118 a million tokens against $0.0666) and reads 8192 tokens; if the vectors are ever made again
it is the one to try.

**The weight.** `a = 0.5` was chosen on `builder` and `synthetic` (114 questions: 0.879 at 0.3, 0.897
at 0.5, 0.895 at 0.6, 0.890 at 0.7, 0.873 at 0.8; RRF 0.879). `real` was not used to choose it and
reads 0.743 against 0.403. The differences between 0.5, 0.6 and 0.7 are smaller than the difference
between two runs of the same arm (`cc a=0.5 +name` 0.883 from the live vectors, 0.892 from cosines
worked out here over all 527).

**What got worse.** `builder` fell from 0.835 to 0.772: 14 of 18 first before, 12 after. Five of its
questions moved down ("shortest path in a graph" 1st to 5th, "lease a headless browser" 1st to 2nd,
"why is my notebook blank after export" 5th to 9th, "unit tests for cells" 3rd to 4th, "music sequencer
with audio tracks" 2nd to 3rd) and one up ("run code in a container" 11th to 2nd). They are questions
in everyday words that many entries share, or, for the first, a card with no words to match. 10 of 126
questions moved down, 24 up.

## What was changed

`tools/cloud-brain/brain-knowledge.ojs`, deployed to cb4.

- `knowledge.search?q=` by words finds an entry that has **any** of the words, the stop words left out (`knowledgeStop`, `knowledgeMatch`). Before: every word. This changes the answer for every caller of the search by words.
- The full-text table has a fourth column, the entry's id, weighted as the title. It is a new table, `entries_words`: an FTS5 table takes no new column. It is filled from `entries` on the first call that finds entries and no words. `entries_fts` is left as it was and is no longer written.
- `knowledge.search?semantic=true` makes two lists of 100 (Vectorize `topK` 100, which is its limit without values or metadata; the words) and orders by `knowledgeFuse`, the convex combination at `knowledgeHybrid.meaning = 0.5`. Each answer has `score` (0 to 1, a place in this answer), `cosine` when the vectors found it, and a `snippet`: the matched words, or the first 200 characters. Before, an answer by meaning said nothing of the text and the agent needed `knowledge.get` to judge it.
- No model reads the candidates. Price as before: one embedding of the question, $0.00005.

Alternatives not taken, and why: RRF (0.861 against 0.883; it put `dijkstra` 17th where meaning
alone had it first, since an entry one list lacks loses to entries that are middling in both, and the
convex combination has it 5th for the same reason); the
cross-encoder (above); another embedder (above); an LLM over the first ten (not run: the sources give
10 requests and seconds a query, and nothing here measures it).

### The deploy, and 90 seconds of 502

```
07:15:27 UTC  apply  brain-x-knowledge 409112b386f0  verified, 10 tests, 50.6 s
07:15:40      knowledge.search -> 502 "D1_ERROR: 'delete-all' may only be used with a contentless or external content fts5 table"
              the search by words -> 500
07:16:53      apply  ae5ebb4b7608  verified, 10 tests, 20.4 s     the words are cleared with DELETE FROM entries_words
07:17         both searches answer
```

The statement that fills the new table was never run on a database: the tests use `knowledgeFakeSql`,
which answers each statement from a map, and the deployer's verification runs those same tests. Ten
passing tests and `verified` said nothing about it. The first real call found it. Nothing else
searched in those 90 seconds by the log. The fill itself (527 rows, one statement) then ran inside the
first call; its time was not kept apart.

The deployed search, asked the 126 questions (the `live` row): 0.877, and by set 0.743, 0.772, 0.913,
which is the arm it was built from to within 0.008. 258 calls in those minutes, 100 entries asked
each: median 459 ms, p90 621 ms, longest 2146 ms, from the core's log line. The search by meaning as
it was took 0.44 to 0.55 s from this machine on 2026-10-10 (`knowledge-vectors.md`); the two are not
the same measure.

```
semantic=true&q=backlog&limit=3
0.584 cosine 0.528  doc:cloud-brain-backlog        doc:cloud-brain-[backlog]
0.500 cosine 0.586  module:tomlarkworthy:dijkstra  Cells: step, PriorityQueue, suite, testing
0.472 cosine 0.582  module:tomlarkworthy:jamstack  Cells: titleHtml, metadata, settings, …
```

The second and third are the nearest vectors to a one-word question, and they are noise: the fused
score does not say an answer is good, only where it stands.

## In the cluster

Entered with the token `rerank-research` (made for this, revoked at the end), all private, as every
entry is until the owner says otherwise:

- 26 sources at 07:04:29 UTC, `method: research:knowledge-reranking`, tags `search-research` and `reranking`: 19 arXiv papers by id (`arxiv:2210.11934`, …) and 7 others (`web:cormack-2009-rrf`, `web:hf-bge-reranker-base`, …). Each has the abstract or the passage, then what it says for this search and what could not be verified.
- Five findings that cite them, at 07:22:52 UTC: `finding:2026-10-11:knowledge-search:two-lists`, `:cross-encoder-lost`, `:any-word-and-name`, `:embedder`, `:who-searches`.
- A summary of this file, as `doc:knowledge-reranking`, with its address. Not its text: see "The record outranked what it describes".

Asked at 09:26 CEST, 75 s after the last put, `semantic=true&q=should we add a reranker to search`:

```
0.919 paper    arxiv:2411.11767                                   Drowning in Documents: Consequences of Scaling Reranker Inference
0.913 finding  finding:2026-10-11:knowledge-search:cross-encoder-lost
0.873 paper    arxiv:1901.04085                                   Passage Re-ranking with BERT
```

### The record outranked what it describes

The five findings and this file's text were entered, and then the question this file uses as its example was asked again:

```
semantic=true&q=backlog     after the second deploy (not timed)   after the rewording, 07:36:09 UTC
 1  1.000 finding:…:any-word-and-name                               1  doc:cloud-brain-backlog
 2  0.361 doc:knowledge-reranking                                 2  finding:…:any-word-and-name
10  0.135 doc:cloud-brain-backlog
```

A text about a search holds the questions it was tested with, so it matches them better than the entry
they were for. The finding was reworded without the word, and the entry for this file is a summary
written without the questions. The 30 questions of `real` and `builder` were not all asked again after
the entries went in; the `live` row above is from before them. Four more were asked at 07:36: `cloud-brain-authority` first as before, and the three others answered as before the entries.

### A second deploy, of words only

`12fcc190ec76`, 07:34:49 to 07:35:10 UTC, verified, 10 tests: the prose and the test changed after the fresh review. No statement and no handler changed.

## Cost

The owner's `quota.get` read 0.02205 at 08:22 CEST and 0.184113 at 09:20: $0.162 for the hour. About
$0.03 of it is the look at the logs before this work; the rest is roughly 60 `logs.query` calls, the
cross-encoder ($0.017 by its tokens, more as charged: `ai.run` charges the `usd` the caller names),
three embedders over 527 entries, and about 500 searches by meaning. Another session was deploying in
the same hour, so not all of it is this work's.

## Not done

- `brain-scopes`, `brain-issues` and `brain-git` have no card. `library.put` of the Brain's notebook would enter them; not run, since which file is put is the library's own procedure (`library-homes.ts`).
- 51 of 400 cards are a title and cell names (`knowledge-vectors.md`). A sentence of what a module is for, written once for each (document expansion, `arxiv:1904.08375`), is the one method read here whose cost is not paid at each search. Not tried.
- No quota for each kind. Docs are 54 of 527; whether module cards crowd them out after this change was not measured apart.
- `/llms.txt` still says an answer is pointers (`title`, `kind`, `url`, `id`); it now has a `snippet` too. That sentence is in the core, which was not deployed.
- The text of a doc past 16,000 characters is not kept, so not searched by words either.
- `entries_fts` is still in the database on cb4.
- The eval reads a dump. `knowledge-eval.ts dump` refreshes it; a wanted id that is gone makes `run` throw.
- An agent that does not search is not helped by a better order. 13 look-ups in two days was the starting observation and nothing here changes it.
