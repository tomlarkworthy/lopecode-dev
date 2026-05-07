---
name: bug-fix
description: Use when the user asks to "fix this issue", "fix bug X", "/bug-fix <URL>", or hands over a GitHub issue URL for a lopecode/lopebooks bug. Two-phase: (Phase 1) sets up isolated git worktrees off latest `main`, reproduces the bug in Playwright Chromium, diagnoses it, authors the fix on the live runtime, captures the proposed change in the worktree, and opens a DRAFT PR with that single-file diff for human review — then STOPS. (Phase 2, after user approves in chat) pushes the cell to ObservableHQ via `lope-push-ws.js`, regenerates the canonical HTML via `lope-jumpgate.js`, propagates the module into every consumer notebook via `sync-module.ts`, runs targeted regression QA, and finalizes the PR. The issue is left OPEN until the human merges; `Fixes #N` auto-closes it on merge.
version: 0.3.0
---

# Fix a Lopecode Bug from a GitHub Issue

A **two-phase** bug-fix:

- **Phase 1 (pre-approval, no destructive actions):** Set up isolated git worktrees off the latest `main`, reproduce the bug, author the fix on the live runtime, capture the proposed cell into the worktree's canonical HTML, and open a **draft** PR with that single-file diff. Then **STOP** and ask the user to approve.
- **Phase 2 (after the user approves in chat):** Push the cell to ObservableHQ, re-jumpgate the canonical HTML, sync the regenerated module into every consumer notebook, run targeted regression QA, push the additional commits to the PR branch, and mark the PR ready for review.

The issue stays OPEN until the human merges — `Fixes #N` in the PR closes it on merge.

## When to use

User provides a GitHub issue URL (typically `tomlarkworthy/lopecode#N` or `tomlarkworthy/lopebooks#N`) and asks for a fix. **One bug-fix at a time per session** — the channel is single-page and the workflow rewrites HTML files that don't compose well in parallel. **Do not invoke this skill for QA-only requests** — use `qa-notebook` for those.

## Phase 0 — Read the issue and set up worktrees

1. **Read the issue.** `gh issue view <URL>` — title, body, labels, comments, linked PRs. Note explicit repro steps and any named module/notebook.
   - **The title is the primary symptom; the body often describes related-but-different artifacts.** Before proposing a fix, verify your reproduction surfaces the exact behavior named in the title — not just the body's anecdote. If you can only reproduce the body, ask the user to clarify rather than shipping a fix that misses the title (e.g. on #163 the title was "⬇ drops most clicks" but the body focused on a 600 px visual jump — they share a root cause but a body-only fix would have left half the bug unfixed).
2. **Identify the canonical module.** Most bugs trace to a single Observable module. If the issue names it ("in editor-5"), you're done. Otherwise:
   - `grep -l "<symptom keyword>" lopecode/notebooks/*.html lopebooks/notebooks/*.html`
   - `bun tools/lope-reader.ts <suspect.html>` to list modules; `--get-module @user/foo` to read source.
3. **Read `qa/per-notebook/<slug>.md`** if it exists — prior knowledge on this notebook's quirks, controls, known issues. (`<slug>` = the notebook's basename, e.g. `editor-5`.)
4. **Re-read `qa/general.md`** — the targeted QA at the end uses the same vocabulary as a full QA pass. Don't rely on memory.
5. **Skim the relevant `knowledge/*.md`:**
   - `pushing-cells-to-observablehq.md` — `lope-push-ws.js` flags, auth flow.
   - `maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` — `lope-jumpgate.js`, file-naming convention, sync-module workflow.
6. **Create a fresh worktree off latest `origin/main` for each submodule the fix may touch.** Start with the submodule that holds the canonical notebook for the affected module; add the other if blast-radius mapping reveals consumers there.
   ```bash
   cd <submodule>                       # lopecode or lopebooks
   git fetch origin
   git worktree add -B fix/issue-<N>-<slug> ../worktrees/<N>/<submodule> origin/main
   ```
   - Creates `<repo-root>/worktrees/<N>/<submodule>/` with branch `fix/issue-<N>-<slug>` checked out at `origin/main`.
   - **All edits, git operations, and tool calls (qa_open_notebook URLs, sync-module --source/--target, etc.) from now on use the worktree path.** Never write into the parent submodule's working tree — that has the user's in-flight work.

### Why worktrees?

- Isolates the fix from any in-flight work in the parent submodule (avoids the contamination from pre-existing local changes accidentally getting bundled into the PR).
- Lets the user keep using the parent checkout while the fix is in review.
- Cleanup is one command after merge: `git worktree remove worktrees/<N>/<submodule>`.

