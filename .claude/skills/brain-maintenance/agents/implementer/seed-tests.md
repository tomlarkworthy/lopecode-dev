<!-- A page of `agents/implementer.md`: steps 5 to 8: the reproduction, the fix in a seed or a local tool, the build and the tests with no browser, the tests in a browser.
Read it when your change is to a seed (`tools/cloud-brain/*.ojs`), a `test_*` cell or a control of a panel; or a run of `tests/tools` fails and the brief's lines do not say why.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
5. **Reproduce before fixing**, where the issue describes behaviour: a test that fails for the
   reason the issue gives. Write it in the seed and run it with step 7's loop: it fails against
   what is deployed, before you change anything else. If you cannot reproduce it, say so on the issue and stop.
   A defect that depends on what runs beside the test (another cell's line in `logged()`, a
   listener on `console`) does not fail in that loop, which runs one test at a time. Make it fail
   there by running the neighbour inside the test's own window (a second rig), and count it where
   it was met: the deployer's run address opened N times before the fix and N times after, with N
   and both counts in the comment (`snapshot-digest-test-fails-by-chance`: 14 of 40, then 0 of 40).
6. **Fix it in the seed.** Never the notebook HTML, never the deployed text. Add or change a
   `test_*` cell in the same module so the defect cannot return unseen.
   When the change adds a branch beside others (one store's place in a call, a case of a switch), a test
   enters that branch through the function that has it, so the new line itself runs. A test that makes the
   call again in its own words passes with the line wrong. A new line that no test ran is named under "Not
   tried" in the record. (`ds-1-rows-add-within`, review 3837, 2026-10-12: the D1 place of `rows.addWithin`
   in `sqlCall` did not bind the key, five values for six parameters; the test bound the statement itself
   under a comment "As sqlCall binds it", both test sets passed, and the change was sent back.)
   When the fix is in a local tool and no seed (`brain.ts`, `tools/lope-tests.ts`), the test is a
   file under `tests/` that `node --test` or `bun test` runs and that fails before the fix; its
   count is the one you submit, and steps 7 to 9 need no build, browser run or emit. If the tool cannot
   be loaded by a test as it stands, say so in the comment with the commands you ran instead.
   A changed `brain.ts` is run from the worktree with
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`, never copied into the main checkout.
   `tests/tools/*.test.ts` run in the worktree: the whole suite as `tests/tools/suite.sh`, one file as
   `bun test ./tests/tools/<file>`
   with the `./` (without it bun also runs every copy under `worktrees/` of the main checkout:
   153 pass, 44 fail where `./tests/tools` gave 90 pass, 0 fail, event 479), and the comment gives the command
   as run. One file is run with the suite's timeout, `bun test --timeout=30000 ./tests/tools/<file>`: with no flag a
   test has bun's 5 s and not the script's 30 s, and while other agents' suites load the machine a file fails at 5 s
   that the change did not touch (2026-10-12, the journal: `summarize-papers.test.ts` "alone failed 12 of 26 at load 11",
   the writer of `iac-origin-test-secret-held-by-clock`; "15 fails without", the spec writer of
   `post-mortems-declared-and-kept`). A fail at the timeout is given in the comment with the first number of `uptime`.
   The script runs `bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools`
   at the root of the checkout it is in, from any directory, and prints that line first: four worker processes
   and the slowest files first, so the suite takes as long as its slowest file, `worktree.test.ts`, and not the
   sum of them. 583 pass in 60 files in 93 to 95 s over six runs on 2026-10-12, where the same files with no flag took 207 s, past the 120 s that is
   the default timeout of a command. The counts are those of the run with no flag. The script's header says why
   four workers and why 30 s for a test that names no timeout.
   Since `tmpdir-entries-slow-every-bun-start` (2026-10-13) the script gives the run a `TMPDIR` of its own, a new directory
   of `/tmp` that it removes at the end and names in its second line on stderr; its last line there is the count of entries of the
   temporary directory it was called with.
   Since `test-rigs-left-when-a-file-runs-alone` (2026-10-13) one file run alone has a `TMPDIR` of its own too: `bunfig.toml` at the root
   preloads `tests/tools/own-tmpdir.ts` into a `bun test` started there, which makes a directory `bm-test-run.XXXXXX` of `/tmp` and
   removes it after the file's last test. `KEEP_TEST_TMP=1` before the command leaves the directory and names it on stderr, for a rig
   you want to look at. A `bun test` started in another directory than the root has the `TMPDIR` of its caller.
   The tests that hold lines of the reviewer's brief (`reviewer-brief-*.test.ts`, `reviewer-in-a-view.test.ts`, the last of
   `lock.test.ts`) read `tests/tools/fixtures/reviewer-brief.md`, a copy of the commit, and not the Brain: a put of the brief
   moves no count of the suite (`suite-tests-read-the-live-brief`, 2026-10-12; before it a worktree behind `origin/main` had a fail after a put).
   A writer whose task puts the brief runs them on the edited file first (`BRIEF=<file>`), and writes the copy again in the
   commit that changes a test of it (`tests/tools/reviewer-brief.ts` has the line).
   A failure's message is printed above its `(fail)` line, under the name of its file. `tests/tools/suite.sh --parallel=1`
   is the run of one file after another, for a failure you want to see with no other file running beside it
   (`records/tests-tools-suite-three-minutes.md`). A worktree fresh from `worktree.sh`, with nothing built, gave 0 fail there on 2026-10-11
   (`records/tests-tools-fail-in-a-fresh-worktree.md`), so a fail in that count is looked at, not waved
   through; a line `skipped: <file>: no <path>` in the output names what did not run and the
   file the checkout lacks, and goes in the comment. The count of `node --test tests/notebooks/*.test.js`
   is the main checkout's (in a worktree the untracked files it reads are absent).
   When the change is a control of a panel that sends a write or a call, test it with a client
   you hold: a second press before the answer, a write that is refused (also one that would have
   taken its row off the page), two answers that arrive out of order, and another caller's event
   on the row while its box has the caret. One the change does not meet goes in "not tried" by name.
7. **Build and test in the worktree, with no browser, until it passes.** One command a round (2.3 s for `brain-static`, 2026-10-10 23:10):
   ```
   cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html \
     && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/<module> > tools/cloud-brain/.emitted/<id>.js \
     && (cd cloud-brain-dev && bun test.ts <worker> --with $W/tools/cloud-brain/.emitted/<id>.js)
   ```
   `build.ts` refuses without `--out` there. `test.ts` prints a line a test and one line of JSON:
   `passed`, `failed`, `needsBrowser`. It runs your module against the other modules as cb4 runs
   them, so it also shows a change that only holds with another writer's undeployed work.
   What it does not do, and step 8 does:
   - A test that reads `document` or `location` is counted `needsBrowser`, never passed (27 of 311 on 2026-10-10).
     So is a test that reads a cell whose inputs name a browser global (`issuesStore` names
     `localStorage`), with no failure line: if a test you wrote lands there, look at the cells it reads.
   - It runs a module's tests one at a time. The owner's page runs them together, and two tests
     that read the log at once took each other's lines there.
   - `--with` puts one module in place. A change to a module others import (`cloudflare-iac`)
     is not in the services it runs; for those, step 8 on each service it could change. A Worker of two modules (`brain-deployer`) takes the module's name in place of `<worker>`.
   `bun tools/lope-tests.ts <notebook> --filter test_<service>` is the older runner of the same
   cells (`--report <path>` writes CTRF); use it when `test.ts` cannot load the module.
8. **Run the module's tests in a browser, once it passes in step 7.** The count you submit is
   this one. One command, in the worktree, with no pairing (13 s for `brain-static`, 25 s for
   `brain-issues`, 2026-10-11):
   ```
   cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/<module>
   ```
   It opens the build in a local headless Chrome and prints one line of JSON: `tests`, `passed`,
   and `failed`, a list of each failed test's name and message (`TIMEOUT` after 90 s). Exit 0 is
   every test passed, 1 a test failed, 70 the module was not found: it is named whole, as in the
   notebook's boot list. A worktree made before the tool landed gets it with
   `tools/cloud-brain/worktree.sh --rebase <tree>`.
   Do not open a paired tab for this (`qa_open_notebook` with `cc=`). You are an agent of the
   orchestrating session, so your tab pairs through its channel server, and each `connected`,
   `variable_update`, `cell_change` and `disconnected` of the tab is sent to that session, which
   answers it with a request over its whole context: 1,047 such rows by 21:36 CEST on 2026-10-11, and
   501 of that session's 1,376 requests were answers to them
   (`records/writers-qa-tabs-wake-the-orchestrator.md`). Steps 8 and 9 need none. When
   you must look at the page itself (a screenshot, a click), open one, do that, and close it by
   name at once.
   The tool reads the value of the page's own
   first run, made while every other test cell computes; the owner's page runs each `test_*`
   cell the same way at opening and after a deploy (`verifyService`, `cloud-brain.ojs`), and a
   fail there puts an unverified Worker back. So a test you add or change has no bound on the
   wall clock, assigns nothing to `console` or another global, counts calls and reads returns
   only on a panel made with `listen: false`, and does not rest on which of two calls of a fake
   answers first unless the rig holds one. One it does not meet goes in "not tried" by name.
   One pass of the tool does not show a test meets that. When you added or changed a
   `test_*` cell, after the tool and not in its place, from the main checkout
   (1.3 s a run on 2026-10-11 18:22 CEST, 20 runs in 28 s):
   `cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts <worker> --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`.
   It opens the deployer's run address 20 times with your build as the document, and reads only.
   The tool serves a build with its boot list cut to brain-shell and the Worker's module (`mains`
   in its first line) and answers no `getSource` of the page (`refused` in a run's line: the
   page's module reads what a Worker runs by it and writes that over the build's copy; for
   `brain-x-page` the cut keeps that module, and the abort is what stops it), so your build's
   module runs, as the deployer's page runs a deployed one.
   Read `mains` in the first line and `from` in the last: a list, and `["document"]`, say the
   module of each run was your build's, and `tests` of a run then equals step 7's `passed + needsBrowser`. A `from` that
   names `brain`, or exit 3, says it was not: the 20 say nothing of your change, pass or fail.
   Say so in your comment and file it. (Until `verify-run-shell-runs-deployed` the whole build
   was served as it was. The page's own module, `assembled` of `cloud-brain.ojs`, then wrote the
   Worker's source over the build's copy while its tests ran: `n9e1c1256`, event 948, passed 0 of
   20 on a build that gave 20 of 20 once deployed. `records/verify-run-shell-runs-deployed.md`.)
   Its last line is the result: `passed` equals `runs` (so `failed` is 0 and `none` is 0) and
   `byChance` is `[]`, and `passed` of `runs` goes in your comment. A test named in `byChance`
   passed and failed on one build: back to step 6. A run counted under `none` gave no verdict
   and is not a pass: a timeout is run again, and for a Worker that never gives one
   (`brain-deployer`: "the Worker did not say what it runs", exit 2) this command does not
   apply, so run `tab-tests.ts` three times and say so in your comment.
   `hash` is the deployed Worker's and not your build's. (`attention-block-unreadable-to-owner`: the writer's one pass gave `[23,[]]`,
   review 698 failed the new test in 2 of 2 fresh tabs, and this command on that build, served whole as it then was,
   `lopebooks@07cc2ef2`, gave 5 failed of 10 and named it.)
   A count here that differs from step 7's
   `passed + needsBrowser` goes in your comment with the names.
   In the worktree the notebook is `$W/tools/cloud-brain/.emitted/cloud-brain.html`. When the
   tests pass there, commit the seed in the worktree (`git add` the files, `git commit`).
