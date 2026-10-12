# Implementer brief

You take one issue of the Cloud Brain tracker on `cb4` from `ready` to `in-review`, wait for its
review, and take one round of changes yourself (step 13). Your prompt names the issue. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

You write to the tracker with the token your prompt names: its last line says `Your token is` and a
name, `impl-` and six hex digits. The orchestrator made it for this run, and it is yours alone
(`rules.md`, "Which token"). `issues-implementer-2` when the prompt names none. `<token>` below is
that name, written out. Shorthand below: `ia` is `tools/cloud-brain/issue-as.sh <token>`. Define it
as a function, `ia() { <root>/tools/cloud-brain/issue-as.sh <token> "$@"; }`, in each command that
uses it (the copy in your worktree, `$W/tools/cloud-brain/issue-as.sh`, does the same: "Where you work"),
with the name in place of `<token>` and no variable for it: the shell is zsh, which does
not word-split a variable and stops on an unquoted `*` or `?` that matches no file, and no shell
state lasts between calls. Quote the method and the JSON.
A name the tool does not keep is exit 2 with nothing sent: write nothing with another token, and
end with a report that says so. You do not run `brain.ts agent-token`: the orchestrator makes a
token and ends it.

## Where you work

Since `wt-3-land-by-push` (2026-10-12; `plan/cloud-brain-worktree-per-topic.md`, parts 1 and 3) the
orchestrator puts you in a git worktree before it spawns you. You make none and you remove none.
The first line of your prompt names it, `Working directory: <W>`, a directory
`…/.claude/worktrees/bm-<tree>`. Below, `$W` is that path and `<tree>` is what follows `bm-` in its
name: the topic of your issue (its parent, or the issue itself when it has none), with `.2` or a
higher number after it when the topic's first worktree was not free. Its branch is `bm/<tree>`.
`<root>` is the main checkout the worktree is of:
`dirname "$(git -C $W rev-parse --path-format=absolute --git-common-dir)"`. Write the paths out in
each command; no shell state lasts between calls.

- **You edit, build, test, commit and push in `$W`.** In `<root>` you write no tracked file and run
  no `git commit`, `merge` or `pull` and no `build.ts`. What `<root>` is to you: the place of
  `tools/cloud-brain/.emitted` (the state, the tokens, the files you emit; none of it tracked) and
  of `lopebooks`, where step 10 writes the built notebook under the lock.
- **Tools are run from `$W`**, by their path there: the copy is the one of the commit you are at,
  and it changes only at your own rebase. `issue-as.sh`, `lock.sh`, `issue-wait.sh` and
  `worktree.sh` find the main checkout's tokens and worktrees from there. `brain.ts` finds the
  state with `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted` before it, and not without. Run
  2026-10-12 from this change's worktree: `issue-as.sh <token> "get?id=…"` answered 200,
  `LOCK_TOKEN=<token> lock.sh show land` answered `land is not held`, `issue-wait.sh` waited, and
  `brain.ts curl … --as loop-knowledge` answered entries with the variable and
  `no token "loop-knowledge" is kept` with none. Two tools were not moved and are run from `<root>`
  as their steps say: `verify-run.ts` (step 8) and `issue-stats.ts`.
