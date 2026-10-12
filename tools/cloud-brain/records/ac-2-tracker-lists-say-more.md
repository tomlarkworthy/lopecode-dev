# ac-2-tracker-lists-say-more

2026-10-12. Task 2 of `plan/cloud-brain-answers-cut-and-not-said.md` (R2, R4, "The tracker's
lists"): `issue.list` answered 100 issues and `issue.sync` 200 events with no field that said more
remained. One seed changed, `tools/cloud-brain/brain-issues.ojs`, and its Worker `brain-x-issues` is
deployed by the landing. Times are from `date`, CEST. This file was written before the deploy: what
cb4 answered after it is in the comment of the issue, not here.

## What changed

Two answers gain fields. No call is refused that was taken, and no field is lost.

```
issue.list   { issues, total, more }       total: found.length, the issues that pass the filters
                                           more:  found.length > issues.length
issue.sync   { seq, wait, events, more }   more:  events.length > 0 && events.at(-1).seq < view.seq
             { seq, wait, reset: true, events: [], more: false }
```

- `total` counts the issues answered as `hidden` with the rest. They are in `issues` as what is
  left of them, so a count without them would be under the list's own length. Such an issue is
  matched by its `state`, `kind` and `parent` alone, as before, so a caller who may not read an
  issue does not learn from `total` that it has a label.
- The spec's sentence for `more` of a sync, "false with no events, and in the answer that has reset:
  true", is read as two cases that are both `false`. A reset answer has no events.
- `more` of a sync is taken against the head read after the events (`load` runs second), so an
  event written between the two reads gives `more: true` and is answered by the next call.
- The default of the list was the literal `100` in the handler. It is `issuesLimits.list`, so the
  test of the reference holds the row's numbers against it.
- The two rows of the reference (the first `md` cell) say the default, the most, how a `limit` out
  of range is read, and what to do at `more: true`: for `sync`, `after=` the `seq` of the last
  event answered; for `list`, a `limit` up to 500, a narrower filter, or `issue.snapshot`. The list
  has no second page (the spec, "Not chosen").

Not changed: the page's copy (`issuesPanel`, `sync`), which asks 200 events and reads `wait`,
`reset` and `events` (read in the seed). It does not read `more`.

## Tests

`test_issues_list_and_sync_say_when_more_remain`, one cell, through `issuesRig()`, so each answer
is the handler's. It was written first and run on the handlers as they were:

```
"name":"test_issues_list_and_sync_say_when_more_remain","state":"failed" … - 5, - false, + undefined, + undefined
```

What it asks: the list with no limit, at the count, one under and one over; by `kind`, by a state
that matches nothing; `limit` of `abc`, `0`, `-3`, `2.5`, `4.5`, `9999`; as a token that reads one
issue as hidden, with and without a label filter; 501 and 500 issues at the default and at
`limit=500` and `501`. The sync at and under the head, at `limit=1`, past the head (reset), with a
`head` that is not the event's hash (reset), as the token that reads one event as hidden, followed
by `after=` over two pages, at `limit=4`, and 501 events at the default, at 500 and from `after=1`.

The 496 issues and 495 events past the opened ones are put in the rig's tables, not written by the
service: 496 opens are 496 signatures, and neither read checks one. So those cases run the
handlers over rows the service did not make.

`test_issues_reference_states_each_value_and_has_no_hole` gains five texts of the two rows, built
from `issuesLimits`.

Counts, each run after the last edit of the seed and after the rebase (23:09 to 23:10):

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>` | `"passed":45,"failed":0,"needsBrowser":15` |
| the same with no `--with`, what cb4 ran (`539f0a8fef38`) | `"passed":44,"failed":0,"needsBrowser":15` |
| `bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-issues --emit …` | `"tests":60,"passed":60,"failed":[]`, Chrome 151 |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <build> --times 20` | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `"tests":60` in each of the 20 lines |

## Not tried

- The tests of the modules that call the two methods (`brain-feedback`, `cloud-brain`) were not
  run. `git grep -n "toEqual" -- 'tools/cloud-brain/*.ojs'`
  was read for a whole answer of `issue.list` or `issue.sync` compared; none was found.
- `issue-stats.ts`, `cost-events.ts` and `issue-wait.sh` were not changed and not run against the
  new answer. Each pages by the length of `events` and does not read `more`.
- A sync whose head moved between its two reads: the case of the third item above is read from
  the handler's order, and no test holds a write between the reads.
- The page's panel in a tab against the new Worker.
- The prose of `agents/overseer.md`, `SKILL.md` and the knowledge doc is task 5's
  (`ac-5-prose-names-the-two-shapes`) and was not written.
