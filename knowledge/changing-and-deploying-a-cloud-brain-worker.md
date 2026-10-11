---
scope: [local-development]
topics: Cloud Brain; changing a seed; build.ts; deploying a Worker; brain.ts apply, redistil, saw, confirm; the deploy lock; a Playwright script in tools; where a service keeps files
triggers:
  - "^(Edit|Write|MultiEdit) .*tools/cloud-brain/"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/build\.ts( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/build\.ts( |$)"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/brain\.ts +(apply|redistil|saw|confirm|shell|remove|rollback|install-deployer)( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/brain\.ts +(apply|redistil|saw|confirm|shell|remove|rollback|install-deployer)( |$)"
---

# Changing and deploying a Cloud Brain Worker

Moved here on 2026-10-11 from `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, which was written 2026-10-08 from the session that
built the cluster pairing. Each command was run that day against `cb4`, except where it says not run. The text is as it was there; a line carries its own date where it is later.
The other pages are listed in that file, which is read first.

## Changing it

1. Edit the seed in `tools/cloud-brain/*.ojs`. Never the notebook HTML.
2. `bun tools/cloud-brain/build.ts`. Beside the notebook it writes two files in `tools/cloud-brain/.emitted/`:
   `shell.html`, the notebook without the modules a Worker serves (what `brain.ts shell` posts), and since
   2026-10-11 `verify.html`, that shell with `mains` cut to `["@tomlarkworthy/brain-shell"]`
   (`tools/cloud-brain/verify-shell.ts`), read by `verify-run.ts --shell`. `brain.ts shell` posts both, `verify.html` first
   (`infra.shell?name=verify`), and neither when one is not there; a deployer that has `shell/verify.html` in brain-static
   opens it for a deploy's test run (`brain-deployer.ojs`, `verifyPage`; `tools/cloud-brain/records/dv-3-deployer-opens-verify-html.md`).
   Against a deployer from before that change `brain.ts shell` exits 1 and says to install the deployer first.
3. Run the tests in a local QA tab: `qa_open_notebook` on the file URL with
   `#view=…&cc=<pairing token>&r=<fresh number>`, then `run_tests`. `r` does nothing; a new value makes a new URL, so the tab
   loads the file again.
   `run_tests` hung four times on 2026-10-09. The stand-in is to force each `test_*` cell from `eval_code`. Do it
   from a module of its own (`const side = runtime.module(); side.variable().import(name, alias, mod);
   side.variable(observer).define(null, [alias], (x) => x)`), never with `mod.variable(observer).define(…)` inside
   the module under test: `exportModuleJS` writes every variable of a module into its source, so the deployer's
   own tests fail with "invalid redefinition of global identifier", and a record emitted in that tab carries the
   test cells into the deployed Worker's kept source (seen in the deployer, 2026-10-09 23:33).
4. Deploy under the lock: `tools/cloud-brain/lock.sh take cb4 <who>`, `apply … --reason="why"`,
   `tools/cloud-brain/lock.sh release cb4 <who>`. The lock is held in the cluster: a row `brain-x-issues` keeps
   (`issue.lock`, `issue.locks`), for 600 s from the take, so agents in other checkouts and on other machines meet the
   same one and nothing is made on this machine (since 2026-10-11, `tools/cloud-brain/records/lk-3-lock-sh-over-the-cluster.md`;
   before that it was a directory under `.emitted/`). `take` exits 1 and names the holder and until when, when another
   agent is deploying (wait, or `take … --wait`), and exits 2 when cb4 was not reached or refused the call: no apply then.
   `release` refuses a name that is not the holder's; `renew` gives the holder 600 s more; `show` says who holds it. A lock
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
5. Update the as-built record and the backlog in the same change.
6. Run `/review-notebook` on what changed. The two logging reviews on 2026-10-08 found 15 real
   defects the authoring session had not seen.
7. Commit on `main` in `lopebooks` and here, and push. Tom, 2026-10-08: "we should work on main
   mainly". Not a branch in the shared directory.

## The commands that deploy

`brain.ts` itself, its state and `curl` are in `knowledge/calling-a-cloud-brain-from-this-checkout.md`.

| Command | Use |
|---|---|
| `redistil` | Compare each Worker with its source. Healthy is every line `same`. `redistil --apply` deploys the ones that differ; since 2026-10-11 it moves the `seen.json` entry of each Worker it deployed when that entry was the hash before, and prints a line for one it left (another hash, or no entry: `saw NAME` after comparing). Before that it wrote nothing, and `saw` read `MOVED` for a swept Worker that had an entry: 6 Workers at 11:20 CEST on 2026-10-11, after a sweep at 08:23 that moved 18 (`records/redistil-apply-leaves-seen-json.md`). |
| `apply <name>.json --reason="why"` | Deploy a recipe, signed with the recovery key. Since 2026-10-09 the deployer answers 400 without `--reason=` (3 to 300 characters) and logs it as `deploy.reason`; the same for `redistil --apply`, `remove` and `rollback`. |
| `saw [name…]` | `tools/cloud-brain/seen.json`, committed with the seeds: the hash each seed is built on. `apply` and `remove` send it as `was`. A refusal has one of three causes, and the message says which. The Worker has no entry (13 of cb4's 19 on 2026-10-10 21:13): nothing was applied to it from this checkout, and the seed may be ahead of what runs or behind it. Compare `getSource?worker=NAME` (public, no `--owner`) with `source.text` of the emitted record; when every difference is this checkout's change, `saw NAME` and apply the same record. The Worker changed somewhere this checkout has not merged: merge its source into the seed, build, emit, then `saw NAME`. The record was emitted before the Worker last changed: build and emit again. `saw NAME` writes the hash that runs with the time it was deployed. Commit `seen.json` with the seed (2026-10-10, after a kernel deployed from elsewhere was replaced; `records/seen-json-6-of-19-workers.md`). |

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
