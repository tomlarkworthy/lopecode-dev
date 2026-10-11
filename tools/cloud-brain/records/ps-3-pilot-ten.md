# ps-3-pilot-ten: the first ten summaries put, one restored and summarized again, the sets asked again

Task 3 of `plan/cloud-brain-paper-summarizer-persona.md`. Written 2026-10-11, 22:26 CEST (`date`), by the task's
writer. The task is an act: eleven puts of a summary and one put of a restore to the knowledge base of cb4, with the
token `loop-papers`. What is committed is this record and a tool that asks the plan's question sets, with its test
file. No seed, no deploy.

`P` is `<main checkout>/tools/cloud-brain/.emitted/papers`. `TEN` is the ten ids of the plan's question sets:
`arxiv:2305.11738,arxiv:2310.01798,arxiv:2410.04444,arxiv:2506.13131,arxiv:2510.23601,arxiv:2603.06333,arxiv:2604.25850,arxiv:2607.14159,arxiv:2609.14857,arxiv:2609.35596`.
Every command was run from the task's worktree (`lopecode-dev` at `8c837a66`, `cloud-brain-dev` at `3801492`), with
`claude` under `~/.claude-personal`. Times are `date` on this machine, or a journal line's `at`.

## What the task asked, and the answer to each

| Asked | Answer |
|---|---|
| `run` on the ten | 10 put, 0 refused twice, 0 failed, exit 0. 22:11:50 to 22:21:09 CEST |
| `check` | `{"entries":10,"summarized":10,"excepted":[],"failing":[]}`, exit 0, three times (22:21, 22:22 for the one, 22:23) |
| one restored and summarized again (R8) | `arxiv:2310.01798`: the text cb4 answered after the restore has the SHA-256 of task 1's record; summarized again, `check` passes |
| sets A and B again, A both ways (R5) | A by meaning 0.950 before and 1.000 after; A by words 1.000 and 1.000. R5 holds: no wanted entry lower than first |
| refused once, refused twice | 5 of 10 once, 0 twice. 4 for the sections' length, 1 for a number |
| the cost of the ten, and 53 more at that rate | $7.78 for the ten; 53 more at $0.778 a paper are $41.21. By length of text and not by paper it is $51.50 (below) |
| over $50, or R5 fails: stop | Neither by the plan's words ("at that rate"). The second figure is over, and is said to the owner on the issue |

Reported and not a condition: set B by meaning, 0.737 before, 0.883 after.

## Before any put

The plan's ranks are from 19:59 CEST. They were read again before the run, since entries had been put to the
knowledge base in between by other work. `paper-sets.ts` (new, below) reads the two sets from the plan's last section.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/paper-sets.ts --out P/sets-before.json      22:11:05 CEST
A by meaning  0.950   1 1 1 1 1 1 1 1 2 1
A by words    1.000   1 1 1 1 1 1 1 1 1 1
B by meaning  0.737   1 1 2 1 3 1 3 5 1 1      the plan: 0.753, with 2 where this has the second 3 (arxiv:2604.25850)
```

The ranks are in the order of `TEN`. So one rank of set B had moved by one place in two hours with no summary put.

## The run

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi --ids TEN
{"papers":"…/.emitted/papers","entries":10,"put":10,"dry_written":0,"refused":0,"failed":0,"summarizedBefore":0,"refusedBefore":0,"skipped":[],"usd":7.775879}
```

