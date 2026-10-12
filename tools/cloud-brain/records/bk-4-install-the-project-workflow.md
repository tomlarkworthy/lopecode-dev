# bk-4-install-the-project-workflow

Task 4 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, event 4148): the
body of the `issue.install` after which an open part that is feedback no longer holds its project
at `building`, tried in the tracker's rig over a copy of cb4's open projects. Written 2026-10-12 by
a writer of the issue loop (`impl-284cb7`), round 1, started at event 4920 (22:43 CEST, `date`
before the call). The commits are refs of the submit.

**cb4 runs no new policy after this landing.** The policy in force is the one of event 4668. The
file is data. The install is the owner's (`rules.md`, Never) and was not sent, with any token.
Nothing was deployed: no seed changed.

## What changed

- `plan/cloud-brain-issues-policy-v4.json`, new: `{ key, reason, policy, migrate }`.
- `tests/tools/issues-policy-v4.test.ts`, new: 8 tests, 6 of them over one run of the rig.
- `tests/tools/fixtures/bk-4-open-projects.json`, new: the copy of cb4's open projects.
- `tests/tools/fixtures/bk-4-install-rig.ojs`, new: the one cell the rig run adds to the module.
- `tests/tools/needs.ts`: `seedModule(seed, into, edit)` takes an edit of the seed's text and
  writes the module under the edit's name. `tests/tools/needs.test.ts`: one test of it.
- `plan/cloud-brain-bookkeeping-in-the-tracker.md`: "(As built …)" at part 5, at task 4 and at the
  first line of "Not tried, not known". `plan/cloud-brain-issues.md`, "Installing it": that v3 was
  installed, and what v4 is.

## The file is made from the policy in force, not from the cell

The spec's task 4 says "from the built cell", with a `migrate` from `39d9f385…`. Between the spec
and this task the owner had `plan/cloud-brain-issues-policy-v3.json` installed (event 4668), which
changed two `approve` guards and gave the task and the project workflow new hashes. Comment 4609 on
this issue (the writer of `ap-4-policy-v3`) and comment 4897 (the orchestrator) say what a body
made from the cell alone would do: put those two guards back to `caller.present`. So the file is
the policy `issue.policy` answered, with the cell's two guards.

A script made it, not typed. Its inputs: the answer of `issue-as.sh impl-284cb7 policy`
(22:38:53 CEST), the v3 file, and the cell `issuesDefaultPolicy` of this checkout's
`brain-issues.ojs`, compiled by `seedModule` of `tests/tools/needs.ts`. What it printed, 22:44:43 CEST:

```
in force seq 4668 equals the v3 file's policy, key order too: true
decompose | caller.kind in ["owner", "token"] && issue.children.open > 0 -> caller.kind in ["owner", "token"] && issue.children.work > 0
finish | caller.kind in ["owner", "token"] && issue.children.open == 0 -> caller.kind in ["owner", "token"] && issue.children.work == 0
v4 with approve put back equals the cell: true
reason 1010 migrate [ "9011113c423d643de477f9e8fb494e26cc44b5a8d97f9991fe1e1323d3ab7f13" ]
```

The script is not kept. The first test of the file holds both derivations: the two guards put back
give the v3 file's policy, and the cell with v3's two `approve` guards gives this one.

`git diff --no-index plan/cloud-brain-issues-policy-v3.json plan/cloud-brain-issues-policy-v4.json`,
the lines that differ, with the reason cut:

```
- "key": "policy-2026-10-12-approver-v3",
+ "key": "policy-2026-10-12-project-children-work-v4",
- "reason": …
+ "reason": …
-      "guard": "caller.kind in [\"owner\", \"token\"] && issue.children.open > 0"
+      "guard": "caller.kind in [\"owner\", \"token\"] && issue.children.work > 0"
-      "guard": "caller.kind in [\"owner\", \"token\"] && issue.children.open == 0"
+      "guard": "caller.kind in [\"owner\", \"token\"] && issue.children.work == 0"
-  "8dd86dbd172406ee6a6800221bc678184a92c70bc53378f69217859658fd864a": {
-   "workflow": "task"
-  },
-  "39d9f385f5a08460eb07a44a7d82ebfbce6a2287fea70b081416138fe1b36ea2": {
+  "9011113c423d643de477f9e8fb494e26cc44b5a8d97f9991fe1e1323d3ab7f13": {
```

**`migrate`** names one hash, `9011113c…`, to `project`, with no state mapped. It is
`policy.names.project` of the answer above. The task, security and feedback workflows do not
change, so their hashes do not, and no issue of theirs is swapped: seen in the rig (below), not on
cb4.

