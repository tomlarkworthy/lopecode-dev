# Cloud Brain: the record names the agent that made a call

Spec of the project `record-names-token-not-agent` on cb4's tracker. Written 2026-10-11 from
18:08 CEST (event 1156's `at`; the file's first commit is 18:17) from `lopecode-dev` `870cd992` and the tracker
at event 1158. Nothing here is built. Every count under "What exists today" was made that evening
from `issue.sync?after=0`, read with `issues-implementer-2` (1158 events), unless it names another source.

Round 2, 2026-10-11 from 18:34 CEST (`date`), after review 1211 sent it back at 18:27 (event 1212's
`at`). Written by an agent started for the round, from `lopecode-dev` `2e2b67d8` and the tracker at
event 1230. What changed is listed under "Round 2" at the end. A count it adds says "at event 1230".

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
| The project's body: `loop-roles` "is not held to its paths, so this is an agreement" (`rules.md`); any token of the loop can take the label `annotation` off (review 908) | Left out. Both are about what a token may do, not about who the record names. Each is a guard or a scope, and each is a `feedback` issue of its own: `seen-writer-put-brief-with-loop-roles` (1199, opened by a reviewer) and `seen-any-token-takes-annotation-off` (1243, opened with round 2 of this spec) |

The requirements:

- **R1.** An event written by an agent of the loop, by the orchestrating session or by a session
  outside the loop has a `by.holder` that no other agent or session writes with.
- **R2.** A tracker call with a token whose agent has finished is refused by cb4.
- **R3.** The role of the agent is read from the event, without the journal.
- **R4.** An agent is given one token name. No brief, doc or tool names a token shared by a role.
- **R5.** An `approve` made for the owner with his session file is counted apart from one he
  pressed, by a tool the loop runs.
- **R6.** What the loop does today still works: a rework round, a writer that died, a submit by
  another caller than the one that started, the stats.

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

**No mark inside a session tells the file from the owner's tab. A row kept by the kernel would,
and none is kept.** `brain.ts session` (lines 320 to 327) does not ask cb4 for a session: it signs
one itself, with the kernel's session key, which is in `.emitted/cb4.json`. Sign-in signs the same
three fields, `{ did, exp, epoch }`, with the same key (`brain-kernel.ojs` lines 100 to 101 and
434). So whatever mark a kernel put inside a session made by sign-in, the file could sign too. A
row is another matter: the kernel keeps rows (`rows.get("epoch")`, line 251) and could keep one
for each session it made at sign-in, which a session signed from the file would not have. That is
a change to the kernel. "Not chosen", 4 has why this spec does not ask for it. 78 events are `via session`:

```
28  key policy/…           27 swaps of a migration, and policy event 12
28  key a UUID             the panel
 5  key orch/<id>/approve-for-owner-1   events 577, 649, 650, 651, 675
17  other keys             9 tests, 2 installs, 3 annotations, 3 of one review's fixes
```

Of 10 `approve` moves by the session, 5 have a UUID key (26, 681, 946, 1026, 1071) and 5 the
`orch/` key. The key is the only difference, and it is written by the session that made the move.

**On four submits the caller was not the one that started, by the keys; on two more, by the `cost`
lines.** At event 1230, of 107 `submit` and `submit-spec` moves, those whose key's first part is not
that of the issue's last `start` or `spec` (a script over `sync?after=0`):

```
516   brain-tests-fail-headless-unread  start 271 impl/…  submit orch/brain-tests-fail/submit-after-unpart
622   review-the-default-workflow       start 436 orch/…  submit impl/review-the-default-workflow/submit-3
935   annotations-file-feedback         start 703 orch/…  submit impl/annotations-file-feedback/submit-2
1002  annotations-file-feedback         start 703 orch/…  submit impl/annotations-file-feedback/submit-3
```

A fifth line, events 7 and 8 of `test-walk`, is a test. A key is what the caller wrote of itself; the
journal was not read. Two more have `spec/…` on both sides and show only in the `cost` lines: submit
1208 of `locks-held-in-the-cluster` (round 1 is agent `aac8dc559f3cc7129` at 1144, round 2
`a7039bfc0fc124d05` at 1210, not resumed), and round 2 of this spec, whose writer was started with
none of round 1's context (`SKILL.md` line 77: "Spawn the spec writer (role `spec`): it was sent
back, or an agent died"). Every one of these was `delegation:b6559fa96c36` on both sides, so each
answered 200. The record has one `back` move, 514.

