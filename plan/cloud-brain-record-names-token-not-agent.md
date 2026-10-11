# Cloud Brain: the record names the agent that made a call

Spec of the project `record-names-token-not-agent` on cb4's tracker. Written 2026-10-11 from
18:08 CEST (event 1156's `at`; the file's first commit is 18:17) from `lopecode-dev` `870cd992` and the tracker
at event 1158. Nothing here is built. Every count under "What exists today" was made that evening
from `issue.sync?after=0`, read with `issues-implementer-2` (1158 events), unless it names another source.

## What was asked

The owner has not spoken of this project. The overseer opened it at event 1126 from three reports,
under his word of 2026-10-11 that reports sharing a cause are gathered (`philosophy.md`,
Clarifications: "something consolodating isolated issues into one larger set of gather
requirements").

One thing he did say bears on it. Tom, 2026-10-10, event 150 on `owner-session-file-is-present`,
written in the page, whole:

> yes external agents should prefer to us a token over masquerading as the owner. They can obtain a token using owner if they don;t have other options

So an agent that has no token may get one with the owner's session, and the session file stays
his key. This spec builds on both and changes neither.

The project's body lists three things as not known. This spec takes a side on each, by line 2 of
the philosophy, and his approval of the spec is where he rejects one:

| Not known | Taken here |
|---|---|
| Agents told apart in the record, or only roles | Agents, with the role in the token's name |
| What a read with the wrong token costs | Nothing that was measured; see "What is not checked" |
| A session outside the loop has a token of its own | Yes, made the same way as an agent's |

## The reports gathered

`list?parent=record-names-token-not-agent` answers three parts.

| Report | Becomes |
|---|---|
| `seen-outside-session-overseer-token` (952, comment 1127): a session outside the loop wrote 10 events with `issues-overseer-1`, among them a review and a move the overseer's brief forbids the overseer | R1, R3 |
| `seen-writer-read-with-reviewer-token` (1089): a writer read the tracker with `issues-reviewer-2` by mistake; known from its own comment 1027 only | R2, R4. That a read leaves a trace is left out: "What is not checked" |
| `seen-by-hides-session-file-write` (641): an event written with the owner's session file has the same `by` as his press in the panel | R5. Telling the two apart in `by` is left out: "Not chosen", 4 |
| The project's body: `loop-roles` "is not held to its paths, so this is an agreement" (`rules.md`); any token of the loop can take the label `annotation` off (review 908) | Left out. Both are about what a token may do, not about who the record names. Each is a guard or a scope and can be filed alone |

The requirements:

- **R1.** An event written by an agent of the loop, by the orchestrating session or by a session
  outside the loop has a `by.holder` that no other agent or session writes with.
- **R2.** A tracker call with a token whose agent has finished is refused by cb4.
- **R3.** The role of the agent is read from the event, without the journal.
- **R4.** An agent is given one token name. No brief, doc or tool names a token shared by a role.
- **R5.** An `approve` made for the owner with his session file is counted apart from one he
  pressed, by a tool the loop runs.
- **R6.** What the loop does today still works: a rework round, a writer that died, the stats.

## What exists today

**An event's `by` is four fields the core sends, and nothing else about the caller reaches the
tracker.** `brain-issues.ojs` line 74: `by, origin { caller, via, holder, tab } as the core named
them on this call`. Event 1156, this spec's own first move:

```
"by":{"caller":"owner","via":"delegation:b6559fa96c36","holder":"secret:issues-implementer-2","tab":false}
```

A guard's `caller.actor` is the `via` (`issueActor`, line 324): one token is one actor. The default
policy keeps a writer from its own review with `caller.actor != issue.by.start`, and lets only the
starter submit with `caller.actor == issue.by.start` (lines 195, 215).

**Three tokens wrote 1047 of the 1158 events.**

```
699  secret:issues-implementer-2   delegation:b6559fa96c36
224  secret:issues-reviewer-2      delegation:84cd2100b161
124  secret:issues-overseer-1      delegation:0bec7b18e909
 78  owner, via session, tab true
 33  others (a sign-in link's token 15, hidden to my token 9, earlier tokens 6, Workers 3)
```

**The implementer token is at least three kinds of caller.** Of its 699 events, 227 have a key that
starts `orch`, 80 `triage`, 177 `impl`, 17 `spec`; all 148 `cost` comments are written with it, as
`SKILL.md` line 123 tells the orchestrator ("with the token you triage with"). So the orchestrating
session, each writer and each spec writer are one actor. 18 `cost` lines carry an `agent` id, 12 distinct, all of one session; 27 carry a `session`, 10
distinct. The other 130 lines name no agent.

**The overseer token is two.** 10 of its events are a session's outside the loop: 857, 905, 913,
1008, 1009, 1029, 1030, 1031, 1068, 1069 (the report and its comment 1127). `issue-stats.ts` at
event 1156 printed `"issues-overseer-1":32` under `openers`; the report says two of those are not
the overseer's.

**Every role's token is in one file any process of this user reads.**

```
-rw-r--r--  cb4-issues-tokens.json   keys: issues-implementer-2, issues-overseer-1, issues-reviewer-2
-rw-------  cb4-tokens.json          keys: loop-bluesky, loop-deploys, loop-knowledge, loop-library, loop-roles
```

`issue-as.sh <token name> …` takes the name as its first argument from any caller. The names are
written in 9 files of briefs, docs and tools (`grep -l` for the three names, 22 lines), and in the
body of reports: two of the three parts of this project quote a command with `issues-reviewer-2` in it.
That is the likeliest way a writer came to run one (not verified: comment 1027 says "by my mistake" and no more).

**The session file cannot be told from the owner's tab, by anything a Worker could be changed to
check.** `brain.ts session` (lines 320 to 327) does not ask cb4 for a session: it signs one itself,
with the kernel's session key, which is in `.emitted/cb4.json`. Whatever mark a kernel put in a
session made by sign-in, the file could sign the same. 78 events are `via session`:

```
28  key policy/…           27 swaps of a migration, and policy event 12
28  key a UUID             the panel
 5  key orch/<id>/approve-for-owner-1   events 577, 649, 650, 651, 675
17  other keys             9 tests, 2 installs, 3 annotations, 3 of one review's fixes
```

Of 10 `approve` moves by the session, 5 have a UUID key (26, 681, 946, 1026, 1071) and 5 the
`orch/` key. The key is the only difference, and it is written by the session that made the move.

**A token made under a token is already built.** `plan/cloud-brain-authority.md`, "A delegation made
under a delegation", step 7 of 7, deployed to cb4 2026-10-10 13:00: a token with the cap `delegate`
calls `delegation.create`, `list` and `revoke`; a child's scope is inside the parent's, it has no
caps (so it makes no child), its `until` is no later than the parent's, and revoking the parent
ends it (`brain-core.ojs` lines 411 to 419 and 996 to 1030). The child's call arrives with its own
`via` and `holder: "secret:<its name>"`. Not tried on cb4 by me: I hold no token with the cap, and
making one is the owner's.

**What has no tool yet.** The kernel's `token.create` takes `{ name, methods, daily }` and no caps
(`brain-kernel.ojs` line 470), and gives no `until`. `brain.ts token` calls it. So a parent with
`delegate` is made by `delegation.create` with the owner's session, whose answer holds the secret;
`brain.ts` has no command that keeps that secret without printing it.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`, 2026-10-11 18:10):

| Searched | Found | Used |
|---|---|---|
| "which agent made a call token identity audit record" | `doc:cloud-brain-authority` 0.745, `doc:calling-a-cloud-brain-from-this-checkout` 0.717, `arxiv:2610.06406` "What Did the Agent Actually Do?" 0.5 | The first two, read in the checkout. The paper: title and digest entry only, not read, not used |
| "per-agent credentials short-lived token separation of duties" | `arxiv:2610.12242` TokenRouter 0.643, `module:tomlarkworthy:cw-share-auth` 0.577 | Neither: the first is about model routing by its title, the second a dashboard's login |
| "delegation made under a delegation child token" | `doc:cloud-brain-authority` 1.0 | The design's mechanism |
| "owner session file present approve" | `module:tomlarkworthy:brain-secrets` 0.788, `doc:cloud-brain-authority` 0.731 | Nothing new |

Outside, two pages, both read whole as fetched:

- AWS IAM User Guide, "Monitor and control actions taken with assumed roles"
  (`docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_monitor.html`). A
  role is what may be done; the session that assumes it carries a name for who: "Role session name
  can be used to differentiate role sessions when a role is used by different principals", and it
  is in every logged event (`assumed-role/DevRole/Dev1`). Used: the shape of R1 and R3, a role
  with a name for each use of it, both in the event. It also says of the stronger form, source
  identity: "AWS doesn't control the value … you must ensure that you can control how those values
  are provided." Used: the name is set by whoever starts the agent, not by the agent.
- NIST glossary, "separation of duty", from SP 800-192
  (`csrc.nist.gov/glossary/term/separation_of_duty`): it is enforced "statically (by defining
  conflicting roles …) or dynamically (by enforcing the control at access time)", and of the
  two-person rule "the second user can be any authorized user different from the first". The
  tracker's guard is the dynamic kind and stays as it is. Not read: Sandhu and Samarati 1994, which
  the glossary cites.
- UCAN 1.0.0, the attenuation rule, is cited by `plan/cloud-brain-authority.md` and was not read again.

## The design

**One token for each agent and each session, made by whoever starts it, as a child of one parent
token the owner makes once.**

```
loop-agents                      parent; scope issue.*; cap delegate; made by the owner, once
  ├─ orch-7c1e04                 an orchestrating session, made when it starts
  ├─ impl-3fa2c1                 a writer, made by the orchestrator before the spawn
  ├─ rev-90b7d2                  a reviewer
  ├─ spec-51aa0e, over-…, dig-…  the other roles
  └─ out-e4410b                  a session outside the loop, made by itself
```

- **The name** is `<role>-<6 hex>`, where the role is one of `orch`, `impl`, `rev`, `spec`, `over`,
  `dig`, `out`. It is what `by.holder` shows (R1, R3). The 6 hex are random; the `cost` comment
  gains a field `"token"` beside `agent` and `session`, which joins the name to a transcript.
- **Made by** a new command, `brain.ts agent-token <role>`: `delegation.create` with the parent's
  secret, scope `issue.*`, `until` 48 hours on, `note` the role. 48 is a choice: the longest stay
  measured in a state an agent waits through is 2.6 h (`awaiting-approval`; `in-review` 2.1 h,
  `spec-review` 0.8 h; `issue-stats.ts` at event 1156), and in-progress has stayed 15.2 h. A token
  that ends while its issue is still out is the dead writer's case of the table below. The core
  drops a maker's ended tokens when it next makes one (`brain-core.ojs` line 1023). It writes the child's secret to
  `.emitted/<base>-agent-tokens.json` (mode 600) and prints the name only. `agent-token revoke
  NAME` ends one. `issue-as.sh` reads that file after the one it reads now.
- **Given to the agent** as a name in its prompt: "your token is `impl-3fa2c1`". The briefs say
  "the token your prompt names" where they now say `issues-implementer-2` (R4). The reviewer
  started with `agent.sh` gets it in the task text.
- **Ended** by the orchestrator when it writes the run's `cost` comment, unless the outcome is
  `in-review`: a writer may be resumed for a rework round and only the starter submits, so its
  token is ended when the issue leaves `in-review` for good (`pass`, `to-approval`). 48 hours ends
  what was forgotten. After that a command copied from an old event answers 401 (R2).
- **The three role tokens** are revoked by the owner once the first round has run on the new ones.
  From then every command quoted in the 1158 events with one of those names is refused.
- **The approve made for the owner** keeps its key, `orch/<id>/approve-for-owner-<n>`.
  `issue-stats.ts` gains a line that counts `approve` moves `via session` by key: pressed (a UUID)
  and made for him (R5).

What changes for the loop, and how it goes on (R6):

| Today | With a token an agent |
|---|---|
| A rework round goes to the writer by message | The same; its token is still live |
| A writer died: a new one is spawned and submits, being the same actor | The orchestrator moves the issue `back` to `ready` (guard: a reason) and the new writer starts. For a project: `back` from `spec` to `open`. One more move |
| `SKILL.md` step 3 reads "started by the implementer token" | It reads the start event's `by.holder`: the prefix is the role |
| `issue-stats.ts` `openers` counts by token name | It counts by the prefix, and prints the names under each |
| The overseer's limit of 3 filed in an oversight is read from the role token | It is read from that overseer's own token, so an outside session's issues are not in it |
| A `security` issue is read by the owner present or `caller.actor == issue.opener`: any agent with the opener's role token | Only the agent that opened it, and once its token ends the owner present alone. Narrower. 9 events are hidden to the implementer token today, so no writer of the loop reads those now either |

### What is not checked

- **A read.** No read is in the record. The core logs each call with its `holder`
  (`brain-core.ojs` line 235), and `logs.query` answers the owner's session only. With this design
  a read with another agent's live token is still made and still unseen. What it could read that
  its own token could not: a `security` issue that the other agent opened. Nothing else in the
  default policy reads `caller.actor` for a read.
- **Which process sent a token.** Every agent here runs as one user of one machine, and each can
  read `.emitted/`. Mode 600 keeps out other users, of which there are none. So an agent that
  reads the file and sends another's secret is that other in the record. This design removes the
  shared name an agent types by mistake; it does not keep one agent's secret from another. That
  needs each agent in a sandbox that cannot read the file, which is "Not chosen", 5.
- **The parent.** `loop-agents` itself can write to the tracker, as `secret:loop-agents`. Nothing
  refuses it. T5's check counts such events; the count should stay 0.
- **A role's name.** `impl-` in a name is what the maker typed. The policy does not read it.

### Not chosen

1. **Leave the tokens as roles and read the agent from the `cost` comment.** No build. But a `cost`
   line names a run, not an event; it is written after the run, by the orchestrator; 130 of 148
   name no agent; and a session outside the loop writes none. The 10 events of the overseer's
   token would read as they do now.
2. **A token for each agent from `brain.ts token`, with the owner's session.** Built already, and
   event 150 allows it. Not chosen as the routine: each spawn would use the session file, which the
   rules keep for the owner's word, and such a token has no `until` and no parent, so one
   forgotten lives until someone revokes it by name.
3. **Make the tracker's actor the role and keep the agent as a second name** (`issueActor` reads a
   prefix of `holder`). A dead writer's successor could then submit. But it is a deploy of
   `brain-x-issues` that changes how `issue.verify?guards=true` judges all 1158 past events. The
   `back` move costs one event and no deploy.
4. **A mark on a session made from the file.** Not possible while the file holds the kernel's
   session key ("What exists today"). Taking the key out of the file is option (a) of comment 133,
   which the owner did not take at event 150; it also ends `brain.ts` installing a policy. A token
   the policy lets approve was also weighed: it would put a name in `by`, chosen by the same
   session that writes the key today, and it widens a guard. No gain over the key.
5. **A sandbox for each agent** that reads its own secret only. It is the one thing here that would
   hold against an agent that reads the file. The loop's agents are Agent-tool subagents of one
   session and share its process's rights; only the `agent.sh` reviewer is a process of its own.
   Left for the day agents run on other machines (`locks-held-in-the-cluster` is that project).
6. **A guard that reads the name** (`review` only for `secret:rev-…`). A policy install, `major`,
   for a name the maker types. `caller.actor != issue.by.start` already refuses the writer's own token.

## How each requirement is known to be met

Each is a command an agent runs with its own token, from the main checkout.

| | Check | Passes when |
|---|---|---|
| R1 | `ia "sync?after=<N>"` with `N` the event before the first round on the new tokens, grouped by `by.holder` and by the `agent` of the `cost` lines | no holder is beside two `agent` ids; no event after `N` has `issues-implementer-2`, `issues-reviewer-2` or `issues-overseer-1` |
| R1 | the same, for a session outside the loop that writes one comment | its holder starts `out-` |
| R2 | `issue-as.sh <a revoked child's name> "get?id=record-names-token-not-agent"`; and after the owner's revoke, `issue-as.sh issues-reviewer-2 "get?id=…"` | 401 "unknown token" for each (the second only if the old file is kept for the test; else exit 2, no such name) |
| R3 | `bun tools/cloud-brain/issue-stats.ts --token=<own>` | `openers` has keys `impl`, `rev`, `over`, `orch`, `out`, and the old names for events before `N` |
| R4 | `grep -rn 'issues-\(implementer\|reviewer\|overseer\)-[0-9]' .claude/skills/brain-maintenance/SKILL.md .claude/skills/brain-maintenance/agents .claude/skills/brain-maintenance/rules.md knowledge tools/cloud-brain/*.sh tools/cloud-brain/issue-stats.ts` | nothing but lines that say the names are revoked. `oversight.md` is a record and keeps them. The reviewer's brief on cb4: `cloud-brain-dev/put.sh --get roles/reviewer.md \| grep -c issues-reviewer-2` is 0 |
| R5 | `issue-stats.ts` | a line `approve by the session: 5 pressed, 5 made for the owner` at event 1158, from the keys |
| R6 | a test under `tests/tools/` runs `brain.ts agent-token` against a local fake of the core; on cb4, one issue goes `start`, `back`, `start` by a second token, `submit` | the test passes; the second token's submit answers 200, the first's 403 |
| the parent | `ia "sync?after=<N>"` filtered to `secret:loop-agents` | 0 events |

None needs the owner's tab, `logs.query` or a QA tab.

## The tasks, in the order they land

1. **`brain.ts agent-token`** and `issue-as.sh` reading `.emitted/<base>-agent-tokens.json`. A
   local tool: the test is `tests/tools/agent-token.test.ts`, which fails before. `brain.ts token
   NAME <method…> --delegate` for the owner's one command (it calls `delegation.create` with caps
   `["delegate"]` and keeps the secret unprinted). No deploy. Its record says that a child made on
   cb4 was not tried, until the owner's act below; then the task's writer makes one child, calls
   `issue.get` with it, revokes it, sees 401, and adds the three answers to the record.
