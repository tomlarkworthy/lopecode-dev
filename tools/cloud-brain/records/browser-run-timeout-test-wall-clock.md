# browser-run-timeout-test-wall-clock

## Round 1, 2026-10-10: the bound is on the time the page's timers were given

`test_browser_run_stops_at_its_timeout` (`brain-browser.ojs`) starts three `browser.run` calls of
5 s together and asserted `Date.now() - t0 < 7000`. It failed at the page's load, in a browser and
with none, and it was the `lastError` of `brain-x-browser` on cb4. One cell of the seed is changed.
No code of the service is.

### What was read first

`brain.ts state`, 20:44 CEST, before any change:

```
brain-x-browser 52e24a4a7b36 deployed ERR its tests failed: test_browser_run_stops_at_its_timeout: expect(received).toBe(expected) // Object.is equality\n\nExpected: true\nReceived: false
```

`bun tools/lope-tests.ts <worktree notebook> --filter test_browser_run_stops_at_its_timeout`, the
seed unchanged at `841851a7`: failed twice with the same message.

### What the 7 s were made of

The cell was changed for two runs to throw its measurements (not committed): the time of each
answer, the gaps of a timer of 100 ms that ran beside the three calls, and where
`Target.createTarget` and `Target.closeTarget` are in the fake's list of commands.

```
no browser, run 1   total 11831  ends 9401 9414 11831  beats 25  late in all 9321  gaps over 300: 7443 840 547  created [1,4,5] closed [20,24,27]
no browser, run 2   total 11398  ends 8952 8968 11398  beats 27  late in all 8642  gaps over 300: 6980 813 590  created [1,4,5] closed [20,24,27]
Chrome 151, 1 tab   total  6742  ends 6562 6742  6742  beats  7  late in all 5753  gaps over 300: 345 427 701 4407  created [1,6,7] closed [24,25,26]
```

So the page does not run a timer for 4 to 7 s at a time while its other test cells compute. The
three tabs were open together in each run (the third is created before the first is closed). The
service reads the clock, as it must; the calls end when the page next runs their timers. In the
browser tab the total was 6742 ms, under the old bound: that tab would have passed, and the two
tabs of the parent record did not. The old assertion depended on how long the page was held.

The message of the second call under that load was `the promise did not settle in 1 ms` and
`4042 ms`: the time left when the expression was reached, which is what `run` passes. The cell
asserts its `error`, `Timeout`, and that is unchanged.

### The change

A `setInterval` of 100 ms runs from `t0` until the three calls answer and sums what each tick was
late by. The cell asserts `took < 7000`, where `took` is the elapsed time less that sum. With the
measurements above `took` is 2510, 2756 and 989 ms. With no load it is the elapsed time, 4.9 s in
the parent record. Three runs one after another take 12.5 s (5 + 5 + 2.5) of timers, whatever
the load, so the bound still says "together, each stopped at its timeout".

Not taken:

- **No bound** (the issue's first form). The statuses and messages say each run stopped; nothing
  would then say that the three ran together, and three in turn would show only as a harness
  timeout with no browser (10 s) and pass in a tab.
- **A single timer of 5 s started at `t0`** (the issue's second form). It counts a hold only if the
  hold is across the fifth second. Each run does more after its timeout (it closes its tab, over
  several timers of the fake socket), and a hold there is not counted. Not measured: where in the
  runs the gaps above were, so this form was not shown to fail.
- **The order of `createTarget` and `closeTarget` alone.** It says the three overlapped and has no
  clock in it, but not that a run ended near its timeout.

The sum can be more than the hold cost the calls, since a hold in the middle of the 5 s delays
nothing. The bound is then looser under load, never tighter.

### Tests

- `lope-tests.ts --filter test_browser_run_stops_at_its_timeout`, after: passed twice (it failed
  twice before). `--filter test_browser`: 17 passed of 17.
- Chrome 151.0.7922.34, headless QA tab, the snippet of step 8 of the implementer brief, which
  reads the value of the page's first run: 17 of 17, no failure, in each of two tabs (`r=8102`
  on the commit before the rebase, `r=8103` after it, at 20:49 CEST). The rebase brought in
  `brain-bluesky.ojs`, a record and a brief; none is a source of this module.

### Not tried

- The cell changed to make its three calls one after another, to see the new assertion fail. That
  it would is arithmetic from the 12.5 s above, not a run.
- The cluster's browser (Chrome 128): the rules forbid opening the Brain's page there. The
  deployer's own run of the cell after the deploy is the only run on cb4; its result is in the
  issue's comment.
- Other cells of the notebook with a bound on the clock. `grep "Date.now() - t0"` in
  `brain-browser.ojs` finds this one only; the other seeds were not searched.
- Why the page holds its timers for 4 to 7 s at load, and which cells do it.
