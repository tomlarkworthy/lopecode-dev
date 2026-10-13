# pm-read-after-three: a read of the first three post mortems

Issue `pm-read-after-three`, a task the orchestrating session opened at event 5236 as "The read after three" of
`agents/orchestrator.md` has it. A read, no build. It asks four things of each of `pm-second-summarizer-role`,
`pm-approver-leaves-everything` and `pm-agent-request-not-seen-fly-idle`: was it sent back by its review and for
which of the four questions, what became of its actions, was it answered to a later search, and did the overseer
act on the block. It also answers the two items that "What is not known" of
`plan/cloud-brain-post-mortems-declared-and-kept.md` left to this read.

Read on 2026-10-13 between 21:12 and 21:19 CEST (`date`), from the tracker's events 4480 to 6991, the three files
of `tools/cloud-brain/post-mortems/`, `oversight.md` and four searches of the Brain. Writer: token `impl-5aa797`.

## What it found, short

| Asked | Found |
|---|---|
| Sent back by the review? | None of the three was sent back. One review each, a `pass`, 2.7 to 10.2 minutes after the submit. |
| The actions | 9 filed, 3 a post mortem, and 9 ended: 7 by a review's `pass`, 2 (`major`) by an `approve`. 2 had one round sent back. |
| Did an action change what it was for? | Measured for one: the approver gave 2 `approve` in 13 verdicts under the brief the post mortem read, and 11 in 21 under the briefs after it. Not measured for the other two post mortems. |
| Answered to a later search? | 9 of 100 issues whose writer named a search, outside the post mortems' own family, name a post mortem. 4 writers used one, 1 read one and changed nothing, 4 were answered one that did not bear on the work. |
| Did the overseer act on the block? | No. No entry of `oversight.md` has a line of the block. Since `overseer-runs-too-often` the overseer does not run the tool. |
| A brief at fault? | One line, with one case: the post mortem's page does not say to read the issue again before the submit. Filed as feedback `seen-pm-writer-reads-issue-once`, not as a task. |

## 1. The reviews

None of the three was sent back, so no question of the four failed one.

| Post mortem | Review | By which text | What the reviewer ran |
|---|---|---|---|
| `pm-second-summarizer-role` | `pass`, event 4541 | Before `pm-3-reviewer-brief`: the review has no four questions, and reads as one of any change | Each row of the trace against `get?id=` of two issues; the test with the file aside and with two statements altered |
| `pm-approver-leaves-everything` | `pass`, event 5052 | The four questions of the spec, part 6 ("The reviewer's brief has no part \"A post mortem\" yet") | A script over 955 events (4051 to 5005) that looks for each quote in its event; the eight verdicts whole |
| `pm-agent-request-not-seen-fly-idle` | `pass`, event 5045 | "A post mortem" of the reviewer's brief (`pm-3-reviewer-brief`) | Eight steps of the trace against the events, the journal and two transcripts |

So the part "A post mortem" of the reviewer's brief has been used once. Three passes at round 1 do not show
whether its questions catch a wrong cause: no post mortem with a wrong cause has been put to them.

**"Whether a writer reaches a cause that is not 'the agent erred'"** (the spec, "What is not known"). Each of
the three did. The first sentence under "## The root cause" of each file:

- `pm-second-summarizer-role.md`, line 107: "No text that a spec's writer or its reviewer follows asks, of a thing
  the design adds, what exists that does the same job and why that is not extended."
- `pm-approver-leaves-everything.md`, line 82: "The brief the approver follows has another test than the one he gave."
- `pm-agent-request-not-seen-fly-idle.md`, line 89: "A request from an agent that is still running to the
  orchestrating session has no form that a tool or a table of the loop reads."

Each names a text or a form, and each got three actions against it. Whether a cause is the right one is not
shown by this; the one measure of it is in part 2.

## 2. The actions

Nine, three a post mortem, which is the limit the brief gives. All nine are ended. The times are of the moves.

