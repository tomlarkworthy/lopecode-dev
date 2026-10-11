# Spec: the page a deploy's verdict comes from

Project `deploy-verdict-from-a-shared-page` on the tracker of cb4. Written 2026-10-11, 11:51 to 12:13 CEST,
by the spec writer of the issue loop. Round 1. Nothing is built by this file. Every time below is from `date`
around the command or from a log line's `t`.

Two things the project's title says did not hold when measured, and the design follows from them:

- The 132 tests that run beside the Worker's are not tests of other Workers. They are the tests of the
  notebook's own tools (svg-lens 60, robocoop-5-engine 37, …), which the page boots whatever its address says.
- Since the deployer began verifying (2026-10-11 05:52 UTC) no put-back in the record is a failure by chance.
  Every hash that failed, failed each time it was run. The one test found here that does fail by chance fails
  with the other 132 gone too.

## What was asked

Tom, 2026-10-10, on what verifies a deploy (`cloud-brain-dev/philosophy.md`, Clarifications):

> its mega important the verification occur quickly and on an isolated code base.

> in a multi agent system multiplayer bugs need to be removed.

> if something has proof the deployment is broken then it is correct to roll it back.

Tom, 2026-10-11, quoted in `seen-no-record-of-test-runs`:

> What is causing flakiness? I think we should have a metric measuring this.

Tom, 2026-10-11, after the container's put-backs (`tools/cloud-brain/records/put-back-opens-an-issue.md`):

> it was trivial for you to figure that out, why didn;t we do that automatically?

The overseer opened the project at 11:46:02 CEST from three feedback tickets, with this in its body: "Most of
a fix is in the deployer, the page or the kernel's tests, which rules.md gives to the owner to deploy. A spec is
where that is said."

## The reports

| id | what it says | becomes |
|---|---|---|
| `seen-every-test-runs-at-once` (part) | A verdict read `tests: 8, otherTestsRan: 132`. | R1, R2. The 132 are named below. |
| `seen-flaky-timing-tests` (part) | brain-x-snapshot put back twice on a 50 ms wait; brain-x-issues once on the caret test, "nobody looked at why". | R3. The snapshot failures were 2 of 2 on one hash, not chance. The caret put-back was made by the mechanism the deployer replaced an hour later. |
| `seen-two-chrome-versions` (part) | The deployer's browser is HeadlessChrome 128, a writer's is 151, and nothing said so. | R4, which is met since 09:20 the same day. A newer Chrome cannot be asked for (below). |
| `verification-runs-are-not-kept` (related, in rework) | No count of runs and fails by test. | Used as what exists: `logs.deploys` gave the counts below. Not a part of this. |
| `tests-replace-console-log` (related, `needs-owner`) | Three test cells assign `console.log`. | Left out: see "Not chosen". |
| `deployer-put-back-issues-worker` (related, `needs-owner`) | A page opened in the cluster put a Worker back. | Left out: the page sends no report since 07:51 CEST (event 427); what is left is the owner's press of rejected. |
| `seen-a-guess-reported-as-a-cause` (related) | Two put-backs were called "timing" unchecked; one was not. | R3: a number from repeated runs in place of the word. |
| `seen-a-small-either-or-put-to-the-owner` (related) | The owner was asked "the retry, or only the counting?" | "Not chosen", the retry, with the count that decides it. |

## What exists today, measured

### The runs on record

`brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=…&to=…" --as loop-deploys`, seven days to
11:52:03 CEST: 1325 lines, 5 queries. Verdict lines are in it from 05:52:15 UTC to 09:35:42 UTC of 2026-10-11.

```
deploy.verify 45   deploy.verified 38   deploy.failed 7   deploy.verify.none 0   deploy.verify.stale 0
ms of a run        min 5041   median 8723   p90 19053   max 23956
otherTestsRan      132 in 39 runs; 110, 112 or 113 in the 6 of the scratch Worker brain-x-verifycheck
```

The seven failures, each with how often its hash was run:

```
brain-x-container   b83bd3b5317a  failed 3 of 3   test_container_get_and_post_are_the_port_and_read_no_row
brain-x-snapshot    a09b2a9705b4  failed 2 of 2   test_the_panel_lists_the_days_and_the_sources_of_one
brain-x-verifycheck 359ab8716160  failed 1 of 1   made to fail
brain-x-verifycheck 319604f7281e  failed 1 of 1   made to fail
```

