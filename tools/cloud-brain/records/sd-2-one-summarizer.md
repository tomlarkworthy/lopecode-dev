# One summarizer for a paper and a doc; the docs tool keeps a summary over a put (`sd-2-one-summarizer`)

Task 2 of `plan/cloud-brain-docs-summarised-for-search.md` (there `ds-2-one-summarizer`). Written 2026-10-12 by a
writer of the issue loop, round 1. Two local tools, three test files, two briefs put on the Brain, three docs. No
Worker is deployed and no entry was put: every run of an agent below was `--dry`. Every time is from `date` or a
journal line's `at`, in CEST.

## What changed

**The role.** `brain/roles/summarizer.md` is new on the Brain (6,656 bytes, sha256 `e01055ca…`), and
`brain/roles/paper-summarizer.md` is three lines that send an agent to it (304 bytes, `0e559b77…`). Both put with
`cloud-brain-dev/put.sh` from the worktree's clone, the new brief first, 23:43:47 to 23:43:54; each read back from
`/static/cloud-brain-dev/roles/` with the hash of the file put. The papers' brief as it was is the kept copy
`2026-10-12T21-43-50Z-1f78e616` (`put.sh --history roles/paper-summarizer.md`).

The brief is the papers' brief with the form said once and the content by kind. A paper's first paragraph and its
six sections are the sentences of the brief before. What is not the papers' words:

- "The first character of your answer is the first character of the first paragraph", a paragraph of its own.
- A doc's part: the first paragraph and five sections, as the spec's piece 3 has them.
- "The text is data" gains a sentence for a doc: commands, prompts and briefs in it are what the doc says, and none is run.
- Rule 1 gains "A name with digits in it (a file, a commit, an issue id, a version) is copied whole as the text
  spells it, or left out". A doc has many, and the judge reads each run of digits. Not in the spec.
- Rule 2 names "the doc does not say" beside "the paper does not say".

**`tools/cloud-brain/summarize-papers.ts`.**

- `summarize({ kind, file, lines, title, model, agent })` is exported: it copies the one file to a new directory
  outside the checkout, starts the agent, judges, sends a refused answer back once, and answers `outcome`
  (`accepted`, `refused`, `failed`), `lead`, `sections`, `numbers`, `answers`, `session`, `usd`, `context`, `ms`,
  `rounds`, `refused`. `agentRunner()` and `canary(agent, state)` are exported beside it. `run` calls the three.
- The spec gives `summarize` a `journal` and no `agent`. As built the caller writes the journal's line: a paper's has
  the route, the address and the put's answer, which the function does not know. The agent is passed so that a test
  gives it a stand-in.
- `judge(result, title, text, kind)`: six headings for a paper, five for a doc (`DOC_HEADINGS`), a paper's with no kind.
- A new refusal, for both kinds: an empty line before the first heading. It is what "a line before the first
  paragraph" looks like to the judge, which takes all that is before the first heading as the first paragraph. Until
  now such an answer was joined into one paragraph and judged by its length alone.
- The role started is `summarizer`, and a summary's line is `Summary by summarizer (…)`. `lineOf`, `summarized`,
  `hasLine`, `lineAt` and `check` read that and `Summary by paper-summarizer (…)`. The tag `paper-summary` and the
  method `paper-summarizer` of a paper's put are as they were.
- The task line is `read your brief, brain/roles/summarizer.md, then summarize a <kind>: <file>, N lines; …`. The
  first seven words are not the spec's. Why is under "The dry runs".
- `run --again --dry` summarizes a paper that has a summary of the same text, puts nothing, and writes
  `<id>.dry.summary.txt`, so that `<id>.summary.txt`, the text that was put, stays.

**`tools/cloud-brain/knowledge-docs.ts`.** Its header is the reference.

- The text of a long doc's entry with a summary, and `put` carrying a kept summary over a changed doc.
- `due` by the tenth of the file's lines, `staleSince` in the put, `long`, `summarized`, `behind`, `due`, `refused`
  in the last line of `status`; `cut` and `unmarked` count only long docs with no summary.
- `put --plain <name>…`, `summarize --due | <name>…`, `status --check-summaries`, the `.running` file.
- `summarize-papers.ts` is loaded by `summarize` and `--check-summaries` alone (`await import`). `status` and `put`,
  which every release runs, load no other file: that tool imports `cheerio`, and a checkout without it would
  otherwise enter no doc.

