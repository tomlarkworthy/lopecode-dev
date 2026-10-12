# tr-1-wait-in-the-record

Task 1 of `plan/cloud-brain-tracker-trigger-rules.md` (approved for the owner at event 4903 of
`tracker-trigger-rules`): parts 1 and 2, a wait as an event of the record and one read that answers
the caller's waits that are due. Written 2026-10-12; the `start` move is event 5191. A deploy of `brain-x-issues`. No install and no `issue.rebuild`: a row written before the
deploy has no `waits` and is read as having none.

Commands below are run in the worktree `bm-tracker-trigger-rules` unless one says the main checkout.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

| Place | What |
|---|---|
| `issuesLimits` | `waitDays: 30`, `when: 500`, `note: 200`, `waits: 10`, `wakeAfter: 20` |
| `issues_service` | two methods more, `issue.wait` (procedure) and `issue.wakes` (query), under the rule the others have |
| `issueAct` | the body of a wait: `when` (text, 1 to 500, parsed by `checkedRule`), `until` (as a hold's), `note` (200 at most), or `remove: true` |
| `issueFacts` | a cell now. It was `facts` inside `issueAllowed`, which calls it; the text is the same |
| `issueWaitFacts`, `issueWhen` | new. What a `when` reads: the facts and `closed`, `last`, `after`. And a `when` asked of an issue: `{ due, error }` |
| `issueAllowed` | the act `wait`: a remove with no wait of the caller's actor is "no such wait", 404; then the workflow's `wait` guard, and `label` where it has none; then the `when` is asked, and an error is a refusal with `invalid`, which `judge` answers 400 |
| `issuePolicyAct` | a workflow's `wait` guard is parsed at the install |
| `issueEvent`, `issueReplay` | the event `waits`, with `when`, `until` and `note`, or with `remove: true` |
| `issueApply` | `waits: [{ actor, holder, when, until, note, seq, at }]` on the row; one an actor, ten actors an issue; `updated_at` is left by a `waits` event |
| `issueLive` | new: a row without the waits past their `until` at a time. `issue.get`, `issue.list` and `issue.snapshot` answer rows through it |
| `issueWakes` | new: `{ due, waiting }` from a view, a caller and a time. No I/O |
| `issuesApp` | `ahead`, which reads the issues an issue is after into the view and answers 400 past 20; `write` calls it for a wait, after the key is looked up, and the route `wakes` for its `id`, each only for a caller who reads the issue; the route `wakes` |
| `issuesPanel` | a `waits` event is one line of an open issue's events (`until …, when …`, or `wait taken off`). Nothing else of the panel changed |
| prose | the rows `issue.wait` and `issue.wakes` of the method table, a section "A wait", `waits` among the types of an event, `wait` among the guards a workflow may have, `issue.waits` in the row of `issue.get` |

`plan/cloud-brain-tracker-trigger-rules.md` has three notes "As built", one for each item below.

## Where it differs from the spec

- **A `when` that answers a text or a number is refused.** The spec refuses a `when` that does not
  parse or answers an error. `decide` answers `allow: false` with no error for one that answers
  `"open"` or `2` (the probe below), so such a wait would be written and never be due. `issueWhen`
  asks the negation of a `when` that is not true: `!(…)` is true of a false one and an error of a
  text or a number. The message is `when: it answers neither true nor false`. Line 3 of
  `philosophy.md`: the caller is told at the write, and does not find out at its `until`.
- **`issue.verify?guards=true` asks the `when` again.** The spec has the `when` "evaluated once at
  the write". It is asked inside `issueAllowed`, which the replay also calls, so a `waits` event
  written past the service with a `when` that names `caller` is found (the first test, its last
  lines). The write and the replay ask it of the same issues: `write` reads what the issue is after
  before it judges. The three names are still not in `issueFacts`, and no guard reads them.
- **The guard is judged before the `when`.** A caller the guard refuses is answered 403 whatever
  its `when` is.
- **`updated_at` is left.** `issue.list` is ordered by it. A wait written at each submit would
  move its issue to the head of that list with nothing of the work changed; a `cost` event leaves
  it for the same reason. The spec does not say.
- **`issueWakes(view, by, now, id)`**, the caller in the place of `actor`: whether the caller reads
  an issue is judged by the caller, as `issueQueue` does.
- **An `id` that names no issue**, or one the caller may not read, answers `issue.wakes` both lists
  empty, as `issue.runs` answers its `id`. The spec does not say.
- **The 400 for an issue after more than 20** is given for every wait on such an issue, also one
  whose `when` does not read `issue.after`: `write` does not read the `when` to decide what to load.

## The probe of `decide`

The spec, "Not tried, not known": "Whether `decide` answers an error for every name that is not in
scope". A test cell that threw the answers of `decide({ allow: when }, { issue })` for 14
expressions, run once with `bun test.ts brain-x-issues --with` and then taken out:

```
caller.kind == "owner"          allow false  error "Unknown variable: caller"
issue.nope == 1                 allow false  error "No such key: nope"
event.to == "x"                 allow false  error "Unknown variable: event"
issue.by.start == "x"           allow false  error "No such key: start"     (by: {})
issue.state                     allow false  error null
1 + 1                           allow false  error null
issue.state != "in-review"      allow true   error null
```

The four with an error are the 400 of the spec. The two with none are the first item above. Only
these 14 were asked; "every name" is not shown by them.

## Tests

Three cells more in the seed, each through `issue.wait` and `issue.wakes` of the service in the
module's rig:

- `test_issues_wait_is_an_event_of_its_actor`: 25 bodies refused (18 before the issue is looked
  for, one that does not parse, six asked of the issue); the ends of `until`, `when` and `note` at a
  given time; the guard; the row in the three reads; a second actor under a delegation with a
  holder; one wait an actor; a move and a swap leave it; the remove; the key; ten actors, with the
  eleventh taking the place of the first written of two level ones, its own `until` the earliest of
  all; `issue.rebuild` and `issue.verify?guards=true`; a wait past its `until`, written past the
  service, kept in the row and left out of the three reads and of `issue.wakes`; two forged events found.
- `test_issues_wait_guard_is_the_policys_when_it_has_one`.
- `test_issues_wakes_answers_the_waits_that_are_due`: the six rows of the table of conditions, each
  `waiting` and then `due` after the call that made it true; a wait written after its condition;
  two actors on one issue; `since`; a `when` that answers an error on a branch its write did not
  take; `issueWakes` at `until - 1` and at `until`; an issue escalated to the security workflow; an
  issue after 20 and after 21; a security report after 21, whose opener is answered the 400 and
  another token 404 and two empty lists; that the one event after the close that made a wait due is
  the caller's own, and that no `waits` event is the service's.

**Without the change the three fail.** The seed as it was at `1904d03d` with the three cells added,
`bun test.ts brain-x-issues --with`: `passed 45, failed 3`: `issueLive is not defined`,
`Expected: 400 Received: 200` (the install of a `wait` guard that does not parse), `issueWakes is
not defined`.

**One line taken out, to see a test enter it.** With `if (id !== undefined) await ahead(view, id)`
out of the route `wakes`, the third test fails where `c2` waits for `c3`: `Expected "waiting",
Received "due"`. And with the read guard out of the two calls of `ahead`, the same test fails at the
security report: `Expected 200, Received 400 "h is after 21 issues: a wait and issue.wakes read 20
at most"`, said to a token that may not read `h`. (The seed first had `ahead` with no such guard;
it was added before the landing.) The same was not done for the other new lines.

Counts, each from a run after the last edit of the seed (2026-10-12 23:56 CEST) and after the rebase
of 23:43 CEST, which brought in no file the module is built from:

| Command | Result |
|---|---|
| `bun tools/cloud-brain/build.ts --out …` then `(cd cloud-brain-dev && bun test.ts brain-x-issues --with …/tr-1.js)` | `passed 48, failed 0, needsBrowser 15` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `"tests":63,"passed":63,"failed":[]`, Chrome 151.0.7922.34 |
| main checkout: `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | 23:58 CEST: `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`. Of the three runs of the command on the build before the last edit, two read the same and one, at 23:46 while the suite was starting, `"passed":19,"failed":0,"none":1`: one run with no verdict and no failed test |
| `tests/tools/suite.sh` | 2026-10-13 00:01 CEST: `818 pass, 0 fail` in 85 files, 182.98 s. The run before the last edit had `816 pass, 2 fail` at load 8.58 by `uptime`, both at the 30 s timeout, in `knowledge-docs.test.ts` and `summarize-papers.test.ts`, which this change does not touch; each alone was `29 pass` and `26 pass`, 0 fail |

## Not tried

- A wait on cb4 before the deploy. What was seen there after it is in the comment of the issue,
  with each call: the record is committed before the landing.
- The time `issue.wakes` takes with no `id` on cb4 (it reads every row): in the same comment.
- `seconds` of `issue.wakes` (part 4, `tr-4-held-read`): the parameter is not read.
- `waiter` of `issue.queue`, the tool and the briefs: tr-2 and tr-3.
- What the panel shows of `waits` of a row: nothing. Only the event's line was added, and no test
  of the panel draws it.
- A `when` that holds the text `"guard"`: `ruleExpression` of `cloudflare-iac.ojs`, which `decide`
  calls, writes `"deployer"` in its place, as it does in a guard. Read, not run.
- How many distinct `when` a Worker can keep parsed. `decide` keeps each expression it has parsed
  for as long as the Worker runs, and a `when` is a caller's text of 500 characters at most, asked
  twice when it is not true (itself and its negation). A guard of `issue.narrow` is kept the same way.
- A row written before `last` was kept (an issue that has not moved since the deploy of
  2026-10-12 that added it): `issue.last.at` reads 0 in a `when`, and `since` is the wait's own
  time. `issue.queue` reads such an issue's events; `issue.wakes` does not.
- Two waits of one actor written at once on one issue: the record orders them, and the later
  stands. Not run.
- An issue whose `after` target the caller may not read: a link is between two issues read by the
  same rule, and whether a target is closed is in what any caller is shown of it. Not run.
