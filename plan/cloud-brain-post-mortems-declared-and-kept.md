# Cloud Brain: a post mortem is a task with a label, written by a writer of the loop, kept as a file the search finds

Spec of the feature `post-mortems-declared-and-kept` on cb4's tracker. Written 2026-10-12, begun
21:20 CEST (the `spec` move, event 4492), from `lopecode-dev` `2be5f382`. Round 1. Nothing here is built.

Three things a reader should know before the rest:

- **Nothing in it needs the owner's hand but the approval.** No policy install, no new kind, no new
  token, no new role, no service and no deploy. It is two briefs, the procedure, three edits of the docs
  tool (the path it lists, its filter, how it names a doc), one block of the stats tool and their tests.
- **The first post mortem, `pm-second-summarizer-role`, landed while this was written** (`lopecode-dev`
  `2939a2c0`, which came into the worktree at the rebase of 21:43 CEST, after the fresh review). The
  design was written without it: at 21:27 CEST it had no run. It was then read whole and the spec
  changed in four places, each marked "(the first)": the headings of the form are its headings, the
  transcript is said to hold no reasoning, its actions are linked `related` and were filed before its
  review, and it has a record and a test of its own. Where the design differs from what it did, the
  design says why.
- **Whether a thing "happened again" is not something the record can answer by itself.** The design
  gives each post mortem a sentence that says what a second case would look like, and a list of its
  actions with their states. That a second case is noticed still rests on an agent or the owner
  seeing it. "What is not known" has this.

## What was asked

The owner, 2026-10-12, to a session outside the loop (token `out-5f56b2`), as the issue's body
quotes him, two messages, each whole. The first was before 21:16:42 CEST and the second before
21:18:50 CEST (comment 4483, the clock of that session):

> Can we have a post mortem on how we had that dumb decision and trace where the decision making went wrong. It should use reflection and backtracing the tasks to identify the root cause of this bad decision. We need this to be a general mechnism, declare a post mortem to prevent someting from never happening again.

> no you don;t do it, file issues to create a post mortem task, the loop itself should do the post mortem and decide next actions. These post mortems should be files for future reference somewhere.

"That dumb decision" is the spec of `docs-summarised-for-search`, which made a role `doc-summarizer`
beside `paper-summarizer`, passed its review (event 4341) and was sent back by him (event 4434). His
words on it, before 21:15:10 CEST, bear on one choice of this spec (comments 4458 and 4463 of that issue):

> yeah claude, don;t we have a summarizer persona, it should reuse that

> yeah I think we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose

The issue carries the label `owner`.

## The reports gathered

None. `list?parent=post-mortems-declared-and-kept` answered `{"issues":[]}` at 21:19 CEST. One issue
is linked, `related`: `pm-second-summarizer-role`, the first post mortem, a task at `ready`. The
issue's body lists four things "Not in his words, for the spec". Each is taken as a question and
answered by a requirement:

| The body's question | Requirement |
|---|---|
| Where the files are kept and how a later agent finds one | R3, R4 |
| Who does one: the overseer, or a role of its own | R2 |
| What a post mortem must have to be one, and how it is known later that the thing did not happen again | R5, R7 |
| Who may declare one beside him, and what keeps it from being declared for every send-back | R1, R8 |

## Requirements

- **R1. Declared.** The owner, by any session on his word, or the loop, declares a post mortem of one
  decision or event. It is an issue of the tracker that names what it is of.
- **R2. Done by the loop.** An agent of the loop that had no part in the decision writes it, from the
  record backwards: "reflection and backtracing the tasks". The session that declares it gives no cause.
- **R3. Kept as a file.** One file a post mortem, in one place, that the owner can read from the issue.
- **R4. Found.** A writer or a spec writer that searches the Brain before a design (`agents/implementer.md`
  step 2, `agents/spec.md` step 4) is answered the post mortem that bears on it.
- **R5. A form.** The file has the trace with what each step is read from, the cause, what would have
  caught it, the actions and what a second case would look like. It fits one entry of the knowledge base.
- **R6. The loop decides the next actions.** They are filed as issues by the agent that wrote the post
  mortem, tied to it in the record. The owner is not asked to pick between them.
- **R7. Known later.** For each post mortem a reader can see, with one command, what became of its
  actions and whether a later post mortem names it.
- **R8. Not for every send-back.** What declares one is written down, counted on the record, and rare.

## What exists today, measured

All of 2026-10-12 between 21:19 and 21:32 CEST, with the token `spec-b08073`, unless a line says otherwise.