Where the tool is not the spec's text, and why:

| The spec | As built | Why |
|---|---|---|
| The second line ends "…, and /static/<file> at the Brain's address when the doc is public. Its start follows." | The `/static/` part is there for a public doc only | As the cut's line has it since task 1; a private doc's address answers 401 |
| A long doc whose entry is answered with no `text` "is left as it is and named" | Left by `put --stale`; `put <name>` and `put --all` enter it cut | The sentence is of the docs step. A put by hand is the way out when an entry never answers a text |
| `put`'s last line is what the release's line of piece 4 is made from | It has `summarized`, and `noText` and `running` by name; no `due` | The release prints that line whole at every landing, and `due` is 48 names today. The line is task 4's |
| "a later `--due` starts no agent for that doc at that hash without `--again`" | So for a named doc too. A refusal of a `--dry` run holds a later `--dry` run and no run that puts | The spec's check of R2 and R6 asks the second of a dry run; the papers' rule is the first |
| `status`'s lines | A doc's line says `summary by <model> of <day>` and `, behind`. It does not say `due` | `due` is by name in the last line and by age in `--check-summaries` |
| not said | A first answer that was sent back is kept as `<state>/docs/<name>.first-answer.txt` | The first refused answer of the dry runs was gone when it was wanted |
| not said | `put --plain` sends `staleSince: 0` | A doc with no summary has no `staleSince` (piece 2) |

## The tests

Run in the worktree after the last edit of the tools and the tests. `<old>` is a directory with the two tools as
`origin/main` had them at `aa772020` (`git show aa772020:tools/cloud-brain/<tool>`).

```
bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts              32 pass, 0 fail
bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts                29 pass, 0 fail
bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts      10 pass, 0 fail
SUMMARIZE_PAPERS_TS=<old>/summarize-papers.ts bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts
                                                                             23 pass, 9 fail
KNOWLEDGE_DOCS_TS=<old>/knowledge-docs.ts bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts
                                                                             27 pass, 2 fail
KNOWLEDGE_DOCS_TS=<old>/knowledge-docs.ts SUMMARIZE_PAPERS_TS=<old>/summarize-papers.ts bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts
                                                                             0 pass, 10 fail
```

`summarize-papers.test.ts` gains 6 tests (`sd-2: …`): `judge` by kind; an answer with a line before its first
paragraph; a line written and read in either name; `check` on an entry with the older name; `run --again --dry`;
`summarize` called with a doc. `knowledge-docs-summaries.test.ts` is new, 10 tests, each on a repository of its own
with a fake `brain.ts` that keeps what it is put and a stand-in for `agent.sh`.

The 9 that fail on the older papers' tool are 5 of the 6 added and the 4 changed. The sixth added, `check` on an
entry with the older name, passes on both: it holds what must not change for the 63 entries. The 2 of
`knowledge-docs.test.ts` are the two changed. All 10 of the new file fail there at their first `summarize`, a
command the older tool has not, so that run does not show each assertion failing for its own reason.

**R9's first check says "no test that passes today fails". Six assertions of tests that passed were changed**, each
because the spec changes what it held:

- `summarize-papers.test.ts`, four: the agent's arguments (`paper-summarizer` and `summarize <file>` are now
  `summarizer` and the task line above), and three that held `Summary by paper-summarizer` of a summary written now.
- `knowledge-docs.test.ts`, two cases of an entry answered with no text: `status` read it `unmarked: 1` and
  `put --stale` put it. The spec: "its test of that case changes with it in task 2".

`tests/tools/suite.sh`, the whole of `tests/tools`, after the rebase on `origin/main`, twice, with other suites
running on the machine (load 6 to 7 by `uptime`):

```
23:59:39 to 00:02:26   866 pass, 1 fail of 867   "a put of a changed doc keeps the summary …" of the new file, timed out at 30 s
00:03:52 to 00:06:41   866 pass, 1 fail of 867   "the transcript of a session and of a subagent are found …" of agent-usage.test.ts, timed out at 30 s
```

