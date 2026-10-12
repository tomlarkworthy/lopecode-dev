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
| `issues_service` | two methods more, `issue.wait` (procedure) and `issue.wakes` (query), under the rule the others have. That rule is written `caller.kind in ['owner','token','worker','deployer']`: the same four kinds, with single quotes and no spaces ("The first apply", below) |
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

Counts, each from a run after the last edit of the seed (2026-10-13 00:08 CEST) and after the rebase
under the lock of 00:02 CEST, which brought in no file the module is built from:

| Command | Result |
|---|---|
| `bun tools/cloud-brain/build.ts --out …` then `(cd cloud-brain-dev && bun test.ts brain-x-issues --with …/tr-1.js)` | `passed 48, failed 0, needsBrowser 15` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `"tests":63,"passed":63,"failed":[]`, Chrome 151.0.7922.34 |
| main checkout: `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | 00:10 CEST: `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`. Of the four runs of the command on earlier builds of this change, three read the same and one, at 23:46 while a run of the suite was starting, `"passed":19,"failed":0,"none":1`: one run with no verdict and no failed test |
| `tests/tools/suite.sh` | 00:13 CEST: `863 pass, 0 fail` in 89 files, 119.74 s |

## The first apply

2026-10-13 00:03:05 CEST, under both locks, the build of the seed as it then was (hash `36c15fa382ff`):

```
[{"worker":"brain-x-issues","hash":"36c15fa382ff","state":"put-back","previous":"40e024c3bfbe…","reason":"POST /workers/scripts/cb4-x-issues/versions 400 [{\"code\":10054,\"message\":\"Text binding 'BRAIN_INFO' is too large, its size of 5.3 kB exceeds the limit of 5.1 kB. Please use a smaller value and try again.\"}]"}]
```

Cloudflare took no version: `getInfo?worker=brain-x-issues` answered `40e024c3…` after it, so cb4 never
ran `36c15fa3`. Both locks were released (land 00:02:16 to 00:04:05, cb4 00:02:52 to 00:03:12) and
nothing was pushed.

`BRAIN_INFO` is one JSON variable the deployer binds to a Worker (`brain-deployer.ojs`, the bindings
of a Worker): its name, hash, the list of its methods and the rule of each. The same object made from
an emitted record, with a `deployedAt` of 24 characters, by a script of this writing:

```
the version that runs (27 methods)                    4930 bytes   (getInfo answers 4930 too)
with issue.wait and issue.wakes, the rule as it was   5274 bytes   refused
the same, the rule with single quotes and no spaces   4966 bytes   28 rules, 11 bytes each
```

Each method costs about 172 bytes there: its name twice and its rule. In JSON a `"` inside the rule
is two bytes, so the rule is written with CEL's single quotes. It names the same four kinds.

What that rests on, since the core asks a method's rule and no test of this module calls the core:

- `test_issues_declares_what_it_needs` asks `decide` the rule for six callers and reads the six
  answers it read before (owner, a token, a Worker and the deployer let in; a member's DID and
  `anonymous` not), and that every method but `key` has that rule. `bun test.ts brain-x-issues --with`
  runs it on the modules cb4 serves, `cloudflare-iac` and its `cel.js` among them.
- `cmp` of `tools/cloud-brain/cel.js` and `cloud-brain-dev/deploy/@tomlarkworthy/cloudflare-iac/cel.js`
  as `sync.ts` read it at 00:02: the same 82,554 bytes after one leading newline of the served copy.
  `git log -- tools/cloud-brain/cel.js` has one commit, of 2026-10-08, and `getInfo?worker=brain-core`
  answers `deployedAt` 2026-10-12T17:36:52Z.
- Not shown before the deploy: that the core cb4 runs parses it. The first `issue.*` call after the
  apply shows it, and is in the comment of the issue.

The same test holds the size: the object above in at most 5100 bytes. With the rule as it was the test
fails at the line before, which holds the rule's text; the size line was not seen to fail by itself.
4966 leaves room for no further method of this rule (one costs about 172). That is filed as feedback,
`seen-brain-info-binding-at-its-limit`: the fix is the deployer's, which the loop does not deploy.

Not changed: three texts that quote the rule as it was, each a dated reading of the seed
(`plan/cloud-brain-flow-metrics.md` line 286, `plan/cloud-brain-locks-held-in-the-cluster.md` line 331,
`tools/cloud-brain/records/fm-3-issue-flow-method.md` line 14).

The first apply's build was written to `lopebooks` and committed there as the day's backup
(`21117b9c`, "built from the seeds of lopecode-dev@96c0911c", a commit that was never pushed). It was
not pushed. The second landing takes it back under the lock and makes the backup again from the build
it deploys; what it did is in the comment of the issue.

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