| Post mortem | Action | Ended | Rounds sent back |
|---|---|---|---|
| `pm-second-summarizer-role` | `spec-names-what-exists-of-the-job` | `pass`, 4728 | 0 |
| | `decision-comment-names-what-is-added` | `pass`, 5577 | 0 |
| | `philosophy-one-role-for-one-job` | `pass`, 4868 | 1 (4830) |
| `pm-approver-leaves-everything` | `approver-brief-his-test` (`major`) | `approve`, 5686 | 0 |
| | `approver-before-decision-comment` | `pass`, 5255 | 0 |
| | `approver-own-files-are-the-policy-cells` (`major`) | `approve`, 5687 | 1 (5470) |
| `pm-agent-request-not-seen-fly-idle` | `asks-orchestrator-label-and-watch` | `pass`, 5188 | 0 |
| | `wait-says-what-runs-and-until-when` | `pass`, 5292 | 0 |
| | `watch-prints-an-outside-sessions-comment` | `pass`, 5253 | 0 |

The first was ended 2026-10-12 22:08 CEST and the last, the two `approve` moves, 2026-10-13 05:43 CEST: the
`at` of events 4728 and 5686. The issue's body says "Six of the nine actions were opened the same evening and
none of those six is done"; a day later all are.

**What one action changed.** The cause of `pm-approver-leaves-everything` is the test of
`agents/approver.md`, and each verdict of an approver ends with the blob of the brief it read. The post mortem
read blob `9956b9aa`; `approver-brief-his-test` made `83032177` (commit `d2b0df6e`, 2026-10-13 01:12:26 +0200),
and two later changes made `0189a17f` and `fe5c1e7d`.

| Brief | Verdicts | `approve` | `leave` |
|---|---|---|---|
| `9956b9aa`, the one the post mortem read | 13 | 2 | 11 |
| `83032177` | 4 | 0 | 4 |
| `0189a17f` | 12 | 6 | 6 |
| `fe5c1e7d` | 5 | 5 | 0 |
| The three after it, together | 21 | 11 | 10 |

The share of `approve` rose from 2 of 13 to 11 of 21. This is two counts and not a trial: the issues that came to
the approver differ between the rows, two other changes to the brief lie between them (`policy-v5-names-the-approver-as-it-is`
and `approver-policy-mark-takes-every-route`, by `git log` of the brief), and the four verdicts under `83032177` are all `leave`. Why those four were left was not read.

**What the other two changed was not measured.** For `pm-agent-request-not-seen-fly-idle` the one count the
record gives is the label its first action made: `asks-orchestrator` was put twice. Once by the action's own
writer on its own issue (5125, taken off at 5126), and once by a writer at work, on `st-2-loop-start-and-end`
(5909), taken off 33 s later by the orchestrating session's token (5911). One use in the 1,803 events after
the action passed (5188 to 6991). For `pm-second-summarizer-role` no count was made: its actions are a line of
`agents/spec.md`, a question of the reviewer's brief and a clarification of `philosophy.md`, and what they
would change is a spec's "Not chosen", which this read did not read in the specs written since.

**Guard or sentence.** The owner's words of 2026-10-12 (comment 4980, "generally fixes are better as guards")
came after the first post mortem was written and while the other two were. The third writer sorted its three
after the pass (comment 5060). This read did not sort the nine.

## 3. Later searches

A post mortem's file is an entry `doc:pm-<short>` of the Brain's search. A writer's comment names what it
searched and what it used (`agents/implementer.md`, step 2).

Counted over events 4480 to 6991: comments by a token `impl-…` or `spec-…` that name a search, on issues that
are not of the post mortems' own family (the three, their nine actions, the project and its four tasks,
`post-mortem-actions-prefer-guards` and this issue, whose bodies send their writer to a post mortem). 100
issues have such a comment. 9 of them name a post mortem:

| Event | Issue | Post mortem | What the writer did with it |
|---|---|---|---|
| 4914 | `reviewer-q3-reads-what-exists` | second-summarizer | Used. First for "spec review question what exists today same job". The issue's own body names the post mortem. |
| 5258 | `fly-2-image-and-run-sh` | agent-request | Used: "the machine was stopped in the same command that started it, each time". |
| 5298 | `sd-2-one-summarizer` | second-summarizer | Answered first, 0.982. "Used: the spec, whole." |
| 5568 | `policy-v5-names-the-approver-as-it-is` | approver-leaves | Answered first of two searches. Not among what was used. |
| 5575 | `ap-5-panel-approved-for-you` | approver-leaves | "read; nothing of it changes the panel". |
| 5789 | `ap-6-rules-and-live-step` | approver-leaves | Used, "for the time of the install". |
| 5852 | `overseer-says-unanswered-without-a-read` | approver-leaves, agent-request | Answered to "overseer comment ask not answered by finished work". "Nothing bore on it; nothing was used." |
| 5879 | `sd-3b-first-paragraph-alone` | second-summarizer | Used, "why no second role". |
| 6816 | `rules-md-own-files-says-policy-cell` | approver-leaves | Answered first. "nothing was used but the spec's part 4". |

So: 4 used one, 1 read one and changed nothing, and 4 were answered one and did not use it. By its id, each
issue but 5852's is of the subject its post mortem is of (the summarizer and the review question it led to, the
approver and its policy, the Fly worker); their parents were not read. 5852 is the one on other ground, and
there the post mortems did not bear on the work: a cost to its reader, once in 100. So no case here is of a
post mortem that helped a writer whose work was not already beside it.

No count here is of a writer who was kept from the first post mortem's mistake by reading it. `sd-3b` is the
nearest: it gives the post mortem as the reason there is no second role.