**A token made under a token is already built.** `plan/cloud-brain-authority.md`, "A delegation made
under a delegation", step 7 of 7, deployed to cb4 2026-10-10 13:00: a token with the cap `delegate`
calls `delegation.create`, `list` and `revoke`; a child's scope is inside the parent's, it has no
caps (so it makes no child), its `until` is no later than the parent's, and revoking the parent
ends it (`brain-core.ojs` lines 411 to 419 and 996 to 1030). The child's call arrives with its own
`via` and `holder: "secret:<its name>"`. A parent with no `until` or no `daily` does not hold the
child's: each check opens with `parent.until !== null &&`, `parent.daily !== null &&` (lines 1016,
1017). `delegation.list` sent with the parent's secret answers the children it made and nothing
else (lines 1033 to 1037, `d.parent === parent.id`), each row whole: `name`, `note`, `created`,
`until`. A child that was revoked, or that had ended when the parent next made one, is not a row any
more (lines 1020 to 1022, 1042). Not tried on cb4 by me: I hold no token with the cap, and
making one is the owner's.

**What has no tool yet.** The kernel's `token.create` takes `{ name, methods, daily }` and no caps
(`brain-kernel.ojs` line 470), and gives no `until`. `brain.ts token` calls it. So a parent with
`delegate` is made by `delegation.create` with the owner's session, whose answer holds the secret;
`brain.ts` has no command that keeps that secret without printing it. What `brain.ts token` makes
it keeps in `.emitted/<base>-tokens.json`, mode 600 (`keepTokens`, line 32), and `token revoke`
takes the name out of that file only (line 463): the role tokens are in `cb4-issues-tokens.json`,
which no command writes.

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
  `.emitted/<base>-agent-tokens.json` (mode 600) and prints the name only. `issue-as.sh` reads
  that file after the one it reads now. The `note` is `<role>; <what for>`, where what for is the
  second argument: an issue's id, a session's id for `orch`, a few words for `out`.
- **The parent's secret** is kept where `brain.ts token` keeps every token: `.emitted/cb4-tokens.json`,
  mode 600, under `loop-agents`. Every agent's shell reads that file, so `agent-token` is one
  command for any of them, as `issue-as.sh issues-reviewer-2` is today. The routine is that the
  orchestrator runs it, and a session outside the loop for itself. "What is not checked" says
  what holds an agent to that.
- **`agent-token revoke NAME`** calls `delegation.revoke` with the parent, then sends one read of
  the tracker (`issue.policy`) with the child's secret and prints its status, then takes the entry
  out of the file. A status other than 401 is exit 1 with the entry kept. From then
  `issue-as.sh NAME` is exit 2, no such name, and sends nothing. `agent-token list` prints
  `delegation.list` as the parent sees it: name, note, made, until, no secret.
- **Given to the agent** as a name in its prompt: "your token is `impl-3fa2c1`". The briefs say
  "the token your prompt names" where they now say `issues-implementer-2` (R4). The reviewer
  started with `agent.sh` gets it in the task text.
- **Ended** by the orchestrator when it writes the run's `cost` comment (as built,
  `cm-5-the-loop-writes-the-event`, 2026-10-12: the run's `cost` event, a call of `issue.cost`, which has the `token` field), unless the outcome is
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
| A rework round goes to the writer by message | The same when a writer started the issue; its token is still live |
| A writer died: a new one is spawned and submits, being the same actor | The orchestrator ends the dead writer's token and moves the issue `back` to `ready` (guard: a reason); the new writer makes `start` with its own, which replaces `issue.by.start` (`brain-issues.ojs` line 359). Two more moves |
| The orchestrator's own submit (a quick win) is sent back and it spawns a writer: 622, 935, 1002 | The orchestrator makes `back`, the spawned writer `start`, and then that writer submits. Two more moves. Or the orchestrator does the round itself and submits, with none |
| The orchestrator submits for a writer: 516 | It asks the writer to submit by message when it is alive. Else it ends that writer's token, makes `back`, makes `start` with its own `orch-` token, and submits. Two more moves |
| A spec is sent back and a new spec writer is spawned: 1208, and round 2 of this spec | The writer is resumed by message, as a writer of a task is. When it cannot be: the orchestrator ends its token and makes `back` from `spec` to `open`; the new writer makes `spec` (key `spec/<id>/spec-<round>`), which replaces `issue.by.spec`, and then `submit-spec`. Two more moves |
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
- **An agent that makes itself a token.** A writer that runs `brain.ts agent-token rev` holds a
  second actor, which passes `caller.actor != issue.by.start`, under a name that reads as a
  reviewer's. Nothing on cb4 refuses it: the parent's secret is in a file the writer's shell reads.
  That is as wide as today, when `issue-as.sh issues-reviewer-2` is one command too, and no wider.
  What changes is that it can be seen afterwards, by the second check of R1: a name that wrote an
  event and is the `token` of no `cost` line. Not seen by it: a self-made token that only read and
  was revoked or had ended before the check, and a self-made `orch-` or `out-` name, which no
  `cost` line is expected to carry. Those two kinds are printed with their notes for the overseer
  to read; nothing joins them to a transcript.
