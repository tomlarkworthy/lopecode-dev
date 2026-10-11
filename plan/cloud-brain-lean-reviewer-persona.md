# Cloud Brain: the reviewer of the issue loop as a lean agent type

Spec of the feature `lean-reviewer-persona` on cb4's tracker. Written 2026-10-11 from `lopecode-dev`
`1e6aabbc`, the tracker at event 926, and the transcripts of the reviewers the loop ran between
2026-10-10 15:07 UTC and 2026-10-11 14:10 UTC. Nothing here is built. The design is a proposal: no
review has been run by a lean type, and each number under "The design" that is not under "What
exists today" is an estimate and says so.

## What was asked

Tom, 2026-10-11, quoted in the issue's body (event 905), whole:

> I think we need to move towards lighter agents, so I think reviewer becomes a persona with a smaller knowledge knowledgebase and reduced tooling. The difficulty is making sure we have a single maintanable knowledge base, not a ton of repatition, and ensuring that we are maintaining information flow. The overseer is well placed for this, and the knowledgebase has tags so we can tag "reviwer" on what it needs. Then a script sets it up properly, and the oversee debugs knowledge mistakes.

A correction, in a comment on the issue (event 913, 2026-10-11, filed for him by the session that
opened it):

> you are talking about the cloud knowledgebase, I am talking about the lopecode-dev knowledge directory.

So "the knowledgebase has tags" is `knowledge/*.md` and its frontmatter field `scope:`, not the
Brain's `knowledge.*` service. The first writing of this spec (commit `75c04663`) was made before
that comment was read: it marked a doc with a new key, `roles:`, and carried the mark to the Brain
as a tag. Both are taken out here. The mark is a value of `scope:`, and nothing in the design
touches the Brain's knowledge base.

## The reports gathered

`list?parent=lean-reviewer-persona` answers `{"issues":[]}`: the feature has no parts. It was
opened for the owner by a session outside the loop, and its body is the list. Each line of the body
is taken here as a report.

| From the body | Becomes |
|---|---|
| "A reviewer agent type: its tools named, the CLAUDE.md files left out, and in its body what a reviewer needs and no more" | R1 |
| "One source for that knowledge. A fact is written once, where it is written now, and marked for the roles that need it" | R2 |
| "A script that writes the agent type from what is marked, and with no arguments checks it and exits nonzero" | R3 |
| "The overseer keeps it right" | R4 |
| "The size of a marked thing" | settled under "The size of a marked thing": a document, and the long one is cut in two |
| "Where the mark is and what the script reads" | a value of `scope:` in the frontmatter (event 913); the script reads files |
| "What is in the body and what is searched for" | all of it in the body. A search at the time of need is taken out by the correction (event 913) |
| "The hook" | R5 |
| "How a knowledge mistake is seen" | R4: a tool that reads the transcripts, and one line of the report |
| "The proof before the switch" | R6 |
| "The restart" | once, by the owner. The issue's reading was wider than the docs: see "What exists today" |
| "Which role is next" | left out of this spec. Decided from R7's numbers after 20 lean reviews; the tool of task 2 measures any role |
| Related: `rework-resumes-the-implementer` (done, event 901) | no requirement. It says "The reviewer is never resumed", which holds here |

The requirements:

- **R1.** The loop spawns its reviewer as a custom agent type with a named tool set and no
  CLAUDE.md, whose body holds what a review needs.
- **R2.** Nothing in that body is written by hand for it. Each part is the text of a file that
  exists for its own reason, taken whole, and a file is marked for the roles that get it.
- **R3.** One script writes the type from the marks. With no arguments it checks, and exits
  nonzero when the file on disk is not what the marks give.
- **R4.** The overseer is given, at each oversight, what the lean reviewers read outside their body
  and what they said they lacked, and changes a mark or a source and runs the script.
- **R5.** A lean reviewer is not made to read the 27 KB Cloud Brain doc, by the hook or by `rules.md`.
- **R6.** Before the loop switches, the lean type reviews past submits whose defects are on the
  record, and finds them.
- **R7.** The saving is read from the transcripts, per run, before and after.

## What exists today, measured

All of this was read on 2026-10-11 between 15:40 and 16:20 CEST.

### What a reviewer run costs, and where

The issue gives the start-up of an agent told to answer "OK": 40,842 tokens for `general-purpose`
and 6,239 for a type with four tools and `omitClaudeMd: true`. That number is paid on every turn,
not once. The transcripts say how often.