**"Whether a post mortem is found by a search made in a later design's words"** (the spec, "What is not
known"). Four searches of mine, 2026-10-13 21:15:27 CEST, `knowledge.search?semantic=true` with the token
`loop-knowledge`, in words a designer might use and that are not the file's title:

| Query | First | Its score | Second |
|---|---|---|---|
| a design adds a new agent role beside an existing one with the same job | `doc:pm-second-summarizer-role` | 0.83 | `doc:preparing-a-good-claude-design-spec-handover`, 0.59 |
| the approver never approves and leaves every issue to the owner | `doc:pm-approver-leaves-everything` | 0.98 | `doc:cloud-brain-approver-persona`, 0.88 |
| a running writer needs a go-ahead from the orchestrator and waits while a machine is billed | `doc:pm-agent-request-not-seen-fly-idle` | 1 | `doc:cloud-brain-loop-order-of-service`, 0.56 |
| read after three post mortems what became of their actions | `doc:cloud-brain-post-mortems-declared-and-kept` | 0.96 | `doc:pm-second-summarizer-role`, 0.83 |

Each post mortem was first for the query of its own case. The queries are mine and I had read the files, so
they are nearer the files' words than a designer's who has not.

## 4. The overseer and the block

The block, `bun tools/cloud-brain/issue-stats.ts --token impl-5aa797`, 2026-10-13 21:13:50 CEST:

```
post mortems   3: 3 done, 0 not done
  pm-second-summarizer-role                done              of docs-summarised-for-search   actions: spec-names-what-exists-of-the-job done, decision-comment-names-what-is-added done, philosophy-one-role-for-one-job done   named again by: pm-approver-leaves-everything
  pm-approver-leaves-everything            done              of approver-persona   actions: approver-brief-his-test done, approver-before-decision-comment done, approver-own-files-are-the-policy-cells done   named again by: none
  pm-agent-request-not-seen-fly-idle       done              of fly-1-by-hand   actions: asks-orchestrator-label-and-watch done, wait-says-what-runs-and-until-when done, watch-prints-an-outside-sessions-comment done   named again by: none
  declared with no label `owner`: 0; the owner undid work that had passed a review: 1 (send-back 1 [4434], owner-reject after a pass 0, revert 0)
```

**The overseer did not act on it.** `pm-4-stats-block` was committed 2026-10-12 23:30:57 +0200. `oversight.md`
has ten entries of a window of events from the one headed 23:40 CEST that day to the one headed 2026-10-13
16:35 CEST, each with a line `Measured (issue-stats.ts …)`. No line of the file has the block's first line or
"named again by":

```
$ grep -c -E 'post mortems +[0-9]+:|named again by' .claude/skills/brain-maintenance/oversight.md
0
```

The entry of 23:40 names the post mortems in lines 831, 837 and 842, from the events of its window. Whether
that first entry's run of the tool had the block in it was not read.
The spec said why this might be so: "No line of its brief tells it to read it", and left it to this read to ask
for one, "with the cases".

**This read does not ask for one.** Since `overseer-runs-too-often` (commit of 2026-10-13 17:19:54 +0200) an
overseer reads one ended issue in 10 and does not run `issue-stats.ts` (`agents/overseer.md`, "What an oversight
no longer does"), and its brief has the owner's words of that day: a failure's cause up the chain "is a post
mortem, and the owner declares one". A line that sends the overseer to the block would be against both. The
block has a reader: `agents/orchestrator.md`, "Known later", and a judgment run read it at 21:10 CEST today
(the reason of move 6982 of this issue). Decided by line 5 of `philosophy.md`: a `major` change to the
overseer's brief for a reader the owner has since moved costs more than what it would mend.

**"Named again".** The block names `pm-second-summarizer-role` as named again by
`pm-approver-leaves-everything`. The second file, line 95, says what the link is: the first's second cause
("A reading the spec marked for the owner did not reach him") is the last step of the second's trace, and the
action for it "was filed at 21:25:46 (4499), after 4121 and after the brief landed … It could not have held
here." So it is one cause met twice before its action existed, and not an action that failed. Step 7 of
`SKILL.md` has the owner told of a post mortem named again; whether he was told is in no event and was not read.

**No post mortem since the three.** The block's last line: no session has declared one, and the one event of
the case a session declares for is the send-back 4434, which is what the first post mortem is of. The third was
opened at event 4944, 2026-10-12 22:46 CEST, and none in the 2,047 events after it to 6991.

## What is filed

- A comment on `post-mortems-declared-and-kept`, key `impl/pm-read-after-three/found`, with the table of
  "What it found, short".
- A feedback issue, `seen-pm-writer-reads-issue-once`, key `impl/pm-read-after-three/seen`. The page
  `agents/implementer/post-mortem.md` has no line to read the issue again before the submit. The third writer
  read its issue at 22:47 CEST, the owner's two comments on post mortems came at 22:57 and 22:59 (4981, 4985),
  and the file was submitted at 23:05 without them (its comment 5060, under "For the overseer"). One case in
  three, and what those two comments said is in the page since `post-mortem-actions-prefer-guards`. The issue
  asks for a task where a brief is at fault. It is filed as feedback and not as a task, by "one report is not
  built from" of `philosophy.md` (2026-10-11, gathering) and line 5: a round of a writer and a reviewer for one
  sentence with one case.
- No task for the overseer's brief (part 4).

## The counts

Every count above that is of the tracker is a line of `bun tests/tools/pm-read-after-three.ts`, which reads
`tests/tools/fixtures/pm-read-after-three.json`. The fixture was written by
`bun tests/tools/pm-read-after-three.ts --fetch --token impl-5aa797 --until 6991` at 21:18 CEST: the moves and
reviews of the twelve issues, the 34 verdicts with the blob each names, the events of the label, and the 118
comments of writers that name a search, each with the line that names a post mortem when it has one.
`tests/tools/pm-read-after-three.test.ts` computes them again and looks for each line here:

```
events 4480 to 6991
pm-second-summarizer-role: reviews pass@4541; rework moves 0; submit to pass 4.7 min
pm-approver-leaves-everything: reviews pass@5052; rework moves 0; submit to pass 10.2 min
pm-agent-request-not-seen-fly-idle: reviews pass@5045; rework moves 0; submit to pass 2.7 min
actions: 9, 9 ended by a pass or an approve, 2 with a rework
  spec-names-what-exists-of-the-job: last move pass@4728
  decision-comment-names-what-is-added: last move pass@5577
  philosophy-one-role-for-one-job: last move pass@4868, sent back at 4830
  approver-brief-his-test: last move approve@5686
  approver-before-decision-comment: last move pass@5255
  approver-own-files-are-the-policy-cells: last move approve@5687, sent back at 5470
  asks-orchestrator-label-and-watch: last move pass@5188
  wait-says-what-runs-and-until-when: last move pass@5292
  watch-prints-an-outside-sessions-comment: last move pass@5253
approver verdicts that name brief 9956b9aa: 13, 2 approve, 11 leave
approver verdicts that name a later brief: 21, 11 approve, 10 leave
  brief 9956b9aa: 13, 2 approve, 11 leave
  brief 83032177: 4, 0 approve, 4 leave
  brief 0189a17f: 12, 6 approve, 6 leave
  brief fe5c1e7d: 5, 5 approve, 0 leave
label asks-orchestrator: 2 put, on asks-orchestrator-label-and-watch, st-2-loop-start-and-end
  asks-orchestrator-label-and-watch: put@5125 by impl-0f0bf1, 2026-10-12T21:12:38.958Z
  asks-orchestrator-label-and-watch: removed@5126 by impl-0f0bf1, 2026-10-12T21:12:39.865Z
  st-2-loop-start-and-end: put@5909 by impl-357b9d, 2026-10-13T04:53:54.638Z
  st-2-loop-start-and-end: removed@5911 by orch-d97e0e, 2026-10-13T04:54:27.590Z
issues outside the family with a writer's comment that names a search: 100; of them name a post mortem: 9
  pm-second-summarizer-role: 3 (reviewer-q3-reads-what-exists, sd-2-one-summarizer, sd-3b-first-paragraph-alone)
  pm-approver-leaves-everything: 5 (policy-v5-names-the-approver-as-it-is, ap-5-panel-approved-for-you, ap-6-rules-and-live-step, overseer-says-unanswered-without-a-read, rules-md-own-files-says-policy-cell)
  pm-agent-request-not-seen-fly-idle: 2 (fly-2-image-and-run-sh, overseer-says-unanswered-without-a-read)
```

`bun test --timeout=30000 ./tests/tools/pm-read-after-three.test.ts`: 6 pass, 0 fail, 61 expect() calls. With this file moved aside: 2 pass, 4 fail (the two that pass read the fixture alone).

The blobs of the brief are `git rev-parse --short=8 <commit>:.claude/skills/brain-maintenance/agents/approver.md`
for each commit of `git log -- <that path>`. The count of ten entries is
`awk '/^## 2026-10-12 23:40/{f=1} f && /^## 2026-10-1[23] .*, events /{n++} END{print n}'` over `oversight.md`.

## Not tried

- **The owner's side.** Whether the owner read a file, whether he was told of each at `done` and of the one
  named again (step 7 of `SKILL.md`), and whether a post mortem changed what he asks. None is an event.
- **Whether a cause was right.** Three passes say each trace matches its sources. Only the approver's verdicts
  were counted as an effect, and they are not a trial (part 2).
- **The specs written since the first post mortem** were not read for a "what exists of the same job" line, so
  the three actions of `pm-second-summarizer-role` have no measure here.
- **Why the four verdicts under `83032177` were `leave`**, and what the orchestrating session answered to the
  label on `st-2-loop-start-and-end`.
- **A search by words** (`semantic=true` left off) and a query written by someone who had not read the files.
- **The 91 issues whose writers named a search and no post mortem** were not read for one that should have
  been answered a post mortem and was not.
- **The guard-or-sentence sort** of the nine actions.
- The script's `--fetch` was run against cb4 only. A comment that names a post mortem with no word of a search
  in it is not counted, and neither is a reviewer's.