- **The first starter after a `back`.** A second `start` replaces `issue.by.start`, so the token
  that started first is no longer refused a review or a `pass` of that issue. A writer's token is
  ended at the `back`. The orchestrator's lives on, and what keeps it from reviewing its own quick
  win after handing it over is its brief (`SKILL.md` line 12, "You review nothing yourself"), as today.
- **The parent.** `loop-agents` itself can write to the tracker, as `secret:loop-agents`. Nothing
  refuses it. The last check of the table counts such events; the count should stay 0.
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
4. **Telling a session made from the file from the owner's tab, in `by`.** It can be built: the
   kernel keeps a row for each session it makes at sign-in and says `tab` only of a session that
   has one ("What exists today"). It is a choice not taken here, for three reasons. It is a change
   to the kernel, which the loop does not deploy (`rules.md`, Never), so it is the owner's to
   build or to ask for. The same file holds the recovery key, which `brain.ts` sends for
   `approve` and `rollback` of a deploy (lines 314 to 318), so an agent that reads the file is
   still not kept from the owner's acts; what it could do with that key to the kernel's rows I did
   not read. And it is option (a) of comment 133 ("Present means a session minted by a sign-in in
   a browser, marked so at mint"), with the cost that comment gives, "brain.ts can no longer
   install a policy or approve": at event 150 he answered with tokens for agents and did not take
   (a). If he wants it, it is a project of its own and R5's count by key is what there is until then.
   A token the policy lets approve was also weighed: it would put a name in `by`, chosen by the
   same session that writes the key today, and it widens a guard. No gain over the key.
5. **A sandbox for each agent** that reads its own secret only. It is the one thing here that would
   hold against an agent that reads the file. The loop's agents are Agent-tool subagents of one
   session and share its process's rights; only the `agent.sh` reviewer is a process of its own.
   Left for the day agents run on other machines (`locks-held-in-the-cluster` is that project).
6. **A guard that reads the name** (`review` only for `secret:rev-…`). A policy install, `major`,
   for a name the maker types. `caller.actor != issue.by.start` already refuses the writer's own token.

## How each requirement is known to be met

Each is a command an agent runs with its own token, from the main checkout. `agent-token list`
and `revoke` are sent with the parent's secret, which the tool reads from the file as it does to make a child.

| | Check | Passes when |
|---|---|---|
| R1 | `ia "sync?after=<N>"` with `N` the event before the first round on the new tokens, grouped by `by.holder` and by the `agent` of the `cost` lines | no holder is beside two `agent` ids; no event after `N` has `issues-implementer-2`, `issues-reviewer-2` or `issues-overseer-1` |
| R1 | the same, for a session outside the loop that writes one comment | its holder starts `out-` |
| R1 | the same events, and `brain.ts agent-token list`. From the record: each holder after `N` that starts `impl-`, `rev-`, `spec-`, `over-` or `dig-`, set beside the `token` fields of the `cost` lines whose own holder starts `orch-`. From the list: each live child, set beside the same fields | every such holder is the `token` of a `cost` line; every live child with one of those five prefixes is too, or its run has not ended. The `orch-` and `out-` names are printed with their notes and their event counts, and the overseer reads them: an `orch-` note is a session id that is in the `session` field of its `cost` lines |
| R2 | `brain.ts agent-token revoke <a child's name>`; then `issue-as.sh <that name> "get?id=record-names-token-not-agent"` | the first prints 401 and exits 0; the second is exit 2, no such name |
| R2 | after the owner's revoke, `issue-as.sh issues-reviewer-2 "get?id=…"` | 401: `brain.ts token revoke` does not write `cb4-issues-tokens.json`, so the name is still there and its secret is sent |
| R3 | `bun tools/cloud-brain/issue-stats.ts --token=<own>` | `openers` has keys `impl`, `rev`, `over`, `orch`, `out`, and the old names for events before `N` |
| R4 | `grep -rn 'issues-\(implementer\|reviewer\|overseer\)-[0-9]' .claude/skills/brain-maintenance/SKILL.md .claude/skills/brain-maintenance/agents .claude/skills/brain-maintenance/rules.md knowledge tools/cloud-brain/*.sh tools/cloud-brain/issue-stats.ts` | nothing but lines that say the names are revoked. `oversight.md` is a record and keeps them. The reviewer's brief on cb4: `cloud-brain-dev/put.sh --get roles/reviewer.md \| grep -c issues-reviewer-2` is 0 |
| R5 | `issue-stats.ts` | a line `approve by the session: 5 pressed, 5 made for the owner` at event 1158, from the keys |
| R6 | a test under `tests/tools/` runs `brain.ts agent-token` against a local fake of the core | the test passes |
| R6 | on cb4, an issue of kind `task` opened for the check, with children `A` and `B` (`impl-`) and `O` (`orch-`): `start` by `A`; `submit` by `B`; `back` by `O`; `start` by `B`; `submit` by `A`; `submit` by `B`. Then a `changes` review and `rework` by `O`, and `close` | 403 for `B`'s first submit and for `A`'s after the second start, 200 for `B`'s last. This is the dead writer, the quick win handed over (`O` in place of `A`) and the orchestrator submitting for a writer (`O` in place of `B`): one guard, `caller.actor == issue.by.start`. 8 events |
| R6 | the same on an issue of kind `project`: `spec` by `A`; `submit-spec` by `B`; `back` by `O`; `spec` by `B`; `submit-spec` by `A`; `submit-spec` by `B`. Then a `changes` review and `respec` by `O`, and `close` | 403, 403, 200 as above. 8 events |
| the parent | `ia "sync?after=<N>"` filtered to `secret:loop-agents` | 0 events |

None needs the owner's tab, `logs.query` or a QA tab.

## The tasks, in the order they land

1. **`brain.ts agent-token`** and `issue-as.sh` reading `.emitted/<base>-agent-tokens.json`. A
   local tool: the test is `tests/tools/agent-token.test.ts`, which fails before. `brain.ts token
   NAME <method…> --delegate` for the owner's one command (it calls `delegation.create` with caps
   `["delegate"]` and keeps the secret unprinted). No deploy. Its record says that a child made on
   cb4 was not tried, until the owner's act below; then the task's writer makes one child, calls
   `issue.get` with it, runs `agent-token list` and `agent-token revoke`, sees 401 and then exit 2,
   and adds the answers to the record. The two R6 checks on cb4 are this task's too, made then.
