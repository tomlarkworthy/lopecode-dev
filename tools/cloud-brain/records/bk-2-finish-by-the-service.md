# bk-2-finish-by-the-service

Task 2 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, events 4148 and
4149 of `bookkeeping-in-the-tracker`): part 4, the finish of a project made by the service, and of
part 5 the fact `issue.children.work` with the two guards of `issuesDefaultPolicy` that read it.
Written 2026-10-12; the `start` move is event 4372 (21:03 CEST by `date`). A deploy of
`brain-x-issues`. No install, no `issue.rebuild`: cb4's policy is not changed by this task.

Commands below are run in the worktree `bm-bookkeeping-in-the-tracker` unless one says the main
checkout.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

| Place | What |
|---|---|
| `issuesLimits` | `auto: ["finish"]`, `autoDepth: 20` |
| `facts` of `issueAllowed` | `issue.children.work`: the open parts whose workflow is not the one the policy in force names for the kind `feedback`. `.total` and `.open` are as they were |
| `issuesDefaultPolicy`, the workflow `project` | `decompose` reads `issue.children.work > 0`, `finish` reads `issue.children.work == 0`. No other workflow changes |
| `issueEvent` | a move whose act has `auto` has it in the event |
| `issuesApp` | the function that was `append` is `write`. The new `append` calls it, then makes the follow-on moves. `callerKey` refuses a key under `auto/` as it refuses one under `policy/`. The answer of a write has `auto: [{ id, seq, move }]` when a move was made |
| the prose | the section "A move made by the service"; `.work` in the table of facts; the sentence of the project's path; `auto/` beside `policy/` |
| a new test cell | `test_issues_project_is_finished_by_the_service` |
| two test cells changed | `test_issues_links_parts_and_the_moves_that_end_a_trap` and `test_issues_flow_lead_of_a_project_and_of_feedback` each made the `finish` by hand after the last part had gone; each now reads the one the service made |

Three texts: the row of step 3 of `.claude/skills/brain-maintenance/SKILL.md` for a project at
`building` with no open part; `plan/cloud-brain-issues.md`, the paragraph of the project workflow;
the spec, part 4. The last two gained an "(As built …)" sentence and are otherwise as they were.

### The finish

After `write` has written an event that is not a policy and was not answered `duplicate`, `append`
looks at up to three issues: the issue of the event when its workflow has a move named in
`issuesLimits.auto` from its state, what the issue was part of before the event, and what it is part
of after. Each is read again (`S.near`: the issue and its parts) from what the first write left. For
each state such a move leads to, `issueAllowed` is asked twice for this call's caller, with the
reason the event will carry and with none. When both name a move of `issuesLimits.auto`, `append`
writes it:

```
key     auto/<seq of the event that caused it>/<id>
by      this call's caller
reason  no part holds it after event <seq>
auto    <seq>
```

The move it made is an event too, so what that issue is part of is looked at in turn, 20 deep at
most. Anything thrown by a follow-on is caught: the first write's answer is returned as it would
have been, with no `auto`.

### What differs from part 4 of the spec

- **The issue of the event itself is looked at**, not only its parent. Part 5 of the spec says
  "the first event of `group-invites` or of its parts makes the finish", and R4 expects
  `group-invites` at `done` after the owner's install, whose one event of it is the swap of the
  project itself. The extra read is made only for an issue whose workflow has such a move from its
  state: a project at `building`.
- **The guard is asked with no reason too.** The cell `issuesExamplePolicy`, which the reference
  gives as the policy to start from, has a move named `finish` from `open` whose guard is
  `caller.kind in ["owner", "token"] && event.reason != ""`. Asked with the reason alone, the first
  comment by a token on any issue of a Brain with that policy would have closed it. `philosophy.md`,
  line 1, as read here: a deploy does not make a caller's comment do what it did not do before. The cost: a policy
  whose `finish` wants a reason gets none from the service.
- **The answer names what was made.** `philosophy.md`, line 3: a caller whose call closed a project
  is told so in that answer.

### `issue.children.work`

`issuesDefaultPolicy` is what a Brain with no policy writes as its first, and what the rig of the
tests runs. cb4 runs the policy of event 483, whose `finish` reads
`caller.kind in ["owner", "token"] && issue.children.open == 0` and whose `decompose` reads `> 0`
(`ia "policy"`, 21:21 CEST: `seq` 483, the workflow `project` at `39d9f385`): there
the service makes the finish when no part at all is open, and an open feedback part holds a project
as before, until the install of bk-4. The hash of the workflow `project` in the rig is another than
cb4's `39d9f385…` for that reason.