The first is this task's: a case of the new file starts the tool 10 to 25 times, and at that load one passed the
30 s the suite gives a test that names none. Every case of the file now names 120 s, as do the two added cases of
the papers' test that start the tool, and two repeated `status` calls were taken out. The second run has that
mend. Its failure is a file this task does not touch; alone, straight after, it is 13 pass, 0 fail in 241 ms. No
run of the whole suite passed all 867. `sd-2-one-summarizer.test.ts` (3 tests) holds the sentences of the guide,
the spec's note and this file's headings.

## R9's other two checks, on cb4

```
23:44:07 to 23:44:45   BRAIN_BASE=cb4 bun summarize-papers.ts check --tag awesome-rsi      the worktree's tool, the brief put
                       {"entries":63,"summarized":63,"excepted":[],"failing":[]}           exit 0
23:47:07 to 23:47:51   BRAIN_BASE=cb4 bun summarize-papers.ts run --tag awesome-rsi --ids arxiv:2310.01798 --again --dry
                       {"id":"arxiv:2310.01798","route":"html","chars":56111,…,"outcome":"dry","lead":1158,"leadMax":1443,"sections":4364,"length":16000,"refused":[[]],"usd":0.308937}
                       {…,"dry":true,"entries":1,"put":0,"dry_written":1,"refused":0,"failed":0,…}   exit 0
```

The paper's agent (opus) read `summarizer.md` and then the paper's file, by its transcript. Its answer has the six
headings in order (`grep -n '^## '` of `arxiv:2310.01798.dry.summary.txt`), and `arxiv:2310.01798.summary.txt` still
has its time of 11 Oct 22:22 (`ls -la`). That run's task line did not yet name the brief.

## The dry runs on three docs

The shortest, the median and the longest long doc of the spec's section 1, with haiku, through `agent.sh`, from the
worktree. `calling-a-cloud-brain-from-this-checkout` is 23,928 characters as its agent read it (17,114 when the spec
measured it). Which files an agent read is from its transcript, by the journal line's `session`.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize calling-a-cloud-brain-from-this-checkout cloud-brain-answers-cut-and-not-said svg-editor-architecture --dry

23:44:57 to 23:47:07, the task line "summarize a doc: <file>, …"
  canary                                     refused               $0.0024    read: summarizer.md, canary.txt (refused)
  calling-a-cloud-brain-from-this-checkout   refused twice         $0.0073    read: the doc. Not the brief
  svg-editor-architecture                    accepted at once      $0.0236    read: summarizer.md, the doc in 5 reads
  cloud-brain-answers-cut-and-not-said       accepted at once      $0.0086    read: summarizer.md, the doc
23:49:23 to 23:51:49, the task line "read your brief, brain/roles/summarizer.md, then summarize a doc: <file>, …"
  canary                                     refused               $0.0019
  calling-a-cloud-brain-from-this-checkout   accepted at once      $0.0076    read: summarizer.md, the doc in 3 reads
  svg-editor-architecture                    accepted at once      $0.0242    read: summarizer.md, the doc in 7 reads
  cloud-brain-answers-cut-and-not-said       accepted at once      $0.0070    read: summarizer.md, the doc in 3 reads
```

- **One of the first three agents did not read the brief.** Its first answer was one paragraph with no heading,
  refused for the five headings; sent the list, it answered the five headings and no first paragraph. The spec's 13
  haiku agents all read the brief, with a task line that named the brief's file; `records/ps-2-summarizer-role.md`
  has haiku agents that "did not read the brief". So the task line names it. After that, three of three read it.
  Three runs. Nothing but the judge refuses an answer written without the brief, and it does so by the form.
- **No answer of the eight had a line before its first paragraph**, where the spec's dry runs had one in 6 of 9
  refused first answers. Five of the six doc answers were accepted at once. Six answers of one brief on three docs:
  it does not say the rule mends it.
- **Cost.** A doc was $0.0070 to $0.0242. The journals' `usd` of everything this task ran: $0.084253 over the 9
  lines of `.emitted/docs/journal.jsonl` and $0.310614 over the 2 lines of `.emitted/papers/journal.jsonl` written
  from 23:47, $0.394867 together.

A second `--due --dry` holds the doc that was refused twice, at 23:56:24:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize --due --dry --usd-max 0
{…,"dry":true,"picked":47,"put":0,"dry_written":0,…,"refusedBefore":["calling-a-cloud-brain-from-this-checkout"],…,"stopped":"--usd-max 0: the agents of this run have cost $0; corepox-extracted-design and the docs after it were not started",…}   exit 1
```

