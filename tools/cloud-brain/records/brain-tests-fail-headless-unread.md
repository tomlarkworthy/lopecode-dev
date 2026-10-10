# brain-tests-fail-headless-unread

## Round 1, 2026-10-10: the four cells run in a browser, and why each fails with none

The issue named four test cells of Brain services that fail by assertion in
`bun tools/lope-tests.ts` and asked for each to be run in a browser twice. No seed is changed.
Three issues were opened for what was found.

All runs are of one notebook: `build.ts --out` in the worktree at `lopecode-dev@ff06290c`.
The three issues opened say `df6725a2`, the commit before it; the one file that differs between the two is a record.

| Cell | Seed | Browser, 2 tabs | `lope-tests.ts --filter`, 2 runs | Called after the settle, no browser, 2 calls |
|---|---|---|---|---|
| `test_a_version_put_back_gets_a_token_that_works` | `brain-deployer.ojs` | passed, passed | failed, failed | passed, passed (50, 47 ms) |
| `test_one_log_line_a_call_with_these_keys_and_no_secret` | `brain-core.ojs` | passed, passed | failed, failed | passed, passed (22, 21 ms) |
| `test_bluesky_tick_and_poll_deliver_once` | `brain-bluesky.ojs` | passed, passed | failed, failed | failed, failed |
| `test_browser_run_stops_at_its_timeout` | `brain-browser.ojs` | failed, failed | failed, failed | passed, passed (4841, 4864 ms) |

Browser count: 4 cells, 3 passed and 1 failed, in each of two tabs. The messages with no browser
are the ones in the issue (`Expected: 1, Received: 0`; `8`/`7`; `4`/`5`; `true`/`false`).

None of the four is a difference of the DOM that `lope-tests.ts` uses. Three are defects of test
cells. No defect of a service was found.

### How the browser runs were made

HeadlessChrome 151.0.7922.34, a QA tab on the worktree's notebook, opened twice (`r=7301`, then
`r=7302`), between 20:24:14 CEST (`date`, when the worktree was made) and 20:30:13 (the time of
the first probe run after them). The snippet of step 8 of the implementer brief, with the module
found from each test variable, since the four are in four modules.

The page computes these cells itself when it opens, so the value read in each tab is the one from
the page's first run, made while its other test cells ran. In the second tab the browser cell's
definition was then called again with its inputs:

```
[[4887,504,"wait was not true in 5000 ms"],[4549,504,"the promise did not settle in 4739 ms"],[2771,200,"{\"url\":\"https://never.example/\",\"loaded\":false, … \"value\":\"N\" …
"a wait, a promise and a load that do not end: 5 s each, no tab left"
```

### `test_browser_run_stops_at_its_timeout`: a bound of 7 s of wall clock

The only `toBe(true)` of the cell is `expect(Date.now() - t0 < 7000).toBe(true)`. Called alone the
three runs end in 4.9 s, in a browser and with none. In the page's first run, made while its
other test cells run, the comparison is false; the time it took there was not recorded. The
assertions on the statuses and messages come before that line and did not throw, so each
`browser.run` answered as one that stopped at its timeout.

The triage wrote that the deployer of cb4 has this failure as `lastError` for `brain-x-browser`.
Not read by me.

Opened: `browser-run-timeout-test-wall-clock`. Its body says the runs were 20:27 to 20:31; the
bounds above are the measured ones.

### The deployer and core cells: another test puts its own function in `console.log`

Both read log lines through `logged` (`cloudflare-iac.ojs`), which taps `console.log` once.
`test_settings_are_stored_by_the_owner_and_sent_with_each_forwarded_call` (`brain-core.ojs`)
assigns `console.log` for the length of two calls, to a function that keeps lines with
`at === "config"` and drops the rest, then puts the old function back. A line written by another
test in that window does not reach `logged`.

Measured with no browser at 20:39:01 CEST, by a setter on `console.log` that records the cell that
assigned it and what its function was given (`tools/scratch/bm-headless/t5.ts`, not committed):

```
lines     ray-keys-1, -2, -3, -8, -4, -5, -6          (reached the tap, last at …543419)
swallowed […543558,"token.mint-failed","brain-x-logs","_test_settings_are_stored_by_the_owner_and_sent_with_each_forwarded_call"]
          […543672,"ray-keys-7","","_test_settings_are_stored_by_the_owner_and_sent_with_each_forwarded_call"]
sets      […543419,"_test_settings_are_stored…"], […543673,"_test_settings_are_stored…"]
```

The assignment lasted 254 ms. The two lines taken in it are the two that the failing assertions
count: `token.mint-failed` for `brain-x-logs` (`Expected: 1, Received: 0`) and the eighth call
line (`Expected: 8, Received: 7`). An earlier run of the probe at 20:33:39 recorded the
assignments only: the first was 1 ms after `ray-keys-6` reached the tap and lasted 230 ms.

`test_tokens_reach_only_their_methods` (`brain-kernel.ojs`) assigns `console.log` twice in the same
way, and a test of `brain-browser.ojs` assigns `console.error`. They took no line of these two
cells in the runs above.

In a browser the cells run in another order and both passed twice. Nothing was found that keeps
a browser from the order that fails.

A dead end: an error swallowed by `.catch(() => null)` on the core's log writer was looked for
first. One was recorded, `Unexpected end of JSON input`, from another test; none after the
seventh line.

Opened: `tests-replace-console-log`.

### `test_bluesky_tick_and_poll_deliver_once`: the two calls do not overlap

The cell starts `rig.tick()` and `rig.poll()` together and expects 4 calls of `getLog`: one poll
reads 5 messages in pages of 2, the other answers `skipped: "a poll is running"`. The rig sets
`pollGapMs` to 0 and `poll()` deletes the row `busy` in a `finally`. With no browser, at 20:39:31
(`tools/scratch/bm-headless/t3.ts`, the cell's first lines run after the settle):

```
{"polled":{"configured":true,"events":5,"taken":5},"order":["poll","tick"],"getLog":5,
 "by":{"at":1791657571323,"by":"tick","events":0,"taken":0},"inbox":5,"cursor":"5","busy":null}
```

The page's poll ended before the tick reached `putIfAbsent("busy")`. The tick then polled from
cursor 5 and read one empty page. Each message is in the inbox once. The cell asserts an overlap
that its rig does not make. Why the two overlap in Chrome and not in bun was not looked for.

Opened: `bluesky-tick-poll-test-no-overlap`.

### Not tried

- The cluster's browser (Chrome 128): the rules forbid opening the Brain's page there.
- A fix of any of the three test defects. Each is a seed change with a build and a browser count
  of its own; `brain-core.ojs` and `brain-kernel.ojs` are seeds of Workers the loop does not deploy.
- Whether a browser can reach the order in which the two log lines are taken.
- The other 28 failing or timing-out cells of the issue's count.
- A whole-notebook `lope-tests.ts` run. The four were run with `--filter`, one cell a run; the
  notebook still computes every test cell at its load in such a run.
