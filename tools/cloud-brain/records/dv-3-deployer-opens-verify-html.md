# dv-3-deployer-opens-verify-html

## Round 1, 2026-10-11

Task 3 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`, design 2. It is the one change of
that spec to the deployer's own code. **It is on the branch `bm/dv-3-deployer-opens-verify-html` and
not on `main`, and nothing was deployed.** `rules.md` keeps the deployer from the loop; the owner
answered "yes" on the issue (event 696) to a writer of the loop writing and testing it on a branch
for him to read and install. The start was at 15:35:48 CEST (`date`), the first commit at 15:40:33
(`git log --format=%ci`).

### What changed

`tools/cloud-brain/brain-deployer.ojs`:

- `verifyPage`, new, called by `verifyDeploy` before each run. It sends
  `GET static.get?path=shell/verify.html` to the core with the core's key, cancels the body and
  reads the status. 200 gives `/static/shell/verify.html`; any other status, no core, or a throw
  gives `/`. The run's address is `BRAIN` + that + `#view=C100(S100(MODULE,@tomlarkworthy/brain-shell))&verify=WORKER`.
  The same address goes into the line `deploy.verify` (`run`) and into the issue a put-back opens.
- `shell` (`infra.shell`): `?name=verify` puts `shell/verify.html`; no `name` puts
  `shell/index.html` as before; any other value of `name`, the empty one included, answers 400
  before the core is asked. Both files are put with `public=true` and the HTML type.
- `fakeCloudflare`, the rig's stand-in for Cloudflare and the core: `fake.static.get`, a hook
  `(url) => [status, data]`. With none set a `static.get` answers 404. Before this the stand-in
  answered 200 `{}` to every call it did not know, which would have read as "the file is there" in
  every test of a run.
- The `md` cell "A deploy is verified by the deployer": both addresses, which one when, how the
  file is put and taken away.
- Three `test_*` cells, new: `test_deployer_opens_the_verify_page_while_static_has_it`,
  `test_deployer_a_put_back_names_the_verify_page_it_ran`,
  `test_the_shell_takes_the_name_verify_and_no_other`. No test cell that existed was changed.

`tools/cloud-brain/brain.ts`, `shell [SHELL.html [VERIFY.html]]`: posts `.emitted/verify.html` to
`infra.shell?name=verify`, then `.emitted/shell.html` to `infra.shell`. When either file is not
there it sends nothing and exits 1. When the verify page is refused it does not send the shell.

