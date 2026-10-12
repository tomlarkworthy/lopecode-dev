# cm-4-enter-the-runs-again

Task 4 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610): the runs the loop wrote as `cost {…}` comments are in the tracker's record of cb4 as
`cost` events, each once. A tool, `tools/cloud-brain/cost-events.ts`, its test, and one run of it
with `--post` on 2026-10-12. No seed changed and nothing was deployed. The tool was committed in
the worktree at 2026-10-12 02:53:40 +0200 (`git log -1 --format=%ci`, before the rebase onto `main`);
its commit is a ref of the submit.

## What was entered

383 `cost` events, seq 2953 to 3335, with no other event between them, each written with the
token `impl-b645a6`. The first has `at` 2026-10-12 02:55:42 CEST and the last 02:58:00 (the events'
own `at`, read with `sync?after=2944`). None has `replaced`. The tool's two last lines:

```
at event 2952, 12 events hidden to impl-b645a6; 383 cost comments: 0 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 350 with a usage, 135 with a usd, 225 fresh, 22 resumed, 136 light; 383 to enter
posted 383 of 383
```

`time` gave 2:21.56 for the command: the read, the check and 383 calls one after another, each a
run of `issue-as.sh`. The spec counted 288 comments at event 2304; the loop wrote 95 more by event
2952. A dry run before it, at event 2948, read 382.

The comments stay as they are. The loop still writes a `cost {…}` comment for each run (that is
task 5), so comments written after event 2952 are not entered; task 5 runs the tool again.

## The tool

`bun tools/cloud-brain/cost-events.ts --token NAME [--check MODULE.js] [--post]`. Its header is the
reference. `plan(record)` makes the calls from the events and calls nothing; `post(send, sender)`
sends them through a function it is given; the part under `import.meta.main` reads `issue.sync`
through `issue-as.sh` and prints.

Where the spec is silent or says otherwise, and what was taken (line 2 of `philosophy.md`, the
side that is smaller and easier to undo, where two were open):

| The spec | Built | Why |
|---|---|---|
| "With no flag it prints what it would send" | `--token NAME` is required; with none, exit 2 and nothing read | A caller writes with its own token (`rules.md`, "Which token"); `issue-stats.ts` has the same flag |
| "calls `issue.cost` with the comment's fields" | `tools`, `event`, `token` and `usd` go as they are, beside the fields the spec names | They are fields of `issue.cost`. `token` is in 20 comments, written since `ta-3-orchestrator-steps` |
| key `cost/<id>/<role>/<round>` | That, and `cost/<id>/<role>/<round>/<n>` for the n-th comment of one issue, role and round | The second call with one key would answer `duplicate: true` and write nothing, and the tool would report it to enter for ever. The record has no such pair today |
| nothing on a `cost` event that was not made from a comment | A comment is passed over, with a line, when a `cost` event of its issue, role and round has no `of` or a later `of` | After task 5 the loop writes the event itself. A comment of the same run entered after it would put the older figures in its place |
| "what is missing" | Left out, each with a line, exit 1: a body that does not parse, a missing `role`, `round`, `tokens`, `seconds` or `outcome`, a field the tool does not carry, `light` and `resumed` both | A field the tool does not know would be dropped or refused; either way a person should read it first. The types of the values are not checked here |
| the shape check "run on real lines before it is deployed" (`proto.py`) | `--check MODULE.js`: each body is given to `issueAct` of a built `@tomlarkworthy/brain-issues`, loaded with `tools/notebook-import.ts` | The tracker's own function, not a copy of it. With a refused body, `--post` sends nothing |
| nothing on a refusal while sending | `--post` stops at the first answer that is not a new event; what was sent stays, and a second run goes on from there | A guard that refuses one would refuse the rest |
| two `cost-usage` comments that name one cost comment | The later one's `usage` is taken | The record has none (0 at event 2944) |

`ISSUE_AS_SH` names another `issue-as.sh`, as it does for `issue-wait.sh`: the test's stand-in, and
the main checkout's when the tool is run from a worktree, which keeps no token.

## The checks of the spec, on cb4 after the post

Run 2026-10-12 from 02:58:10 CEST (`date`), each with `issue-as.sh impl-b645a6`.

**R6.** `ISSUE_AS_SH=<main checkout>/tools/cloud-brain/issue-as.sh bun tools/cloud-brain/cost-events.ts --token impl-b645a6`, in the worktree, exit 0:

```
at event 3335, 12 events hidden to impl-b645a6; 383 cost comments: 383 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 0 with a usage, 0 with a usd, 0 fresh, 0 resumed, 0 light; 0 to enter
```

`runs` with no filter answered 383 runs on 148 issues, 383 distinct pairs of issue and `of`,
`more: false`, in 146,819 bytes.

**R8.** `verify?guards=true`, before the post and after it:

```
{"ok":true,"seq":2952,"head":"62429bd5…","checked":2952,"guards":true}
{"ok":true,"seq":3335,"head":"49e11720…","checked":3335,"guards":true}
```

**R3.** `get?id=record-first-resumed-rework-round`. The spec expects `cost.runs` 8, `cost.seconds`
2004, `cost.cacheRead` 10,607,797 and `cost.advisor.calls` 7:

```
"cost": {"runs": 8, "seconds": 2004, "billed": 8, "input": 251, "cacheWrite": 902028, "cacheRead": 10607797, "output": 113376, "requests": 116, "advisor": {"calls": 7, "input": 585506, "output": 36932}, "usd": 8.96, "usdRuns": 4, "byRole": {"implementer": {"runs": 4, …}, "reviewer": {"runs": 4, …, "usd": 8.96, "usdRuns": 4}}}
```