The issue's body has "No run has been made twice on one hash". Three hashes were run more than once
(`b83bd3b5317a` 3, `a09b2a9705b4` 2, `955c9f1b5370` 2), and none both passed and failed. So the record holds no
flake of the deployer's run. The container's cause was `Request` without `duplex` in Chrome 128
(`records/put-back-opens-an-issue.md`); the snapshot's was a wait of 50 ms for a redraw that had not come at 50 ms
in a local tab either (`seen-flaky-timing-tests`).

The eighth put-back of the issue's count is brain-x-issues at 05:50:48 UTC on
`test_issues_panel_keeps_the_caret_in_a_row_box`: expected `"half a line"`, received `"ha line"`. It is 87 s
before the first `deploy.verified`: someone's whole page made it, the mechanism that ended at 07:51 CEST. Four
runs of brain-x-issues by the deployer since: 0 failed. Why typed characters were lost was not looked at here.

### What the run page computes

The deployer opens `/#view=C100(S100(MODULE,@tomlarkworthy/brain-shell))&verify=WORKER`
(`brain-deployer.ojs`, `verifyDeploy`). The same address for brain-x-logs in a local HeadlessChrome 151 (Chrome
for Testing 1234, Playwright), between 11:52 and 11:58 CEST, counting `test_` variables that had computed a value,
by module:

```
mains on the page: 24
ran:  svg-lens 60, robocoop-5-engine 37, robocoop-5-srctools 12, brain-shell 8, editable-md 5, switchboard 3,
      robocoop-5 2, xrpc-client 1, brain-secrets 1, claude-code-pairing 1, a fixture of brain-shell's own test 1
      brain-logs 6 (the Worker's)
defined and not run: cloudflare-iac 26, observablejs-toolchain 124, exporter-3 49, cell-map 30, … (imported only)
```

None is a test of another Worker. The file at `/` carries `bootconf.json` with 20 `mains`, and the bootloader
boots each of them before any cell of brain-shell reads the address. `#view=` decides which of the Brain's
modules brain-shell joins (`brainJoined`) and nothing else. A module that is only imported computes no test,
which `test_page_loads_only_the_modules_in_view` already holds.

### The same address with a shorter boot list

The document of `/` was fetched, its `bootconf.json` block rewritten (`tools/lib/notebook-blocks.ts`,
`findSpan`), and served in place of `/` to the local browser by a Playwright route. Everything else went to cb4.
brain-x-logs, 11:58 CEST:

```
boot list                        verdict   otherTestsRan   variables   heap
as served (20 mains)             6 of 6    132             4230        96 MB
without @tomlarkworthy/tests     6 of 6    132             4230        77 MB
lopepage-2 and brain-shell       6 of 6    9               2867        40 MB
brain-shell alone                6 of 6    9               1030        36 MB
```

Taking `@tomlarkworthy/tests` out changes nothing: booting a main is what computes its tests. With brain-shell
alone the 9 left are brain-shell's own 8 and the fixture.

Then the 19 Workers the deployer runs (every row of `cloud-brain-dev/deploy/services.json` but the kernel and
the deployer), each 5 times as served and 5 times with brain-shell alone, 12:01:45 to 12:09:17 CEST, 190 runs:

```
                    passed      otherTestsRan   verdict ms   load to verdict   heap     variables
as served           93 of 95    132             413          1558 ms           98 MB    4743
brain-shell alone   94 of 95    9               214          1036 ms           47 MB    1231
(medians over the 95 runs; 228 tests over the 19 Workers)
```

18 Workers passed 5 of 5 both ways, among them brain-x-issues (21 tests, with the caret test) and brain-x-page.
Two take their time from their own tests, the same both ways: brain-x-browser 10.3 s, brain-x-bluesky 5.4 s.

Not measured: any of this in the cluster's Chrome 128. No token of the loop names `browser.run` (`brain.ts token
list`, kept: `loop-bluesky`, `loop-library`, `loop-deploys`, `mem-research`), and making one is the owner's. What
there is from that browser is one row of 2026-10-10 (`tools/scratch/cloud-brain-experiments/verify-page/README.md`):
brain-x-issues alone in a file of its own, 19 of 19 in 3784 ms, 93 MB, 0 other tests; in the whole notebook, 1 of
19 inside 60 s, 640 MB.

### A test that does fail by chance, and is not cured by this

The three failures of the 190 are one test of brain-x-snapshot, on the hash cb4 runs. With the runs made while
finding it, between 11:59 and 12:09 CEST:

```
brain-x-snapshot a20b957dc536   32 runs, 10 failed
  as served 4 of 12   without tests 3 of 7   lopepage-2 and brain-shell 1 of 1   brain-shell alone 2 of 12
