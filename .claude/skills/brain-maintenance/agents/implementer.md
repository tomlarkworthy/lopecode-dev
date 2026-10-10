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
2. **Read the code it is about.** The source of a service is its seed, `tools/cloud-brain/<name>.ojs`.
   The first `md` cell is its method reference. `spec-as-built.md` and `tools/cloud-brain/records/` have the history.
   What runs on cb4, when that is the question, is in your worktree after step 4:
   `$W/cloud-brain-dev/deploy/@tomlarkworthy/<module>.js`, with each Worker's hash in `deploy/services.json`.
   It is for reading. A change is made in the seed.
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
6. **Fix it in the seed.** Never the notebook HTML, never the deployed text. Add or change a
   `test_*` cell in the same module so the defect cannot return unseen.
   When the fix is in a local tool and no seed (`brain.ts`, `tools/lope-tests.ts`), the test is a
   file under `tests/` that `node --test` or `bun test` runs and that fails before the fix; its
   count is the one you submit, and steps 7 to 9 need no build, tab or emit. If the tool cannot
   be loaded by a test as it stands, say so in the comment with the commands you ran instead.
   A changed `brain.ts` is run from the worktree with
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`, never copied into the main checkout.
   `tests/tools/*.test.ts` run in the worktree; the count of `node --test tests/notebooks/*.test.js`
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
     `git log --format=%ci`, an event's `at` or `date`, never estimated. Not `spec-as-built.md`:
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
    - Take the landing lock: `mkdir <root>/tools/cloud-brain/.emitted/land.lock`. If it exists,
      another writer is landing: wait with a background command
      (`until mkdir …/land.lock 2>/dev/null; do sleep 20; done`, `run_in_background`; a foreground
      `sleep` is blocked) and carry on when it returns. Do not remove a lock you did not make.
    - `tools/cloud-brain/worktree.sh --rebase <id>` again: a writer that landed while you waited
      moved `main`. Look at what came in as in step 9. If it changed what your module is built from, what you emitted
      is stale: `rmdir` the lock, build, test and emit again, and come back. Never apply a file
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
    - Deploy under the deploy lock (`cb4.lock`, inside the landing lock), with a reason that names the issue:
      `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply <id>-<worker>.json --reason="<id>: …"`.
      Then `redistil` (the Worker's line reads `same`), `saw <worker>`, and for the tracker
      `curl "/xrpc/com.lopecode.brain.issue.verify?guards=true" --owner` (a read).
    - Commit `lopebooks` first (its hook may rewrite the `.json` beside the notebook; stage that
      and commit again), then `seen.json` and the `lopebooks` pointer in `lopecode-dev`. Push both.
    - With no deploy: lock, rebase, `merge --ff-only`, push, unlock. No build, apply or `lopebooks` commit.
    - `rmdir …/land.lock`.
    - After a deploy, with the lock gone and before the worktree goes: `cd $W/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>`.
      Its JSON line is the report of what now runs: `hash` is the hash you deployed, `failed` is 0.
      Put the line's counts in your comment. A `failed` here is a deployed defect: say so on the issue first.
      No JSON line: `sync.ts` printed `left out: <worker> …` (another deploy of it is under way); run both again.
    - `tools/cloud-brain/worktree.sh --remove <id>`.
      If you stop for any reason while holding the lock, remove it first and say so in your report.
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

## The tracker's write calls

Each is `ia <call> '<json>'`, and each takes a `key`. The shapes, from the tracker's own reference
(`getSource?worker=brain-x-issues&part=reference`, read 2026-10-10 23:30):

| Call | JSON |
|---|---|
| `open` | `{ key, title, body, kind, about, parent, labels, id }`. `about` is `brain` or a Worker's name; `id` is `a-z 0-9 -`, 40 at most. |
| `comment` | `{ key, id, body }` |
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
