<!-- A page of `agents/implementer.md`: step 10: `land.sh` and each of its exits, the landing by hand, the landing with a deploy, the day's backup of the notebook in `lopebooks`, a change to `cloud-brain-dev`.
Read it when your landing has a deploy, changes the submodule `cloud-brain-dev`, or `land.sh` exits with anything but 0.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
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
    whose count is from your run before this (step 6), and with no `| tail` in it (the exit read is then `tail`'s).
    The header of the script has each step and each exit.
    - **Exit 0**: landed and submitted. Its lines go in your report: the first has when the lock was taken, the
      second the commits, the third ends `seq=`, the seq of the submit that step 13 waits from, the fourth has
      when the lock was released, and the fifth is the docs step's. Go to step 13.
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
    No build, apply or `lopebooks` commit. With a deploy, the apply, then the build and their commits come
    between the rebase and that renew. Each line, and what comes between, in order:
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
    - **With a deploy**, first `LOCK_TOKEN=<token> lock.sh renew land <id>`. The renew gives
      600 s from now and says the lock is still yours. Exit 1 is a stop before anything is deployed and before
      anything of the main checkout is written to: your 600 s ended and another writer has the lock, or has had
      it. No apply and no build there; report.
      Exit 0 with the line `renewed after it had ended … nobody held it between` is
      yours: go on. Exit 2: cb4 was not reached; ask again, and do not go on until it answers 0.
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
    - **The notebook, built from committed seeds, once the apply has answered.** Since
      `backup-committed-before-apply-answers` (2026-10-13) this comes after the deploy and not before it: after
      the apply answered `verified`, or after your `confirm` of a version on `probation`. An apply that is
      refused, answers `failing` or is put back: no build into `lopebooks` and no backup, whatever you do next
      (mend and apply again, or release both locks and report). Read `git -C <root>/lopebooks log origin/main..HEAD`
      then: it prints nothing. When it prints a backup (`cloud-brain: the notebook of …`),
      `$W/tools/cloud-brain/notebook-backup.sh --take-back` undoes it, never a `git reset` of yours there: it
      prints `took back <sha>` or `nothing to take back`. Until that day the backup was made before the apply,
      and on 2026-10-13 at 00:03:05 CEST an apply of `tr-1-wait-in-the-record` was put back after it: the main
      checkout's `lopebooks` held a commit, never pushed, of a build no Worker ran, and the writer undid it by
      hand (`tools/cloud-brain/records/backup-committed-before-apply-answers.md`).
      First `LOCK_TOKEN=<token> lock.sh renew land <id>` once more: the apply, and a `verify-run.ts` before a
      `confirm`, may have taken most of the 600 s. Exit 1: another writer has the lock, so no build and no
      backup; report what you deployed. Exit 2: ask again.
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
      A backup commit of the tool's that was never pushed is taken back by this run first, with
      `took back <sha>` on stderr, and the one line is then of the commit before it.
      The notebook of a change is the build of its `lopecode-dev` commit (`build.ts --out`, the same bytes),
      so nothing waits on the backup.
      That file, and its commit in `lopebooks` once a day, is all a landing writes in the main checkout: one
      file, written whole from committed seeds by the lock's holder.
      Never `build.ts` in the main checkout: another session may have seeds open there, uncommitted
      and with no lock, and that build writes them into the notebook (six such files
      on 2026-10-10 23:29; one writer built them in and had to undo it).
      The tests are not run again: the seeds are the ones you tested.
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
      A line `summaries due (cb4): …` may follow it, from `land.sh` as well, which prints the release's lines: long docs wait for a summarizer. Run the command the line gives as a background command, read its last line, and name in your report the `at` of its first line in `<root>/tools/cloud-brain/.emitted/docs/journal.jsonl` (the canary's; the orchestrator writes the cost from the lines after it). A last line with `"picked":0` started no agent and wrote none.
      Exit 1 names another holder: your lock ended while you worked and another writer took it.
      Stop there, push nothing more, and report what was pushed and what was not. Exit 2: cb4 was
      not reached; run the release again. A lock that is never released ends at its time.
    - After a deploy, with the lock gone: `cd $W/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>`.
      Its last line is the count of what now runs, `<worker> <module> <hash>: N passed, N failed, N need a browser`:
      the hash is the first 12 characters of the one you deployed, and `failed` is 0. (The JSON report is the file
      the `report:` line above it names, since `test-ts-output-floods-the-reader`, 2026-10-13.)
      Put the line's counts in your comment. A `failed` here is a deployed defect: say so on the issue first.
      No such line: `sync.ts` printed `left out: <worker> …` (another deploy of it is under way); run both again.
    - **The worktree stays.** You do not remove it: the next task of the topic, or your own next round, is
      written in it, and the orchestrator removes it when the topic is done (`SKILL.md`, step 1). Leave it with
      nothing unlanded: the line of `$W/tools/cloud-brain/worktree.sh --list` that begins `<tree> ` reads `clean`
      and `ahead=0`. What else it reads goes in your report. (Until `wt-3-land-by-push` the writer removed its
      worktree here, with its branch.)
      If you stop for any reason while holding the lock, release it first (`LOCK_TOKEN=<token> lock.sh release`, with your id) and say so in your report.
