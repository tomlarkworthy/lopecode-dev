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
   `needs-owner`, and report, when any of these is true:
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
   as run. The script runs `bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools`
   at the root of the checkout it is in, from any directory, and prints that line first: four worker processes
   and the slowest files first, so the suite takes as long as its slowest file, `worktree.test.ts`, and not the
   sum of them. 583 pass in 60 files in 93 to 95 s over six runs on 2026-10-12, where the same files with no flag took 207 s, past the 120 s that is
   the default timeout of a command. The counts are those of the run with no flag. The script's header says why
   four workers and why 30 s for a test that names no timeout.
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
    A landing with no deploy (a doc, a local tool, a test file under `tests/`) is these five lines, each run on
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
12. **Say it on the issue, then submit.**
    `ia comment '{"key":"impl/<id>/comment-<round>","id":"<id>","body":"…"}'` (the field is `body`; `text` is refused 400) with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha of the seed commit>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. One `commit` ref for each commit the landing added to `lopecode-dev`. No `lopebooks` ref: the notebook of a change is the build of its `lopecode-dev` commit, and a `lopebooks` commit, on the day's first landing, is a backup (step 10). A change with no deploy (a doc, a local tool with its test file) has the commits only.
13. **Wait for your review, and take the next round yourself.** On trial since `os-4-writer-waits`
    (2026-10-11; `plan/cloud-brain-loop-order-of-service.md`, part 5): your context is in the prompt
    cache for 5 minutes after your last request, and all 16 rounds sent to a writer by message before that
    day came later than that and wrote the whole context again, 111,329 to 203,811 tokens each. A
    request every 4 minutes keeps it. With the submit of step 12 answered (`seq` of its answer is
    the submit's):
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
    learns of your submit from its watch, which prints every `submit`, not from your report.
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
Write tool) and sent with `@`: `ia comment @<scratchpad>/comment.json`. An apostrophe ends the quoting
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