**The record.** `sync?after=0`, paged to its end: 4,493 events, the first of 2026-10-10 11:53 CEST.

```
moves, by name     submit 243  rework 56  submit-spec 44  respec 19  approve 60  reject 25  send-back 1  owner-reject 0  revert 0
opened             386, of them seen-… 83 and fix-tests-… 1
```

- The owner has undone work that passed a review **once** in the record: the `send-back` of event 4434.
  Three `reject` moves are his session's (events 5, 147, 149, all 2026-10-10, at triage, before any work).
- 56 of 243 submits and 19 of 44 spec submits were sent back by a reviewer. That is the loop's review
  working. A trigger that counted them would have declared 75 post mortems in 2.4 days.

**Who reflects today.** `agents/overseer.md`: the overseer "look[s] at how the issue loop did its recent
work", from the events since the last oversight, files at most 3 issues and makes at most 2 edits of a
brief. `oversight.md` has 26 entries. Its brief says: "You do not review, pass, triage or start any
issue, yours or another's." `SKILL.md` step 6: "One overseer at a time". It is started by a count of
finished issues, not by an issue. The record has no `cost` event of a role `overseer` (510 `cost`
events: reviewer 271, implementer 192, spec-writer 43, digest 2, paper-summarizer 1, approver 1), so
what an oversight costs is not in the tracker.

**What a writer and a review cost.** From those `cost` events: an implementer's run has a median
context of 169,679 tokens and 916 s; a reviewer's 88,219 tokens, 273 s and $1.19 (197 runs priced).

**What a trace can be read from.** For the decision the first post mortem is of:

- the issue and its events, `get?id=docs-summarised-for-search` (18 events when read at 21:21 CEST);
- its runs, `runs?id=docs-summarised-for-search`: the spec writer's, `"agent":"a470d5baabd969ffd"`,
  `"session":"f501a8e8-…"`, 1,683 s, 56 tool calls, `"advisor":{"calls":2,…}`; and the reviewer's;
- the transcript of that agent, on the machine that ran it:
  `~/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev/<session>/subagents/agent-<agent>.jsonl`,
  1,848,202 bytes for that one (`ls -la`, 21:22 CEST), and 2,000,518 at 21:36 as the fresh review
  read it: the file is added to while that agent writes its second round, so a trace reads it up to
  the time of the submit it is tracing. It was not opened for this spec. It is on one machine
  and in no repository. It has what the agent called and was answered, and its prompt. It does not
  have why (the first, "What is not known": "every `thinking` block in it has length 0 (46, read
  21:24) and both answers of its advisor are `advisor_redacted_result`");
- the orchestrator's journal, `<root>/tools/cloud-brain/.emitted/issue-loop/<id>.md` (213 files, untracked). It has each
  agent's report. It does not have the prompt an agent was started with (`grep -ci prompt` of the one for
  `docs-summarised-for-search`: 0, the fresh review's run); that is in the transcript alone;
- the spec at its commit, the briefs at that commit (`git show <sha>:<path>`), the review (event 4341).

**Where a file can be kept and found.**

- `tools/cloud-brain/records/` has 179 files, one a change. None is in the Brain's search.
- `tools/cloud-brain/knowledge-docs.ts`, its filter: `/^knowledge\/[^/]+\.md$/.test(p) || /^plan\/cloud-brain-[^/]*\.md$/.test(p)`,
  and three files of `cloud-brain-dev`. Its status: `{"docs":86,"fresh":86,"stale":0,"missing":0,"cut":44,…}`.
  An entry's text is 16,000 characters; 44 of the 86 are cut.
