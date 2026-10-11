# verify-run-shell-runs-deployed

## Round 1, 2026-10-11

`verify-run.ts WORKER --shell <a whole build>` now serves the build with its boot list cut to
brain-shell and the Worker's module, so the build's copy of the module is what the run tests.
A local tool and its test file; no seed changed and nothing was deployed.

### The cause

Found with a build whose `brain-issues` differs from the deployed one, made in the worktree
(`main` at `a3292e24`, cb4 running `brain-x-issues@fe12fe233921`):

```
git checkout 39fab5cc -- tools/cloud-brain/brain-issues.ojs      # the seed before issue.attach, 23 tests
bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html
git checkout HEAD -- tools/cloud-brain/brain-issues.ojs
```

The tool as it was (`git show a3292e24:tools/cloud-brain/verify-run.ts`), `brain-x-issues --shell`
that build, `--times 5`, started 16:18:38 UTC: `passed` 0, `failed` 5, `tests` 27 in each run
where the build has 23, and the two tests of the issue's case 1 named under `everyTime` with
`cloudflare.Service("issues") is not the value of a cell`. That is case 1 again, on another build.

Who wrote the deployed cells into the page: an init script that wraps `define` on the runtime's
variable prototype and keeps the stack when the name is a test only the deployed module has
(`probe3.ts`, attached to the issue). On a build with the seed of `67294743` (26 tests, the
deployed one has 27) it recorded one define, 14.9 s after the page opened and before the verdict:

```
at applyModule (file://@tomlarkworthy/file-sync:1330:13)
at file://@tomlarkworthy/cloud-brain:704:86
at async file://@tomlarkworthy/cloud-brain:721:17
at async _assembled (file://@tomlarkworthy/cloud-brain:747:84)
```

`assembled` (`cloud-brain.ojs`) is the page's own cell: for each Worker whose module is a main of
the page it calls `loadService`, which reads the Worker's source (`getSource`) and, when the page's
copy differs, writes it over that copy cell by cell (`applySource`). A whole build has
`@tomlarkworthy/cloud-brain` and every service module in the boot list of `bootconf.json` (43
mains), so with the build as the document that cell runs beside brain-shell's `brainVerdict`, on
the module under test. The run address was written for a document that holds neither
(`verify.html`, one main).

The three cases of the issue, each run here:

| case | what was run | what was seen |
|---|---|---|
| 1, `brain-x-issues`, 0 of 20 | the build above, the tool as it was, 5 runs | 0 of 5, the same two tests and message. A test holds the service the build's cell made; the cell is replaced under it; `emit` (`cloudflare-iac.ojs`, `held`) finds no cell with that value. |
| 3, a copy with a throw in one test, named 2 of 2 | a build with one test added to `brain-issues` (28 tests, deployed 27), 1 run, read at the verdict and 8 s later | the verdict's `tests` 28, so the build's tests ran and a throw among them is named; the module then had 27 test cells, the added one gone. The tool's `tests` is read after the verdict and gave the deployed number for a run of the build's tests. |
| 2, `brain-x-page`, the build's 17 ran | a build with one test added to `cloud-brain` (18), the same two reads | 18 at the verdict with the added test; 8 s later the added test was gone and a test of the deployed module was there. The page's module is replaced too, after its verdict. Why later was not looked into: one run. |

So one build could pass, fail or be half replaced, by which cells differed and when. `tests`
against the build's count, the sign step 8 gave since `964fc3ea`, does not tell them apart: in
case 3 it reads the deployed number on a run that tested the build.

### What changed

- `tools/cloud-brain/verify-run.ts`: `shellDocument(html, module)`. A file that holds a block of
  the Worker's module is served with `bootconf.json`'s `mains` set to brain-shell and that
  module (`verifyShell` of `verify-shell.ts`, which now takes the list); every other block is as
  it was. The page's module is then not booted (false for `brain-x-page`, whose module it is:
  round 2), brain-shell leaves alone a module the file holds
  (`joinModules`, "A module whose block the file itself holds is left alone"), and what the module
  imports comes from the file. A file with no block of the module (`verify.html`) is served as it
  was. The start line has `mains`, the list or null.
