# bk-1-after-link

Task 1 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, events 4148 and
4149 of `bookkeeping-in-the-tracker`): the link rel `after` in `tools/cloud-brain/brain-issues.ojs`,
its two refusals, the walk that finds them, and `last` on an issue's row. Written 2026-10-12; the
`start` move is event 4256. A deploy of `brain-x-issues`. No install, no `issue.rebuild`.

Commands below are run in the worktree `bm-bookkeeping-in-the-tracker` unless one says the main
checkout.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

| Place | What |
|---|---|
| `issuesLimits` | `rels` gains `"after"`, last in the list; `afterWalk: 50` |
| `issueAfterWalk(issues, id, to, max)`, a new cell | `{ ring, part, over, missing }` for the link "`id` is after `to`". No I/O |
| `issueAllowed`, `link` | for `rel: "after"`, three refusals from the walk, after the check that both issues are read by one rule and before the workflow's `link` guard |
| `append` of the service | before the judgment of an `after` link it reads each issue the walk names in `missing`, and walks again, until none is new |
| `issueApply` | a `moved` event sets `last: { move, at }`; a `swapped` event whose `swap` has a name sets it with that name; a swap with no name leaves it |
| the prose of `issue.link` and `issue.get` | the rel, what is refused and what is not; `issue.last` |
| two new test cells | `test_issues_after_is_an_order_with_no_ring`, `test_issues_row_names_its_last_move` |

`.claude/skills/brain-maintenance/SKILL.md`, the paragraph that lists the rels of `issue.link`:
`after` is named in it. Step 3 of that file is task 6's.

### The link

`issue.link { key, id, to, rel: "after" }` is kept as `duplicate`, `cause` and `related` are: the
code that keeps them (`issueApply`, the batch of `append`, the swap that drops links between two
rules, `list?link=`) tests `rel !== "part-of"`, and was not changed. No guard reads the link.

The refusals, each 403 `Refused`, with the message the service answers:

| When | Message |
|---|---|
| `to` is after `id` through any number of `after` links | `<to> is after <id>: each would wait for the other` |
| `to` is what `id` is part of, however far up | `<id> is part of <to>, which waits for its parts` |
| neither was found in 50 issues | `an after link is refused when more than 50 issues would be read to look for a ring` |

### The walk

`issueAfterWalk` reads `to`, then what `to` is after, breadth first in the order of each issue's
`links`, and then the parents of `id`. It stops at the 50th issue. The count is of the issues of the
first walk plus the parents of the second; an issue in both is counted twice.

The service's `append` holds only the issues near the two of the call (`S.near`: each, and its
parts). `issue.verify?guards=true` judges the same event from the whole view. So `append` reads what
the walk lacks before it judges: at most 51 rounds, each a `S.near` read for an issue not asked for
before. The test's ring of four (`d` after `a`, with `a` after `b` after `c` after `d`) goes through
two issues the call does not name. With the reads taken out of `append` the service answered 200 to
it (mutation 2, below).

### `last`

A swap the workflow lists has `swap: <name>` in its event (`issueEvent`, `verdict.name`). A swap of
an install's `migrate` and a swap the owner makes by workflow and state have `swap: null`. That is
the test `issueApply` makes. A row written before the deploy has no `last` until its issue moves, or
until the owner runs `issue.rebuild`; the spec has the queue of task 3 read the issue's events for
those.

## Choices made

- **A ring through `after` and `part-of` together is not looked for.** `x` after `y`, where `y` is
  after the parent of `x`: `x` waits for `y`, `y` for the parent, the parent for `x`. The spec names
  two refusals and this is neither. Not refused; not tested.
- **A `part-of` link is not walked.** An issue that is after `p` and is then made part of `p` gets
  the shape the second refusal is for, with no refusal. The prose of `issue.link` says so. The test
  does not make that case.
