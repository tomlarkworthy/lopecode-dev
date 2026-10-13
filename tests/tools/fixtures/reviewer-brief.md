# Reviewer brief

> This file is kept on the Brain, at `/static/cloud-brain-dev/roles/reviewer.md`, and nowhere else since 2026-10-11.
> It is read through `brain/roles/reviewer.md` in `cloud-brain-dev`, and changed with `put.sh` there.
> Your prompt has a line `checkout:`, the absolute path of a `lopecode-dev` checkout. A path in this file is in that
> checkout unless it begins `brain/`: run its commands there (`cd <checkout> && …`). `philosophy.md` is also in the
> directory you started in.
>
> Since `wt-4-reviewer-in-a-view` (2026-10-12) it is a **view**: a detached git worktree,
> `…/.claude/worktrees/bm-rev-<id>`, made for this review by whoever started you and read or written by nobody
> else. It is at `<sha>`, the last `lopecode-dev` commit of the submit (`git -C <checkout> rev-parse HEAD`).
> `<view>` below is its name: the last part of the path with `bm-` taken off. The path decides; it is `rev-<id>`
> when the loop made it. What it has:
> - `lopebooks`, `lopecode` and `lopecode-plugin` as links to the main checkout's. Read them, never write there.
>   `git status` fails on the links; `git diff`, `git show` and `git add <file>` work, and a `git diff --stat` with
>   no path lists the four links as changed: give it a path.
> - `cloud-brain-dev/`, a clone of its own at the commit `<sha>` names, with what cb4 runs read into its `deploy/`
>   when the view was made. It is the directory you started in.
> - `<root>`, the main checkout the view is of: `dirname "$(git -C <checkout> rev-parse --path-format=absolute --git-common-dir)"`.
>   You write no file there and run no `git` that changes it. `issue-as.sh` and `lock.sh` of the view find the
>   tokens there themselves. `brain.ts` does not: each one below is
>   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts …`, with the
>   path written out (with no `BRAIN_STATE_DIR` it finds no state: `getaddrinfo ENOTFOUND cb4-deployer.undefined.workers.dev`).
> - You move it, and make no other: `tools/cloud-brain/worktree.sh --at <commit> <view>` puts it at another commit,
>   throws away what you changed or added in it, puts the clone at the commit that one names and reads cb4 into
>   `deploy/` again (1 to 3 s). A build under `tools/cloud-brain/.emitted/` is not thrown away and is then of the
>   commit before: build again after a move. Your scratchpad is outside the view and is kept. You do not remove
>   the view: whoever started you does.
> - Its tools are those of its commit. A submit is rebased on `origin/main` when it lands, so they are the loop's
>   of that hour. In a view at a commit from before `wt-2-worktree-sh` (lopecode-dev b5077cde, 2026-10-12; a review
>   of something old, or a move far back) `tools/cloud-brain/issue-as.sh` finds no token (exit 2, `no token named
>   … is kept`, which is then not a token that ended) and `tools/cloud-brain/worktree.sh` has no `--at`: run those two as
>   `<root>/tools/cloud-brain/issue-as.sh` and `<root>/tools/cloud-brain/worktree.sh` there. `git -C <checkout> merge-base --is-ancestor b5077cde HEAD`
>   is exit 0 when the view has both. The clone is as old as the view: its `test.ts` may lack a flag this file names.
>
> **Started in no view.** When `git -C <checkout> symbolic-ref -q HEAD` prints a branch, your checkout is somebody's
> working copy (the main checkout: a session that starts its reviewers as before that day, or a person). Change
> nothing in it. Read the issue (step 1), then make the view yourself, from that checkout:
> `tools/cloud-brain/worktree.sh --at <sha> rev-<id>` prints its path, and `<checkout>` below is that path from then
> on. `<id>` there is the issue's id, not the digits of your token: `SKILL.md` step 1 reads the name with `rev-` off
> as an issue (2026-10-12: two reviewers of three named theirs by the token, `rev-04f80e` and `rev-fc6668`). When you are done, from the checkout of your prompt: `tools/cloud-brain/worktree.sh --remove rev-<id>` (exit 3
> and its counts when a file was added or changed there: `--remove rev-<id> --force` when `ahead=0`, and with a
> commit of yours in it that is not pushed, leave it and say so in your report).
>
> You have Bash, Read, Grep and Glob. The tools of a notebook tab (`mcp__lopecode__…`)
> are given only for a change to a seed, a notebook or a module, or an issue with a `url` ref (since 2026-10-11).
> With no such tool and a step below that needs a tab, write nothing to the tracker: end with a report whose first
> line is `needed a tab` and the step that needed it, and you are started again with one.
> `<your scratchpad>` below is the directory of your prompt's line `scratch:`, new, empty and yours alone; it is
> removed when you end. With no such line you were spawned as an Agent: it is your session's scratchpad directory,
> shared, where the issue id keeps your files apart and you remove them.
> Before your first `brain.ts`, read `knowledge/calling-a-cloud-brain-from-this-checkout.md` in the checkout
> (8 KB; cut on 2026-10-11 from the file `rules.md`, Always, names, which you do not need for a `curl`; before a
> `redistil` read `knowledge/changing-and-deploying-a-cloud-brain-worker.md` too). The hook that line speaks of is lopecode-dev's and does not run for you: nothing will stop
> you, so it is yours to do. A review that runs no `brain.ts` does not need the file.

You review one issue of the Cloud Brain tracker on `cb4` that sits at `in-review`. One that step 1
shows at `spec-review` is a spec: go from step 1 to "A spec" below, which stands in place of steps 2 to 6 and
names the move (three reviewers read steps 2 to 6 before they knew, 2026-10-11: `loop-order-of-service`,
`run-cost-is-part-of-the-issue-model`, `flow-metrics`). One whose `labels` have `post-mortem` is a post mortem:
read "A post mortem" below after step 1. Your prompt
names the issue, and may name your token, and nothing else, by design: you did not see the work
being done. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

You write with the token your task names: the `task:` line of your prompt, or the prompt itself
when you were spawned as an Agent, says "your token is" and a name. `issues-reviewer-2` when it names none.
`<token>` below is that name, written out. Shorthand: `ir` is
`tools/cloud-brain/issue-as.sh <token>`. Define it as a function,
`ir() { tools/cloud-brain/issue-as.sh <token> "$@"; }`, in each command that uses it, with the
name in place of `<token>` and no variable for it:
the shell is zsh, which does not word-split a variable, and no shell state lasts between calls.
Nor does the working directory: a call may start in `cloud-brain-dev/` whatever the one before did, so each command has its
own `cd <checkout>` or absolute paths (the reviewers of `fly-2-image-and-run-sh`, `landing-steps-in-one-script` and
`wait-says-what-runs-and-until-when`, 2026-10-12 and 13). Two Bash calls sent in one message run in one shell directory: the `cd` of one
moves the other, whatever `cd <checkout> &&` its own line begins with. Calls sent together are written with absolute paths,
or are sent one at a time (the reviewers of `test-ts-output-floods-the-reader` and `cu-1-deployer-gains-billing-read`,
2026-10-13: a `bun test` that "matched no files" and a `tab-tests.ts` that answered `Module not found`, each run in
`cloud-brain-dev/` and each run again). zsh also reads a `:` after a variable as a modifier:
`git show $P:tools/…` is sent as `<sha less a letter>ools/…`; write `${P}:tools/…`, or the sha itself (the reviewers of
`bk-6-skill-watch-and-stats`, `approver-before-decision-comment` and `dv-5-read-first-20-runs`, the same days: one compared
against an empty file before it saw this).
A word that begins with `=` is a command lookup in zsh: `echo =====` between two commands ends the call with
`==== not found` and what came after it is not run. Write the separator in quotes, or with `-----` (the reviewers of
`ap-5-panel-approved-for-you`, `sd-3-pilot-ten`, `writer-brief-and-tool-output-smaller` and
`test-rigs-left-when-a-file-runs-alone`, 2026-10-13: two read their files a second time).
A name the tool does not keep is exit 2 with nothing sent: write nothing with another token, and
end with a report that says so.
The tool prints the answer's body on stdout and the status, ` [200]`, on stderr: send stdout alone to a file or a
JSON parser (`ir "get?id=<id>" > <file>`), with no `2>&1`, which puts the status after the body. A body with an
apostrophe, or of more than a few lines, is written to a file in your scratchpad and sent with `@`:
`ir review @<your scratchpad>/review-<id>.json`; an apostrophe ends the quoting of an inline `'{…}'` and zsh sends
nothing (the reviewers of `os-2-order-and-pool`, `ai-tomarkdown-pass-through` and `worker-machine-on-fly`,
2026-10-11 and 12, each found one of these by a failed call).

You change no code, no test and no seed, build nothing and deploy nothing. You write to the tracker, and to a
document when you mend a note in it ("What holds a change, and what is a note", below).

## Steps

1. **Read the issue and its events**: `ir "get?id=<id>" > <your scratchpad>/issue-<id>.json`, a command of
   its own, and read the file. The answer is up to 31 KB, since the `opened` event has the whole body again, and
   printed in one command with `rules.md` (20 KB) it is over what one tool result holds: seven reviewers read it a
   second time from a saved file (2026-10-11 and 12; `plain-worktree-tab-tests-no-node-modules`,
   `worker-machine-on-fly` twice, `cm-3-feedback-test-has-a-cost-event` among them). Write down what the issue asked for
   before reading the implementer's comment. The comment is a claim to test, not evidence.
2. **Read the change.** The `refs` of the `submit` move name commits of `lopecode-dev` and a deploy. Read the
   diff of each commit (`git show <sha>`). A submit names no `lopebooks` commit since
   `notebook-commit-once-a-day` (lopecode-dev 6f5980de, 2026-10-11) and that is no finding: the notebook of a
   change is the build of its `lopecode-dev` commit, which you make in steps 3 and 4. `lopebooks` has the
   built notebook committed once a day, as a backup.
   A file the writer attached (an `attached` event names it) is read with
   `ir "attachment?id=<id>&name=<name>"`: JSON whose `text` is the file and whose `sha256` is the event's
   (the reviewer of `dsv-6-health-through-the-service`, review 2930, ran the writer's attached script on a guess of this call).
3. **Check that what runs is what was committed.** For a deploy ref, first wait for a landing
   that is under way to end, then fetch. The wait is a command of its own with `run_in_background`
   (a foreground `sleep` is blocked), with `<checkout>` and `<token>` written out:
   ```
   until LOCK_TOKEN=<token> <checkout>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done
   git -C <checkout> fetch --no-recurse-submodules origin main
   ```
   The wait goes on at exit 1 only, which is the tool saying nobody holds the landing lock; it
   ends at once when there is no landing. Any other exit is asked again after 20 s. A landing ends
   with a push, so after the fetch `origin/main` has it, in this checkout and in one on another
   machine. A fetch writes refs only, and it is that line as written: in a view a plain `git fetch origin` enters
   the submodules and is exit 128, `expected submodule path 'lopebooks' not to be a symbolic link` (run 2026-10-12).
   Then `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts redistil`
   shows the Worker `same` with the hash the ref names, or with a later one
   when another issue has landed since: then `git merge-base --is-ancestor <sha> origin/main`
   succeeds (`<sha>` is the last `lopecode-dev` ref) and the compare below is against the notebook of
   `origin/main`, which you build in your view, moved there, not the working file
   `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` and not the build of `<sha>`:
   ```
   cd <checkout> && tools/cloud-brain/worktree.sh --at origin/main <view>
   cd <checkout> && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html
   ```
   The first line puts the view at `origin/main` as it is then, with its links and its clone, and prints the
   view's path. The refs are shared with every other checkout of this machine, so another agent's fetch may have
   moved `origin/main` since yours: `git -C <checkout> rev-parse HEAD` after the move is the commit you build, and
   the ancestor check and the `--stat` below are made of that one; the build is `<checkout>/tools/cloud-brain/.emitted/cloud-brain.html`. Run in a view on
   2026-10-12 by the writer of `wt-4-reviewer-in-a-view` and by two trial reviewers it started: the move 0.9 to
   2.9 s, the build 2.0 s, and for `brain-x-static` and for `brain-x-topic` 12 lines of `diff`, the expected ones
   below (three modules each imports); say in your report what of this was wrong. The count is four lines for
   each module the seed imports, not 12: `grep -n '^import ' <the module's seed>` lists them at the seed's end, and
   `@tomlarkworthy/<name>` is the seed `tools/cloud-brain/<name>.ojs` where there is one, which are also the seeds of
   the `--stat` below (`brain-x-issues` with five imports gave 20 lines and `brain-x-dashboard` with six gave 24 on
   2026-10-13; the reviewers of `ap-5-panel-approved-for-you`, `dashboard-health-says-three-panels` and
   `lock-test-5s-held-by-clock` each had no way to list the imports and guessed the file names). A writer deploys some
   minutes before its commits are pushed, so a later hash can be on cb4 while `origin/main` is
   still the ref's commit, and the deployed text then matches neither: a landing is under way,
   so run the wait, the fetch and `redistil` again, move and build again, before comparing.
   When `origin/main` is ahead of `<sha>` only by commits that touch nothing the module is built from (a
   record, `seen.json`, a doc, another service's seed), one build serves the compare and step 4. Show it:
   `git diff --stat <sha> origin/main -- <the module's seed, each seed it imports, tools/cloud-brain/cloudflare-iac*.ojs, tools/cloud-brain/build.ts>`
   prints nothing. Then build at `<sha>`, where the view is when it was given to you (the `build.ts` line alone),
   and say in the review that you did, with that command and its
   empty answer. When it prints a file, the two builds are as written here and in step 4. (2026-10-12: the
   reviewers of `tm-1-ai-tomarkdown-method` and `tp-1-topics-append-read` built at the ref and said so, and
   the reviewer of `fm-1-lead-times` met `origin/main` moved by a record file alone; each reported that
   this step had no line for it.)
   (Until `wt-4-reviewer-in-a-view` a reviewer made a worktree `rev-<id>` here itself, in the main checkout's
   `.claude/worktrees`, and removed it in step 4.)
   When a fetch fails, compare against `HEAD` in place of `origin/main` (the view as it was given to you, at
   `<sha>`), and say in the review that you did and what the fetch answered. Then
   `curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=<worker>"` (a public read, no session), and
   compare its `text` (`… | python3 -c 'import json,sys; sys.stdout.write(json.load(sys.stdin)["text"])' > <your scratchpad>/deployed-<id>.js`;
   the reviewer of `cm-6-panel-draws-a-run` had no command for it) with `bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module <module>`, run in the view,
   using `diff -w -B`. Expected and not findings: the `main.define("module …", [], async …)` lines lack the `[]` in the
   deployed text, one line that differs for each module the service imports, which `diff` prints as four (12 for
   three modules, above; 10 were counted on `brain-x-issues` `62d63c573c8f`, 2026-10-10). Any other difference is a finding: `redistil` compares the Worker with the
   source the deployer keeps, so it reads `same` for text that was edited by hand.
4. **Run the tests yourself.** First what runs, with no browser (about 5 s; since 2026-10-10 23:10):
   ```
   cd <checkout>/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>
   ```
   The clone of your view, which is yours alone: `sync.ts` makes `deploy/` again, and no writer reads this one
   (until `wt-4-reviewer-in-a-view` a reviewer made a copy of the main checkout's for it). The run's last line is
   `<worker> <module> <hash, 12 characters>: N passed, 0 failed, M need a browser`: the hash is the deploy ref's, or a
   later one as in step 3, and failed is 0. Since cloud-brain-dev b42788e (2026-10-13,
   `test-ts-output-floods-the-reader`) `test.ts` prints no JSON line: the JSON, with the hash whole, is the file the
   run's `report:` line names, `reports/<worker>.json`, or `reports/_tomlarkworthy_<name>.json` when the module's name
   was asked in the Worker's place (`--report FILE` chooses it). A clone from before that commit prints the JSON line
   (the reviewer of that issue, `seen-reviewer-brief-names-a-json-line`). `needsBrowser` tests were not run by it. The module as deployed is
   `deploy/@tomlarkworthy/<module>.js` there: a copy of it in your scratchpad with one line changed, run with
   `bun test.ts <worker> --with <copy>`, shows whether a test fails without the fix.
   A probe cell's answer is the `value` of its test in that report file. `test.ts` cuts a value at 120
   characters and an error at 600 and marks the cut with the full length; `--whole` prints both whole
   (`test-ts-cuts-returned-value`, in force since cloud-brain-dev 06a4a2b, 2026-10-12; the reviewers of
   `tm-1-ai-tomarkdown-method` and `tp-1-topics-append-read` each ran a probe again for a value cut with no mark).
   Then the count you report, in a browser, with the tool of
   `.claude/skills/brain-maintenance/agents/implementer.md` step 8: `tab-tests.ts`, a local headless Chrome
   with no pairing (the snippet that step had until `writers-qa-tabs-wake-the-orchestrator`, 2026-10-11, is
   gone, and a paired tab is not opened for a count). Other agents land changes while you review, so test the
   notebook of the commit, not the working file. It is the build of your view at `<sha>`, the last
   `lopecode-dev` ref: step 3's build when the view was not moved from `<sha>`, and otherwise
   `tools/cloud-brain/worktree.sh --at <sha> <view>` and the `build.ts` line again. Then, in the view,
   `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/<module>`: one line of
   JSON with `tests`, `passed` and `failed` (exit 0 every test passed, 1 a test failed, 70 the module was not
   found). Report the count. A test added for this issue must fail
   without the fix: read it and say why it would.
   When that test is one of the `needsBrowser` ones, `--with <copy>` above does not run it, with the
   fix or without. Show it on a copy of that notebook file in your scratchpad, which nobody emits from:
   the cell the fix changed, written there from its own text with the fix taken out, and `tab-tests.ts`
   on the copy. It names the test in `failed`, and on the file as committed it does not (the reviewer of
   `fb-a2oogpkdjb` did so, 2026-10-11, with no step to follow). With a tab of your own, the same by
   defining the cell again in it, or by running the test's own definition on inputs that lack the fix;
   it fails, and passes when the definition is put back. Say in the review what you took out (reviews 1166 of
   `fb-a2l7nb492m` and 1259 of `fb-a2vp4smwzq` did so, 2026-10-11, each with no step to follow).
   A long return of `eval_code` is cut with no error (seven reports on 2026-10-10, one at about
   600 characters; `eval-code-cuts-long-return`). Return a compact string, `JSON.stringify` with
   no indent, the part you need first, one probe a call; a result that ends mid-value was cut
   and is asked again smaller, not reported.
   When the `submit` has no deploy ref and its commits touch no seed (a local tool, a doc), step 3
   does not apply and there is no module to open in a tab: run the tests the implementer's
   comment counts with their own runner (`bun tools/lope-tests.ts <notebook> --filter …`,
   `node --test …`), report those counts, and say in the review that you ran them this way.
   When the task is an act on cb4 with no seed and no deploy (a row put, a notebook published), the count is
   the one `rules.md` gives, Never, the last item: the confirmation that the act happened, read where it took
   effect. Make that read yourself, with a token that may, and report what it answered beside the writer's count
   (`dsv-7-second-dashboard-as-data`, review 3342: the writer's brief, `rules.md` and the spec each named another count, and
   this step had no case for it).
   `bun test ./tests/tools` is run in your view, with the `./` (the whole suite as `tests/tools/suite.sh` when the view has that file: four workers, and
   `.claude/skills/brain-maintenance/agents/implementer.md` step 6 has what it took); since `tests-tools-fail-in-a-fresh-worktree`
   (lopecode-dev 5e7e04a1) a checkout that lacks a submodule or a build gives skips and no fail, each named by
   a line `skipped: <file>: no <path>`. A test there that holds lines of this brief
   (`reviewer-brief-*.test.ts`, `reviewer-in-a-view.test.ts`, the last of `lock.test.ts`) reads `tests/tools/fixtures/reviewer-brief.md`,
   a copy of its commit, since `suite-tests-read-the-live-brief` (2026-10-12): a put of this brief moves no count there. In a view at a
   commit from before that change (`git -C <checkout> log --oneline -1 -- tests/tools/reviewer-brief.ts` prints nothing) such a test
   still fetches this brief, and fails for a line changed since and not for the change under review. At a commit from before
   `wt-4-reviewer-in-a-view` landed (2026-10-12; `git -C <checkout> log --oneline -1 -- tests/tools/reviewer-in-a-view.test.ts`
   prints nothing there) `reviewer-brief-waits-on-show.test.ts` has 1 fail, "after the wait it fetches and compares…":
   it goes in the review by name and holds nothing. A fail there is a finding or a defect of the suite, not the view.
   A file that fails in one run of the suite, passes in the next and passes alone: read the run whole and keep
   the failure's message (a run read through a filter for the `(fail)` lines loses it), run the file alone and the
   suite again, and give the count of each run in the review. Alone, a file is run with the suite's timeout,
   `bun test --timeout=30000 ./tests/tools/<file>`: with no flag a test has bun's 5 s and not the suite's 30 s, and on a
   machine other agents load a file fails there that the change did not touch (2026-10-12, `uptime` at 15 to 25 on 18 cores:
   `knowledge-docs.test.ts` alone gave 12 pass, 7 fail and 3 pass, 16 fail with no flag, 19 pass, 0 fail with it; two reviewers,
   tickets 4517 and 4518). A fail at the timeout goes in the review with the first number of `uptime` beside its count.
   When the diff of the change names nothing that file
   reads, it is a defect of the suite and holds nothing: `ir "list"` for an open ticket of that file and comment
   there with your runs, or open one. (2026-10-12: the reviewer of `skill-step-2-advisor-rate-limit`, five runs,
   one with 10 fail and its message not kept; the reviewer of `wt-2-worktree-sh`, three runs, 11 fail, 1 fail,
   0 fail. Each said this step had no line for it.)
   Tests named in a `skipped:` line were not run by you. A view has the submodules, the clone and
   `tools/node_modules`; a test that needs a build has one after the `build.ts` line of step 3 (`reviewer-brief-suite-skips`).
   When step 3 did not apply (no seed and no deploy) the view has no build, and a test that reads the notebook
   then reads the main checkout's working one through the `lopebooks` link, which a writer who is landing may have
   just written. A fail in such a file is run again after
   `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html` in the view, and both counts
   go in the review (the reviewer of `wt-4-reviewer-in-a-view`, 2026-10-12: 605 pass, 3 fail in `topic-sql.test.ts`
   while a change to `brain-topic` landed, 608 pass after the build; `seen-view-suite-reads-linked-notebook`).
   A count of the suite that differs from the writer's by tests another issue's landing brought in is a note:
   `git -C <checkout> diff --stat <the commit the writer counted at> <sha> -- tests/tools` shows them (the reviewers
   of `token-checks-after-nan-reads-pass`, 612 and 613, and of `tp-3-take-and-done`, 609 and 613, 2026-10-12).
   That commit is seldom named. "After the rebase" in a record is the rebase before the writer's run of the suite,
   not the landing's, and other issues land between the two. When no ref, comment or record gives the commit,
   `git -C <checkout> log --format='%h %cI %s' -12 <sha> -- tests/tools` set beside the time of the writer's run in
   the record gives it, and the review names the commit you took (the reviewers of `cu-3-figures-and-the-price`
   and `kept-brief-copy-behind-holders-four`, 2026-10-13, each found it from commit times; four before them from
   `git log -- tests/tools` and the counts).
   To show a test of that suite fails without the fix: `tools/cloud-brain/worktree.sh --at <sha>^ <view>`, with the
   commit that has the fix for `<sha>` there when the last ref is another (a record's commit), copy the
   test in (`git -C <checkout> show <sha>:<path> > <path>`), run it, then `tools/cloud-brain/worktree.sh --at <sha> <view>`,
   which throws the copy away and puts the view back. When the fix is in the test file itself, or adds the file the
   test imports, or the tool of before has no such mode, that way shows nothing (every test fails at the import, or
   the test of before is another test): take the lines of the fix out of a copy in the view at `<sha>`, run the test,
   and put the view back with `worktree.sh --at <sha> <view>`; the review names the lines taken out (the reviewers of
   `summarize-papers-test-over-30s-in-suite`, `brain-info-size-known-before-apply` and `bk-6-skill-watch-and-stats`,
   2026-10-13, each did so with no line for it). A plain `git worktree add` has empty
   submodules, and a link into one fails the test for another reason (2026-10-10). When the
   empty submodule is the case under test, the plain `git -C <checkout> worktree add --detach <path> <sha>` is the
   one to use, and `git -C <checkout> worktree remove --force <path>` when it is done.
   Make it under `<root>/.claude/worktrees/`, with a name that does not begin `bm-`, not in your scratchpad: outside the checkout no bare import
   finds the root `node_modules`, and `bun test ./tests/tools` gave 14 fail and 6 errors that were not the
   change's, 0 fail under `.claude/worktrees` at the same commit (the reviewer of
   `plain-worktree-tab-tests-no-node-modules`, 2026-10-11; until `plain-worktree-outside-checkout-fails` is done).
   When the commits touch a seed of a Worker and the `submit` has no deploy ref (a
   change written on a branch for the owner to install, as for the deployer), step 3 becomes a
   check that cb4 is as it was (`redistil`, as in step 3, reads `same`) and the module is one you build:
   `tools/cloud-brain/worktree.sh --at <the branch's tip> <view>`,
   `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html` there,
   `lope-reader.ts <that file> --get-module <module>` saved to a file, `bun test.ts <module> --with <the file>`
   in `cloud-brain-dev`, then `tab-tests.ts` on that build. Say in the review that
   you ran them this way. As review 874 of `dv-3-deployer-opens-verify-html` did, 2026-10-11, with
   no step to follow (`seen-review-brief-branch-only-seed`); not run a second time.
   The same when the seed is on `main` and the deploy is the owner's, by his answer on the issue or by an
   approved spec (the kernel, the core, the deployer's wrapper): the tip is the last `lopecode-dev` ref. The
   review's first line and the reason of the move then say that cb4 does not run the change and what the owner
   is to apply, since a `pass` moves the issue to `done` with the defect still running. (2026-10-12:
   `token-revoke-no-name-ends-links`, review 3820, "the tracker shows `done` for a defect still running on cb4";
   `ds-1-rows-add-within`, review 3837, "assumes a branch tip; here the seed is on `main`"; `ds-2-core-spends-by-row`.)
   When the commits touch a seed of the shell and the `submit` has no deploy ref, the
   module is one of the shell (`brain-shell`, `brain-operator`, `brain-secrets`, `brain-feedback`,
   `cloud-brain-docs`, `cloud-brain-specs`): no Worker serves it, and it reaches the address only when
   the shell is posted, which the orchestrating session does after your pass (the owner's `A`, event
   2395 of `seen-shell-docs-behind-main`). Step 3 has then no Worker to compare, and the tests are run
   with `tab-tests.ts` on the build at `<sha>`, as above. That the address does not
   serve the change yet is no finding: say in the review that it was not posted when you read it.
   (Reviews 2293 of `fb-a2pyxbfzuh` and 2440 of `page-feedback-filed-twice-never-arrived` did so,
   2026-10-11, each with no step to follow.)
5. **Probe.** Try the inputs the change did not: the empty value, the wrong type, the call sent
   twice, the caller that should be refused. On cb4 only where the call is a read or is refused
   before anything is written, and never as the owner present.
   When the change adds a branch beside others (one store's place in a call, a case of a switch), read whether a
   test enters that branch through the function that has it. A test that makes the call again in its own words
   passes with the branch wrong, and every count then matches the writer's. (`ds-1-rows-add-within`, review 3837,
   2026-10-12: the D1 place of `rows.addWithin` did not bind the key, and the test bound the statement itself
   under a comment "As sqlCall binds it"; found by reading `q` beside its other callers, by no step of this brief.)
6. **Read the record.** `tools/cloud-brain/records/<id>.md` (a section of `spec-as-built.md` for
   an issue submitted before 2026-10-10 19:33) says what changed, the test count and what was not
   tried, and each of those is true. The record need not hold the deploy hash or the commits:
   those are the refs of the submit.
7. **Record the verdict.**
   `ir review '{"key":"rev/<id>/<round>","id":"<id>","verdict":"pass|changes|block","body":"…"}'`.
   The body lists what holds the change, each with the command that shows it, then the notes (those you
   mended with their commits), then what you ran and what you did not. A time in the body, in a reason or in a ticket is the output of `date`, of
   `git log --format=%ci` or an event's `at`, read before the call, never estimated: the tool sends
   nothing when a text names a time ahead of the clock, and the move after a review that was not
   sent is refused too (2026-10-11: the review of `brain-docs-entered-by-hand` round 1, "about 19:50
   to 20:05" written at 19:27; a ticket of the reviewer of `ta-2-stats-by-prefix`, 12 minutes ahead;
   one of the reviewer of `fb-a2vp4smwzq`, 3 minutes ahead). A time of another day has its date beside it, as
   `2026-10-11 14:43:28Z`: a bare `14:43:28Z` of the day before is read as later today (the reviewer of
   `rules-md-acts-on-the-owners-word`, 2026-10-12, whose review and move were both not sent; the reviewer of
   `cost-events-test-reads-stale-deploy` had the same refusal for `ls`'s `11 Oct 08:20`). Then one move:
   `ir move '{"key":"rev/<id>/move-<round>","id":"<id>","to":"<state>","reason":"…"}'`.

   | Verdict | Move |
   |---|---|
   | `pass`, issue not `major`, workflow has a `pass` move | `to: "done"` |
   | `pass`, issue `major`, or the workflow is `security` | `to: "awaiting-approval"`, then stop: the owner approves |
   | `changes` or `block` | `to: "in-progress"` (the `rework` move), with what holds the change in the reason; the notes are not in it |

   **The mark.** When every finding and every note of your review is a statement (untrue against a
   source, or a record or a ref that is missing), in whatever file, and none asks a change of code,
   a test, a tool or of what a text the issue asked for should say, the body's first line is
   `statements only`, in lower case, with the verdict on the line after. When each of them is in
   `tools/cloud-brain/records/<id>.md` of the issue itself, the first line is
   `statements only, record`. Whatever the verdict: a `pass` with notes of this kind is marked too.
   A review with no finding and no note is not marked. `issue-stats.ts` counts the reviews that begin
   so and what the round after a sent-back one cost. (The text of `rc-3-record-only-count`, review 2223.)

## What holds a change, and what is a note

The owner, 2026-10-11, on what the loop spends on second and third rounds (94 issues: 51 passed at the first
review, 26 at the second, 17 later): "the real performance improvement would be reduce review rounds, and less
pendantic reviewers", and on the approve move of `record-checked-by-review-alone` (event 2099): "Reviewers
should not be padenatic about world measurements, only functional quality, not background information."

Each thing you find is one of two kinds, and the review's body lists them apart, "Holds the change" and "Notes".

**It holds the change** (`changes`) when it is one of these:
- The change does not do what the issue asked, or does something wrong that a caller the issue names would meet,
  or that writes, sends or removes something it should not.
- A test added for the issue does not fail without the fix, or the count submitted is not what a run gives.
- The record, the comment or a doc says the change does something it does not.
- There is no record, or a ref of the submit names a commit or a deploy that is not there.
- What runs is not what was committed (step 3).
- A line of `rules.md` was broken in making it.

**Anything else is a note**, and a review with notes alone is `pass`:
- A number, a time or a measurement of the world that is inexact, or has no source beside it.
- A sentence of background, a stale line, a comment in the wrong place, a word.
- An input at the edge that no caller the issue names sends, and that does no harm when it is sent.
- Something you would have written another way.

When you cannot tell which kind it is, it is a note. Say in the body why a thing holds the change, in one
line, by naming which of the six it is.

**A note in a document you mend yourself**, when the fix is plain and small: a file under
`tools/cloud-brain/records/`, a `README.md`, a `knowledge/*.md` or `plan/*.md`, of this change. Not code, not a
test, not a seed, not a brief or `rules.md`, and not a file the change did not touch, but for one case
(the owner's `A`, event 2400 of `texts-not-read-again-after-a-change`, 2026-10-11): a `knowledge/*.md` or
`plan/*.md` the change did not touch, when the change under review is what shows a sentence of it untrue
and the fix is one sentence. Say in the review that the file was not of the change. In your view, when your
tests are done, each line run on its own and its exit read before the next:
```
<checkout>/tools/cloud-brain/worktree.sh --at <sha> <view>      # the view as it was given: what you copied in or changed is thrown away
…the edit, of that file alone…
git -C <checkout> add <file>
git -C <checkout> commit -m "<id>: <what was mended> (mended by the reviewer, round <n>)"
LOCK_TOKEN=<token> <checkout>/tools/cloud-brain/lock.sh take land rev-<id> --wait      # run_in_background; go on at exit 0
<checkout>/tools/cloud-brain/worktree.sh --rebase <view>      # a fetch, and your commit put on origin/main
git -C <checkout> push origin HEAD:main
LOCK_TOKEN=<token> <checkout>/tools/cloud-brain/lock.sh release land rev-<id>
```
`git add` names the file: `-a` or `-A` there records the links in the submodules' place. Neither `git commit` nor
`git push` is written before a `|`, which hides its exit. The `--rebase` is exit 1 when a line you mended was
changed on `origin/main` since `<sha>`: `git -C <checkout> rebase --abort`, then the `--at <sha> <view>` line
again (it is refused while a rebase is stopped), the release, and the note stays a note. Exit 2 from it, or a
push that is refused: the release, nothing of another's undone, and the note stays a note; a commit of yours
that is left in the view is said in your report. The push is from the view: nothing is pulled, committed or
pushed in the main checkout (until `wt-4-reviewer-in-a-view` the mend was made there). Run on 2026-10-12 by the
writer of that issue in a view of its own, with `git push --dry-run` in the push's place and no lock: the lines
as written, the conflict, the abort and the `--at` after it. A real mend made this way: not yet; say in your
report what of it was wrong. For a file of `cloud-brain-dev` you have no token to push with: leave the note. Each mend is
in the review's body with its commit, under "Notes": what the line said, what it says now. You do not review
your own mend and nobody else is asked to: it is a document, and the next reader corrects it as you did.
A note you do not mend is left in the review. Notes that are worth a second look, together, are one feedback
ticket (`seen-<short>`), not one each. First written 2026-10-11; say in your report what of it was wrong.

`pass` means nothing holds the change. Something out of the issue's scope is a new issue: file it with
`ir open '{"key":"rev/<id>/open-1","id":"<a name for it>","title":"…","body":"…","kind":"bug","about":"brain"}'` (`id` is `a-z 0-9 -`, 40 at most; the example had none until 2026-10-12 and two reviewers added it on a guess; `about` is `brain` or a Worker's name; a body that says how you saw it; no `parent`, which would hold the parent back) and do not hold the review for it.

## A spec

An issue of kind `project` or `feature` at `spec-review` is a spec, not a change. Its ref names the
file. Read the issues that are its parts (`ir "list?parent=<id>"`, closed ones too, each with
`get?id=`) and then the spec, and answer four things in the review's body:

1. Is every gathered report answered by a requirement, or said to be left out with a reason?
2. Does each requirement say how it will be known to be met (a test, a count from `issue-stats.ts`, a command and its result)?
3. Is the smallest version that meets them the one proposed, and what was not chosen? List the standing things the design adds (a role and its brief, a tool, a token, a Worker, a method, a store). For each, read the sentence of the spec that names what exists today that does the same job for the same purpose and says under "Not chosen" why that is not extended, or that nothing exists, with the search or the listing that showed it (step 5 of the spec writer's brief, `agents/spec.md`). A thing the design adds with no such sentence is a `no` to this question. (Review 4341 of `docs-summarised-for-search` answered "yes" from the twelve ways the spec listed; a second summarizer role was in none of them and the owner sent the spec back: `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`.)
4. Can it be cut into tasks that each land alone? The spec lists them.

`pass`, then `ir move '{…"to":"awaiting-approval"}'`: the approval is the owner's. `changes` and
`ir move '{…"to":"spec"}'` sends it back. What sends it back is a `no` to one of the four, or one of the six kinds of "What holds a
change", read of the design in place of the change (review 2797 of `topics-service` used the first: the design
writes without end where a caller the issue names would meet it; a review of `group-invites` the third); anything
else is a note. You run no tests for a spec and the rule on a test count
does not apply. First written 2026-10-11; 19 reviews of a spec by event 1920.

A round after the first: read the review that sent the spec back (the last `reviewed` event before the `respec`, in
the issue's events) before the new file, look for each thing it held in the new file first, and then answer the
four of the whole file as it now is. (The reviewers of round 2 of `fly-exec-for-blessed-services` and of
`rules-checked-and-stale-knowledge-seen`, 2026-10-13, each said this section had no line for a second round.)

A small thing you find while reviewing, that is not of this issue's change and that you know the
fix of: you do not fix it. A reviewer that writes code is the writer of that change, and the workflow
would need a third agent to review it. Open the feedback ticket below, with the fix in one line.
(A note in a document is the one thing you mend, in a file of this issue's own change or, by the owner's `A` of
event 2400, one sentence of a `knowledge/*.md` or `plan/*.md` that the change shows untrue: "What holds a change, and what is a note".)

## If you see something, say something

Anything that seems off against one of the seven lines of `philosophy.md` and is not a finding on
this issue: open a feedback ticket with `ir open`, kind `feedback`, id `seen-<short>`: what was
seen, when, where to read it, which line. No fix in it (2026-10-11, `philosophy.md`, Clarifications).
An id is 40 characters at most (`open` answers 400 for a longer one): open the ticket, or the
issue above, before the body of your review names it, and name the id the call answered.

## A digest

An issue labeled `digest` is a published notebook, not a change to a service. Steps 2 to 6 are
replaced by these; steps 1 and 7 hold. Written 2026-10-11; first used that day on `digest-2026-10-11` (event 404).

1. Count the four numbers at the `url` ref with no session, in your checkout:
   `bun tools/cloud-brain/digests/count.ts <the url ref>`. It opens the address in a local headless
   Chrome of its own and prints one line: `variables`, `errors` (a list), `items` with `sources`,
   `papers`, and `picksFound` of `picks`. Compare with the writer's four numbers. Do not open a paired
   tab for the count: its updates are sent to the orchestrating session. How each number is read is in
   the header of the tool, in `tools/cloud-brain/records/digest-counts-in-a-paired-tab.md` and in the
   writer's brief, `.claude/skills/brain-maintenance/agents/digest.md`, steps 6 and 8.
   (Since `digest-counts-in-a-paired-tab`, 2026-10-12. Until then: the `url` ref in a QA tab of your own,
   opened with `chromium_args: ["--disable-features=LocalNetworkAccessChecks"]`, without which the tab
   does not pair; still the way for the look at the page in step 3, when you take one.)
2. For every number the prose quotes, find it in the stored summary
   (`/static/snapshot/<day>/<source>.json`) or on the linked page. A number in neither is a
   finding. So is an item described past its title when the digest's own "What was not read"
   says only the title was read.
3. The layout is Tom's (`tools/cloud-brain/digests/README.md`, "Layout"): opens on the first
   theme, editing off, "How this was written" last, a link that leaves the Brain opens a new tab.
4. Read the seed's commit: it adds `digests/<day>.ojs` and nothing else.

## A post mortem

An issue whose `labels` have `post-mortem` is no fix. Its writer traced one decision or event back through the
record to a cause a change can be made to, wrote that as one file, `tools/cloud-brain/post-mortems/<id>.md` with
`<id>` the issue's id, and landed it with no deploy (`plan/cloud-brain-post-mortems-declared-and-kept.md`, part 6;
the writer's side is `.claude/skills/brain-maintenance/agents/implementer.md`, "A post mortem"). Steps 3, 5 and 6
are replaced by these; steps 1, 2 and 7 hold, and of step 4 its case for a submit with no deploy ref and no seed.
Written 2026-10-12 (`pm-3-reviewer-brief`).

- **The file is its record**: there is none under `tools/cloud-brain/records/`, and that is no finding. The
  writer attached the file to the issue as `<id>-r<round>.md` (step 2 has the read).
- **The count** is `bun test --timeout=30000 ./tests/tools/post-mortems.test.ts`, in your view: it holds the name,
  the first line, the seven headings and the length of every file of the directory. Beside it, the test of the
  file's quotes when the writer added one. Run each yourself and give both counts.
- **What the trace is read against.** The issue's `links` have one `cause` link, to the issue the post mortem is
  of: `ir "get?id=<the issue it is of>" > <your scratchpad>/of-<id>.json` has its events, each by its `seq`. A
  commit is `git -C <checkout> show <sha>`, and a spec, a brief or a tool as an agent had it
  `git -C <checkout> show <sha>:<path>`. The orchestrator's journal is
  `<root>/tools/cloud-brain/.emitted/issue-loop/<issue>.md`. The transcript of a run is on the machine that ran
  it and in no repository; the writer's section has the path. A step you could not read where the file says it
  was read is named in the review as not read, with why. Nothing of a transcript that holds a token or a session
  is quoted in the review (`rules.md`, Never: "Print, copy or log a secret").

Answer four things in the review's body. For the first, say which five steps you read and what each was read from:

1. Does each step of the trace say what its event, commit or line says? Read five of them, the cause's among them.
2. Is the cause something a change can be made to, and does the trace reach it, or does it stop at an agent?
3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?
4. Would a reader know a second case from "How it is known later"?

Under question 3, since `post-mortem-actions-prefer-guards` (2026-10-12; the owner that day: "generally fixes are
better as guards", and "if the cause cannot be determined the action would be to increase observability in the
problem area"), the actions of a file are one table with a column `Held by`, whose cell starts with `guard`,
`workflow`, `refusal`, `test`, `observability` or `text` (the writer's section, "The next actions").
`post-mortems.test.ts` holds the column, the word and that a `text` cell goes on, for every file but the three
written before that change. It does not hold these, which are yours to read:

- For each action held by `text`: could a guard of the installed policy, a state or a move of a workflow, a refusal
  of a service or a tool, or a test have stopped the step the trace names? Read the cell's reason against the
  trace. "It is shorter" and "it needs his install" are no reason.
- For each action held by one of the first four: is the kind named the kind the action is? A test that holds a
  sentence of a brief is `text`.
- Where `## The root cause` is "Not found": is an action `observability` at the step where the trace stopped, and
  would a second trace get past that step with it? "None" is then no answer.

A post mortem that fails 1 or 2 is sent back. A number that is inexact is a note (the owner, event 2099). The spec
says no more of a `no` to 3 or 4: it is a note, unless it is one of the six kinds of "What holds a change", which
hold here as for any change (the count is not what your run gives, a ref names a commit that is not there).

The next actions are filed after your `pass`, by the writer or by the orchestrating session, so that no issue is
opened from a cause a review sends back: an action of the file that has no issue yet and no `cause` link to it is
no finding. The verdict and the move are step 7's.

Review 4541 of `pm-second-summarizer-role` (2026-10-12) passed the first post mortem before this part was
written, by the steps of this brief as it then was: each row of the trace read against `get?id=` of two issues, the
file's test run with the file aside and with two of its statements altered, and under "What I did not do" that
whether the cause is the true one cannot be tested. First review under this part: not yet, when it was written;
say in your report what of it was wrong.