## Phase 1 — Reproduce, diagnose, propose (no destructive pushes)

1. **Reproduce the bug.**
   - `get_pairing_token` → `LOPE-PORT-XXXX`.
   - `qa_open_notebook(url=<paired URL>)` — the channel server now wires fakefs by default (shared root at `~/.cache/lopecode-fakefs`), so `window.showDirectoryPicker` is replaced with a synthetic FileSystemDirectoryHandle proxied to disk without an OS dialog. The "Pick sync directory" button just confirms the active root. (Default `headless: false` so the user can watch.) Override with an explicit `fakefs_root` only if you need an isolated path — otherwise the shared default is correct, including for parallel bug-fix sessions (per-notebook subdirs are keyed by notebook ID).
   - Walk the issue's repro steps exactly. Capture: failing screenshot, console excerpt from `qa_console_logs`, `get_variable` snapshots of the offending cells.
   - **If you cannot reproduce, stop.** Comment on the issue asking for clarification — don't author a speculative fix.

2. **Diagnose.** Use `list_cells`, `get_variable`, `eval_code` to narrow to a specific cell or set of cells. State the root cause in one sentence — that becomes the PR title.

3. **Arm file-sync (one eval_code).** With `fakefs_root` set, just programmatically click the file-sync UI:
   ```js
   eval_code:
     [...document.querySelectorAll("button")]
       .find(b => /Pick sync directory/i.test(b.textContent)).click();
     const cb = document.querySelector('input[type="checkbox"]');
     if (!cb.checked) cb.click();
   ```
   Verify with `get_variable("syncArmed", module="@tomlarkworthy/file-sync")` → `{armed: true}`. From here every `define_cell` on the changed module auto-writes its `.js` to `worktrees/<N>/.file-sync/<notebookId>/<moduleId>.js`, and direct `Edit`/`Write` on those `.js` files flows back into the runtime within ~1s.

4. **Author the fix.** Two equally good styles:
   - **Edit on disk** — once any `.js` exists for the target module under `<fakefs_root>/<notebookId>/`, use the `Edit` tool to surgically patch it. file-sync's poller picks it up and applies via `tag({source: "file-sync"})` so re-edits don't bounce. If the target module hasn't materialized yet, do one trivial `define_cell` first to seed it (or click the "Disassemble to disk" button to dump everything).
   - **Live edit via `define_cell`** — pass the full new cell source. file-sync writes it to disk on each change.
   Re-run the issue's repro steps; confirm the bug is gone. Drain `qa_console_logs` — confirm no new errors. **Iterate until the live runtime is clean.**

5. **Capture the fix into the worktree's canonical HTML.** One command:
   ```bash
   bun tools/channel/sync-module.ts \
     --module @user/module-name \
     --source worktrees/<N>/.file-sync/<notebookId>/@user/module-name.js \
     --target worktrees/<N>/<submodule>/notebooks/@user_module-name.html
   ```
   `<notebookId>` = the basename of the live notebook's HTML without `.html` (e.g. `@tomlarkworthy_blank-notebook`). `sync-module.ts` accepts a `.js` source and upserts it as the `<script id="@user/module-name">` block in the target. No `export_notebook`, no `git checkout` revert — the `.file-sync/` directory is untracked working state, never committed (add to `.gitignore` if it sticks around between runs).
   - The canonical HTML now has only the targeted module change (~113-line diff inside the `<script id="@user/module-name">` block); nothing else in the worktree should have changed.
   - **Watch out: the file-sync disassembler skips closure-style import bridges.** If your fix adds a new import via `define_cell` (e.g. `import {acorn, escodegen} from "@tomlarkworthy/observablejs-toolchain"`), the runtime *has* the bridge but the disassembled `.js` is missing the corresponding `main.define("acorn", ["module @user/source", "@variable"], (_, v) => v.import("acorn", _));` lines. The .js will be non-loadable as-is. After Disassemble, grep the bottom of the `.js` for `main.define("<your-import>"` — if missing, hand-add the line(s) before `sync-module.ts`. (See the open issue tracking the underlying disassembler gap.)

   **Fallback — export-and-revert dance.** Use only if the channel doesn't support `fakefs_root` (older `@lopecode/channel` versions):
   ```bash
   # a) Write the live runtime to the live notebook in the worktree (transient — reverted at end)
   ```
   ```
   export_notebook   # MCP tool — writes to the worktree's currently-paired notebook
   ```
   ```bash
   # b) Copy ONLY the changed module's <script> block from live notebook into the canonical HTML
   bun tools/channel/sync-module.ts \
     --module @user/module-name \
     --source worktrees/<N>/<submodule>/notebooks/<live-notebook>.html \
     --target worktrees/<N>/<submodule>/notebooks/@user_module-name.html
   # c) Revert the live-notebook's unrelated edits
   git -C worktrees/<N>/<submodule> checkout notebooks/<live-notebook>.html
   ```