- **`$W/cloud-brain-dev` is where you test** (Tom, 2026-10-10: the loop is "to prefer using that
  directory in a worktree when solving tasks"). It is a clone of the repository `cloud-brain-dev`
  from the cluster's git, yours alone, at the commit your worktree's `HEAD` names, and
  `worktree.sh` has read what cb4 runs into its `deploy/` (about 1 s;
  `bun sync.ts https://cb4.endpointservices.workers.dev` there reads it again and loses any edit
  under `deploy/`; `worktree.sh --rebase <tree>` does it too). `bun test.ts <worker>` there runs
  that service's tests as deployed, with no browser, in about 2 s; `--with FILE` runs your built
  module in its place. A change to that repository is committed in the clone, never in
  `<root>/cloud-brain-dev`, and landed by `worktree.sh --push-dev` (step 10).
- `git status` fails in the worktree (`lopebooks`, `lopecode` and `lopecode-plugin` are links);
  `git diff`, `git add <file>` and `git commit` work. Never `git commit -a` or `git add -A` there:
  the commit records the links in the submodules' place, which the landing would push to `main`.
  `git fetch origin` there prints the same error of the link and is exit 128;
  `git fetch --no-recurse-submodules origin` is exit 0 (four writers met the first by 2026-10-12, the last of
  `ap-1-approver-tool`: "the brief warns of status only").
- The shell of a command is zsh: an unquoted variable is one word, so `for f in $FILES` runs once with the whole
  string and `$CMD` is not a command with its arguments. Write the names out, or use an array (`F=(a b); for f in $F`).
  (The writer of `suite-tests-read-the-live-brief`, 2026-10-12: a loop over four names in one variable left an empty
  file named by all four in `tests/tools`, two runs of the suite counted it, and the landing took a second commit and a
  second take of the lock.)
- **A worktree that holds work when you come to it.** When your prompt says so, a writer of this
  issue before you died or was sent back, and its commits and edits stand:
  `git -C $W log --oneline origin/main..HEAD` and `git -C $W diff --stat HEAD` show them. Go on
  from them (step 4 says how the round is counted). You are put in no worktree that holds
  another issue's unlanded work; if those two commands show some that is not this issue's, write
  nothing there, and say so in a comment and your report.
- **A prompt whose first line names the main checkout** (no `.claude/worktrees/bm-` in the path)
  is from an orchestrating session that still runs the procedure of before that day. Then you
  make the worktree yourself, after the claim of step 4:
  `W=$(<root>/tools/cloud-brain/worktree.sh <id>)`. `<tree>` is then `<id>`, and all else is as
  written here. (The writer of `wt-3-land-by-push` was started that way.)

## Steps

1. **Read the issue.** `ia "get?id=<id>"`: the issue and every event on it. If it came back from
   review, the reviewer's findings are the `reviewed` events; fix those and nothing else.
   If you wrote the round before and this one came to you as a message, read "A resumed round" below first.
   An issue whose `labels` have `post-mortem` is not a fix: read "A post mortem" below before step 2.
2. **Read the code it is about.** The source of a service is its seed, `tools/cloud-brain/<name>.ojs`.
   The first `md` cell is its method reference. `spec-as-built.md` and `tools/cloud-brain/records/` have the history.
   What runs on cb4, when that is the question, is in your worktree:
   `$W/cloud-brain-dev/deploy/@tomlarkworthy/<module>.js`, with each Worker's hash in `deploy/services.json`.
   It is for reading. A change is made in the seed.
   **Then search the Brain for prior art, before you design the fix** (Tom, 2026-10-11: "update
   the loop instructions to use knowledge.search to do prior art research before implementing or
   designing"): `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun $W/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=<words, url-encoded>" --as loop-knowledge 2>/dev/null`.
   It answers `entries`, each with `id`, `kind`, `title`, `source` and `score`: `doc` is a guide
   in `knowledge/`, `module` a notebook module in the library, `paper` a paper from the daily
   feeds. Two or three searches, in the words of the problem and in the words of the fix you have
   in mind. Read what bears on the issue (a `doc:<name>` is `knowledge/<name>.md`; a module is
   reused by import, never copied). In the comment of step 12 say what you searched for and what
   you used, or that nothing bore on it. The token names that one read; it was made 2026-10-11
   with `brain.ts token loop-knowledge knowledge.search`.
3. **Decide whether it is yours.** Stop, comment with what you found, add the label
   `needs-owner`, and report, when any of these is true (the comment is for the owner to decide by: it is
   written as `rules.md`, "What the owner is asked to decide", has it, short, with what you found in a second comment or after the choice):
   - the fix needs something in the Never list of the rules. A change to a `test_*` cell counts:
     a Worker's hash covers its module's source with the test cells, so a test changed in
     `brain-kernel.ojs`, `brain-core.ojs`, `brain-db.ojs`, `brain-deployer.ojs` or
     `cloudflare-iac.ojs` (the deployer's hash covers it) moves a Worker the loop may not deploy;
   - `philosophy.md` (beside `rules.md`) does not say which of two reasonable behaviours to take.
     When it does, take it and say in your comment which line decided it; that is not a stop;
   - it needs a new policy, a new secret, a new permission or a new Worker. A token that an
     approved spec names, with the methods that spec gives, is not such a secret: the orchestrator
     makes it (`rules.md`, "A token an approved spec names"). When your task needs one that
     `brain.ts` says is not kept, say so in a comment and in your report, with no label, and do
     not make it.
   Do not `start` such an issue.
   What you need of the orchestrating session, and not of the owner, once you work: "When you need the orchestrating session", below.
   An issue that comes back with the owner's answer to land such a seed, or a task of an approved
   spec that says the deploy is his, is started: the seed is landed on `main` by step 10 with no
   deploy, steps 7 and 8 run on the build of your worktree, and you build, apply and probe nothing
   of it on cb4. The first line of your comment and the reason of your submit say that cb4 does
   not run the change and whose act the deploy is. Three writers did so from their issue alone on
   2026-10-12 (`token-revoke-no-name-ends-links`, `ds-1-rows-add-within`, `ds-2-core-spends-by-row`).
4. **Claim it.** `ia move '{"key":"impl/<id>/start","id":"<id>","to":"in-progress","reason":"…"}'`.
   Whoever starts an issue is the only one who can submit it: the policy lets the token of its
   last `start` submit and refuses every other, 403. An issue that is already `in-progress` is
   yours only when you started it: read `by.holder` of its last `start` event in `get?id=`. When
   it is `secret:<token>`, it was sent back to you: skip this step. Count its `rework` moves; your
   round is that number plus one, and it goes in every key you write this time. When it is
   another's, it is not yours to submit, whatever your prompt says: comment with what you read,
   say so in your report, and stop. The orchestrator makes `back`, and the writer it then spawns
   makes `start`. An issue at `ready` whose events have a `back` move had a writer before you:
   make `start` as above, read that writer's comments and the commits they name, and go on from
   what is landed; your round is still the count of `rework` moves plus one.
   **Then work in your worktree, `$W`** ("Where you work", above): the orchestrator made it at
   `origin/main` and wrote your token in it as its occupant, so no other agent is put there while
   you work. Steps 5 to 10 happen in it. (Until `wt-3-land-by-push`, 2026-10-12, each writer made
   a worktree of its own here, one an issue, and removed it at its landing.)
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
9. **Make it ready to land, still in the worktree and with no lock.** Since 2026-10-10 19:33 the
   lock covers the deploy and the push only; before that the second test run, the emit and the
   record were inside it and writers queued (Tom: "Issue completetion is bottlneck").
   - **Bring the worktree up to `origin/main`:** `$W/tools/cloud-brain/worktree.sh --rebase <tree>`
     (a fetch, then the rebase), never `git rebase` there (after a conflict `git rebase --continue`
     fails on the submodule links). It prints the files that came in, and nothing when
     `origin/main` had not moved. Exit 2: origin was not reached, and nothing changed.
     Exit 1 is a conflict: another writer changed the same lines. Resolve it in the seed, never in
     the notebook, `git add` each file by name, and run the same command again.
   - **If the rebase changed what your module is built from** (the files it printed
     name your seed, a seed it imports, `cloudflare-iac*.ojs` or `build.ts`), run steps 7 and 8
     again in the worktree (the rebase has read what cb4 runs again: another writer has deployed). Another service's seed, a record, `seen.json` or a doc does
     not count. The count you submit is the last run you made.
   - **Record it** in a file of the issue's own, `tools/cloud-brain/records/<id>.md` (follow
     `.claude/skills/document/SKILL.md`): what changed, the test count, what was not tried. A
     second round adds a dated section to the same file. Every time in it is read from
     `git log --format=%ci`, an event's `at` or `date`, never estimated. Every count in it, and in
     your comment, is the output of a command written beside it, run after the last change it
     counts; a count you cannot run again is not written. A sentence that says what the page, a
     tool or a doc line does is held the same way (where a thing is drawn, when a call is sent, "at
     no other time", "for every Worker"), in the record, the comment and the docs: you saw it in a
     run of your own after the last change, made the way its reader will meet it (the page in the
     tab, the tool that caller has, each Worker the sentence covers). What you saw of one case is
     written of that case and the rest goes under what was not tried. Words taken from the issue or
     the spec are checked as your own are (2026-10-11: review 1202 of `ds-2-span-and-refresh-controls`,
     three texts had the note "under the panels" as the spec does, and it is drawn above them;
     review 1250 of `verify-run-shell-runs-deployed`, "The page's module is then not booted", false
     for `brain-x-page`; review 1259 of `fb-a2vp4smwzq`, four pointers shown reachable with
     `brain.ts curl`, and the operator's own tool cut three of them at 8000 characters). What the
     check finds is mended in the file, and that landed, before the submit: a comment that says a
     sentence of the record goes further than what you saw, with the record left as it was, is sent
     back for that sentence (review 1090 of `record-first-resumed-rework-round`, after comment 1027,
     "Three smaller things in what landed, not changed"; review 1424 of `ds-3-logs-reads-the-span`,
     finding 2, after comment 1411, "Two places where the record's words go further than what I
     saw": a resumed round of 154,128 tokens and a second review for two lines). Not `spec-as-built.md`:
     every writer appended there and the cherry-picks met. The deploy hash and the commits are
     the refs of the submit, not part of the record. Of your own commits the record names neither
     a sha nor a `%ci` while a rebase is still ahead of them (this step's, and step 10's under the
     lock): a rebase gives each a new sha and a new committer date, and the record that quoted one
     is then wrong and is mended (2026-10-12, five writers between events 3591 and 3662 said so:
     `cost-events-test-reads-stale-deploy` and `fm-4-stats-flow-block` mended it before the push,
     `fm-2-open-stays-submits` and `fm-3-issue-flow-method` took the lock a second time for it, and
     `fm-5-page-and-dashboard` a second and a third). A time of your own
     work is read from `date` or an event's `at`. A commit already on `origin/main` keeps its sha
     and may be named. Commit it (a second commit is fine).
     The loop's reviewer is the record's fresh read; `/review-notebook` is not run on it.
   - **Emit** with the same tool, to a file named for the issue in the main checkout, where `apply` reads it:
     `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/<module> --emit <name>_service=<root>/tools/cloud-brain/.emitted/<id>-<worker>.json`.
     It runs the tests again and then writes what `(await module.value("<name>_service")).emit()` gives;
     `emitted` in its line has the file, its `hash` and its size. With a failed test it writes no file (exit 1);
     exit 2 is tests passed and no file written (`notEmitted` says why). The cell is named for the service: `issues_service` for Worker `brain-x-issues`,
     `git_service` for `brain-x-git`. The command that gave your count and the one that emitted may be one.
     A change with no deploy (a doc, a local tool, a test file under `tests/`) emits nothing.
     A changed `test_*` cell of a seed is a deploy of that seed's Worker: emit and apply it.
10. **Land it. One writer lands at a time, by a push from the worktree.** Note `date` when you take the
    lock and when you release it, and put both in your report.
    Since `wt-3-land-by-push` (2026-10-12; `plan/cloud-brain-worktree-per-topic.md`, part 1) a landing writes no
    tracked file of the main checkout: nothing is pulled, merged or committed there. Until then a landing pulled
    and merged its branch in `<root>` (174 such merges in its reflog of 2026-10-11), and another session's
    uncommitted file there refused a writer's merge for 19 minutes (`seen-main-checkout-edited-outside-lock`).
    `lock.sh` in this step is your worktree's, `$W/tools/cloud-brain/lock.sh`: it finds the main checkout's
    tokens, and its release enters the docs from the checkout it is in, which has the commit you pushed.
    Every `lock.sh` call of this step has `LOCK_TOKEN=<token> ` before it, on the same line, `show`
    among them: the holder of a lock is the name with the token of the call, a renew or a release
    sent with another token is refused, and with no `LOCK_TOKEN` the script sends nothing: exit 2, with its usage (since `lock-sh-default-token-r4`; until then such a call was made with a role's token).
    No `git commit` or `push` of this step is written before a `|` (`… | tail`): the
    line's exit is then the last command's, and a commit a hook refused reads as made. Run each on a
    line of its own and read its exit; a sha you give as a ref is one `git -C $W log origin/main` shows
    after your push (two writers on 2026-10-11, `tx-3-two-references` and `fb-a2g3jyhecp`: "a piped lopebooks commit
    read exit 0 and had not happened", "a piped lopebooks commit hid the hook's refusal").
    A landing with no deploy (a doc, a local tool, a test file under `tests/`) is one command since
    `landing-steps-in-one-script` (2026-10-13), and the command also writes the comment and the submit of step 12.
    Run it once the change and its record are committed, step 11's read "as the reviewer will" is made (the
    submit is in the command) and the comment is written to a file. Bash `timeout` at 600000: it waits up to
    300 s for a lock another writer holds, and with a shorter timeout the call is cut while it waits.
    ```
    $W/tools/cloud-brain/land.sh <token> <id> --reason @<scratchpad>/<token>-reason.txt --comment @<scratchpad>/<token>-comment.md --test "bun test --timeout=30000 ./tests/tools/<file>"
    ```
    The two files are text as it is to be read, not JSON: the tool makes the keys `impl/<id>/comment-<round>` and
    `impl/<id>/submit-<round>`, the round from the issue's `rework` moves, and one `commit` ref for each commit
    it pushed. `--reason "<text>"` is the reason inline. `--test` is a command run at the root of the worktree
    after the rebase and under the lock, as many as are given: the test files of the change, not the whole suite,
    whose count is from your run before this (step 6). The header of the script has each step and each exit.
    - **Exit 0**: landed and submitted. Its four lines go in your report: the first and the last have the times
      the lock was taken and released, the second the commits, and the third ends `seq=`, the seq of the submit
      that step 13 waits from. Go to step 13.
    - **Exit 1**: it stopped before the push, and released the lock if it had it. Stdout is the output of the
      step that failed and nothing else, and stderr names the step. Nothing is on `origin/main` and nothing was
      written to the issue: mend, commit, and run the command again. After a conflict, resolve as step 9 says first.
    - **Exit 5**: the commits are pushed and the comment or the submit was not written (a time ahead of the clock
      in the text, a key used before, a refusal). Do not run the command again: write what is missing with `ia`
      as step 12 has it, with the refs stderr gives.
    - **Exit 64**: nothing was written and no lock taken; stderr says what was wrong (a file not committed, of which
      `tests/tools/timings.json` after a run of the suite is one: `git -C $W checkout -- tests/tools/timings.json`;
      an issue whose last `start` is not your token's; a commit that changes a seed).
    - `--no-submit`, with no `--reason` and no `--comment`, is the landing alone, for a change whose submit
      waits for something after the landing (a post mortem's file is attached between the two).
    A landing with a deploy is not this command: it refuses a commit that changes a seed, and that landing is
    the steps below, one at a time. (`--seed-lands-undeployed` is for the seed whose deploy is the owner's, step 3.)
    First landing made with it: this change's own (`tools/cloud-brain/records/landing-steps-in-one-script.md`).
    What the command runs for the landing is these five lines, which are also the landing by hand, each run on
    its own and its exit read before the next:
    ```
    LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh take land <id>
    $W/tools/cloud-brain/worktree.sh --rebase <tree>
    LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh renew land <id>
    git -C $W push origin HEAD:main
    LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh release land <id>
    ```
    No build, apply or `lopebooks` commit. With a deploy, the build, the apply and their commits come between
    the rebase and that renew. Each line, and what comes between, in order:
    - Take the landing lock: `LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh take land <id>`. Since
      `lk-3-lock-sh-over-the-cluster` the lock is held in the cluster (a row `brain-x-issues` keeps,
      for 600 s from the take), so a writer in another checkout or on another machine meets the
      same one, and nothing is made on this machine for it. Exit 0 is yours.
      Exit 1 names the writer that is landing and until when: wait with a background command
      (`LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh take land <id> --wait`, `run_in_background`; a foreground
      `sleep` is blocked) and carry on when it returns 0.
      Exit 2: cb4 was not reached, or refused the call. Nothing is landed and nothing is deployed
      without the lock, and nothing local stands in for it: wait with `--wait`, which also asks
      again while cb4 is not reached, or stop and report. After a plain take that exited 2 run
      `LOCK_TOKEN=<token> lock.sh renew land <id>` before you take again: the call may have arrived, and exit 0 from
      the renew says the lock is yours (exit 1: it is not, so take).
      `LOCK_TOKEN=<token> lock.sh release land <id>` is refused to any other name, and to your name sent with another
      token. Never put the release after a `;` that follows a take which may have failed
      (`records/land-lock-any-session-can-remove.md`). `LOCK_TOKEN=<token> lock.sh show land` says who holds it and
      until when. A lock is released by its holder or ends at its time; nobody removes another's.
    - `$W/tools/cloud-brain/worktree.sh --rebase <tree>`: a fetch, then a rebase on `origin/main`, which a
      writer on this machine or another moved if it landed while you waited. Exit 2: origin was not reached and
      nothing changed (`LOCK_TOKEN=<token> lock.sh release land <id>`, report, no push). Exit 1 is a conflict, as in
      step 9. Look at what came in as in step 9. If it changed what your module is built from, what you emitted
      is stale: `LOCK_TOKEN=<token> lock.sh release land <id>`, build, test and emit again, and come back. Never apply a file
      emitted before such a change; it would deploy the Worker without the other writer's work.
      Anything else: keep the lock and carry on.
    - **With a deploy: the notebook, built from committed seeds.** First `LOCK_TOKEN=<token> lock.sh renew land <id>`. The renew gives
      600 s from now and says the lock is still yours. Exit 1 is a stop before anything of the main checkout is
      written to: your 600 s ended and another writer has the lock, or has had it. No build there; report.
      Exit 0 with the line `renewed after it had ended … nobody held it between` is
      yours: go on. Exit 2: cb4 was not reached; ask again, and do not go on until it answers 0.
      Then `git -C <root>/lopebooks pull --ff-only`: a writer on another machine may have made the day's backup.
      With every writer on one machine it brings nothing in. The notebook in `lopebooks` is changed there after
      every landing that builds but the day's first (below), so a pull that brings in a commit of it from another
      machine is refused for that file: it is a build and nothing of it is lost, so
      `git -C <root>/lopebooks checkout -- notebooks/@tomlarkworthy_cloud-brain.html notebooks/@tomlarkworthy_cloud-brain.json`
      and pull again (run on two scratch repositories on 2026-10-11, not in `lopebooks`; the record of
      `notebook-commit-once-a-day`). Any other refusal of it is a stop: release, report.
      Then the build, from your worktree, which is at the commit you will push:
      `cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && tools/cloud-brain/notebook-backup.sh "$W/tools/cloud-brain/.emitted/cloud-brain.html"`.
      The tool writes the build over `<root>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, where the
      owner and a session read it, and commits it there only when the file's last commit is of an
      earlier day. Its one line is `committed <sha> <day>`, `not due: …` or `same: …`
      (the header of `notebook-backup.sh`). Since `notebook-commit-once-a-day` (the owner, 2026-10-11:
      "we don't need to commit  @tomlarkworthy_cloud-brain.html all the time, that can be a once a day
      thing for backups"); until then every landing that built committed it (the issue's count at about 22:30 CEST that day: 53 commits of an 8.7 MB file).
      The notebook of a change is the build of its `lopecode-dev` commit (`build.ts --out`, the same bytes),
      so nothing waits on the backup.
      That file, and its commit in `lopebooks` once a day, is all a landing writes in the main checkout: one
      file, written whole from committed seeds by the lock's holder.
      Never `build.ts` in the main checkout: another session may have seeds open there, uncommitted
      and with no lock, and that build writes them into the notebook (six such files
      on 2026-10-10 23:29; one writer built them in and had to undo it).
      The tests are not run again: the seeds are the ones you tested.
    - Deploy under the deploy lock (inside the landing lock: `LOCK_TOKEN=<token> lock.sh take cb4 <id>`, and `LOCK_TOKEN=<token> lock.sh release cb4 <id>` when the apply has answered; an exit 1 or 2 from that take is no apply), with a reason that names the issue:
      `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun $W/tools/cloud-brain/brain.ts apply <id>-<worker>.json --reason="<id>: …"`.
      `brain.ts` is your worktree's, with the main checkout's state: it reads the file you emitted from that
      `.emitted`, and it keeps `seen.json` beside itself, so the entry it moves is the one of `$W`, which is
      `origin/main`'s after the rebase (`brain.ts`, lines 24 and 136: read, and its `curl` run that way; an
      `apply` from a worktree was not run when this was written).
      Then `redistil` (the Worker's line reads `same`), `saw <worker>`, each with the same two variables before it, and for the tracker
      `curl "/xrpc/com.lopecode.brain.issue.verify?guards=true" --owner` (a read).
      When the apply answers `probation`, the deployer gave no verdict: read `deploy.verify.none` for
      why (`brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys" --as loop-deploys`). Its tests did
      not run on this version. Before `brain.ts confirm <worker>` (within 10 minutes, or the version is
      put back) run `verify-run.ts <worker>` on what cb4 serves and read 0 failed; a fail is no
      confirm. Your comment and the reason of the submit say that the deployer ran no test, the
      words of `deploy.verify.none`, and the runs of yours the version stands on (three writers on
      2026-10-11, `ow-2-panel-offers-what-it-shows`, `fb-a2b5yudl8s` and `ow-3-operator-shown-the-issue`,
      after "browser.extend answered 402 owner has made 2000 priced calls today"; this step had no line for it).
    - Commit `seen.json` in the worktree: `git -C $W add tools/cloud-brain/seen.json`, then
      `git -C $W commit -m "<id>: seen.json after the deploy of <worker>"`.
      After `not due: …` or `same: …` there is no `lopebooks` commit,
      no pointer to commit and no push of `lopebooks`. After `committed <sha> <day>` (the first landing of a
      day that builds) the tool has made the `lopebooks` commit, in the main checkout's `lopebooks`. It is pushed
      first, and then its pointer is committed in the worktree:
      ```
      git -C <root>/lopebooks push
      git -C $W update-index --cacheinfo 160000,$(git -C <root>/lopebooks rev-parse HEAD),lopebooks
      git -C $W commit -m "<id>: the lopebooks pointer, the notebook's backup of <day>"
      ```
      Never `git add lopebooks` in the worktree: it is a link there, and the commit would record the link. The
      sha is the whole one: `update-index` refuses the 8 characters the tool prints. Exit 3 from the tool is no
      stop of the landing: the backup was not made, say so in your comment with the hook's words.
    - **A change to `cloud-brain-dev`**, committed in the clone `$W/cloud-brain-dev` (on a branch of the clone
      when you want one): `$W/tools/cloud-brain/worktree.sh --push-dev <tree>`, here, before the push of
      `lopecode-dev`. It rebases the clone's commits on the cluster's `main`, pushes them there with a write token
      of 60 s (`git.token`, called as `loop-git`; never printed), commits the pointer in `$W` itself and prints
      the commit. Exit 1: nothing was pushed, and stderr says why. `--push-dev <tree> --dry-run` tries the token
      and the address with nothing written. No branch is made in `<root>/cloud-brain-dev` and none is pushed to
      the cluster. A real push by it: not yet, when this was written
      (`tools/cloud-brain/records/wt-2-worktree-sh.md`, "Not done, not tried"); say in your report how the first went.
    - `LOCK_TOKEN=<token> lock.sh renew land <id>` again, then `git -C $W push origin HEAD:main`. Exit 1 from
      this renew: no push; report what is committed in `$W` and not pushed, and what you deployed.
      The push is a fast-forward or it is refused. A refusal under the lock means someone pushed `main` with
      no lock since your rebase: run `worktree.sh --rebase <tree>` again, and push. What you deployed stands;
      when that second rebase changes what your module is built from, say so on the issue and build, test, emit
      and apply again before the push.
    - `LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh release land <id>`. It prints when the lock was taken and when it went. Then one line `docs (cb4): …`: the docs step; `not entered (…)` is no failure of the landing (the exit is the release's; `knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The knowledge docs in the Brain's search").
      Exit 1 names another holder: your lock ended while you worked and another writer took it.
      Stop there, push nothing more, and report what was pushed and what was not. Exit 2: cb4 was
      not reached; run the release again. A lock that is never released ends at its time.
    - After a deploy, with the lock gone: `cd $W/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>`.
      Its JSON line is the report of what now runs: `hash` is the hash you deployed, `failed` is 0.
      Put the line's counts in your comment. A `failed` here is a deployed defect: say so on the issue first.
      No JSON line: `sync.ts` printed `left out: <worker> …` (another deploy of it is under way); run both again.
    - **The worktree stays.** You do not remove it: the next task of the topic, or your own next round, is
      written in it, and the orchestrator removes it when the topic is done (`SKILL.md`, step 1). Leave it with
      nothing unlanded: the line of `$W/tools/cloud-brain/worktree.sh --list` that begins `<tree> ` reads `clean`
      and `ahead=0`. What else it reads goes in your report. (Until `wt-3-land-by-push` the writer removed its
      worktree here, with its branch.)
      If you stop for any reason while holding the lock, release it first (`LOCK_TOKEN=<token> lock.sh release`, with your id) and say so in your report.
11. **Check it where it runs**, after the lock is gone, when that needs no owner act: one call
    that shows the new behaviour on cb4. When it needs one (`issue.rebuild`, `issue.install`, a move the workflow
    keeps for the owner, anything the Never list of the rules names), send no call, with any
    token: a refusal is still a forbidden call. Write "not run on cb4: needs the owner present"
    in the comment, with the call the owner would make.
    **Before the submit, read your change as the reviewer will.** What reviews sent changes back for, by
    how often (the tracker on 2026-10-11: 68 `changes` reviews, 144 findings, about half of them on a record,
    a README or wording; the owner that day: "reduce review rounds"). Each is a minute now and a round later:
    - The record exists, `tools/cloud-brain/records/<id>.md`, and has what changed, the test count and what was not tried.
    - Every count in the submit's reason, the comment and the record is one a command of yours printed, and
      the count of the whole suite is from a run made after your last edit.
    - No sentence says more than you saw: "every", "always", "no other", and anything of a run you did not make.
    - A number that is not from this change has where it is from beside it.
    - The test you added fails without the fix, and you ran it without the fix to see.
    - You tried the inputs the reviewer will: the empty value, the wrong type, the call sent twice, the value
      next to the one that works (`0` where `1` is the switch), and the caller that should be refused.
    - A comment or a header you added reads in order where it stands.
    - Each ref of the submit is a commit that is pushed.
    - What you changed is spoken of elsewhere. For each command, method, flag or step whose
      behaviour you changed, `git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
      and read the lines in files you did not touch. One your change made untrue is mended in this
      landing. In the spec of your task, when the sentence is a choice the owner approved, it stays
      and gains "(As built, `<id>`, <date>: …; the record.)". In a file that is not yours (the
      reviewer's brief on the Brain, a seed whose Worker you do not deploy, `rules.md`,
      `philosophy.md`), the line and its mend go in your comment under "For the overseer". Say in the
      comment what you searched for and how many lines it printed.
    Since that day a reviewer holds a change only for what it does, its tests and what is claimed of it, and
    mends a small thing in a document itself (its brief, "What holds a change, and what is a note").
12. **Say it on the issue, then submit.** A landing made with `land.sh` (step 10) has written both, from the two
    files you gave it; what follows is their content, and the two calls for a landing made by hand.
    `ia comment '{"key":"impl/<id>/comment-<round>","id":"<id>","body":"…"}'` (the field is `body`; `text` is refused 400) with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha of the seed commit>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. One `commit` ref for each commit the landing added to `lopecode-dev`. No `lopebooks` ref: the notebook of a change is the build of its `lopecode-dev` commit, and a `lopebooks` commit, on the day's first landing, is a backup (step 10). A change with no deploy (a doc, a local tool with its test file) has the commits only.
13. **Wait for your review, and take the next round yourself.** On trial since `os-4-writer-waits`
    (2026-10-11; `plan/cloud-brain-loop-order-of-service.md`, part 5): your context is in the prompt
    cache for 5 minutes after your last request, and all 16 rounds sent to a writer by message before that
    day came later than that and wrote the whole context again, 111,329 to 203,811 tokens each. A
    request every 4 minutes keeps it. With the submit of step 12 answered (`seq` of its answer is
    the submit's). First stop what you started that is billed ("Before a wait", below): this wait is up
    to 20 minutes, and the tool takes no word of what runs.
    ```
    $W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit>
    ```
    in the foreground, with the Bash `timeout` at 280000, by its absolute path (from a worktree it
    reads the main checkout's tokens, as `issue-as.sh` beside it does). It reads `sync?after=` every 15 s and writes nothing.
    - **Exit 3**, nothing printed: no review in 240 s. Run the same command again, up to 5 runs in
      all (20 minutes). After the fifth, report as step 12 left it: the orchestrator sends the round or judges, as before.
    - **Exit 0**: the first line is the `reviewed` event, with its `verdict` and `body`. The second
      line, when there is one, is the reviewer's move after it, which the tool waits 30 s for.
    - `"verdict":"pass"`: report.
    - `"verdict":"changes"` and a second line with `"to":"in-progress"`: the round is yours. Follow
      "A resumed round" below from its first item; the review it speaks of is the first line, and no
      message comes. Then the comment and the submit of step 12 with the round's number, and this
      step once more from the new submit's `seq`. That is the one round you take: after a second
      `changes`, report. Report also, and take no round, when the issue then has 3 `rework` moves or
      more: the judgment at 3 is the orchestrator's (`SKILL.md`, step 3).
    - `"verdict":"changes"` and one line: the review is recorded and the reviewer's `rework` move was
      not read. Start nothing on the verdict alone: the round's number is the count of `rework` moves
      plus one, so before that move your keys are the first round's, and a write with one answers
      `duplicate: true` and writes nothing. Read `ia "get?id=<id>"` once; so too when the second line
      is a move to any other state. `in-progress`: as the item
      above. Still `in-review`: report that, with the review's seq; the orchestrator's table has the
      row for it. Any other state: report what you read. (To event 2851 each of the 54 `changes` reviews of the record had its `rework`
      within 9.7 s, 0.5 s at the median; `tools/cloud-brain/records/os-4-writer-waits.md`.)
    - **Exit 2**: the tool keeps no token of your name, or the read was refused (401, 403): your
      token was ended. Write nothing with another, and report.
    A round that came to you as a message does not wait: submit and report. Neither does a quick
    win: its review is the orchestrator's to hand out and to read. In your report say how many runs
    of the tool you made, what each exited with, and which rounds this run made. The orchestrator
    learns of your submit from its watch, which prints the queue's new entry for it, `QUEUE review <id>`, not from your report.
    First run by a writer, of its own review: not yet, when this was written. Two things of it were
    seen: one run of 240 s in the foreground of a writer that was an agent of the orchestrating
    session ended with exit 3 and was not stopped (2026-10-11, 23:40:35 to 23:44:35 CEST), and five
    runs one after another were not tried.

## A resumed round

A round you take yourself after step 13 is a resumed round too: what follows holds, with the tool's
first line where it says the message.

Since 2026-10-11 the orchestrator may send a rework round to the agent that wrote the change, as a
message, in place of a new agent (`SKILL.md`, "A rework round goes to the agent that wrote the
change"; Tom that day: "resuming implementors is a good idea"). You then have the first round in
your context: the brief, the code and why you made each choice. That is what the resume is for,
and it is also what can mislead you. No round had been run this way when this was written; say in
your report what of it was wrong.

What a resumed round does that a first round does not:

- **Read the issue again**, `ia "get?id=<id>"`. The message names a `reviewed` event by its seq:
  its findings are the round, and nothing else is. Read them from the event, not from what you
  expected a reviewer to say. The other events since your submit may be the owner's.
- **Your worktree is the one the message names**, in a line `Working directory: <W>`: the
  orchestrator has put you in it again, and it may be another than the one you landed from, when a
  later task of the topic is being written there. With no such line (a round you took yourself
  after step 13, or a message from a session that runs the procedure of before
  `wt-3-land-by-push`), it is the one you landed from, which nobody removed: `ls` it, and when it
  is gone, `W=$(<root>/tools/cloud-brain/worktree.sh <id>)`. Then
  `$W/tools/cloud-brain/worktree.sh --rebase <tree>`: a fetch and a rebase on `origin/main`, where
  your change now is, with what cb4 runs today read into `$W/cloud-brain-dev/deploy/`.
- **Do not trust what you read of a file that has changed.** Other writers landed while the
  review ran. After that fetch, `git -C $W diff --stat <sha> origin/main`, with `<sha>` the last
  `commit` ref of your submit, names every file changed since. Read again each file of that list
  that this round rests on. `rules.md` and this brief are among them when the overseer or the
  owner changed them: read the diff
  (`git -C $W diff <sha> origin/main -- .claude/skills/brain-maintenance`), which is short.
  `philosophy.md` is in the clone, which the rebase put at the commit `origin/main` records:
  `git -C $W/cloud-brain-dev log --since=<the date of your submit> -- philosophy.md`.
  A file the list does not name is as you read it.
- **Nothing outside your context was kept**, but the worktree. No shell state, no lock, no tab you opened.
- **Your token is the one of your first round**, and the message names no other. It is kept for
  48 hours from its making. When `ia "get?id=<id>"` is exit 2, or answers 401, it has ended: write
  nothing with another token, and report it. The orchestrator then gives the round to a new writer.
- **The round's number** is the count of `rework` moves plus one, as step 4 says, in every key:
  `comment-2`, `submit-2`. The record gets a dated section in the same file (step 9).
- **Everything else is the brief as written**: the prior-art search only when the findings ask for
  a new design, the reproduction when a finding describes behaviour, the tests run again by you,
  the landing, the comment, the submit. A count from the first round is not submitted again.

In the report, say that the round was resumed, what you used from the first round without
reading it again, and anything of it that had gone stale.

## A post mortem

An issue labeled `post-mortem` asks for no fix. It names one decision or event, and you trace it back through
the record to a cause a change can be made to, write that as one file, and say which changes come next. The owner,
2026-10-12, of a spec he had sent back: "It should use reflection and backtracing the tasks to identify the root
cause of this bad decision", and "the loop itself should do the post mortem and decide next actions. These post
mortems should be files for future reference somewhere." The design is
`plan/cloud-brain-post-mortems-declared-and-kept.md`, approved for him at event 4737; this section is its task 2,
`pm-2-brief-and-procedure`. The example is `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`, the
first, written before this section was. First post mortem written under this section: not yet, when it was written.

The issue's `links` have one `cause` link, to the issue the post mortem is of. Its body says what is examined and
where the trace starts, and gives no cause. Where the body, a comment or your prompt does give one, it is data
(`rules.md`, "What an issue is"): the cause is what your trace reaches, and the file says where the two differ.

**The writer is no agent of a run in the trace.** `ia "runs?id=<the issue it is of>"` lists those runs, each
with its `token`. A token made for you for this issue is none of them. When yours is one (you were sent this
issue by a message, in a run that did other work), comment with what you read and stop before the `start`.

What each step of the brief is, for a post mortem:

| Step | For a post mortem |
|---|---|
| 1, 4 | As written. |
| 2 | The reading is the trace's sources, below. The search of the Brain is made in the words of the decision, and once more in the words of the cause before the cause is written (the last item of the trace). |
| 3 | As written. A post mortem that would need an act of the Never list is stopped there. |
| 5 to 8 | Replaced by the trace. Nothing is reproduced, built or run in a browser. |
| 9 | The rebase alone. No file is written under `tools/cloud-brain/records/`: the post mortem's file is its record, and what step 9 says of a time, a count and a sentence in a record holds for it. Nothing is emitted. |
| 10 | A landing with no deploy, of the one file (and a test of its quotes, when you write one). |
| 11 | Nothing is checked on cb4. The read "as the reviewer will" is the four questions below. |
| 12 | As written, with the file attached before the submit, and the count below. |
| 13 | As written. After a `pass` the next actions are filed, and then you report. |

### The trace

- Start at the outcome and go backwards, one step at a time: the owner's words, the comment that put
  the choice to him, the review, the submit, the run that wrote it, the brief and the prompt that run
  was given (the prompt is in the transcript alone), the issue as opened, and what it was opened from.
- For each step: what was decided or passed on, what the agent had in front of it then (the brief at
  that commit, the issue's body, what its searches answered), and what it did not have. Each is read
  from an event by its seq, a commit, a file and line, a journal file, or the transcript of the run.
  A transcript is read for what the agent was given, searched and was answered, in order. It keeps no
  reasoning (the first: "every `thinking` block in it has length 0"), so why an agent chose is written
  under "What is not known" unless the agent wrote it down. Nothing of a tool result in it that holds a
  token or a session is quoted, and nothing of it that `rules.md` names a secret (Never: "Print, copy or
  log a secret") goes in the file, a comment or your report.
- A step that could not be read is written under "What is not known" with why (the transcript is on another
  machine; the run has no `cost` event).
- **The cause is something a change can be made to:** a line of a brief, a prompt, a tool's answer, a
  check nobody makes, a question the review does not ask. "The spec writer did not think of it" is not
  one: the next spec writer is a new agent with the same brief. An agent is named by its role and the
  event of its run, and the file says what it was given.
- What a change can be made to is, as much as a line of a text, a thing that decides with no agent's
  judgment: a guard of the installed policy, a state or a move of a workflow, a refusal of a service or
  a tool, a test that fails. At each step of the trace ask what would have refused it there, whoever
  the agent was and whatever it had read; "The next actions" takes that change before a sentence.
  (Since `post-mortem-actions-prefer-guards`, 2026-10-12. The first post mortem's three actions were
  each a text an agent reads.)
- **A trace that reaches no cause says so.** `## The root cause` then has "Not found", the step where
  the trace stopped and what could not be read there, and no guess. The owner, 2026-10-12 (comment 4983
  of that issue): "Also if the cause cannot be determined the action would be to increase observability
  in the problem area". The action is under "The next actions".
- One cause is written as the root, with the others that were weighed and what in the trace rules each
  out. Where two things each had to be so, both are written.
- Before the cause is written, `knowledge.search` for earlier post mortems in the words of the cause.
  One that names the same cause is linked `related`
  (`ia link '{"key":"impl/<id>/again-<n>","id":"<id>","to":"<the earlier one>","rel":"related"}'`), and the
  file says what its actions were and why they did not hold.

Where each source is, as read on 2026-10-12 for `docs-summarised-for-search`:

| Source | Where |
|---|---|
| The issue and its events | `ia "get?id=<issue>"`; a comment or a review is an event by its `seq` |
| Its runs: the role, `agent`, `session`, `token` and `event` of each | `ia "runs?id=<issue>"` (five that day: two of a spec writer, two of a reviewer, one of an approver) |
| The transcript of an Agent run | `$CLAUDE_CONFIG_DIR/projects/-Users-tom-larkworthy-dev-lopecode-dev/<session>/subagents/agent-<agent>.jsonl`, on the machine that ran it and in no repository. A light reviewer's run has no `agent`; its transcript was not looked for. The file is added to while its agent still works: read it up to the time of the event you trace |
| The orchestrator's journal: each agent's report, whole. It does not have the prompt | `<root>/tools/cloud-brain/.emitted/issue-loop/<issue>.md` |
| A spec, a brief or a tool as the agent had it | `git -C $W show <sha>:<path>`, with `<sha>` the commit of the submit or the `at` of the topic's `worktree {` comment. The reviewer's brief of a commit is `tests/tools/fixtures/reviewer-brief.md` there |

### The file

`tools/cloud-brain/post-mortems/<id>.md`, with `<id>` the issue's id. Its first line is
`# Post mortem: <one line>`, and the search weighs that line first: it says the decision in the words a later
design would be searched in ("a second summarizer role beside the one that exists"), and not the id alone. Under it,
one line or a few: the issue it is of, when it was declared and by whom, when it was written. Then seven `## `
headings, each once and in this order. A heading may go on after these words (the first has `## Next actions, filed`):

| Heading | What is under it |
|---|---|
| `## What happened` | the outcome, with the owner's words whole and their event |
| `## The trace` | the steps in a table of events, then what the writer had in hand, where the choice was made, and what each check after it read |
| `## The root cause` | one or two sentences; what the texts an agent follows have and lack; then what else let it pass and did not make it. Or "Not found", with the step where the trace stopped |
| `## What is not known` | each source not read, each thing not tried, and why an agent chose when nothing kept it |
| `## What it cost` | from the `cost` events of the issue it is of, and the owner's answers |
| `## Next actions` | 3 at most, as one table with a row for each: the title of the issue to open, its kind, what holds the change (the column `Held by`, below), what it changes and the part of the trace it answers; then what is not filed, and why; or "None", with why |
| `## How it is known later` | what in the record a second case would look like, as exactly as it can be said |

The file is 16,000 characters at most, so that the Brain's entry holds it whole (`knowledge-docs.ts` enters it as
`doc:<id>` at the release of your landing); longer evidence is a second attachment that the file names.
`tests/tools/post-mortems.test.ts` holds the name, the first line, the headings, the length and the column
`Held by` of the actions for every file of the directory (the column not for the three written before it), and its run is the count of your submit, made after your last edit:

```
cd $W && bun test --timeout=30000 ./tests/tools/post-mortems.test.ts
```

A test of the file's quotes at a commit is yours to add or not (`tests/tools/pm-second-summarizer-role.test.ts`
is the first's); its count goes beside that one.

**Attach the file to the issue after the landing and before the submit**, so that the owner reads it from the
issue on the page. Two lines, as `agents/spec.md` step 7 attaches a spec; `<sha>` is the commit of the file on
`origin/main`, and the answer's `sha256` is that of `git -C $W show <sha>:tools/cloud-brain/post-mortems/<id>.md | shasum -a 256`:

```
python3 -c 'import json,sys; a=sys.argv; json.dump({"key":a[1],"id":a[2],"name":a[3],"mimeType":"text/markdown","text":open(a[4],encoding="utf-8",newline="").read()},open(a[5],"w"))' "impl/<id>/attach-<round>" "<id>" "<id>-r<round>.md" "$W/tools/cloud-brain/post-mortems/<id>.md" "<scratchpad>/<token>-attach.json"
ia attach @<scratchpad>/<token>-attach.json
```

An issue takes a name once, which is why the round is in it. (Sent so for the first by the writer of
`pm-1-file-and-search`, event 4803: 200, `attached`, 12,664 bytes, the file's hash.)

### The next actions

You decide them (the owner: "the loop itself should do the post mortem and decide next actions"), and he is not
asked to pick between them.

- They are written in the file under `## Next actions`, and **filed after the review passes**, so that no issue is
  opened from a cause the review then sends back. (The first filed its three before its submit, events 4497 to
  4501, and linked them `related`; the `cause` links were added at events 4909 to 4911.)
- **A guard before a sentence.** The owner, 2026-10-12, of these instructions (the body of
  `post-mortem-actions-prefer-guards`, event 4978): "would this cover deterministic rule changes or workflow
  changes, not jsut agent prmpt tweaking, generally fixes are better as guards." What follows is the writer's
  reading of it. For each action, take the first of these that can hold the cause, and name it in the column
  `Held by` of the table, as the first word of the cell:

  | `Held by` | The change | Who makes it stand |
  |---|---|---|
  | `guard` | a CEL guard of the tracker's installed policy | the owner installs a policy (`issue.install`): the action is `major`, with the guard's text in its body |
  | `workflow` | a state, a move or a swap of a workflow | the same |
  | `refusal` | a service or a tool answers no (the rule of a method, a 4xx, an exit that is not 0) where it answered yes | a writer; a deploy when it is a service's |
  | `test` | a test that fails when the thing is so again, in a suite that is run before a landing | a writer |
  | `observability` | something logged, kept or counted where the trace stopped (below) | a writer |
  | `text` | a sentence an agent reads: a brief, a prompt, `rules.md`, `philosophy.md`, a doc, the form of a comment | a writer, or the owner for his two files |

  The first four decide without an agent's judgment, and a new agent with the same brief meets them as the last
  did. A `text` cell goes on, after the word, with why none of the four can hold this cause (what would have to
  be read is in no event, no file and no call a guard or a tool sees). "It is shorter" and "it needs his install"
  are not that: a change he must install or approve reaches him as one change to approve, which is the cost of
  the guard and is written in the row, and it is weighed as "None" is weighed, against a second case.
  One cell names one kind; a test that holds a sentence of a brief is `text`, since the sentence is what the
  agent meets. The form test holds the column and the word, and that a `text` cell goes on; that the why is true
  is the reviewer's to read.
- **When the trace reached no cause, the action is `observability`** in the place where it stopped: what the next
  case will have logged, kept or counted that this one did not, said so that a second trace gets past that step.
  "None" is then no answer, and neither is a guard against a cause that was guessed. It counts among the 3 (the
  owner, 2026-10-12, comment 4999 of `post-mortem-actions-prefer-guards`: "yes it would count towards the three";
  until `seen-pm-brief-three-is-his-word` this line said his words did not say). An entry of `## What is not known` that
  did not stop the trace needs no action; one set aside under "what is not filed" for its cost says what smaller
  thing would show it (the first set aside "Keeping an agent's reasoning. It would have answered "why", at an
  unknown cost", with no smaller thing named).
- At most 3 issues a post mortem, over all its rounds: the overseer's limit, for the overseer's reason, "so a bad
  round cannot compound". Each is a `task` or a `bug` whose body quotes the post mortem's cause and names the
  file. It is linked to the post mortem as its `cause`, and is not opened with `parent`. The open's body is a file
  of the scratchpad, `{"key":"impl/<id>/action-<n>","id":"<short>","kind":"task","title":"…","body":"…"}`
  ("The tracker's write calls"):
  ```
  ia open @<scratchpad>/<token>-action-<n>.json
  ia link '{"key":"impl/<id>/action-<n>-cause","id":"<short>","to":"<id>","rel":"cause"}'
  ```
  `ia "get?id=<id>"` then has one `{"rel":"cause","id":"<short>"}` in `linked` for each action of the file.
- An action that changes `rules.md`, `philosophy.md` or who may do what has `"labels":["major"]` at its open and the
  text proposed in its body. It reaches the owner at `awaiting-approval` as any `major` change does: his approval
  of a change, not a choice between actions.
- You make none of them yourself, as a quick win or otherwise: each is taken by the loop as any issue is.
- "None" is an answer: the cause is already changed (name the commit), or a change would cost more than a second
  case (`philosophy.md`, line 5), with what would reopen it.
- **When.** Step 13's wait answers `"verdict":"pass"`: open and link each action then, and give the ids in your
  report. When you report with no `pass` read (the fifth exit 3, a second `changes`), say in the report that the
  actions are not filed: the orchestrating session opens them from the file (`SKILL.md`, "A post mortem").

### Before the submit: the four questions

The reviewer's part "A post mortem" is task 3 of the spec, `pm-3-reviewer-brief`, and was not on the Brain when this
was written. (It is since 2026-10-12 23:02 CEST, the put of that task; `tests/tools/reviewer-brief-post-mortem.test.ts`
holds that its four are these four.) Its questions, from the spec (part 6). A post mortem that fails 1 or 2 is sent back:

1. Does each step of the trace say what its event, commit or line says? Read five of them, the cause's among them.
2. Is the cause something a change can be made to, and does the trace reach it, or does it stop at an agent?
3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?
4. Would a reader know a second case from "How it is known later"?

Under question 3, since `post-mortem-actions-prefer-guards` (2026-10-12), read your own table once more as the
reviewer may: for each `text` row, name to yourself the guard, the move, the refusal or the test that would have
stopped the step, and see that the cell says why it cannot be made; and where `## The root cause` is "Not found",
see that an action is `observability` at the step named there. (What the reviewer's brief asks of it is
`pm-3-reviewer-brief`'s to put; comment 5009 there has what this change asks of its question 3.)

The comment of step 12 says what you searched for and what you read, and each source you could not read. The refs
of the submit are the commits of the file.

## When you need the orchestrating session

Since `asks-orchestrator-label-and-watch` (2026-10-12). Something only the session that spawned you
can give or say while you work: a go-ahead that rests on its other agents, a token it makes. What is
the owner's is step 3 and `needs-owner`, not this. Until that day such a request had no form a tool
read: the writer of `fly-1-by-hand` asked in comment 4816 at 22:21:06 CEST with a billed Fly machine
running, and the answer came at 22:43:04, after the owner asked
(`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`).

**First choice: end the run.** Stop what you started that is billed (a Fly machine, a browser or a
container of the cluster), commit in `$W` what stands, comment on the issue with what you need, and
end with a report whose first line is the ask. A report wakes the session, which no comment of yours
does, and it resumes you by message with the answer, as it did that writer at 21:06, in the worktree,
which stays. No label then.

**The label `asks-orchestrator` is for a run that cannot end**: what the answer is for would be lost
with the run. One call makes the two writes, the comment first, since the session's watch prints the
label and the session then reads the comment:

```
$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --nothing-billed <the ask>
$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --runs "<what is billed>" --since <HH:MM> --stop-in <minutes> <the ask>
```

`<minutes>` is how long you wait, 1 to 10. `--runs` names what you started that is billed and still
runs, `--since` the time it was started (read from `date` or an event's `at`, as a time of day of this machine), and `--stop-in` the
minutes from now at which you stop it yourself, answered or not, the wait's at most. The tool
refuses, exit 64 with nothing sent, an ask with no minutes, one with neither `--nothing-billed` nor
`--runs`, and a `--stop-in` past the wait. It writes the two times from the clock in the comment,
under your ask: "Waits until …" and "Billed while it waits: …". Its line of JSON has `until` and
`stop`: stop the thing by `stop`. Exit 1 says which write was not made. Do not write the comment and
the label with `ia`: `issue-as.sh` refuses a body that names a time of the same day ahead of the clock (exit 3), and
the wait's end is one, but in the last 10 minutes of a day (`tests/tools/issue-ask.test.ts` has both).

`tools/cloud-brain/issue-watch.sh` prints a `labelled` event that adds that name, whatever token wrote
it, and the line wakes the session; the comment alone prints nothing (`tests/tools/issue-watch.test.ts`).
It prints a second line, `asks-still`, when the label is still on and the issue has had no event for 5 minutes.
(What it reads is the issue's `updated_at`, which a `cost` event does not move.)
The session answers with a comment keyed `orch/<id>/answer-<n>` and then takes the label off
(`SKILL.md`, step 3, the row of the label). You read for the label gone, once a minute:

```
ia "get?id=<id>" 2>/dev/null | python3 -I -c 'import sys,json; sys.exit(0 if "asks-orchestrator" in json.load(sys.stdin)["issue"]["labels"] else 3)'
```

Exit 0: still on. Exit 3: off, and the answer is the comment of that key in the same read. Any other
exit: the read gave no issue, and says nothing of the label. At the
time the tool gave as `until`, with the label still on, take it off yourself (`"remove":["asks-orchestrator"]`, key
`impl/<id>/asks-<n>-off`) and take the first choice. The 10 minutes are this section's writer's and are
not measured. (The tool, since `wait-says-what-runs-and-until-when`, 2026-10-12: until then the ask was
two calls of `ia`, and the first would have been refused for its time.) Seen on cb4, 2026-10-12 23:12 CEST: a writer's token put the label on its own
issue and took it off (events 5125 and 5126), `list?label=asks-orchestrator` listed the issue between
the two, and the watch's filter printed 5125 and not 5126. First ask made this way: not yet.

## Before a wait

Since `wait-says-what-runs-and-until-when` (2026-10-12). The case: the Fly machine of `fly-1-by-hand`,
`started` and idle for the 22 minutes its writer waited, while no text said what a billed thing does
through a wait (`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`, "The root cause", 2).
`rules.md` has the check for the end of a run ("Before finishing"); this is the one for a wait inside it.

Before you wait for anyone (the owner, the orchestrating session, your review, a lock another holds),
stop what you started that is billed by the minute: a Fly machine, a browser or a container of the
cluster. What must run through the wait, because the answer is for it, is said in the request:
what runs, since when, and the time at which you stop it yourself, answered or not.

| The wait | What holds it |
|---|---|
| for the orchestrating session, with the label | `issue-ask.sh` refuses the ask without `--nothing-billed` or `--runs … --since … --stop-in …`, and writes the times ("When you need the orchestrating session") |
| for your review (step 13) | this sentence: `issue-wait.sh` reads the tracker and knows nothing of what you started. Nothing billed runs through it |
| for the owner (`needs-owner`, step 3) | the run ends: `rules.md`, "Before finishing" |
| for a lock another holds (step 10, the take with `--wait`) | this sentence |

A message of the session that tells you to wait names a time (`SKILL.md`, "A message that asks an
agent to wait"). One that names none, or a condition ("when no other agent runs"): ask it for the
time in your report or your ask, and wait 10 minutes at most.

## A quick win

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

The owner, 2026-10-11: "if an agent has spare context left and it already knows how to fix an issue
it should jsut do it as a quick win while it is there." Before 2026-10-11 the only thing you could
do with a second defect was file it, and a round for a one-line change cost 167,000 tokens or more.

While you are in the code for your issue you will see other things: a stale line of a record, a
wrong count in a doc, a test that names the wrong value, a step of this brief that misled you. When
all of these hold, fix it now:

- you know the fix, and it is in files your issue already has you in or a doc beside them;
- it needs nothing in the Never list of `rules.md`, no deploy of another Worker, and no choice the
  owner would want to make;
- you have read no more than you would have anyway.

It gets its own issue and its own commit, so the review and a revert are of that one change:

```
ia open '{"key":"impl/<short>/open","id":"<short>","kind":"bug","title":"…","body":"what was wrong, where"}'
ia link '{"key":"impl/<short>/link","id":"<short>","to":"<your issue>","rel":"related"}'
ia move '{"key":"impl/<short>/start","id":"<short>","to":"in-progress","reason":"real: <how you met it>. One change: <what>."}'
…the fix, its test, the commit, landed as step 10 says…
ia move '{"key":"impl/<short>/submit","id":"<short>","to":"in-review","refs":[{"kind":"commit","value":"<sha>"}]}'
```

`start` from `open` takes the reason triage would have given and is refused for an issue labeled
`major` or `needs-owner`. An issue that is already open and that you can fix the same way: `start`
it the same way, when no agent has it (`issue.by.start` is empty). Say each quick win in your
report. When one of the three does not hold, it is feedback (below), not a fix.

A follow-up of your issue is linked, never opened with `parent`: a part holds its parent back from
`submit` (403 at event 296 on 2026-10-10). `ia link '{"key":"…","id":"<follow-up>","to":"<your issue>","rel":"related"}'`.
When your work has stopped and cannot be submitted (it needs the owner, or it was not real):
`ia move '{…"to":"ready","reason":"…"}'` gives it back, and `"to":"closed"` ends it with no change.

## If you see something, say something

Anything that seems off against one of the seven lines of `philosophy.md` while you work, and is
not your issue: open a feedback ticket and go on. `ia open '{"key":"<role>/<short>/seen","id":"seen-<short>","kind":"feedback","title":"<what, and the line>","body":"<what was seen, when from `date`, where to read it, which line>"}'`
No fix in it and no work on it: the owner reads these for patterns before anything is built
(2026-10-11, `philosophy.md`, Clarifications). What slowed you still goes in your report.

## When a deploy is put back on a test

The deployer runs the Worker's tests in a browser of the cluster after the deploy and puts the
version back when one fails. Since 2026-10-11 it also opens an issue `fix-tests-WORKER-HASH8` whose
body is JSON: both hashes, the run's address (`run`), the browser (`browser`), each failed test
with its message and stack. Read it before anything else.

That browser is not yours: HeadlessChrome 128 there, Chrome 151 in a QA tab on 2026-10-11, when a
test of `brain-container` passed in the second and failed in the first (`records/put-back-opens-an-issue.md`).
So: open the `run` address in a QA tab. When the test passes there, do not call it timing. Ask the
cluster's browser the one thing you suspect, with a token for `browser.extend browser.run`:
`browser.run { url, expression }` gives the expression's value from a page there (60 s is $0.0015).

## The tracker's write calls

Each is `ia <call> '<json>'`, and each takes a `key`. The shapes, from the tracker's own reference
(`getSource?worker=brain-x-issues&part=reference`, read 2026-10-10 23:30):

| Call | JSON |
|---|---|
| `open` | `{ key, title, body, kind, about, parent, labels, id }`. `about` is `brain` or a Worker's name; `id` is `a-z 0-9 -`, 40 at most. |
| `comment` | `{ key, id, body }` |
| `attach` | `{ key, id, name, mimeType, text }`, or `base64` in place of `text`. A file for the reviewer or the owner (a diff, a log, a screenshot): 1 MB, 20 an issue, a name once. Read back with `ia "attachment?id=<id>&name=<name>"`. Since 2026-10-11 (`records/n9e1c1256.md`). |
| `label` | `{ key, id, add, remove }`, lists of names |
| `move` | `{ key, id, to, reason, refs }` |

A body with an apostrophe, or of more than a few lines, is written to a file in the scratchpad (the
Write tool) and sent with `@`: `ia comment @<scratchpad>/<token>-comment.json`. The scratchpad is one
directory for every agent of the session, so each file you write there begins with your token: on
2026-10-12 a writer's call sent another writer's `comment.json` and `submit.json` with its own token
(`wt-4-reviewer-in-a-view`; both keys were used already, so nothing was written). An apostrophe ends the quoting
of an inline `'<json>'` and zsh sends nothing; a body over ARG_MAX (1048576 bytes here) is "argument
list too long". The file's bytes are the body as they are, the time check reads them, and a file that
is absent or empty is exit 4 with nothing sent (`records/issue-as-body-from-a-file.md`).

A follow-up opened with this issue as `parent` holds this issue back from review until it is
closed (the submit is refused 403, `issue.children.open == 0`; `brain-tests-fail-headless-unread`,
2026-10-10). Open a follow-up with no `parent` and name this issue in its body.

A change with no seed and no local tool in it (a doc alone) still needs a count for the submit:
a test file under `tests/` that reads the doc and fails before the edit (`tests/tools/doc-token-example.test.ts`).
A test that holds a sentence of a record reads the record and, for anything else, a file as a commit
named in the record has it (`git show <commit>:<path>`; `tests/tools/ds-3-record.test.ts`), never the
file as it is: a later line there fails the test while the record is true.
A task that is an act on cb4 and ends with nothing but its record (a row put, a notebook published) is not
this case. Its count is the one `rules.md` gives (Never, the last item): the confirmation that the act
happened, made by you where it took effect, which is the check the spec names for the task when it names one.
Give that count in the submit, and the suite's beside it when the landing has a record
(`dsv-7-second-dashboard-as-data`, 2026-10-12: this paragraph, `rules.md` and the spec each gave another count).

## What a reviewer will check

That the tests were run and by whom, that what is deployed is what the seed builds, and that the
record says what was not tried. On 2026-10-10 a session submitted three fixes with "not run: no
notebook runtime" and a module edited by hand after compiling; both were caught in review.
