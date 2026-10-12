# iac-origin-test-secret-held-by-clock

## Round 1, 2026-10-12

`test_the_wrapper_passes_the_origin_reference_on` (`tools/cloud-brain/cloudflare-iac.ojs`) passed
and failed on one build in a browser. One cell of the seed is changed, that test. The wrapper
(`workerRuntime`) is not changed.

**cb4 does not run this change.** `cloudflare-iac.ojs` is built into the deployer, which the loop
does not deploy. The owner answered A of comment 3869 (comment 4381 of the issue, 2026-10-12 21:02
CEST): the test cell is mended, the seed lands with no deploy, and it goes with his next
`install-deployer`. Nothing was emitted, applied or probed on cb4.

### The cause

The wrapper holds a secret it asked of `secret.get` for 5 s, for one origin, by its own clock
(`kept && Date.now() - kept.at < 5000`, in `secrets` of `workerRuntime`). The test asked as the
owner, then with no origin, then as the owner again, and expected that third ask to send no
`secret.get`. In a page that computes its other test cells beside this one, the third ask came
6.4 to 7.0 s after the first (the issue's body, eight runs), so the hold had ended and the secret
was asked again.

### Reproduced first

`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/before.html @tomlarkworthy/cloudflare-iac`,
ten runs one after another on a build of the seed as `origin/main` had it (`1d545375`), a local
headless Chrome 151.0.7922.34, 21:14:32 to 21:18:13 CEST: nine gave `"tests":27,"passed":27`, one
gave `"passed":26` and named this test (`expect(received).toEqual(expected)`).

With no browser the defect did not show: `test.ts` runs one cell at a time, and on the changed seed
both later asks as the owner ended 2 ms after `since` there (the value below).

### What changed

- `since = Date.now()` is read before the first ask, the one that gets the secret.
- A later ask as the owner is expected to send no `secret.get` only when it ended within 5 s of
  `since`. The wrapper sets `kept.at` after `since` and reads the clock again before the ask ends,
  so its own interval is inside the one the test measures: under 5 s in the test is under 5 s in
  the wrapper. Past 5 s the test expects nothing of `secret.get` for that ask.
- The other four calls of such an ask (`fx.who`, `db.sql`, `inbox.append`, `fx.raw`) are expected
  whatever the clock says.
- There are two such asks where there was one: a new one straight after the first, and the old
  one after the ask with no origin.
- The cell's value says what each saw, with the milliseconds.

The new ask is there because the old one alone would look at nothing in a busy page. A build with
the cell's `return` made a `throw` of the same text (not committed), six runs of `tab-tests.ts`:

```
asked again at once, held at 1419 ms; after an ask with no origin, not looked at: 8899 ms had passed
asked again at once, held at 1729 ms; after an ask with no origin, not looked at: 10220 ms had passed
asked again at once, held at 1242 ms; after an ask with no origin, not looked at: 8045 ms had passed
asked again at once, held at 1214 ms; after an ask with no origin, not looked at: 7552 ms had passed
asked again at once, held at 758 ms; after an ask with no origin, not looked at: 7672 ms had passed
asked again at once, held at 1685 ms; after an ask with no origin, not looked at: 10783 ms had passed
```

So in those six the first of the two asserted the hold and the second did not. With no browser
both do: `the secret asked again at once, held at 2 ms; after an ask with no origin, held at 2 ms`
(`bun test.ts @tomlarkworthy/cloudflare-iac --with <built module> --whole` in `cloud-brain-dev`).

What the second ask says when it is looked at, and the first cannot: an ask from another origin
between the two does not end the owner's hold.

Not taken:

- **The hold given to the test** (a clock or a length passed to the wrapper under `simulate`; the
  words of choice A in comment 3869). It changes `workerRuntime`, the text every Worker is built
  with, for a test's sake. The owner was shown "one cell", and `philosophy.md` line 2 takes the
  smaller side.
- **`Date.now` replaced for the length of the test.** The page runs every test cell at once, and
  the brief keeps a test from assigning a global.
- **Subtracting what the page's timers were late by**, as `browser-run-timeout-test-wall-clock`
  did. There the bound was the test's own. Here the wrapper reads the clock itself, and the time
  the page was held is time the hold did run.
- **An expectation that the secret is asked again past 5 s.** The test's interval is the outer
  one: it can be past 5 s while the wrapper's is under.

### Counts

| Command, run after the last change of the seed | Result |
|---|---|
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloudflare-iac`, ten runs, 21:22:14 to 21:26:39 CEST | `"tests":27,"passed":27,"failed":[]` in each of the ten |
| `cd cloud-brain-dev && bun test.ts @tomlarkworthy/cloudflare-iac --with …/.emitted/iac-origin-test-secret-held-by-clock.js` | `"passed":25,"failed":0,"needsBrowser":2` |

`tests/tools/suite.sh`, run twice after the seed's last change: `688 pass`, `3 fail`, `2 errors`,
691 tests in 69 files both times, in 305.44 s and 299.52 s where the brief gives 93 to 95 s. The
second ended at 21:37:19 CEST, while this file was being written; neither was run after it. The three of the second run are of `tests/tools/summarize-papers.test.ts`, each `timed out after 30000ms`
(`--usd-max`, `refused once`, `check`). The names of the first run's three were not read. That file reads neither file of this change. `uptime` at
21:38 gave load averages of 11.42, 17.11 and 18.26; the file alone at that time gave 14 pass and
12 fail, each `timed out after 5000ms`. Whether it passes on a machine at rest was not run. The
three files of the suite that name `cloudflare-iac` (`rows-add-within-sql`, `needs`, `approver`),
run together: `50 pass`, `0 fail`.

`verify-run.ts` does not apply to the deployer (the writer's brief, step 8), so the ten runs of
`tab-tests.ts` stand in its place.

**The test fails when the wrapper does not hold.** A build with the wrapper's line made
`kept.at < 0` (not committed):

- `test.ts` as above: `"passed":23,"failed":2`. This test: `+ "secret.get"` between `"fx.who"`
  and `"db.sql"`. The other is `test_bindings_follow_platform_cells`, which also reads a secret twice.
- `tab-tests.ts`, one run: `"tests":27,"passed":25`, the same two names.

### Not tried

- A run in the cluster's browser (Chrome 128), or on the owner's page with every module's tests
  beside these. The ten runs are of this module's cells in one local tab.
- The case where the ask made at once ends more than 5 s after `since`. It was under 1.8 s in
  the six runs above; the branch that then looks at nothing ran only for the second ask.
- That the hold ends at 5 s. No test of the module waits that long.
- Ten runs with no failure do not show the rate is 0: at the rate seen before the change, 1 in 10
  here and 3 in 9 for the writer of `ds-1-rows-add-within`, ten clean runs have a chance of 0.35
  and 0.02. The case for the change is the argument above, that the expectation is made only inside the hold.
- Two other expectations of this cell rest on which of two timers ends first (`wait=30` beside
  `wait=5`, `wait=20` beside the schedule). They did not fail in any run here and are not changed.
- `test_bindings_follow_platform_cells` expects the hold of two reads made one after the other,
  with no look at the clock. It did not fail in any run here and is not changed.