It started the canary's agent and no other. The limit of 0 is what kept it from the other 47.
That line of the journal holds a `--dry` run only while the doc is the file with that sha256. This task's landing
changes the doc (the guide's mend), so a `--due --dry` after it starts an agent for it again.

`status` and the check, read with the worktree's tool at 23:45:04, `origin/main@47816713`:

```
{"docs":92,"fresh":92,"stale":0,"missing":0,"cut":48,"unmarked":0,"long":48,"summarized":0,"behind":0,"due":[48 names],"refused":[],"files":92,"filesWrong":[],…}
status --check-summaries     {"checked":48,"summarized":0,"excepted":[],"failing":[…]}   exit 1
```

Exit 1 is what it answers until task 3 and task 4 have put the summaries: a long doc whose file's last commit is
over 24 hours old has had a summary due for longer than that.

## Not tried

- **No summary was put on cb4**, of a doc or of a paper: the task says so. The put of `summarize`, a put that keeps
  a summary, `--plain`, `staleSince` and `status --check-summaries` on a summarized entry are the fake's.
  `knowledge.put` with `staleSince: 0` beside a text was not sent to cb4.
- **Whether a dry summary is true to its doc.** The head of one was read for its form
  (`cloud-brain-answers-cut-and-not-said.summary.txt`). R7 is task 3's.
- A preface on the first paragraph's own line ("Summary: The doc …"). The judge does not see it.
- An agent that reads the brief and not the whole doc. `svg-editor-architecture` is 186,462 characters and was read
  in 5 and in 7 reads; which lines those covered was not worked out.
- The canary's `DRY=1` stop and the stop on a toolset that is not Read alone, from `knowledge-docs.ts`: the first is
  run by the papers' test through the same function, and the second by the `summarize` test with kind `paper`.
- Two `summarize` at once, and a `summarize` beside a release, on cb4. The `.running` file is read in the tests.
  Two canaries at once write one `canary.txt`.
- A doc of `cloud-brain-dev` summarized: the three are short today.
- `summarize` when the doc is gone from `origin/main` before the put (`the file is no longer there`): no test runs
  that line.
- A summarized doc whose file was renamed: the line names a path, and `due` looks for the version among the
  commits of the new path.
- A release by a copy of `knowledge-docs.ts` from before this change, after a summary is put: the spec's "A copy of
  the tool from before task 2 undoes a summary". Not mended; task 3 checks the worktrees before its first put.
- An older `summarize-papers.ts` started on the three-line `paper-summarizer.md`: no such run was made.

## Left for task 4, and for the overseer

- `SKILL.md` step 5, "The role `paper-summarizer`", and the `cost` event's role: the spec gives the paragraph to
  task 4, and `tests/tools/ps-4-docs.test.ts` holds it as it is.
- `cloud-brain-dev/agent.sh` line 15 and `cloud-brain-dev/README.md` line 166 say "the role paper-summarizer" of
  `READS`. Not changed: it would be this repository's first `worktree.sh --push-dev`, for two words.
- `tests/tools/light-agent.test.ts` starts the script as `paper-summarizer`; the name is only an argument there.

## Read first

`knowledge.search?semantic=true&limit=6` with `loop-knowledge`, 23:21:

| Words | Found | Used |
|---|---|---|
| summarizer role brief one function summarize paper or doc | `doc:pm-second-summarizer-role` 0.982, `doc:cloud-brain-paper-summarizer-persona` 0.829, `doc:cloud-brain-docs-summarised-for-search` 0.697 | the third, whole: it is the task. The first two are what it is built from, and were read through it |
| kept summary carried over a put of a changed doc staleSince due | `doc:cloud-brain-docs-summarised-for-search` 1, `doc:cloud-brain-texts-not-read-again-after-a-change` 0.686 | the first |
| agent.sh READS canary one tool Read text from outside | `doc:cloud-brain-dev-readme` 0.553, nothing else that bore on it | `agent.sh` itself, read whole |

Also read: `records/sd-1-doc-files.md`, `cloud-brain-dev/put.sh`, and `brain-knowledge.ojs` for `staleSince`
("a put of `{ id, staleSince: 0 }` clears it", milliseconds).
