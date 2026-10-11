# tests-replace-console-log

## Round 2, 2026-10-11: the last cell, `console.error` in a test of `brain-browser.ojs`

The issue named three test cells that put a function of their own in place of `console.log` or
`console.error` and so kept the lines of tests running at the same time from `logged`
(`cloudflare-iac.ojs`). Two were changed by `lopecode-dev@44f9e5d0` (2026-10-11 07:49:49 +0200):
`brain-core.ojs` 1229 and `brain-kernel.ojs` 1259 and 1297 pass each line on to the function they
replaced and do not put it back. This round changes the third, in
`test_browser_each_caller_has_its_own_browsers`, which was:

```
console.error = (...a) => failed.push(a[1]);
await rig.tick().finally(() => (console.error = error));
```

Only `tools/cloud-brain/brain-browser.ojs` changed. One Worker moves: `brain-x-browser`.

### What changed

- A cell `browserTickFailures(fn)`: it puts a function in `console.error` that keeps the second
  argument of a call whose first is `"browser tick"` while `fn` runs, and passes every call on to
  the function that was there. It is not put back. The reason is the one written in
  `brain-core.ojs` at 1225: two tests that each put back what they saved, out of order, leave one
  test's function in place.
- `test_browser_each_caller_has_its_own_browsers` reads the failed tick through it.
- A test `test_browser_tick_failures_are_heard_and_every_line_goes_on`: two listeners that overlap
  and end out of order, one tick that fails, and three object lines given to `console.error`, one
  inside each listener and one after both. It expects all three in `logged` and
  `["owner/default"]` from each listener.
- The seed imports `logged` from `@tomlarkworthy/cloudflare-iac`. `cloudflare-iac.ojs` is not changed.

### Reproduced first

The new test with `browserTickFailures` holding the two lines above as they were, built in the
worktree, `bun test.ts brain-x-browser --with <built module>` in `cloud-brain-dev`, 2026-10-11
between 12:05 and 12:08 CEST: 16 passed, 1 failed, 1 needs a browser. The failure:

```
FAIL test_browser_tick_failures_are_heard_and_every_line_goes_on
  - Expected  [1, 2, 3]
  + Received  [3]
```

Lines 1 and 2 were given to `console.error` while a listener was in place and did not reach `logged`.

The loss between two test cells of a page was not measured again. It was measured for
`console.log` on 2026-10-10 20:39 CEST (the issue's body, event 292).

### Counts after the change

| Run | Result |
|---|---|
| `bun test.ts brain-x-browser --with <built module>`, no browser | 17 passed, 0 failed, 1 needs a browser (`test_browser_panel_shows_pages_and_the_usage`, `document`) |
| QA tab, Chrome 151 headless, the built notebook of the worktree, each `test_*` cell of the module observed from a side module | 18 of 18, no failure |

### What it does to the console

The line of a failed tick now reaches the console that was there. With no browser the run prints
`browser tick owner/default null is not an object (evaluating 'b.sessionId')` twice, once for each
of the two tests that break a row. Before, the test kept it.

### Not tried

- `test_browser_tick_failures_are_heard_and_every_line_goes_on` and the changed test assign
  `console.error`. `agents/implementer.md` step 8 asks that a test assign nothing to `console`.
  The way with no assignment needs `logged` to keep the arguments after the first, which is a
  change to `cloudflare-iac.ojs`; the deployer's hash covers that module, and the loop does not
  deploy the deployer. That way was written in round 1 and is on branch
  `kept/tests-replace-console-log-r1` (`b169230e`, `baea695c`), not landed.
- Each call of `browserTickFailures` leaves one more function around `console.error` for the life
  of the page: two for one run of the module's tests. What many runs in one page cost was not measured.
- A filter by a name of the test's own: the tick names the browser `owner/default` in every rig.
  A tick that fails in a different test at the same time would be counted. No other test of the
  module breaks a row.
- The cluster's browser, Chrome 128, other than through the deployer's own run at the apply.
- Whether a test of a different module still assigns a console method: `grep -n 'console\.\(log\|error\|warn\) *=' tools/cloud-brain/*.ojs`
  gives the three cells of `44f9e5d0` and `browserTickFailures`, and nothing checks it on a build.

## Round 1, 2026-10-10: written, not landed

`logged` kept every argument and gained `logged.calls(fn)`; the three cells read through it; two
tests in `cloudflare-iac.ojs`. It moved the hashes of `brain-core`, the kernel and the deployer
(event 316) and was labeled `needs-owner`. Its record is `tools/cloud-brain/records/tests-replace-console-log.md`
at `baea695c`.
