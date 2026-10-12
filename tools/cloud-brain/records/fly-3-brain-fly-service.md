# fly-3-brain-fly-service: the service `brain-x-fly`

T3 of `plan/cloud-brain-worker-machine-on-fly.md`, written 2026-10-12 and 2026-10-13 (ENDTIME) by the writer `impl-bff9f0`, round 1. A new Worker with a secret: item 8 of the spec's
"What only the owner can do" reads the owner's approval (event 3380) as his word for both, and the
issue's body says the same. The secret itself is not put: comment 5107 of the project has that an agent
makes no Fly.io credential, and the service was built to deploy and pass its tests with none.

No call to Fly.io was made by this change, in a test or by hand. Every statement below about what
Fly.io answers is from the spec's reading and the records of `fly-1-by-hand` and
`fly-2-image-and-run-sh`; the tests answer for Fly.io with a function.

## What was added

- `tools/cloud-brain/brain-fly.ojs`, new. Module `@tomlarkworthy/brain-fly`, Worker `brain-x-fly`.
  Its prose cells are the method reference (`getSource?worker=brain-x-fly&part=reference`).
- `tools/cloud-brain/build.ts`: one line in `MODULES` and the name in `OWNED`.
- `tests/tools/fly-service.test.ts`, new, 3 tests.
- `plan/cloud-brain-worker-machine-on-fly.md`: six sentences gain "(As built, …)".
  `plan/cloud-brain-tracker-trigger-rules.md`: one, where it says `brain-x-fly` "is not built".

| cell | what it is |
|---|---|
| `flyDefaults` | The host, the four settings' defaults, the tick's 5 minutes, the 2 days a run is kept, the three labels that are not work |
| `flyPath` | The address of a path under `/v1/apps/APP/`, or `null` |
| `flyHours` | The hours of a list of runs inside the day of UTC of a time |
| `flyWork` | The ids of the tracker's queue without the three labels |
| `flyLoop` | Who holds the lock `loop` and when it last ended, from `issue.locks` |
| `flyPlan` | What a tick does, as `{ do, why }`, with no I/O |
| `flyOps` | `pass`, `status`, `work`, `up`, `down`, `tick`: the calls and the rows |
| `fly_service` | Six methods, `crons: ["*/5 * * * *"]`, `calls` of two, the secret `FLY_API_TOKEN` |
| `flyBodies`, `flyPanel`, `viewof flyView` | The three bodies of the set-up form, and the panel |

## What was decided here

**`fly.work` is the tracker's `issue.queue`, and no second table.** The spec has "`fly.work` is the
table of `SKILL.md` step 3 as a function … T3 writes it from the table as it is that day, with one
test for each row", and `calls: issue.list`. It was written 2026-10-11. On 2026-10-12 the tracker got
that function itself, `issueQueue`, answered as `issue.queue` (`brain-issues.ojs`, "The queue";
`plan/cloud-brain-bookkeeping-in-the-tracker.md`, part 3), allowed to a Worker
(`caller.kind in ["owner", "token", "worker", "deployer"]`). A second table in this seed would be the
second thing with the same job that `philosophy.md` has under 2026-10-12 ("it should reuse that"). So
`fly.work` answers the ids of `queue`, in its order, without each issue labeled `needs-owner`,
`laptop` or `digest`. What the spec leaves out as "Nothing" (`hidden`, `security`,
`awaiting-approval`, feedback at `open`, a project still gathering) the queue has under `waiting` or
in neither list. The test has one entry for each of the ten `do` values the queue's table names.
Cost: what the machine takes changes when the tracker's queue changes, with no deploy of this Worker
and no test of this seed failing.

**The one machine is named by a setting, `machine`.** The spec has `config.app` and "the one machine
of this Brain". The app `cloudbrain` already has a machine, `853145b4217618` of `fly-1-by-hand`,
stopped, whose command is `sleep infinity` (the record of `fly-2-image-and-run-sh`, read 2026-10-12
23:46 CEST). A tick that took the app's one machine would start it as soon as the owner put the
secret, with work in the queue and nothing holding `loop` (nothing takes `loop` before T4), and it
would run 20 minutes doing nothing each time the set of work changed. With `machine` not set the tick
does nothing, `fly.up` and `fly.down` answer 409 with the `config.set` to make, and `fly.status`
answers `machine: null` and `machines: [{ id, name, state }]`. The panel has the two settings as two
boxes and "Save settings". The other side, one machine taken when the app has one: one step fewer for
the owner in T4b.