The transcripts are `~/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev/<session>/subagents/agent-<id>.jsonl`.
65 of them open with "Read …/agents/reviewer.md and follow it"; 64 carry usage counts. All 65 are
`"agentType":"general-purpose"`, `"requestShape":"background"`, `"model":"opus"` in the file beside
them. For each assistant message, counted once by its id, context is `input_tokens +
cache_read_input_tokens + cache_creation_input_tokens`.

```
reviewer runs with usage                              64
context of the first turn        median   41,105      min 40,969   max 50,987
context at its largest           median  189,646      min 71,233   max 326,857
turns in a run                   median       15
context summed over the turns    median 1,315,354     all 64 runs 98,125,430
  of which first-turn context x turns   49% of the sum over all runs, median 56% of a run
tool calls in a run              median       19
```

Half of what a reviewer's model reads, by count, is the start-up read again at each turn. Most of
it is read from the cache, so this is not half the price; the price was not measured. The issue's
107,955 is another count (the one the Agent result reports) and is not comparable with these.

### What they read

Runs that read a file with `Read`, or with `cat`, `sed`, `head`, `tail` or `awk` in a Bash call, of 65:

```
agents/reviewer.md                                          65     9,765 bytes
rules.md                                                    65     9,939
knowledge/working-with-cloud-brain-remote-lopecode-cluster  45    27,101
agents/implementer.md                                       35    28,708
philosophy.md                                               31    16,051
SKILL.md                                                     8    25,376
```

`implementer.md` is the writer's brief. Reviewers open it because step 4 of `reviewer.md` says to
run the tests "with the snippet in `agents/implementer.md` step 8". Step 8 is 4,015 bytes of that
file. The commands of eight such reads were looked at: five print step 8 or the lines round it,
three read other parts.

### What they call

Tool calls by name over the 64 runs, with the runs that used each:

```
Bash                           802   64
Read                           197   64
mcp__lopecode__eval_code        91   30
mcp__lopecode__qa_open_notebook 38   30
ToolSearch                      33   32
mcp__lopecode__qa_close         32   30
mcp__lopecode__get_pairing_token 30  30
mcp__lopecode__qa_screenshot     1    1
Write                            1    1
```

No run called Grep, Glob, Edit, Agent or a web tool. `brain.ts` was run in 47 runs. Its commands,
matched in the Bash text (calls, runs): `redistil` 66, 31; `curl …getSource` 23, 17; `state` 11, 6;
`curl …browser.all` 11, 11; `saw` 11, 5; `curl …logs.deploys` 10, 4; `curl …container.all` 7, 7. The
same match found `token` 27 times; every one read was prose in a review body, not a command, so the
match overcounts where a review quotes a command.

Of the Cloud Brain doc's nine sections, those commands are in one, "Access from this checkout"
(lines 74 to 149, 6,850 bytes), with the deploy lock in one paragraph of "Changing it". Nothing a
reviewer ran is in "Pairing with the Brain's page", "Where a service keeps files" or "Where the
documents are".

### The hook

`scripts/learnings-gate.sh` refuses a call that matches a doc's `triggers:` until the doc has been
read. The Cloud Brain doc's triggers are an edit under `tools/cloud-brain/` and
`bun tools/cloud-brain/(brain|build).ts`.

```
tool results in the 64 reviewer runs that hold "learnings you have not Read"    0
~/.claude/learnings-fires.tsv, rows for this doc                                 926: allowed 918, block 8
```

