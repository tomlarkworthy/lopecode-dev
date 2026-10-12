# ap-4-policy-v3

Task 4 of `plan/cloud-brain-approver-persona.md` (approved by the owner, event 4123): the body of the
`issue.install` that lets one token, `loop-approver`, make the `approve` move of a task and of a
spec; a test of that policy in a rig; and the paragraph of the tracker's reference on who approves.
Written 2026-10-12 by a writer of the issue loop (`impl-17c3c7`), round 1, started at event 4472
(21:17:28 CEST, the event's `at`). The commits and the deploy are refs of the submit.

**Nothing on cb4 lets a token approve after this landing.** The policy in force is still the one of
event 483, whose three `approve` guards are `caller.present`. The file is data. The install is the
owner's (`rules.md`, Never), and it was not sent, with any token. What cb4 runs differently:
`brain-x-issues` has one more test cell and one more paragraph of prose.

## What changed

- `plan/cloud-brain-issues-policy-v3.json`, new: `{ key, reason, policy, migrate }`.
- `tools/cloud-brain/brain-issues.ojs`: the cell
  `test_issues_an_approver_delegation_approves_and_no_other_token`, and a paragraph "Who approves"
  at the end of the `md` cell `## A policy`. No other cell changed: the service is as it was.
- `tests/tools/issues-policy-v3.test.ts`, new: 5 tests of the file.
- `plan/cloud-brain-approver-persona.md`: "(As built …)" at two rows of the table of checks and at
  task 4, and a paragraph for task 4 under "As built". `plan/cloud-brain-issues.md`, "Installing
  it": one sentence that names the file.

## The file

Made by a script from `plan/cloud-brain-issues-policy-v2.json`, not typed. The whole difference of
the two `policy` objects, `git diff --no-index` of the two files:

```
-      "guard": "caller.present"
+      "guard": "caller.present || caller.actor == \"delegation:eb3db9d0c6a5\""
-      "guard": "caller.present"
+      "guard": "caller.present || caller.actor == \"delegation:eb3db9d0c6a5\""
```

They are the `approve` of `task` and of `project`. The `approve` of `security` is `caller.present`.

**The policy it starts from is the one in force**, as the spec's task 4 has it ("the policy of event
483 with the two `approve` guards"). `issue-as.sh impl-17c3c7 policy`, 2026-10-12: `policy.seq` 483,
and each of its 4 workflows equals the v2 file's, key for key; again 483 at 21:44 CEST.
`tests/tools/issues-policy-v3.test.ts` holds the file against the v2 file.

**It is not the seed's default policy any more.** When the file was written the cell
`issuesDefaultPolicy` equalled the v2 file's policy (the built module, read with
`tools/notebook-import.ts`: `true`). At the landing's rebase, 21:43 CEST, `bk-2-finish-by-the-service`
had come in, and the same script printed the whole difference of the cell and this file:

```
task.approve      default: caller.present                      v3: caller.present || caller.actor == "delegation:eb3db9d0c6a5"
project.approve   default: caller.present                      v3: the same guard
project.decompose default: … && issue.children.work > 0        v3: … && issue.children.open > 0
project.finish    default: … && issue.children.work == 0       v3: … && issue.children.open == 0
```

The last two are the other project's, and cb4 does not have them either: they wait for an install
of their own ("Another install waits beside this one", below).

**The id.** `eb3db9d0c6a5` is the delegation of `loop-approver`, read as the spec's part 1 has it:
`bun tools/cloud-brain/approver.ts id`, run in the worktree at 21:17:54 CEST, printed
`delegation:eb3db9d0c6a5`, exit 0. It wrote event 4475 on this issue, key `approver/id`, whose `by`
is `via delegation:eb3db9d0c6a5`, `holder secret:loop-approver`. Before it no event from 4301 on had
that holder (`sync?after=4300`). That one comment was written with `loop-approver` and not with this
writer's token: see "For the overseer" in the issue's comment.

**`migrate`** names two hashes, `8dd86dbd…` to `task` and `39d9f385…` to `project`, with no state
mapped: every state keeps its name. They are `policy.names.task` and `.project` of the `issue.policy`
answer above. `issue-as.sh impl-17c3c7 snapshot` at event 4493 (21:23:36 CEST): of 386 issues, 3
not shown to the token, the open ones are on three hashes and no other:

```
8dd86dbd1724 (task)      41 open
39d9f385f5a0 (project)   14 open
f0eab0a2346e (feedback)  26 open
```

So an install then would have written 55 swap events. `security` and `feedback` are not named: their
JSON does not change, so their hash does not (the rig: `installed.hashes.security` equals the one
before).