- Each run has `from`: `document` when the module's block on the page is the file's own, `brain`
  when brain-shell joined it (`data-brain`), null with no block. The last line has each `from`
  seen. With a file that holds the module, a run whose `from` is not `document` is counted in
  `notTheFiles` and the exit is 3, before 1 and 2.
- `agents/implementer.md` step 8 says to read `mains` and `from`, and no longer that the cause is not known.
  `knowledge/changing-and-deploying-a-cloud-brain-worker.md` says what `--shell` does with a whole build.

Two sides were open (`philosophy.md` line 2). The issue's triage took the smaller, a last line
that says which module ran, because the cause was not known. With the cause known, cutting the
boot list is the same size, is undone by reverting one function, and gives the writer the count
step 8 asks for before the deploy; `from` and exit 3 are kept as the check on it. `from` reads
whose block the module has. It does not see a cell written over afterwards, which is what the
cut prevents (for `brain-x-page` it does not: round 2).

### The tests

Each count is the output of the command beside it, run in the worktree after the last change.

| command | result |
|---|---|
| `bun test ./tests/tools/verify-run.test.ts` | 18 pass, 0 fail |
| `git show a3292e24:tools/cloud-brain/verify-run.ts > tools/cloud-brain/verify-run-was.ts && VERIFY_RUN_TS=$PWD/tools/cloud-brain/verify-run-was.ts bun test ./tests/tools/verify-run.test.ts; rm tools/cloud-brain/verify-run-was.ts` (the tool as it was) | 15 pass, 3 fail: the three tests added here |
| `bun test ./tests/tools`, after the rebase onto `main` | 192 pass, 0 fail, 22 files |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build of 39fab5cc above> --times 20`, 16:22:15 to 16:22:43 UTC | `passed` 20, `failed` 0, `none` 0, `from` `["document"]`, `tests` 23 in each run, `otherTestsRan` 9, median `wall` 1297 ms, exit 0. Before the change: 0 of 5, `wall` 27486 ms. |
| the same for `brain-x-page` with the build that adds one test to `cloud-brain` | `passed` 20 of 20, `from` `["document"]`, exit 0. `tests` was not read from these 20; one run made before them gave 18 |
| the same for `brain-x-issues` with a build that adds `test_issues_probe_throws = { throw new Error("probe throws") }`, `--times 3` | `failed` 3 of 3, `everyTime` names that test with `probe throws`, exit 2 |
| `… brain-x-issues --shell tools/cloud-brain/.emitted/verify.html --times 1` | `mains` null, `from` `brain`, `tests` 27, passed, exit 0 |

The three new tests: `shellDocument` on a file with and without the module; `judge` with a run
whose `from` is not the file's (exit 3); and, in a browser against the stand-in, a build whose
boot script gives every main but brain-shell and the Worker's module three tests. Served cut, the
run has no other module's test, `from` `document`, exit 0, and the same file with `data-brain` on
the module's block exits 3. Against the tool as it was the test stops at its first check, the
start line's `mains`; what `otherModules` read there was not looked at.

### Not tried

- A build whose module needs another main to be booted. The cut boots two mains; a module that
  reads a cell of the page's module by import gets it from the file, unbooted modules compute on
  demand. `brain-x-issues` and `brain-x-page` were run; no other Worker was.
- `brain-deployer`, which gives no verdict at this address (`none`, exit 2) with or without this.
- The tests of a build beside every other test of the page. The whole build ran 460 other tests
  beside the module's; the cut runs 9, as the deployer's page does since
  `dv-3-deployer-opens-verify-html`. A test that fails only in that company is not met here.
- `assembled` and `brainVerdict` on the owner's own page, where both still run: the owner's page
  holds the deployed modules, so `loadService` finds them the same and writes nothing. Not run.

## Round 2, 2026-10-11

Review 1250, one finding: for `brain-x-page` the cut does not do what round 1 said. That Worker's
module is `@tomlarkworthy/cloud-brain`, the module that holds `assembled`, so the cut keeps it a
main, `assembled` runs, and `loadService("brain-x-page")` writes the Worker's source over the
build's copy, 58 to 165 ms after the verdict in the reviewer's 8 runs, with `from`
`["document"]` and exit 0. Round 1 had seen this replacement with the whole build (case 2 of the
table above) and did not look for it after the cut. A build of `cloud-brain` with slower tests
would be case 1 again.

### What changed

`verify-run.ts`, `routes(page, base, body, cut)`: for a file that holds the module, the page's
requests to `/xrpc/com.lopecode.brain.getSource` are aborted, and a run's line has `refused`,
their count when the verdict was read. `getSource` is the one call by which `loadService` learns
what a Worker runs; with no answer it throws, `assembled` keeps the row as `not loaded`, and
nothing is written. brain-shell's verdict asks `getInfo` and the deployer's `getModules`, which
are answered as before. A file without the module is served with no abort.

Two sides (the review names both; `philosophy.md` line 2 and the clarification of 2026-10-10, a
check is moved to where it runs alone). Keeping `assembled` from loading at a run address is a
change to `cloud-brain.ojs` and a deploy of `brain-x-page`; it is the one that would also hold on
the owner's page, and is left with `seen-assembled-races-verdict`. Having the tool see a replaced
cell and exit 3 was not taken: the replacement usually comes after the verdict, where it harms
nothing, so the exit would depend on which came first. The abort is in the tool, removes the
writer for every Worker's module, and is one route.

### The tests

Each by the command beside it, in the worktree, after the last change. The build is one that adds
one test to `cloud-brain.ojs` (20 tests; cb4 ran `brain-x-page` with 19).

| command | result |
|---|---|
| `bun test ./tests/tools/verify-run.test.ts` | 18 pass, 0 fail. The stand-in's build now asks `getSource` and, when answered, adds a test to the module before the verdict. |
| the same against a copy of the tool with the abort's `if (cut)` made `if (false)` | 17 pass, 1 fail: `tests` 3 where 2 are the file's |
| the reviewer's `probe-race.ts` (the cut alone), 3 runs | changed in 3 of 3, 20 tests to 19, 49 to 93 ms after the verdict |
| `probe-race-routes.ts` (attached: the same probe with `routes` of the tool, kept open 10 s after the verdict), 8 runs from 16:42:50 UTC | changed in 0 of 8; `refused` 1 and `testsAtVerdict` 20 in each |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <that build> --times 20`, 16:44:29 to 16:44:51 UTC | 20 of 20, `tests` 20, `from` `["document"]`, `refused` 0 or 1 a run, exit 0 |
| the same for `brain-x-issues`, 16:44:52 to 16:45:20 UTC | 20 of 20, `tests` 27, `refused` 0, exit 0 |
| `… brain-x-issues --shell .emitted/verify.html --times 1` | `mains` null, no `refused`, `from` `["brain"]`, passed |
| `bun test ./tests/tools` | 195 pass, 0 fail, 23 files |

### Not tried

- A build of `cloud-brain` whose tests run long enough for the overwrite to have come before the
  verdict without the abort. None was built; the stand-in test is that case.
- A test of the module under test that itself needs a real answer to `getSource` from cb4. No
  test of `cloud-brain.ojs` or `brain-issues.ojs` failed for want of one in the 40 runs above.
- What `assembled` does after the abort beyond leaving the module alone for 10 s: the row it
  draws, and whether it asks again (`seen-assembled-asks-again-in-a-loop`; `refused` was 1 at
  10 s in 8 of 8).
