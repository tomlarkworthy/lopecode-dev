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