test_a_run_that_kept_items_opens_one_task_for_the_days_digest (9 of the 10; the first run printed no name)
  - Expected  + Received   Array [ + undefined, "issue.open 404" ]
```

`brain-snapshot.ojs:642` reads the lines with `at: "snapshot.run"` and expects one. It got a second, with no
`issue` field: a line of another run made at the same time. Read from the source, not shown by a run. The
tests of one module are computed together (`verifyModule` awaits them with `Promise.all`), so the page of one
Worker is still a shared page for that Worker's own tests. Filed as `snapshot-digest-test-fails-by-chance`
(event 569), linked here and not a part.

This is the first test on record that passed and failed on one hash. The deployer has run `a20b957dc536` once,
and it passed.

### The browser

`browser.run` reaches Cloudflare Browser Run through the Worker's binding (`brain-browser.ojs`). Its Chrome is
128 (`Browser.getVersion`, "Chrome/128.0.6613.137", 2026-10-08). Cloudflare's changelog for the product, entries
2023-05-19 to 2026-09-21, names no Chrome version, no upgrade and no way to choose one
(<https://developers.cloudflare.com/browser-run/changelog/>, read 2026-10-11 through a fetch that summarises;
`llms-full.txt` of the docs read to its first 100,000 of 421,572 characters, the same). So the version is
Cloudflare's and can change without a line anywhere here.

What is already in place, all since the morning of 2026-10-11: the verdict carries `agent`
(`brain-shell.ojs`, `verifyModule`); a put-back opens `fix-tests-WORKER-HASH8` with `browser` and the run's
address (deployer `74e7e27c911d`); the implementer's brief has "When a deploy is put back on a test", which
names both versions and the probe to use.

### Read outside

- Hashemi, Tahir, Rasheed, "An Empirical Study of Flaky Tests in JavaScript" (<https://arxiv.org/abs/2207.01047>,
  read in full through ar5iv): 452 commits of 18 projects, 358 with a cause. Concurrency 20.7 %, async wait
  19.6 %, OS 18.4 %, network 12.6 %, platform 10.3 %. "Unlike in other empirical studies, Platform is also a major
  cause of flakiness in JavaScript", where platform is "test environment, browsers". 82 % were fixed in the test's
  code; test order dependency was "a small number". The three kinds seen here are its first, second and fifth: a
  shared log (concurrency), a fixed wait (async wait), a browser's version (platform).
- Luo, Hariri, Eloussi, Marinov, "An Empirical Analysis of Flaky Tests" (FSE 2014): async wait, concurrency and
  test order dependency as the commonest causes over 201 commits. Read only as other papers summarise it.
- Micco, "Flaky Tests at Google and How We Mitigate Them" (Google Testing Blog, 2016-05-27): the definition
  used here, a test that passes and fails on the same code. The post's body did not load; the definition and its
  numbers (about 1.5 % of runs, 16 % of tests) are from summaries. A reply under the post by Google, 2016-05-31,
  did load: "Our rerun mechanism is only used for tests that are marked as flaky or when users specifically
  request it."

## Requirements

Each has a number before.

- **R1. The run boots brain-shell and the module under test, and no other main.** Before: 20 mains booted, 132
  other tests computed in 39 of 39 runs of a real Worker. After: `otherTestsRan` is the count of brain-shell's
  own tests (9 today).
- **R2. The verdict of every Worker is what it is today.** Before, locally: 18 of 19 Workers 5 of 5 both ways,
  the nineteenth failing by chance both ways. After: the same on the built file, and no `deploy.verify.none` in
  the first 20 runs on cb4.
- **R3. A test that passes and fails on one hash is found before the deploy, with its rate.** Before: nothing
  ran a module twice; `passedOnSameHash` was 0 for every test because no hash was run again after a failure; the
  one such test was found by the probe of this spec.
- **R4. The browser of a verdict is on the verdict.** Met (above). Nothing to build.
- **R5. Going back is one call and no deploy.**

Not a requirement: fewer put-backs. Of the five that were not made on purpose, none came from the other 132
tests. R1 is asked for by the owner's words and pays in what the page loads (variables 4743 to 1231, heap 98 to
47 MB, verdict 413 to 214 ms locally), and it removes a cause before it is met rather than after.

## The design

1. **A second file, `shell/verify.html`: the shell with `mains` cut to `["@tomlarkworthy/brain-shell"]`.**
   `build.ts` writes it beside `.emitted/shell.html`, with the block tools it already uses for the shell. No seed
   changes, so no Worker's hash moves. `brain-static` already serves a file under `shell/` to anyone, with scripts
   and the Brain's origin when the owner or the deployer wrote it (`brain-static.ojs:171`, `vouched`); the address
   `/static/shell/index.html#view=…&verify=brain-x-logs` gave a verdict of 7 of 7 at 12:09:42 CEST.