`tests/tools/brain-shell-posts-both.test.ts`, new. `tests/tools/verify-run.test.ts`: the line of
the seed it holds `runAddress` against is the new one.
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` ("Changing it", step 2) and
`tools/cloud-brain/running-a-cloud-brain.md`: what `brain.ts shell` posts.

### Read before designing

- `brain-core.ojs:1081`: a method of type `query` is refused with 405 unless the verb is GET. The
  deployer's `viaCore` posts JSON, so `verifyPage` uses `call` with a GET.
- `brain-core.ojs:1328`, in `test_a_worker_calls_a_method_not_a_worker`: "The deployer is let through where any Worker is", and
  `static.get` is `who: "workers"` (`brain-static.ojs:64`).
- `brain-static.ojs:118` and `:141`: the deployer is a caller with the home `shell/`, so it reads a
  file there whatever its tags, and a path there with no file answers 404 (`:233`).
- `brain-static.ojs:148`: the deployer writes under `shell/`, so the put of `shell/verify.html`
  needs no change to brain-static.

These four are read from the seeds. The rig does not run the real core or brain-static: the call
from the deployer through both was not run anywhere.

`knowledge.search` on cb4, two queries ("deployer verify page shell address", "infra.shell static
put verify.html"): the first entries were the modules `brain-shell`, `brain-deployer` and
`brain-static` themselves. Nothing else bore on it.

### A hazard in the order of the two posts

A deployer from before this change routes `infra.shell` by its path alone and does not read
`name`. Sent `?name=verify`, it puts the verify page as `shell/index.html`: the Brain's page at `/`
would then boot brain-shell and no other main. `brain.ts shell` therefore sends the verify page
first and the shell second, so on such a deployer the shell is what is left at `/`. It then exits 1
with "This deployer does not take ?name=verify … brain.ts install-deployer, then brain.ts shell
again", which it knows from the `path` in the answer of the first post. Between the two posts
(about the time of one upload of 5 MB) `/` on such a Brain serves the verify page.

Not chosen: a method of another name (`infra.verifyShell`), which an old deployer answers 501 and
which has no such window. The spec names `infra.shell?name=verify`, and the owner's order in
`dv-4-owner-install-and-shell` is `install-deployer` before `shell`.

### Tests

The three new cells were written first, with the hook in `fakeCloudflare`, and run against the
deployer's code as it was:

```
cd $W/cloud-brain-dev && bun test.ts @tomlarkworthy/brain-deployer --with $W/tools/cloud-brain/.emitted/dv-3-deployer-opens-verify-html.js
before the change to verifyDeploy and shell   "passed":53,"failed":3,"needsBrowser":0
after, and after the rebase of 15:40          "passed":56,"failed":0,"needsBrowser":0   (6 runs after the rebase, the same line each)
```

`test.ts brain-deployer` answers "--with takes a Worker of one module, or the module's name"; the
module's name is what runs.

In a browser, the notebook built in the worktree after the rebase, layout
`C100(S70(@tomlarkworthy/brain-deployer),S30(@tomlarkworthy/claude-code-pairing))`, the snippet of
step 8 of the implementer's brief, once: `[56,[],"Chrome/151.0.7922.34"]`. 56 tests, none failed.

`brain.ts`:

```
cd $W && bun test ./tests/tools/brain-shell-posts-both.test.ts                            6 pass, 0 fail
BRAIN_TS=<root>/tools/cloud-brain/brain.ts bun test ./tests/tools/brain-shell-posts-both.test.ts   0 pass, 6 fail   (main's brain.ts)
cd $W && bun test ./tests/tools                                                           136 pass, 0 fail, 16 files
```

### Not tried

- **Nothing was run on cb4.** No `install-deployer`, no `brain.ts shell`, no put of
  `shell/verify.html`. The deployer there is `74e7e27c911d`, without this change.
- The call `verifyPage` makes, through the real core to the real brain-static. Read from the seeds
  (above), run only against the rig's stand-in.
- A run at `/static/shell/verify.html#view=…&verify=WORKER` with the built `verify.html`. The spec
  has `/static/shell/index.html#view=…&verify=brain-x-logs` giving 7 of 7 at 12:09:42 CEST, and
  `dv-2-build-writes-verify-html` has `verify.html` in the place of `/` giving 95 of 95; the two
  together were not run. `verify-run.ts` opens `/` and was not changed.
- `static.delete { path: "shell/verify.html" }` from the owner's session. The spec has it under "Not known"; it was not run here either.
- Chrome 128, the cluster's browser. As in the spec, "Not known".
- `verify-run.ts brain-deployer --shell … --times 1` (the brief's 20 runs at the deployer's
  address): the page answers `"none":"the Worker did not say what it runs"`. The deployer is not
  verified by a run, so the new cells have no run of that kind.
- Whether the file is public, or is a shell, is not checked by the deployer. `infra.shell` always
  puts it public. A file made private afterwards (`static.setPublic`) answers the browser 401, the
  run gives no verdict, and the Worker is put back at 10 minutes; `static.delete` is the way out.
- The cost of the `static.get`: brain-static reads the 5 MB file to answer, and the deployer
  cancels the body. Not measured. `static.list?prefix=shell/verify.html` would answer a row and no
  file; the spec names `static.get`.
- The window on a deployer from before this change (above) was shown with a stand-in that answers
  as that deployer does, not with that deployer.

### For the owner, to turn it on (`dv-4-owner-install-and-shell`)

1. Read `git diff main...origin/bm/dv-3-deployer-opens-verify-html`, and merge it.
2. Build, and emit the deployer in a tab of that build to `.emitted/deployer.json`
   (`(await mod.value("deployer_service")).emit()`, posted to `test-receiver.ts`). No file was
   emitted from the branch: `.emitted/deployer.json` of the main checkout is as it was.
3. `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts install-deployer`. Nothing changes yet: with no
   file in brain-static the run opens `/`.
4. `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts shell`. This puts `shell/verify.html`, and the
   next deploy's line `deploy.verify` has `run: …/static/shell/verify.html#view=…`.
5. To turn it off: `static.delete { path: "shell/verify.html" }` in his own session.
