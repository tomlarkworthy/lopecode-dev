# dv-1-verify-run-tool

## Round 1, 2026-10-11

Task 1 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`: the probe of that spec as a tool.
Two files are new, `tools/cloud-brain/verify-run.ts` and `tests/tools/verify-run.test.ts`. No seed
changed and nothing was deployed.

### What it does

```
bun tools/cloud-brain/verify-run.ts WORKER [--times N] [--shell FILE] [--base NAME|URL] [--timeout SECONDS]
```

It reads the Worker's module and hash from the deployer's `infra.getModules` (the deployer's address
from the kernel's `/.well-known/did.json`, as `brain-shell.ojs` does), opens
`BASE/#view=C100(S100(MODULE,@tomlarkworthy/brain-shell))&verify=WORKER` in a local headless Chrome
N times, a new context each, and reads `window.__brainVerdict`. In the same turn of the page it
counts the `test_` cells that have a value, by module. It prints one line of JSON for the start
(with the browser's version), one a run and one summary. `--shell FILE` answers the document at
`BASE/` with the file; every other request goes to the Brain. It sends no write.

| exit | when |
|---|---|
| 1 | a test passed and failed on one hash (`byChance`), or a module other than brain-shell and the Worker's ran a test (`otherModules`) |
| 2 | neither, and a run failed or gave no verdict |
| 0 | every run passed and nothing else ran a test |
| 64, 70 | the arguments; the tool could not run (no such Worker, no deployer, no Chrome, no file) |

Three things the spec's design 3 does not say, each chosen here (`philosophy.md` line 2, the
smaller side, easy to undo):

- **A module named `@test/…` is not counted as another module.**
  `test_verifyModule_runs_the_tests_and_checks_the_hash` of brain-shell joins a fixture
  `@test/verify-<random>` to the page, and its one passing test is the ninth of the spec's
  "brain-shell's own 8 and the fixture". Counted, every run of R1's own baseline would exit 1.
- **Exit 2.** The spec names exit 1 only. With exit 0 for the rest, a module that fails every
  time, or a page that gives no verdict, would read as clean to a step that looks at the exit code.
- **An error of the tool is 70, not 1.** bun exits 1 on an uncaught error, which is the code for
  a test that fails by chance.

A test is compared with itself on one hash only: a pass on one hash and a fail on another is a
deploy between two runs, printed under `hashes` and not called chance.

Playwright in `tools/node_modules` is 1.57 and names Chrome build 1200, which is not installed
here (`ls` of `chromium_headless_shell-1200/chrome-headless-shell-mac-arm64`: `ABOUT` and
`LICENSE.headless_shell`, no executable, and no `INSTALLATION_COMPLETE` above it). The first run of the tool stopped on "Executable doesn't exist", as the
spec writer's did. The tool takes `CHROME`, then the build Playwright names, then the newest
complete `chromium_headless_shell-N` in the same cache: 1234 here, Chrome 151.0.7922.34.

### The tests

```
$ bun test ./tests/tools/verify-run.test.ts        # in the worktree, 15:03 CEST
 15 pass  0 fail  55 expect() calls   [1478.00ms]
$ bun test ./tests/tools
 124 pass  0 fail  388 expect() calls  Ran 124 tests across 14 files. [13.43s]
```

Ten of the 15 call `judge`, `parseArgs`, `runAddress` and `chromeFor` with no browser. Five start
the tool against a stand-in for the Brain on 127.0.0.1 (the DID document, `infra.getModules`, a page
with a runtime of the shape read and a verdict, 20 ms late) in a real headless Chrome: the second
of three runs fails and the test is named with `passed: 2, failed: 1`, exit 1; the document as
served has svg-lens's tests, exit 1; the short document, exit 0; every run fails, exit 2; a Worker
the deployer does not name, a missing file and no Worker, 70 and 64. One test reads
`brain-deployer.ojs` and fails when the line that writes the run's address there is not the one
the tool writes; task 3 of the spec changes that line, and the test is where its writer learns the
tool must follow.

Each of these changes to a copy of the tool was run against the test file (`VERIFY_RUN_TS=<copy>`),
15:03 CEST:

```
no per-hash grouping          14 pass  1 fail
fixture counted               12 pass  3 fail
brain-shell not left out       7 pass  8 fail
exit 0 when a run failed      10 pass  5 fail
a cell with no value counted  12 pass  3 fail
an error exits 1              14 pass  1 fail
--shell answers every request 14 pass  1 fail   (15 pass before the stand-in's page fetched / itself)
```

### The spec's two tables, run again

The commands, the cut documents' maker and the output are in
`tools/cloud-brain/.emitted/issue-loop/dv-1-verify-run-tool/` (`run-tables.sh`, `cut.ts`,
`table1.log`, `table2.log`, `table2.ts`; git-ignored). `cut.ts` fetched cb4's `/` at 15:03:36 CEST
(5,038,963 characters, 20 mains) and wrote three copies with the `mains` of `bootconf.json`
filtered, with `findSpan` of `tools/lib/notebook-blocks.ts`. That is what `build.ts` will do in
task 2; the tool itself cuts nothing.

`verify-run.ts brain-x-logs [--shell <copy>]`, one run each, 15:03:50 to 15:03:59 CEST, hash
`21e8deb3c2c9`:

```
boot list                        verdict   otherTestsRan   variables   heap     exit   spec, 11:58
as served (20 mains)             7 of 7    132             4232        103 MB   1      6 of 6, 132, 4230, 96 MB
without @tomlarkworthy/tests     7 of 7    132             4232        86 MB    1      6 of 6, 132, 4230, 77 MB
lopepage-2 and brain-shell       7 of 7    9               2869        57 MB    0      6 of 6, 9, 2867, 40 MB
brain-shell alone                7 of 7    9               1032        42 MB    0      6 of 6, 9, 1030, 36 MB
```

By module, as served: svg-lens 60, robocoop-5-engine 37, robocoop-5-srctools 12, brain-shell 8,
editable-md 5, switchboard 3, robocoop-5 3, xrpc-client 1, brain-secrets 1, claude-code-pairing 1,
the fixture 1, brain-logs 7. The spec has robocoop-5 2 and brain-logs 6. brain-logs was deployed
again after the spec (`21e8deb3c2c9`). robocoop-5 read 2 in one of two earlier runs at 15:01:42 and
3 in the other, where the verdicts' own counts were 131 and 132: one of its tests has not always
ended when the verdict is written.

The 19 Workers of `cloud-brain-dev/deploy/services.json` but the kernel and the deployer, each
`--times 5` as served and `--times 5 --shell shell-alone.html`, 15:03:59 to 15:12:22 CEST, 190
runs, read with `bun table2.ts table2.log`:

```
                    passed      otherTestsRan   verdict ms   load to verdict   heap     variables   exit
as served           95 of 95    132 in 95       398          2013 ms           97 MB    4743        1 for 19
brain-shell alone   95 of 95    9 in 95         187          1076 ms           47 MB    1231        0 for 19
spec, 12:01-12:09   93, 94      132, 9          413, 214     1558, 1036 ms     98, 47   4743, 1231
(medians over the 95 runs; 230 tests over the 19 Workers, 228 in the spec)
```

No run gave no verdict. brain-x-browser's verdict took 10.6 and 10.3 s and brain-x-bluesky's 5.7
and 5.4 s, the two the spec names. The 3 failures of the spec's 190 were one test of
brain-x-snapshot on `a20b957dc536`; cb4 ran `45a1464a3573` here, after
`snapshot-digest-test-fails-by-chance`, and it passed 10 of 10.

### Not tried

- **Exit 1 for a test that fails by chance, on a real Worker.** The spec's check for R3 is
  `verify-run.ts brain-x-snapshot --times 20` on `a20b957dc536`, which cb4 no longer runs, and the
  190 runs held no failure. That path was run only against the stand-in of the test file.
- A run that ends with no verdict (the 150 s wait) in a browser. `judge` is tested with such runs;
  no page here was made to hang.
- `--times 20` on any Worker.
- The cluster's Chrome 128. The tool opens a local Chrome only.
- A module that is not deployed. The tool opens what the Brain serves; how step 8 gives it a
  changed module is task 6's.
- Linux or Windows for the Chrome fallback: the path was read on this Mac only.
- The test file on another machine. Five of its tests need a Chrome in Playwright's cache; with
  none they fail with exit 70 from the tool.