2. **The deployer opens it when it is there.** Before a run `verifyDeploy` asks `static.get` for
   `shell/verify.html` through the core. 200: the run's address is `/static/shell/verify.html#view=…`. Anything
   else: `/`, as today. So the deployer's change deploys with no change of behaviour, putting the file turns it
   on, and `static.delete` of it turns it off (R5). `infra.shell` takes `?name=verify` and puts
   `shell/verify.html`; with no name it is as today. `brain.ts shell` posts both files, so a new shell is never
   left beside an old verify file.
   A setting of the deployer was the first thought and is not chosen: the deployer's `config` is bound when it
   is installed (`BRAIN_CONFIG`), and whether `config.set` reaches it was not read.
3. **`tools/cloud-brain/verify-run.ts WORKER [--times N] [--shell FILE]`**, the probe of this spec as a tool: it
   opens the run address in a local headless Chrome N times, with `--shell` serving a built file in place of the
   document, and prints for each run the verdict, `otherTestsRan` by module, ms and heap. Exit 1 when a test
   both passed and failed, or when a module other than brain-shell and the Worker's ran a test. It reads only.
   The writer's step 8 runs it on the changed module before the emit.

`N` for step 8: the snapshot test failed 10 of 32. At that rate 10 runs miss it 2 times in 100; at its rate with
brain-shell alone (2 of 12) 10 runs miss it 16 times in 100 and 20 runs 3 in 100. A module's run is 1 to 2 s
locally (11 s for brain-browser), so 20.

### Not chosen

- **One file that cuts its own boot list when the address has `&verify=`.** The part of an address after `#` is
  not sent to the server, and the mains are booted before a cell reads it.
