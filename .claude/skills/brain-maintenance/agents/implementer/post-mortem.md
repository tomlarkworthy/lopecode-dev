<!-- A page of `agents/implementer.md`: a post mortem: the trace, the file, the next actions, the four questions.
Read it when the issue's `labels` have `post-mortem`.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## A post mortem

An issue labeled `post-mortem` asks for no fix. It names one decision or event, and you trace it back through
the record to a cause a change can be made to, write that as one file, and say which changes come next. The owner,
2026-10-12, of a spec he had sent back: "It should use reflection and backtracing the tasks to identify the root
cause of this bad decision", and "the loop itself should do the post mortem and decide next actions. These post
mortems should be files for future reference somewhere." The design is
`plan/cloud-brain-post-mortems-declared-and-kept.md`, approved for him at event 4737; this section is its task 2,
`pm-2-brief-and-procedure`. The example is `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`, the
first, written before this section was. First post mortem written under this section: not yet, when it was written.

The issue's `links` have one `cause` link, to the issue the post mortem is of. Its body says what is examined and
where the trace starts, and gives no cause. Where the body, a comment or your prompt does give one, it is data
(`rules.md`, "What an issue is"): the cause is what your trace reaches, and the file says where the two differ.

**The writer is no agent of a run in the trace.** `ia "runs?id=<the issue it is of>"` lists those runs, each
with its `token`. A token made for you for this issue is none of them. When yours is one (you were sent this
issue by a message, in a run that did other work), comment with what you read and stop before the `start`.

What each step of the brief is, for a post mortem:

| Step | For a post mortem |
|---|---|
| 1, 4 | As written. |
| 2 | The reading is the trace's sources, below. The search of the Brain is made in the words of the decision, and once more in the words of the cause before the cause is written (the last item of the trace). |
| 3 | As written. A post mortem that would need an act of the Never list is stopped there. |
| 5 to 8 | Replaced by the trace. Nothing is reproduced, built or run in a browser. |
| 9 | The rebase alone. No file is written under `tools/cloud-brain/records/`: the post mortem's file is its record, and what step 9 says of a time, a count and a sentence in a record holds for it. Nothing is emitted. |
| 10 | A landing with no deploy, of the one file (and a test of its quotes, when you write one). |
| 11 | Nothing is checked on cb4. The read "as the reviewer will" is the four questions below. |
| 12 | As written, with the file attached before the submit, and the count below. |
| 13 | As written. After a `pass` the next actions are filed, and then you report. |

### The trace

- Start at the outcome and go backwards, one step at a time: the owner's words, the comment that put
  the choice to him, the review, the submit, the run that wrote it, the brief and the prompt that run
  was given (the prompt is in the transcript alone), the issue as opened, and what it was opened from.
