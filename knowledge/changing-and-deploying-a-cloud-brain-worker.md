---
scope: [local-development]
topics: Cloud Brain; a service changed as a patch from cloud-brain-dev (run.ts), the one way for a brain-x service since 2026-10-14, when its seed was deleted; a new service's first deploy from a seed and a build.ts entry; changing a seed of the kernel, the core, the database, the deployer or the page; a git worktree for the change (worktree.sh), landed by a push; build.ts; deploying a Worker; brain.ts apply, redistil, saw, confirm; waiting-deploys.ts, which of the kernel, the core, the database and the deployer cb4 runs behind main; the deploy lock; a Playwright script in tools; where a change made on the Brain's page is kept (the address, this browser, a service's rows, the seed); where a service keeps files
triggers:
  - "^(Edit|Write|MultiEdit) .*tools/cloud-brain/.*\.(ojs|ts|js|sh|py)$"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/build\.ts( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/build\.ts( |$)"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/brain\.ts +(apply|redistil|saw|confirm|shell|remove|rollback|install-deployer)( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/brain\.ts +(apply|redistil|saw|confirm|shell|remove|rollback|install-deployer)( |$)"
---

# Changing and deploying a Cloud Brain Worker

Moved here on 2026-10-11 from `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, which was written 2026-10-08 from the session that
built the cluster pairing. Each command was run that day against `cb4`, except where it says not run. The text is as it was there; a line carries its own date where it is later.
The other pages are listed in that file, which is read first.

## A service changed as a patch (since 2026-10-13; from `cloud-brain-dev` alone since 2026-10-14)

For a `brain-x-*` service but the page this is the one way since 2026-10-14 (until then it was a second way beside its seed): the module is edited as cb4 runs it, in a repository
of that one piece of work, and what is deployed is a patch. The commands and each run are in `cloud-brain-dev/README.md`
("A change sent back", "The repository of a piece of work", "One issue, from ready to deployed"); `bun run.ts ID` there
is the whole of it for one issue. The owner, 2026-10-13, in the session that built it (issue `fly-loop-needs-cloud-brain-dev-alone` has that evening): "the cluster is the source of truth. Seeds go stale."

**`brain-x-git` was changed that way five times on 2026-10-13 and 14** (`git.fork`, `git.work`, `git.works`, and two
changes to its tests; cb4 ran hash `03c0b2f81f63` then, `c588784ddb62` after two more on 2026-10-14). Its seed,
`tools/cloud-brain/brain-git.ojs`, had none of them, and a deploy built from it would have taken the five away. The seed
was deleted on 2026-10-14 ("Later on 2026-10-14 the seeds …", below): change that service in `cloud-brain-dev`.
What stands in the way of one is `was`: `tools/cloud-brain/seen.json` has `brain-x-git` at `9ba9cc3be98a`, the hash
before the five, and `brain.ts apply` refuses a Worker whose running hash is not the one seen. `brain.ts saw
brain-x-git` takes that guard away, so it is not run for this service before the seed has the five. (`redistil` does
not show the difference: it distils the source the deployer keeps, which is the patched one.)

On 2026-10-14 two more services were patched from `cloud-brain-dev`, not from their seeds, at 05:49 and 05:50 CEST, so
that `brain-x-loop` could work: `brain-x-issues` (`4da136beec0e`, 74 tests: it appends each open, move, swap and label
to the topic named by its new setting `topic`) and `brain-x-fly`
(`9526a5569219`, 14 tests: the tick stops a machine and starts none). The patches and their commits are the
repositories `w-auto-loop-issues` and `w-auto-loop-fly` on the Brain's git service. `tools/cloud-brain/brain-issues.ojs`
and `brain-fly.ojs` had neither, and `seen.json` has the hashes from before, so `brain.ts apply` refuses a build of
either seed as it refuses one of `brain-git`. Do not `saw` either before its seed has the patch: a build of
`brain-issues.ojs` drops the append that `brain-x-loop` is told by, and the loop then never starts the machine with no
error anywhere; one of `brain-fly.ojs` restores a tick that starts the machine. `brain-x-loop` itself was then a seed, `tools/cloud-brain/brain-loop.ojs` (deleted later that day),
deployed with `brain.ts apply` (`0ea22abdb28c`, 5 tests), because a new Worker is declared to the page by the build.

Later on 2026-10-14 the seeds `brain-git.ojs` and `brain-fly.ojs` were deleted (Tom: "remove the stale seeds from
lopecode-dev so there are no accidents"). Of the 26 services cb4 ran then, these and `brain-issues` were the three whose
seed on `main` differed cell by cell from what ran (`waiting-deploys.ts`'s `differ` over `cloud-brain-dev/deploy` after
`sync.ts`); the other 23 were `same`. Their entries in `build.ts` say `running: "brain-x-NAME"` in place of `seed:`, and
the build fetches `getSource?worker=` of `BRAIN_BASE` (cb4) for them, or stops. A record emitted from that build is what
runs: `brain-x-fly` emitted `9526a5569219`, its running hash; `brain-x-git` emitted `2c05c074f3e8` where `c588784ddb62`
runs, the same cells in the same order with one blank line in another place (the patch tool's). `brain-issues.ojs` was
deleted the same day, and its `build.ts` entry is `running: "brain-x-issues"`; the build's module passed its 74 tests
(`tab-tests.ts`). What read the seed reads `cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js`, as `bun sync.ts`
there wrote it from cb4: `policy-walk.ts` and the tests of `tests/tools` (`running`, `runningCells` and `runningModule`
of `tests/tools/needs.ts`; a rig's cell is compiled into that module in place of its test cells). Such a test is as new
as the last sync, and a copy from before a change of the tracker fails it: sync again. `approver.ts` no longer marks
the seed's policy cells (`rules.md`, "Its own files").

A build is no longer a function of its commit alone: `brain-git`, `brain-fly` and `brain-issues` are what cb4 runs at
the time of the build (all 21 `running:` entries of `build.ts` since the paragraph below), and with cb4 not answering
the build stops.

Later on 2026-10-14 the other 18 service seeds were deleted (Tom: every `brain-x-*` service is changed only as a patch
in `cloud-brain-dev`, so its seed goes stale the first time one is patched): `brain-ai`, `blob`, `bluesky`, `browser`,
`container`, `dashboard`, `feed`, `inbox`, `knowledge`, `library`, `logs`, `loop`, `proxy`, `snapshot`, `static`,
`topic`, `usage` and `whatsapp`. Before the deletion each was `same` as what cb4 ran, cell by cell (`differ` over the
compiled seed and `cloud-brain-dev/deploy` after `sync.ts`), so no patch was lost. Each `build.ts` entry is
`running: "brain-x-NAME"`; the build printed `what brain-x-… runs` for 21 modules, and `tab-tests.ts` on it passed
`brain-topic` 18/18, `brain-knowledge` 11/11, `brain-usage` 5/5 and `brain-loop` 5/5. The tests of `tests/tools` that
read one of those seeds read the running module (`running`, `runningCells`, `runningGroups` of `tests/tools/needs.ts`).

So, since that day:

- **A `brain-x-*` service but the page** is changed as a patch from `cloud-brain-dev` (`run.ts`; its README, "One
  issue, from ready to deployed"). Its method reference is `getSource?worker=brain-x-NAME&part=reference`.
  `seen.json` keeps entries for those Workers from before; `brain.ts apply` and `saw` are not run for them, because no
  record of them is emitted from a seed here.
- **The seed steps below** apply to the seeds left: the kernel, `brain-core`, `brain-db`, the deployer,
  `cloudflare-iac` and `cloudflare-iac-fixtures`, whose deploys are the owner's ("The deploys that wait for the
  owner"), and the page's own modules (`cloud-brain`, `brain-shell`, `cloud-brain-docs`, `cloud-brain-specs`,
  `brain-secrets`, `brain-feedback`, `brain-operator`, `xrpc-client`). Which modules those are at a commit is the
  entries with `seed:` in `MODULES` of `tools/cloud-brain/build.ts`, with `cloud-brain-specs`, which it builds apart.
  Since 2026-10-18 the owner's spec i13287 (r2, option A, approved at event 13425) retires each of them, one task a seed
  (`sr-*`, opened that day; none done when this line was written): `cloud-brain-dev/deploy/@tomlarkworthy/NAME.js`
  becomes the one source, and a module whose seed is gone is changed there. For a module no Worker runs (the page's
  modules but `cloud-brain`, and `cloudflare-iac-fixtures`) no command sends such a change to cb4 yet: `apply.ts --patch`
  stops with "the patch names …, which is no service's module or doc of deploy/services.json" (its line 113, read
  2026-10-18), and the spec does not say which tool will.
- **A new service** still starts as a seed and a `build.ts` entry, because the page declares services from the build
  (as `brain-x-loop` did, above). It is deployed with the steps below. After its first deploy its seed is deleted and
  its entry becomes `running: "brain-x-NAME"`; from then on it is changed as a patch. Not yet done for any service.

## Changing it

Since 2026-10-12 an agent of the issue loop does these steps in a git worktree and writes no tracked file of the main
checkout (`.claude/skills/brain-maintenance/rules.md`, "Always"; `plan/cloud-brain-worktree-per-topic.md`, R1).
`tools/cloud-brain/worktree.sh <name>` makes one at `origin/main` and prints its path, `.claude/worktrees/bm-<name>`
(for a writer of the loop `tools/cloud-brain/loop.ts start` has made it, with `worktree.sh --fresh`; until 2026-10-13 the orchestrating session). There `lopebooks`,
`lopecode` and `lopecode-plugin` are links to the main checkout's, `cloud-brain-dev/` is a clone of its own, and
`tools/cloud-brain/.emitted/` has no state: `brain.ts` is run with `BRAIN_STATE_DIR=<main checkout>/tools/cloud-brain/.emitted`
before it. The order of a landing, with each command, is step 10 of the implementer's brief, on its page `.claude/skills/brain-maintenance/agents/implementer/landing.md`.
The steps below were written for the main checkout, and a line says where a worktree differs. Whether a session of the
owner's works in one is his to say: the spec does not ask it ("the main checkout is his").

1. Edit the seed in `tools/cloud-brain/*.ojs`. Never the notebook HTML. Since 2026-10-14 that is one of the seeds
   left, or a new service's before its first deploy ("A service changed as a patch", above); a `brain-x-*` service is
   changed as a patch.
2. `bun tools/cloud-brain/build.ts`. Beside the notebook it writes two files in `tools/cloud-brain/.emitted/`:
   `shell.html`, the notebook without the modules a Worker serves (what `brain.ts shell` posts), and since
   2026-10-11 `verify.html`, that shell with `mains` cut to `["@tomlarkworthy/brain-shell"]`
   (`tools/cloud-brain/verify-shell.ts`), read by `verify-run.ts --shell`. `brain.ts shell` posts both, `verify.html` first
   (`infra.shell?name=verify`), and neither when one is not there; a deployer that has `shell/verify.html` in brain-static
   opens it for a deploy's test run (`brain-deployer.ojs`, `verifyPage`; `tools/cloud-brain/records/dv-3-deployer-opens-verify-html.md`).
   Against a deployer from before that change `brain.ts shell` exits 1 and says to install the deployer first.
   In a worktree the build names its file: `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`.
   With no `--out` there it writes nothing and is exit 1, `in a worktree: pass --out tools/cloud-brain/.emitted/cloud-brain.html`
   (run 2026-10-12 21:18 CEST in `bm-worktree-per-topic`; `build.ts`, line 97): the default is the notebook in `lopebooks`,
   which in a worktree is the main checkout's. `build.ts` is not run in the main checkout by the loop: a build there takes in
   the seeds another session has open and uncommitted (six such files on 2026-10-10 23:29, step 10 of the implementer's brief).
3. Run the tests in a local QA tab: `qa_open_notebook` on the file URL with
   `#view=…&cc=<pairing token>&r=<fresh number>`, then `run_tests`. `r` does nothing; a new value makes a new URL, so the tab
   loads the file again.
   `run_tests` hung four times on 2026-10-09. The stand-in is to force each `test_*` cell from `eval_code`. Do it
   from a module of its own (`const side = runtime.module(); side.variable().import(name, alias, mod);
   side.variable(observer).define(null, [alias], (x) => x)`), never with `mod.variable(observer).define(…)` inside
   the module under test: `exportModuleJS` writes every variable of a module into its source, so the deployer's
   own tests fail with "invalid redefinition of global identifier", and a record emitted in that tab carries the
   test cells into the deployed Worker's kept source (seen in the deployer, 2026-10-09 23:33).
   Since 2026-10-11 the same run with no pairing: `bun tools/cloud-brain/tab-tests.ts NOTEBOOK @tomlarkworthy/MODULE [--emit CELL=FILE]`
   opens the file in a local headless Chrome, observes each `test_*` cell from a module of its own and prints one line of
   JSON (`tests`, `passed`, `failed`); `--emit` writes `NAME_service`'s record to FILE when every test passed, and since 2026-10-13 not when the `BRAIN_INFO` the deployer
   would bind from it is over Cloudflare's limit (exit 2, `notEmitted` has the size; the row of `apply` below). An agent
   spawned by another session uses it in place of a tab: its tab pairs through that session's channel server, and every
   update of the tab is sent to that session (`tools/cloud-brain/records/writers-qa-tabs-wake-the-orchestrator.md`).
4. Deploy under the lock: `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take cb4 <who>`, `apply … --reason="why"`,
   `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release cb4 <who>`. `<token>` is the name of your own token for the
   tracker, one `issue-as.sh` keeps; with no `LOCK_TOKEN` the script sends nothing and is exit 2 (since 2026-10-12,
   `tools/cloud-brain/records/lock-sh-default-token-r4.md`). The lock is held in the cluster: a row `brain-x-issues` keeps
   (`issue.lock`, `issue.locks`), for 600 s from the take, so agents in other checkouts and on other machines meet the
   same one and nothing is made on this machine (since 2026-10-11, `tools/cloud-brain/records/lk-3-lock-sh-over-the-cluster.md`;
   before that it was a directory under `.emitted/`). `take` exits 1 and names the holder and until when, when another
   agent is deploying (wait, or `take … --wait`), and exits 2 when cb4 was not reached or refused the call: no apply then.
   `release` refuses a name that is not the holder's; `renew` gives the holder 600 s from the renew; `show` says who holds it. A lock
   past its time is not held, and the next take takes it. The header of `lock.sh` is the reference.
   Nothing makes `apply` look at it. It is the agreement between agents, on every machine. The landing lock, `land`, is the same tool.
   Since 2026-10-11 07:51 CEST on cb4: every Worker with a version before it goes on probation, the deployer
   runs its tests in the Brain's browser inside the apply (20 to 55 s an apply that morning), and the result's
   state is `verified`, `put-back` (its tests failed; `reason` names them) or `probation` (no verdict).
   Nothing to do on `verified`. On `probation`, read `deploy.verify.none` in the logs for why there was no
   verdict, then `brain.ts confirm <worker>` within 10 minutes or it is put back; `confirm` takes one name and
   exits 1 without it. The kernel has no run and always needs `brain.ts confirm brain`. A second apply of a
   Worker on probation is refused; `apply --over-unverified` (recovery key) goes over it. An apply of a record
   older than the Worker's last change is not sent ("emitted before … last changed"): emit again. See "A deploy
   is verified by the deployer" in `brain-deployer.ojs` and `tools/cloud-brain/records/deploy-verification.md`.
   `NAME.json` is written by emitting in a tab: `(await module.value("NAME_service")).emit()`, posted to
   `http://127.0.0.1:47814/NAME.json`, which `bun tools/cloud-brain/test-receiver.ts` saves in `.emitted/`.
   `redistil --apply` does not do this: it distils again the source the deployer already keeps. It is for after
   `install-deployer`, which is how a change to the wrapper (`workerRuntime` in `cloudflare-iac.ojs`) reaches the Workers.
   The same run on this machine, reading only: `bun tools/cloud-brain/verify-run.ts WORKER [--times N] [--shell FILE]`
   opens the deployer's run address N times in a local headless Chrome (151 on 2026-10-11, not the cluster's 128)
   and prints each verdict with the tests that ran beside it, by module. Exit 1: a test passed and failed on one
   hash, or a module other than brain-shell and the Worker's ran a test, which is every run of `/` until
   `shell/verify.html` is served (132 other tests in 95 of 95 runs, 2026-10-11); exit 2: a run failed or gave no
   verdict. `--shell` puts a built file in the document's place; a file that holds the Worker's module (a whole build) is served with its boot list cut to brain-shell and that module, and the page's `getSource` requests are aborted, so the build's module is what runs and is not written over (since 2026-10-11, `records/verify-run-shell-runs-deployed.md`). `tools/cloud-brain/records/dv-1-verify-run-tool.md`.
   What the page computes and draws again while it stands open is counted with `bun tools/cloud-brain/page-redraws.ts --owner [--entries N] [--shell FILE]`
   (since 2026-10-13): it opens the Brain's address in a local headless Chrome, answers the owner's reads itself (no session is held and no call of
   the owner reaches the Brain), and prints the cells of `@tomlarkworthy/cloud-brain` that were computed again and how many times the Services
   table was put in place, at rest or after N entries of the deployer in one `inbox.poll`. Exit 1 and `failed` when a cell was computed again or
   the table was put in place more than for two reads. `tools/cloud-brain/records/page-services-refreshes-in-a-loop.md`.
   A read is one table at most, and none when no cell of it differs from the one shown, since `services-table-drawn-three-times-a-read`
   (2026-10-13; with `--differ` each read's rows are others than the ones shown, and the count is then 1 a read; a page whose shell is of before it counts 3 a read and is exit 1 with an entry: `tools/cloud-brain/records/services-table-drawn-three-times-a-read.md`).
5. Update the as-built record and the backlog in the same change.
6. Run `/review-notebook` on what changed. The two logging reviews on 2026-10-08 found 15 real
   defects the authoring session had not seen.
7. Commit on `main` here, and push. Tom, 2026-10-08: "we should work on main
   mainly". Not a branch in the shared directory. Since 2026-10-11 the built notebook is not committed in
   `lopebooks` with each change: `tools/cloud-brain/notebook-backup.sh FILE` writes a build over the file there and
   commits it when its last commit is of an earlier day (Tom that day: "that can be a once a day thing for backups";
   `tools/cloud-brain/records/notebook-commit-once-a-day.md`).
   Since 2026-10-12 an agent of the loop commits in its worktree and lands from it, under the landing lock:
   `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take land <who>`, `tools/cloud-brain/worktree.sh --rebase <name>` (a fetch
   and a rebase on `origin/main`), `git push origin HEAD:main` there, `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release land <who>`.
   Nothing is committed, merged or pulled in the main checkout, and the worktree's branch `bm/<name>` is not pushed, so the
   work is still on `main`. With a deploy, `notebook-backup.sh` is run from the worktree with its build, and writes the main
   checkout's `lopebooks` (the script's header; not run by the writer of this line), since 2026-10-13 after the apply has
   answered and not before it, so that an apply that is put back leaves no backup of a build no Worker ran; a backup commit
   of the tool's that was not pushed is undone by its next run, or by `notebook-backup.sh --take-back`
   (`tools/cloud-brain/records/backup-committed-before-apply-answers.md`); a change to `README.md` and `records/*.md` of `cloud-brain-dev` is committed in the worktree's clone and pushed by
   `tools/cloud-brain/worktree.sh --push-dev <name>` before the push of `lopecode-dev`; a change to any other file of
   it is an issue `about` `cloud-brain-dev`, pushed by its `push.ts` after a review. Until 2026-10-12 a landing pulled and merged
   its branch in the main checkout: 174 such merges in its reflog of 2026-10-11, and another session's uncommitted file there
   refused a writer's merge for 19 minutes (the spec, "What exists today" and "The reports gathered";
   `tools/cloud-brain/records/wt-3-land-by-push.md`). A landing with no deploy, run this way on 2026-10-12, is in
   `tools/cloud-brain/records/wt-5-docs.md`. Until 2026-10-14 `--push-dev` landed a change to any file of
   `cloud-brain-dev` (`rules.md` of the issue loop, "Always", the item "Work on `main`", has the owner's words).

## Where a change made on the Brain's page is kept

Written 2026-10-18 for issue `pm-2-rule-in-the-doc`, from "The rule (R4)" of
`plan/cloud-brain-page-modifications-how-they-are-kept.md` (spec at `32569c72`; the owner chose its pick A on
2026-10-13), after `pm-1-notes-put-away-are-kept` landed in `brain-feedback.ojs` (`44a39cc3`). Read it before a
seed of the page is edited, when the edit keeps something the owner changes on the page. The owner, 2026-10-13: "I
closed all the feedback panels, but a refresh later and they have all appeared again".

A change made on the page is kept by what it is:

| The change is | Kept in | Today |
|---|---|---|
| a fact about the work, which any reader or any browser should have | the record or the rows of the service it belongs to | a note filed (the label `annotation`, `feedbackLimits`), Remove (`issue.label`), a dashboard's panels (`dashboard.put`), a Worker's setting (`config.set`) |
| what he is looking at, which a link should carry | the address | the panes (`#view=…`, `viewModules` in `brain-shell.ojs`), the dashboard shown (`dashboard=NAME`) |
| something of his own that he put out of sight, or has not sent yet | this browser: one `localStorage` item for each module and Brain address, read and written through a pair `{ get, set }` the tests replace | a note not yet filed, in `brain_feedback_drafts ADDRESS` (`feedbackKept(ADDRESS)`); a note put away with × before its work is done, in `brain_feedback_away ADDRESS` (`feedbackKept(ADDRESS, "away")`), listed with **Show** in the cell `feedbackAway` |
| a change to what the page is or does | the seed of a page module, or a patch from `cloud-brain-dev` for a `brain-x-*` service ("A service changed as a patch", above), reached through a note filed on the page | every cell |

The fourth row differs from the spec's, which says "the seed" alone: the spec was written 2026-10-13, before the
service seeds were deleted on 2026-10-14.

Changes that have no place, and are lost at a load:

| The change | Its kind | Where it is held now |
|---|---|---|
| a note's box, moved | third | nowhere: `brain-feedback.ojs` line 23, "A note's box can be moved; the new place is not kept." |
| the span of Health | second or third | the value of `viewof span` (`cloud-brain.ojs` line 36) |
| the filters of the Issues panel | second or third | the panel's selects (`chooser`, an `Inputs.select` inside `issuesPanel` of the built `cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js`, which is git-ignored build output of what cb4 runs, read 2026-10-14; run `bun sync.ts` in `cloud-brain-dev` to have it) |
| a cell edited in the page's editor | fourth | the runtime: the page is the shell and the Workers' modules, and each is built from a seed or a patch (the spec's table; not run here) |

He has not asked for the first three and no task builds them; `plan/cloud-brain-dashboards-share-series-and-controls.md` (line 285) left the span out as "Not
asked". One row fits no kind: who is signed in, `brain_session` in this browser (`brainSession` of `brain-shell`). It is
kept where the third kind is, and is neither put out of sight nor unsent. `brain_issues2 ADDRESS`
(`issuesStore` of `brain-issues`) is a browser item too and is no change of his: a copy of the tracker's view.

Falsified by a change that is of two kinds at once. The × of a note is close to one: under the spec's option C it
would be a fact of the record (a second label). The rule calls it his own because nobody else acts on it.

`knowledge/keeping-user-state-in-the-saved-notebook.md` is for a notebook file the reader saves ("the state is
written into that file when the notebook is saved"); the Brain's page is not a file he saves, so the `sticky` that
doc's hook sends a writer to, on any edit that names `localStorage`, would write into a cell nothing keeps.

`tests/tools/pm-2-page-changes-kept.test.ts` holds the rows that name `brain-feedback.ojs`, `brain-shell.ojs` and `cloud-brain.ojs` to those seeds; the other rows are read, not tested.

## The commands that deploy

`brain.ts` itself, its state and `curl` are in `knowledge/calling-a-cloud-brain-from-this-checkout.md`.

| Command | Use |
|---|---|
| `redistil` | Compare each Worker with its source. Healthy is every line `same`. `redistil --apply` deploys the ones that differ; since 2026-10-11 it moves the `seen.json` entry of each Worker it deployed when that entry was the hash before, and prints a line for one it left (another hash, or no entry: `saw NAME` after comparing). Before that it wrote nothing, and `saw` read `MOVED` for a swept Worker that had an entry: 6 Workers at 11:20 CEST on 2026-10-11, after a sweep at 08:23 that moved 18 (`records/redistil-apply-leaves-seen-json.md`). |
| `apply <name>.json --reason="why"` | Deploy a recipe, signed with the recovery key. Since 2026-10-09 the deployer answers 400 without `--reason=` (3 to 300 characters) and logs it as `deploy.reason`; the same for `redistil --apply`, `remove` and `rollback`. Since 2026-10-13 a record is not sent, and the command is exit 1, when the `BRAIN_INFO` the deployer would bind from it is over 5100 bytes: the deployer binds one JSON variable to each Worker (its name, hash, methods and the rule of each), Cloudflare refuses one over 5 KB ("Text binding 'BRAIN_INFO' is too large", code 10054) and the apply then answers `put-back`, under both locks (cb4, 2026-10-13 00:03 CEST, `brain-x-issues` at 5274 bytes). `bun tools/cloud-brain/brain-info-size.ts FILE…` prints the size of a record, and `--live` that of each Worker cb4 runs: `brain-x-issues` had 4966 that day, 134 under, and the next largest 2339 (`tools/cloud-brain/records/brain-info-size-known-before-apply.md`). The size is computed with the expression of the deployer that runs, read from `cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js` of the checkout the tool is in (what `sync.ts` wrote from cb4; `BRAIN_DEPLOYER_JS` names another file), and with the methods and their rules when that file is not there. The deployer's seed binds neither since 2026-10-13, and cb4's deployer bound both at 01:21 CEST that day: the deploy of the deployer is the owner's. At 06:21 CEST that day cb4 ran the deployer `e4b02e4f4481`, which binds neither (`--deployer`), and `--live` gave `brain-x-issues` 293 of 5100 with 29 methods (`tools/cloud-brain/records/texts-of-brain-info-after-binds-change.md`). `bun tools/cloud-brain/brain-info-size.ts --deployer` prints the fields cb4's deployer binds and whether the checkout's copy has the same (`tools/cloud-brain/records/deployer-binds-no-method-list.md`). `redistil --apply` and `install-deployer` send no emitted record of a Worker and are not checked. |
| `saw [name…]` | `tools/cloud-brain/seen.json`, committed with the seeds: the hash each seed is built on. `apply` and `remove` send it as `was`. A refusal has one of three causes, and the message says which. The Worker has no entry (13 of cb4's 19 on 2026-10-10 21:13): nothing was applied to it from this checkout, and the seed may be ahead of what runs or behind it. Compare `getSource?worker=NAME` (public, no `--owner`) with `source.text` of the emitted record; when every difference is this checkout's change, `saw NAME` and apply the same record. The Worker changed somewhere this checkout has not merged: merge its source into the seed, build, emit, then `saw NAME`. The record was emitted before the Worker last changed: build and emit again. `saw NAME` writes the hash that runs with the time it was deployed. Commit `seen.json` with the seed (2026-10-10, after a kernel deployed from elsewhere was replaced; `records/seen-json-6-of-19-workers.md`). |

## The deploys that wait for the owner

The kernel (`brain`), `brain-core`, `brain-db` and the deployer are deployed by the owner alone, and since 2026-10-13 the
issue loop lands a fix to one of their seeds on `main` with no deploy (`.claude/skills/brain-maintenance/rules.md`, Never).
`bun tools/cloud-brain/waiting-deploys.ts` says which of the four cb4 runs behind `main`, and for which issues. It reads
only, with no token, in about 3 s. Run 2026-10-13 10:31 CEST:

```
brain: same
brain-core: waits. 2 differences (~coreApp +test_llms_txt_says_where_the_rule_of_a_method_is). 1 commit: core-getinfo-line-says-access f7c4801f 2026-10-13.
brain-db: same
brain-deployer: waits. 2 differences (~deployerOps +test_apply_unchanged_keeps_the_source_of_what_runs_over_an_older_row). 1 commit: apply-unchanged-keeps-no-newer-source be363d5a 2026-10-13.
```

- It compiles each seed of `origin/main` as `build.ts` does and compares it, cell by cell, with the module cb4 runs
  (`getSource` of the kernel; the deployer's `infra.getModules` for `brain-deployer` and `cloudflare-iac`; both public).
  `~name` is a cell both have with another body or other inputs, `+name` one `main` alone has, `-name` one cb4 alone has.
  The texts are not compared: that day the build of `brain-static.ojs` was 54,766 characters and the text cb4 ran of
  it 57,429, with other ids for its cells (`_spec_0_0` and `_brainstatic_anon_66b289a9de` for the first), and the tool's
  comparison found no cell of the two that differed.
- The commits are those to the Worker's seeds after the newest one that builds to what runs, looked for in the last 40
  (`--depth N`). An issue is a commit's subject up to its first colon. With no such commit in 40 the line says so.
- `--file <token>` then keeps one issue a Worker that waits, `deploy-waits-<worker>`, labelled `needs-owner`: opened,
  given a comment when the list changes, closed when cb4 runs the seed of `main`, opened again at the next change. The
  owner meets it in "For your attention" of his page. Since `fb-batch-docs-and-tools` (2026-10-13) the list is a
  comment from the opening on, keyed `deploys/<worker>/list-…`, and the body says so and has no list: the page shows
  an issue's body and its last comment, and the tracker has no call that changes a body. The list is said again when a
  comment that is not the tool's stands after it. The two issues opened before that day have their first list as the
  body. An issue at `rejected`, `done` or `reverted` is left as it is, and the last line names it with its state. `lock.sh release land` runs this after its docs step, as the
  token of the release, and prints the tool's last line, `deploys (cb4): …`; `LOCK_DEPLOYS=0` leaves it out. So after
  the owner's deploy the issue stays open until the next landing of anyone, or a run by hand.
- Not compared: a module's files (`hono.js`, `atcute.js` and the others of `build.ts`). A change to `cloudflare-iac`
  is said of the deployer alone; its wrapper reaches the other Workers with `redistil --apply` after `install-deployer`.
- `redistil` is not this read: by step 4 above it distils again the source the deployer keeps, and a seed that was never
  applied is not that source. Not run for this.

The header of the tool is the reference; `tools/cloud-brain/records/undeployed-seeds-not-shown-to-owner.md` has the runs.

## A Playwright script in `tools/`

A script under `tools/` that launches Chromium takes the browser from `tools/lib/playwright-chrome.js`:

```js
import { chromium } from "playwright";
import { chromeOptions } from "./lib/playwright-chrome.js"; // "../lib/…" from tools/cloud-brain/
const browser = await chromium.launch({
  headless,
  ...chromeOptions(chromium, { headless }), // {} when Playwright's own build is installed
});
```

A bare `chromium.launch()` there failed on 2026-10-11, headed and headless, with "Executable doesn't exist at
…/chromium-1200/…": `tools/node_modules` has Playwright 1.57, which names build 1200, and the cache
(`~/Library/Caches/ms-playwright`) had 1169 and 1234. The helper names the newest complete build and says so in
one line on stderr; `CHROME=path` names another. With no build at all it throws the command that installs one,
`cd tools && npx playwright install chromium`, which was not run here. Eight tools use it
(`tests/tools/playwright-chrome.test.ts` lists them); the other scripts that launch do not, and one that fails
this way is fixed by the two lines above, not by an `executablePath` written by hand.
`tools/cloud-brain/records/playwright-headed-chromium-1200.md`.

## Where a service keeps files

Files are in `brain-static`, by path. Anything dated is `<service>/<YYYY-MM-DD>/<name>`:
`snapshot/2026-10-09/arxiv.json`. The store sets the rest: a Worker `brain-x-NAME` makes a new path
only under `NAME/`, and each file carries `worker:brain-x-NAME` and `savedAt`. The day is the second
segment for two reasons. Clean-up is one call, `static.delete` with `{ prefix: "snapshot/", before:
"2026-07-01" }` (`before` is compared with `savedAt`). And `static.list` reads every record under its
prefix, so a prefix that ends at a day reads that day only.