No reviewer was refused. Two causes, both read in the scripts and neither tried by removing it:
the list of read files is kept by `CLAUDE_CODE_SESSION_ID` (`scripts/learnings-track-read.sh`),
which a subagent shares with the session that spawned it, so one read by any agent of the session
opens the gate for all; and the trigger wants `bun tools/…` with a relative path, which a call by
the absolute path does not match. The 45 reads of the doc come from `rules.md`, "Always": "Read
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` before the first `brain.ts`,
`build.ts` or edit under `tools/cloud-brain/`". So the issue's "the hook requires" is, for a
reviewer today, a line of `rules.md`. In a session whose first agent is a reviewer the hook would
refuse; that was not run.

The gate credits a read made with the Read tool or a Bash read. Text in an agent type's body is not
a read, so putting the reviewer's part of the doc in its body does not open the gate.

### What a "Slowed by" line holds

51 of the 64 last messages have such a line. Fourteen were read. Their subjects: `issue-as.sh`
(the status after the JSON, the refusal of a time ahead of the clock, an apostrophe in a JSON
body), a path `reviewer.md` has no step for (a submit of a record only, of `rules.md` only), a
deploy replaced mid-review, and "nothing". None of the fourteen names a fact the reviewer had to go
and find in a document. The line exists and is written; it does not carry what R4 needs.

### Agent types, from the Claude Code docs

`code.claude.com/docs/en/sub-agents.md`, read 2026-10-11 (the first 100,000 of 108,547 characters,
through a summarising fetch: the quotes below are as that fetch gave them and were not checked
against the page's source).

- `omitClaudeMd`: "Set to `true` to launch this subagent without the user, project, and local
  CLAUDE.md files … Requires Claude Code v2.1.271 or later". This checkout runs 2.1.296.
- `tools`: "Inherits every tool available to subagents if omitted." An MCP server is named as
  `mcp__<server>` or `mcp__<server>__*`.
- "Background subagents" keep "every MCP tool but only these built-in tools". Which built-in tools
  was not read. The loop's reviewers all run in the background.
- A new or edited file is seen "within a few seconds … with no restart needed", but "after creating
  a scope's first agent file in a new `agents` directory, restart to load it". `.claude/agents/`
  does not exist in this checkout, which is the case the issue met ("Agent type 'probe-lean' not
  found"). So the restart is once, when the directory is made, and not at each run of the script.
  That an edit is seen by a running session was not tried here.
- "a `PreToolUse` hook in `settings.json` also runs before every tool a subagent uses".
- `skills:` puts a skill's whole text into the subagent at start-up.

### The tag: `scope:`

- `knowledge/` has 50 files and 812,983 bytes (the count in event 913; not counted again here).
- `scope:` is a closed set, `local-development` and `in-notebook`, enforced by check 6 of
  `scripts/check-learnings-triggers.sh` (lines 232 to 257): a doc with no scope, or a value outside
  the set, is reported.
- `tools/sync-wiki.ts` builds one thing from one value of it (`in-notebook`), and with no arguments
  exits 1 on drift.
- `rules.md`, `agents/reviewer.md` and `philosophy.md`, which a reviewer reads first, are outside
  `knowledge/` and have no frontmatter.

### Past reviews that can be run again

The record at event 926 has 72 reviews of a submit: 46 `pass`, 26 `changes`. 12 of the `changes`
are of a submit with no deploy ref, so the commit alone holds what was reviewed:

```
headless-harness-cel 93, 100        owner-session-file-is-present 195, 209
lope-tests-throw-reads-timeout 211  doc-example-mints-tracker-token 351
redistil-apply-leaves-seen-json 452 approve-made-for-the-owner-on-his-word 642
loop-removes-needs-owner 645        skill-md-needs-owner-removal-stale 686
dv-6-brief-step-8-runs-verify-run 869   annotations-file-feedback 908
```

(the number is the review's event). A review of a deploy cannot be run again: cb4 has moved on.

## The design

### The type

One file, `.claude/agents/brain-reviewer.md`, written by the script and not by hand. Its frontmatter:

```
name: brain-reviewer
description: Reviews one issue of the Cloud Brain tracker. Spawned by /brain-maintenance only.
model: opus
omitClaudeMd: true
tools: Bash, Read, ToolSearch, mcp__lopecode__get_pairing_token, mcp__lopecode__qa_open_notebook, mcp__lopecode__eval_code, mcp__lopecode__qa_close
```

The tools are those 30 or more of the 64 runs used. `Write` (one run) and `qa_screenshot` (one run)
are left out; a reviewer writes a scratch file with Bash. Whether a tool named in `tools` still
needs `ToolSearch`, and what the type's start-up count is with the four MCP tools named, are not
known: task 4 measures both and drops `ToolSearch` if it is not needed.

`SKILL.md` step 4 spawns it with `subagent_type: brain-reviewer`, `model: opus` and the prompt
`Working directory: <root>.` / `Issue: <id>`. The line "Read …/reviewer.md and follow it" goes,
because the brief is the body.

### The body, and the one source

The body is whole files, one after another, each under a line that names it. No part of a file is
taken.

| Part | Bytes today | Marked how |
|---|---|---|
| `agents/reviewer.md` | 9,765 | it is the role's brief; named in the script's table of roles |
| `rules.md` | 9,939 | the same table: every role gets it whole |
| `philosophy.md`, "The seven" | 587 | the same table, by heading. The one part that is not a whole file |
| `agents/tests-in-a-tab.md` (new: step 8 of `implementer.md`, moved) | about 4,000 | the same table, for `reviewer` and `implementer` |
| `knowledge/cloud-brain-access-for-the-loop.md` (new: cut from the Cloud Brain doc) | about 7,000 | frontmatter `scope: [local-development, reviewer]` |

About 31 KB. At four bytes a token that is about 8,000 tokens, an estimate. With the issue's 6,239
the first turn would be near 14,000 against 41,105 today, before the MCP tools are counted.

There are two kinds of mark, and the reason is who may edit what.

- **A knowledge doc** carries `reviewer` as a value of `scope:`, beside `local-development`. This
  is the owner's tag, and the third value of the set: check 6 of `check-learnings-triggers.sh`
  takes its set of values from the script's table of roles, so a role with no entry is refused as
  an unknown scope is today. The script reads the files and nothing else.
- **A file of the loop** (`rules.md`, `philosophy.md`, a brief) has no frontmatter and is not a
  knowledge entry, and the overseer may not edit the first two. Which roles get them is a table of
  eight lines or so at the head of the script. `philosophy.md` is the owner's and is not cut: the
  script takes the text between "## The seven" and the next `##`, and fails when either heading is
  gone.

