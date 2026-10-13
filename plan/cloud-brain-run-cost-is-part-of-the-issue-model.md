# Cloud Brain: what a run cost is an event of the tracker

Spec of the feature `run-cost-is-part-of-the-issue-model` on cb4's tracker. Written 2026-10-11 from
21:41 CEST (event 2303's `at`, the move to `spec`); a fresh agent's review of the draft was answered
at 21:55 (`date`). From `lopecode-dev` `2d548250` and the tracker at
event 2304. Nothing here is built. Every count under "What exists today" was made that evening from
`issue.sync?after=0` read with `issues-implementer-2` (2304 events, 9 of them hidden to that token),
by two scripts that are not kept (`measure.py`, `proto.py`, in the session's scratch directory).
The record grew to 2332 events while this was written; the counts are of the first 2304.

## What was asked

Tom, 2026-10-11, the whole of what he said, as the issue's body quotes it:

> I think all the token cost metrics and timings are really good on the ticket, we should make them 1st class citizens of the model and not a JSON blob appended as a string. Please file

The issue's body (event 1978, written by the orchestrating session, not his words) turns that into
five things wanted and five questions "for the spec to settle". This spec takes a side on each
question, by line 2 of the philosophy; his approval of the spec is where he rejects one.

| The question | Taken here | Decided by |
|---|---|---|
| A new event type, or `extra` on the move a run made | A new event type, `cost` | 20 of 288 cost comments name no event; all 288 were written after the run, by another call than the move; a signed move takes no field later |
| Whether dollars are kept | `usd` is optional and is only the figure a process reported of itself. No fitted figure is written | All 85 `usd` in the record are a light reviewer's own; 0 are of a subagent |
| What becomes of the comments already there | Each is entered again, once, as a `cost` event that names its comment. The comments stay as they are | 288 of 288 pass the new shape check when entered so (run below) |
| Which token may write one | Whoever the issue's workflow lets label: the owner or a token | Line 1: the narrower of the two guards a workflow already has |
| Fields fixed in the service, or part of the policy | Fixed in the service | `verdict` and `rel` are; a policy is the owner's install |

## The reports gathered

`list?parent=run-cost-is-part-of-the-issue-model` answers `{"issues":[]}`: nothing was gathered into
it. The issue is its own report. The requirements, from its paragraph "Wanted":

- **R1.** What a run cost is an event with its fields as fields. One whose required field is
  missing, or whose field is of the wrong type, is refused and nothing is written.
- **R2.** A correction, or the usage of a run added later, is one more call. No reader joins two
  events by hand.
- **R3.** `issue.get` answers the totals of the issue: runs, seconds, the four token sums, the
  advisor's three, and the same by role.
- **R4.** One call reads the runs of every issue, and can be asked for one role, one round, or one
  kind of run (fresh, resumed, light).
- **R5.** The page shows a run as a line of the issue, and the totals of the open issue.
- **R6.** The runs already in the record as comments are in R3 and R4, each once.
- **R7.** The loop writes the event and reads the event. No tool or brief parses a comment's body
  for a cost.
- **R8.** What works today still does: `issue.verify?guards=true` over the whole record, a key
  kept once, a rework round sent to the agent that wrote the change.

Related and not parts:

- `flow-metrics` (1179, open) asks for lead time, deploy frequency and the like on a dashboard.
  It counts states and deploys, not what a run was billed. It could read `issue.runs` later.
- `dashboard-service` (building) and its `dsv-4-cost` (done): "cost" there is what a `metric.query`
  costs Cloudflare. Another thing with the same word.
- `ps-4-the-rest` (triaged) adds `paper-summarizer` to the roles of a cost comment. A role is a
  name here and needs no change of the service; its line of `SKILL.md` is written in the new form
  if it lands after task 5, and entered again by task 4's script if before.
- `record-names-token-not-agent` (building; `ta-3-orchestrator-steps` in progress) adds `"token"` to
  the cost line and moves its writing to the orchestrator's own `orch-` token. The event has the
  field, and an `orch-` token is a token: the guard below passes it.

## What exists today

**A run's cost is a comment, and nothing but an agreement gives it a shape.** `SKILL.md` step 5
(lines 132 to 163) tells the orchestrator to write `cost {…}` under the key
`cost-<id>-<role>-<round>`. The service sees a comment: `issueAct("comment")` checks that `body` is
text of at most 20,000 characters (`brain-issues.ojs` line 646) and `issueApply` counts it
(`i.comments++`, line 416).

```
events 2304   opened 237  moved 778  commented 828  reviewed 174  linked 138  labelled 81  swapped 36  attached 28  policy 4
commented 828:  288 begin `cost {`   172 begin `cost-usage {`   368 are something said
```

So 460 of 828 comments, 56%, are the loop's accounts. They are 108,272 characters of body.

**The fields, as written.** All 288 parse. The count is 288 where the issue's body says 231: 57 were
written between event 1978 and event 2304.

```
field       in     type    
role        288    str     reviewer 159, implementer 104, spec-writer 24, digest 1
round       288    int     1 to 4
tokens      288    int     the size of the agent's last request, not what was billed
seconds     288    int
outcome     288    str     in-review 124, pass 96, changes 63, stopped 4, no-submit 1
event       268    int     all 268 name an event of the same issue
tools       151    int
session     167    str
agent        81    str
backfilled  100    bool    entered from the journal on 2026-10-11
light        86    bool    the reviewer run by agent.sh
resumed      20    bool    a round sent to an agent that was still there
usd          85    float   all 85 on a light run
usage        83    object  { input, cacheWrite, cacheRead, output, requests, advisor: { calls, input, output } }, all nine in each
```

No line has a field outside this list. No two lines of one issue have the same role and round.

**The usage of 172 runs is in a second comment.** `cost-usage {"of":<seq>,…}`, key
`cost-usage-<id>-<role>-<round>-<seq>`. Each of the 172 has the same eight fields: `of`, `role`,
`round`, `backfilled`, `how`, `agent`, `session`, `usage`. Its `how` is text that says how the
transcript was found (`session` 39, `agent, run N of M` 44, `matched by event N` 89; the split is
the reviewing agent's count, the 172 mine). All 172 parse; each `of` names a cost comment; none names
one that has a `usage` of its own; no cost comment is named twice. So 255 of 288 runs have a usage
(83 inline, 172 joined) and 33 have none. 39 of the 172 carry `"agent":null`, the light reviewer's.

**Every reader parses the body again.** Five, of the ten files that `grep -rlE 'cost \{|cost-usage|\^cost |startsWith\("cost'` finds under `tools/cloud-brain`, the skill, `tests/tools` and `cloud-brain-dev` (the other five are records and a test that only names them; without `\^cost ` the grep misses `issue-stats.ts`, whose line is a regex):

| Reader | What it does |
|---|---|
| `issue-stats.ts` line 122 | `JSON.parse(e.body.slice(5))` inside `try { } catch {}`: a line that does not parse is dropped without a word |
| `SKILL.md` line 195 | the orchestrator reads the issue's "last comment whose body starts `cost {"role":"implementer"`" for `agent` and `session`, to send a rework round |
| `brain-feedback.ojs` line 65 | `lastOf` leaves out an event whose body matches `/^cost \{/`, so that a note on the owner's page does not show the loop's accounts as the last thing said |
| `tests/tools/rework-resumes-the-implementer.test.ts` line 16 | parses every `cost {…}` example of `SKILL.md` |
| `records/cost-comment-has-billed-usage.backfill.py` | wrote the 172 |

**What the tracker answers.** `issue.get` of an issue with eight runs:

```
get keys    ['issue', 'children', 'events']
issue keys  about body by closed comments extra id kind labels linked links opened_at opener parent reviews seq state title updated_at workflow
```

`comments` is a count. `issue.runs` is `501 MethodNotImplemented`. The question of the issue's
body, "is a resumed round cheaper than a fresh one", took five calls of `issue.sync` (500 events
each, 791,586 bytes the first, 0.48 s) and the two parses.

**Who wrote them.** All 288 by `delegation:b6559fa96c36`, the token `issues-implementer-2`. They
are on 100 of the 237 issues; 91 of those are `done`, 6 `building`, and one each `closed`, `spec`,
`rejected`. They were judged under three workflow hashes (`8dd86dbd` 179, `9d6a70db` 62,
`39d9f385` 47), each of which has a `label` guard: `issuePolicyAct` refuses a workflow without one
(line 592).

**The code already has the way to add an act a workflow predates.** `issueAllowed` lines 514 and
521: `test(wf.link ?? wf.label, issue)`, `test(wf.attach ?? wf.comment, issue)`. `issue.policy` on cb4
that evening: each of the four workflows in force has a `link` guard and none has `attach`, so every
attachment in the record (28) was judged by the fallback, with no install for it.

**What the service keeps of an issue.** One row of `issues_view`, the issue as JSON, written in the
transaction of each event (`append`, line 771). `issue.list` and `issue.snapshot` answer those rows:
152,748 and 291,209 bytes at event 2304, in 0.34 s and 0.69 s. `issueApply` (line 397) makes the
row from an event with no I/O, and is run by the service, `issue.rebuild`, `issue.verify` and the
page's copy.

**`issue.verify?guards=true`** answered `{"ok":true,"seq":2332,"checked":2332,"guards":true}` in
1.43 s at 21:48, with the implementer's token. `issueReplay` (line 546) answers "no such type of
event" for a type its table lacks.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`, 2026-10-11 21:43):

| Searched | Found | Used |
|---|---|---|
| "cost of an agent run tokens billed per issue" | `doc:cloud-brain-record-names-token-not-agent` 0.903, `doc:effective-use-of-fable` 0.81, `doc:cloud-brain-record-checked-by-review-alone` 0.648, `doc:cloud-brain-lean-reviewer-persona` 0.602, `simon-willison:…default-hard-budget-caps` 0.492 | The first, read whole: its `"token"` field and its `orch-` writer are in the design. The others not read for this |
| "typed event schema validation append-only record correction" | `module:…synchronizing-external-state-into-bigquery-efficiently` 0.684, papers on self-correction | Nothing: the module is about BigQuery schemas by its title, not read |
| "token usage accounting per task telemetry" | `module:tomlarkworthy:brain-logs` 0.901, `module:tomlarkworthy:brain-ai` 0.5, `doc:cloud-brain-dashboard-service` 0.397 | Nothing. The logs are 7 days of lines a Worker wrote; a run is not a Worker's call |
| "event sourcing amend correct an immutable event" | `module:tomlarkworthy:cloudevents-explorer` 0.722, `doc:cloud-brain-issues` 0.534 | `plan/cloud-brain-issues.md`, "An event" and "Amended 2026-10-11", read: how `linked` was added |
| "aggregate totals over issues by role" | `doc:cloud-brain-lean-reviewer-persona` 0.737, `doc:cloud-brain-issues` 0.686 | Nothing new |

Outside, two pages:

- Microsoft Azure Architecture Center, "Event Sourcing pattern"
  (`learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing`, updated 2026-09-25), read
  whole as fetched. Used, on correction: "you should never update the event data. The only way to
  update an entity or undo a change is to add a compensating event". On old data in an old shape
  it lists four ways: tolerant deserialization, a version in the event, upcasting ("transformation
  functions that convert older event schemas to the current schema during deserialization … The
  stored events remain unchanged"), and rewriting in place, "a last resort". The design's R2 is
  the first sentence. "Not chosen", 2 is upcasting, weighed and not taken.
- OpenTelemetry semantic conventions, the `gen_ai.usage.*` attributes
  (`github.com/open-telemetry/semantic-conventions`, `docs/registry/attributes/gen-ai.md`). Read
  in a summary a small model made of the page, not the page: it lists `input_tokens`,
  `output_tokens`, `cache_creation.input_tokens`, `cache_read.input_tokens` and
  `reasoning.output_tokens`, all integers, and no attribute for money. Used: the four sums the
  loop already keeps are the same four another system keeps, and that one keeps no dollars. The
  names are not taken: 255 usages are written `cacheWrite`, `cacheRead`.

Tried and not read: the usage object of the Claude API reference
(`platform.claude.com/docs/en/api/messages`); the fetch gave the request half of the page only.

## The design

**A write, `issue.cost`, whose event has the type `cost`, one for a run. The issue's row keeps its
runs. Two reads answer from the rows.** All of it is in `brain-issues.ojs`, the Worker
`brain-x-issues`, which the loop deploys.

### The event

```
issue.cost { key, id,
  role      a name, a-z 0-9 -, 30 at most        implementer, reviewer, spec-writer, digest, paper-summarizer, …
  round     a whole number, 1 to 1000            the runs of that role on that issue, from 1
  how       fresh | resumed | light              spawned; sent to an agent that was there; run by agent.sh
  outcome   a name, 30 at most                   in-review, pass, changes, stopped, no-submit, …
  seconds   a whole number, 0 or more
  context   a whole number, 0 or more            the size of the last request: what `tokens` was
  tools     ┐
  event     ├ optional whole numbers             `event`: the submit or the review the run made, below this event's own seq
  of        ┘                                    `of`: the comment this run was first written as (task 4 only)
  agent, session, token   optional text, 1 to 100
  usage     optional; when there, all of { input, cacheWrite, cacheRead, output, requests, advisor: { calls, input, output } }, whole numbers
  usd       optional number, 0 or more           what the process reported of itself; never computed from prices
  backfilled  optional, true }
```

- `role`, `round`, `how`, `outcome`, `seconds` and `context` are required: `role`, `round`,
  `outcome`, `seconds` and `tokens` are in 288 of 288 lines, and `how` is made from `light` and
  `resumed` for all 288. Anything missing, of another type, or not in this list is 400
  `InvalidRequest` naming the field, from `issueAct`, where every other body is checked. A field
  that is not known is refused, not dropped: a misspelt `usage` would otherwise be a run with none.
  (As built, `cm-1-cost-event`, 2026-10-12: an `event` or `of` past the record's head is 403
  `Refused`, from `issueAllowed`, which has the head; `event` and `of` are 1 or more; a key that
  `usage` does not list is refused inside it too; the record.)
- `how` is one field where the comment had two booleans, `light` and `resumed`, and a third kind
  that was the absence of both.
- `context` is the new name of `tokens`. The record `cost-comment-has-billed-usage.md` opens with
  what the old name cost: "`tokens` is the size of an agent's last request … so its figure is
  higher" was read as a bill. `agent.sh` already prints the number as `context`.
- `role` and `outcome` are names and not lists: `paper-summarizer` (`ps-4-the-rest`) is a role
  with no deploy. `how` is a list, in `issuesLimits`, as `verdicts` and `rels` are.
- The answer is the one every write gives, `{ id, seq, event }`, and a key kept is
  `duplicate: true`. The key is `cost/<id>/<role>/<round>`: no event of the 2304 has a key that
  starts `cost/`, the comments' keys start `cost-`, and `policy/` stays the service's. With an id
  of 40 and a role of 30 the key of a correction, `cost/<id>/<role>/<round>/<n>`, is 86 characters
  at most for a round and an `n` under 1000; a key is 100 at most (`issuesLimits.key`).

### Who may write it

`issueAllowed`: `test(wf.cost ?? wf.label, issue)`, after the read guard as for every act. Under
the policy in force that is `caller.kind in ["owner", "token"]` (the rest of the label guard reads
`event.remove`, which is empty for this act). `wf.comment` is `"true"` and would let a Worker of the
Brain or the deployer write a cost; `label` does not. Line 1: take the narrower. `issuePolicyAct`
takes an optional `cost` guard as it takes `link` and `attach`, so a later policy can name its own
with no change of the code. No policy is installed for this.

### One run, and its correction (R2)

A run is an issue, a role and a round. The issue's row keeps `runs`, a list of the events' own
fields with `seq` and `at`, one for each role and round (as built, `cm-1-cost-event`, 2026-10-12:
without `replaced`, which is in the event, and in the order of the events in force; the record). A `cost` event for a role and round the
issue already has takes that one's place, and the service writes `replaced: <its seq>` into the new
event (`issueEvent` reads it from the view, as it reads `from` of a move). So:

- the usage of a run that was written without one is the same call again, whole, with `usage`,
  under another key (`cost/<id>/<role>/<round>/2`);
- a wrong number is corrected the same way;
- both events stay in the record, and the second says which it replaced;
- a call sent twice with one key writes once, as now.

The whole run is sent, not the changed fields: one rule (the last stands), and no question of what
a field left out means. `issueReplay` judges `replaced` against the view, so a `cost` event that
names the wrong one fails `verify?guards=true`.

`issueApply` for a `cost` event sets `runs` and `seq` and leaves `updated_at`. What a run cost is
not work on the issue: task 4 writes 288 of them, on 100 issues of which 93 are closed, and `issue.list`
is ordered by `updated_at`. `seq` moves, so the page asks for the issue again.

The page keeps its copy of the view in `localStorage` and applies each event to it with the
`issueApply` it loaded (line 1128); the store has no version (`issuesStore`, line 1049). A tab that
was open before task 1 would apply `cost` events with the old function, move `updated_at`, keep no
`runs`, and store that. So task 1 changes the store's name (`issuesStoreName`, `brain_issues2 `): a
page with the new module starts from a snapshot. Found by the fresh agent's review; not run.
(As built, `cm-1-cost-event`, 2026-10-12: the name is `brain_issues2 ADDRESS`. No tab with a copy
under the old name was opened; the record.)

### The reads (R3, R4)

`issueCost(runs)`, a cell with no I/O, is the totals:

```
{ runs, seconds, billed,                 billed: how many of the runs have a usage; the sums below are of those
  input, cacheWrite, cacheRead, output, requests,
  advisor: { calls, input, output },
  usd, usdRuns }                         usdRuns: how many of the runs have a usd; left out with usd when 0
```

- **`issue.get`** answers `cost: { …the totals, byRole: { implementer: {…}, reviewer: {…} } }`
  beside `issue`, `children` and `events`, from the row it already reads. An issue with no run has
  `cost.runs` 0. A hidden issue has none.
  (As built, `cm-2-cost-reads`, 2026-10-12: `usd` is the sum to a millionth, so 0.1 and 0.2 read
  0.3; `byRole` is in the order of each role's first run in the row; the record.)
- **`issue.runs`**, a query: `?id=&role=&how=&round=&after=<seq>&limit=500`. `{ runs: [{ id, …the
  run }], total: {…the totals of every run the query matches, not of this page}, more }`. `round` is a number, or `first`, or `later`. It
  reads the rows as `issue.list` does and leaves out an issue the caller may not read. The rows
  are in the answer so that a median is the caller's to take: a sum is not what the comparison of
  the issue's body needs.
  (As built, `cm-2-cost-reads`, 2026-10-12: the runs are in the order of `seq`; a `how`, `round`,
  `role`, `after` or `limit` that is not one of the field's values is 400 `InvalidRequest`, and one
  left empty asks for nothing; `limit` is 1 to 500; `total` is the same on every page, `after` and
  `limit` do not change it; an `id` that names a hidden issue, or none, answers no runs and not
  404; the record.)
- `issue.list` and `issue.snapshot` carry `runs` with the rest of the row, with no code of their own.

What that adds, from `proto.py` over the 288 runs entered as the design has them: 90,490 characters
of JSON in all, so `issue.list` goes from 152,748 bytes to about 243,000 and `issue.snapshot` from
291,209 to about 382,000. The most on one issue is 8 runs. The page keeps the snapshot in
`localStorage`; how much that origin may hold was not measured.

### The page (R5)

In `issuesPanel`: `said(e)` gets a line for the type, `implementer round 2, resumed, in-review ·
410 s · context 201,310 · billed in 61, written 141,873, read 3,561,349, out 17,885, 29 requests ·
advisor 2 calls`, with `replaces 1203` when it does. The open issue gets one line of totals under
its links, from the row. Today a `cost` event would draw as its type and nothing after it
(`said` falls to `e.body || ""`, line 1278).
(As built, `cm-6-panel-draws-a-run`, 2026-10-12: a run sent with no `usage` reads `no usage` where
the sums are; the advisor's calls are left out at 0; `$N` follows when the run reported a `usd`. The
totals line is `cost 3 runs · 1,820 s · 2 with a usage: in …, written …, read …, out …, 58 requests ·
advisor 4 calls · $0.3 of 2 runs`, and an issue with no run has none. In the block "For your
attention" a `cost` event is passed over where the last event is shown; the record.)

`brain-feedback.ojs` needs no change of code. `lastOf` (line 65) takes an event only when `said(e)`
is not empty, and `said` (line 63) is `e.body || e.reason || …` with a text for `linked` and
`swapped` alone: a `cost` event has neither and is passed over. The draft of this spec had a change
here; the fresh agent's review read line 63. Task 3 is a test that holds it.

### The runs already there (R6)

A script, `tools/cloud-brain/cost-events.ts`, reads the record, and for each `cost {` comment with
no `cost` event of that issue whose `of` is its seq, calls `issue.cost` with the comment's fields:
`tokens` as `context`; `how` from `light` and `resumed`; `usage` from the line or from the
`cost-usage` comment that names it; `agent` and `session` from either, a `null` left out; `of` the
cost comment's seq; `backfilled` from the cost comment alone. The `how` and the `backfilled` of a
`cost-usage` comment are not carried: they say how a usage was found, and the comment stays to say it; key `cost/<id>/<role>/<round>`. With no flag it prints what it would send and what
is missing. `--post` sends. It is run with the loop's token.
(As built, `cm-4-enter-the-runs-again`, 2026-10-12: the tool takes `--token NAME` and has no
default; a second comment of one issue, role and round has the key `cost/<id>/<role>/<round>/<n>`;
a comment is passed over when a `cost` event of its run has no `of` or a later one; `--check
MODULE.js` gives each body to the tracker's own `issueAct`; `--post` stops at the first answer that
is not a new event. 383 comments were entered, as events 2953 to 3335; the record.)

Run on the record at event 2304, in `proto.py`, with the shape check of "The event" written out:

```
entered as the event's body: 288    refused by the shape check: 0
with usage 255    with usd 85    usd and not light 0    light 86
issue/role/round held twice 0
```

The first run of it refused 39: `"agent":null` from the light reviewer's `cost-usage` comments. That
is why the script leaves a `null` out, and why the check is run on real lines before it is deployed.

The comments stay. They are signed, and 460 events are not rewritten for this. After task 5 no
reader looks at them. Events hidden to the loop's token (9 at event 2304) are not read by the
script; whether any is a cost comment cannot be seen with that token.

What the reads would answer for the record at event 2304, from the same run. This is the table of
the issue's body in one call's worth of rows:

```
role         round  how      runs  with usage  median seconds  median cacheRead
implementer  first  fresh      72      63          682           4,081,273
implementer  later  fresh      15      10          616           3,087,813
implementer  later  resumed    17      17          283           1,884,936
reviewer     first  fresh      46      37          307           1,409,518
reviewer     first  light      52      52          320             997,173
reviewer     later  fresh      27      21          309           1,762,237
reviewer     later  light      34      34          278             730,245
spec-writer  first  fresh      11       9          904           5,867,217
spec-writer  later  fresh      10      10          454           2,518,103
spec-writer  later  resumed     3       2          361           1,996,356
digest       first  fresh       1       0         1006                   -

all   runs 288  seconds 146,684  billed 255  input 14,406  cacheWrite 31,079,193  cacheRead 628,778,702
      output 5,288,458  requests 5,729  advisor calls 295, input 31,763,801, output 1,907,252
```

The issues are not the same between rows, as the record of 2026-10-11 says of its own table. A median that fell on a half is cut to the whole number below.

### The loop (R7)

- `SKILL.md` step 5: the orchestrator calls `issue.cost` where it wrote a comment. The line of
  `agent-usage.ts` goes in as `usage`, as it is. A run whose transcript is found later is the call
  again with `usage` (R2), not a `cost-usage` comment.
- `SKILL.md`, "A rework round goes to the agent that wrote the change", step 1: read
  `issue.runs?id=<id>&role=implementer`, the run of the highest round, for `agent` and `session`.
- `issue-stats.ts`: `costs` is made from `cost` events, the one in force for each role and round.
  `c.tokens` becomes `c.context`. The `try { } catch {}` goes.
- An overseer's run and the orchestrator's own pass are on no issue and stay in `_oversight.md` and
  `_orchestrator.md` as step 5 has them. An event needs an issue. Not changed here.
  (Since `overseer-runs-too-often`, 2026-10-13, an overseer's run is on the issue it looks at and has its `cost` events there.)

(As built, `cm-5-the-loop-writes-the-event`, 2026-10-12: a spec writer's and a digest writer's round
is read the same way, `issue.runs?id=<id>&role=spec-writer`. `issue-stats.ts` takes the last `cost`
event of an issue, role and round in the record it read, and does not read `replaced`. A run of two
rounds (os-4) is one event with no field for the count: `"rounds":2` of the comment is not carried,
since `issue.cost` refuses a field it does not list. An Agent result with no `seconds` or no count
of tokens has 0 for it. The line of `issue-stats.ts` still says `tokens`; the record.)

### Not chosen

1. **The cost as a field of the move the run made.** 20 of 288 runs made no event (stopped, or
   backfilled with none to match), and the cost is known after the move is signed. `extra` is also
   taken: it is the list of an issue's own guards (`i.extra`, line 439).
2. **Leave the comments and have the service read them** (an upcaster in `issueApply`). No write of
   288 events. But `issueApply` runs in four places, and the agreement of a skill file would then
   be code in the service for as long as the record is kept, with the join by `of` inside it. The
   owner, 2026-10-10, of the same record when it was a day old: "jsut resign everything and move
   on, we don;t need a key migration stratergy". Entering them again is one script, run once, and
   12% more events (288 on 2332).
3. **A table of runs beside the record**, as `issues_locks` is, with sums by SQL. A lock is not in
   the record because it is no fact about an issue. A run's cost is one, and he asked for it in
   the model: it is signed, in `issue.sync`, and remade by `issue.rebuild` with nothing added. The
   rows of an issue are bounded (8 at most today), so the view row holds them.
4. **Totals kept in the row and no runs.** Smaller answers. A correction would then have to take
   the old run's numbers off, which `issueApply` cannot know without the run.
5. **A correction that sends only the changed fields.** Shorter calls. Two rules where one does.
6. **Dollars computed in the service from prices.** The prices of 2026-10-11 were fitted to six
   runs, "the worst of the six is off by $0.04". A fitted number in a signed record reads as a
   measured one. A reader that wants dollars multiplies the four sums by the prices of its day.
7. **`role` and `outcome` as lists the service checks.** A misspelt role would be refused. A new
   role would then be a deploy: the record has 4 roles, `SKILL.md` step 5 names 6, and
   `ps-4-the-rest` adds a seventh.
8. **A guard of its own in the default policy now.** It would need an install, the owner present.
   The fallback gives the same answer under the policy in force.

### What is not checked

- That `event` names an event of the same issue, or the one the run made. It is below the cost
  event's own seq and no more. All 268 in the record do name one of their issue.
- That `round` is the next. Round 3 with no round 2 is taken.
- That the numbers are true. The service checks a shape; `agent-usage.ts` and its tests are what
  the usage rests on.
- That a correction was meant. A second call for a role and round, under another key, replaces the
  first whoever sends it, if the guard lets them. The record keeps both.

## How each requirement is known to be met

`ia` is `tools/cloud-brain/issue-as.sh <the agent's token>`. None of these needs the owner's
session, `logs.query` or a tab. A check marked *after* cannot be run before its task is built: the
method is not on cb4 (`ia runs` is 501 today). It is run first in the task's worktree with
`bun test.ts brain-x-issues --with <the built module>` as a `test_*` cell, and then on cb4 after the
deploy. Results marked *run* are from this evening.

| | Check | Result |
|---|---|---|
| R1 | *after.* A `test_*` cell sends `issue.cost` with each of: no `role`; `round: "2"`; `seconds: 1.5`; `usage` with no `advisor`; `tokens` in place of `context`; `how: "warm"` | 400 each, and the record's head has not moved. *run*, on the check as `proto.py` has it: all six refused, naming `role`, `round`, `seconds`, `usage`, `context` with `unknown:tokens`, `how` |
| R1 | *after.* On cb4, `ia cost '{"key":"cost/<a test issue>/probe/1","id":"<a test issue>","role":"probe","round":1,"how":"fresh","outcome":"stopped","seconds":0}'` | 400 `InvalidRequest`; the issue named need not exist, the body is checked first |
| R2 | *after.* A test cell: a run with no `usage`, then the same role and round with one, under another key | the second event has `replaced` the first's seq; `issue.get` has `cost.runs` 1 and `cost.billed` 1 |
| R3 | *after.* `ia "get?id=record-first-resumed-rework-round"`, once task 4 has run | `cost.runs` 8, `cost.seconds` 2004, `cost.cacheRead` 10,607,797, `cost.advisor.calls` 7, or more if a run was added since. *run*: those four from `proto.py` at event 2304 |
| R4 | *after.* `ia "runs?role=implementer&how=resumed&round=later"` | one answer, 17 runs or more, each with a `usage`. *run*: 17 at event 2304 |
| R4 | *after.* A test cell: an issue on a workflow the caller may not read, with a run | its run is in no answer of `issue.runs` to that caller |
| R4 | *after.* A test cell: more runs than `limit` | `more` is true and `total.runs` is the count of all that match |
| R5 | *after.* A test cell draws the panel on a view with a `cost` event | the event's line has the role and the seconds; the open issue has a totals line |
| R6 | *after.* `bun tools/cloud-brain/cost-events.ts` with no flag, after task 4's `--post` | `0 to enter`. Before it: `288 to enter` at event 2304, more by the day it runs |
| R7 | the grep under this table, after task 5 | `SKILL.md` and `issue-stats.ts` 0. `brain-feedback.ojs` as today: the line that leaves the old comments out, and its test's. *run* today: 4, 1 and 5 |
| R7 | `bun test ./tests/tools/issue-stats.test.ts ./tests/tools/rework-resumes-the-implementer.test.ts` in the worktree | pass, with fixtures of `cost` events |
| R8 | `ia "verify?guards=true"` after task 1's deploy, again after the first `cost` event, again after task 4 | `ok: true`, `checked` the head's seq. *run* before: `{"ok":true,"seq":2332,"checked":2332,"guards":true}` |
| R8 | *after.* A test cell sends one `issue.cost` twice with one key | the second answers `duplicate: true`, one event |

R7's grep, kept out of the table for its `|`:

```
grep -cE 'cost \\?\{|cost-usage' .claude/skills/brain-maintenance/SKILL.md tools/cloud-brain/issue-stats.ts tools/cloud-brain/brain-feedback.ojs
```

## The tasks, in the order they land

Each is one writer and one review. The ids are proposals.

1. **`cm-1-cost-event`.** `brain-issues.ojs`: `issueAct("cost")`, the guard in `issueAllowed`, the
   optional `cost` guard in `issuePolicyAct`, `issueEvent` with `replaced`, `issueApply` (`runs`,
   `updated_at` left), `issueReplay`'s table and its check of `replaced`, `how` in `issuesLimits`,
   the route and the method in `issues_service`, the method reference, and the new name of the
   page's store. Tests: the two of R1's
   first row and R2, R8's two, and one that `verify?guards=true` passes over a record with a
   `cost` event and fails when `replaced` is changed. A deploy of `brain-x-issues`. Nothing writes
   the event yet.
2. **`cm-2-cost-reads`.** `issueCost`, `cost` in `issue.get`, `issue.runs`, the reference. Tests:
   R3 and R4 on a rig, the hidden issue, the page past the limit. A deploy of `brain-x-issues`. After 1.
3. **`cm-3-feedback-test-has-a-cost-event`.** `brain-feedback.ojs`: the test of line 426 is given a
   `cost` event beside its two comments, and no other line changes. A changed `test_*` cell is a
   deploy of its Worker, `brain-x-page`. Beside any task after 1.
   (As built, `cm-3-feedback-test-has-a-cost-event`, 2026-10-12: the test is at line 722, and two
   `cost` events were added, one on each issue that has a cost comment. `brain-feedback` is a module
   of the shell and of no Worker, so nothing was deployed; it is on cb4 when the shell is posted;
   the record.)
4. **`cm-4-enter-the-runs-again`.** `tools/cloud-brain/cost-events.ts` and its test under
   `tests/tools/` (a fixed list of events: a line with its usage inline, one with a `cost-usage`,
   one with `agent: null`, one already entered). Then `--post` on cb4, and the checks of R3, R4,
   R6 and R8 in the record. After 2. No deploy.
   (As built, `cm-4-enter-the-runs-again`, 2026-10-12: the check of R6 is
   `bun tools/cloud-brain/cost-events.ts --token NAME`; the record.)
5. **`cm-5-the-loop-writes-the-event`.** `SKILL.md` step 5 and the rework section, `issue-stats.ts`,
   the two test files. Then `cost-events.ts --post` once more, for the comments written while 1 to
   4 landed, and R7's grep. After 4. No deploy. If `ta-3-orchestrator-steps` has landed, the
   `token` field is in the example lines.
   (As built, `cm-5-the-loop-writes-the-event`, 2026-10-12: four test files changed. The two more are
   `tests/tools/issue-wait.test.ts`, which held the sentence of step 5 on a run of two rounds, and
   `tests/tools/briefs-name-the-prompts-token.test.ts`, which parsed the examples of step 5. An
   orchestrator that read `SKILL.md` before the landing writes comments until it reads it again, so
   `cost-events.ts --token NAME --post` is run again when its dry run says there is one to enter;
   the record.)
6. **`cm-6-panel-draws-a-run`.** `said` and the totals line in `issuesPanel`, with R5's test. A
   deploy of `brain-x-issues`. After 2; beside 4 and 5.

Should task 1's Worker be put back by the deployer after a `cost` event is in the record, the older
code answers `verify?guards=true` with "no such type of event" at that event. That is why task 1
writes none, and task 4 runs only after tasks 1 and 2 stand verified.

## What only the owner can do

- Approve this spec, or send it back naming which row of the table in "What was asked" is wrong.

Not asked of him: a policy install, a rebuild, a secret, a token, or a deploy of the kernel, the
core, the database or the deployer. If he wants cost writing held to one token, that is a `cost`
guard in a policy he installs, afterwards.

## Not verified

- That a new method of `brain-x-issues` reaches callers with no change of the core. `issue.lock`
  was added by the loop this way on 2026-10-11 (`lk-1-issue-lock-methods`); the core was not read
  for this spec.
- What 288 writes in a row cost in time. The backfill of 172 comments was made the same way; its
  duration is not in its record.
- How large a `localStorage` entry the page's browser takes (the snapshot would be about 382 KB).
- Whether any of the 9 events hidden to the loop's token is a cost comment.
- The sizes "about 243,000" and "about 382,000" are sums of two measured numbers, not answers of
  a built service.
- Nothing of the design was run inside the seed. The shape check and the fold were written in
  Python in `proto.py` and run over the real lines; the cells are the tasks' to write.