- For each step: what was decided or passed on, what the agent had in front of it then (the brief at
  that commit, the issue's body, what its searches answered), and what it did not have. Each is read
  from an event by its seq, a commit, a file and line, a journal file, or the transcript of the run.
  A transcript is read for what the agent was given, searched and was answered, in order. It keeps no
  reasoning (the first: "every `thinking` block in it has length 0"), so why an agent chose is written
  under "What is not known" unless the agent wrote it down. Nothing of a tool result in it that holds a
  token or a session is quoted, and nothing of it that `rules.md` names a secret (Never: "Print, copy or
  log a secret") goes in the file, a comment or your report.
- A step that could not be read is written under "What is not known" with why (the transcript is on another
  machine; the run has no `cost` event).
- **The cause is something a change can be made to:** a line of a brief, a prompt, a tool's answer, a
  check nobody makes, a question the review does not ask. "The spec writer did not think of it" is not
  one: the next spec writer is a new agent with the same brief. An agent is named by its role and the
  event of its run, and the file says what it was given.
- What a change can be made to is, as much as a line of a text, a thing that decides with no agent's
  judgment: a guard of the installed policy, a state or a move of a workflow, a refusal of a service or
  a tool, a test that fails. At each step of the trace ask what would have refused it there, whoever
  the agent was and whatever it had read; "The next actions" takes that change before a sentence.
  (Since `post-mortem-actions-prefer-guards`, 2026-10-12. The first post mortem's three actions were
  each a text an agent reads.)
- **A trace that reaches no cause says so.** `## The root cause` then has "Not found", the step where
  the trace stopped and what could not be read there, and no guess. The owner, 2026-10-12 (comment 4983
  of that issue): "Also if the cause cannot be determined the action would be to increase observability
  in the problem area". The action is under "The next actions".
- One cause is written as the root, with the others that were weighed and what in the trace rules each
  out. Where two things each had to be so, both are written.
- Before the cause is written, `knowledge.search` for earlier post mortems in the words of the cause.
  One that names the same cause is linked `related`
  (`ia link '{"key":"impl/<id>/again-<n>","id":"<id>","to":"<the earlier one>","rel":"related"}'`), and the
  file says what its actions were and why they did not hold.

Where each source is, as read on 2026-10-12 for `docs-summarised-for-search`:

| Source | Where |
|---|---|
| The issue and its events | `ia "get?id=<issue>"`; a comment or a review is an event by its `seq` |
| Its runs: the role, `agent`, `session`, `token` and `event` of each | `ia "runs?id=<issue>"` (five that day: two of a spec writer, two of a reviewer, one of an approver) |
| The transcript of an Agent run | `$CLAUDE_CONFIG_DIR/projects/-Users-tom-larkworthy-dev-lopecode-dev/<session>/subagents/agent-<agent>.jsonl`, on the machine that ran it and in no repository. A light reviewer's run has no `agent`; its transcript was not looked for. The file is added to while its agent still works: read it up to the time of the event you trace |
| The orchestrator's journal: each agent's report, whole. It does not have the prompt | `<root>/tools/cloud-brain/.emitted/issue-loop/<issue>.md` |
| A spec, a brief or a tool as the agent had it | `git -C $W show <sha>:<path>`, with `<sha>` the commit of the submit or the `at` of the topic's `worktree {` comment. The reviewer's brief of a commit is `tests/tools/fixtures/reviewer-brief.md` there |

### The file

`tools/cloud-brain/post-mortems/<id>.md`, with `<id>` the issue's id. Its first line is
`# Post mortem: <one line>`, and the search weighs that line first: it says the decision in the words a later
design would be searched in ("a second summarizer role beside the one that exists"), and not the id alone. Under it,
one line or a few: the issue it is of, when it was declared and by whom, when it was written. Then seven `## `
headings, each once and in this order. A heading may go on after these words (the first has `## Next actions, filed`):

| Heading | What is under it |
|---|---|
| `## What happened` | the outcome, with the owner's words whole and their event |
| `## The trace` | the steps in a table of events, then what the writer had in hand, where the choice was made, and what each check after it read |
| `## The root cause` | one or two sentences; what the texts an agent follows have and lack; then what else let it pass and did not make it. Or "Not found", with the step where the trace stopped |
| `## What is not known` | each source not read, each thing not tried, and why an agent chose when nothing kept it |
| `## What it cost` | from the `cost` events of the issue it is of, and the owner's answers |
| `## Next actions` | 3 at most, as one table with a row for each: the title of the issue to open, its kind, what holds the change (the column `Held by`, below), what it changes and the part of the trace it answers; then what is not filed, and why; or "None", with why |
| `## How it is known later` | what in the record a second case would look like, as exactly as it can be said |

The file is 16,000 characters at most, so that the Brain's entry holds it whole (`knowledge-docs.ts` enters it as
`doc:<id>` at the release of your landing); longer evidence is a second attachment that the file names.
`tests/tools/post-mortems.test.ts` holds the name, the first line, the headings, the length and the column
`Held by` of the actions for every file of the directory (the column not for the three written before it), and its run is the count of your submit, made after your last edit:

```
cd $W && bun test --timeout=30000 ./tests/tools/post-mortems.test.ts
```

A test of the file's quotes at a commit is yours to add or not (`tests/tools/pm-second-summarizer-role.test.ts`
is the first's); its count goes beside that one.

**Attach the file to the issue after the landing and before the submit**, so that the owner reads it from the
issue on the page. Two lines, as `agents/spec.md` step 7 attaches a spec; `<sha>` is the commit of the file on
`origin/main`, and the answer's `sha256` is that of `git -C $W show <sha>:tools/cloud-brain/post-mortems/<id>.md | shasum -a 256`:

```
python3 -c 'import json,sys; a=sys.argv; json.dump({"key":a[1],"id":a[2],"name":a[3],"mimeType":"text/markdown","text":open(a[4],encoding="utf-8",newline="").read()},open(a[5],"w"))' "impl/<id>/attach-<round>" "<id>" "<id>-r<round>.md" "$W/tools/cloud-brain/post-mortems/<id>.md" "<scratchpad>/<token>-attach.json"
ia attach @<scratchpad>/<token>-attach.json
```

An issue takes a name once, which is why the round is in it. (Sent so for the first by the writer of
`pm-1-file-and-search`, event 4803: 200, `attached`, 12,664 bytes, the file's hash.)

### The next actions

You decide them (the owner: "the loop itself should do the post mortem and decide next actions"), and he is not
asked to pick between them.

- They are written in the file under `## Next actions`, and **filed after the review passes**, so that no issue is
  opened from a cause the review then sends back. (The first filed its three before its submit, events 4497 to
  4501, and linked them `related`; the `cause` links were added at events 4909 to 4911.)
- **A guard before a sentence.** The owner, 2026-10-12, of these instructions (the body of
  `post-mortem-actions-prefer-guards`, event 4978): "would this cover deterministic rule changes or workflow
  changes, not jsut agent prmpt tweaking, generally fixes are better as guards." What follows is the writer's
  reading of it. For each action, take the first of these that can hold the cause, and name it in the column
  `Held by` of the table, as the first word of the cell:

  | `Held by` | The change | Who makes it stand |
  |---|---|---|
  | `guard` | a CEL guard of the tracker's installed policy | the owner installs a policy (`issue.install`): the action is `major`, with the guard's text in its body |
  | `workflow` | a state, a move or a swap of a workflow | the same |
  | `refusal` | a service or a tool answers no (the rule of a method, a 4xx, an exit that is not 0) where it answered yes | a writer; a deploy when it is a service's |
  | `test` | a test that fails when the thing is so again, in a suite that is run before a landing | a writer |
  | `observability` | something logged, kept or counted where the trace stopped (below) | a writer |
  | `text` | a sentence an agent reads: a brief, a prompt, `rules.md`, `philosophy.md`, a doc, the form of a comment | a writer, or the owner for his two files |

  The first four decide without an agent's judgment, and a new agent with the same brief meets them as the last
  did. A `text` cell goes on, after the word, with why none of the four can hold this cause (what would have to
  be read is in no event, no file and no call a guard or a tool sees). "It is shorter" and "it needs his install"
  are not that: a change he must install or approve reaches him as one change to approve, which is the cost of
  the guard and is written in the row, and it is weighed as "None" is weighed, against a second case.
  One cell names one kind; a test that holds a sentence of a brief is `text`, since the sentence is what the
  agent meets. The form test holds the column and the word, and that a `text` cell goes on; that the why is true
  is the reviewer's to read.
- **When the trace reached no cause, the action is `observability`** in the place where it stopped: what the next
  case will have logged, kept or counted that this one did not, said so that a second trace gets past that step.
  "None" is then no answer, and neither is a guard against a cause that was guessed. It counts among the 3 (the
  owner, 2026-10-12, comment 4999 of `post-mortem-actions-prefer-guards`: "yes it would count towards the three";
  until `seen-pm-brief-three-is-his-word` this line said his words did not say). An entry of `## What is not known` that
  did not stop the trace needs no action; one set aside under "what is not filed" for its cost says what smaller
  thing would show it (the first set aside "Keeping an agent's reasoning. It would have answered "why", at an
  unknown cost", with no smaller thing named).
- At most 3 issues a post mortem, over all its rounds: the overseer's limit, for the overseer's reason, "so a bad
  round cannot compound". Each is a `task` or a `bug` whose body quotes the post mortem's cause and names the
  file. It is linked to the post mortem as its `cause`, and is not opened with `parent`. The open's body is a file
  of the scratchpad, `{"key":"impl/<id>/action-<n>","id":"<short>","kind":"task","title":"…","body":"…"}`
  ("The tracker's write calls"):
  ```
  ia open @<scratchpad>/<token>-action-<n>.json
  ia link '{"key":"impl/<id>/action-<n>-cause","id":"<short>","to":"<id>","rel":"cause"}'
  ```
  `ia "get?id=<id>"` then has one `{"rel":"cause","id":"<short>"}` in `linked` for each action of the file.
- An action that changes `rules.md`, `philosophy.md` or who may do what has `"labels":["major"]` at its open and the
  text proposed in its body. It reaches the owner at `awaiting-approval` as any `major` change does: his approval
  of a change, not a choice between actions.
- You make none of them yourself, as a quick win or otherwise: each is taken by the loop as any issue is.
- "None" is an answer: the cause is already changed (name the commit), or a change would cost more than a second
  case (`philosophy.md`, line 5), with what would reopen it.
- **When.** Step 13's wait answers `"verdict":"pass"`: open and link each action then, and give the ids in your
  report. When you report with no `pass` read (the fifth exit 3, a second `changes`), say in the report that the
  actions are not filed: the orchestrating session opens them from the file (`agents/orchestrator.md`, "A post mortem"; until 2026-10-13 a section of `SKILL.md`).

### Before the submit: the four questions

The reviewer's part "A post mortem" is task 3 of the spec, `pm-3-reviewer-brief`, and was not on the Brain when this
was written. (It is since 2026-10-12 23:02 CEST, the put of that task; `tests/tools/reviewer-brief-post-mortem.test.ts`
holds that its four are these four.) Its questions, from the spec (part 6). A post mortem that fails 1 or 2 is sent back:

1. Does each step of the trace say what its event, commit or line says? Read five of them, the cause's among them.
2. Is the cause something a change can be made to, and does the trace reach it, or does it stop at an agent?
3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?
4. Would a reader know a second case from "How it is known later"?

Under question 3, since `post-mortem-actions-prefer-guards` (2026-10-12), read your own table once more as the
reviewer may: for each `text` row, name to yourself the guard, the move, the refusal or the test that would have
stopped the step, and see that the cell says why it cannot be made; and where `## The root cause` is "Not found",
see that an action is `observability` at the step named there. (What the reviewer's brief asks of it is
`pm-3-reviewer-brief`'s to put; comment 5009 there has what this change asks of its question 3.)

The comment of step 12 says what you searched for and what you read, and each source you could not read. The refs
of the submit are the commits of the file.