6. **Open a DRAFT PR with that single-file change.**
   ```bash
   cd worktrees/<N>/<submodule>
   git add notebooks/@user_module-name.html
   git commit -m "Fix: <one-line root cause> (#<N>) [proposal — awaiting approval]"
   git push -u origin fix/issue-<N>-<slug>
   gh pr create --draft --title "Fix: <root cause> (#<N>)" --body "$(cat <<'EOF'
   Fixes #<N>.

   **This PR is a proposal** — the canonical HTML has been updated with the new cell, but ObservableHQ has not been pushed and consumer notebooks have not been re-synced yet. After approval, those steps will run and additional commits will be pushed to this branch.

   ## Root cause
   <one-paragraph explanation>

   ## Fix
   <what changed and why — quote the new cell snippet inline if it's small>

   ## Targeted QA (live runtime)
   - <controls re-verified, ✅ each>
   - Console: clean
   EOF
   )"
   ```
   The PR diff is one file, ~113–200 lines. Easy to review.

7. **Comment on the issue with the PR URL.**
   ```bash
   gh issue comment <N> --body "Proposal up for review (DRAFT): <pr-url>"
   ```

8. **STOP.** Tell the user explicitly:
   > Proposed fix is up for review at `<pr-url>`. Reply **"approved"** (or any equivalent — "go ahead", "lgtm", etc.) once you've looked at the diff, and I'll push to ObservableHQ, regenerate the canonical HTML, and sync into all consumer notebooks. Reply with comments instead and I'll iterate.

   Do **NOT** proceed past this point until the user explicitly approves in chat. Phase 2 tasks stay `pending`. If the user requests changes, iterate from step 4 (re-author via Edit on the synced `.js` or `define_cell`; the next sync-module run picks up the new content; push another commit to the same branch).

## Phase 2 — After user approval: push to canonical + sync consumers

9. **Push the cell(s) to ObservableHQ.** Run from the project root (lope-push-ws.js resolves the toolchain notebook relative to cwd):
   ```bash
   cd /Users/tom.larkworthy/dev/lopecode-dev   # or wherever the project root is
   node --experimental-vm-modules tools/lope-push-ws.js \
     worktrees/<N>/<submodule>/notebooks/@user_module-name.html --module @user/module-name \
     --cells "<cell1>,<cell2>" \
     --target "https://observablehq.com/@user/module-name"
   ```
   - **Use `--cells`, not bulk replace.** Bulk delete-and-readd is destructive: any unpushed local cells on Observable will be wiped.
   - **Never combine `--cells` with `--no-delete`** — the script now refuses this, but the failure mode is silent duplicate insertion.
   - **`--cells` is matched-name-only.** New cells (not already on Observable) are *silently skipped* with a warning; modified imports whose text changed don't byte-match either. For those, hand-write a small mjs script that does `modify_node` (existing import) and `insert_node` (new cell) over the WS protocol — see `knowledge/pushing-cells-to-observablehq.md` § "Gotchas with `--cells`".
   - **Renaming a cell needs `insert_node` + `remove_node`, not `--cells`.** If the fix renames a cell (e.g. version-pinned name like `_inputs_0_11_0` → `_inputs_0_12_0`), `--cells` can't express the operation: it `modify_node`s the old name (still on Observable, body changes) and silently skips the new one (not yet on Observable, gets warned-and-dropped). Result: the rename half-applies, the bootloader still defines the old cell, and consumers break. Use a custom WS script that issues `insert_node` for the new name first, then `remove_node` for the old. Sequence the ops in dependency order: insert the new producer, modify any consumers (so they reference the new name), then remove the old producer last so dependents never see a missing dep mid-push.
   - **lope-push-ws.js doesn't parse `function _name(...)` declarations** ([lopecode-dev#18](https://github.com/tomlarkworthy/lopecode-dev/issues/18)). Its decompiler regex matches `const _name = function ...` only. The `@tomlarkworthy/bootloader` module uses bare `function _name` — running `--module @tomlarkworthy/bootloader` errors with "No variables extracted from module". For bootloader edits, skip lope-push-ws entirely and use a custom WS script (template: `worktrees/<N>/.fix-staging/push-bootloader.mjs` shape — `insert_node`/`modify_node`/`remove_node` ops over the documented WS protocol).
   - If auth fails: see `knowledge/pushing-cells-to-observablehq.md` § "Auth fragility" — the bundled `--login --headed` flow is unreliable (headless Playwright wipes HttpOnly `T`/`I` cookies). Workaround: paste cookies from devtools into `worktrees/<N>/.fix-staging/observable-cookies.json` and read them directly in your push script.

