# approver-own-files-are-the-policy-cells

`tools/cloud-brain/approver.ts` refused a ref that touched `tools/cloud-brain/brain-issues.ojs` at all.
Part 4 of `plan/cloud-brain-approver-persona.md` has "the policy cells of `brain-issues.ojs`". Written
2026-10-13 by a writer of the issue loop (`impl-dc04fa`), round 1, started at event 5383 (01:00:58
CEST, the event's `at`). A local tool, its test file and one note in the spec: no seed, no deploy.
Round 2, after review 5470, is the last section; the text above it is as the tool stands after it.

**The issue's own check is not met, and no list of cells meets it.** "Known to be met when:
`approver.ts facts bk-3-queue-and-hold --token <token>` no longer marks commit 9141a226 as the
approver's own". Run from the worktree at 01:10 CEST with this change:

```
$ bun tools/cloud-brain/approver.ts facts bk-3-queue-and-hold --token impl-dc04fa
  [policy]   tools/cloud-brain/brain-issues.ojs: issueAllowed, issueReplay, issuePolicyAct, issueApply, issueAct, issuesApp, issues_service, issuesLimits
```

(At 01:39 CEST, with round 2, the same line with `issueEvent` after `issueAct`.) `issueAllowed` is the cell where every guard is asked ("May this caller do this act, by the policy in
the view?"). What 9141a226 did to it, the cell before against the cell after:

```
93a94,99
>   if (act.type === "hold") {
>     // Taking a hold off needs that one is kept.
>     if (act.remove && !i.hold) return no("no such hold", true);
>     // A workflow written before holds has no guard for them: whoever may label may hold.
>     return test(wf.hold ?? wf.label, issue) ? { allow: true } : no("the workflow's hold guard refuses");
>   }
```

A new kind of act is a new branch of that cell. `005d28b0` of `tr-1-wait-in-the-record` added the
branch `wait` the same way, and `4ace22f6` of `bk-2-finish-by-the-service` changed two guards of
`issuesDefaultPolicy` and what a guard reads of an issue's parts. So the three leaves the issue and
comment 5365 name (verdicts 4622, 4858, 5349) are leaves after this change too. Comment 5365 has
tr-1 as "a change to brain-issues.ojs that touches no policy cell"; `facts tr-1-wait-in-the-record`
names `issueAllowed` for the first of its three commits, `issuesApp` for the second and
`issues_service` for the third.

Two ways were open, and the first was taken:

- **A, as built.** The list has the cell that asks the guards. Of the 52 commits `git log` has for
  the seed, 13 touch no policy cell and 39 touch one (the command is under "Counts"). The three
  above stay refused.
- **B, not built.** A list of `issuesDefaultPolicy` alone. 9141a226 and the three commits of tr-1
  would pass the tool; `4ace22f6` would not. A commit that made `issueAllowed` answer `allow` for the
  `approve` move would then be the approver's to judge, by step 6 of its brief.

A by line 1 of `philosophy.md`, "What each one decides": a change that lets a caller do what it
could not "is not made on an agent's judgment", and B lets the approver approve more than A does.
The owner's words pull both ways (comment 4980 of `pm-approver-leaves-everything`, "generally fixes
are better as guards"; the body of that post mortem, "still refusing everything which is the opposite
of its intention"), and the issue is `major`, so the choice reaches him at its approval. B is a
change of the two lists in the tool.

Not tried: reading inside `issueAllowed`, so that a new branch is told from a change to the branch
`move`. The tool would have to read JavaScript, and an added line before the branch `move` changes
it as much as a changed line in it.

## What changed

**`policyCells(before, after)`** takes two texts of the seed, splits each on its `// %%` lines, and
answers the names of the policy cells whose text differs. `seedTouch(git, sha)` asks it of a commit
against each of its parents. `judge` refuses a ref of which it answers a name
(`the ref <r> touches tools/cloud-brain/brain-issues.ojs, its policy cells (<names>): the approver does
not approve a change to itself (R7)`), and no longer refuses one of which it answers none. `check`
judges with `judge`, so it follows.

The policy cells are named in the tool, each with why:

| List | Cells | Followed |
|---|---|---|
| `JUDGE` | `issuesDefaultPolicy`, `issueAllowed`, `issueReplay`, `issuePolicyAct`, `issueApply`, `issueAct`, `issueEvent` | yes: a cell one of them names, however far, is a policy cell |
| `ROUTES` | `issuesApp`, `issues_service` | no: `issuesApp` names 28 cells of the seed |

How the list was made, on the seed at `3afef03f`. Read by its leading comment, each non-test cell
(69 of 132 chunks) was asked: does it hold guards as text, ask a guard, make what a guard reads, or
turn a guard's answer into a refusal or an installed policy.

- `decide(` is called in two cells, `issueAllowed` and `issueWhen`.
- `issueReplay` asks `issueAllowed` of each event of the record; `issuePolicyAct` is the check a
  policy passes at its install.
- `issueApply` makes the view: the policy of a `policy` event, and `by`, `reviews` and the added
  guards of an issue, which a guard reads as `issue.by.start`, `issue.reviews`.
- `issueAct` makes the act from a request's body, from which `issueAllowed` makes the `event` a
  guard reads.
- `issueEvent` makes the event of an allowed act: `policy: act.policy` of an install and
  `guard: act.guard` of a guard added to an issue, which `issueApply` then keeps (round 2).
- `issuesApp` has the lines `if (!issueCaller(ctx.by).present) throw refuse(403, …)` of `install`,
  `resign` and `rebuild`, and `if (!verdict.allow) throw refuse(…)`.
- `issues_service` has the rule of every method, `caller.kind in ['owner','token','worker','deployer']`.

What the seven of `JUDGE` name on that seed, by the tool's own walk: `issuesLimits`, `issueAt`,
`issueActor`, `issueCaller`, `issueFacts`, `issueWhen`, `issueWaitFacts`, `issueAfterWalk`,
`issueRunOf`, `issueCanon`, `issueBytes`. The walk is made on each side of each commit, so a cell
the judge comes to call is a policy cell from that commit with no change to the tool.
`tests/tools/approver.test.ts` holds the eleven on the seed of the checkout.

Left out, each a choice: prose with no `${` in it (`md` cells, among them `## A policy`, where "Who
approves" is; none of the 8 `md` cells of the seed has a `${` today); `test_*` cells; `issueCheck`
and `issueKeys` (how an event is signed); `issueQueue`, `issueWakes` and the panel, which ask `issueAllowed`
whether the caller reads an issue and show less by its answer.

Where the tool cannot tell it names a cell, and so refuses:

| Case | What `facts` prints after the file |
|---|---|
| the file is added or deleted by the commit, or the commit has no parent | `the whole file (it is not read on one side of the commit)` |
| a cell of the two lists is absent or written twice on either side: the commit that renames `issueAllowed`, and every commit of the seed after it until the tool names the new cell | `issueAllowed (not there once on each side of the commit)` |
| code with no name: an import, or prose with `${` in it | `a cell with no name (an import, or prose with ${ in it)` |

A change of a comment above a policy cell is a change of the cell. The same cells in another order
are no change.

**`facts`** marks the seed `policy` with the names, or `tracker` with `no policy cell`. In `--json`
the file has `cells`. `marks(file)` and `own(file)` with no cells given answer as before, `policy`
and `true`.

**`trial`** counts `why: the approver's own files` under that name, and `why: his to weigh` under
its own. The second is the reason `approver-brief-his-test` put in the brief (on `main` at `8eca9cad`,
which came in at this change's rebase) in place of `more than the words`; that record has "The tool
counts the new reason as `other`". It is named here, with this change, because a later change to the
tool is one more install. `more than the words` is still counted, for the verdicts written before. At
01:29 CEST on cb4:

```
of leave:     no word of his 1   his to weigh 0   more than the words 4   not secure 0   could not tell 4   the approver's own files 3   other 0
```

The `--json` answer has two more keys in `whys`.

## Until the owner installs again

The installed policy (event 4668) ends `tool 89632e99fa43626f4137587a66d58470c9da5393`, the blob of
the tool before this change. From this landing `approver.ts approve` makes no move (exit 1, R7)
until a policy is installed whose reason names the new blob. That is part 4 of the spec, and the
issue's body says it. `plan/cloud-brain-issues-policy-v4.json` was not changed here (comment 5365).

## Counts

Each run in the worktree on 2026-10-13 after the last edit of the file it counts; the command is the
line above its answer.

```
$ bun test --timeout=30000 ./tests/tools/approver.test.ts ./tests/tools/approver-brief.test.ts
 48 pass
 0 fail
```

(656 `expect()` calls, at 01:39 CEST, round 2.) Two tests are new. The first fails on the tool as it was (`APPROVER_TS=<the file of 3afef03f>`), at
its first ref, a commit that changes `issuesPanel` alone:

```
error: panel
+   "the ref lopecode-dev@5ac557d3… touches tools/cloud-brain/brain-issues.ojs: the approver does not approve a change to itself (R7)",
```

The refusal of a ref that touches a policy cell held on the tool as it was, for the whole file; what
is new of it is the names in the reason. `tests/tools/approver-brief.test.ts` is not changed: as
`approver-brief-his-test` landed it, it takes a reason of the brief under its name where the tool has
one and under `other` where it has not.

The 52 commits, by `seedTouch` over `git log --format=%h -- tools/cloud-brain/brain-issues.ojs`
at `3afef03f`, with the tool of round 2: `{"commits":52,"noPolicyCell":13,"policy":39}`. The tool of
round 1 answered 20 and 32. The seven that moved are commits of 2026-10-10 that change a prose cell
which then had a `${`; `5cd71020` of that day (23:29:29 +0200) took the last one out of prose. Of the
30 commits after it both tools answer the same: 12 touch no policy cell, 18 touch one. One of the 39
is the commit that added the file.

On cb4, read only, 01:10 CEST: `facts ow-2-panel-offers-what-it-shows` and
`facts fm-2-open-stays-submits` print `[tracker]  tools/cloud-brain/brain-issues.ojs: no policy cell`
for each of their commits of the seed; `facts ap-4-policy-v3` prints `[policy]` for its
`plan/cloud-brain-issues-policy-v3.json` and `[tracker]` for its two commits of the seed, which
change the prose of `## A policy` and a test.

## Not tried

- An `approve` run on cb4 with this tool: none is made until the install.
- A merge commit made by git. The test gives `seedTouch` two parents through a stand-in for
  `parents`. `git log --merges --oneline -- tools/cloud-brain/brain-issues.ojs` prints no line at `3afef03f`.
- A cell written `function name(…)`, `viewof name =` or `mutable name =`: the seed has none of the
  three among its policy cells, and no test writes one.
- A seed whose cells are split by another line than `// %%`.
- Whether an approver, shown `[tracker]`, approves: the brief's step 6 names the mark `policy` and
  not `tracker`, and the brief is the other writer's file this round.
- The split is the tool's own line and not `splitSeed` of `tools/spec-notebook.ts`, which
  `build.ts` uses: the policy pins this file by blob, and an import would not be pinned. The two
  were not compared by a test; both are `text.split(/^\/\/ %%.*$/m)`, trimmed, with the empty left out.

## Round 2, 2026-10-13, after review 5470

One finding held the change, and it was true: the walk read a cell's words with
`(?<![\w$.])[A-Za-z_$][\w$]*`, where the `.` was there for `x.name`, and so dropped the name after
`...`. A cell the judge reached by a spread alone was not followed. The same two texts, a seed whose
`issueAllowed` is `({ ...issueSpread(by) }).allow`, with `issueSpread` changed between them:

```
[]                  policyCells of the tool of round 1 (d7a97441)
["issueSpread"]     policyCells of this one
```

- **The walk takes every word that is a cell's name, whatever stands before it.** The `.` is out of
  the lookbehind. `x.name` is then followed too where `name` is a cell; on the seed of the checkout
  the walk finds the same eleven cells as before (`tests/tools/approver.test.ts`, the second new
  test). The test has the judge reach `issueSpread` by a spread alone, and a commit of that cell
  alone is refused.
- **`issueEvent` is in `JUDGE`** (the review's note: "The owner may want it in the list"). It names
  `issueAt`, `issuesLimits` and `issueRunOf`, which were followed already. Of the 52 commits it
  moves none from one side to the other.
- **Prose with `${` in it is code with no name** (the review's note). It costs the seven commits
  under "Counts", all from before prose lost its expressions, and none since.
- Named here and not later for the reason the review gives: each change to this file is one more
  install by the owner.

**What `[tracker]` does not say** (the review's note, not mended): the tool compares the text of the
policy cells. A cell that is none of them can write into one when it runs,
`issuesView = (issuesDefaultPolicy.workflows = {}, 0) || …`, and a commit of it answers `[]`. The
approver reads the diff for that at step 6 of its brief; the tool does not.

Counts of round 2, each after the last edit: the two test files, 48 pass, 0 fail, 656 `expect()`
calls; the four files that import the tool
(`… ./tests/tools/issues-policy-v3.test.ts ./tests/tools/issues-policy-v4.test.ts` beside the two),
61 pass, 0 fail. On cb4 at 01:39 CEST: `facts ow-2-panel-offers-what-it-shows` prints
`[tracker]  tools/cloud-brain/brain-issues.ojs: no policy cell`, and `trial` prints
`verdicts 15   approve 2   leave 13`, of the leaves `the approver's own files 4` and `other 0`.
The whole suite was not run in round 2 by the writer; the reviewer ran it on round 1 (review 5470:
936 pass, 0 fail).