**`reason`** is 1,103 characters; an install takes 2,000 (`issuesLimits.reason`). It has three
sentences of his, each copied from the event it names: the request (the body of event 4112), "No it
can approve anything if that's what I have asked for" (comment 4115), and the reason of his
`approve` of the spec (event 4123, `via session`, a UUID for its key). Then what changes, and last
`approver brief 9956b9aa3debe4c9d6d3434868f1efaa98b525f7 tool 89632e99fa43626f4137587a66d58470c9da5393`.
`git rev-parse origin/main:<path>` gave those two for `agents/approver.md` and `approver.ts` after a
fetch at `1d545375`; they are the two of the orchestrator's comment 4351. The test compares them
with the blobs of the commit the file was last changed in, so a rebase that brings in a changed
brief or tool fails it before the push.

**The command for the owner.** Not run on cb4: needs the owner present.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v3.json
```

`brain.ts curl` hands what follows the path to `curl` (`brain.ts`, the branch `curl`). That `curl -d
@FILE` sends this file as the JSON it is was run against a server on this machine that compared the
body with the file: `{"same":true,"type":"application/json","reason":1103,"key":"policy-2026-10-12-approver-v3"}`.
The call against cb4 was not made.

## The rig test

`test_issues_an_approver_delegation_approves_and_no_other_token`. The policy is the cell
`issuesDefaultPolicy` (as the seed has it at the landing, with `issue.children.work`) with the guard put on the two `approve` moves, for a stand-in id
`0123456789ab`; a Worker's test cannot read a file of `plan/`. Every token in it calls as a token
reaches the service on cb4: `x-brain-caller: owner`, `x-brain-via: delegation:<id>`, a named holder,
no tab. Its value: "the named delegation approved 3 (2 that waited at the install, 1 opened after);
37 acts refused: …".

| what | answer |
|---|---|
| the approver's token, `approve` of a task and of a spec, under the default policy | 403 `the guard of approve refuses` |
| `issue.install` by the approver's token, and by 7 other callers | 403 `the owner, present` |
| the owner's install with the `migrate` | 4 moved (a task and two specs at `awaiting-approval`, a task at `in-review`), none left; `security` and `feedback` keep their hash; the security issue stays where it was |
| a task at `in-review` whose `pass` review was written before the install | `to-approval` 403 until it is reviewed again |
| `approve` of the task and of the spec by 7 other callers (three tokens by delegation, `token:a`, a Worker, a member, the owner in no tab) | 403, 14 times |
| the approver's token, a spec narrowed with `caller.present` by another token | 403 `this issue's guard N on approve refuses` |
| the removal of that guard, by the approver's token and by the token that put it on | 403 `the owner, present` |
| the same spec after the owner's `send-back`, a new `submit-spec`, a new `pass` and `to-approval` | 403 again, the same message; the owner present then approves it |
| the approver's token, `approve` of the task and of the spec that waited at the install | 200, `by.via` the delegation, `by.holder` `secret:loop-approver` |
| a task opened after the install: `done` from `open`, `done` from `in-review` with no review | 403 |
| the same at `awaiting-approval`: `major` taken off, `owner-reject` | 403 |
| the same, `approve` | 200 |
| `revert` of the approved task, `owner-reject` of the approved spec, by the approver's token | 403; the owner present then makes each |
| an issue of the security workflow at `awaiting-approval`: `get`, `approve`, `narrow` | a stub with `hidden: true`; 404 `no such issue` twice; the owner present approves it |
| `issue.policy` to the token | the `reason` ends `approver brief <40> tool <40>` |
| `issue.verify?guards=true` at the end | ok |

**It fails without the guard.** The built module with `named` made to return the workflow as it is
(`sed` on the copy `--with` reads, the seed not touched): `bun test.ts brain-x-issues --with <copy>`
gave `39 1 15` (passed, failed, needsBrowser), the one failed this cell, at the first thing the policy changes (nothing moved by
the `migrate`, since no hash changed).

The spec's sentence was "403 on one narrowed with `caller.present`, again after that issue is sent
back, submitted and passed anew". A task has no move back from `awaiting-approval` (its moves from
there are `approve` and `owner-reject`), so the narrowed issue is a spec, which has `send-back`.

## Counts

The first four after the landing's rebase and the last change to the seed, 2026-10-12, 21:44 to 21:46 CEST; the suite's two rows are from before that rebase.

| command | result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>` | `passed` 40, `failed` 0, `needsBrowser` 15 |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `tests` 55, `passed` 55, `failed` [] (Chrome 151) |
| `cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `from` `["document"]`, `byChance` `[]`; `tests` 55 a run |
| `bun test ./tests/tools/issues-policy-v3.test.ts` | 5 pass, 0 fail, 29 expect() calls |
| `tests/tools/suite.sh`, 21:31:26 to 21:36:19 CEST | 686 pass, 4 fail, 2 errors, 690 tests in 69 files, 293 s. The 4 are tests of `summarize-papers.test.ts` (3) and `knowledge-docs.test.ts` (1), each "timed out after 30000ms"; the 2 errors are of those tests. `uptime` after it: load averages 17.03 20.04 19.29 |
| `bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts ./tests/tools/knowledge-docs.test.ts`, after it | 42 pass, 0 fail, in 258 s |

