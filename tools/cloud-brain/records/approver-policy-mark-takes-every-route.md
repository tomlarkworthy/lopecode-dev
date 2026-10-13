# approver-policy-mark-takes-every-route

`tools/cloud-brain/approver.ts` marked every change to the cells `issuesApp` and `issuesLimits` of
`tools/cloud-brain/brain-issues.ojs` as a change to a policy cell, so the approver left every task
that changed a route or a limit of the tracker. The owner's plan is C of comment 6284 of the issue,
as comment 6384 has his answer: "the mark takes only the install, rebuild and resign routes, the
refusal on a guard's answer, and the limits a judge reads", and "where the tool cannot cut the cell
into those parts it marks the whole cell as now". Written 2026-10-13 by a writer of the issue loop
(`impl-669077`), round 1, started at event 6394. A local tool, its tests, the approver's brief, one
policy file and two notes in specs: no seed, no deploy. Round 2, after review 6434, is the last
section; the text above it is as the tool stands after it, with the runs of round 2.

**cb4 does not run a new policy, and the approver approves nothing until the owner installs
`plan/cloud-brain-issues-policy-v6.json`.** The tool and the brief are two files the policy in
force names by their blobs; this change is to both. "For the owner" below has the one call.

## The check of the issue

"`approver.ts facts` of lopecode-dev 489aea7a prints no `[policy]` mark". With the tool as it was
(put in the worktree's `tools/cloud-brain/approver.ts` for the run, then put back) and with this
change, the first at 10:43 CEST and the second at 10:58 CEST, with the tool of round 2:

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
each declared name a part), routes (`app.get(NS + "name", …)` or `app.post`, the name of small
letters alone) and whatever else. The policy parts, as round 2 left them:

| part | what it is | why |
|---|---|---|
| a declaration | whole, by its name | `judge` is where `issueAllowed`'s answer becomes the thrown refusal, `write` and `append` call it, `load` reads the policy into the view; and a route or a middleware can be made in any of them (review 6434) |
| a route that takes a POST | the statement whole | `install`, `rebuild` and `resign`, which the tool's reason for the cell names; `attach` and `lock`; and any that is added |
| the routes `policy`, `sync` | each `app.get` statement whole | `approver.ts` reads the policy in force, with the reason its two blobs are in, from the first, and the record from the second |
| a statement that is no declaration and no route | whole, in order | the loop that makes the eleven write routes, `return app`, an `app.use`, a route whose path is not `NS + "name"` or has a pattern in it |
| in the other routes that take a GET, a statement that names a guard, `judge`, or a declaration that names one of those, however far | the statement it is of the innermost function with a body in braces, in order | a guard asked in a read route: `if (id !== undefined && issueAllowed(…).allow) await ahead(view, id);` in `wakes`; `shown` in `get` and `list` |
| in those routes, a statement that names `app` or sets a declaration | the same | a route made, or `app.fetch` set, when the read route is called; `keys = …` |

"A guard" is one of the seven cells of `JUDGE` or `issueCaller`, which says whether the caller is
present. On the seed of the checkout, printed by a script of the scratchpad that calls `appParts`
(exported for this and for no test), at 10:58 CEST:

```
routes written out in the cell: 18 attach install snapshot sync get runs attachment list queue wakes policy key flow verify resign rebuild lock locks
policy parts: 42
 routes: the route attach, the route install, the route sync, the route policy, the route resign, the route rebuild, the route lock
 declarations: app, NS, S, L, J, refuse, made, keys, schema, signer, wait, who, load, metaRows, issueRow, judge, ahead, write, autoFrom, append, run, callerKey, wrote, shown, shownEvent, current, walk, locksMade, lockSchema, lockName, lockWho, invalid
 statements that ask a guard: 14 lines of text
 limits the parts read: afterWalk, auto, autoDepth, key, lockMax, lockMin, lockName, lockSeconds, lockWho, page, reason, rebuildRounds, syncMs, syncPage, wakeAfter
```

(42 is 7 routes, 32 declarations and the three lists of statements.) So what carries no mark is in
11 of the 18 routes: `snapshot`, `get`, `runs`, `attachment`, `list`, `queue`, `wakes`, `key`,
`flow`, `verify` and `locks`, each a GET, in what it does beside the statements of the last two
rows; and a new route that takes a GET. The commit of `tr-4-held-read` moved the guard statement of
`wakes` into a function inside the route and left its text as it was: the list of such statements
is the same on both sides.

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
by `issueHeld` and the route `wakes`, neither a policy cell or part. Each of the 42 entries changed
alone (a script of the scratchpad, 11:01 CEST): 36 are named `issuesLimits (<key>)` and 6 are not,
`wakeSeconds wakeMs queue lateHours list lockHistory`. Review 6434 counted 31 and 11 with the tool
of round 1; the five more are limits of the lock, which the route `lock` and its declarations read.

