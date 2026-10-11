# rework-resumes-the-implementer

The issue loop's orchestrator sends a rework round to the implementer that wrote the change, with
`SendMessage`, in place of a new agent. The owner, 2026-10-11: "resuming implementors is a good
idea, not always possible if they are done by different agents, but maybe we append session-id".
The numbers behind it are in the issue's body (10 of 36 issues with more than one implementer
round, 46% of 12.06 M tokens; they were not counted again here).

## Round 1, 2026-10-11

Written between 15:59:16 CEST (the `start`, event 868) and the landing. A change to the
procedure only: no seed, no deploy, no tool.

**No rework round has been run by a resumed implementer.** The issue's "done when" asks for
one; the move to `ready` (event 860) says the writer lands the procedure and the record names the
first resumed round when one has run. A section is added here then, with that round's count
beside the median of a new-agent rework round.

### What changed

- `.claude/skills/brain-maintenance/SKILL.md`, step 5: an implementer's `cost` comment has two
  more fields, `agent` (the `agentId` of the Agent result) and `session`, and a round that was
  sent and not spawned has `"resumed":true`.
- The same file, a new section "A rework round goes to the agent that wrote the change", which
  the `in-progress` row of step 3 names: read the last implementer `cost` comment; when it has an
  `agent` and its `session` is this session's, `SendMessage` to that id with the issue id and the
  seq of the `reviewed` event; anything else, spawn as before. The reviewer is never resumed.
- `.claude/skills/brain-maintenance/agents/implementer.md`: a section "A resumed round", and a
  line in step 1 that points at it.
- `tests/tools/rework-resumes-the-implementer.test.ts`: reads the two files.

### What was settled of the issue's "not known"

**How the orchestrator reads its own session id without the disk.** `echo $CLAUDE_CODE_SESSION_ID`
in Bash. Read in this agent (a subagent of the orchestrator, `CLAUDE_CODE_CHILD_SESSION=1`) at
15:59 CEST:

```
CLAUDE_CODE_SESSION_ID=f501a8e8-b922-4e11-a581-2b725efd6272
ls $CLAUDE_CONFIG_DIR/projects/-Users-tom-larkworthy-dev-lopecode-dev/$CLAUDE_CODE_SESSION_ID/subagents | wc -l   -> 102
  … agent-af49053b540d9c3f5.jsonl  agent-af49053b540d9c3f5.meta.json …
```

So the variable names the directory the agents' transcripts are under, which is the id the issue
asks for. It was read in a subagent's Bash, where it gave the parent's id. That the orchestrator's
own Bash gives the same value was not run: this agent is not the orchestrator.

**The agent is addressed by its raw id.** The Agent tool of this session has no `name` parameter
(its schema: `description`, `effort`, `isolation`, `model`, `prompt`, `subagent_type`). The
`SendMessage` tool's description says of `to`: "Use the raw `agentId` (format `a...-...`) from its
spawn result only when the agent has no name". The tool is deferred here: `ToolSearch` with
`select:SendMessage` loads it.

**Where the id is written.** In the `cost` comment, not in a comment at spawn. One write a run in
place of two, and the comment already exists. Against it: an agent that died before it reported
leaves no id unless the orchestrator still writes its `cost` line, which step 5 already asks
("A run that was stopped or died gets its comment too"). An id that is lost costs a spawn, which
is what happened before (`philosophy.md` line 2, the smaller side).

**What a resumed round's `tokens` means** is not settled. The issue's one observation (40,982
after the first turn, 41,056 after the second, an agent with no tool call) says the number holds
the earlier context. The procedure does not correct the number: the line carries what the run
reported and `"resumed":true`, and a reader takes off the `tokens` of the same agent's line before.
Whether that difference is what the round was charged is not known.

### What differs from the issue's text

The issue's point 4 has a resumed implementer "rebase its worktree". There is none: step 10 of the
brief removes the worktree and its branch at landing, before the review. The brief has the agent
make a new one (`worktree.sh <id>`), which is at `main` with the first round's change in it.

"Not trust what it read of files that may have changed" is given a command:
`git -C <root> diff --stat <sha of the submit's last commit ref> main` names the files changed
since, and the agent reads again the ones the round rests on. Run by this agent, not by a
resumed one, across the one commit that landed on `main` while this round was written
(`5d7eb7bf`, 2026-10-11 16:01:01 +0200):

```
git -C <root> diff --stat 5d7eb7bf~1 main
 .../skills/brain-maintenance/agents/implementer.md |  8 +++--
 .../records/dv-6-brief-step-8-runs-verify-run.md   | 35 ++++++++++++++++++++++
```

That is the case the line is for: a writer resumed after it would have step 8 of the brief in
its context as it was before `5d7eb7bf`.

### Tests

```
bun test ./tests/tools/rework-resumes-the-implementer.test.ts    in the worktree, 2026-10-11 16:01 CEST
  with SKILL.md and implementer.md as on main (git stash of the two)   0 pass, 5 fail
  with the change                                                      5 pass, 0 fail, 18 expect() calls
bun test ./tests/tools                                           135 pass, 0 fail, 16 files
```

The five read the docs: the `cost` examples of `SKILL.md` parse as JSON, each implementer's has
an `agent` and a `session` of the right form, one has `"resumed":true` with a round above 1; the
`in-progress` row names the resume; the section names `SendMessage`, `CLAUDE_CODE_SESSION_ID`
and the spawn; it says the reviewer is never resumed; the brief's section names the `reviewed`
event, `worktree.sh`, `rules.md` and the diff. They show the procedure is written, not that an
orchestrator follows it.

### Prior art

`knowledge.search?semantic=true` for "resume subagent SendMessage rework round" and "agent token
cost per issue context reuse" (before 15:59:16 CEST, the `date` of the command after them). The nearest entry to both was
`doc:effective-use-of-fable` (0.5 and 0.908); `grep -n -i "resum\|SendMessage"` on it finds
nothing. Nothing was used.

### Not tried

- A resume. This agent did not send a message to another: it would have been acting as the
  orchestrator. Everything below follows from that.
- A resumed agent that had used tools, one whose worktree was removed between its rounds, one
  resumed after the orchestrator's context was compacted, one after Claude Code was restarted.
- A refused send: what the tool answers for an agent the user stopped, or one of another session.
- The count a resumed run reports to the orchestrator, and whether it has `tools` and `seconds`.
- Whether a resumed writer passes its second review more often than a new one, and at what
  length of first round a new agent is cheaper. No threshold is in the procedure.
- `issue-stats.ts` does not read `cost` comments (`grep -n cost tools/cloud-brain/issue-stats.ts`
  finds nothing), so nothing there reads the new fields or `resumed`.
