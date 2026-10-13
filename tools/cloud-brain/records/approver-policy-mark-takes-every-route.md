# approver-policy-mark-takes-every-route

`tools/cloud-brain/approver.ts` marked every change to the cells `issuesApp` and `issuesLimits` of
`tools/cloud-brain/brain-issues.ojs` as a change to a policy cell, so the approver left every task
that changed a route or a limit of the tracker. The owner's plan is C of comment 6284 of the issue,
as comment 6384 has his answer: "the mark takes only the install, rebuild and resign routes, the
refusal on a guard's answer, and the limits a judge reads", and "where the tool cannot cut the cell
into those parts it marks the whole cell as now". Written 2026-10-13 by a writer of the issue loop
(`impl-669077`), round 1, started at event 6394. A local tool, its tests, the approver's brief, one
policy file and two notes in specs: no seed, no deploy.

**cb4 does not run a new policy, and the approver approves nothing until the owner installs
`plan/cloud-brain-issues-policy-v6.json`.** The tool and the brief are two files the policy in
force names by their blobs; this change is to both. "For the owner" below has the one call.

## The check of the issue

"`approver.ts facts` of lopecode-dev 489aea7a prints no `[policy]` mark". With the tool as it was
(put in the worktree's `tools/cloud-brain/approver.ts` for the run, then put back) and with this
change, both at 10:43 CEST, after the rebase:

```
$ bun tools/cloud-brain/approver.ts facts tr-4-held-read --token impl-669077      # before
  [policy]   tools/cloud-brain/brain-issues.ojs: issuesApp, issuesLimits
$ bun tools/cloud-brain/approver.ts facts tr-4-held-read --token impl-669077      # after
  [tracker]  tools/cloud-brain/brain-issues.ojs: no policy cell
```

"and of a commit that changes the `install` route or a guard's refusal prints one; each with a
test": no commit of the history changes the `install` route alone, so these are the seed of the
checkout with one thing changed, in `tests/tools/approver.test.ts` ("issuesApp and issuesLimits are
marked by their policy parts, on the seed as the checkout has it"). The commit 489aea7a itself is
the next test of that file, read from the history of the checkout.

## What changed

**`policyCells(before, after)`** in `approver.ts` still answers the names of the policy cells whose
text differs between two texts of the seed. For two of them it now compares parts, and names the
parts that differ in brackets: `issuesApp (the route install, judge)`, `issuesLimits (key)`. A cell
of the two with no policy part that differs is not named. Every other cell is compared whole, as
before.

The two cells are parsed with `acorn`, which `package.json` has already (`"acorn": "^8.18.0"`;
`tools/lope-preflight.ts` imports it the same way). No dependency is added.

**`issuesApp`** is one block. `appParts` reads its statements as declarations (`const judge = …`,
each declared name a part), routes (`app.get(NS + "name", …)` or `app.post`) and whatever else. The
policy parts:

| part | what it is | why |
|---|---|---|
| the routes `install`, `rebuild`, `resign` | each `app.post` statement whole | the three the tool's reason for the cell names |
| the routes `policy`, `sync` | each `app.get` statement whole | `approver.ts` reads the policy in force, with the reason its two blobs are in, from the first, and the record from the second |
| `judge` | the declaration whole | where `issueAllowed`'s answer becomes the thrown refusal |
| a declaration that names a guard, or names such a declaration, however far | whole | `write` names `judge`, `append` names `write`, `shownEvent` names `shown` |
| a statement that is no declaration and no route | whole, in order | the loop that makes the eleven write routes, `return app`, and an `app.use` if one is written |
| in the other routes, a statement that names a guard or such a declaration | the statement it is of the innermost function with a body in braces, in order | a guard asked in a read route: `if (id !== undefined && issueAllowed(…).allow) await ahead(view, id);` in `wakes` |
| a declaration that one of the parts above names, however far | whole | `load` reads the policy into the view every guard is asked of; `L` is the limits |

"A guard" is one of the seven cells of `JUDGE` or `issueCaller`, which says whether the caller is
present. On the seed of the checkout, printed by a script of the scratchpad that calls `appParts`
(exported for this and for no test), at 10:43 CEST:

```
routes written out in the cell: 18 attach install snapshot sync get runs attachment list queue wakes policy key flow verify resign rebuild lock locks
policy parts: 34
 routes: the route install, the route sync, the route policy, the route resign, the route rebuild
 declarations: app, NS, S, L, J, refuse, made, keys, schema, signer, wait, who, load, metaRows, issueRow, judge, ahead, write, autoFrom, append, run, callerKey, wrote, shown, shownEvent, current, walk
 limits the parts read: afterWalk, auto, autoDepth, key, page, reason, rebuildRounds, syncMs, syncPage, wakeAfter
```

(34 is 5 routes, 27 declarations and the two lists of statements.) So a route that is none of the
five is a part only by the statements in it that ask a guard, and a new route by those it has.
The commit of `tr-4-held-read` moved the guard statement of `wakes` into a function inside the
route and left its text as it was: the list of such statements is the same on both sides.

**Not cut, and so named whole (`issuesApp`), when on either side:** the cell is not one block that
parses; a declaration is of more than one name (`const { a } = …`); a declared name or a route
stands twice; `judge` is not a declaration; one of the three routes is not there as a POST or one of
the two as a GET; one of the five is there by the other method as well. Seven cases of the test are
of these.

**`issuesLimits`** is compared by the entries that a policy cell reads (each cell of the walk from
`JUDGE`, and `issues_service`) and that a policy part of `issuesApp` reads. A read is
`issuesLimits.x`, `L.x` where the cell has `L = issuesLimits` as a declaration or a default, or
`{ x } = issuesLimits`. **Not cut, and so named whole (`issuesLimits`), when on either side:** the
cell is not one object of plain keys, each once; a policy cell is not parsed; a policy cell or a
policy part of the app passes the limits on whole, spreads them, or reads a key that is computed;
`issuesApp` is not cut. `wakeSeconds` and `wakeMs`, the two entries of `tr-4-held-read`, are read
by `issueHeld` and the route `wakes`, neither a policy cell or part.

## Two routes more than his three

The owner's C names "the install, rebuild and resign routes". The routes `policy` and `sync` are
parts too, whole. The tool's R7 reads the reason of the policy in force from `issue.policy` and
holds its last two blobs against `origin/main`, and every other check reads the record from
`issue.sync`: a commit that changes what either answers is a change to what the approver is held
by. Marking them only narrows what an approver approves (`philosophy.md`, the reading of line 1:
"A change that only narrows what a caller may do is taken"). Not asked of him. The first writing of
this change left them out; the advisor's read before the landing named it.

## What the mark does not take

Each of these carried the mark before, as a change to the cell, and carries none now. The
approver's brief says so (below), and the approver reads the diff for them.

- A route that is none of the five, changed or added, outside its statements that ask a guard.
  A new route that writes to the database with no call of `write`, `append` or `judge` names no
  guard and is not marked. One that calls `write` is (a case of the test).
- A statement added before a guard statement in the same route (a `return` above it). The guard
  statement's text is the same, and the list is.
- A comment between two statements of `issuesApp`. A comment inside a part is the part.
- An entry of `issuesLimits` that only a cell outside the walk reads.

## The brief, the policy file

- **`.claude/skills/brain-maintenance/agents/approver.md`, step 6.** It said "The tool compared the
  text of those cells and nothing else". It now says that of two cells the tool compared the
  policy parts alone, which they are, and that a route that is none of the five carries no mark:
  "read its diff for an answer a guard would refuse and for a write that asks none". **This is a
  change to the approver's brief**, made before the blobs were read, so the one install covers it.
- **`plan/cloud-brain-issues-policy-v6.json`**, new: the v5 file with the two blobs of now, one
  sentence before them, and **a key of its own**, `policy-2026-10-13-approver-policy-parts-v6`.
  `policy-pins.ts remake` wrote it from v5; the key was changed by hand after, which `remake` does
  not do. `git diff --no-index --stat` of the two files: `1 file changed, 2 insertions(+), 2
  deletions(-)`.

  Why the key: the v5 file has the key of v4 (`policy-2026-10-12-project-children-work-v4`), and
  it is the one that was installed. Event 5689, read with `issue-as.sh impl-669077
  "sync?after=5688&limit=1"`: `type: policy`, that key, `at` 2026-10-13T03:43:26Z, a reason that
  ends with v5's two blobs. The `install` route answers a body whose key the record keeps, with
  the same policy, as the install it was and writes nothing (`brain-issues.ojs`, the function
  `again` of that route). A v6 under v5's key would have left the approver stopped.
- **`tests/tools/issues-policy-v6.test.ts`**, new, 6 tests, and `tests/tools/fixtures/v6-install-rig.ojs`.
  Four of them read one run of the tracker's rig (`issuesRig` of the checkout's seed, as
  `issues-policy-v4.test.ts` runs its own): the v3 file, then the v5 file, then the v6 body under
  v5's key (`duplicate: true`, v5's reason still in force, no event), then the v6 file (one event,
  the same four hashes, `moved: []`, an open task and an open project where they were, the reason
  in force v6's), then each file again, v5 last (`duplicate: true` for both, the reason in force
  still v6's, `issue.verify?guards=true` ok).
- **`tests/tools/issues-policy-v5.test.ts`**: three of its tests held "the newest policy file"
  as the v5 file by name (the checkout's blobs are v5's; `remake` from v4 gives the v5 file; the
  approve is sent under v5's reason). They now read whichever file `newest()` answers. The count
  of its tests is as it was, 7.
- One note each in `plan/cloud-brain-approver-persona.md` (the as-built of part 4, and of the
  pins) and `plan/cloud-brain-issues.md` ("Installing it").

## Counts

Each run from the worktree after the last commit of the change and the rebase, 2026-10-13 between 10:43 and 10:46 CEST.

| command | answer |
|---|---|
| `bun test --timeout=120000 ./tests/tools/approver.test.ts` | 34 pass, 0 fail, 649 `expect()` calls |
| `bun test --timeout=120000 ./tests/tools/issues-policy-v5.test.ts` | 7 pass, 0 fail, 37 `expect()` calls |
| `bun test --timeout=120000 ./tests/tools/issues-policy-v6.test.ts` | 6 pass, 0 fail, 28 `expect()` calls |
| `tests/tools/suite.sh` | 1172 pass, 0 fail, 9720 `expect()` calls, 121 files, 134.57 s |
| `bun tools/cloud-brain/policy-pins.ts check` | `plan/cloud-brain-issues-policy-v6.json names the brief fc5d6745… and the tool 689f96b5…, as the checkout has them` (the hashes cut here) |
| `bun tools/cloud-brain/approver.ts check --token impl-669077` | `7 approves by a delegation, 0 that do not stand`, exit 0 |

**Without the fix.** The tool of the commit before put in its place in the worktree, the tests as
they are now, then the tool put back: `approver.test.ts` 31 pass, 3 fail. The three: "the policy
cells the tool names are cells of … as the checkout has it" (it now expects `[]` for a space before
the block of `issuesApp`), "issuesApp and issuesLimits are marked by their policy parts", and "the
commit of tr-4-held-read, 489aea7a, touches no policy part of the seed". Run at 10:43
CEST, after the last commit of the change.

**Over the history of the seed**, the 64 commits of `git log --format=%h -- tools/cloud-brain/brain-issues.ojs`,
each read with the tool before and with this one (a script of the scratchpad that calls `seedTouch`
of both), at 10:43 CEST:

```
{"commits":64,"markedBefore":43,"markedNow":42,"twoBefore":28,"twoNow":27,"onlyTheTwoBefore":5,"onlyTheTwoNow":4}
```

One commit loses the mark, 489aea7a (`tr-4-held-read`). Two more keep it with fewer parts:

```
998735a6 was ["issuesApp","issuesLimits"] now ["issuesApp (the route sync, a statement that asks a guard)"]
ad633b68 was ["issuesApp","issues_service","issuesLimits"] now ["issuesApp (refuse, run, a statement that asks a guard)","issues_service"]
```

The issue's "Not known" asks how many leaves the mark of `issuesApp` alone forced. By commits, not
by leaves: 5 of the 64 were marked by the two cells and no other, and 4 still are (85788ee5 lost the
mark before `policy` and `sync` were parts, and has it with them). The commits of
`tr-1-wait-in-the-record` (005d28b0), `bk-2-finish-by-the-service` (4ace22f6) and
`bk-3-queue-and-hold` (9141a226) are marked as before: each changes `issueAllowed`, and in
`issuesApp` the write path (`write`, `append` or `autoFrom` among the parts named). So of 64
commits this change frees 1. A task that adds a kind of act to the tracker is still the owner's,
by `issueAllowed`.

## Not tried

- An approver's run with this tool: none can approve until the install.
- The install of the v6 file on cb4: the owner's. The rig has it on a record of three policies and
  two issues, not on a copy of cb4's record.
- Whether cb4's record keeps an event under the key `policy-2026-10-13-approver-policy-parts-v6`
  already. No file of `plan/` has it (a case of the v6 test).
- `approver.ts` run in a checkout with no `node_modules`: the import of `acorn` would fail and the
  tool would not start, so no approve is made there. Not run.
- A seed whose `issuesApp` is written with another parser's syntax than `ecmaVersion: "latest"` of
  acorn 8 takes: it would be named whole.
- The walk from `JUDGE` is by words of the text, as before, and the reads of the limits are by the
  parse: a name of the limits that is shadowed by a parameter of the same name is read as the
  limits (more entries compared, none fewer). Not a case of the test.
- The lines of `appParts` and `limitReads` no test enters: the read `{ x } = issuesLimits`, the
  read by a string key (`issuesLimits["x"]`), and a policy cell written as `function name() {}`.

## For the owner

Not run on cb4: needs the owner present. From the main checkout, once it has the file (`git pull`):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v6.json
```

Read first, by anyone: `tools/cloud-brain/issue-as.sh <token> policy` answers `policy.seq` 5689 (it
did at 10:37 CEST). If another policy was installed since, the file is made again from that one.
And `bun tools/cloud-brain/policy-pins.ts check` in that checkout is exit 0. The answer of the
install has a new `seq`, `moved: []` and no `duplicate`; `duplicate: true` means the key was kept
already and nothing was written.
