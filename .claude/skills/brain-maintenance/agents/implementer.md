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
5. **Reproduce before fixing**, where the issue describes behaviour: a test that fails for the
   reason the issue gives. If you cannot reproduce it, say so on the issue and stop.
6. **Fix it in the seed.** Never the notebook HTML, never the deployed text. Add or change a
   `test_*` cell in the same module so the defect cannot return unseen.
7. **Build:** `bun tools/cloud-brain/build.ts`.
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
   (10 of 10 for the tracker since 2026-10-10). Use it while working; the count you submit is the browser's.
9. **Emit** in that tab, then close it by name:
   `fetch("http://127.0.0.1:47814/<worker>.json", { method: "POST", body: JSON.stringify(await (await mod.value("<name>_service")).emit()) })`.
   Each `eval_code` is its own scope: repeat the two lines that find `rt` and `mod`. The file is
   named for the Worker and the cell for the service: for the tracker, `brain-x-issues.json` from
   `issues_service`. Apply the file you just posted; an older `issues.json` in `.emitted/` is refused.
   If nothing listens on 47814, start `bun tools/cloud-brain/test-receiver.ts` in the background.
10. **Deploy under the lock**, with a reason that names the issue:
    `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply <worker>.json --reason="<id>: …"`.
    Then `redistil` (the Worker's line reads `same`), `saw <worker>`, and for the tracker
    `curl "/xrpc/com.lopecode.brain.issue.verify?guards=true" --owner` (a read).
11. **Check it where it runs**, when that needs no owner act: one call that shows the new
    behaviour on cb4.
12. **Record it.** A dated section in `tools/cloud-brain/spec-as-built.md` (follow
    `.claude/skills/document/SKILL.md`): what changed, the test count, the hash, what was not
    tried. Commit `lopebooks` first (its hook may rewrite the `.json` beside the notebook;
    stage that and commit again), then `lopecode-dev` with the seed, `seen.json`, the record.
    Push both.
13. **Say it on the issue, then submit.**
    `ia comment` with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha>"},{"kind":"commit","value":"lopebooks@<sha>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. A change with no deploy (a doc, a test) has the commits only.

## What a reviewer will check

That the tests were run and by whom, that what is deployed is what the seed builds, and that the
record says what was not tried. On 2026-10-10 a session submitted three fixes with "not run: no
notebook runtime" and a module edited by hand after compiling; both were caught in review.
