# Implementer brief

You take one issue of the Cloud Brain tracker on `cb4` from `ready` to `in-review`. Your prompt
names the issue. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Your token is `issues-implementer-2`. Shorthand below: `ia` is
`tools/cloud-brain/issue-as.sh issues-implementer-2`.

## Steps

1. **Read the issue.** `ia "get?id=<id>"`: the issue and every event on it. If it came back from
   review, the reviewer's findings are the `reviewed` events; fix those and nothing else.
2. **Read the code it is about.** The source of a service is its seed, `tools/cloud-brain/<name>.ojs`.
   The first `md` cell is its method reference. `spec-as-built.md` has the history.
3. **Decide whether it is yours.** Stop, comment with what you found, add the label
   `needs-owner`, and report, when any of these is true:
   - the fix needs something in the Never list of the rules;
   - there is more than one reasonable behaviour and the issue does not choose;
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
   `git status` fails in the worktree (the submodules are links); `git diff`, `git add <file>`
   and `git commit` work.
5. **Reproduce before fixing**, where the issue describes behaviour: a test that fails for the
   reason the issue gives. If you cannot reproduce it, say so on the issue and stop.
6. **Fix it in the seed.** Never the notebook HTML, never the deployed text. Add or change a
   `test_*` cell in the same module so the defect cannot return unseen.
7. **Build** in the worktree, to a file of its own:
   `cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`.
   Without `--out` it refuses there.
8. **Run the module's tests in a browser.** Open a QA tab with a session name of your own
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
   `run_tests` hangs on this notebook; do not use it. Do not define the observers inside the
   module under test: they would be written into the deployed source.
   `bun tools/lope-tests.ts <notebook> --filter test_<service>` runs the same cells with no browser
   (11 of 11 for the tracker at 2026-10-10 18:42; each test added raises it). Use it while working;
   the count you submit is the browser's. It prints a thrown assertion as a timeout with no
   message: to read which assertion failed, run the snippet above in the tab (its `bad` list has
   the message), or put a `try/catch` round the test body for that run and take it out again.
   In the worktree the notebook is `$W/tools/cloud-brain/.emitted/cloud-brain.html`. When the
   tests pass there, commit the seed in the worktree (`git add` the files, `git commit`).
9. **Make it ready to land, still in the worktree and with no lock.** Since 2026-10-10 19:33 the
   lock covers the deploy and the push only; before that the second test run, the emit and the
   record were inside it and writers queued (Tom: "Issue completetion is bottlneck").
   - **Record it** in a file of the issue's own, `tools/cloud-brain/records/<id>.md` (follow
     `.claude/skills/document/SKILL.md`): what changed, the test count, what was not tried. A
     second round adds a dated section to the same file. Every time in it is read from
     `git log --format=%ci`, an event's `at` or `date`, never estimated. Not `spec-as-built.md`:
     every writer appended there and the cherry-picks met. The deploy hash and the commits are
     the refs of the submit, not part of the record. Commit it with the seed.
   - **Bring the worktree up to `main`:** `git -C $W rebase main`, then `tools/cloud-brain/worktree.sh <id>`
     again (it puts the submodule links back if the rebase removed them). A conflict means
     another writer changed the same lines: resolve it in the seed, never in the notebook.
   - **If the rebase brought in anything**, build and run step 8 again in the worktree. The count
     you submit is the last run on the tip you land.
   - **Emit** in that tab, to a file named for the issue, then close the tab by name:
     `fetch("http://127.0.0.1:47814/<id>-<worker>.json", { method: "POST", body: JSON.stringify(await (await mod.value("<name>_service")).emit()) })`.
     Each `eval_code` is its own scope: repeat the two lines that find `rt` and `mod`. The cell
     is named for the service: for the tracker, `issues_service`, Worker `brain-x-issues`.
     If nothing listens on 47814, start `bun tools/cloud-brain/test-receiver.ts` in the background.
     A change with no deploy (a doc, a test, a local tool) emits nothing.
10. **Land it. One writer lands at a time, in the main checkout.** Note `date` when you take the
    lock and when you remove it, and put both in your report.
    - Take the landing lock: `mkdir <root>/tools/cloud-brain/.emitted/land.lock`. If it exists,
      another writer is landing: wait with a background command
      (`until mkdir …/land.lock 2>/dev/null; do sleep 20; done`, `run_in_background`; a foreground
      `sleep` is blocked) and carry on when it returns. Do not remove a lock you did not make.
    - `git -C <root> merge-base --is-ancestor main bm/<id>`. If it fails, `main` moved while you
      waited and what you emitted is not built on it: `rmdir` the lock, go back to step 9's
      rebase, and come back. Never apply a file emitted before the last rebase; it would deploy
      the Worker without the other writer's change.
    - `git -C <root> merge --ff-only bm/<id>`, then `bun tools/cloud-brain/build.ts` there (2 s).
      The tests are not run again: the seeds are the ones you tested.
    - Deploy under the deploy lock (`cb4.lock`, inside the landing lock), with a reason that names the issue:
      `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply <id>-<worker>.json --reason="<id>: …"`.
      Then `redistil` (the Worker's line reads `same`), `saw <worker>`, and for the tracker
      `curl "/xrpc/com.lopecode.brain.issue.verify?guards=true" --owner` (a read).
    - Commit `lopebooks` first (its hook may rewrite the `.json` beside the notebook; stage that
      and commit again), then `seen.json` in `lopecode-dev`. Push both.
    - `rmdir …/land.lock`, then `tools/cloud-brain/worktree.sh --remove <id>`.
      If you stop for any reason while holding the lock, remove it first and say so in your report.
11. **Check it where it runs**, after the lock is gone, when that needs no owner act: one call
    that shows the new behaviour on cb4. When it needs one (`issue.rebuild`, `issue.install`, a move the workflow
    keeps for the owner, anything the Never list of the rules names), send no call, with any
    token: a refusal is still a forbidden call. Write "not run on cb4: needs the owner present"
    in the comment, with the call the owner would make.
12. **Say it on the issue, then submit.**
    `ia comment` with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha>"},{"kind":"commit","value":"lopebooks@<sha>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. A change with no deploy (a doc, a test) has the commits only.

## What a reviewer will check

That the tests were run and by whom, that what is deployed is what the seed builds, and that the
record says what was not tried. On 2026-10-10 a session submitted three fixes with "not run: no
notebook runtime" and a module edited by hand after compiling; both were caught in review.
