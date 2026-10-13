# Cloud Brain: the tracker's policy walked as a state machine, and a write that names what it read

Spec of the feature `rules-checked-and-stale-knowledge-seen` on cb4's tracker. Written 2026-10-13 from
07:00 CEST (event 5941's `at`, the take) by the spec writer `spec-8c5008`, from `lopecode-dev`
`origin/main` at `d133b284` and the tracker at event 5942 (`origin/main` moved on while it was
written; the line numbers of the seed and of `loop.ts` are those of `3a159fbf`, where the walk was run a last time). Nothing here is built. The measurements
below were run between 07:00 and 08:40 CEST that day (`date`); the machine slept for about an hour of
that, so no wall time of that span is given.

He asked three questions. The answers measured here, each with its run further down:

- **Is it a real issue.** The installed policy is small and was walked whole in under a minute: 30,144
  states, 980,128 moves, and the three properties the issue names hold on it. The walk found one thing
  nobody had written down: a Worker of the Brain may start, submit, review and pass a task. The prose
  is the large part (155,286 bytes in two files, 112 commits in three days), and nothing checks it.
- **Could formal logic help.** For the policy, yes, and with no new language: the guards are data
  and the service's own judge is a function with no I/O, so every state can be tried. For the prose, no.
- **Hashes, to see stale knowledge and propagate changes.** The record is a hash chain, and a write
  cannot say what it had read. 34 of 374 submits had another holder's event between the take and the
  submit. A hash of the spec a task was made from would mark 72 of 77 tasks stale, so this spec does
  not build a mark from one.

## What was asked

The owner, through a session he is present in (token `out-5f56b2`), 2026-10-13, before 06:58 CEST, as
the issue's body (event 5937) has his two messages, whole:

> I wory the issue tracker orchistration rules and invalidation  becomes so complex we can;t understand them. Is this a real issue. Could formal logic help tame it? Do we have concurrent saftery such as hashes of issues so its easy to see stale knowledge  and propogate changes?

> yes file it as an issue, we are trying to move towards moving archistration to automated

The three parts of the body (the policy checked as a state machine; a task and a run name the hashes
they were made from, and a change marks the issue and wakes its holder; a write names what it read) are
that session's, and the body says so. His words on `post-mortem-actions-prefer-guards`, 2026-10-12:
"generally fixes are better as guards."

Where this spec rests on more than those words:

- He asks "Is this a real issue", and this spec answers with counts and a run, and no opinion. That he wants a measured answer is the writer's reading and not his words.
- "Could formal logic help" is answered with a walk of every state by the service's own judge, and with no prover and no second notation for the rules. That a walk is what he means by formal logic is the writer's reading and not his words.
- "hashes of issues so its easy to see stale knowledge" is built as a number, the seq of the last event the writer read, sent with the write. The seq stands for the hash: each event's hash covers the one before it. That a seq serves him as a hash would is the writer's reading and not his words.
- "propogate changes" is built as: a change that bears on an issue is an event on that issue, and the holder's next write is refused until it has read the event. No hash of a spec or a brief is watched, and nothing marks an issue because a file changed. That this is enough of "propagate" is the writer's reading and not his words; the measurement under "A hash of the spec" is why, and choice C below is the other way.
- The walk found that a Worker may review and pass. Narrowing that (task `rk-2`) is asked by nobody. That he wants it closed is the writer's reading and not his words; choice B leaves it out.

## The reports gathered

`list?parent=rules-checked-and-stale-knowledge-seen` answers no parts. The issue is linked `related` to
two others, read as evidence:

| Report | What it gives | Becomes |
|---|---|---|
| The body, part 1 | The policy walked, properties held, "Run at each install" | R1, R2 |
| The body, part 3 | "as of event N" on a move and a review | R3, R4 |
| The body, part 2 | A task and a run name what they were made from; a change marks and wakes | R5 for the naming. The mark from a hash is left out, measured below |
| `orchestrator-as-steps` (building, 9 tasks) | A program makes the passes, so a rule it follows must be one a program can read | R4: the tool sends the number, no brief asks for it |
| `post-mortem-actions-prefer-guards` (done) | A guard, a refusal or a test before a sentence in a brief | Every requirement here is a test, a refusal or a tool's default; one row of `SKILL.md` changes |
| Comment 5777 of `fly-4-loop-files` | The one case on the record of a task made stale by a later spec | Read under "A hash of the spec" |

## Requirements

- **R1.** One command walks every state a policy lets an issue reach, with the service's own judge,
  and holds the properties listed under "The properties". It fails with the path that breaks one.
- **R2.** The walk runs in the suite on the policy file the owner is given to install, before he is
  given it, and by one command on the default policy of the seed.
- **R3.** A write to an issue can name the last event of that issue its writer read, and is refused
  when the issue has an event after it that matters. The refusal lists those events.
- **R4.** The move and the review of a writer, a spec writer and a reviewer carry that number with no
  line in a brief: the tool they write through sends it, and the number is of what the agent was
  shown. Not the approver's `approve` (section 3, "The approver").
- **R5.** The record says what a task and a run were made from: for a task the spec's attachment, by
  its hash; for a run the brief, `rules.md` and `philosophy.md` as they were, by their blobs.
- **R6.** After three days of R3 and R4 the refusals are counted and read: how many, and how many
  showed the writer something it had not read.

## What exists today, measured

**The policy.** `issue.policy` with this token: the policy of event 5689, 4 workflows, 42
moves, 2 swaps, 3,310 characters of move guards. It is the body of
`plan/cloud-brain-issues-policy-v5.json`. Six `policy` events are in the record (seq 1, 12, 17, 483,
4668, 5689): the default the Worker wrote and five installs by the owner, in four days.

**What checks a policy today.**

- `issuePolicyAct` (`brain-issues.ojs` line 1120) at every install: each guard parses, each state and
  workflow named is there. It asks nothing of what the guards allow together.
- `issue.verify?guards=true` (`issueReplay`): each event of the record judged again by the view before
  it. It reads what happened, not what could.
- `tests/tools/issues-policy-v3.test.ts`, `-v4`, `-v5` and the test cells of the seed
  (`test_issues_default_policy_review_approval_and_children`, `…_an_approver_delegation_approves_and_no_other_token`):
  paths written by hand, a few an install.

**The judge is a function.** `issueAllowed(view, by, act)` (line 890) and `issueApply(view, e)` (line
612) read no clock and make no call. A guard reads `caller`, `issue` (`issueFacts`, line 820: state,
labels, `major`, `by`, `reviews`, `children`) and `event`. Of `issue.by` the guards of the installed
policy read three fields: `start`, `spec` and `owner-reject` (two searches of the policy's text: `issue.by.<name>`, and
`"<name>" in issue.by`, which is how `reopen` reads the third).

**The walk, run as a prototype.** One cell compiled at the end of the seed, as
`tests/tools/issues-policy-v4.test.ts` compiles its rig, and run by `cloud-brain-dev/test.ts`; the cell
and its driver are at the end of this file. It opens one issue of each kind, and from every state
tries every move, review, label and listed swap by five callers (the owner present, two tokens, the
approver's delegation, a Worker of the Brain), with two parts that a token opens, closes and reopens.
A state is the workflow, the state, three labels (`major`, `needs-owner`, `security`), the three
fields of `by`, the reviews as verdict and whether the starter wrote them, and whether each part is
there and open. At `d133b284`, on the v5 file:

```
states 30144   moves allowed 980128   acts tried 2362256   left unvisited 0
in the cell 56.5 s; the command 58.4 s (54.3 s user)

a move to done of a task or security issue that carries major, not by the owner present or the approver    0
major taken off by anyone but the owner present                                                            0
project: done reached from open with the approve moves of the owner and the approver cut                   0 states
a review, or a move out of review, by the actor that the review guard names as the starter                 0
states from which no closed state is reached by anyone                                                     0
states from which none is reached by the loop's tokens and the approver alone     security/in-review, security/awaiting-approval
what the Worker's call was allowed      task.start task.submit task.review task.pass task.rework task.to-approval
                                        project.review project.respec project.to-approval
```

The same cell with `issuesDefaultPolicy` of the seed in the file's place (one line of the cell changed,
08:51 CEST): 30,144 states, 977,536 moves allowed, the same counts on every line, and
`project/awaiting-approval` among the states only the owner ends, since the default names no
approver. 42.1 s as a command.

Run again on the v5 file at `3a159fbf`, 08:52 CEST: the same counts on every line, 38.4 s as a command.
The time of one walk on this machine was 38 to 58 s over five runs.

So the three properties the issue names hold on the policy in force. Two things the run says beyond them:

- **A Worker of the Brain passes a task.** The guards of `review`, `pass`, `to-approval`, `rework` and
  `respec`, and of `start` from `ready`, name no kind of caller, and the service's own rule lets in
  `caller.kind in ['owner','token','worker','deployer']` (line 336). A Worker that starts an issue at
  `ready` may submit it; another may review and pass it. In the record no Worker and no deployer has
  done more than open: of 5,942 events, 2 `opened` by a Worker, 1 by the deployer, and no move, review
  or label by either. Since 2026-10-11 the loop deploys services (`philosophy.md`, Clarifications), so
  this is a path from a deployed service to `done` with no token of the loop in it. Not tried: the
  deployer as a caller (its kind is neither `owner` nor `token`, as a Worker's), and a Worker as the
  opener of a `security` issue.
- **`project`: 384 moves to `done` of a project that carries `major`, by a token.** Each is `finish`
  from `building`. No path reaches `building` without an `approve` (the third line), so they are the
  design, and the property for a project is the third line and not the first.

Two earlier forms of the walk, and the one kept. A first form, with the reviews kept by actor and eight
callers, has no number: its runs were lost to the driver ("What misled the writer").

```
four walks, one a kind, by.submit and by.submit-spec in the state          151,248 states, 233 s
one walk from the four starts, the same state                              80,400 states, 135 s
by.submit dropped (the review guard reads by.start), as above              30,144 states, 56 s
```

**A write and what its writer read.** A write is judged at the head it is written at (`write`, line
1344: the view is loaded, the act judged, the event appended, and on a lost race judged again), so two
writes cannot both pass a guard that only one may. What the service cannot know is what the caller had
read. One act already says where it thinks the issue is: a swap with `from` is refused when "the issue
is no longer where this swap takes it from" (line 929). No other act has such a field:
`grep -c asOf tools/cloud-brain/brain-issues.ojs tools/cloud-brain/issue-as.sh tools/cloud-brain/loop.ts`
prints 0 for each.

From the record at event 5942 (`issue.sync`, read whole):

```
submits with a take before them                                         374
  with an event of another holder between the take and the submit        34   (9.1%)
  of those, the last such event under 120 s before the submit             7
reviews                                                                 375
  with an event of a third holder between the submit and the review      28
```

Counted: `commented`, `labelled`, `linked`, `attached`, `moved`, `swapped`, `reviewed`, `held`,
`narrowed`; not `cost` and `waits`. This is an upper bound on what R3 would refuse, not a count of
writers who missed something: the record does not say what an agent read. The briefs ask for a read
before the submit (`agents/spec.md` step 7, from `paper-summarizer-persona`: comment 1571 came
mid-writing and submit 1578 named the commit before the one that answered it). That case is the one
on the record where the read is known to have been missed.

**A hash of the spec a task was made from.** 142 issues were opened as parts. 133 bodies name a plan
file and 77 of those a commit of it (`lopecode-dev <sha>`), in prose. No `opened` event has refs
(0 of 458). Against `origin/main` `d133b284`:

```
tasks that name a spec file and a commit                                             77
  the file has a commit after the one named                                          72
  such a commit before the task closed, or the task is not closed                    42
  sections (## and ###) of the spec that read otherwise now: median 5 of 16.5; tasks with none: 0
tasks named in a paragraph of the spec at that commit                                42
  such a paragraph is not in the file now                                            14
projects decomposed                                                                  28
  attachments on them after the decompose                                             0
```

A spec is written to after its approval by nearly every task, with "As built" notes. A mark from the
file's hash fires for 72 of 77 tasks, from a section's for all 72, from the task's own paragraph for
14 of 42, and the record gives no way to tell which of those changed what a task is to build. The one
case the issue names, `fly-4-loop-files`, was made stale by another project's spec
(`orchestrator-as-steps`, part 6), and what told its next reader is comment 5777 on the task itself.
A hash of the Fly spec would have said "changed" eleven times for that task (11 commits after
`59da6348`), ten of them for something else.

**A run and its brief.** A run's start is a `cost` event with the outcome `running`
(`tools/cloud-brain/loop.ts`, `start`, since `st-2-loop-start-and-end`; 2 such events of 707 `cost`
events so far). Its fields are fixed (`issuesLimits.cost`, line 346) and none names a text. One role's
brief is pinned by its blob: the approver's, in the reason of the policy, read by `approver.ts`
(`policy-pins.ts`). `rules.md` and `SKILL.md` had 112 commits in the three days to 08:37 CEST.

## Read

In the Brain first, `knowledge.search?semantic=true` as `loop-knowledge`, seven searches:

| Search | Found | Used |
|---|---|---|
| "model checking a workflow state machine with guards" | `doc:cloud-brain-bookkeeping-in-the-tracker` (0.95); `module:tomlarkworthy:fsm` (0.47), a state machine library | The first, for `issue.queue`. The module draws machines and checks none |
| "formal verification of an access control policy" | eight papers on agents and world models, none on policies | Nothing |
| "optimistic concurrency: a write names the version it read and is refused when stale" | `module:tomlarkworthy:brain-library` (0.68); `doc:cloud-brain-texts-not-read-again-after-a-change` (0.60) | Both. The library marks a card `staleSince` when the notebook's copy differs (`brain-knowledge.ojs`, `staleSince`): a hash compared at a put, the same job for cards. The doc measured that a tool which looks for stale sentences found none of six |
| "a task names the hash of the spec it was derived from; stale when the spec changes" | `doc:cloud-brain-tracker-trigger-rules` (0.70), `doc:cloud-brain-post-mortems-declared-and-kept` | The first: `issue.wait` and `issue.wakes` are what wakes a holder |
| "incremental build dependency hash invalidation propagate changes" | nothing of the tracker | Nothing |
| "policy install test of the tracker guards" | `doc:cloud-brain-bookkeeping-in-the-tracker` (1.0), `doc:cloud-brain-approver-persona` | The policy files and their tests |
| "multi agent orchestration shared state stale knowledge conflict" | eight papers on self-evolving agents | Nothing |

Outside, four searches, each **read in a summary of search results only**, none of the sources opened:

- Mokhov, Mitchell, Peyton Jones, "Build Systems à la Carte", ICFP 2018
  (https://www.microsoft.com/en-us/research/publication/build-systems-a-la-carte/). A verifying trace
  keeps the hashes of what a result was made from; "early cutoff" stops a rebuild when a changed input
  gives the same output. Used: the name for what the 72 of 77 lack. Without a cutoff a hash of the
  input says "changed" whether or not the output would be.
- RFC 9110, `If-Match` and 412 (https://http.dev/412). A write names the version it read and is
  refused when the resource has moved; the client reads again and sends again. Used: R3 is this, with
  the issue's seq as the validator. A server may require the header or leave it to the client.
- Backes et al., "Semantic-based Automated Reasoning for AWS Access Policies using SMT", FMCAD 2018
  (https://ieeexplore.ieee.org/abstract/document/8602994/). A policy language encoded for a solver, so
  a property is checked for every request and not for samples. Not used: the tracker's state space is
  walked whole in a minute by the judge that runs in production, with no encoding to keep in step.
- Jackson's small scope hypothesis, as the Alloy article has it
  (https://en.wikipedia.org/wiki/Alloy_(specification_language)): most defects show in small
  instances; a bounded search refutes and does not prove. Used: the walk's bounds (one issue, two
  parts, two tokens) are said as bounds, under "What the walk does not show".

## The design

### 1. The walk (R1, R2)

A tool, `tools/cloud-brain/policy-walk.ts <policy.json> | --default | --in-force --token <t>`, and a fixture cell,
`tests/tools/fixtures/policy-walk.ojs`, which the tool compiles at the end of this checkout's
`brain-issues.ojs` with no other test cell and runs with `cloud-brain-dev/test.ts --with`. The cell is
the prototype at the end of this file with its properties as a list. Nothing is added to the seed and
nothing is deployed: the walk calls `issuePolicyAct`, `issueAllowed`, `issueEvent` and `issueApply` of
the seed as they are.

It prints one line a property with its count, and for a broken one the shortest path of acts from the
open to the edge that breaks it. Exit 0 when every property holds, 1 with the paths, 2 when the seed
was not compiled.

**The properties.** Each is named, and reads the policy by the names it uses (`major`, `done`,
`approve`); a property whose names a workflow does not have is not asked of that workflow.

| Name | Holds when | On v5 |
|---|---|---|
| `major-done-is-his` | No move takes an issue that carries `major` to `done`, on a workflow that has no move `decompose` (`task` and `security` today; `security` has no `pass`), but one by the owner present or by the delegation the `approve` guard names | holds |
| `major-stays` | `major` is taken off by the owner present alone | holds |
| `project-done-was-approved` | On a workflow with a move `decompose`: with the `approve` moves of the owner present and of that delegation cut, `done` is not reached from the open | holds |
| `no-own-review` | No review, and no move out of a review state, by the actor the workflow's review guard compares with (`by.start`, `by.spec`) | holds |
| `no-trap` | From every state a closed state is reached | holds |
| `loop-ends-it` | From every state a closed state is reached by tokens and the approver alone, but from the states the file `tests/tools/fixtures/policy-walk-his.json` lists | holds, with `security/in-review` and `security/awaiting-approval` listed |
| `moves-are-his-or-a-token` | No move, review, label or swap is allowed to a caller that is neither the owner nor a token | **fails**: the nine of the run above |

`tests/tools/policy-walk.test.ts` runs the tool on the newest `plan/cloud-brain-issues-policy-v<n>.json`
(as `policy-pins.ts` finds it) and expects each property's line. That is one whole walk a run of the
suite. The default policy of the seed differs from the file in its two `approve` guards
(`issues-policy-v4.test.ts` holds that), and is walked by `policy-walk.ts --default`, which the writer
of a task that changes the cell runs and records; it is not in the suite, where a second whole walk
would make this file the longest.
Until `rk-2` lands it expects `moves-are-his-or-a-token` to fail with those nine, by name: the test
then says what is known and fails when a tenth appears.

**Run at each install.** The owner installs a file a task of the loop made. The suite walks the newest
file, so a file that breaks a property does not land. That the policy in force is a walked file is one
comparison, and the tool makes it: `policy-walk.ts --in-force --token <t>` reads `issue.policy` and
prints whether its four workflow hashes are those `issuePolicyAct` gives the newest file. The
orchestrator runs it after an install; `SKILL.md` has no step for what follows one today (a search of it for `install` finds the approver's pins and no row), so `rk-1` adds the sentence to step 7.

**What the walk does not show.** It walks one issue with two parts, five callers, and three labels.
Not walked: `issue.narrow` (a token may add a guard to a move of one issue, and the approver does, 17
`narrowed` events; a narrowed issue can be one only the owner ends), the owner's own swap to any
state, holds and waits, links `after`, a second level of parts, and anything of the prose. A property
that holds here holds for those bounds.

### 2. A write names what it read (R3)

`asOf`, a whole number, on every write that names an issue but `issue.cost` and `issue.wait`:
`move`, `review`, `comment`, `label`, `link`, `attach`, `hold`, `swap`, `narrow`. Left out, the write
is judged as today.

The view keeps one more thing an issue, `said`: for each actor that wrote an event of it that matters,
the seq of that actor's last one (the newest 20 actors; `issueApply` has the actor of each event, and
keeps today no list of events and no actor of one but the reviews'). `touched` is the greatest of
them. An event
matters when its type is not `cost` and not `waits`, which are the two `issueApply` already leaves out
of `updated_at` (line 629: "What a run cost is not work on the issue"). Only the issue's own events
count. A link another issue says of it, and a part opened under it, are events of the other issue:
`get?id=` of this one does not list them, so a refusal for one could not be shown to the caller by a
read of the issue. They are left out, and a guard still reads `children` at the write as today.

`issueAllowed` refuses the act when an actor other than the caller has a seq in `said` greater than
`asOf`. The caller's own events never refuse it. The judge answers the refusal and the two numbers;
`since` is read by the service from the event table (the events of the issue after `asOf`, as
`issue.get` reads them), not by the judge. The answer is 409:

```
{ "error": "Stale", "message": "2 events of fly-4-loop-files after 5114 that this caller did not write",
  "asOf": 5114, "touched": 5778,
  "since": [ { "seq": 5777, "type": "commented", "by": "orch-d97e0e", "at": … },
             { "seq": 5778, "type": "linked", "by": "orch-d97e0e", "at": … } ] }
```

The shape, written with the two events `fly-4-loop-files` has after its move 5114; the message's
count is of that example and no service has answered it.

`since` is at most 20 entries, the newest; `issue.get` has the bodies. The check is in the judge, so
it is made at the head the event is written at, as a guard is, and `issue.verify?guards=true` judges
it again: the event keeps `asOf`, and the replay builds `said` as the view did. An issue's row
written before the deploy has no `said`; as for `last` (the seed's prose, line 269, and `issue.queue`,
line 1603), the service reads that issue's events when a write with `asOf` meets a row with none and
makes `said` from them, so no `issue.rebuild` is needed and the replay agrees with the service. `issue.get` answers
`touched` beside the issue's `seq`. A guard can read it as `event.asOf` (0 when none was sent), so a
later policy may require it on a move; this spec's policy does not.

`asOf` greater than the record's last seq is a 400. An issue the caller may not read is 404 before
the number is looked at, as for every act.

(As built, `rk-3-as-of`, 2026-10-13: five things the text above leaves open or says otherwise; the
record, `tools/cloud-brain/records/rk-3-as-of.md`. `by` of an entry of `since` is the event's own,
`{ caller, via, … }`, not a holder's name as the example has it. `since` has the events that refuse,
those that matter and that the caller did not write, and the message counts those. The stale check is
asked after the read guard and before the act's own guard, so a stale write a guard would also refuse
is a 409. `asOf` is 1 or more; 0, text, a fraction and `null` are a 400. `touched` is not kept on
the row: `issue.get` answers the greatest seq of `said`. The row keeps `said`, and `issue.snapshot`
answers it with the row.)

### 3. The tool sends it (R4)

`issue-as.sh` keeps, for each token and issue, the `seq` of the issue in the last answer of `get` it
printed to that token. The answer of a write is not kept: a writer that reads at 100, is commented to
at 101 and attaches at 102 would then send 102 with its submit and never be shown 101, which is the
order of the one known miss (comment 1571, submit 1578).

**A read a tool makes for itself keeps no number.** Four tools read an issue with an agent's token
and show the agent nothing of it, or one event of it: `land.sh` (line 111, its answer to a temporary
file, before it sends the comment and the submit at line 176 with the same token), `issue-wait.sh`
(line 118), `worktree.sh` (line 134), and `loop.ts` where it reads with a run's token and not its own:
`live` (line 171), which `resume` asks of the writer's token after the move back and before it
starts the writer again, and the check of a token given to `start` (line 239). Each sets
`ISSUE_AS_KEEP=0` for that call, and `issue-as.sh` then keeps nothing of the answer. They are all
there are: of the twelve files under `tools/cloud-brain` that name `issue-as.sh`, a search for
`get?id` finds these four and the tool itself, and none of the other seven asks it. What each of
those seven reads was not gone through; the tool keeps a number of a `get` and of nothing else. So the submit `land.sh` sends carries the number of the last `get`
the agent itself ran, and a comment that came after that read refuses the submit: `land.sh` passes
the tool's exit 5 and its lines on, and the landing it has made stands, as for any refused submit
today. What `loop.ts` reads with its own token (`LOOP_TOKEN`, the `read(me, …)` calls) is kept: of
those it is the reader. Without the two lines above, a resume would leave the writer's token with the
head of the issue as `loop.ts` found it, the review and the move back under it, and a submit of the
round sent with no `get` of the writer's own would be written.

`issue-wait.sh` prints the wake and the review whole to a writer that takes a round by the wait, and
keeps nothing of them. Such a writer reads the issue again by its brief ("A resumed round": "Read the
issue again"), and that `get` is kept. One that does not is refused once at its submit, with the
review and the move back in `since`; `rk-6` counts those lines apart, by their types. The file is `.emitted/issue-loop/read/<token>.json`, beside the journal, git-ignored, removed
by `agent-token revoke`. For a `move` or a `review` whose body has no `asOf`, the tool adds the kept
number. With none kept (the token never read the issue through this tool) it adds nothing.

On a 409 `Stale` the tool prints the answer, then one line an event of `since` from a `get` it makes
itself (seq, type, by, and the first 300 characters of a body or a reason), keeps the new seq, and
exits 5. The agent has then been shown what it had not read; the same command sent again carries the
new number. One line is appended to `.emitted/issue-loop/stale.jsonl`: the time, the token, the issue,
the act, `asOf`, `touched` and the types in `since`. R6 is counted from that file.

`--no-as-of` sends the body as it is. `loop.ts` reads and writes through `issue-as.sh` (`as`, line
160), so its one move, the `back` of a dead writer's issue (line 371), carries the seq of the `get`
it made before it with its own token (line 362), with no change to that path. A step that moves from a row of
`issue.queue` alone carries none, since the tool keeps no number from a queue; the queue's rows
saying each issue's `touched` is a later task and not in this spec.

**The approver.** Its `approve` is a `fetch` of `approver.ts` with `loop-approver` (line 468), not a
call of `issue-as.sh`, and its verdict before it is a comment: neither carries `asOf`, and this spec
leaves both so. `approver.ts approve` reads the record whole at the call (`sync`, line 451) and judges
it then, so what it acts on is seconds old; and the tool is pinned by its blob in the policy
(`policy-pins.ts`), so a change to it stops every approval until an install. When `rk-2` is taken its
install is the place for it: `approver.ts` would send the seq of the last event it read, and since
the verdict is another actor's event (the `appr-` token's) before the move of `loop-approver`, that
seq is at or after the verdict's. That is said in `rk-2` as a thing its writer may add, with the pin.

No brief changes. The writer's and the spec writer's briefs keep their line "read the issue again
before the submit"; a later oversight may take it out when R6 shows the refusal does the job.

### 4. What a thing was made from, in the record (R5)

- `issue.open` takes `refs`, as `move` and `review` do (`issueAct`, the same check, 20 at most), kept
  on the `opened` event and answered by `get` as `issue.from`. The row `decompose` of `SKILL.md` (line
  293) opens each task with `{"kind":"spec","value":"<project>/<attachment name>@<sha256>"}`, the
  attachment the approved round's submit named, read from `get?id=<project>` (`attachments`, each
  with `name`, `sha256`, `seq`). A project with no attachment (22 of the 28 decomposed so far) gives
  `{"kind":"commit","value":"lopecode-dev@<sha>"}`, the ref of its `submit-spec`.
- `issue.cost` takes `from`: at most 8 entries `{ name, hash }`, a name of 60 characters and a hash of
  40 or 64 hex digits. `loop.ts start` fills it on the `running` event: the blob at `origin/main` of
  the role's brief, of `rules.md` and of `philosophy.md` (`git rev-parse origin/main:<path>`). The
  seq of the issue as the run's start read it is no hash: it goes in `event`, a field the cost event
  has already.

Nothing reads these to mark or to wake. They are what a post mortem and a review read to say which
brief a run had, and what `issue-stats.ts` can count later. Why no mark is under "Not chosen".

A change that bears on an issue reaches its holder as an event on that issue, by section 2: the
comment 5777 on `fly-4-loop-files` is such an event, and with `asOf` a writer that held the task would
have been refused its next move until it was shown it. A spec that changes a task of another approved
spec says so in a part of its own, as `orchestrator-as-steps` part 6 does, and the row `decompose`
writes one comment on each task named there. That sentence of the row is the one line of prose this
spec adds, because who a spec amends is a judgment made once, by its writer.

## Not chosen

### What exists today for the same job, and why it is not extended

Each standing thing the design adds, with what does the same job today.

- **The tool `policy-walk.ts` and its fixture cell.** `issuePolicyAct` checks a policy at the install,
  in the Worker. It is not extended to walk: the walk is 54 s of CPU for 30,144 states, and a Worker's
  request has a CPU limit this spec did not measure against. The file is walked before he is given it.
- **The test `policy-walk.test.ts`.** `issues-policy-v5.test.ts` holds one file's reason and pins. It
  is not extended: it is of one file by name, and the walk is of the newest whatever its number.
- **The fixture `policy-walk-his.json`** (the states only the owner ends). Nothing exists of this job:
  `grep -rn "awaiting-approval" tests/tools/fixtures | wc -l` prints 4, lines of the two copies of cb4's issues there and of the rig of v4.
- **The field `asOf` and the view's `touched`.** A swap's `from` (line 929) does the same job for one
  act and names a state, not an event: two comments leave the state as it was. It is not widened to
  the other acts because a state does not say that something was said. The `key` of a write does
  another job: the same write sent twice.
- **The state file `.emitted/issue-loop/read/<token>.json` and `stale.jsonl`, with the variable
  `ISSUE_AS_KEEP`, which a tool sets to 0 for a read of its own.** `issue-as.sh` keeps
  nothing between calls today (it reads the token files and no other state). The journal directory
  `.emitted/issue-loop/` is where a run's file is (`loop.ts`, `runs/<token>.json`); the two are put
  beside it and not in it, because a run's file is written by `loop.ts` for a run it started, and a
  session's own token has none.
- **`refs` on `issue.open`.** The `refs` of a move and a review, extended to one more act.
- **`from` on `issue.cost`.** The approver's verdict names its brief's blob in a line of a comment
  (`brief <blob>`), which `approver.ts` reads against the policy's pin. Not extended to every role:
  it is a line of text in a comment, held by a tool for one role, and a pin of every brief in the
  policy would stop every run at each of 112 commits in three days until an install.
- **The policy file `plan/cloud-brain-issues-policy-v6.json`.** The v5 file, with the guards of `rk-2`.

No role, brief, token, Worker, method or store is added.

### Other ways

1. **The walk inside `issue.install`, as a refusal.** It would hold a file the owner pastes by hand,
   which the suite does not. Not taken: 54 s of CPU at an install, in a Worker; and an install he
   means to make that breaks a property would need a way to waive it. The `--in-force` comparison says
   after the fact what a refusal would have said before. Reopened by a walk under a second, or by an
   install of a file the suite never saw.
2. **A second notation for the rules (TLA+, Alloy, an SMT encoding).** Not taken: the guards are CEL
   and the judge is the one the Worker runs, so the walk cannot drift from what is deployed. A second
   notation is a second copy to keep true.
3. **Properties as data in the policy.** Not taken yet: seven properties, six of them holding, in one
   list of the fixture. They move into the policy when an install wants one of its own.
4. **A mark from the hash of the spec, a section or a paragraph.** Measured above: 72 of 77, 72 of 72,
   14 of 42, and no way in the record to tell an "As built" note from an amendment. A mark that fires
   for nearly every task is read by nobody. This is choice C for him.
5. **A mark from a later attachment of the project.** 0 attachments after a decompose in 28 projects:
   it would never have fired, and the one known case came from another project.
6. **A run woken when its brief changes.** 112 commits in three days to two of the files. The run
   ends under the brief it began with, and R5 records which.
7. **`asOf` required by the policy on `submit` and `pass`.** It needs an install and breaks every
   caller that does not send it, the page among them. The tool sends it for every agent; a guard can
   require it later, since `event.asOf` is there to read.
8. **Every event refuses, the caller's own too.** Then a writer's own attach before its submit
   refuses the submit. Its own events are what it read.
9. **`asOf` as a hash.** The seq is in every answer already and is shorter; the hash chain makes the
   seq name one history. Not read: whether a `rebuild` or a `resign` keeps every seq.
10. **A link `amends` between issues.** A comment on the amended task carries the text of the change;
    a link carries none, and `asOf` treats both the same.

## What the owner may want the other way

- **A.** As written: the walk and its test, the narrowing of who moves and reviews (one install,
  yours), `asOf` with the tool sending it, and what a task and a run were made from as refs.
- **B.** A without the narrowing: `rk-2` is not opened, no install, and the walk's test goes on saying
  that a Worker may review and pass.
- **C.** A, and a mark on a task when its spec's text changes, at the grain you name (file, section,
  the task's paragraph). Against it: the counts under "A hash of the spec".

The writer would take A.

## How each requirement is known to be met

Each by an agent of the loop, with its own token or none. A check that cannot be run before its task
is built says so.

- **R1.** Before any task, run 2026-10-13 at `d133b284` with the three files at the end of this
  document saved as `walk.ojs`, `walk.ts` and `run.sh` in one directory outside the checkout:
  `./run.sh <W> walk.ojs plan/cloud-brain-issues-policy-v5.json task,security,feedback,project 400000`
  printed the JSON the block under "The walk, run as a prototype" is written from (`all.states`,
  `all.edges`, `all.tried`, `all.p1ByWorkflow`, `p1b`, `p1c`, `p2n`, `trapped`, `needOwner`, `who2`, `ms`). After `rk-1`: `bun tools/cloud-brain/policy-walk.ts plan/cloud-brain-issues-policy-v5.json`
  exits 1 and names `moves-are-his-or-a-token` with the nine acts, and every other property with
  `holds`. Not run: the tool is not written.
- **R1, that the walk can fail.** `rk-1`'s test walks, each until its first broken edge, three policies made from v5 in the test, each
  with one guard weakened, and expects the property and a path: `pass` without `!issue.major`
  (`major-done-is-his`), the label guard without its `caller.present` clause (`major-stays`), `review`
  without `caller.actor != issue.by.start` (`no-own-review`). Not run.
- **R2.** `bun test ./tests/tools/policy-walk.test.ts` passes; each test of the file names its own
  timeout, 200 s, since the suite's is 30 s. Its time is not known: one whole walk was 58.4 s as a
  command, and the suite's longest file is 80 to 94 s (`suite.sh`), so the file is to end under that
  or `rk-1`'s record says what it did to `suite.sh`'s time. The three weakened walks stop at the first
  edge that breaks their property; how soon that is was not tried. Not run. After `rk-2`'s install, with a token:
  `bun tools/cloud-brain/policy-walk.ts --in-force --token <t>` prints `in force: v6`. Not run.
- **R3.** Test cells of the seed, run by `cd cloud-brain-dev && bun test.ts brain-x-issues --with <built>`:
  a move with `asOf` behind another token's comment is 409 with that comment in `since`; behind the
  caller's own comment it is written; behind a `cost` event it is written; with none it is written;
  `verify?guards=true` finds a forged event whose `asOf` is behind. Not run. On cb4 after the deploy,
  with the writer's token and a second: an issue `test-rk-3-<n>` opened, commented by the second,
  moved by the first with the `asOf` of its open: 409, `since` of one entry. Not run.
- **R4.** `tests/tools/issue-as-as-of.test.ts`, against a server of the test as the other
  `issue-as-*.test.ts` files have one: after a `get`, a `move` with no `asOf` is sent with the seq the
  `get` printed; a 409 exits 5, prints the events and appends one line to `stale.jsonl`; `--no-as-of`
  sends none; a `get` with `ISSUE_AS_KEEP=0` keeps none. And in `tests/tools/land.test.ts`: a `get` by
  the agent, then a comment by a second token, then `land.sh` to its submit, which is refused with the
  comment shown, where `land.sh`'s own `get` came after the comment. And in `tests/tools/loop.test.ts`:
  after `resume`, and after `start --token <t>`, the file of the run's token has the number it had
  before. Not run. Today:
  `grep -c asOf tools/cloud-brain/issue-as.sh` prints 0 (run 08:37 CEST).
- **R5.** A test cell: an issue opened with a ref answers it as `issue.from`; a `cost` with `from` of
  nine entries is 400. `tests/tools/loop.test.ts`: `start` writes the three blobs. Not run. On cb4, after the next decompose: `get?id=<task> --short` has
  `from`. Today: 0 of 458 `opened` events have refs (the record at event 5942).
- **R6.** `wc -l` of `.emitted/issue-loop/stale.jsonl`, and each line read against the issue: was the
  event one the writer's later comment or submit answers. Read by `rk-6`.

## The tasks, in the order they land

Ids `rk-<n>-…`. Two can start at once: `rk-1` and `rk-3`.

- **`rk-1-policy-walk`.** After nothing. `tools/cloud-brain/policy-walk.ts`,
  `tests/tools/fixtures/policy-walk.ojs` and `policy-walk-his.json`, `tests/tools/policy-walk.test.ts`
  with the three weakened policies, the sentence of `SKILL.md` step 7 for `--in-force`. No knowledge page names the policy files (`grep -ln issues-policy-v knowledge/*.md tools/cloud-brain/*.md` prints nothing), so none changes. No seed, no deploy.
- **`rk-2-moves-are-his-or-a-token`.** After `rk-1` and after `rk-3` (the same seed, and one deploy at a time of `brain-x-issues`). `major`: it changes who may do what.
  `caller.kind in ["owner", "token"]` on the guards of `review`, `pass`, `to-approval`, `rework`,
  `respec`, and on the `issue.state == "ready"` side of `start`, in `issuesDefaultPolicy` and in a new
  `plan/cloud-brain-issues-policy-v6.json` (`policy-pins.ts remake` for its reason); the walk's test
  expects `moves-are-his-or-a-token` to hold; `issues-policy-v6.test.ts`. A deploy of `brain-x-issues`
  by the loop for the cell. The install is the owner's, and with it `approver.ts` may send `asOf` (section 3, "The approver"), with its new pin in the same file. Left out under choice B.
- **`rk-3-as-of`.** After nothing (when `rk-2` is opened it is after this, for the seed). The seed: `asOf` in `issueAct`, `touched` in `issueApply`, the
  refusal in `issueAllowed`, `event.asOf` for a guard, the 409 in the service, the method reference,
  the test cells of R3. A deploy of `brain-x-issues` by the loop. Not `major` in the writer's view:
  a call that sends no `asOf` is judged as today, so no caller of a method meets a change, and who may
  do what is as it was.
- **`rk-4-issue-as-sends-as-of`.** After `rk-3`. `issue-as.sh`, its two files, `agent-token revoke`
  removing the first, `ISSUE_AS_KEEP=0` in `land.sh`, `issue-wait.sh`, `worktree.sh` and the two reads of `loop.ts` with a run's token (lines 171 and 239), the three tests of R4, the line of `--short`'s header that says what the tool keeps.
- **`rk-5-made-from`.** After `rk-3`, and after `rk-2` when it is opened (the same seed). `refs` on `issue.open`, `from` on `issue.cost`, `loop.ts start`, the row
  `decompose` of `SKILL.md` with its two sentences, the tests of R5. A deploy of `brain-x-issues`.
  `major` if triage reads a row of `SKILL.md` as the loop's procedure, as `fly-4` was.
- **`rk-6-read-after-three-days`.** After `rk-4`, and a wait that is not for a task: three days from
  `rk-4`'s `done`, a hold (`issue.hold`) with the reason "read stale.jsonl: the count, and of each
  line whether it showed the writer something". Counted apart: the lines whose `since` is a `reviewed`
  and the `rework` or `respec` after it and nothing else, which are a round taken by the wait with no
  read after it (section 3). Its record says the three numbers and whether the line
  "read the issue again before the submit" can leave the briefs.

## What only the owner can do

- Install `plan/cloud-brain-issues-policy-v6.json` after `rk-2` passes its review:
  `issue.install`, his session, the body the file.
- Choose A, B or C.

## What the orchestrator makes

Nothing. The spec names no token.

## Not tried, not known

- Whether the walk fits a Worker's CPU limit. Not measured; it is why the walk is a tool.
- The deployer as a caller of the walk, and a Worker as the opener of a `security` issue.
- How many of the 34 submits and 28 reviews had a writer that missed the event. The record cannot say.
- A change that reaches an issue only as another issue's event (a link said of it, a part opened
  under it) refuses nothing. No case of a writer misled by one was looked for.
- What the page does on a 409: it sends no `asOf`, so it meets none.
- The four outside sources were read in summaries of search results.

## What misled the writer of this spec

- The prototype's driver did not exit after printing (the compiler keeps the process), and its output
  went to `tail`, so three runs read as a walk too slow to finish when the build had taken 1.6 s.
  `process.exit(0)` after the build, and the test run as a command of its own.
- `agents/spec.md` step 3 names `issue-stats.ts` for a project "about the loop". Its numbers are of
  flow. What this spec needed was the record itself (`issue.sync`, 12 pages), which the brief does
  not name.
- The body's "42 moves" is the installed policy's; the v5 file read by hand gives the same 42 and 2
  swaps, and the count of 44 a reader gets by adding the swaps is not the body's.

## The fresh review before submitting (2026-10-13, answered by 08:52 CEST)

One agent with the file alone (`/review-notebook`): FIX, 9 findings and 3 smaller, all taken. It ran the
prototype twice and the counts held (53.2 s in the cell). What the writer had not seen: one number an
issue cannot tell the caller's events from another's (now `said`, a seq an actor); the tool kept the
seq of a write's answer, which hides the event the write came after; `loop.ts` does make a move;
`major-done-is-his` was scoped by a move `security` lacks; the test as first written was five whole
walks; the default policy had not been walked (now run); `rk-2` and `rk-3` had no order; three line
numbers. One call of the advisor before the landing: the time bound of R2, links said by another
issue (left out of what matters), and why `rk-3` is not `major`.

## Round 2: review 6159 (2026-10-13, 09:07 CEST)

Taken with `issue-wait.sh … --work`; a resumed round. Two findings and a note, each answered in place.

1. `land.sh` reads the issue itself with the writer's token, so the kept number was of a read the
   writer never saw. Section 3 now has "A read a tool makes for itself keeps no number", for
   `land.sh`, `issue-wait.sh` and `worktree.sh`, with a test through `land.sh` under R4, in `rk-4`.
2. R4 said every agent's move; the approver's `approve` goes through no such tool. R4 names the three
   roles it holds for, and section 3 has "The approver": left as it is, why, and where it would change.
3. The note: a row written before the deploy has no `said`. Section 2 says what the service reads then.

Read again for the round: `land.sh` lines 111 and 176, `issue-wait.sh` 118 (110 in the review, before
`tr-4` landed), `worktree.sh` 134, `approver.ts` 451 and 468, the seed's lines 269 and 1603.

## Round 3: review 6198 (2026-10-13, 09:14 CEST)

A resumed round, sent by a message. One finding and two notes, each answered in place. Read again at
`6cb3f2f8`: `loop.ts` lines 160, 171, 239, 362 and 371, and every file under `tools/cloud-brain` that names
`issue-as.sh`.

1. `loop.ts` reads the issue with the writer's token before a resume (line 171) and at a start with a
   token given (line 239). Section 3 names both among the reads that keep no number, says which of
   `loop.ts`'s reads are kept, and R4 has a test in `loop.test.ts`; `rk-4` names `loop.ts`. Round 2
   answered the three tools the review named and did not search for the rest; this round did.
2. The note on a round taken by the wait: left as a refusal that is counted apart in `rk-6`, with why.
3. The note on `ISSUE_AS_KEEP`: named in the bullet of the state file under "Not chosen".

One call of the advisor before this round's landing (at round 2 it was rate-limited and none was
made): the sentence of the sweep says what the search showed and no more, and `rk-6` says the count
section 3 gives it.

## The prototype

`walk.ojs`, the cell. `"__DATA__"` is replaced by `{ policy, approver, kinds, cap }`.

```js
test_proto_policy_walk = {
  const data = "__DATA__";
  const t0 = Date.now();
  const pol = await issuePolicyAct(data.policy);
  const token = (d, n) => ({ caller: "owner", via: "delegation:" + d, holder: "secret:" + n, tab: false });
  const APPR = data.approver;
  const actors = { owner: { caller: "owner", via: "session" }, a: token("aaaaaaaaaaaa", "impl-a"), b: token("bbbbbbbbbbbb", "rev-b"), approver: token(APPR, "loop-approver"), worker: { caller: "worker:brain-x-echo" } };
  const L = ["major", "needs-owner", "security"], ref = [{ kind: "commit", value: "abc" }];
  // The fields of issue.by a guard reads, and the two the properties read.
  const text = JSON.stringify(data.policy), byRead = [...new Set([...text.matchAll(/issue\.by\.([a-z-]+)/g)].map((m) => m[1]).concat([...text.matchAll(/\\"([a-z-]+)\\" in issue\.by/g)].map((m) => m[1])))].sort();
  const nameOf = Object.fromEntries(Object.entries(pol.hashes).map(([n, h]) => [h, n]));
  const base = () => issueApply(issueView(), { seq: 1, hash: "h1", type: "policy", policy: pol.policy, hashes: pol.hashes, by: actors.owner, at: 1 });
  const keyOf = (view) => JSON.stringify(["x", "cf", "ct"].map((id) => { const i = view.issues[id]; return i ? [nameOf[i.workflow], i.state, i.labels.filter((l) => L.includes(l)).sort(), byRead.map((k) => i.by[k] || ""), [...new Set(i.reviews.map((r) => (r.actor === (i.by.start || i.by.spec) ? "self" : "other") + "|" + r.verdict))].sort()] : null; }));
  const clone = (v) => structuredClone(v);
  const apply = (view, by, act) => {
    const v = issueAllowed(view, by, act);
    if (!v.allow) return null;
    const next = clone(view), e = { ...issueEvent(view, act, v), seq: view.seq + 1, hash: "h", by, at: view.seq + 1 };
    issueApply(next, e);
    return { next, e };
  };
  const actsOf = (view) => {
    const out = [], x = view.issues.x, wf = view.workflows[x.workflow];
    for (const [who, by] of Object.entries(actors)) {
      for (const to of new Set(wf.moves.filter((m) => m.from === "*" || [].concat(m.from).includes(x.state)).map((m) => m.to))) for (const [reason, refs] of [["", []], ["r", ref]]) out.push([who, by, { type: "move", id: "x", to, reason, refs }]);
      for (const verdict of ["pass", "changes", "block"]) out.push([who, by, { type: "review", id: "x", verdict, body: "", refs: [] }]);
      for (const l of L) { out.push([who, by, { type: "label", id: "x", add: [l], remove: [] }]); out.push([who, by, { type: "label", id: "x", add: [], remove: [l] }]); }
      for (const s of wf.swaps) out.push([who, by, { type: "swap", id: "x", swap: s.name, reason: "r" }]);
    }
    // The parts: one that is feedback and one that is a task, opened by a token and closed and reopened by it.
    for (const [id, kind] of [["cf", "feedback"], ["ct", "task"]]) {
      const c = view.issues[id];
      if (!c) out.push(["a", actors.a, { type: "open", id, title: id, kind, about: "brain", parent: "x", labels: [] }]);
      else for (const to of ["open", "closed"]) out.push(["a", actors.a, { type: "move", id, to, reason: "r", refs: [] }]);
    }
    return out;
  };
  const report = {}; const took = {};
  const states = new Map(), edges = [], queue = [], firsts = {};
  let tried = 0;
  for (const kind of data.kinds) {
    const o = apply(clone(base()), actors.a, { type: "open", id: "x", title: "x", kind, about: "brain", parent: null, labels: [] });
    states.set(keyOf(o.next), o.next); queue.push(o.next); firsts[kind] = keyOf(o.next);
  }
  {
    while (queue.length && states.size < data.cap) {
      const view = queue.shift(), from = keyOf(view);
      for (const [who, by, act] of actsOf(view)) {
        tried++;
        const r = apply(view, by, act);
        if (!r) continue;
        const to = keyOf(r.next);
        if (act.id === "x") edges.push({ from, to, who, type: act.type, move: r.e.move || r.e.swap || "", verdict: act.verdict || "", add: act.add || [], remove: act.remove || [] });
        else edges.push({ from, to, who, type: "part", move: "" });
        if (!states.has(to)) { states.set(to, r.next); queue.push(r.next); }
      }
    }
    const X = (k) => JSON.parse(k)[0], isClosed = (k) => { const v = states.get(k), i = v.issues.x; return !!i.closed; };
    const blessed = (e) => e.who === "owner" || e.who === "approver";
    // P1: a move into done of an issue that carries major is the owner's, present, or the approver's.
    const byWf = {}; for (const e of edges) if (e.type === "move" && X(e.to)[1] === "done" && X(e.from)[1] !== "done" && X(e.from)[2].includes("major") && !blessed(e)) byWf[X(e.from)[0]] = (byWf[X(e.from)[0]] || 0) + 1;
    const p1 = edges.filter((e) => e.type === "move" && X(e.to)[1] === "done" && X(e.from)[1] !== "done" && X(e.from)[2].includes("major") && !blessed(e));
    // P1b: major is taken off by the owner present alone.
    const p1b = edges.filter((e) => e.type === "label" && e.remove.includes("major") && X(e.from)[2].includes("major") && e.who !== "owner");
    // P1c: with the approve moves of the owner and the approver cut, is done reached from the start?
    const reach = (ok, starts) => { const seen = new Set(starts), q = [...starts], out = new Map(); for (const e of edges) if (ok(e)) out.set(e.from, [...(out.get(e.from) || []), e.to]); while (q.length) for (const t of out.get(q.shift()) || []) if (!seen.has(t)) { seen.add(t); q.push(t); } return seen; };
    const first = firsts.project;
    const cut = reach((e) => !(e.move === "approve" && blessed(e)), [first]);
    const p1c = [...cut].filter((k) => X(k)[0] === "project" && X(k)[1] === "done").length;
    // P2: the actor that submitted writes no review and makes no move out of the review state.
    const sub = (k) => (["in-review", "spec-review"].includes(X(k)[1]) ? X(k)[3][byRead.indexOf(X(k)[0] === "project" ? "spec" : "start")] : "");
    const actor = (who) => issueActor(actors[who]);
    const p2 = edges.filter((e) => (e.type === "review" || ["pass", "to-approval", "rework", "respec"].includes(e.move)) && sub(e.from) && sub(e.from) === actor(e.who));
    // P2b: who reviews and who passes, by kind of caller.
    const who2 = [...new Set(edges.filter((e) => e.who === "worker" && e.type !== "part").map((e) => X(e.from)[0] + "." + (e.move || e.type)))].sort();
    // P3: from each state that is not closed, a closed one is reached by the loop's tokens and the approver alone.
    const loop = (e) => ["a", "b", "approver"].includes(e.who) || e.type === "part";
    const back = new Map(); for (const e of edges) if (loop(e)) back.set(e.to, [...(back.get(e.to) || []), e.from]);
    const can = new Set([...states.keys()].filter(isClosed)), q = [...can];
    while (q.length) for (const f of back.get(q.shift()) || []) if (!can.has(f)) { can.add(f); q.push(f); }
    const stuck = [...states.keys()].filter((k) => !can.has(k));
    const anyBack = new Map(); for (const e of edges) anyBack.set(e.to, [...(anyBack.get(e.to) || []), e.from]);
    const can2 = new Set([...states.keys()].filter(isClosed)), q2 = [...can2];
    while (q2.length) for (const f of anyBack.get(q2.shift()) || []) if (!can2.has(f)) { can2.add(f); q2.push(f); }
    const trapped = [...states.keys()].filter((k) => !can2.has(k));
    const brief = (k) => { const x = X(k); return x[0] + "/" + x[1] + (x[2].length ? " [" + x[2] + "]" : ""); };
    report.all = { p1ByWorkflow: byWf,  states: states.size, left: queue.length, edges: edges.length, tried, p1: p1.slice(0, 5).map((e) => [brief(e.from), e.move, e.who]), p1n: p1.length, p1b: p1b.length, p1c, p2: p2.slice(0, 5).map((e) => [brief(e.from), e.type, e.move, e.who]), p2n: p2.length, who2, needOwner: [...new Set(stuck.map(brief))].sort(), trapped: [...new Set(trapped.map(brief))].sort() };
  }
  report.ms = Date.now() - t0; report.took = took; report.byRead = byRead;
  return JSON.stringify(report);
}
```

`walk.ts` compiles the seed with the cell and prints the module's path. It ends with `process.exit(0)`:
without it the process does not end.

```ts
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const root = process.argv[2], cellFile = process.argv[3], policyFile = process.argv[4];
console.error("import needs");
const { SEEDS, seedModule } = await import(resolve(root, "tests/tools/needs.ts"));
const file = JSON.parse(readFileSync(join(root, policyFile), "utf8"));
const policy = file.policy ?? file;
const approver = /delegation:([0-9a-f]{12})/.exec(JSON.stringify(policy))?.[1] ?? "eeeeeeeeeeee";
const data = JSON.stringify({ policy, approver, kinds: (process.argv[5] || "task,security,feedback,project").split(","), cap: Number(process.argv[6] || 3000) });
console.error("building");
const built = await seedModule("brain-issues.ojs", SEEDS, { name: "brain-issues-proto-walk", text: (seed: string) => {
  const cells = seed.split(/^(?=\/\/ %%)/m).filter((c) => !/^(\/\/ %%.*\n)?(\/\/.*\n)*test_\w+ = /.test(c));
  return cells.join("") + "\n// %%\n" + readFileSync(cellFile, "utf8").replace('"__DATA__"', () => data);
} });
console.log(built);
process.exit(0);
```

`run.sh`: the build, then the cell run by `cloud-brain-dev/test.ts`, then the cell's value printed.

```sh
#!/bin/bash
# run.sh W cell policy kinds cap
W=$1; S=$(dirname "$0")
B=$(timeout 100 bun $S/walk.ts $W $2 $3 $4 $5 2>/dev/null | tail -1)
R=$(dirname $B)/report.json; rm -f $R
( cd $W/cloud-brain-dev && timeout ${6:-250} bun test.ts brain-x-issues --with $B --whole --seconds 240 --report $R > /dev/null 2>&1 )
python3 - $R <<'PY'
import json,sys
d=json.loads(open(sys.argv[1]).read().strip().split("\n")[-1])
for t in d["tests"]:
    print(t["name"],t["state"],t.get("error",""))
    if t.get("value"): print(json.dumps(json.loads(t["value"]),indent=1))
PY
```
