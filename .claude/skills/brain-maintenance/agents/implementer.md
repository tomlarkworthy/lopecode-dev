# Implementer brief

You take one issue of the Cloud Brain tracker on `cb4` from `ready` to `in-review`. Your prompt
names the issue. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Your token is `issues-implementer-2`. Shorthand below: `ia` is
`tools/cloud-brain/issue-as.sh issues-implementer-2`. Define it as a function,
`ia() { <root>/tools/cloud-brain/issue-as.sh issues-implementer-2 "$@"; }`, in each command that
uses it: the shell is zsh, which does not word-split a variable and stops on an unquoted `*` or
`?` that matches no file, and no shell state lasts between calls. Quote the method and the JSON.

## Steps

1. **Read the issue.** `ia "get?id=<id>"`: the issue and every event on it. If it came back from
   review, the reviewer's findings are the `reviewed` events; fix those and nothing else.
   If you wrote the round before and this one came to you as a message, read "A resumed round" below first.
2. **Read the code it is about.** The source of a service is its seed, `tools/cloud-brain/<name>.ojs`.
   The first `md` cell is its method reference. `spec-as-built.md` and `tools/cloud-brain/records/` have the history.
   What runs on cb4, when that is the question, is in your worktree after step 4:
   `$W/cloud-brain-dev/deploy/@tomlarkworthy/<module>.js`, with each Worker's hash in `deploy/services.json`.
   It is for reading. A change is made in the seed.
   **Then search the Brain for prior art, before you design the fix** (Tom, 2026-10-11: "update
   the loop instructions to use knowledge.search to do prior art research before implementing or
   designing"): `BRAIN_BASE=cb4 bun <root>/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=<words, url-encoded>" --as loop-knowledge 2>/dev/null`.
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
   - it needs a new policy, a new secret, a new permission or a new Worker.
   Do not `start` such an issue.
4. **Claim it.** `ia move '{"key":"impl/<id>/start","id":"<id>","to":"in-progress","reason":"…"}'`.
   Whoever starts an issue is the only one who can submit it. An issue that is already
   `in-progress` was sent back: skip this step. Count its `rework` moves; your round is that
   number plus one, and it goes in every key you write this time.
   **Then work in a worktree of your own**, because another writer may be working at the same
   time and `build.ts` in the main checkout rewrites the notebook every agent reads:
   `W=$(tools/cloud-brain/worktree.sh <id>)`. Steps 5 to 9 happen in `$W`. Tools that read the
   cluster (`brain.ts`, `issue-as.sh`) are always run from the main checkout by absolute path.
   **`$W/cloud-brain-dev` is where you test** (Tom, 2026-10-10: the loop is "to prefer using that
   directory in a worktree when solving tasks"). It is a worktree of the repository
   `cloud-brain-dev`, yours alone, and `worktree.sh` has read what cb4 runs into its `deploy/`
   (about 1 s; `bun sync.ts https://cb4.endpointservices.workers.dev` there reads it again and
   loses any edit under `deploy/`; `worktree.sh --rebase <id>` does it too, and gives a worktree
   made before 2026-10-10 23:10 its `cloud-brain-dev/`). `bun test.ts <worker>` there runs that service's tests as
   deployed, with no browser, in about 2 s; `--with FILE` runs your built module in its place.
   `git status` fails in the worktree (`lopebooks` and `lopecode` are links); `git diff`, `git add <file>`
   and `git commit` work. Never `git commit -a` or `git add -A` there: the commit records the
   links in the submodules' place, which the landing would take to `main`.
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
   When the fix is in a local tool and no seed (`brain.ts`, `tools/lope-tests.ts`), the test is a
   file under `tests/` that `node --test` or `bun test` runs and that fails before the fix; its
   count is the one you submit, and steps 7 to 9 need no build, tab or emit. If the tool cannot
   be loaded by a test as it stands, say so in the comment with the commands you ran instead.
   A changed `brain.ts` is run from the worktree with
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`, never copied into the main checkout.
   `tests/tools/*.test.ts` run in the worktree, as `bun test ./tests/tools` or `./tests/tools/<file>`
   with the `./` (without it bun also runs every copy under `worktrees/` of the main checkout:
   153 pass, 44 fail where `./tests/tools` gives 90 pass, 0 fail), and the comment gives the command
   as run; the count of `node --test tests/notebooks/*.test.js`
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
   this one, and the emit of step 9 needs the tab. Open a QA tab with a session name of your own
   (`qa_open_notebook`, headless, the notebook's file URL with
   `#view=C100(S70(<module>),S30(@tomlarkworthy/claude-code-pairing))&cc=<pairing token>&r=<new number>`),
   wait for `connected`, then `eval_code` with the tab's full URL as `notebook_id`:
   ```js
   const rt = window.__ojs_runtime;
   let mod; for (const v of rt._variables) if (v._name === "<a cell of the module>") mod = v._module;
   const names = [...rt._variables].filter(v => v._module === mod && v._name && v._name.startsWith("test_")).map(v => v._name);
   const side = rt.module(), bad = [];
   await Promise.all(names.map(n => new Promise(res => {
     const t = setTimeout(() => { bad.push(n + " TIMEOUT"); res(); }, 90000);
     side.variable().import(n, "s_" + n, mod);
     side.variable({ fulfilled: () => { clearTimeout(t); res(); }, rejected: e => { clearTimeout(t); bad.push(n + " " + String(e && e.message || e).slice(0, 400)); res(); } }).define(null, ["s_" + n], x => x);
   })));
   return JSON.stringify([names.length, bad]);
   ```
   Name a `test_*` cell in the first line that finds `mod`: a helper such as `blueskyRig` is in
   two modules and gives the other one's count. The snippet reads the value of the page's own
   first run, made while every other test cell computes; the owner's page runs each `test_*`
   cell the same way at opening and after a deploy (`verifyService`, `cloud-brain.ojs`), and a
   fail there puts an unverified Worker back. So a test you add or change has no bound on the
   wall clock, assigns nothing to `console` or another global, counts calls and reads returns
   only on a panel made with `listen: false`, and does not rest on which of two calls of a fake
   answers first unless the rig holds one. One it does not meet goes in "not tried" by name.
   One pass of the snippet does not show a test meets that. When you added or changed a
   `test_*` cell, after the snippet and not in its place, from the main checkout
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
   apply, so run the snippet in three fresh tabs and say so in your comment.
   `hash` is the deployed Worker's and not your build's. (`attention-block-unreadable-to-owner`: the writer's one pass gave `[23,[]]`,
   review 698 failed the new test in 2 of 2 fresh tabs, and this command on that build, served whole as it then was,
   `lopebooks@07cc2ef2`, gave 5 failed of 10 and named it.)
   `run_tests` hangs on this notebook; do not use it. Do not define the observers inside the
   module under test: they would be written into the deployed source.
   The `bad` list has each failure's message. A count here that differs from step 7's
   `passed + needsBrowser` goes in your comment with the names.
   In the worktree the notebook is `$W/tools/cloud-brain/.emitted/cloud-brain.html`. When the
   tests pass there, commit the seed in the worktree (`git add` the files, `git commit`).
9. **Make it ready to land, still in the worktree and with no lock.** Since 2026-10-10 19:33 the
   lock covers the deploy and the push only; before that the second test run, the emit and the
   record were inside it and writers queued (Tom: "Issue completetion is bottlneck").
   - **Bring the worktree up to `main`:** `tools/cloud-brain/worktree.sh --rebase <id>`, never
     `git rebase main` there (after a conflict `git rebase --continue` fails on the submodule
     links). It prints the files that came in from `main`, and nothing when `main` had not moved.
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
     the refs of the submit, not part of the record. Commit it (a second commit is fine).
     The loop's reviewer is the record's fresh read; `/review-notebook` is not run on it.
   - **Emit** in that tab, to a file named for the issue, then close the tab by name:
     `fetch("http://127.0.0.1:47814/<id>-<worker>.json", { method: "POST", body: JSON.stringify(await (await mod.value("<name>_service")).emit()) })`.
     Each `eval_code` is its own scope: repeat the two lines that find `rt` and `mod`. The cell
     is named for the service: `issues_service` for Worker `brain-x-issues`, `git_service` for `brain-x-git`.
     If nothing listens on 47814, start `bun <root>/tools/cloud-brain/test-receiver.ts` in the background
     (from the main checkout: `apply` reads the files it saves there).
     A change with no deploy (a doc, a local tool, a test file under `tests/`) emits nothing.
     A changed `test_*` cell of a seed is a deploy of that seed's Worker: emit and apply it.
10. **Land it. One writer lands at a time, in the main checkout.** Note `date` when you take the
    lock and when you remove it, and put both in your report.
    - Take the landing lock: `<root>/tools/cloud-brain/lock.sh take land <id>`. Exit 0 is yours;
      exit 1 names the writer that is landing: wait with a background command
      (`<root>/tools/cloud-brain/lock.sh take land <id> --wait`, `run_in_background`; a foreground
      `sleep` is blocked) and carry on when it returns 0. The tool writes your issue's id into the
      lock (`.emitted/land.lock/holder`) and `lock.sh release land <id>` refuses any other name.
      Never `mkdir` or `rmdir` the directory yourself, and never put the release after a `;`
      that follows a take which may have failed: on 2026-10-11 15:25 a session ran `mkdir … && …; rmdir …`
      on the landing lock, the mkdir failed, and the rmdir removed the lock of a writer that was landing
      (`records/land-lock-any-session-can-remove.md`). `lock.sh show land` says who holds it.
    - `tools/cloud-brain/worktree.sh --rebase <id>` again: a writer that landed while you waited
      moved `main`. Look at what came in as in step 9. If it changed what your module is built from, what you emitted
      is stale: `lock.sh release land <id>`, build, test and emit again, and come back. Never apply a file
      emitted before such a change; it would deploy the Worker without the other writer's work.
      Anything else: keep the lock and carry on.
    - `git -C <root> merge --ff-only bm/<id>`. Then the notebook, built from committed seeds: the
      worktree is at `main`'s commit now, so
      `cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && cp tools/cloud-brain/.emitted/cloud-brain.html "<root>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html"`.
      Never `build.ts` in the main checkout: another session may have seeds open there, uncommitted
      and with no lock, and that build writes them into the notebook you commit (six such files
      on 2026-10-10 23:29; one writer built them in and had to undo it, one skipped the
      `lopebooks` commit). `git -C <root>/lopebooks diff --stat` shows your change and no other.
      If `git -C <root> diff --quiet -- tools/cloud-brain/brain.ts` fails, `brain.ts` there is
      someone's edit: run the worktree's, `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted bun $W/tools/cloud-brain/brain.ts …`.
      The tests are not run again: the seeds are the ones you tested.
    - Deploy under the deploy lock (inside the landing lock: `lock.sh take cb4 <id>`, and `lock.sh release cb4 <id>` when the apply has answered), with a reason that names the issue:
      `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply <id>-<worker>.json --reason="<id>: …"`.
      Then `redistil` (the Worker's line reads `same`), `saw <worker>`, and for the tracker
      `curl "/xrpc/com.lopecode.brain.issue.verify?guards=true" --owner` (a read).
    - Commit `lopebooks` first (its hook may rewrite the `.json` beside the notebook; stage that
      and commit again), then `seen.json` and the `lopebooks` pointer in `lopecode-dev`. Push both.
    - With no deploy: lock, rebase, `merge --ff-only`, push, unlock. No build, apply or `lopebooks` commit.
    - `<root>/tools/cloud-brain/lock.sh release land <id>`. It prints when the lock was taken and when it went.
    - After a deploy, with the lock gone and before the worktree goes: `cd $W/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>`.
      Its JSON line is the report of what now runs: `hash` is the hash you deployed, `failed` is 0.
      Put the line's counts in your comment. A `failed` here is a deployed defect: say so on the issue first.
      No JSON line: `sync.ts` printed `left out: <worker> …` (another deploy of it is under way); run both again.
    - `tools/cloud-brain/worktree.sh --remove <id>`.
      If you stop for any reason while holding the lock, release it first (`lock.sh release`, with your id) and say so in your report.
11. **Check it where it runs**, after the lock is gone, when that needs no owner act: one call
    that shows the new behaviour on cb4. When it needs one (`issue.rebuild`, `issue.install`, a move the workflow
    keeps for the owner, anything the Never list of the rules names), send no call, with any
    token: a refusal is still a forbidden call. Write "not run on cb4: needs the owner present"
    in the comment, with the call the owner would make.
12. **Say it on the issue, then submit.**
    `ia comment '{"key":"impl/<id>/comment-<round>","id":"<id>","body":"…"}'` (the field is `body`; `text` is refused 400) with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha of the seed commit>"},{"kind":"commit","value":"lopebooks@<sha>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. One `commit` ref for each commit the landing added to `lopecode-dev`. A change with no deploy (a doc, a local tool with its test file) has the commits only.

## A resumed round

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
- **Make the worktree again.** Step 10 removed yours with its branch.
  `W=$(tools/cloud-brain/worktree.sh <id>)` gives a new one at `main`, where your change now is,
  with what cb4 runs today in `cloud-brain-dev/deploy/`. There is nothing to rebase before step 9.
- **Do not trust what you read of a file that has changed.** Other writers landed while the
  review ran. `git -C <root> diff --stat <sha> main`, with `<sha>` the last `commit` ref of your
  submit, names every file changed since. Read again each file of that list that this round rests
  on. `rules.md` and this brief are among them when the overseer or the owner changed them: read
  the diff (`git -C <root> diff <sha> main -- .claude/skills/brain-maintenance`), which is short.
  `philosophy.md` is in the submodule: `git -C <root>/cloud-brain-dev log --since=<the date of your submit> -- philosophy.md`.
  A file the list does not name is as you read it.
- **Nothing outside your context was kept.** No shell state, no QA tab (you closed it by name),
  no lock, no receiver you started. A tab is opened with a new `r` and a session name not used before.
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

A follow-up opened with this issue as `parent` holds this issue back from review until it is
closed (the submit is refused 403, `issue.children.open == 0`; `brain-tests-fail-headless-unread`,
2026-10-10). Open a follow-up with no `parent` and name this issue in its body.

A change with no seed and no local tool in it (a doc alone) still needs a count for the submit:
a test file under `tests/` that reads the doc and fails before the edit (`tests/tools/doc-token-example.test.ts`).

## What a reviewer will check

That the tests were run and by whom, that what is deployed is what the seed builds, and that the
record says what was not tried. On 2026-10-10 a session submitted three fixes with "not run: no
notebook runtime" and a module edited by hand after compiling; both were caught in review.