- **A boot list of brain-shell for everyone, with brain-shell adding the rest when not verifying.** No deployer
  change at all, only a new shell. It changes how the owner's page starts, and a module that joins the mains late
  is named `main` (met in robocoop-5; from this checkout's notes, not run again here). The verdict's page should not be bought with the owner's.
- **The page Worker cutting the list on `/?verify=`.** A change of brain-x-page and of the address the deployer
  opens, so two deploys where the design has one.
- **A file made for each Worker from the frame and the modules it imports** (`verify-page/page.ts`, 2026-10-10:
  0 other tests in Chrome 128). It would take brain-shell's 9 tests off as well. It puts the assembly of a
  document in the deployer. Reopened by: a put-back whose failed test passes alone and fails beside brain-shell's.
- **A retry before the put-back.** It would have kept 0 of the 5: each failed hash failed every time. The owner:
  "if something has proof the deployment is broken then it is correct to roll it back". Google reruns only tests
  already marked flaky. Reopened by: `logs.deploys` giving a test `passedOnSameHash` above 0 on cb4.
- **A newer Chrome in the cluster.** Cloudflare gives no way.
- **A run in the cluster's Chrome before the deploy.** It needs a token for `browser.extend`, `browser.run` and
  a way to give the page a module that is not deployed. One cause in the record (the container, 3 runs) would
  have been met by it, and a put-back now opens an issue with the browser in it in about 20 s. Reopened by: a
  second put-back on a test that passes in Chrome 151.
- **`tests-replace-console-log`.** With brain-shell alone the tests of another Worker are not on the page, so
  what one Worker's test does to the console no longer reaches another's verdict. Within a module it still
  does, as the snapshot's test shows with `logged`; that is fixed test by test, and its issue is filed. The
  branch stays the owner's: it moves the kernel, the core and the deployer.

## How each is known to be met

| | check |
|---|---|
| R1 | `verify-run.ts --shell .emitted/verify.html` for the 19 Workers: no module but brain-shell and the Worker's runs a test. On cb4 after the file is put: `otherTestsRan` of each `deploy.verified` line in `logs.deploys` is 9. |
| R2 | The same 19 runs: each verdict `ok`, with the tests counted today (228 over the 19). On cb4: the first 20 runs after the file is put have no `deploy.verify.none`, and their `ms` are set beside the 45 before (median 8723). |
| R3 | `verify-run.ts brain-x-snapshot --times 20` on `a20b957dc536` exits 1 and names the test. After its fix, 0 of 20. |
| R5 | In the seed's tests with the rig's static: the file there, the run's address is the file's; not there, or static answering 500, it is `/`. On cb4 it is tried only if task 5 calls for it. |

What the checks do not show: that a run is quicker in Chrome 128. The local gain is 0.5 s of 1.6 s; the 5 to 24
s on cb4 hold the browser's start and the load of a 5 MB file, which this does not change. It is measured by R2's
second line and may be nothing.

## Tasks, in the order they land

1. **`verify-run.ts`, with a test file under `tests/tools/`.** Loop. No deploy. It is the instrument of 2, 5
   and 6. Its first run reproduces the two tables above.
2. **`build.ts` writes `.emitted/verify.html`.** Loop. No deploy. Checked with task 1's tool for the 19 Workers
   (R1, R2 locally).
3. **The deployer: the address by whether the file is there, `infra.shell?name=verify`; `brain.ts shell` posts
   both.** The seed is the deployer's, so by `rules.md` a writer does not start it. Written and tested on a
   branch by a writer only if the owner says so when he approves this; deployed by him either way. Tests in the
   seed: the address with and without the file; `infra.shell` with and without a name; a name other than
   `verify` refused.
4. **The owner's two commands** (below).
5. **Read the first 20 runs.** Loop. `logs.deploys --as loop-deploys`: `otherTestsRan`, `ms`, `none`, against the
   45 before. Written in `tools/cloud-brain/records/deploy-verdict-from-a-shared-page.md`. A `none` or a new
   failure: the file is deleted (the owner's `static.delete`), and the record says what was seen.
6. **The writer's step 8 runs `verify-run.ts MODULE --times 20`.** A line of `agents/implementer.md`, which is
   the overseer's to edit.

`snapshot-digest-test-fails-by-chance` is its own issue and waits for none of these.

## What only the owner can do

- Approve this spec, and say with it whether a writer of the loop may write task 3 on a branch.
- Deploy the deployer with task 3: `brain.ts install-deployer`.
- Put the files, which turns it on: `brain.ts shell` (the recovery key; `shell/` takes no token).
- Turn it off, if task 5 says so: `static.delete { path: "shell/verify.html" }` in his own session.
- Not needed by this design, and named so it is not asked again: a token for `browser.run`, which a measure in
  Chrome 128 before task 4 would need.

## Not known

- Whether Chrome 128 gives the same verdicts with the short boot list. Task 5 is where it is first seen; deleting
  the file is how it is undone.
- Whether `static.delete` takes a path under `shell/` from the owner's session. Read: only the owner writes
  there (`brain-static.ojs:19`), and a token's delete is refused (its test, line 385). Not run.
- Why the caret test lost characters at 05:50:48 UTC. The page that ran it is gone.
- Whether brain-shell's own 9 tests can change another module's verdict. Two of them join modules to the page's
  runtime and one waits 6 s for a cell that never answers. No run here showed it: 94 of 95, and the one failure
  is the snapshot's.
- How the snapshot's 50 ms test passed the writer's own run before its deploy. Not looked at.

## The probe

Not landed: task 1 lands it as a tool. What it did, for a reader who wants a number again before then:

```js
// Playwright, Chrome for Testing 1234, headless; one new page a run
await page.goto(base + "/#view=C100(S100(" + module + ",@tomlarkworthy/brain-shell))&verify=" + worker);
const verdict = await (await page.waitForFunction(() => window.__brainVerdict)).jsonValue();
// by module: test_ variables with _version > 0 and a value, named through runtime.mains and the "module …" cells
```

For the shorter boot list, `page.route(base + "/")` answered the document with the `bootconf.json` block's
`mains` filtered, and passed every other request on.