2. **`issue-stats.ts`**: `openers` by prefix, and the line of R5. A test file with a fixed list of
   events. No deploy. Does not wait for task 1.
3. **The orchestrator's steps** in `SKILL.md`: make a token before each spawn and for itself, put
   the name in the prompt, `"token"` in the `cost` line, end it as "The design" says, write `cost`
   with its own `orch-` token. Step 3's table gets the four rows of "What changes for the loop"
   that add moves, each saying who makes `back` and who makes the second `start` or `spec`: a dead
   writer, a quick win of its own sent back and handed to a writer ("A quick win"), a submit made
   for a writer, and a spec sent back (line 77 becomes resume by message, else `back` and spawn).
   Then `agents/implementer.md` (step 4: an issue `in-progress` that another started is not
   yours to submit; say so and stop), `spec.md` (step 1: at `spec` and started by another, the
   orchestrator has made `back` and you make `spec`), `digest.md`, `overseer.md` and `rules.md`
   "Which token" (R4). `rules.md` is the
   owner's file: its change is `major` and lands at his approval. After task 1 and the owner's act.
4. **The reviewer's brief on cb4** (`roles/reviewer.md`) and `agent.sh`'s task text. Changed with
   `put.sh` by an overseer, the only role that holds `loop-roles`. It reads "the token your task
   names; `issues-reviewer-2` when it names none", so it is right before task 3's steps are used
   and after, and lands before task 3. The second half goes with the owner's revoke.
