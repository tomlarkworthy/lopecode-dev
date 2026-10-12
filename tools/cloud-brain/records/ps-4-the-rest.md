# ps-4-the-rest: the other 53 summaries put, the doc line of R6, and the role of a cost event

Task 4 of `plan/cloud-brain-paper-summarizer-persona.md`. Written 2026-10-12, 04:45 CEST (`date`), by the task's
writer. The task is an act, 53 puts of a summary to the knowledge base of cb4 with the token `loop-papers`, and three
changes to files: two stops in `summarize-papers.ts run`, a section of
`knowledge/calling-a-cloud-brain-from-this-checkout.md`, and a paragraph of step 5 of the loop's `SKILL.md`. No seed, no deploy.

`P` is `<main checkout>/tools/cloud-brain/.emitted/papers`. Every command but the last two (below, "After the landing") was run from the task's worktree
(`lopecode-dev` at the first commit of this task, then on `64502c5d`; it landed as `724f13ab` after two rebases), with `claude` under `~/.claude-personal`.
Times are `date` on this machine, or a journal line's `at`.

## What the task asked, and the answer to each

| Asked | Answer |
|---|---|
| `run` on the other 53 | 53 put, 0 refused twice, 0 failed, exit 0. 03:52:25 to 04:38:42 CEST. $40.25 |
| stopped if the cost passes $50 (the owner's choice A, comment 2668; the ready move, event 3532) | The tool had no such stop. `--usd-max N` was added first, and the run was started with `--usd-max 50`. It did not fire |
| `check` | `{"entries":63,"summarized":63,"excepted":[],"failing":[]}`, exit 0, at 04:38:51 |
| the doc line of R6 | a section of `knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The summaries of the kept papers" |
| `paper-summarizer` among the roles of a cost comment | since `cm-5-the-loop-writes-the-event` a cost is an event: a paragraph of `SKILL.md` step 5 says what the one event of a task holds |
| a paper refused twice is the writer's to read | there was none |

## Two stops added to `run` before it was started

The approval of the pilot was taken as "the 53 are run as task 4 …, stopped if the running cost passes $50", and
`run` went through its papers with no count of what it had spent. Two changes, in `summarize-papers.ts`:

- `--usd-max N`: before each paper, when the agents of this run have cost N or more, no agent is started for it or
  for a paper after it. The last line has `stopped`, exit 1. The count is of the run, from 0: a second run after a
  stop has to be given what is left. Not a number, or under 0, is exit 2 before any agent.
- A put that is refused ends the run, exit 1 with `stopped`. Until this change the paper was written `failed` and the
  loop went on, so with cb4 refusing puts (the day's priced calls were used up during the pilot's review, 402) each
  paper after it would have been an agent paid for and a summary kept nowhere.

Chosen over batches of `--ids` with the journal summed between them: the flag is exact to one paper and is there for a
later run of R6. Neither stop was met in the real run. Both are held by two tests with the stand-in agent and the
fake Brain of the tool's test file:

```
cd <worktree> && bun test ./tests/tools/summarize-papers.test.ts          2026-10-12 03:51 CEST
 26 pass  0 fail  269 expect() calls
the same file against the tool as it was at 64502c5d (git checkout -- of the tool alone)
 24 pass  2 fail      the two new tests: "--usd-max: …", "a put that is refused stops the run: …"
```

## The run

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi --usd-max 50
{"papers":"…/.emitted/papers","entries":63,"put":53,"dry_written":0,"refused":0,"failed":0,"summarizedBefore":10,"refusedBefore":0,"skipped":[],"usd":40.245589}
```

Started as a background command; model opus, the tool's default. Given the tag and not 53 ids: the ten of the pilot
were skipped as `summarized`, each after its text was fetched and its hash found in the entry's line. The journal's
lines of this task are those with `at >= 1791769945091`, the canary of this run: 54 lines when the run ended and 55 after the second run (below): 53 of a
paper and 2 canaries. Summed with:

```
python3 -c "
import json,statistics as st
L=[l for l in map(json.loads,open('P/journal.jsonl')) if l.get('at',0)>=1791769945091]
p=[l for l in L if l.get('id')]
print(len(L),len(p),round(sum(l['usd'] for l in p),6),round(sum(l['usd'] for l in L),6),round(sum(l['ms'] for l in p)/1000),st.median(l['ms'] for l in p),max(l['ms'] for l in p),max(l['context'] for l in p))"
55 53 40.245589 40.251179 2434 42950 73339 155163                         04:43 CEST
```

```
53 papers                        $40.245589    outcome put 53; each put answered vectors: 1; 53 sessions, none twice
  accepted at once, 37           $19.79        $0.31 to $1.32
  refused once, 16               $20.46        $0.62 to $2.31
  refused twice                  0
with the two canaries            $40.251179    both `refused`, toolset ["Read"]
the agents' time                 2,434 s in all; median 43.0 s a paper, longest 73.3 s
the wall clock                   46 min 17 s, with 3 s between two fetches from arXiv
the fullest agent                155,163 tokens at its last request (arxiv:2607.13104, a text of 333,339 characters)
text read                        5,649,271 characters; 49 from arXiv's HTML, 4 from the kept PDF
```

**The cost was $0.759 a paper, against the pilot's $0.778.** The pilot's record gave two figures for the 53, $41.21
by paper and $51.50 by length of text. The sum was $40.25: the first was near and the second was not.

**Refused once: 16 of 53** (the pilot: 5 of 10). 15 for the sections' length, 5,032 to 5,660 characters against 5,000;
2 for numbers (`arxiv:2601.21557`, also over length: `61.5% 48.6% 32.1% 71.3% 35.8%`; `arxiv:2608.11350`:
`23.25% 24.00%`). Those 16 cost more than the other 37 together. The seven numbers were not looked for in the texts
by this writer: each second answer passed the same rule, so no summary as put has a number its text lacks.

**The six texts over 200,000 characters**, which the pilot's record named as not tried: all put, three at once.

```
arxiv:2505.22954   220,806 characters   $1.03   at once        115,940 tokens
arxiv:2507.21046   311,828              $1.23   at once        142,186
arxiv:2508.07407   247,482              $2.14   refused once   122,653     from the kept PDF
arxiv:2601.10657   201,845              $2.31   refused once   131,900
arxiv:2603.19461   209,339              $1.87   refused once   106,335
arxiv:2607.13104   333,339              $1.32   at once        155,163
```

**The kept PDF as the text of a `run`, for the first time**: four papers, `arxiv:2310.02304`, `arxiv:2508.07407` and
the two of Nature. Each was put, and the line of each entry names the file, as in
`Summary by paper-summarizer (opus), 2026-10-12, of static:corpus/research-awesome-rsi/nature/s41586-023-06924-6.pdf, sha256 of the text read bc1f3861….`
`check` takes that address. Three of the four were refused once for length.

## `check`, the counts on cb4, and a second run

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi        04:38:51 to 04:39:29 CEST
{"entries":63,"summarized":63,"excepted":[],"failing":[]}                                exit 0
```

Started 9 s after the last put, and no entry failed on the semantic search of its first paragraph. The pilot saw two
ranks differ between a reading 23 s after a put and later ones; that was not met here, in one reading.

Each of three searches (`kind=paper&limit=100`, `loop-knowledge`, 04:43 CEST) answered 63 entries, all 63 with the tag
`paper-summary`, the line and `changed.method` `paper-summarizer`: `tag=paper-summary&q=summary`,
`q=paper-summarizer`, `tag=awesome-rsi&q=the+a+of+and+we+in`. 55 of the 63 texts are 16,000 characters.
`curl -s -o /dev/null -w '%{http_code}' https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/paper-summarizer.md` answered 200.

**A second run starts no agent but the canary's** (R6, on the 63):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi --usd-max 50     04:39:52 to 04:43:09 CEST
{…"entries":63,"put":0,…"summarizedBefore":63,"refusedBefore":0,"skipped":[],"usd":0}            exit 0
```

It added one line to the journal, the canary's (`refused`, $0.0026). Its 3 min 17 s are the 63 fetches from arXiv
and the kept PDFs, 3 s apart.

## The question sets after the 63

Not asked of this task; the pilot's sets were asked again since 53 more vectors were made from summaries.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/paper-sets.ts --out P/sets-ps4-1.json      04:39:36, and again 04:43:09: the same ranks
                 the pilot, before   the pilot, after   now
A by meaning     0.950               1.000              0.950    1 1 1 1 1 2 1 1 1 1
A by words       1.000               1.000              1.000
B by meaning     0.737               0.883              0.817    1 1 1 1 6 1 2 2 1 1
```

R5's bound holds (no wanted entry of set A lower than third, either way). Set B is lower than after the pilot:
`arxiv:2510.23601` went from third to sixth and `arxiv:2604.25850` from first to second, with 53 other papers'
summaries now in the vectors. Which entries came above them was not looked at. Ten questions: one rank is up to
0.05 of an MRR.

## The docs

- `knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The summaries of the kept papers": `text`, `run`, `check`
  for papers entered later, after the section on `knowledge-docs.ts` (the plan's R6). Of its sentences, seen in this
  task: the second run at no cost, and `--usd-max` and the refused put in the tests above. Taken from the tool's
  header and its tests of task 2 and not run here: that `run` skips an entry with no `.entry.json`, `--again`, and
  `restore`. No paper entered after 2026-10-11 was summarized: the 63 are the whole tag.
- `.claude/skills/brain-maintenance/SKILL.md`, step 5: `paper-summarizer` in the list of roles, and a paragraph for
  the one `cost` event of a task that ran the tool. The task says "cost comment" and `"light":true`; since
  `cm-5-the-loop-writes-the-event` it is an event with `"how":"light"` (the ready move of this issue, event 3532).
  `issue.cost` requires `seconds` and `context`, and a task is 53 agents: `seconds` is the sum of the lines' `ms`,
  and `context` the largest of them, since the field is one request's size. That choice is this writer's.
  For this task the event's numbers are `usd` 40.251179, `seconds` 2434, `context` 155163, from the command above;
  `seconds` is of the 53 papers, since a canary's line has no `ms`.
  The event is written by the orchestrator, not by this writer; no such call was made in this task, so that the
  service takes the role and these fields together was not seen.

```
cd <worktree> && bun test ./tests/tools/ps-4-docs.test.ts
 2 pass  0 fail  22 expect() calls
```

The two read the doc's command lines against the commands and flags the tool reads, and the paragraph of step 5 for
the key and each required field. On the files as they were (a detached worktree at `b794683d`, the commit before this task's, with the test file
copied in; 04:50 CEST): `0 pass  2 fail`.

## After the landing

From the main checkout at `f16f479c`, 04:47:35 CEST: `summarize-papers.ts check --tag awesome-rsi` answered
`{"entries":63,"summarized":63,"excepted":[],"failing":[]}`, exit 0, and
`bun test ./tests/tools/summarize-papers.test.ts ./tests/tools/ps-4-docs.test.ts` gave `28 pass  0 fail  291 expect() calls`.
The whole directory, in the worktree after its rebase on `b794683d` (04:46 CEST): `bun test ./tests/tools`,
`492 pass  1 skip  0 fail`, with the line `skipped: rework-resumes-the-implementer.test.ts: no …/cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js`
(the rebase's read of cb4 left that module out: `left out: brain-x-issues …, a deploy under way?`).
The release of the lock printed `docs (cb4): {"put":2,…,"changed":2,…,"source":"origin/main@f16f479c"}`.
The title of commit `f0cabeb2` reads `(.25, check 63 of 63)`: the shell took `$40` out of a message in double quotes.

## Not tried

- `--usd-max` and the stop on a refused put on cb4. Both in the tests only.
- A paper refused twice, `--again`, `check --except`. None was refused twice in 63.
- Whether a summary says what its paper says, beyond its numbers. Nobody read the 53 against the papers. That is
  R3's reviewer, on five entries (the plan: the first five by SHA-256 of the id).
- The seven numbers refused of two first answers, against the texts.
- `restore` in this task. The 63 `.entry.json` are in `P` (`ls P/*.entry.json | wc -l`: 63); none was compared with
  task 1's record here.
- The call of `issue.cost` with the role `paper-summarizer`.
- The transcripts of the 53 agents.
- Why set B's two ranks fell.

## Prior art

Searched in the Brain with `loop-knowledge` (`semantic=true`) before the run: "paper summaries run over the rest of
the corpus refused twice", "cost event role paper-summarizer light", "run again on papers entered later
summarize-papers". Found the plan itself and `doc:cloud-brain-run-cost-is-part-of-the-issue-model`; the second is where
`issue.cost` and its required fields are from, read in `SKILL.md` step 5. Nothing else bore on it.