Started as a background command; model opus, the tool's default. The journal's lines of this task, 14 of them, are
those with `at >= 1791749510627` (the 12 before are task 2's dry runs). Printed with:

```
python3 -c "
import json,datetime
for l in map(json.loads,open('P/journal.jsonl')):
    if l.get('at',0)>=1791749510627: print(datetime.datetime.fromtimestamp(l['at']/1000).strftime('%H:%M:%S'),l.get('id') or 'canary',l.get('outcome') or l.get('canary'),l.get('rounds',''),l.get('usd'),l.get('ms',''),l.get('context',''),l.get('chars',''),l.get('lead',''),l.get('sections',''),(l.get('session') or '')[:8])"

at        id                 outcome  rounds  usd       ms      context  chars    first  sections  session
22:11:56  canary             refused          0.002559                                             5a28eb12
22:13:22  arxiv:2305.11738   put      2       2.076611  81594   114361   210535   1144   4060      fddeefff
22:14:01  arxiv:2310.01798   put      1       0.355724  33466   38769    56111    1160   4648      986b6271
22:14:48  arxiv:2410.04444   put      1       0.442765  41336   46654    71098    1103   4960      cd2bdb6b
22:15:30  arxiv:2506.13131   put      1       0.583906  36238   66747    118263   1185   4726      828a4361
22:16:35  arxiv:2510.23601   put      2       0.814165  58576   42193    53133    1243   4801      d84118a4
22:17:35  arxiv:2603.06333   put      2       0.823906  52449   44098    61090    1175   3790      019b81b0
22:18:24  arxiv:2604.25850   put      1       0.462710  42954   49086    77488    1173   4704      ec666eb9
22:19:23  arxiv:2607.14159   put      2       0.832764  52660   44253    58094    1088   4171      337c0a83
22:20:29  arxiv:2609.14857   put      2       0.986949  59629   51275    75365    1207   4493      1b1ecfdf
22:21:09  arxiv:2609.35596   put      1       0.396379  34948   42957    71750    1263   4178      46b188de
22:22:07  canary             refused          0.002559                                             95ec21b6
22:22:44  arxiv:2310.01798   put      1       0.357979  34077   38757    56111    1076   4919      bfaa3f05   after the restore
22:23:04  canary             refused          0.002577                                             eb08ac48   the second run on the ten
```

Each of the eleven puts answered `{"entered":0,"changed":1,"ids":[…],"vectors":1}`. Every text was arXiv's HTML, and
each text's SHA-256 was the one task 1's record has for it, so no page had changed since 20:52. Each entry as put is
16,000 characters.

**Refused once: 5 of the 10.** What the first answer was refused for (the journal's `refused`):

```
arxiv:2305.11738   the sections are 5619 characters together and the limit is 5000
arxiv:2510.23601   these numbers are not in the text as you wrote them: 87.27%
arxiv:2603.06333   the sections are 6036 characters together and the limit is 5000
arxiv:2607.14159   the sections are 5232 characters together and the limit is 5000
arxiv:2609.14857   the sections are 5195 characters together and the limit is 5000
```

**Refused twice: none**, so `--again` and the `feedback` issue of the plan were not met. No first paragraph was over
its limit; the longest is 1263 of 1428.

**The one number refused was refused rightly.** The text has `87.27` once, in a table whose row is
`Original (pass@3) Accuracy (%) 88.68 89.53 76.92 87.27 63 39`. The agent wrote `87.27%`; the percent sign is the row's
label and not the cell's. The summary as put has `87.27 pass@3`. This is the first refusal by the number rule on a
real answer: task 2's nine answers had none.

Against task 2's dry runs under the same brief (its record, "brief 3"): `arxiv:2607.14159` was refused for length
in both; `arxiv:2603.06333` was accepted at once there (4256 characters of sections) and refused here (6036);
`arxiv:2310.01798` was accepted at once there, here, and again after the restore. So one paper is not always
refused or always accepted.

## The cost

```
the ten                          $7.775879     the sum of `usd` of the ten lines; the run's own last line says the same
  accepted at once, 5 papers     $0.36 to $0.58     33 s to 43 s of the agent
  refused once, 5 papers         $0.81 to $2.08     52 s to 82 s
all of this task, 14 lines       $8.14              the ten, the one summarized again ($0.358), three canaries
the agent's time, the ten        493,850 ms in all; median 47.7 s a paper, longest 81.6 s
the wall clock, the ten          22:11:50 to 22:21:09, 9 min 19 s, with 3 s between two fetches from arXiv
```

**What 53 more would cost.** Two figures, and they fall on either side of the plan's $50.

- At the pilot's rate a paper, as the plan words it: $7.775879 / 10 × 53 = **$41.21**.
- By the length of the text: the ten are 852,927 characters and the other 53 are 5,649,271 (the `chars` of
  `P/*.text.json`, task 1's), 6.62 times as much. $7.775879 × 6.62 = **$51.50**.

The other 53 are longer on average (106,590 characters against 85,293) and six of them are over 200,000:
`arxiv:2505.22954`, `arxiv:2507.21046`, `arxiv:2508.07407`, `arxiv:2601.10657`, `arxiv:2603.19461`,
`arxiv:2607.13104`. The one paper of that length in the pilot, `arxiv:2305.11738`, cost $2.08, refused once; its
last request was 114,361 tokens. Neither figure is a forecast. Cost here did not follow length alone: among the nine
papers under 120,000 characters the dearest four are the four refused once, and the cheapest of those (53,133
characters, $0.81) cost more than the longest accepted at once (118,263 characters, $0.58). With ten papers, how
often a paper is refused (5 of 10 here, 1 of 3 under the same brief in task 2) moves the sum as much as length does.

The plan's stop is on the first figure, so the task does not stop. The second is on the issue for the owner, who
approves this task before it is done.

**Under 3 minutes a paper**, so by the plan task 4 is one task and not tasks of 15. At 56 s of wall clock a paper,
53 are about 49 minutes, which is longer than a writer's turn: the same background run, read when it has ended.

## `check`, and what was seen on cb4 for the first time

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi --ids TEN     22:21:23, and again 22:23
{"entries":10,"summarized":10,"excepted":[],"failing":[]}                                       exit 0
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi               22:23
{"entries":63,"summarized":10,"excepted":[],"failing":[ …53 ids… ]}                             exit 1: the 53 are "not summarized"
```

Task 2 listed these as read from the seed and not seen. Seen now, for the ten:

- the put answers `vectors: 1`;
- `changed.method` is `paper-summarizer`, and `method` stays `research:awesome-rsi`;
- the tag `paper-summary` is joined to the three the entry had: each of the ten has 4 tags on cb4 and 3 in its
  `.entry.json`;
- the semantic search of the first 300 characters of each first paragraph answers that entry first (part of `check`).

`changed.by` reads `owner` for these puts, which a token made them. That is the subject of
`records/knowledge-by-says-owner-for-a-token.md` and was not looked at here.

The plan left open whether the tag and a word find exactly the summarized entries. On the ten they do. Each of these
answered 10 entries, all 10 with the tag, the line and `changed.method` `paper-summarizer` (22:23 CEST, `kind=paper&limit=100`):
`tag=paper-summary&q=summary`, `q=paper-summarizer`, `tag=paper-summary&q=the+a+of+and+we+in`.

**A second run starts no agent but the canary's** (R6, on the ten):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi --ids TEN       22:22:58
{…"entries":10,"put":0,…"summarizedBefore":10,"refusedBefore":0,"skipped":[],"usd":0}           exit 0
```

**R1's "no `session` twice" holds; "one `session` for each id" does not, and is not meant to after a restore.** The
11 lines of a paper have 11 sessions and 10 ids: `arxiv:2310.01798` has two lines, one for each summary of it.

## One entry restored and summarized again (R8)

`arxiv:2310.01798`, chosen because it was the cheapest of the ten. Each "cb4 answers" line is the entry read back
with `knowledge.search?kind=paper&q=arxiv%3A2310.01798` and `loop-knowledge`, and the SHA-256 worked out here from
the `text` of the answer, not the number the tool prints from its file.

```
22:21:59  cb4 answers   sha256 2014a316…   the line is there   changed.method paper-summarizer
          restore --ids arxiv:2310.01798
          {"id":"arxiv:2310.01798","length":16000,"sha256":"dd1794a8…","put":{"entered":0,"changed":1,"ids":[…],"vectors":1}}
          {"restore":1,"put":1,"same":0,"refused":[]}        exit 0
          cb4 answers   sha256 dd1794a8c5084f27b9947607ebfe6c72ad10d805f44464a49e09eb91a2a17c9c   16000 characters
                        the line is not there   changed.method paper-summarizer:restore   the tag paper-summary still there
          records/ps-1-paper-text.md, line 212:  dd1794a8c5084f27b9947607ebfe6c72ad10d805f44464a49e09eb91a2a17c9c
          check --ids arxiv:2310.01798
          {"id":"arxiv:2310.01798","state":"restored","fails":["restored: the tag is there and the line is not (changed.method paper-summarizer:restore)"]}   exit 1
22:22:02  run --tag awesome-rsi --ids arxiv:2310.01798
          {…"outcome":"put","lead":1076,"leadMax":1443,"sections":4919,"length":16000,"refused":[[]],"usd":0.357979,"put":{…"vectors":1}}   exit 0
22:22:45  cb4 answers   sha256 74ccd465…   the line is there   changed.method paper-summarizer
          check --ids arxiv:2310.01798   {"entries":1,"summarized":1,"excepted":[],"failing":[]}   exit 0
```

So the text as entered came back to the byte, the vector was made again by the restore's put, `check` names a
restored entry and fails on it, and a restored entry is summarized by a plain `run` with no flag. The second summary
is another text than the first (1076 and 4919 characters against 1160 and 4648). It was assembled from
`P/arxiv:2310.01798.entry.json`, as task 2 built it.

`ls P/*.entry.json | wc -l` answered 63 at 22:24. The hashes of the other 62 files were not compared with task 1's
record in this task; `restore --dry` of task 2 compared each file with its own hash and the entry at 21:20.

## The question sets after the puts

```
                         before 22:11:05      22:21:31             22:23:48, 22:24:20, 22:24:36 (three readings, the same)
A by meaning   MRR       0.950                0.950                1.000
               ranks     1 1 1 1 1 1 1 1 2 1  1 1 1 1 1 1 1 1 2 1  1 1 1 1 1 1 1 1 1 1
A by words     MRR       1.000                1.000                1.000
B by meaning   MRR       0.737                0.933                0.883
               ranks     1 1 2 1 3 1 3 5 1 1  1 1 1 1 3 1 1 1 1 1  1 1 1 1 3 1 1 2 1 1
```

**R5 holds**: after the puts no wanted entry of set A is lower than first, by meaning or by words. The five
questions of set A from character 13,600 of the kept text, which the cut took out of each entry, are still answered
first by words.

**The reading 23 s after the last put is not the one that lasted.** Between 22:21:31 and 22:23:48 the only put was
the restore and second summary of `arxiv:2310.01798`, and the two ranks that moved are of other papers
(`arxiv:2609.14857` in A, `arxiv:2607.14159` in B). Why was not found. A guess, not checked: the vector index takes
a put some time after the service has answered it, so the first reading was of an index with some of the ten vectors
still the old ones. What it means for a later task: read the sets a minute or more after the last put, and twice.

**Set B rose from 0.737 to 0.883**: first for 8 of 10 (6 before), none lower than third (fifth before).
`arxiv:2607.14159`, the plan's worst at fifth, is second. `arxiv:2510.23601` stayed third. Ten questions by the
plan's writer: one rank is up to 0.05 of an MRR.

**How many of set B's questions have their numbers in the summary** (the plan asks for it, since a summary that
holds a question's figures is found by them):

```
bun tools/cloud-brain/knowledge-eval/paper-sets.ts --held
{"questions":10,"withNumbers":4,"allHeld":4,"someHeld":4,"noFile":0}
```

Four of the ten questions have a number, and each of those four summaries holds every one of them
(`arxiv:2603.06333`: 91, 28.2%, 48; `arxiv:2604.25850`: 77.0%, 2, 32, 71.9%, 62.9%; `arxiv:2410.04444`: 11%;
`arxiv:2310.01798`: the 8 of `GSM8K`, which is no figure). Of the three ranks of set B that rose,
one is of those four (`arxiv:2604.25850`, 3 to 1) and two are of questions with no number (`arxiv:2410.04444`,
`arxiv:2607.14159`).

## What was built

`tools/cloud-brain/knowledge-eval/paper-sets.ts`: reads the two sets from the plan, asks each question with
`loop-knowledge` (`semantic=true&limit=20`, all kinds; and `kind=paper&limit=20` for set A by words), prints each arm's
ranks and MRR, and with `--out` writes them. `--held` asks nothing and reads `P/<id>.summary.txt`. Not
`knowledge-eval.ts`: that tool's `dump` needs `knowledge.list`, which `loop-knowledge` does not name.

```
cd <worktree> && bun test ./tests/tools/paper-sets.test.ts
 5 pass  0 fail  23 expect() calls                                   2026-10-11 22:11 CEST
cd <worktree> && bun test ./tests/tools/summarize-papers.test.ts ./tests/tools/light-agent.test.ts ./tests/tools/paper-sets.test.ts
 47 pass  1 skip  0 fail  343 expect() calls                         2026-10-11 22:12 CEST
```

The 5 are new. One of them scores the ranks the plan wrote down and gets the plan's table (0.950 and 0.753), so the
tool's MRR is the plan's. The skip is `light-agent.test.ts` line 226, another issue's test, which runs only on an
`agent.sh` later than the worktree's `3801492`. No case of the 5 calls a Brain. `summarize-papers.ts` was not changed.

## The observations of review 1868

Three were taken by task 2 and were seen to hold here: the second summary is assembled from `<id>.entry.json` (the
restore above); `--permission-mode default` is given and each agent's `mode` is `default` (three canaries, each
`refused`, `toolset` `["Read"]`); a resumed agent keeps its session, so a paper refused once has one line. Two are
as they were: `pdftotext` was not run in this task (every text was HTML), and what `claude` loads into an agent's
context without a Read was not looked at.

## Not tried

- A paper refused twice, `--again`, and `check --except`.
- The kept PDF as the text of a `run`. Four of the other 53 are read that way.
- Whether a summary says what the paper says, beyond its numbers. Nobody read the eleven against the papers; that is
  R3's reviewer, on five entries. One number was looked at, the refused `87.27`.
- A paper whose text addresses its reader.
- Why two ranks differ between the reading at 22:21:31 and the three after.
- The transcripts of the agents: whether each read its brief and its one file, as task 2 saw of three.
- `restore` on more than one entry, and a restore of an entry that was summarized twice.
- A summary of a text over 210,535 characters. Six of the other 53 are longer than 200,000, the longest 333,339.

## Prior art

Searched in the Brain with `loop-knowledge` (`semantic=true`) before the run: "pilot run of paper summaries measured
cost per paper", "question set MRR asked again after changing entry text", "restore entry text as entered sha256
knowledge.put". Found the plan itself, `doc:knowledge-reranking` and
`doc:cloud-brain-run-cost-is-part-of-the-issue-model`. Used: `knowledge-reranking.md`'s way of scoring (a wanted
entry not answered counts 0), read in `knowledge-eval.ts`. Nothing else bore on it.