The loop's files do not move into `knowledge/` (event 913 leaves this to the spec). `rules.md` and
the briefs are named by path in `SKILL.md`, in each other and in the spawn prompt of every role;
`philosophy.md` is a link into another repository. A move would change those paths for all five
roles to save eight lines of a table, and would put files the overseer may not edit under a
directory whose docs it does.

### The size of a marked thing

A document. The owner has said an entry is a whole document, and a mark on a section would make the
script a second reader of markdown structure, with a mark that moves or is lost when a section is
rewritten. So a document that one role needs a quarter of is cut in two, once, and each half has
one subject.

For the reviewer that is one cut. `knowledge/cloud-brain-access-for-the-loop.md` takes "Access from
this checkout" from the Cloud Brain doc, with the paragraph on the two locks and the lines on
`logs.deploys`. The Cloud Brain doc keeps one line that names the new file. Nothing is written
twice. The count of what moves is the task's to settle from the commands listed above; "about
7,000" is the section's 6,850 bytes and a guess for the rest.

Not chosen:

- *A mark on a section* (a comment after a heading, or a list of headings in the frontmatter).
  Smaller today, since no doc is cut. Not taken for the reason above, and because the hook cannot
  follow it: the gate knows files.
- *A list in each role's file of everything it includes.* One place to read what a role gets. Not
  taken for knowledge docs because the owner asked for the tag on the thing, and because a person
  editing a doc then cannot see who is made from it. It is what the script's table is, for the
  loop's own files only.
- *The `skills:` field*, with each part a skill. Claude Code would do the joining. Not taken: a
  skill is a directory with its own frontmatter, so each source would be copied into one, and that
  copy is the repetition R2 forbids.
- *Search when a fact is needed.* Taken out by the correction: the source is the directory, read by
  the script, and the agent calls no service for it.

### The script

`tools/cloud-brain/agent-types.ts`, in the manner of `tools/sync-wiki.ts`:

```
bun tools/cloud-brain/agent-types.ts            # check; exit 1 and a diff when .claude/agents/ differs from the sources
bun tools/cloud-brain/agent-types.ts --write    # write
bun tools/cloud-brain/agent-types.ts --list     # each role, its parts and their bytes
```

It fails, and writes nothing, when a part named in its table is missing, a heading it cuts at is
gone, or a doc names a role the table lacks. The written file opens with a comment that names the
script. A test in `tests/tools/` runs the check, so `bun test ./tests/tools`, which every writer of
the loop runs, fails when a source was changed and the script was not run.

### The hook and the rule (R5)

The two `brain.ts` triggers move from the Cloud Brain doc to the new doc; the trigger on an edit
under `tools/cloud-brain/` stays. A caller of `brain.ts` is then asked for 7 KB in place of 27.

The gate does not credit a body. So `--write` also writes the names of the docs of each
type to `.claude/agents/roles.json`, and `learnings-gate.sh` takes a doc as read when the call comes
from an agent type that carries it. This needs the hook's input to say which type is calling. The
docs say a hook receives `agent_type`; the keys recorded for a main-session call in
`learnings-fires.tsv` (`session_id, transcript_path, cwd, …, tool_name, tool_input, tool_use_id`)
have none, and a subagent's keys were not read. Task 4 reads them first. If the type is not there,
the fallback is what happens today: the session-wide list, which opened the gate for all 64 runs.