**No metric was defined.** The task has "the metric of its calls". A metric of the Brain's own
Workers is a line of `metricDefinitions` in `brain-dashboard.ojs` (its prose: "adding one is a change
to the seed"), so a deploy of `brain-x-dashboard` beside this one, and its tests there read the definitions. A token reads only a metric whose name starts
`deploys.` (`metricRules.query`), so the spec's check "with `loop-dashboard`" would also need that
rule widened: a change of who reads what, which the spec did not put to the owner. The spec's own
check allows for it: "if T3 defines the metric; else the rows `fly.status` sums". The service writes
one line for each start, stop and yield (`at: "fly.start"` with `by` and `work`, `"fly.stop"` with
`why`, `"fly.yield"`), which a definition can count later with no change here. The owner in his tab
already reads the calls of each method with `metric.query?metric=core.calls&method=…`
(`brain-dashboard.ojs`, `metricDefinitions`); not run for `fly.*`.

**`fly.get` and `fly.post` are refused twice.** The rule is `allow: "caller.session"` with
`fixed: true`, so `rule.put` cannot open it, and the service itself answers 403 to a caller that is
not `owner` with `x-brain-tab: 1`. `fly-1-by-hand` found `machines/<id>/exec` under the app's path
(comment 4258 of the project): `fly.post` runs a command on the machine as root.

**The open run is one row.** `fly.status` is a query that writes: it records what it saw of the
machine. Two calls that saw it running at once would each have opened a run, and the day's hours
would have counted twice. The run under way is the row `open`, made with `putIfAbsent`.

**A tick's time is the cron event's; a call's is the clock.** So the tick's tests give each tick a
time and rest on no wall clock. `test_fly_up_refused_past_the_day` cannot: the call reads
`Date.now()`. Its rows are one run from before the day's start to now, the setting is half their sum
for the refusal and their sum plus one for the start, and the cell asks `flyHours` at a fixed time for
the 8 hours themselves.

**One tick in 5 minutes.** `cloudflare-iac` ticks a Worker that has `scheduled` by an alarm once a
minute as well as by its cron (`cloudflare-iac.ojs`, "A Worker with a scheduled function is ticked by
an alarm"). The tick takes the row `tick/<the 5 minutes>` with `putIfAbsent` and goes on only when it
made it.

## Tests

13 `test_*` cells on `simulate(fly_service, …)`. Each count is from a run after the last edit of the
seed and after the rebase of step 9, on a build made then. The seed imports `cloudflare-iac`, `plugin-registry`,
`jest-expect-standalone` and `cloud-brain`; the rebase's list named none of their seeds and not `build.ts`.

```
cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-fly      three runs, 2026-10-13 00:36 CEST
"tests":13,"passed":13,"failed":[] … "browser":"151.0.7922.34","ms":27272
"tests":13,"passed":13,"failed":[] … "ms":26780
"tests":13,"passed":13,"failed":[] … "ms":26998
cd $W && bun test --timeout=30000 ./tests/tools/fly-service.test.ts
 3 pass  0 fail  31 expect() calls
cd $W && tests/tools/suite.sh                                                        00:45 to 00:51 CEST, uptime 13.80 before
 901 pass  0 fail   Ran 901 tests across 93 files. [376.60s]
```

The run of the suite before that one, 00:37 to 00:45, had 897 pass, 4 fail and 1 error in 500 s. The
one failure read was `sd-1 (R4): public=true for a public doc …`, "timed out after 30000ms", a test of
`knowledge-docs`, which this change does not touch; the other three were not read before the second
run. `uptime` was 7.92 before that run and 13.80 after it.

Two steps of the brief do not run for a Worker cb4 does not have, as the record of
`tp-1-topics-append-read` found:

```
cd cloud-brain-dev && bun test.ts brain-x-fly --with …/fly-3-brain-fly-service.js
--with takes a Worker of one module, or the module's name
cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-fly --shell …/cloud-brain.html --times 1
verify-run: the deployer of https://cb4.endpointservices.workers.dev has no module of brain-x-fly
```

So `bun tools/lope-tests.ts <build> --filter test_fly` was the loop while writing (13 passed), and the
three runs of `tab-tests.ts` stand in for the 20 of `verify-run.ts`.

**There is no failing run before the change: the task adds a service.** Fourteen changes of the seed
stand in, each built to a scratch file and run with `lope-tests.ts --filter test_fly`, and the seed
put back (`git diff --quiet HEAD -- tools/cloud-brain/brain-fly.ojs` after: exit 0). The last of them ended 2026-10-13 00:35 CEST (`date`), on the seed as committed:

| | The change | Cells that fail, of 13 |
|---|---|---|
| M1 | a path is not held under the app (`startsWith(root)` gone) | 1: get and post |
| M2 | no check of `..`, of a leading `/` or of an encoded slash | 1: get and post |
| M3 | `get` and `post` answer a caller that is not the owner's tab | 1: get and post |
| M4 | `fly.up` does not read the day's hours | 1: `test_fly_up_refused_past_the_day` |
| M5 | `laptop` is not among the three labels | 4: work, status, the tick's start, the reference |
| M6 | every tick runs, not one in 5 minutes | 1: the tick's start |
| M7 | `now=true` from any caller | 1: down |
| M8 | idle counted from the start alone, not the lock's last end | 2: the plan, the tick's stop |
| M9 | a tick starts beside a held `loop` | 3: the plan, both of the tick |
| M10 | `fly.status` passes the machine as Fly.io gives it, `env` and all | 1: status |
| M11 | the stop on an unchanged set is not kept | 1: the tick's stop |
| M12 | a redirect is followed | 2: get and post, up |
| M13 | the tick runs with no machine named | 1: the tick's start |
| M14 | a yield stops the machine at once | 1: down |

M12 passed all 13 when first run: the stand-in for Fly.io follows nothing, so a followed redirect
looked the same. The rig now keeps each request's `redirect` and two cells hold it to `manual`.

**A line of the log is read by the machine's id.** The first run of the cells had 5 of 13 fail:
`logged` hears every simulated Worker's lines, the runner runs the cells at once, and a cell that
expected one `fly.start` line read another cell's. Each rig that reads lines now has a machine id of
its own and `rig.lines` keeps the lines of that id. The cell for "not set up" no longer asserts that
nothing was logged: under other cells it cannot.

## The panel, against the brief's four

| The brief's case | The cell |
|---|---|
| a second press before the answer | Start, Start, Stop while `fly.up` is out: one call, and all five buttons are disabled |
| a write that is refused | `fly.post` throws "Fly.io answered 422": "Send failed: Fly.io answered 422"; a body that is not JSON sends nothing |
| two answers out of order | the earlier `fly.status` arrives after the later: the later is drawn |
| another caller's event while a box has the caret | Not tried. The panel has no live events; a redraw writes the two settings boxes only when they are empty and does not write the body (read in `flyPanel`, not run with a caret) |

## On cb4

ON_CB4

## Not tried

- **Any call to Fly.io.** The paths `machines/ID`, `machines/ID/start`, `machines/ID/stop` and
  `machines`, the field `state` and its values, `config.image`, `config.guest`, `config.mounts[0].volume`,
  and `Authorization: Bearer` with the token as `fly tokens create deploy` prints it, are from the spec's
  "Read" and the record of `fly-1-by-hand`. The first real `fly.status` is the owner's, after the secret.
- What `POST …/start` answers for a machine that is `started`, and `POST …/stop` for one `stopped`. The
  service asks the state first and sends neither then.
- Fly.io's reading of an encoded slash in a path. `flyPath` refuses `%2f` and `%5c` whole.
- The secret read by the Worker on cb4: no secret is set, and the rule
  `caller.worker in ["brain-x-fly"]` is the owner's to put with it. In the tests the secret is a
  bound value.
- The tick on cb4 past "not set up": no `app` and no `machine` is set there.
- The cron itself: that Cloudflare runs `*/5 * * * *` for this Worker. The tick is gated the same
  under the minute alarm.
- `fly.status` after `config.set` on cb4, the panel on the owner's page, Start and Stop with his
  session (the spec: "What only the owner can measure").
- The panel with a real `client`: its test gives it a client of the test. Whether `config.set` takes
  the two calls as the panel sends them was read in `brain-core.ojs` (`config.set { worker, key, value }`)
  and not run.
- A queue of more than 500 entries: `fly.work` asks `limit=500` and answers what it is given.
- A machine in a state the table does not name (`suspended`, `replacing`, `destroyed`): the plan
  does nothing, by `test_fly_plan_is_one_row_of_the_table_for_each_case`; what the owner then sees is
  the state in the panel.
- Two ticks in one 5 minutes on two instances of the Worker at one moment: `putIfAbsent` is one
  statement of the rows (`cloudflare-iac.ojs`, `INSERT OR IGNORE`), not run in parallel here.
- Note 1 of review 2891 of the spec (a machine started while the laptop holds `loop` is stopped by
  nothing but the day's limit): the review gives it to T4, and it is as it was.

## What misled the writer

- The spec's `calls: issue.list` and "T3 writes it from the table": `issue.queue` landed a day after
  the spec and nothing in the spec or the issue names it. It was found by reading the method table of
  `brain-issues.ojs`.
- `logged` (above). The brief's step 8 says it of the page; `lope-tests.ts` runs the cells at once too.
- The hook that asks for the two knowledge pages refused one build, with the seed edit and the mutation run of
  the same command, until the two pages of the main checkout were read again; the command was then run whole.
- A mutation script that asserted on a missing anchor left the seed changed; it was put back from the
  kept copy and checked against `HEAD` before anything was built.