2. **`issue-stats.ts`**: `openers` by prefix, and the line of R5. A test file with a fixed list of
   events. No deploy. Does not wait for task 1.
3. **The orchestrator's steps** in `SKILL.md`: make a token before each spawn and for itself, put
   the name in the prompt, `"token"` in the `cost` line, end it as "The design" says, `back` then
   spawn for a dead writer, write `cost` with its own `orch-` token. Then `agents/implementer.md`,
   `spec.md`, `digest.md`, `overseer.md` and `rules.md` "Which token" (R4). `rules.md` is the
   owner's file: its change is `major` and lands at his approval. After task 1 and the owner's act.
4. **The reviewer's brief on cb4** (`roles/reviewer.md`) and `agent.sh`'s task text. Changed with
   `put.sh` by an overseer, the only role that holds `loop-roles`. With task 3.
5. **The doc for a session outside the loop**: `knowledge/calling-a-cloud-brain-from-this-checkout.md`
   says to run `brain.ts agent-token out` before a first write to the tracker, in place of a
   role's token. A test file that reads the doc. With task 3.
6. **The checks of R1, R2 and the parent**, run after the first three issues that went round on
   the new tokens, written to `tools/cloud-brain/records/record-names-token-not-agent.md`. The
   three reports are closed with that record as the reason.

## What only the owner can do

- Approve this spec, or send it back naming which of the three sides in "What was asked" is wrong.
- Make the parent, once, after task 1 lands:
  `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-agents 'issue.*' --delegate`. It uses
  his session and gives a token that makes tokens for the tracker and nothing else.
- Approve the change to `rules.md` (task 3).
- Revoke the three role tokens when task 6's first check has passed:
  `brain.ts token revoke issues-implementer-2`, and the same for `issues-reviewer-2` and
  `issues-overseer-1`.

Not asked of him: any deploy. No Worker changes.

## Not verified

- That `delegation.create` under a token with `delegate` works on cb4 as the seed's tests say. Task 1 tries it.
- That a child's `daily` may be left as the parent's when the parent has none, and what an
  `issue.*` call costs a token. The three role tokens made 1047 writes with no refusal for money that I saw in the record.
- That a subagent started by the Agent tool keeps to the token name in its prompt. Task 6's first
  check is what shows it.
- Why the writer of comment 1027 ran a command with the reviewer's token.
