# brain-git: git repositories over Cloudflare Artifacts (2026-10-10)

Tom, 2026-10-10: "we need a lightweight git in the cluster, something faster and more reliable
than github"; of Cloudflare Artifacts, "seems exactly what I want"; "wrape the Artifacts service
with a Service. That does the exposes the repo ops as xrpc + rules and designed for multitenancy."

## What was built

- `brain-git.ojs`, Worker `brain-x-git`: `git.create`, `git.get`, `git.list`, `git.token`,
  `git.delete`. Each is one call to the Artifacts REST API in the namespace named for the Brain;
  the answer is Cloudflare's. The method table and the tenancy rule are in the seed's first cell.
- The deployer's `GROUPS` gained `"Artifacts Write"`, so it mints a token with that permission for
  the service. Tom gave the name ("Artifacts Read / Artifacts Write") and agreed to the cost: the
  minted token makes, reads and deletes every Artifacts repository of the account, in any
  namespace. The two groups there before each read their own product only.
- `deploy-sync.ts`: what a Brain runs, written as a directory laid out by import path, with
  `manifest.json` (services with Worker and hash, shared modules, files, the page's bootconf).
  Two public reads: the deployer's `infra.getModules` and the page the kernel serves.

## On cb4

```
21:51:19  land.lock taken; install-deployer -> cb4-deployer b4350f5c1e75; redistil: every Worker same
21:52     apply brain-x-git 4a21bf848d55, deployed in 12.1 s (the token minted, not held for approval)
21:52:20  git.create?name=probe-git, with a token that names com.lopecode.brain.git.*: 200, a remote
          https://<account>.artifacts.cloudflare.net/git/cb4/probe-git.git and a first token
21:53     git.list: 1 repository; git.delete: 200; git.get after it: Cloudflare's 10200 "Repository not found"
```

Then with plain `git` and `http.extraHeader="Authorization: Bearer …"`, against a repository
`deploy` made the same way, pushing the output of `deploy-sync.ts` (22 service modules, 76 shared,
62 files, 169 files in all, 4.2 MB packed):

```
first push 2.4 s    clone 3.0 s    push of a one-line commit 0.6 s
push with a read token: 403     force push with a write token: accepted
git.token?seconds=30: 400 "seconds is a whole number from 60 to 86400"
```

Not compared with GitHub in the same session. The repository `deploy` is left on cb4 with one
commit, cb4 as it ran at 21:53.

## Tests

In a browser tab on the build of the branch, 21:48: brain-git 4 of 4; brain-deployer 41 of 42 with
the 42 run at once, and `test_the_deployer_logs_each_step_of_a_deploy_and_why_it_was_put_back`
passed twice run alone ("6 lines"). Its failure in the parallel run was a missing first
`deploy.uploaded` line; not looked into further, and not caused by this change as far as one
rerun shows.

## Not tried

- A member's call on cb4. The tenancy (`m-ID-NAME`, a member reaches their own only) is checked in
  the service's tests against a stand-in for Cloudflare, not against a signed-in member.
- A rule on `git.token` that reads `request.params.name` on cb4 (checked with `decide` in a test).
- What Cloudflare counts as an operation, and so whether $0.001 a `create` or `token` covers the
  git traffic it leads to. Billing starts 2026-10-14.
- A token after its time ends; the most `ttl` Cloudflare takes (the service stops at a day).
- A repository near 1 GB, a file over 32 MB.

## Not built

`fork`, `import`, revoking one token, giving another account a repository, a scheduled run of the
sync, a web server on the synced directory, building a notebook from `manifest.json`.

## Slips

- The service was first built in the main checkout without `land.lock`. Moved to a worktree and
  the shared notebook rebuilt under the lock; `git status` in `lopebooks` showed it unchanged.
- `rmdir land.lock` at 21:53:39 found it already gone. Nothing else had landed (`git log`), and
  who removed it is not known.

## After its fresh review (2026-10-10 22:02 CEST)

FIX, 5 findings, all taken. `brain-x-git` `869e8a226168`, applied 22:02 in 22.9 s; every Worker
`same` after. 4 of 4 in a browser tab on the build of the branch.

- A member's short name of 28 to 40 characters made a repository whose name on Cloudflare was 41
  to 53, which the owner could list and not get, give a token for or delete: the 40 limit was
  applied before the `m-ID-` prefix. It is now applied to the name Cloudflare holds; a member's
  short name is at most 27. No such repository was made on cb4.
- The prose gave only the most `seconds`; it now says from 60.
- The prose now says a member's `git.list` is one page of Cloudflare's with the others taken out,
  so a page can be empty while `cursor` says there is more. Not changed: the service does not page
  for the member. Cloudflare's `search` parameter on the list was not tried.
- The member-name pattern was written in three places; it is one cell, `gitMember`.
- `deploy-sync.ts` said "two public reads" and makes one more a Worker (`getSource`, to tell what
  runs). The header says so, and a Worker that does not answer is printed, where before it was
  left out in silence. "Two public reads" under What was built above is wrong in the same way.

On cb4 after this deploy, 22:03, with a token for `git.*`: `git.list` answered `deploy`; `git.token?seconds=59`
answered 400 "seconds is a whole number from 60 to 86400". A member's long name was not tried there.

## cloud-brain-dev (2026-10-10 22:16 CEST)

Tom: "cloud-brain-dev needs to be mega lean, no history, a fresh start, minimal, no service source,
those are downloaded, but shared sources? yes."

A repository `cloud-brain-dev` on cb4, one commit, three things: `README.md`, `sync.ts`, `deploy/`.
`sync.ts` is `deploy-sync.ts` written again with no dependency but bun (HTMLRewriter for the page's
blocks; no list of imports, so no parser) and is the only copy: `deploy-sync.ts` is deleted here.
It writes `deploy/.gitignore` from the list of services, so 76 shared modules and 62 files are
committed and the 22 services' modules are not.

```
bun sync.ts https://cb4.endpointservices.workers.dev    22 services, 76 shared modules, 62 files, 3.5 s
every file byte-identical to deploy-sync.ts's, but for brain-git and brain-issues, deployed between the runs
clone of the pushed repository, sync.ts there: git status shows 0 changes; .git 2.2 MB
```

An hour earlier the same name held `tools/cloud-brain` split out with its history (171 commits,
seeds included). Tom did not want that; the repository was deleted with `git.delete` and made again.
A create straight after the delete answered "repo already exists" once, and passed 5 s later.

The repository `deploy` (every running module, one commit of 21:53) is still on cb4.

Not built: sending a module from `deploy/` back to the deployer; running a module's tests from
this repository; a page booted from `deploy/`.

## cloud-brain-dev: a service's tests with no browser (2026-10-10 22:26 CEST)

Tom: "we need tests too, thats essential for post deployment reporting, but per service"; and of
the sync, "did you use concurrent downloads?" (it had not).

In the repository `cloud-brain-dev`, commit `d6510f1`:

- `sync.ts` sends its reads at once: 3.5 s to 0.8, 1.2 and 1.0 s (three runs). The two large reads
  take 0.6 s each alone.
- `test.ts <worker>` runs the `test_*` cells of that Worker's module from `deploy/` under bun and
  prints one line of JSON a module: `{ worker, module, hash, passed, failed, needsBrowser, tests }`.
  `all.sh` runs it for every service at once.

```
cb4, 22:26, 22 modules, 19 s:   284 passed   0 failed   27 need a browser
one line of brain-git changed in deploy/ (ttl: seconds + 1):   1 of 4 failed, exit code 1
```

What it took, each found by a failing test: loading a module from its text unchanged
(`vm.SourceTextModule`; bun's `import` prints functions again and `part=reference` then found no
prose cell), the standard library from the bootloader's `stdlib_5_8_9` cell, files through
`window.lopecode.contentSync`, every service named in `runtime.mains`, tests observed from a side
module, and a module's tests one at a time (run together, a `brain-core` test that counts log
lines got 7 of 8, the same kind of failure as the deployer's test in a browser at 21:48).

Not done: posting the report to the Brain (the deployer's check of a deploy is the page's, in a
browser, and is another session's work); the 27 tests that need a DOM; a comparison of these
counts with a browser's for the same hashes; the send-back command.

Another session removed `land.lock` at 21:53 by mistake (its `mkdir` had failed and its `rmdir`
ran); it said so at 22:24. That is the lock found gone above.

## cloud-brain-dev is a submodule here; a check before a deploy (2026-10-10 22:34 CEST)

Tom: "maybe it useful jsut for agents as a pre deploy check. can you vendor that repostory in? the
service modules should be git ignored (not the shared)."

- `cloud-brain-dev/` is a submodule of lopecode-dev. Its URL is Cloudflare's and holds the account
  id, which this public repository already had in a tracked file
  (`tools/scratch/cloud-brain-experiments/worker/.wrangler/cache/wrangler-account.json`). A fetch
  needs a token from `git.token`; a plain `git submodule update` is refused.
- `test.ts <worker> --with FILE` runs a module that is not deployed in the place of the deployed
  one. With brain-git as `lope-reader.ts --get-module` reads it from the built notebook: 4 of 4.
  With one comparison in that file changed (`seconds < 61`): exit code 1. The implementer brief
  names it as the fast check while working; the count submitted is still the browser's.
- Its fresh review: FIX, 8 findings, all taken (commit `88106ee` there). `all.sh` gave exit code 0 with a
  failing test and is `all.ts` now; one module that did not load took every service's report with
  it; 7 files with `%40` in their names were written encoded and looked for decoded; a stale
  service file could lose its ignore line; the report's hash was the deployed one for an edited file.
  After: 284 passed, 0 failed, 27 need a browser; with two modules broken on purpose, 280 and 2,
  exit code 1, and the 20 other services reported.