- `issue.attach` takes a file of 1 MB on an issue, 20 an issue, and the page lists it. Since
  `specs-kept-in-the-cluster` (the owner's "A" of comment 4085, 2026-10-12) a spec is attached to its issue.
- `tools/cloud-brain/post-mortems/` did not exist at 21:30 CEST (`git ls-tree -r origin/main tools/cloud-brain/post-mortems/`:
  0 lines) and has one file since `2939a2c0`, the first: 12,664 bytes, 12,662 characters (`wc -m`), with a record
  (`records/pm-second-summarizer-role.md`) and a test that holds its quotes (4 pass, its record).
  It is in no search: the filter does not take the directory. Comment 4485 of `pm-second-summarizer-role`, the orchestrator's, tells its writer to write
  `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md` "until `post-mortems-declared-and-kept` says where".

**What says which brief an issue gets.** A label does it once already: an issue labeled `digest` is
given the digest writer (`SKILL.md`, step 3). A new kind is a new policy, and `issue.install` is the
owner's (`rules.md`, Never). `issue.link` has the rel `cause`: "an issue that exists because of another
names it as its `cause`" (`SKILL.md`). `pm-second-summarizer-role` has it to `docs-summarised-for-search`.

**What nothing has today.** `list?label=post-mortem&limit=100` answered `{"issues":[]}`. A search of the
Brain for "post mortem second summarizer role" answered 20 entries, the first three
`doc:cloud-brain-paper-summarizer-persona`, `web:carbonell-1998-mmr` and
`doc:cloud-brain-docs-summarised-for-search`. So a spec writer who searches today for a summarizer
finds both designs and nothing that says the second was sent back.

## The design

### 1. Declared: a task with the label `post-mortem` and a `cause` link (R1, R8)

A post mortem is an issue of kind `task`, id `pm-<short>`, labeled `post-mortem`, with one link
`{id: pm-<short>, to: <the issue it is of>, rel: "cause"}`. The body has what is examined (the issue,
the events, the commit), the words of whoever asked, and pointers to where the trace starts. It names
no cause: comment 4485 and the body of `pm-second-summarizer-role` are the example ("I give no cause
here: he asked that the loop find it").

Who declares one:

- **The owner**, through any session on his word. The session adds the label `owner` and quotes him.
- **The orchestrating session, with no word of his, in one case:** the owner undid work that had passed
  a review. That is his `send-back` of a spec, his `owner-reject` of an issue that has a `reviewed`
  event with the verdict `pass`, or his `revert`. The record has 1 such event in 2.4 days. The session
  opens it in the pass that reads the event.

Nobody else declares one. An agent that sees something off files feedback, as now (`philosophy.md`,
"If You See Something, Say Something"), the overseer among them: no line of its brief changes, and
what it gathers is a project, as now. When the owner reads a gathering and wants its root found, the
first case is his.

What is not a trigger: a reviewer's `changes` (75 in the record), a `respec`, a failed test, a
put-back by the deployer (it opens its `fix-tests-…` issue), a line of Never crossed (it is filed as
feedback, as `seen-never-crossed-on-chat-word` was). Those are caught by the loop as built. The second
case is kept to what the record can count without a judgment.

Triage of one asks one question, whether a post mortem of the same thing exists
(`list?label=post-mortem`): then it is linked `duplicate` and closed. Else `triage` and `ready`.

### 2. Written by a writer, under a section of the implementer's brief (R2)

The orchestrator spawns an implementer for an issue labeled `post-mortem` at `ready`, with an `impl-`
token and the bare prompt: the working directory, the brief, the issue's id, the token. The prompt says
nothing of what the session thinks went wrong. The writer follows a new section of
`agents/implementer.md`, "A post mortem", which says what each step of the brief is for it: 1 and 4 as
written; 2 with the search made in the words of the decision; 3 as written (a post mortem that would
need an act of Never is stopped there); 5 to 8 replaced by the trace; of 9 the rebase alone, since the
post mortem's file is its record and no file is written under `records/`; 10 as a landing with no
deploy; of 11 the read "as the reviewer will", with the four questions of part 6; 12 and 13 as written.

The trace, in the section's words to be:

- Start at the outcome and go backwards, one step at a time: the owner's words, the comment that put
  the choice to him, the review, the submit, the run that wrote it, the brief and the prompt that run
  was given (the prompt is in the transcript alone), the issue as opened, and what it was opened from.
- For each step: what was decided or passed on, what the agent had in front of it then (the brief at
  that commit, the issue's body, what its searches answered), and what it did not have. Each is read
  from an event by its seq, a commit, a file and line, a journal file, or the transcript of the run
  (`runs?id=` gives `agent` and `session`; the path is above). A transcript is read for what the
  agent was given, searched and was answered, in order. It keeps no reasoning (the first), so why an
  agent chose is written under "What is not known" unless the agent wrote it down. Nothing of a tool
  result in it that holds a token or a session is quoted.
- A step that could not be read is written under "What is not known" with why (the transcript is on another
  machine; the run has no `cost` event).
- **The cause is something a change can be made to:** a line of a brief, a prompt, a tool's answer, a
  check nobody makes, a question the review does not ask. "The spec writer did not think of it" is not
  one: the next spec writer is a new agent with the same brief. An agent is named by its role and the
  event of its run, and the file says what it was given. (As built, `post-mortem-actions-prefer-guards`,
  2026-10-12: the brief adds two items after this one. A guard of the installed policy, a state or a move
  of a workflow, a refusal of a service or a tool and a test are named as things a change can be made to;
  and a trace that reaches no cause writes "Not found" with the step where it stopped; the record.)
- One cause is written as the root, with the others that were weighed and what in the trace rules each
  out. Where two things each had to be so, both are written.
- Before the cause is written, `knowledge.search` for earlier post mortems in the words of the cause.
  One that names the same cause is linked `related`, and the file says what its actions were and why
  they did not hold.

The writer of a post mortem is not the agent of any run in its trace. With a token for each agent
that is read from the record: `by.start` of the post mortem is no `token` of `runs?id=<the issue it is of>`.

### 3. The file (R3, R5)

`tools/cloud-brain/post-mortems/<id>.md`, with `<id>` the issue's id. Landed as a change with no
deploy. Then attached to its issue before the submit, as `agents/spec.md` step 7 attaches a spec, under
the name `<id>-r<round>.md`: the owner reads it from the issue on the page. It is 16,000 characters at
most, so the Brain's entry holds it whole; longer evidence is a second attachment that the file names.

Its parts, in order, each a `##` heading the test of task 1 reads:

| Heading | What is under it |
|---|---|
| `# Post mortem: <one line>` | then one line: the issue it is of, the date declared and by whom, the date written |
| `## What happened` | the outcome, with the owner's words whole and their event |
| `## The trace` | the steps in a table of events, then what the writer had in hand, where the choice was made, and what each check after it read |
| `## The root cause` | one or two sentences; what the texts an agent follows have and lack; then what else let it pass and did not make it |
| `## What is not known` | each source not read, each thing not tried, and why an agent chose when nothing kept it |
| `## What it cost` | from the `cost` events of the issue it is of, and the owner's answers |
| `## Next actions` | 3 at most, each with the title of the issue, what it changes and the part of the trace it answers; then what was not filed, and why; or "None", with why |
| `## How it is known later` | what in the record a second case would look like, as exactly as it can be said |

These are the headings of the first, read with `grep -n "^## "` at `2939a2c0`. Its seventh is
`## Next actions, filed`, and the test takes a heading that begins with the words of the table. So the
first file meets the form as it is, and task 1 changes no word of it.

### 4. Found by the search every design starts with (R4)

`knowledge-docs.ts` gains the directory: the path in its `ls-tree` and one more pattern in its filter,
`/^tools\/cloud-brain\/post-mortems\/[^/]+\.md$/`. The name of such a doc is the file's name, which is
the issue's id, so the entry is `doc:pm-<short>`, private, entered at the release of the landing lock
as every doc is. The tool takes the name today from `p.split("/")[1].slice(0, -3)`, the second
part of the path with three characters cut, which for this path is `cloud-br`: task 1 takes the last part of the path. No brief changes for the finding: the search
before a design is already a step of the writer's and the spec writer's.

The title line is what the search weighs first, so it says the decision in the words a later design
would be searched in ("a second summarizer role beside the one that exists"), not the issue's id.

### 5. The next actions (R6)

The writer decides them and writes them in the file under "Next actions". They are filed after the review
passes, so that no issue is opened from a cause the review then sends back. (The first filed its three
before its submit, events 4497 to 4501, and linked them `related`. They stand. A `related` link does
not say which way it runs, and the first is `related` to this project too, so the block of part 7
cannot read actions from it: task 4's writer adds the three `cause` links, or says what the tracker
answered. As built, `pm-2-brief-and-procedure`, 2026-10-12: the writer of task 2 added them, events 4909 to
4911, each answered 200, on note 1 of review 4602 and comment 4621, so that the line of `SKILL.md` does not
read the first as lacking three; the record.)

- The writer waits for its review (step 13). On `pass` it opens each action and links it, and says the
  ids in its report. When it cannot (its run ended), the orchestrating session opens them from the
  file, as written there. `SKILL.md` has the line: a post mortem that reaches `done` has as many
  `cause` links to it as its file has actions, before step 7 tells the owner of it.
- At most 3 issues a post mortem, over all its rounds, each a `task` or a `bug` whose body quotes the
  post mortem's cause and names the file, linked `{id: <action>, to: pm-<short>, rel: "cause"}`. Not
  opened with `parent`.
- The writer makes none of them itself, as a quick win or otherwise: each is taken by the loop as any issue is.
- An action that changes `rules.md`, `philosophy.md` or who may do what is labeled `major` and has the
  text proposed in its body. It reaches the owner at `awaiting-approval` as any `major` change does.
  That is his approval of a change, not a choice between actions.
- "None" is an answer: the cause is already changed (name the commit), or a change would cost more
  than a second case (`philosophy.md`, line 5), with what would reopen it.

The limit of 3 is the overseer's, for the overseer's reason: "so a bad round cannot compound".

(As built, `post-mortem-actions-prefer-guards`, 2026-10-12, on the owner's words of that day, "generally fixes
are better as guards" and "if the cause cannot be determined the action would be to increase observability in
the problem area": the file's actions are one table with a column `Held by`, whose cell starts with `guard`,
`workflow`, `refusal`, `test`, `observability` or `text`. The first of them that can hold the cause is taken, a
`text` cell says why none of the first four can, and a trace that reached no cause has an `observability` action
and no "None". `tests/tools/post-mortems.test.ts` holds the column for a file written after the first three.
Question 3 of part 6 is as written; what it reads of the column is a comment on `pm-3-reviewer-brief`; the record.)

### 6. Reviewed (R2, R5)

The post mortem goes to `in-review` with the commit of its file as the ref. The count of its submit
is the run of `tests/tools/post-mortems.test.ts` (task 1), which holds the form of every file of the
directory. The reviewer's brief gains a short part, "A post mortem", with four questions:

1. Does each step of the trace say what its event, commit or line says? Read five of them, the cause's among them.
2. Is the cause something a change can be made to, and does the trace reach it, or does it stop at an agent?
3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?
4. Would a reader know a second case from "How it is known later"?

A post mortem that fails 1 or 2 is sent back. A number that is inexact is a note (the owner, event 2099).

### 7. Known later (R7)

`issue-stats.ts` prints one block. The orchestrating session reads it: it runs the tool for its two
lists of feedback already (`SKILL.md`, step 3, the row for feedback at `open`).

```
post mortems       <n>: <done> done, <open> not done
  pm-<short>   <state>   of <issue>   actions: <id> <state>, …   named again by: <pm id>, … | none
```

`named again by` is each later post mortem with a `related` link to this one (design part 2, the last
item of the trace). When a pass reads a post mortem reach `done`, step 7 of `SKILL.md` tells the owner its
cause in the file's sentence and its actions by id; and it tells him of one that is named again, or
has an action at `rejected`, in the pass that first reads it so. The overseer runs the same tool first
at each oversight and so has the block in front of it. No line of its brief tells it to read it: a
change to that brief is `major` by the brief's own table, and is left to the read after three (below)
to ask for, with the cases.

### What was not chosen

- **The overseer writes it.** Its job is the nearest: the reflective line of `philosophy.md` is its.
  Against: it starts on a count and reads a window of events, one at a time, where a post mortem
  starts on an issue and reads one decision to its root; its brief forbids a `start` and its work is
  not reviewed; and a change to its brief is `major` by that brief's own table. Making it do both is
  three exceptions in one brief.
- **A role of its own, with a brief file and a token prefix `pm-`.** A row of the table of `rules.md`,
  "Which token", which is the owner's file, and a second brief for a job whose path (start, a file
  landed, submit, review) is the writer's. His words of 21:15 CEST on the summarizer are against it.
- **A kind `post-mortem` with its own workflow.** A policy install, which is the owner's, for what a
  label does for the digest.
- **The file in `plan/` as `cloud-brain-pm-<id>.md`.** The filter takes it today with no change. Against:
  `plan/` then lists designs and post mortems under one prefix, and the test of the form would have to
  tell them apart by name.
- **The file in `cloud-brain-dev`, the cluster's git.** Nearest to his "not in lopecode-dev, in the
  cluster" of 2026-10-11 on specs. Against: a push there is a second landing with its own token
  (`worktree.sh --push-dev`), and a real push by that command "not yet" had been made when
  `agents/implementer.md` step 10 was written. He chose the attachment for specs the next day
  (comment 4085, "A"); the same is taken here.
- **The file only as an attachment.** In the cluster and on the page, and not in the search: R4 unmet.
- **A post mortem of every send-back by a review.** 75 in 2.4 days, at a writer and a reviewer each.
- **The agent that made the decision is asked why.** His word is "reflection", and the first found
  that nothing kept the spec writer's reasoning. Against: an agent's account of itself after the fact
  is what the overseer's brief sets aside ("Work from the record, not from what an agent said of
  itself"), only the orchestrating session can send a run a message, and the first reached a cause
  that a change can be made to without it. Keeping an agent's reasoning is a matter of the harness and
  not of the loop's files; the first names it as "Not filed", and so does this.
- **A record and a test of its own for each post mortem**, as the first has. The file is the record.
  A test of its quotes at a commit is a writer's choice and is counted beside the test of the form.
- **A recurrence check that runs.** A cause is a sentence; no query of the record matches "a second
  role where one exists". Where a cause can be held by a test (a line of a brief, as
  `tests/tools/spec-brief-attaches-the-spec.test.ts` holds one), the action is that test.

### What is not known

- Whether a writer reaches a cause that is not "the agent erred". A study of 127 failure logs of
  multi-agent systems found the agent at fault named rightly 53.5% of the time and the step 14.2%
  (Zhang et al., under "Read", from a summary). That is why each step cites what it is read from and a
  reviewer reads five. The first three post mortems say whether it is enough (the read after three).
- Whether a post mortem is found by a search made in a later design's words. It is checked on the
  first one in task 1, with a query in a design's words, and again in the read after three.
- Why an agent chose what it chose. The first could not read it, and nothing here keeps it.
- That a second case is noticed. Nothing here watches for one.

## How each requirement is known to be met

Each command is run by an agent of the loop with its own token. `ia` is `tools/cloud-brain/issue-as.sh <token>`.

| | Command | Today, 2026-10-12 | After |
|---|---|---|---|
| R1 | `ia "list?label=post-mortem&limit=100"` | `{"issues":[]}` | task 2: the orchestrator labels `pm-second-summarizer-role` and it is listed. Not runnable before task 2. |
| R1 | `ia "get?id=pm-second-summarizer-role"`, `issue.links` | `{'rel': 'cause', 'to': 'docs-summarised-for-search'}` among them | the same, of each post mortem |
| R2 | `ia "runs?id=<pm>"` against `ia "runs?id=<the issue it is of>"` | `"runs":[]` for the first at 21:27 CEST; its `start` (event 4495) is by `impl-58df50`, and the two runs of `docs-summarised-for-search` are of `spec-6ac003` and `rev-e6fc59` | after a post mortem is written: one run of role `implementer` whose `token` is no `token` of the other list |
| R3 | `git ls-tree -r --name-only origin/main tools/cloud-brain/post-mortems/` | 0 lines at 21:30 CEST; 1 at 21:44, `…/pm-second-summarizer-role.md`, and `attachments` of its issue is `[]` | one line a post mortem; and `attachments` of `get?id=<pm>` names `<pm>-r1.md` |
| R4 | `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, last line | `"docs":86,"fresh":86` | with the filter of part 4 put in the worktree and taken back, run 21:30 CEST: still `"docs":86,"fresh":86`, since `origin/main` has no such file. After task 1 and the first file's landing: one doc more for each file, with a line `fresh    private pm-<short>`. Run then, by task 1's writer. |
| R4 | the search of `agents/implementer.md` step 2 with `q=post mortem second summarizer role` | no `doc:pm-…` among 20 entries | task 1, after the first file is entered: `doc:pm-second-summarizer-role` among the first five. Not runnable before. |
| R4 | the same search with `q=summarise knowledge docs for search, which role writes the summary`, the words of a later design and not of the post mortem | run 21:42 CEST: the first three are `doc:cloud-brain-docs-summarised-for-search`, `web:carbonell-1998-mmr`, `doc:cloud-brain-paper-summarizer-persona`; no `doc:pm-…` | task 1, after the first file is entered: `doc:pm-second-summarizer-role` among the first five. When it is not, the writer says so with the list; that is the finding R4 exists for and it goes to the title line of the file, not to this check. Not runnable before. |
| R5 | `bun test ./tests/tools/post-mortems.test.ts` | no such file | task 1: 0 fail, with a count. It fails on a file with a heading missing, out of order, or over 16,000 characters (the test has a file of each in a temporary directory). |
| R5 | `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts` | `19 pass, 0 fail`, 217 s, run 21:28 CEST, and 81 s in the fresh review's run (with bun's default timeout: 4 pass, 15 fail, 91 s) | task 1: 0 fail, with a test more for the new path |
| R6 | `ia "get?id=<pm>"`, `issue.linked` | `[]` at 21:21 CEST; at 21:44 three, each `'rel': 'related'` (the first's actions) | once it is `done`: one `{'rel': 'cause', 'id': <action>}` for each action of the file, 3 at most, or the file's "None" |
| R7 | `bun <root>/tools/cloud-brain/issue-stats.ts --token=<token>` | no line `post mortems` | task 4: the block of part 7. Not runnable before. |
| R8 | the same block's first line, against the count of the owner's `send-back`, `owner-reject` after a pass, and `revert` | 1 such event (4434), 1 post mortem opened | task 4 prints both numbers. More post mortems of the session's own declaring than such events is said to the owner in step 7. |

Nothing here is the owner's to measure.

## The tasks

In the order they land, four. Each is one writer and one review. None is `major`: none changes who may do
what, and no file of the owner's is edited.

1. **`pm-1-file-and-search`.** `knowledge-docs.ts` takes `tools/cloud-brain/post-mortems/*.md`, named by
   the file; its test. `tests/tools/post-mortems.test.ts`, the form of part 3 over every file of the
   directory; it passes on the first file as it is (part 3). Attach the first file to its issue when it
   is not attached, and run the three R4 checks on it. A row for the directory in "Where the documents
   are" of `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` (comment 4523: "No doc points at it yet").
2. **`pm-2-brief-and-procedure`.** `agents/implementer.md`, the section "A post mortem" (parts 2, 3, 5).
   `SKILL.md`: the row for an issue labeled `post-mortem`, the one case in which the session declares
   one, the triage of one, the actions filed at `done` (part 5), the lines of step 7 (part 7), and the
   read after three (below). A test file that holds those lines. The session then
   labels `pm-second-summarizer-role`.
3. **`pm-3-reviewer-brief`.** The part "A post mortem" in the reviewer's brief on the Brain, put by the
   writer (`rules.md`: a writer whose issue is a task of an approved spec may), with the kept copy
   `tests/tools/fixtures/reviewer-brief.md` and a test of the four questions.
4. **`pm-4-stats-block`.** `issue-stats.ts` prints the block of part 7 and the two numbers of R8; its test.
   The three `cause` links of the first's actions (part 5). (As built, `pm-2-brief-and-procedure`, 2026-10-12: made in
   task 2, events 4909 to 4911; the record.)

**The read after three is not a part of this project**, so the project is `done` when the four are.
A part opened now would hold the project at `building` until three post mortems exist, and the record
has one trigger in 2.4 days. The line task 2 puts in `SKILL.md`: when the block of part 7 first shows
three post mortems `done`, the session opens the task `pm-read-after-three`, linked `related` to this
project. A read, no build: for each, did the review send it back and for which question; what became
of its actions; was it answered to a later search (the comments of later writers name what they
searched and used); did the overseer act on the block. What it finds is a comment on this project
and, where a brief is at fault, a task, `major` when the brief is the overseer's.

`pm-second-summarizer-role` is not a task of this spec and did not wait for it: it was written from
its own body and comment 4485, and was `in-progress` with its file landed at 21:44 CEST.

## What only the owner can do

- Approve this spec.

## What the orchestrator makes

Nothing. No token is named: the writer has its `impl-` token, the search is `loop-knowledge`, the
entry is put by `loop-docs` at the release of the lock, the reviewer's brief by `loop-roles`.

## Read

**In the Brain**, `knowledge.search?semantic=true` with `loop-knowledge`, 21:24 CEST. Only the ids and
titles the search answers were read, but for the docs named as files of this repository.

| Searched | Found | Used |
|---|---|---|
| "post mortem root cause of a bad decision" | `arxiv:2509.26354` "Your Agent May Misevolve", 0.573; nothing of the loop's | no; title only |
| "trace a decision back through issues events reviews" | `doc:cloud-brain-lean-reviewer-persona` 0.87, `doc:cloud-brain-run-cost-is-part-of-the-issue-model` 0.68, `doc:cloud-brain-record-names-token-not-agent` 0.655 | the last two are why a run's agent, session and token can be read from the record (parts 2 and "What exists") |
| "overseer reflects on the record and edits briefs" | `doc:cloud-brain-texts-not-read-again-after-a-change` 0.931, `doc:cloud-brain-dev-philosophy` 0.608, `finding:2026-10-09:arxiv:2610.06406` "What Did the Agent Actually Do?" 0.5 | `philosophy.md`, read whole; the finding by title only |
| "reuse an existing role instead of making a new one" | seven papers on self-evolving agents, the first `arxiv:2603.18000` 0.907 | no; titles only |
| "incident review blameless postmortem learning" | `arxiv:2308.10144` "ExpeL: LLM Agents Are Experiential Learners" 0.608, surveys | no; titles only |
| "where a file is kept so a later agent finds it" | `finding:2026-10-11:knowledge-search:any-word-and-name` 0.648, `doc:cloud-brain-docs-summarised-for-search` 0.435 | the title line of part 4 is written for the search because of the first; title only |

**Outside.**

- Google, *Site Reliability Engineering*, chapter 15, "Postmortem Culture: Learning from Failure",
  https://sre.google/sre-book/postmortem-culture/ . Read through a fetch that answered questions of
  the page, not the page whole. Used: triggers are written down before the event, and beside them "any
  stakeholder may request a postmortem for an event" (part 1); a post mortem is reviewed, "An
  unreviewed postmortem might as well never have existed", and one of the review's questions is "Was
  the root cause sufficiently deep?" (part 6, question 2); it is kept in "a team or organization
  repository of past incidents" (part 3); it names causes and not people, on the reading that
  "everyone involved in an incident had good intentions and did the right thing with the information
  they had" (part 2, the cause).
- Zhang et al., "Which Agent Causes Task Failures and When? On Automated Failure Attribution of LLM
  Multi-Agent Systems", ICML 2025, https://arxiv.org/abs/2505.00212 . **Read only in a search's
  summary.** Used: the two figures under "What is not known".
- Cemri et al., "Why Do Multi-Agent LLM Systems Fail?", https://arxiv.org/abs/2503.13657 . **Read only
  in a search's summary**: a taxonomy of 14 failure modes in three groups (system design, inter-agent
  misalignment, task verification). Not used in the design: a post mortem here names one cause in the
  loop's own files, not a class.

## The fresh review before submitting

One agent with the file alone (`/review-notebook`), 2026-10-12, started after 21:32 CEST and 450 s long by its usage line, on commit
`f2512568` of the worktree: FIX, 10 findings (6 confirmed, 4 plausible). It had no token, so nothing
read from the tracker or the Brain was checked by it. Each, and what was done:

1. The overseer was given three jobs (declare, read the block, judge R8) and no task told it. **Taken:**
   it declares nothing and no line of its brief changes; the orchestrating session reads the block.
2. A put-back by the deployer was both a trigger and not one. **Taken:** it is not one.
3. "Nobody else declares" was followed by a third declarer. **Taken:** there are two.
4. Actions were filed before the review that judges the cause. **Taken:** they are written in the file,
   and filed after the `pass`; 3 over all rounds.
5. The R4 check searched in the post mortem's own words. **Taken:** a second row, in a design's words, with today's answer.
6. The fifth task would have held the project at `building`. **Taken:** it is no part; the session opens it at three.
7. A quick-win action would be linked `related` and not listed. **Taken:** the writer makes no action itself.
8. Steps 2, 3 and 11 of the brief were not assigned, and "the record of 9" read as a second file.
   **Taken:** part 2 names each step; no record file.
9. The prompt a run was given is not in the journal. **Taken:** said under "What exists" and in the trace.
10. Three inexact statements (the count of edits, the tool's expression for a name, the transcript's
    size). **Taken:** each reworded with what the review read.

Not run again after these: they rewrote parts 1, 5 and 7. The first post mortem landed after this
review and what the spec took from it (the top of this file) was read by no fresh agent.

## Comment 4523, which came while this was written

From the writer of the first post mortem (`impl-58df50`), 2026-10-12, read at 21:46 CEST after the
spec's first landing (`feb504b6`, attached as `…-r1.md`). Its points, and where each is answered:

- No doc points at the directory. Task 1 now adds the row.
- Its parts, as the example. They are the form (part 3).
- Why an agent chose is not kept; "a post mortem that needs the why has to ask the agent while it can
  still be sent a message, or the agent has to write the reason where it decides". The first is under
  "What was not chosen". The second is what its own action `spec-names-what-exists-of-the-job` asks of
  a spec, and this design adds nothing to it.
- What the owner was told in chat was not read. The same holds for every post mortem: a trace reads
  what a session quoted on the tracker. It is under "What is not known" of each file, by the form.
- The fix was not tried. So for each: "How it is known later" says what would show it.
- Of the implementer's brief, step 5 (reproduce) and the count did not fit. Part 2 replaces steps 5
  to 8, and part 6 gives the count: the test of the form, with a test of the file's quotes beside it
  when the writer makes one.

## What misled

- The issue's body says the first post mortem's file "is the example the spec is written from". The
  project was started (the owner's, so before a task) while that task had no writer, and the two were
  written side by side: the file came in at this spec's rebase under the landing lock, which was
  released with nothing pushed, and the spec was changed and landed at a second take. `SKILL.md`
  orders starts and has no "after".
- `bun test ./tests/tools/knowledge-docs.test.ts`, as `agents/implementer.md` gives the form for one
  file, printed 4 pass and 15 fail in a fresh worktree. With `--timeout=30000`, which `suite.sh` passes,
  19 pass. The brief gives the flag for the suite and not for one file.
- `agents/spec.md` step 5 says the reports are gathered as parts. A feature the owner opens has none,
  and the questions are in its body. The reviewer of `docs-summarised-for-search` took the body's
  "Not known" in their place (review 4341), and so does this spec; the brief does not say so.