`rules.md`, "Always", first line, gets a clause: "…or be an agent type whose body carries the doc
(`agent-types.ts --list`)". That is a change to `rules.md` and is the owner's.

### How a knowledge mistake is seen (R4)

Two inputs, the first from the record and the second from the agent.

1. `tools/cloud-brain/agent-reads.ts --role reviewer [--since <time>]` reads the transcripts as
   "What exists today" did and prints, for the runs of a type: the files read that are not in its
   body, by number of runs; the tools called; first-turn context, turns, and context summed over
   turns. The numbers of this spec came from a script of this shape in a scratch directory, which
   is not kept; task 2 writes it into the repository and its first output is checked against the
   tables above.
2. `reviewer.md` asks for one line in the report, apart from "Slowed by": `Lacked: <the fact>, found
   in <file>`, or `Lacked: nothing`.

`agents/overseer.md` gets a step: run `agent-reads.ts` for each lean role since the last oversight.
A file outside the body read by three runs or more, or named in a `Lacked:` line twice, is a mark
to add or a source to cut, then `agent-types.ts --write`, in the same commit. A part of the body
that is a knowledge doc and whose commands appear in no run over 20 runs is a mark to take off.
Three and 20 are first guesses, to be changed by the overseer from what it sees.

### The proof before the switch (R6)

Six of the twelve `changes` reviews listed above are run again by the lean type: the first review
of six different issues, chosen by the task before any run and named in its record. For each, a
worktree at the submit's commit, and the issue as it was at the submit.

A reviewer reads the issue with `ir "get?id="`, which today would show it the review it is being
compared with, and it writes its verdict with `ir review` and `ir move`. So the proof needs
`issue-as.sh` to take `ISSUE_AS_UNTIL=<seq>`: a `get` or `list` answers with the events after that
one left out and the issue's state as that event left it, and any write is printed and not sent.
The replay prompt is the loop's prompt with that one variable set in the `ir` function.

Read from each run: the verdict, and for each finding of the recorded review that the next round
then changed, whether the lean review names it. The gate: `changes` in six of six, and every such
finding named in five of six. A finding the lean review makes that the record lacks is looked at
by the orchestrator and listed. Below the gate, the body is what is changed (R4's loop, by hand,
once) and the six are run again; the type does not go into `SKILL.md`.

This shows the lean type on changes to tools, briefs and docs. It does not show it on a deploy
(steps 3 and 4 of the brief, the QA tab). The first five lean reviews of a submit with a deploy ref
are read by the overseer at its next run against the same list as any review; nothing else covers
that half before the switch, and the spec says so in place of a control it does not have.

Cost, an estimate: six runs at the present median of 107,955 is 650,000 tokens at most.

### What is measured after (R7)

`agent-reads.ts --role reviewer`, over the first 20 lean reviews, against the 64:

```
                                     today        wanted
first-turn context, median           41,105       under 20,000
context summed over turns, median    1,315,354    under 900,000
runs that read implementer.md        35 of 65     0
runs that read the 27 KB doc         45 of 65     under 3
```

and the share of submits sent back. `issue-stats.ts`, which the overseer reads, printed "69 submits, 25
sent back" at event 906; this spec's own count of the record at event 926 (the last move to
`in-review` before each review) is 72 and 26. A fall in it is not a
success: it is the sign R6 guards against, and the overseer reads the lean `pass` reviews of that
span when it falls below 25%.

"Under 900,000" comes from 15 turns at about 27,000 less start-up and about 10,000 less read. It is
arithmetic on medians, not a measurement.

## How each requirement is known to be met

| | Known by |
|---|---|
| R1 | `.claude/agents/brain-reviewer.md` exists; a transcript's meta file says `"agentType":"brain-reviewer"`; `agent-reads.ts` shows no tool outside the list |
| R2 | `agent-types.ts --list` names five parts, each a file; a sentence of `rules.md` is found by `grep -rl` in one file of the repository, the written `.claude/agents/` left out |
| R3 | `bun tools/cloud-brain/agent-types.ts` exits 0; after one character changed in `reviewer.md` it exits 1; the test in `tests/tools/` fails the same way |
| R4 | `agent-reads.ts --role reviewer` prints the tables of "What exists today" for the 64 runs; `overseer.md` has the step; the first oversight after the switch records its output and what it changed |
| R5 | a session whose first agent is a lean reviewer runs `bun tools/cloud-brain/brain.ts redistil` and is not refused; `agent-reads.ts` shows under 3 of 20 runs reading the 27 KB doc |
| R6 | the record `tools/cloud-brain/records/lean-reviewer-persona.md` has the six issues, each recorded finding and whether the lean review named it |
| R7 | the table above, filled from 20 runs |