55 is 40 + 15: the browser's count equals the headless `passed + needsBrowser`. Before the rebase the three were 39 and 15, 54, and 20 of 20 with 54 a run: `bk-2-finish-by-the-service` added a test cell.

The suite did not give 0 fail on this machine that evening. A run before it (ended about 21:31) gave
the same four numbers with a timeout in a test of the same two files; other agents of the loop were
running. Neither file reads anything this change touches, and the two pass alone. The suite with 0
fail was not seen; a later run is in the issue's comment when one was made.

## What an install does that is not the guard

Read in `issueApply` and seen in the rig, and for the owner to know before he installs:

- **A swap empties `issue.reviews`.** Each open issue of the two workflows is moved by a swap. One
  at `in-review` or `spec-review` with its passing review written and its `pass` or `to-approval`
  not yet made is refused that move afterwards, until it is reviewed again. The rig has the case.
  `plan/cloud-brain-issues.md`, "Installing it", said the same of the policy before this one:
  "install with none waiting there". A snapshot at event 4502 (21:25:53 CEST) had two issues at
  `in-review`, none at `spec-review` and one at `awaiting-approval`.
- **A guard added to one issue is kept.** The swap leaves `extra` as it is (`issueApply` changes the
  workflow, the state, the reviews and the links). Read, not run: the rig narrows after the install.
- **A swap is a move to the flow counts.** The reference of `issue.flow` says a swap "ends a stay
  and begins another". The 55 open issues would each begin a new stay at the install. Not measured.

## Another install waits beside this one

`plan/cloud-brain-bookkeeping-in-the-tracker.md`, task 4 (`bk-4-install-the-project-workflow`, at
`triaged` at 21:44 CEST): its writer "makes the body of the install from the built cell
(`{ key, policy, migrate: { "39d9f385…": { workflow: "project" } }, reason }`)". That body is the
default policy, whose `approve` guards are `caller.present`, and this file is the policy of event
483, whose `decompose` and `finish` read `issue.children.open`. Each install writes the whole
policy. So, read from the two files and `issue.install`, with neither install made:

```
this file first, then bk-4's body   the two approve guards go back to caller.present: no token approves
bk-4's body first, then this file   decompose and finish read .open again; the open specs are on bk-4's
                                    hash, which this file's migrate does not name, so they stay on a
                                    workflow whose approve is caller.present
```

Whichever is installed second is written again from the policy then in force: its policy with the
other's guards, and a `migrate` from the hashes `issue.policy` then answers. This task did not fold
the two into one file. The spec the owner approved says "the policy of event 483 with the two
`approve` guards", and a file that also changed when a project is done would be more than he was
shown for this task. It is said in the issue's comment, to the owner and the orchestrator, and in a
comment on `bk-4-install-the-project-workflow`.

## Not tried

- **The install on cb4**, and so everything that follows from it there: a real `approve` by
  `loop-approver`, the 404 on a security issue, `approver.ts approve` passing its three blob
  comparisons against `issue.policy`.
- **The file itself was installed in no rig.** The rig installs the seed's policy with a stand-in
  id, and since `bk-2-finish-by-the-service` that policy also differs from the file's in `decompose`
  and `finish` of `project` (the difference above). What ties the two is the guard's text and the
  test of the file, which holds it against the v2 file.
- **`approver.ts approve --policy <file>`** on a made record with this file was not run. The test
  calls `judge` with the file as a `policy` event and reads the delegation and exit 1 (no verdict),
  not a move it would send.
- **A closed issue opened again after the install.** It stays on the workflow it was closed under,
  which the policy in force does not list. Read in `judge`: no delegation is read and nothing is
  sent (exit 3). Not run.
- **A second install of the same file** after `loop-approver` is revoked and made again was not
  tried; the id would be another and the file is written again.
- **The cluster's browser** (Chrome 128). The 20 runs of `verify-run.ts` are Chrome 151 on this
  machine. The deployer's own run at the apply is the one run of the new cell there; its verdict is
  in the issue's comment.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`): "policy install migrate
workflow hash open issues" (first: `doc:cloud-brain-bookkeeping-in-the-tracker`, then
`doc:cloud-brain-dev-philosophy`, `doc:changing-and-deploying-a-cloud-brain-worker`,
`doc:cloud-brain-issues`) and "approve guard names a delegation approver" (first:
`doc:cloud-brain-approver-persona`). Used: `plan/cloud-brain-issues.md`, "Installing it", for the
review lost in a swap, and the spec. Nothing else bore on it.