## What the writer of a late task sees

From review 4032: a project whose last open part ends before a late task is opened is finished by
that call. Run in the rig, case 2 of the new test cell:

- `issue.open` of a task with `parent` the project that is `done`: 200. The task is listed among
  the project's parts by `get?id=`.
- The project stays `done`: `issue.move` of it to `building` answers
  `no move from done to building`. The project workflow has `reopen` from `closed` and `rejected`
  only.
- The task is moved as any other (`triaged`, `ready`, `in-progress`, `in-review`, a pass, `done`).
  Its guards read its own parts, not its parent. The pass that ends it has no `auto`, and the
  project has one `finish` event.

So the writer of the late task sees nothing different in its own issue. What differs is the
project: it was `done` before all the work under it was. The row of `SKILL.md` now says to open
every task of a spec before the last of them can end.

## Tests

The count that is submitted is the browser's, from `tab-tests.ts`. Each run below was made after
the last change to the seed and after the rebase on `origin/main` of step 9, which brought in
no seed and no `build.ts`. The last change to the seed was a clause of its prose (the 20 of
`autoDepth`), made after the runs of the next section.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <build's module>` | `passed 39 failed 0 needsBrowser 15` |
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 ran, `6dcd80bd7dd5`) | `passed 38 failed 0 needsBrowser 15` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit …` (21:21 CEST) | `"tests":54,"passed":54,"failed":[]`, Chrome 151.0.7922.34 |
| main checkout: `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` (ended 21:23 CEST) | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` in its first line: `brain-shell`, `brain-issues`; `"tests":54` in the line of run 1 |

`tests/tools/suite.sh`, begun 21:16 CEST with the record written and the three texts changed:
`685 pass`, `0 fail`, `Ran 685 tests across 68 files`, in 150.94 s. It runs no cell of the seed.
After it the seed gained the clause of its prose and this file some lines. Two runs after those
did not pass whole: begun 21:23 CEST, `683 pass`, `2 fail` in 290.17 s; the next, `681 pass`,
`4 fail`, `2 errors` in 291.40 s, its four `(fail)` lines in `summarize-papers.test.ts` (3) and
`knowledge-docs.test.ts` (1), each with "timed out after 30000ms". Those two files run alone at
21:33 CEST: `41 pass`, `1 fail`, `1 error` in 352.62 s, and `uptime` after it read load averages
10.54, 15.96, 17.77. This change touches neither file nor a tool either runs. A whole pass after
the last edit was not had.

The line of run 1 has `"ran":{"@tomlarkworthy/brain-issues":53,…}` beside `"tests":54`. `ran`
counts the test cells whose value is not `undefined` (`verify-run.ts`, line 169), and `test.ts`
prints `"value":"undefined"` for `test_issues_resign_signs_the_record_with_the_key_held`. That
cell is not of this change.

### The new cell on other builds

Each build is the seed with one thing changed, built with `build.ts --out` and run with
`test.ts brain-x-issues --with`; the seed was put back after each. The eleven were run again at
21:15 CEST, on the seed as it was but for that clause of the prose. The script is `impl-33733c-mut.py` of the session's
scratchpad and is not kept.

| The seed | passed, failed | What failed |
|---|---|---|
| `append` returns after `write`: no follow-on | 36, 3 | the new cell at case 1: `auto` of the pass that ended the last part was `undefined`; and the two changed cells |
| a key under `auto/` not refused | 38, 1 | the comment with the key `auto/5/p` was written |
| what the issue was part of before the event not looked at | 37, 2 | a part taken off: its project stayed `building` (the new cell and `…the_moves_that_end_a_trap`) |
| what it is part of after not looked at | 38, 1 | a note opened as a part of `y`: `y` stayed `building` |
| the issue of the event not looked at | 38, 1 | a comment on `q2`: it stayed `building` |
| `issueEvent` drops `auto` | 37, 2 | the finish of `p` had no `auto` (the new cell and the flow cell) |
| the guard asked with the reason only | 38, 1 | under the example policy the move of `e1` to `done` by hand, made after a comment on its part, answered no event |
| `work` counts feedback too | 38, 1 | a project with a feedback part alone was decomposed |
| the two guards read `.open` | 38, 1 | the same |
| a write answered `duplicate` followed on | 38, 1 | the member's key sent again by token `a` finished `y` |
| a follow-on's error thrown | 38, 1 | the pass whose second write failed answered no JSON |