## More than his three routes

The owner's C names "the install, rebuild and resign routes" and "the refusal on a guard's answer".
The tool takes more of the cell than that, and each more only narrows what an approver approves
(`philosophy.md`, the reading of line 1: "A change that only narrows what a caller may do is
taken"). None was asked of him.

- **The routes `policy` and `sync`**, whole. The tool's R7 reads the reason of the policy in force
  from `issue.policy` and holds its last two blobs against `origin/main`, and every other check
  reads the record from `issue.sync`: a commit that changes what either answers is a change to
  what the approver is held by. The first writing of this change left them out; the advisor's read
  before the first landing named it.
- **Every declaration and every route that takes a POST**, whole (round 2). What is left to an
  approver of the cell is its read routes.

## What the mark does not take

Each of these carried the mark before, as a change to the cell, and carries none now. The
approver's brief says so (below), and the approver reads the diff for them.

- A route that takes a GET and is neither `policy` nor `sync`, changed or added, in what it does
  beside its statements that ask a guard, name `app` or set a declaration. Such a route that
  writes to the database itself (`sql.exec`), or changes what a declaration holds by a call
  (`keys.x = 1` is a set and is marked; `Object.assign(keys, …)` is a call and is not), names no
  guard and is not marked. One that calls `write` is (a case of the test).
- A statement added before a guard statement in the same route (a `return` above it). The guard
  statement's text is the same, and the list is.
- A comment between two statements of `issuesApp`. A comment inside a part is the part.
- An entry of `issuesLimits` that only a cell outside the walk, or a read route, reads.

## The brief, the policy file

- **`.claude/skills/brain-maintenance/agents/approver.md`, step 6.** It said "The tool compared the
  text of those cells and nothing else". It now says that of two cells the tool compared the
  policy parts alone, which they are, and that a route that takes a GET and is neither `policy` nor
  `sync` carries a mark only for a statement that asks a guard, names `app` or sets a declaration:
  "read its diff for an answer a guard would refuse and for a write that asks none (to the
  database, or by a call on something a declaration holds)". **This is a
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

Each run from the worktree after the commit of round 2 and its rebase, 2026-10-13 between 10:58 and 11:04 CEST; the first and the fourth after the last edit of the test.

| command | answer |
|---|---|
| `bun test --timeout=120000 ./tests/tools/approver.test.ts` | 34 pass, 0 fail, 687 `expect()` calls |
| `bun test --timeout=120000 ./tests/tools/issues-policy-v5.test.ts` | 7 pass, 0 fail, 37 `expect()` calls |
| `bun test --timeout=120000 ./tests/tools/issues-policy-v6.test.ts` | 6 pass, 0 fail, 28 `expect()` calls |
| `tests/tools/suite.sh` | 1186 pass, 0 fail, 9876 `expect()` calls, 122 files, 134.71 s |
| `bun tools/cloud-brain/policy-pins.ts check` | `plan/cloud-brain-issues-policy-v6.json names the brief fe5c1e7d… and the tool 1ffc4f93…, as the checkout has them` (the hashes cut here) |
| `bun tools/cloud-brain/approver.ts check --token impl-669077` | `7 approves by a delegation, 0 that do not stand`, exit 0 |

**Without the fix.** The tool of the commit before put in its place in the worktree, the tests as
they are now, then the tool put back: `approver.test.ts` 31 pass, 3 fail. The three: "the policy
cells the tool names are cells of … as the checkout has it" (it now expects `[]` for a space before
the block of `issuesApp`), "issuesApp and issuesLimits are marked by their policy parts", and "the
commit of tr-4-held-read, 489aea7a, touches no policy part of the seed". Run at 10:43
CEST with the tests of round 1, and at 11:07 CEST with those of round 2: 31 pass, 3 fail, the same
three, both times.

**Over the history of the seed**, the 64 commits of `git log --format=%h -- tools/cloud-brain/brain-issues.ojs`,
each read with the tool before and with this one (a script of the scratchpad that calls `seedTouch`
of both), at 10:58 CEST:

```
{"commits":64,"markedBefore":43,"markedNow":42,"twoBefore":28,"twoNow":27,"onlyTheTwoBefore":5,"onlyTheTwoNow":4}
```

One commit loses the mark, 489aea7a (`tr-4-held-read`). One more keeps it with fewer cells:

```
998735a6 was ["issuesApp","issuesLimits"] now ["issuesApp (the route sync, a statement that asks a guard)"]
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
- A read route that changes what a declaration holds by a call, or that reaches the app by
  another name than `app` (`c`, the context of a request, has none that was found; not searched
  in hono's source).
- The lines of `appParts` and `limitReads` no test enters: the read `{ x } = issuesLimits`, the
  read by a string key (`issuesLimits["x"]`), and a policy cell written as `function name() {}`.

## For the owner

Not run on cb4: needs the owner present. From the main checkout, once it has the file (`git pull`):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v6.json
```

Read first, by anyone: `tools/cloud-brain/issue-as.sh <token> policy` answers `policy.seq` 5689 (it
did at 11:02 CEST). If another policy was installed since, the file is made again from that one.
And `bun tools/cloud-brain/policy-pins.ts check` in that checkout is exit 0. The answer of the
install has a new `seq`, `moved: []` and no `duplicate`; `duplicate: true` means the key was kept
already and nothing was written.

## A resumed round: round 2, 2026-10-13

Review 6434 (`rev-e14b0f`), `changes`, one finding. Taken by the writer of round 1 at step 13 of the
brief (`issue-wait.sh … --work`, event 6438), in the same worktree.

**The finding.** A route for `install`, or a middleware over every route, written as the value of
a declaration printed no mark: the tool of round 1 took a route only as a statement, and a
declaration was a part only when it named a guard or a part named it. The reviewer's four changes
and the one of its first note, each `policyCells(seed, seed with the change)`, with the tool of
round 1 (the commit before round 2, copied to the scratchpad) and with this one, at 11:02 CEST:

```
const z = app.post(install) after refuse   round 1 []  now ["issuesApp (z)"]
invalid = (app.post(install), …)           round 1 []  now ["issuesApp (invalid)"]
const mw = app.use(…)                      round 1 []  now ["issuesApp (mw)"]
const q9 = (app.fetch = …)                 round 1 []  now ["issuesApp (q9)"]
keys set in the route key                  round 1 []  now ["issuesApp (a statement that names app or sets a declaration)"]
```

**What changed.** The review gave two ways: `app` taken as a guard's name is, or the cell not cut
when `app` is named anywhere else. Neither was taken as written. A declaration can also change
what the app does with no `app` in it (`hono.Hono.prototype`, a value another declaration holds),
and the declarations that were not parts already were five, all of the lock (`locksMade`,
`lockSchema`, `lockName`, `lockWho`, `invalid`). So:

- every declaration is a part, whole;
- every route that takes a POST is a part, whole, the three and `attach`, `lock` and any new one:
  a new POST route written before the loop of the write routes would answer for one of them;
- a route's name is of small letters alone: `NS + ":any"` and `NS + "*"` are no routes to the tool,
  and so are parts as statements that are no route;
- in the read routes that are left, a statement that names `app`, or sets a declaration
  (`keys = …`, `made++`, `[made, keys] = …`, `locksMade &&= null`), is a part, beside those that
  ask a guard. That is the review's first way for `app`, and its first note.

The walk down from the parts to the declarations they name is gone: every declaration is one.

**The tests**, in "issuesApp and issuesLimits are marked by their policy parts": the four of the
review, each `["issuesApp (<name>)"]`; seven of a read route that names `app` or sets a declaration;
four of a route that is no route to the tool (a pattern, a star, a path written whole, a chained
call); a new POST route; two of `lock`; a declaration of the lock; a limit of the lock. With the tool of round 1 in its place
that test fails, at its first changed case (`lock`: `a statement that asks a guard` where
`the route lock` is expected), and the other 33 pass; the five lines above are what that tool
answers to the cases after it.

**The review's other notes.** The first (a declaration set from a read route): closed, above. The
third (`plan/cloud-brain-approver-persona.md` named three routes): the note now has the parts of
round 2. The second and the fourth are as the record said, and the fourth's count is under
"issuesLimits" above with the tool of round 2.

**The brief and the policy file again.** Step 6 of `agents/approver.md` says the parts of round 2,
so its blob changed, and the tool's did: `plan/cloud-brain-issues-policy-v6.json` was made again
in place, by the same two steps, for the two blobs of now. It was not installed between the rounds:
`issue-as.sh impl-669077 policy` answered `policy.seq` 5689 at 11:02 CEST, after it was made again.

**Stale from round 1, and used without reading again.** Nothing of `brain-issues.ojs`,
`approver.ts` or the tests changed on `main` between the rounds (`git diff --stat 0dfcdc58
origin/main`: 11 files, none of them these). The counts of round 1 in this file were each replaced
by a run of round 2; the comparison over the 64 commits gave the same line.