10. **Re-jumpgate the canonical notebook.** Pulls the freshly-pushed module back from Observable as the canonical bundle:

    **Pre-step — sync the fix into jumpgate.html if jumpgate bundles the changed module.** Otherwise jumpgate's bundled (pre-fix) copy will undo the fix in every export and the canonical HTML will keep showing the bug:
    ```bash
    # Check whether the changed module is bundled by jumpgate or bulk-jumpgate:
    grep -l 'id="@user/module-name"' \
      worktrees/<N>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html \
      worktrees/<N>/<submodule>/notebooks/@tomlarkworthy_bulk-jumpgate.html 2>/dev/null
    # If either matches, sync the fix in (the worktree's lopecode is the same submodule, so the change goes in the same PR):
    bun tools/channel/sync-module.ts \
      --module @user/module-name \
      --source worktrees/<N>/<submodule>/notebooks/@user_module-name.html \
      --target worktrees/<N>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html
    bun tools/channel/sync-module.ts \
      --module @user/module-name \
      --source worktrees/<N>/<submodule>/notebooks/@user_module-name.html \
      --target worktrees/<N>/<submodule>/notebooks/@tomlarkworthy_bulk-jumpgate.html
    # Also copy to the parent's lopecode/notebooks/@tomlarkworthy_jumpgate.html so lope-jumpgate.js
    # (which navigates to the parent's path, not the worktree) actually picks up the fix:
    cp worktrees/<N>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html \
       lopecode/notebooks/@tomlarkworthy_jumpgate.html
    ```
    `@tomlarkworthy/exporter-3` is the most common case — every fix to it MUST go through this pre-step.

    Then jumpgate:
    ```bash
    node tools/lope-jumpgate.js \
      --source @user/module-name \
      --output worktrees/<N>/<submodule>/notebooks/@user_module-name.html
    ```
    After it finishes, restore the parent's jumpgate.html to keep the user's working tree clean (the worktree copy is what gets committed):
    ```bash
    git -C lopecode checkout -- notebooks/@tomlarkworthy_jumpgate.html
    ```

11. **Map blast radius — find every consumer notebook in this submodule's worktree:**
    ```bash
    grep -l "@user/module-name" worktrees/<N>/<submodule>/notebooks/*.html \
      | grep -v "@user_module-name.html$" > /tmp/consumers-<N>.txt
    ```
    If consumers exist in the *other* submodule too (lopecode vs lopebooks), repeat Phase 0 step 6 to create that worktree, then map blast radius there too.

12. **Sync the regenerated module into every consumer:**
    ```bash
    while IFS= read -r f; do
      bun tools/channel/sync-module.ts \
        --module @user/module-name \
        --source worktrees/<N>/<canonical-submodule>/notebooks/@user_module-name.html \
        --target "$f"
    done < /tmp/consumers-<N>.txt
    ```
    `sync-module.ts` reads the `<script id="@user/module-name">` block from the canonical HTML and upserts it into each consumer. If a consumer doesn't actually bundle the module (false-positive grep match), `sync-module.ts` skips it gracefully.

13. **Targeted QA — only the impacted features.** Reload the canonical worktree notebook clean (no live edits) and walk:
    - The exact controls/cells named in the issue → confirm fix.
    - **Direct downstream cells** — every cell whose `inputs` (per `list_cells`) include the changed cell.
    - **Shared-state neighbours** — controls that share mutables, file attachments, or `localStorage` keys.
    - The relevant happy-path + adversarial inputs from `qa/general.md` for the affected surface only.
    - Drain `qa_console_logs` after each interaction.
    - **If anything regresses, stop.** `git checkout` the affected HTMLs in the worktree and consider whether to revert the Observable push (usually yes — push the prior version back). Iterate from Phase 1 step 4.