## The tasks, in the order they land

Each is one writer and one review. 1 and 2 are worth having if nothing after them is approved.

1. **`tests-in-a-tab.md`.** Step 8 of `implementer.md` becomes `agents/tests-in-a-tab.md`; both
   briefs name it. Known by: over the next 10 reviews no reviewer reads `implementer.md`.
2. **`agent-reads.ts`**, with a test over a fixture transcript. Its output for today's reviewers
   matches this spec, or the record says where this spec was wrong.
3. **The doc cut and the marks.** `knowledge/cloud-brain-access-for-the-loop.md` with `reviewer` in its
   `scope:`, the value added to check 6 of `check-learnings-triggers.sh`, the two triggers moved,
   CLAUDE.md's table of knowledge docs and its paragraph on `scope:`. The other readers of `scope:`
   (`tools/sync-wiki.ts`, `tools/cloud-brain/knowledge-docs.ts`) are run with the new value in place;
   how they take a third value was not read for this spec.
4. **`agent-types.ts`** and its test; `.claude/agents/brain-reviewer.md` written by it; the start-up
   count of the type, with and without `ToolSearch`, in the record. The hook's input for a subagent
   is read, and the gate's change is made or the record says why not. `SKILL.md` is not changed.
5. **`ISSUE_AS_UNTIL`** in `issue-as.sh`, with a test that a write is not sent.
6. **The proof**: six replays, the record. Needs the owner's restart after task 4.
7. **The switch**: `SKILL.md` step 4, the `Lacked:` line in `reviewer.md`, the step in `overseer.md`.
   Only when task 6 met its gate.
8. **The reading after 20 lean reviews**: R7's table in the record, and which role is next.

## What only the owner can do

- Approve this spec.
- Restart the orchestrating session once after task 4 lands: `.claude/agents/` is a new directory.
- Approve the clause in `rules.md`, "Always", first line (R5). Without it a lean reviewer is still
  told to read the 27 KB doc, and reads it.

## Read

Searches of the Brain's knowledge base for prior art (step 4 of the spec writer's brief; the design
calls no such search), 2026-10-11, `knowledge.search?semantic=true` with the token
`loop-knowledge`:

| Words | Found | Used |
|---|---|---|
| lean agent persona smaller context subagent | `doc:effective-use-of-fable` 0.74; papers under 0.63 | no. The doc is on which model a subagent is given, which this does not change |
| role tags knowledge base single source generated agent prompt | `arxiv:2603.18743` Memento-Skills 0.91; `module:tomlarkworthy:robocoop-5-engine` 0.83; `arxiv:2405.16247` AutoManual 0.74 | see below |
| context engineering progressive disclosure skills | Memento-Skills 0.95; `web:weng-harness-engineering` 0.84 | see below |
| token cost of agent startup system prompt | papers on other subjects (0.87 down); `doc:effective-use-of-fable` 0.66 | no |
| retrieval vs long context for agent instructions | AutoManual 0.98; papers on embedding retrieval | no |
| `q=reviewer&tag=reviewer` (words) | `{"entries":[]}` | no. Out of scope since event 913 |

Read as the entry's text only, which is an abstract and a note, not the paper:

- Memento-Skills (`https://arxiv.org/abs/2603.18743`): skills as markdown files that an agent
  rewrites from experience, chosen by a router at the time of need. It is the design not taken
  here (search at need), at a scale of many skills. With five documents for one role there is
  nothing to route.
- AutoManual (`https://arxiv.org/abs/2405.16247`): one agent acts by the rules, a second edits the
  rules from what happened, and the edits are tied to a case. That is R4's shape: the overseer
  changes a mark from a counted read or a `Lacked:` line, not from a general impression.
- Weng, "Harness Engineering for Self-Improvement" (`https://lilianweng.github.io/posts/2026-07-04-harness/`):
  the entry's note only. Nothing taken from it.

Outside: `https://code.claude.com/docs/en/sub-agents.md`, as said under "Agent types". No search of
the papers beyond the Brain's was made. The question here is what one role of one loop reads, and
the transcripts answer it; a second attempt, if the proof fails, is where line 7 of the philosophy
would send a writer outside.