5. **The doc for a session outside the loop**: `knowledge/calling-a-cloud-brain-from-this-checkout.md`
   says to run `brain.ts agent-token out` before a first write to the tracker, in place of a
   role's token. A test file that reads the doc. With task 3.
6. **The checks of R1, R2 and the parent**, run after the first three issues that went round on
   the new tokens, written to `tools/cloud-brain/records/record-names-token-not-agent.md`, with a
   comment on each of the three reports that names the record. The reports are closed before
   that, by the orchestrator at `decompose`, with the reason `in the spec of
   record-names-token-not-agent` (`SKILL.md` line 78); this task closes nothing.

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
- What an `issue.*` call costs a token. The three role tokens made 1047 writes with no refusal
  for money that I saw in the record. (That a child needs no `daily` under a parent with none is
  read from `brain-core.ojs` line 1017, in "What exists today".)
- That a revoked child's secret is answered 401 on cb4. Read from the core: a secret with no row
  is `401 AuthRequired "unknown token"` (`brain-core.ojs` line 314), and a revoke drops the row
  (line 1042). Task 1's writer sees it, or changes the number in R2.
- How long after its submit a spec writer can still be resumed by message. 10 `cost` lines at
  event 1230 have `"resumed":true`, 3 of them a spec writer's (926, 997, 1015), so it has been
  done; the longest wait one was resumed after was not measured. When it cannot be, the row of
  "What changes for the loop" has the `back`.
- That a subagent started by the Agent tool keeps to the token name in its prompt. Task 6's first
  check is what shows it.
- Why the writer of comment 1027 ran a command with the reviewer's token.

## Round 2

Review 1211 (2026-10-11 18:27 CEST, `changes`) had three findings and four smaller things. It
found no fault in the design, and the design is as it was. Each answer names where the file changed.

1. **R6 left out one caller starting and another submitting.** Counted again at event 1230 with
   my own script: the same four submits, 516, 622, 935 and 1002, of 107. Two more of the same
   kind came out of the `cost` lines, which the keys do not show: a spec sent back and given to a
   new writer (1208, and this round). "What exists today" has the list. "What changes for the
   loop" has three new rows and the dead writer's row says who ends the token and who makes each
   move. Task 3 names the lines of `SKILL.md`, `implementer.md` and `spec.md` that change. R6's
   check on cb4 is now two, a task and a project, each with the refused submit before the `back`
   and after the second start. A consequence the review did not ask about is under "What is not
   checked": after a `back` the first starter is no longer refused a review.
2. **An agent can make itself a second token, and R1 did not see it.** "The design" says where the
   parent's secret is kept (`cb4-tokens.json`) and that any agent's shell reads it. "What is not
   checked" has the sentence, and what the new check still misses. R1 has a third check, from the
   record and from `agent-token list`, set beside the `token` fields of the `cost` lines. The
   review proposed the list alone; the list drops a revoked child (`brain-core.ojs` line 1042), so
   the record is read first and the list is for the children still live.
3. **"Cannot be told … by anything a Worker could be changed to check" was wider than the code.**
   The paragraph of "What exists today" and "Not chosen", 4 now say a kernel row for each sign-in
   would tell them, and give the three reasons it is not asked for here. Comment 133 was read
   again and is quoted.

Smaller: the child's `daily` and `until` are read from lines 1016 and 1017 and moved out of "Not
verified". `agent-token revoke` takes the entry out of the file after it has printed the 401, so R2
is 401 then exit 2 for a child and 401 for a role token. The reports are closed at `decompose` as
`SKILL.md` has it, and task 6 closes nothing. Of the two things left out, one had been filed since
(1199) and I filed the other (1243). Task 4 lands before task 3 and is written to hold on both sides of it.

Not done in this round: nothing was tried on cb4 but reads of the tracker and the one `open` of
1243. The counts at event 1158 were not made again; the review made them and found six differ by one.