**`reason`** is 1,010 characters; an install takes 2,000. It has the owner's sentence from the body
of `bookkeeping-in-the-tracker` (event 3962), the reason of his `approve` of the spec (event 4148,
"A") and choice A as comment 4035 put it to him ("As written, with the install."), what changes,
and last `approver brief 9956b9aa3debe4c9d6d3434868f1efaa98b525f7 tool 89632e99fa43626f4137587a66d58470c9da5393`.

**The last line of the reason is what the approver needs.** `approver.ts` makes no `approve` under
a policy whose reason does not end with the blobs of its brief and of itself (`approver.ts`, lines
255 to 261, its R7). An install writes the reason too, so a body without that line would end the
approver's approvals as the wrong guards would. The two blobs are those the reason of event 4668
ends with, and `git rev-parse origin/main:<path>` gave the same two for `agents/approver.md` and
`approver.ts` at 22:51:21 CEST. The second test compares them with the blobs of the commit the file
was last changed in, as `issues-policy-v3.test.ts` does for its file.

## The rig run

`issuesRig` is a cell of `brain-issues.ojs` and reads `simulate` of `@tomlarkworthy/cloudflare-iac`.
`tools/notebook-import.ts` does not resolve an import of another module, so the cell cannot be
taken from the compiled seed alone. `cloud-brain-dev/test.ts <worker> --with FILE` runs a module's
`test_*` cells beside the other modules as `cloud-brain-dev/deploy/` has them. The test compiles
this checkout's seed with its own `test_*` cells left out and one cell added
(`fixtures/bk-4-install-rig.ojs`, with the two bodies and the fixture written into it), and runs
that file with `--with`. The cell asserts nothing and returns what the rig answered as JSON; the
assertions are in the test file. No cell was added to the seed, so there is no deploy.

**The copy.** `fixtures/bk-4-open-projects.json` is from `issue-as.sh impl-284cb7 snapshot` at
event 4903 (22:40:08 CEST): the 14 open issues on the project workflow (13 at `building`, 1 at
`approved`) and their 93 parts, each part with its kind and, when open, its workflow and state. 3
of the record's 410 issues are not shown to the token; none is a part of these 14. In the rig each
project is opened under its id and kind with its labels and taken to its state by the moves of the
workflow, each part is opened under it, a part closed on cb4 is closed with `close`, and an open
task part is taken to its state (`open`, `triaged`, `ready` or `in-progress`). What the copy does
not have: bodies, comments, links, holds, the guard added to one issue (`extra`, on 3 of the 14),
who made each move, and the true end of a closed part (`done`, `rejected`: all are `closed` here).
Two issues that are not cb4's are added for the approver's guard: a spec and a `major` task, each
at `awaiting-approval`.

What the run answered, each line an assertion of the test:

| what | answer |
|---|---|
| the v3 file installed into the empty record | the four hashes `issue.policy` answered on cb4, so the rig's `9011113c…` is cb4's |
| before the install: `finish` of `group-invites` by a token, and `finish` entries of `issue.queue` | 403 `the guard of finish refuses`; none |
| the install, with the body as the file has it | 200; `moved` the 14 and the added spec; `left`, `relinked`, `unlinked` empty |
| the hashes after it | `task`, `security`, `feedback` as before; `project` another |
| the events it wrote | 1 policy, 15 swaps (each from the old hash to the new, the state kept), 1 finish |
| `group-invites` | `done`. Its last event is the service's own move, key `auto/<seq of its swap>/group-invites`, by the owner present, the caller of the install |
| the 12 other projects at `building`, each with an open task part | `building`; `finish` by a token 403 |
| `tracker-trigger-rules`, at `approved` with no part | `approved`; `decompose` 403 `the guard of decompose refuses` |
| `issue.queue` after it | no `finish` entry |
| `approve` of the added spec and task by a token of another delegation | 403 twice |
| the same by `delegation:eb3db9d0c6a5` | 200 twice, to `approved` and to `done` |
| the same body sent again | 200, `duplicate: true`, nothing moved |
| `issue.verify?guards=true`, after the install and at the end | `ok: true` |

**The finish is made in the install's own call.** The spec's part 5 says "the first event of
`group-invites` or of its parts makes the finish, or the queue lists it". The swap of the install
is that first event: `append` of `brain-issues.ojs` looks at the issue of an event it writes, when
the event is no policy event and the issue's workflow has a move of `issuesLimits.auto` from its
state (`due`, line 1220), and the swap of a project at `building` is such an event. So in the rig the install left nothing for the queue to list,
and the finish has `by` of the install's caller. The answer of the install does not name it
(`auto` is not in it). On cb4 the finish would be the owner's own, with `auto`.