The issue's `updated_at` is the `at` of its last event that is not a `cost` event (1791742920735
both): the eight cost events did not move it.

**R4.** `runs?role=implementer&how=resumed&round=later`. The spec expects 17 runs or more, each
with a `usage`: 17 runs, 17 with a `usage`, `more: false`, `total.runs` 17, `total.seconds` 4879.
Four more, each with `limit=1`: `role=reviewer&how=light` has `total.runs` 136, `round=first` 271,
`how=fresh` 225, `role=digest` 1. The totals of every run:

```
"total": {"runs": 383, "seconds": 212541, "billed": 350, "input": 20534, "cacheWrite": 44695349, "cacheRead": 1001214750, "output": 7860895, "requests": 8436, "advisor": {"calls": 376, "input": 44365367, "output": 2546888}, "usd": 225.31, "usdRuns": 135}
```

`issue.snapshot` answered 446,443 bytes to that token after the post. The spec's "about 382,000"
was for 288 runs at event 2304.

**That tasks 1 and 2 stood verified before the post.** `logs.deploys` with `loop-deploys`, read at
02:53: `deploy.verified` and `deploy.confirmed` for `brain-x-issues` at hash `1ca0115693d0…`,
`tests` 40, at 2026-10-12 02:39:59 CEST (`t` 1791765599367).

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the tool.

| Command | Result |
|---|---|
| `bun test ./tests/tools/cost-events.test.ts` | 16 pass, 0 fail, 78 `expect()` calls |
| `bun test ./tests/tools` | 464 pass, 1 skip, 0 fail, 465 tests across 50 files |
| `cost-events.ts --token impl-b645a6 --check cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js`, at event 2948, on the real lines | `382 taken, 0 refused` |
| the same with `--post`, at event 2952 | `383 taken, 0 refused`, then the post |

No line beginning `skipped:` was printed by the second; which test is the one skip was not looked for.

What `tests/tools/cost-events.test.ts` holds. The four lines of the spec's task are its fixed list:
a line with its usage inline, one with a `cost-usage` comment, one whose `cost-usage` has
`agent: null`, one already entered; and a resumed round with no usage.

- `plan`: the four calls, whole; `agent: null` left out; the `how` and the `backfilled` of a
  `cost-usage` comment not carried; run again over a record with the events, 0 to enter; a `cost`
  event or a `cost-usage` comment of another issue is not this comment's; the line's own `usage`
  and `agent` before its `cost-usage` comment's; a second comment of one run under `/2`; the
  passing over, and five events that do not pass a comment over; five lines left out, each with
  its reason, and a hidden one not read.
- `post`, with a sender of the test's: the order, a stop at a refusal, at a `duplicate` and at a
  thrown error, and no call for an empty list.
- The tool as run, against a stand-in for `issue-as.sh` that keeps what `cost` wrote: a record of
  610 events read in two pages; the dry run prints four bodies and sends none; `--post` writes
  four; `--post` again writes none; a refusal stops it with exit 1; with no `--token`, exit 2.
- With `issueAct` of `cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js` (three tests, skipped
  with a line in a checkout that lacks the file): it takes the four calls; it refuses, naming
  `round`, `role` and `usage`, three calls made from lines of the wrong type; the tool with
  `--check --post` on a refused body sends nothing.

**The test fails without the tool, and without one line of it.** The tool is new. 18 copies of it,
each with one line altered, were put beside it and the test run with `COST_EVENTS_TS` naming the
copy. Each failed 1 to 5 tests of the 16:

| The copy | `failed` |
|---|---|
| a null `agent` sent as null | 2 |
| no `usage` from the `cost-usage` comment | 2 |
| a `cost-usage` comment of any issue taken | 1 |
| entered already is not looked for | 5 |
| entered by `of` on any issue | 1 |
| `tokens` sent as `tokens` | 5 |
| `how` always `fresh` | 2 |
| `backfilled` of the `cost-usage` comment carried | 1 |
| no number in a second comment's key | 1 |
| no passing over | 1 |
| an unknown field dropped without a line | 1 |
| a body that does not parse dropped without a line | 2 |
| `post` goes on after a refusal | 2 |
| a `duplicate` counted as sent | 1 |
| `--post` after a refused check | 1 |
| one page of the record read | 1 |
| the dry run sends | 2 |
| a hidden comment read | 1 |

A first run of the 18 had the copies in a directory of their own, and every one failed the
`--check` test as well: the tool imports `../notebook-import.ts` by its place. The counts above
are of the second run, with the copy beside the tool.

## Not tried

- On cb4: a comment passed over, a second comment of one run, a comment left out, a refused call,
  and a stop of `--post`. The record had none of these; each is held by the test alone.
- Whether any of the 12 events hidden to `impl-b645a6` is a cost comment. The tool does not read a
  hidden event, and that token cannot see what they are.
- The post run twice at once from two sessions. The key is the same in both, so the tracker would
  keep one and answer `duplicate: true` to the other, which stops; not run.
- The tool run from the main checkout with no `ISSUE_AS_SH`, before the landing. The R6 line above
  is from the worktree.
- `--check` with a module other than the one cb4 ran that hour (hash `1ca0115693d0`).
- The page with 383 `cost` events in its view. `said(e)` has no line for the type until task 6.
- `issue-stats.ts`, `SKILL.md` and the rework section still read the comments: task 5.
