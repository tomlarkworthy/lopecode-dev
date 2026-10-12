# Post mortem: a running writer asked the orchestrating session for a go-ahead in a comment, nothing reads such a comment, and a billed Fly machine sat idle for 22 minutes (`pm-agent-request-not-seen-fly-idle`)

Of `fly-1-by-hand`, events 4816 to 4921. Declared 2026-10-12 by the owner (his words below, 22:45
CEST by the body) through a session outside the loop, which opened it at 22:46:14 (event 4944). Written that day by a writer of the loop, token `impl-480250`
(its `start`, event 4957), which had no part in it. Nothing was built and no brief was changed.

The owner (the issue's body):

> this seems like a fixable issue for a post mortem. Something is not working correctly about the loop / issue workflow and things important things are being dropped.

## What happened

The writer of `fly-1-by-hand` (`impl-ebb0f2`) had a Fly.io machine running and wrote comment 4816
at 22:21:06 CEST: "ready for the machine's pass", with what it needed of the orchestrating session
(one `orch` token and a go-ahead). The session (`orch-d97e0e`) answered at 22:43:04 (4921), after the
owner asked whether a machine was billed and unused (4916, 22:41:59). In those 22 minutes the
machine, `performance-2x` with 4096 MB, was `started` and idle: load average 0.15 at 22:41 (4916).

## The trace

Times are CEST. Events are of `fly-1-by-hand` (`issue-as.sh impl-480250 "get?id=fly-1-by-hand"`,
read 22:47). "Writer's transcript" is `subagents/agent-a8c19fa6dff9cbe14.jsonl` of session
`f501a8e8-b922-4e11-a581-2b725efd6272`, "session's transcript" is that session's own file, and "journal" is
`tools/cloud-brain/.emitted/issue-loop/_orchestrator.md`. All three are on one machine.

| When | Read from | What |
|---|---|---|
| 20:20:37 | writer's transcript, a `queued_command` | The session's message to the writer: before the pass on the machine "stop and wait for me"; post a comment with the key `impl/fly-1-by-hand/ready-for-machine-pass`, then run `get?id=fly-1-by-hand` "every 60 s until a comment with the key orch/fly-1-by-hand/clear-for-machine-pass is there. I post it when no other agent of the laptop's loop runs." |
| 20:20 | journal | The session's half: "EACH WAKE: read fly-1-by-hand for the first key; when it is there, start nothing new, and post the second when no other agent runs." |
| 21:06 | journal; writer's transcript | The writer is resumed by message, "As agreed before". The journal's line of this time: "it will post impl/fly-1-by-hand/ready-for-machine-pass and wait for orch/fly-1-by-hand/clear-for-machine-pass". "EACH WAKE" is not in it. |
| 21:07:04 | event 4405 | The writer's `start`: "then the comment ready-for-machine-pass and a wait for the orchestrating session". |
| 21:15 | journal | "Owner said: double pool size." Seven writers are started in that line. |
| 21:36:47 | comment 4816 | The machine is `started`. |
| 22:21:06 | event 4816 | The request. "It is running now and is billed". |
| 22:21:11 | writer's transcript | The writer polls as told, a read every 60 s: two commands of nine reads ("polls 9" at 22:30:16 and 22:39:26) and a third that ends at 22:43:36 with comment 4921. |
| 22:30 | journal | The line "STATE" names `fly-1 (a8c19fa6dff9cbe14)` among the writers and says nothing of a wait. |
| 22:39:01 | session's transcript | The watch ended at its 30 minutes and was armed again from 4901; a whole pass began. |
| 22:41:59 | event 4916 | The owner's question, written by `out-5f56b2`, with: "For the orchestrating session: answer comment 4816 now, or have the writer stop the machine". |
| 22:42:37 | session's transcript | The pass's own listing of the events since its last read prints 4916. |
| 22:42:42 | session's transcript | The session's first call that names `fly-1-by-hand` since 22:21:06: `get?id=fly-1-by-hand`, described "Read the Fly writer's comment that has been waiting for me". |
| 22:43:04 | event 4921 | "clear for the machine's pass. Late". A token is made for the pass. |

### What the session did in the 22 minutes

From its transcript, 22:21:06 to 22:43:10: 51 tool calls (41 `Bash`, 8 `Agent`, 1 `Monitor`, 1
`SendMessage`) and 29 task notifications, 13 of them lines of the watch and 16 the end of an agent
or of a background command. The watch printed neither 4816 nor 4916: no `<event>` line in that
window has either number. No call before 22:42:42
names `fly-1-by-hand`, and no tool result before 22:42:05 has the name.

### What each text says of such a request

Read at `lopecode-dev` `45687267`, the commit this was written from.

- **`tools/cloud-brain/issue-watch.sh`.** Its filter prints an event when
  `own or sent or (e["type"]=="opened" and (asked or …))`: `own` is `by.via == "session"`, and `sent`
  is the move `submit` or `submit-spec`. A comment by a token is none of them. The script at that
  commit, given 4816, 4916 and a `submit` as an answer of `sync`, prints the submit alone (the test).
  4916 is the owner's words, but `by.via` of an outside session's write is its delegation.
- **`SKILL.md`, step 8.** "A line is a wake: read that issue and take it from the table of step 3,
  without a whole pass. An agent's other writes print nothing; its report wakes you as before." And:
  "the watch prints only what you would act on". So of an agent's writes two wake the session: its
  report, which ends its run, and its submit.
- **`SKILL.md`, step 3.** Four rows are of an issue at `in-progress`: sent back with no agent
  running, a dead writer, a quick win sent back, a change landed with no submit. None is of an issue
  whose agent runs and asks. `issue.queue` (`plan/cloud-brain-bookkeeping-in-the-tracker.md`) puts
  such an issue in `waiting` with the `why` `work`: "an agent has it, or had".
- **`agents/implementer.md`.** A writer that cannot go on stops: a comment, `needs-owner` when it is
  the owner's, a report (steps 3 and 4; for a token that is not kept, "say so in a comment and in
  your report, with no label"). No line has a writer wait, while it runs, for the orchestrating
  session. The one wait of the brief is step 13, for its own review, with a tool and five runs.
- **The journal.** `SKILL.md` names it as what is appended "After each agent finishes" and says
  "neither of them needed to resume". No step reads `_orchestrator.md` at a wake.

So the two halves of 20:20 were made by one message and are in no text. The writer's half was a
loop in a shell and held for the 22 minutes. The session's half was a sentence it wrote to itself.

### How many requests of this kind the record has

To event 4957: 117 comments are by a token of one agent (`impl-`, `spec-`, `dig-`, `rev-`,
`appr-`). 6 of them are on an issue still at `in-progress` or `spec` under a key that is not the
`comment-<n>` before a submit (the script attached to this issue as `q4.py`, over `sync?after=0`).
Read one by one: 2927 and 4011 mend the writer's own comment, 3792 and 4818 come before its
submit, 4523 tells a spec writer a file has landed, and 4816 asks the orchestrating session for
something and waits. It is the one such request among those six.

## The root cause

A request from an agent that is still running to the orchestrating session has no form that a tool
or a table of the loop reads. The session made one up for this task in a message, a comment and a
poll, and its own half was a line of its notes, "EACH WAKE: read fly-1-by-hand", which no step
reads again and which its next summary of the same arrangement left out.

A request to the owner has a form: the label `needs-owner`, which step 3 reads "again each pass"
and the queue lists. A finished run has one (the report) and a change has one (the submit). The
existing way to ask without a new form was open and not taken: stop the machine, end the run with
a report, which wakes the session, and be resumed by message, as this writer was at 21:06.

Two things beside it. Each had to be so for the 22 minutes, and neither made the miss:

1. **The answer was tied to a condition with no time.** "I post it when no other agent of the
   laptop's loop runs" was written at 20:20, and from 21:15 the pool was doubled on the owner's
   word. The session of itself (comment 4949 of this issue): "that time was never coming, and I had
   not said so to the writer or to him". A request that had been read at 22:21 would have met this.
2. **Nothing said what the billed machine does while its writer waits.** The message of 20:20 does
   not name it. `rules.md` has the check for the end of a run ("Before finishing: … `browser.all`
   and `container.all` show nothing you started"), and none for a wait.

Weighed and not the root: "the session forgot". Comment 4949 says its note went through a
compaction "as one clause in a list of seven running writers". The journal had lost the instruction
at 21:06, an hour before, and a note the session kept whole would still be read only if it chose
to: the next session has the same `SKILL.md`. Also not the root: the watch. It drops an agent's
comment by design, because a wake costs a request of the session's whole context.

### The questions of the body

1. A comment and a report are a writer's only means, and the brief has no wait on the session.
2. `tracker-trigger-rules` as approved does not carry this. `issue-watch.sh` there "prints `WAKE <id> <when>`
   once for each due wait of its token": a writer's wait wakes the writer. `waiter` in the queue
   says that the starter listens, and nobody is told. A `when` reads the issue's state, labels,
   links and parts, and "no fact says that the owner has commented": a comment is not a
   condition. A label is one: the session's half could then be a wait on it.
3. A Fly machine is "billed by the second" while it runs (`plan/cloud-brain-worker-machine-on-fly.md`,
   the pricing row). No text read here stops one, or names it, when a wait passes some minutes.
   Whether a browser or a container of the cluster ran through a wait was not read: `browser.all`
   and `container.all` need a token this writer does not hold.
4. One, above.

## What is not known

- **Why the session did not read the issue between.** Its transcript has what it called, not why;
  comment 4949 is its own account and is quoted as that.
- **When the "EACH WAKE" clause left the session's context.** The journal's lines of 20:20 and
  21:06 are what the session wrote, not what it held.
- **Whether the session would have answered at 22:21 had it read 4816.** Its condition says no.
- **What the 22 minutes cost in money.** The price of `performance-2x` was not read; the spec's
  pricing row has `shared-cpu-2x` only.
- **The comments under `issues-implementer-2`** (851): sessions and writers both wrote with it
  until each agent had a token, so they were not classed.
- **What the owner was told in chat**, beyond what the sessions quoted on the tracker.
- **Whether the actions below would have caught it.** Not tried.
- The second promise of the same form stands: 4921, "I end it when you report, or 45 minutes from
  now", and the journal at 22:43, "REVOKE when the Fly writer reports or by 23:30". Not followed.

## What it cost

The machine: 22 minutes `started` and idle between 4816 and 4921. `fly-1-by-hand` has one `cost`
event, of round 1 (4261: 942 s); its second round has none until the writer reports. In the wait
the writer ran three commands of the poll. The owner asked once (4916) and
declared this. T1 came 22 minutes later to its pass, and the six tasks after it wait for T1.

## Next actions

Three, written here and filed when the review has passed (`plan/cloud-brain-post-mortems-declared-and-kept.md`,
part 5), each linked to this issue with the rel `cause`. None is done by this writer.

| Issue | What changes | The part of the trace it answers |
|---|---|---|
| `asks-orchestrator-label-and-watch` | An agent that needs something of the orchestrating session while it runs adds the label `asks-orchestrator` to its issue, with a comment whose first line is the ask. `issue-watch.sh` prints a `labelled` event that adds it, whatever token wrote it. `SKILL.md`: a row of step 3 above the `in-progress` rows (answer in that wake, and take the label off with the answer), the line in step 8, and `list?label=asks-orchestrator` in a whole pass. `agents/implementer.md`: the paragraph, with the first choice named: end the run with a report and be resumed. Tests of the line and of the texts. No deploy and no install: a label is a word, as `digest` is. | The root cause. |
| `wait-says-what-runs-and-until-when` | `agents/implementer.md`: before a wait for anyone, a writer stops what it started that is billed by the minute (a Fly machine, a browser or a container of the cluster), or writes in the request what runs, since when, and the time at which it stops it itself. `SKILL.md`: a message that asks an agent to wait names a time, not a condition of the pool. A test of both. | The two things beside the cause. |
| `watch-prints-an-outside-sessions-comment` | `issue-watch.sh` prints a comment written with an `out-` token: a session the owner is in, by the table of `rules.md`. Its test. | 4916, the owner's question, reached the session by a pass and not by the watch. |

`tr-2-issue-wait-over-wakes` changes `issue-watch.sh` and `bk-6-skill-watch-and-stats` rewrites step 3: the
first and the third say so in their bodies, and the order between them is the orchestrating session's.

Not filed, and why:

- **A row of `issue.queue` for an issue that asks.** A seed change, `major`, and the owner's
  approval, for what `list?label=` gives. It is wanted if `bk-6` makes the queue the only read of
  step 3: the label would then be under `work`, which is "nothing". Said in the first issue.
- **A promise of the session with a time** ("45 minutes from now"). `issue.hold` has a time, and its
  `look` is not made of an issue that `work` holds; a wait past its `until` is left out of every
  read. Neither carries it. Told to `tracker-trigger-rules` in a comment, for `tr-3`.
- **The watch prints every comment of an agent.** 117 such comments, each a wake of the whole context.

## How it is known later

A second case, in the record: a comment by a token of one agent on an issue it still holds, that
asks the orchestrating session for something, with no label `asks-orchestrator`, or with the label
and more than 5 minutes to the session's next event on that issue. `q4.py` lists the candidates (6
today, one of them a request); once the first issue has landed, each `labelled` event that adds the
label has its minutes to the event that takes it off. And anything billed by the minute that is
running while its issue has had no event for 10 minutes. Nothing here watches for either.