### What the new cell enters, each through a call of the service

1. Two tasks of a project at `building`: the pass of the first makes nothing, the pass of the
   second answers `auto` and the project is `done`, with the key, the reason, `auto`, and `by` of
   the pass; `issue.by.finish` is the reviewer's token; a changed `auto` in the stored event fails
   `issue.verify` at `hash`; the same key sent again makes nothing more; `done` by hand then has no
   move; a key under `auto/` is 400; `auto` in the body of a caller's move is not in its event.
2. The late task, above.
3. A member (`did:plc:other` by a session) passes the last part and a Worker comments on it: no
   finish. The member's key sent again by token `a`: a duplicate, and no finish. A comment by token
   `a` on the part: the finish, as `a`. The same for a comment on the project itself.
4. The last part taken off with `part-of` and `remove`; the last part made part of another project.
5. A project with a feedback part alone is not decomposed. A task with an open feedback part is
   not made `ready` (`.open` unchanged). A project whose last task ends is `done` with its note
   still open. A note promoted to a task holds its project until it is closed. A note opened as a
   part of a project nothing holds finishes it; a member's does not.
6. A project that is the last part of another: both in one answer, the second with the first's seq
   as its `auto`.
7. The insert of the follow-on fails: 200 with the pass, the project at `building`, and the next
   comment on the part finishes it. Another caller finishes the project by hand between the two
   writes: one `finish` event, that caller's, with no `auto`.
8. The example policy: a comment on a part of an open issue leaves it `open`; `finish` by hand with
   a reason is made.

Then `issue.verify?guards=true` is `ok`, and five projects are equal before and after
`issue.rebuild`. The cell's value counts 11 finishes made by the service.

## Read on cb4 before the deploy

- `ia "snapshot"` at 21:11 CEST, event 4409: 12 projects or features at `building`, each with at
  least one open part (`group-invites` 1, a feedback). So no project is finished by the first event
  after this deploy.
- `sync?after=` read to event 4408 with the writer's token: no key starts with `auto/` among the
  events it is answered whole. An event of an issue the token may not read is answered without its
  key.

## Not tried

- **A finish made on cb4.** Not run on cb4: needs the owner present (a project reaches `building`
  through his `approve`). The first there will be a `moved` event with `auto`, the key
  `auto/<seq>/<project>` and `by` of the call that ended the last part.
- **The limit of 20** (`autoDepth`): no test makes a chain of projects that long.
- **The time of the extra read.** Each write of an issue that has a parent, and each write of a
  project at `building`, now reads the view once more (`S.near` of that one issue). Not measured,
  in the rig or on cb4.
- **A swap of an install's `migrate`** as the event that causes a finish: bk-4 runs the install in
  the rig.
- **Two calls that end the last two parts at once.** Each follow-on reads the view after its own
  write, and a second finish is refused by the state; that is the code as read. The cell makes the
  race with a finish by hand, not with a second follow-on.
- **A parent the caller may not read** (a part of a security issue ended by a token that does not
  read it): `issueAllowed` answers no for it. Not entered by the cell.
- **A policy with no workflow for the kind `feedback`**, where `.work` equals `.open`; and a
  feedback issue left on an older workflow by an install with no `migrate`, which then counts as
  work. Neither is entered.
- **A policy whose `finish` wants no reason and reads nothing of the parts.** The service makes it
  at the first event of the issue by a caller it lets. The example policy is the one policy tried
  beside the default.
- **`issueReplay` does not judge that an event with `auto` was due**, or that its key has the
  form above (the spec: "that the move was allowed, not that it was due").
- **What the page's panel draws** of an event with `auto`, or of an answer with `auto`. The 15
  panel tests of the module pass in the browser; none makes one.

## Searched before the design

`knowledge.search?semantic=true` with `loop-knowledge`, three searches: "project finished
automatically when last part closes auto move", "follow-on event appended in the same call by the
service auto key", "issue.children.work feedback parts do not hold a project". Each answered the
spec (`doc:cloud-brain-bookkeeping-in-the-tracker`) first or third; `doc:cloud-brain-issues` and
`doc:cloud-brain-topics-service` were among the rest. No module bore on it. Used: the spec, and
`tools/cloud-brain/records/bk-1-after-link.md` for how `append` reads what it judges from.