- Both are left because the link is an order that no guard reads (the spec, "Not enforced"): such a
  pair would be listed under `waiting` by the queue of task 3 and is ended by `remove`.
  `philosophy.md`, line 2: the smaller side.
- **The message for the limit names no issue.** It is the one refusal of the three that is not a
  fact about the two issues.

## Tests

The count that is submitted is the browser's, from `tab-tests.ts`.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <build's module>` | `"passed":38,"failed":0,"needsBrowser":15` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `"tests":53,"passed":53,"failed":[]`, Chrome 151.0.7922.34 |
| main checkout: `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` in its first line: `brain-shell`, `brain-issues` |

Before this change `test.ts brain-x-issues` gave 36 passed and 15 that need a browser (the spec,
"The service's tests", at another deployed hash).

The two new cells, on four other builds. Each build is the seed with one thing changed, built with
`build.ts --out` and run with `test.ts brain-x-issues --with`; the seed was put back after.

| The seed | passed, failed | What failed |
|---|---|---|
| `HEAD` before the change, with the two test cells added | 36, 2 | `test_issues_after_is_an_order_with_no_ring`: `issueAfterWalk is not defined`. `test_issues_row_names_its_last_move`: `last` was `undefined` where `{ move: "triage", at }` was expected |
| the change, with `append` reading nothing for the walk | 37, 1 | the ring of four: 200 where 403 was expected |
| the change, with `last` set by every swap | 37, 1 | the owner's swap by hand: `last` had `move: null` |
| the change, with the line that finds `part` taken out | 37, 1 | `t1` after its parent `p`: not refused |

The first row does not show the old code answering 400 to the rel: the cell stops at the name of the
new cell before it calls the service. The spec's table has that answer from cb4 before the change
(R1, "Today": 400 `rel: part-of, duplicate, cause, related`).

What `test_issues_after_is_an_order_with_no_ring` enters through `issue.link` of the service: a ring
of two and of four; two links that are no ring; a ring that a `remove` ended and the link the other
way then made; after one's parent one step up and three; after a sibling, and a parent after its
part, both 200; `to` equal to `id` and a `to` that is not there, 404; a `remove` of a link not kept;
a Worker, refused by the guard; a security issue, refused as not read by the same rule; a move of an
issue that is after an open one, 200; a chain of 52 where a link that reads 50 issues is written and
one that would read 51 is refused; a ring of 50 issues, named as a ring; `rebuild` and
`verify?guards=true`.

## Not tried

- The two shapes under "Choices made".
- An `after` link on cb4's 13 held tasks: that is task 5.
- What the page's panel draws of the link. Its code draws each of `links` as the rel and the id,
  and each of `linked` as the rel, ` of` and the id (`issuesPanel`, `data-link`), so `after t1` on
  the one and `after of a` on the other. Read in the seed, not seen in a tab.
- The limit against a chain on cb4, and the time 50 reads take there. In the rig the chain of 52
  ran inside the test.
- A page copy kept under `brain_issues2` before this deploy has rows with no `last`. Nothing reads
  `last` yet; the name of the copy was not changed.
- Two things that read every link of an issue and now read `after` among them, neither changed and
  neither tested with it: the guard of `close` on the feedback workflow
  (`size(issue.links) > 0`), which an `after` link on a feedback issue passes with no reason; and
  `issueFlow`, where feedback "follows" each issue it says a link of.
- Two writers that each add one half of a ring at once. Each write is judged from the view its
  `append` read, and the insert of the second is refused its `seq` and goes round again with the
  first in the view; that is the code as read, with no test of it for this rel.

## Searched before the design

`knowledge.search?semantic=true` with `loop-knowledge`, three searches: "dependency link between
issues after blocked by cycle detection", "issue tracker link rel ring refused part-of", "last move
of an issue row issueApply". Each answered the spec itself first or second
(`doc:cloud-brain-bookkeeping-in-the-tracker`) and `doc:cloud-brain-issues`; no module and no other
doc bore on the walk. Used: the spec.