**What the test fails on.** Four wrong bodies, each run and then put back (between 22:46:58 and 22:49:05 CEST),
the counts `pass`, `fail` of `bun test --timeout=120000 ./tests/tools/issues-policy-v4.test.ts`:

| the body | result |
|---|---|
| the two guards as v3 has them (`children.open`) | 5, 3: the derivation, `moved` (no hash changes, so nothing moves), the finish |
| the reason without its last line | 7, 1: the reason |
| `approve` of `project` as the cell has it, `caller.present` | 6, 2: the derivation, the approver's approve |
| `migrate` from `39d9f385…`, the spec's hash | 4, 4: the rig answers 400 `the record keeps no workflow of that hash` |

The last is the rig's answer, whose record never had that hash. cb4's record has it: the answer
of `snapshot` lists it among `workflows`, with 14 closed issues on it, and the refusal reads that
list (`issueAt(was.workflows, old)`, line 1312). So that refusal would not be given there, and no
open project is on that hash to be moved. Read, not run.

## Counts

| command | result |
|---|---|
| `bun test --timeout=120000 ./tests/tools/issues-policy-v4.test.ts` | 8 pass, 0 fail, 66 expect() calls |
| `bun test --timeout=30000 ./tests/tools/needs.test.ts` | 10 pass, 0 fail |
| `tests/tools/suite.sh`, after the rebase on `origin/main`, 22:49:05 to 22:51:08 CEST | 760 pass, 0 fail, 5079 expect() calls, 760 tests in 80 files, 122.35 s; `uptime` after it 9.69 |

The suite's run is after the last change to a test, a fixture, the file or `needs.ts`. Only this
record and nothing else was written after it.

## For the owner, and when

Not run on cb4: needs the owner present.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v4.json
```

From the main checkout, once it has the file. The spec's "Not tried" asked whether `-d @file`
sends a file as the body: the install of event 4668 was sent that way and answered 200 (comment
4725 of `ap-4-policy-v3`).

Three things are read first, each by anyone:

- `issue-as.sh <token> policy`: `policy.seq` is 4668. If another policy was installed since, the
  file is made again from that one: it would undo it.
- `git rev-parse origin/main:.claude/skills/brain-maintenance/agents/approver.md origin/main:tools/cloud-brain/approver.ts`
  prints the two blobs the reason ends with. If the brief or the tool changed, the reason is
  written again, or the approver makes no approve after the install.
- `issue-as.sh <token> "list?state=spec-review"` is empty: a swap empties `issue.reviews`, and a
  spec with its passing review written and its `to-approval` not made would need the review again.
  At 22:51:21 CEST it answered `{"issues":[]}`, and none of the 14 projects of the snapshot had a
  review. An issue at `in-review` is a task or a bug: its workflow is not swapped.

## Not tried

- **The install on cb4**, and so the row R4 of the spec's table: `group-invites` at `done`. At
  22:51:21 CEST it was at `building` with one open part, `fb-a24kt7jw3q`.
- **`issue.verify?guards=true` on cb4 after the install.** In the rig it is ok over a record the
  rig made. cb4's record has events the copy does not.
- **The copy's limits**, listed above. A project with a guard of its own (`extra`) was not made in
  the rig; `issueApply` leaves `extra` at a swap, read in `records/ap-4-policy-v3.md` and not run here.
- **A project at `spec`, `spec-review` or `awaiting-approval`.** cb4 had none at event 4903. The
  added spec at `awaiting-approval` is the one case run; the cell throws for a state it has no
  way to.
- **A project whose only open parts are feedback and which has a link `after`, a hold or the label
  `needs-owner`.** `group-invites` has none of them. Whether the service's finish is held by one
  was not looked at.
- **What the page draws** for a project finished this way.
- **The six open feedback parts of the spec's count.** The snapshot has 9 open feedback parts
  under these 14; only `group-invites` has no other open part. The others finish when their last
  task part ends, which is `bk-2-finish-by-the-service`'s and was not run here.
- **The cluster's browser.** No browser ran: the rig is run by `test.ts` in bun.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`): "policy install migrate
project workflow feedback part", "issue.children.work finish guard install body", "approver pins
reason of the policy in force". First of each: `doc:cloud-brain-bookkeeping-in-the-tracker` twice,
`doc:cloud-brain-approver-persona`. Used: the spec, `plan/cloud-brain-issues.md` "Installing it",
and `tools/cloud-brain/records/ap-4-policy-v3.md`, "Another install waits beside this one".
Nothing else bore on it.