14. **Verify consumer notebooks — calibrate effort to risk.** When consumer changes are pure `tools/channel/sync-module.ts` `<script>`-block swaps with no rebuild step, the canonical-bundle verification from step 13 is sufficient — `sync-module` is mechanical and well-tested. Skip per-consumer browser QA unless the changed module's API surface, imports, or dependency graph shifted (e.g. added a new import bridge, renamed an exported cell). If browser QA flakes (channel disconnects, navigation timeouts), don't burn time re-opening — the canonical regenerated bundle is the source of truth and consumer copies are byte-identical at the `<script id="@user/module">` block. The user *will* notice 30+ minutes of fruitless browser-restart loops; bias toward shipping.

15. **Commit + push the regenerated bundle and consumer syncs to the PR branch.**
    ```bash
    cd worktrees/<N>/<submodule>
    git add notebooks/
    git commit -m "Push to ObservableHQ + sync into consumers"
    git push origin fix/issue-<N>-<slug>
    ```
    If consumers exist in another submodule, do the same in its worktree and **open a separate companion PR** there (one PR per submodule).

16. **Mark PR ready for review:**
    ```bash
    gh pr ready <num>
    ```

17. **Update the issue comment** with confirmation that ObservableHQ + all consumers are synced and the PR is ready.

18. **`qa_close()`**.

## Phase 3 — After merge: bump parent submodule pointer

Once the submodule PR merges, the parent `lopecode-dev` repo still points at the pre-fix commit. Bump it:

```bash
git -C <submodule> pull --ff-only origin main
git add <submodule>
git commit -m "Bump <submodule>: <one-line summary> (#<N>)"
git push origin main
```

If a companion submodule was synced in Phase 2 (e.g. lopebooks alongside lopecode), bump that pointer too. Without this step, anyone cloning fresh sees the bug — the submodule PR merge alone doesn't reach them.

## Cleanup (after Phase 3)

```bash
cd <submodule>
git worktree remove worktrees/<N>/<submodule>
git fetch --prune origin   # also drops the merged remote branch reference
```

## Tips

- **Approval is the only gate between Phase 1 and Phase 2.** Do not run `lope-push-ws.js` (or any ObservableHQ-mutating action) until the user explicitly approves in chat. Pushing speculatively pollutes the canonical source and the regeneration round-trip will mask the real bug.
- **Always work in a worktree.** Never commit in the parent submodule's working tree — that's the user's. If you accidentally do, `git stash && git checkout -- .` and retry inside the worktree.
- **Use file-sync (default fakefs), not `export_notebook`.** The channel server wires fakefs by default to `~/.cache/lopecode-fakefs`. From there, every `define_cell` writes the changed module to disk as a `.js` file, and `Edit` on a `.js` flows back into the runtime — both directions, no OS dialogs, no human gestures. After arming "Sync enabled" in the file-sync panel and clicking "Disassemble to disk", the .js for your module lives at `~/.cache/lopecode-fakefs/<notebookId>/<moduleId>.js`. `export_notebook` is the fallback only if file-sync misbehaves; it dumps the whole HTML so you have to extract the one module via `sync-module.ts` and `git checkout` the noise.
- **Diffs are large but readable.** Regenerated `.html` files are 1–3 MB but uncompressed, so `git diff` works. Only the changed module's `<script>` block should differ — if other regions of the HTML moved, jumpgate produced a non-deterministic re-bundle and you should investigate before committing.
- **Submodule pointer bump is Phase 3.** See above — it's part of the workflow now, not a follow-up.
- **`Fixes #N` only auto-closes same-repo issues.** Use `Fixes <owner>/<repo>#<N>` for cross-repo. Either way, leave the close to the human.
- **Don't push to Observable for a fix you can't reproduce.** Speculative fixes pollute the canonical source.
- **Adversarial inputs from `qa/general.md` criterion #10 are over-kill for targeted regression.** Stick to the failure modes the changed cell could plausibly produce — full adversarial passes belong in `qa-notebook`.
- **One browser, one notebook.** Don't navigate the QA browser to a different URL mid-session; close and re-open. The pairing breaks on navigation.
- **If `sync-module.ts` reports the consumer doesn't have the module's `<script>` block, that consumer doesn't actually bundle it** (false-positive grep match — e.g. the module name appears only in a comment). Skip it.
- **Very large PRs may fail to merge via the API/UI** (GitHub times out on > 20K-line diffs). If the user asks you to merge, fall back to local merge + push: `git fetch origin && git checkout main && git pull && git merge --no-ff <branch> && git push origin main`. The PR auto-closes when its HEAD is reachable from `main`.
