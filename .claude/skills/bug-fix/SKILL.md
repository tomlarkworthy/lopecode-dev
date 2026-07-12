---
name: bug-fix
description: Use when the user asks to "fix this issue", "fix bug X", "/bug-fix <URL>", "/bug-fix <description>", or hands over either a GitHub issue URL or a free-form bug description for a lopecode/lopebooks bug. Two-phase: (Phase 1) sets up isolated git worktrees off latest `main`, reproduces the bug in Playwright Chromium, diagnoses it, authors the fix on the live runtime, captures the proposed change in the worktree, and opens a DRAFT PR with that single-file diff for human review — then STOPS. (Phase 2, after user approves in chat) pushes the cell to ObservableHQ via `lope-push-ws.js`, regenerates the canonical HTML via `lope-jumpgate.js`, propagates the module into every consumer notebook via `sync-module.ts`, runs targeted regression QA, and finalizes the PR. When an issue is supplied it is left OPEN until the human merges; `Fixes #N` auto-closes it on merge. When no issue is supplied, no issue is opened — the PR alone tracks the fix.
version: 0.5.0
---

# Fix a Lopecode Bug

A **two-phase** bug-fix, driven by **either** a GitHub issue URL **or** a free-form description from the user:

- **Phase 1 (pre-approval, no destructive actions):** Set up isolated git worktrees off the latest `main`, reproduce the bug, author the fix on the live runtime, capture the proposed cell into the worktree's canonical HTML, and open a **draft** PR with that single-file diff. Then **STOP** and ask the user to approve.
- **Phase 2 (after the user approves in chat):** Push the cell to ObservableHQ, re-jumpgate the canonical HTML, sync the regenerated module into every consumer notebook, run targeted regression QA, push the additional commits to the PR branch, and mark the PR ready for review.

If the bug came from a GitHub issue, it stays OPEN until the human merges — `Fixes #N` in the PR closes it on merge. If the bug came from a description, no issue is opened; the PR alone tracks the work.

## When to use

User provides **either** a GitHub issue URL (typically `tomlarkworthy/lopecode#N` or `tomlarkworthy/lopebooks#N`) **or** a free-form bug description and asks for a fix. **One bug-fix at a time per session** — the workflow rewrites HTML files that don't compose well in parallel. (The QA browser is no longer the bottleneck: `qa_*` tools take a `session` name for parallel independent browsers.) **Do not invoke this skill for QA-only requests** — use `qa-notebook` for those.

### `<id>` and `<slug>` conventions

Many steps below reference `<id>` and `<slug>` placeholders. Pick them once at the start of Phase 0 and reuse them for worktree paths, branch names, PR titles, and staging files:

- **Issue-driven:** `<id>` = the issue number (e.g. `163`); `<slug>` = short kebab-case label derived from the issue title (e.g. `drag-drops-clicks`). Branch name: `fix/issue-<id>-<slug>` (preserved for backwards compatibility with existing worktrees).
- **Description-driven:** `<id>` = the same `<slug>` (no separate number); branch name: `fix/<slug>`. Pick a short, descriptive kebab-case slug from the user's description and confirm it with them in one line if it's ambiguous. Worktree path is `worktrees/<slug>/<submodule>/`.

## Phase 0 — Understand the bug and set up worktrees

1. **Capture the bug report.**
   - **Issue-driven:** `gh issue view <URL>` — title, body, labels, comments, linked PRs. Note explicit repro steps and any named module/notebook.
     - **The title is the primary symptom; the body often describes related-but-different artifacts.** Before proposing a fix, verify your reproduction surfaces the exact behavior named in the title — not just the body's anecdote. If you can only reproduce the body, ask the user to clarify rather than shipping a fix that misses the title (e.g. on #163 the title was "⬇ drops most clicks" but the body focused on a 600 px visual jump — they share a root cause but a body-only fix would have left half the bug unfixed).
   - **Description-driven:** transcribe the user's description into a one-line symptom (becomes the working bug title) and an ordered list of repro steps as you understand them. If repro steps are missing or ambiguous, ask the user to clarify **before** opening any worktrees — speculative repro on a vague description usually wastes a Phase 1 cycle. Once you have a working title, pick `<slug>` from it and confirm with the user if non-obvious.
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
   git -C <submodule> fetch origin   # <submodule> = lopecode or lopebooks
   # Issue-driven:
   git -C <submodule> worktree add -B fix/issue-<id>-<slug> ../worktrees/<id>/<submodule> origin/main 2>&1 | grep -v '^Updating files:' | tail -3
   # Description-driven:
   git -C <submodule> worktree add -B fix/<slug> ../worktrees/<slug>/<submodule> origin/main 2>&1 | grep -v '^Updating files:' | tail -3
   ```
   - Creates `<repo-root>/worktrees/<id>/<submodule>/` with the fix branch checked out at `origin/main`.
   - The `grep -v '^Updating files:'` filter trims the per-file progress spam (1800+ lines for lopebooks). The relevant lines — the new branch name and the `HEAD is now at` confirmation — survive in `tail -3`.
   - **All edits, git operations, and tool calls (qa_open_notebook URLs, sync-module --source/--target, etc.) from now on use the worktree path.** Never write into the parent submodule's working tree — that has the user's in-flight work.

### Why worktrees?

- Isolates the fix from any in-flight work in the parent submodule (avoids the contamination from pre-existing local changes accidentally getting bundled into the PR).
- Lets the user keep using the parent checkout while the fix is in review.
- Cleanup is one command after merge: `git worktree remove worktrees/<id>/<submodule>`.

## Phase 1 — Reproduce, diagnose, propose (no destructive pushes)

1. **Reproduce the bug.**
   - `get_pairing_token` → `LOPE-PORT-XXXX`.
   - `qa_open_notebook(url=<paired URL>)` — the channel server now wires fakefs by default (shared root at `~/.cache/lopecode-fakefs`), so `window.showDirectoryPicker` is replaced with a synthetic FileSystemDirectoryHandle proxied to disk without an OS dialog. The "Pick sync directory" button just confirms the active root. (Default `headless: false` so the user can watch.) Override with an explicit `fakefs_root` only if you need an isolated path — otherwise the shared default is correct, including for parallel bug-fix sessions (per-notebook subdirs are keyed by notebook ID).
   - Walk the repro steps exactly (from the issue body or the user's description). Capture: failing screenshot, console excerpt from `qa_console_logs`, `get_variable` snapshots of the offending cells.
   - **If you cannot reproduce, stop.** Issue-driven: comment on the issue asking for clarification. Description-driven: ask the user directly in chat. Either way — don't author a speculative fix.

2. **Diagnose.** Use `list_cells`, `get_variable`, `eval_code` to narrow to a specific cell or set of cells. State the root cause in one sentence — that becomes the PR title.

3. **Arm file-sync (one eval_code).** With `fakefs_root` set, just programmatically click the file-sync UI:
   ```js
   eval_code:
     [...document.querySelectorAll("button")]
       .find(b => /Pick sync directory/i.test(b.textContent)).click();
     const cb = document.querySelector('input[type="checkbox"]');
     if (!cb.checked) cb.click();
   ```
   Verify with `get_variable("syncArmed", module="@tomlarkworthy/file-sync")` → `{armed: true}`. From here every `define_cell` on the changed module auto-writes its `.js` to `worktrees/<id>/.file-sync/<notebookId>/<moduleId>.js`, and direct `Edit`/`Write` on those `.js` files flows back into the runtime within ~1s.

4. **Author the fix.** Two equally good styles:
   - **Edit on disk** — once any `.js` exists for the target module under `<fakefs_root>/<notebookId>/`, use the `Edit` tool to surgically patch it. file-sync's poller picks it up and applies via `tag({source: "file-sync"})` so re-edits don't bounce. If the target module hasn't materialized yet, do one trivial `define_cell` first to seed it (or click the "Disassemble to disk" button to dump everything).
   - **Live edit via `define_cell`** — pass the full new cell source. file-sync writes it to disk on each change.
   Re-run the repro steps; confirm the bug is gone. Drain `qa_console_logs` — confirm no new errors. **Iterate until the live runtime is clean.**

5. **Capture the fix into the worktree's canonical HTML.** One command:
   ```bash
   bun tools/channel/sync-module.ts \
     --module @user/module-name \
     --source worktrees/<id>/.file-sync/<notebookId>/@user/module-name.js \
     --target worktrees/<id>/<submodule>/notebooks/@user_module-name.html
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
     --source worktrees/<id>/<submodule>/notebooks/<live-notebook>.html \
     --target worktrees/<id>/<submodule>/notebooks/@user_module-name.html
   # c) Revert the live-notebook's unrelated edits
   git -C worktrees/<id>/<submodule> checkout notebooks/<live-notebook>.html
   ```

6. **Open a DRAFT PR with that single-file change.** Commit message, branch name, and PR title differ by mode — issue-driven includes `(#<id>)` and `Fixes #<id>`; description-driven uses the slug alone and omits the `Fixes` line.
   ```bash
   cd worktrees/<id>/<submodule>
   git add notebooks/@user_module-name.html
   # Issue-driven commit + push:
   git commit -m "Fix: <one-line root cause> (#<id>) [proposal — awaiting approval]"
   git push -u origin fix/issue-<id>-<slug>
   # Description-driven commit + push:
   git commit -m "Fix: <one-line root cause> [proposal — awaiting approval]"
   git push -u origin fix/<slug>
   # Issue-driven PR:
   gh pr create --draft --title "Fix: <root cause> (#<id>)" --body "$(cat <<'EOF'
   Fixes #<id>.

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
   # Description-driven PR (no Fixes line — there's no issue to close):
   gh pr create --draft --title "Fix: <root cause>" --body "$(cat <<'EOF'
   **This PR is a proposal** — the canonical HTML has been updated with the new cell, but ObservableHQ has not been pushed and consumer notebooks have not been re-synced yet. After approval, those steps will run and additional commits will be pushed to this branch.

   ## Reported symptom
   <quote or paraphrase the user's description>

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

7. **Comment on the issue with the PR URL (issue-driven only — skip for description-driven).**
   ```bash
   gh issue comment <id> --body "Proposal up for review (DRAFT): <pr-url>"
   ```

8. **STOP.** Tell the user explicitly:
   > Proposed fix is up for review at `<pr-url>`. Reply **"approved"** (or any equivalent — "go ahead", "lgtm", etc.) once you've looked at the diff, and I'll push to ObservableHQ, regenerate the canonical HTML, and sync into all consumer notebooks. Reply with comments instead and I'll iterate.

   Do **NOT** proceed past this point until the user explicitly approves in chat. Phase 2 tasks stay `pending`. If the user requests changes, iterate from step 4 (re-author via Edit on the synced `.js` or `define_cell`; the next sync-module run picks up the new content; push another commit to the same branch).

## Phase 2 — After user approval: push to canonical + sync consumers

9. **Push the cell(s) to ObservableHQ.** Run from the project root (lope-push-ws.js resolves the toolchain notebook relative to cwd):
   ```bash
   cd /Users/tom.larkworthy/dev/lopecode-dev   # or wherever the project root is
   node --experimental-vm-modules tools/lope-push-ws.js \
     worktrees/<id>/<submodule>/notebooks/@user_module-name.html --module @user/module-name \
     --cells "<cell1>,<cell2>" \
     --target "https://observablehq.com/@user/module-name"
   ```
   - **Use `--cells`, not bulk replace.** Bulk delete-and-readd is destructive: any unpushed local cells on Observable will be wiped.
   - **Never combine `--cells` with `--no-delete`** — the script now refuses this, but the failure mode is silent duplicate insertion.
   - **`--cells` handles both modify *and* insert.** Pass a comma list of every cell you want pushed — existing names are `modify_node`'d in place, names that aren't on Observable yet are `insert_node`'d at the end. So a fix + a batch of new test cells is one `--cells "fix,test1,test2,..."` call. Imports are dropped when `--cells` is set (intentional, to avoid duplicate-import issues from whitespace-mismatched byte compares); see `knowledge/pushing-cells-to-observablehq.md` § "Gotchas with `--cells`".
   - **Anonymous cells (no parsable name) push via `--cells-match-body <substring>`.** Observable's compiler emits anon cells as `const _N = function _M(...) { ... }` where `_N` is a hash-based slot name with no stable identity across notebooks. `--cells` can't target them. Use `--cells-match-body "<unique substring of the cell body>"` — repeatable — to find the one existing node and the one decompiled cell containing the substring and `modify_node` in place. Modify-only; never inserts. Pick a substring distinctive enough to match exactly one cell on each side (the tool errors out on 0 or 2+ matches).
   - **Renaming a cell needs dependency-ordering, not `--cells`.** If the fix renames a cell (e.g. version-pinned name like `_inputs_0_11_0` → `_inputs_0_12_0`), `--cells` will both `modify_node` the old name and `insert_node` the new name — but it doesn't sequence consumers correctly, so consumers may transiently reference a missing dep. Use a custom WS script that issues `insert_node` for the new name first, modifies consumers to reference it, then `remove_node`s the old producer last.
   - **lope-push-ws.js doesn't parse `function _name(...)` declarations** ([lopecode-dev#18](https://github.com/tomlarkworthy/lopecode-dev/issues/18)). Its decompiler regex matches `const _name = function ...` only. The `@tomlarkworthy/bootloader` module uses bare `function _name` — running `--module @tomlarkworthy/bootloader` errors with "No variables extracted from module". For bootloader edits, skip lope-push-ws entirely and use a custom WS script (template: `worktrees/<id>/.fix-staging/push-bootloader.mjs` shape — `insert_node`/`modify_node`/`remove_node` ops over the documented WS protocol).
   - **Cookies-file is the canonical auth path.** Pass `--cookies-file tools/.observable-cookies.json` to `lope-push-ws.js`. The file is `{"T": "<value>", "I": "<value>"}` (object — NOT an array of cookie objects). Pasted from devtools → Application → Cookies → observablehq.com. The script does a fast-fail auth probe before any decompile, so an expired cookie surfaces in ~1s. If you find legacy `worktrees/<id>/.fix-staging/observable-cookies.json` files (older JSON-array format from previous bug-fix runs), ignore them; re-paste fresh ones into the canonical location. To convert legacy: `jq '{T: (map(select(.name=="T"))[0].value), I: (map(select(.name=="I"))[0].value)}' old.json > tools/.observable-cookies.json`. If auth still fails: see `knowledge/pushing-cells-to-observablehq.md` § "Auth fragility" (the bundled `--login --headed` flow is unreliable because headless Playwright wipes HttpOnly `T`/`I` cookies).

10. **Re-jumpgate the canonical notebook.** Pulls the freshly-pushed module back from Observable as the canonical bundle:

    **Pre-step — sync the fix into jumpgate.html if jumpgate bundles the changed module.** Otherwise jumpgate's bundled (pre-fix) copy will undo the fix in every export and the canonical HTML will keep showing the bug:
    ```bash
    # Check whether the changed module is bundled by jumpgate or bulk-jumpgate:
    grep -l 'id="@user/module-name"' \
      worktrees/<id>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html \
      worktrees/<id>/<submodule>/notebooks/@tomlarkworthy_bulk-jumpgate.html 2>/dev/null
    # If either matches, sync the fix in (the worktree's lopecode is the same submodule, so the change goes in the same PR):
    bun tools/channel/sync-module.ts \
      --module @user/module-name \
      --source worktrees/<id>/<submodule>/notebooks/@user_module-name.html \
      --target worktrees/<id>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html
    bun tools/channel/sync-module.ts \
      --module @user/module-name \
      --source worktrees/<id>/<submodule>/notebooks/@user_module-name.html \
      --target worktrees/<id>/<submodule>/notebooks/@tomlarkworthy_bulk-jumpgate.html
    # Also copy to the parent's lopecode/notebooks/@tomlarkworthy_jumpgate.html so lope-jumpgate.js
    # (which navigates to the parent's path, not the worktree) actually picks up the fix:
    cp worktrees/<id>/<submodule>/notebooks/@tomlarkworthy_jumpgate.html \
       lopecode/notebooks/@tomlarkworthy_jumpgate.html
    ```
    `@tomlarkworthy/exporter-3` is the most common case — every fix to it MUST go through this pre-step.

    Then jumpgate:
    ```bash
    node tools/lope-jumpgate.js \
      --source @user/module-name \
      --output worktrees/<id>/<submodule>/notebooks/@user_module-name.html
    ```
    After it finishes, restore the parent's jumpgate.html to keep the user's working tree clean (the worktree copy is what gets committed):
    ```bash
    git -C lopecode checkout -- notebooks/@tomlarkworthy_jumpgate.html
    ```

11. **Map blast radius — find every consumer notebook in this submodule's worktree:**
    ```bash
    grep -l "@user/module-name" worktrees/<id>/<submodule>/notebooks/*.html \
      | grep -v "@user_module-name.html$" > /tmp/consumers-<id>.txt
    ```
    If consumers exist in the *other* submodule too (lopecode vs lopebooks), repeat Phase 0 step 6 to create that worktree, then map blast radius there too.

12. **Sync the regenerated module into every consumer:**
    ```bash
    while IFS= read -r f; do
      bun tools/channel/sync-module.ts \
        --module @user/module-name \
        --source worktrees/<id>/<canonical-submodule>/notebooks/@user_module-name.html \
        --target "$f"
    done < /tmp/consumers-<id>.txt
    ```
    `sync-module.ts` reads the `<script id="@user/module-name">` block from the canonical HTML and upserts it into each consumer. If a consumer doesn't actually bundle the module (false-positive grep match), `sync-module.ts` skips it gracefully.

13. **Targeted QA — only the impacted features.** Reload the canonical worktree notebook clean (no live edits) and walk:
    - The exact controls/cells named in the issue or description → confirm fix.
    - **Direct downstream cells** — every cell whose `inputs` (per `list_cells`) include the changed cell.
    - **Shared-state neighbours** — controls that share mutables, file attachments, or `localStorage` keys.
    - The relevant happy-path + adversarial inputs from `qa/general.md` for the affected surface only.
    - Drain `qa_console_logs` after each interaction.
    - **If anything regresses, stop.** `git checkout` the affected HTMLs in the worktree and consider whether to revert the Observable push (usually yes — push the prior version back). Iterate from Phase 1 step 4.

14. **Verify consumer notebooks — calibrate effort to risk.** When consumer changes are pure `tools/channel/sync-module.ts` `<script>`-block swaps with no rebuild step, the canonical-bundle verification from step 13 is sufficient — `sync-module` is mechanical and well-tested. Skip per-consumer browser QA unless the changed module's API surface, imports, or dependency graph shifted (e.g. added a new import bridge, renamed an exported cell). If browser QA flakes (channel disconnects, navigation timeouts), don't burn time re-opening — the canonical regenerated bundle is the source of truth and consumer copies are byte-identical at the `<script id="@user/module">` block. The user *will* notice 30+ minutes of fruitless browser-restart loops; bias toward shipping.

15. **Commit + push the regenerated bundle and consumer syncs to the PR branch.**
    ```bash
    cd worktrees/<id>/<submodule>
    git add notebooks/
    git commit -m "Push to ObservableHQ + sync into consumers"
    # Issue-driven: branch is fix/issue-<id>-<slug>. Description-driven: branch is fix/<slug>.
    git push origin <branch>
    ```
    If consumers exist in another submodule, do the same in its worktree and **open a separate companion PR** there (one PR per submodule).

16. **Mark PR ready for review:**
    ```bash
    gh pr ready <num>
    ```

17. **Merge.** Use `gh pr merge <num> --repo <owner>/<repo> --squash --admin`. If GitHub returns HTTP 500 (or `gh` repeats `GraphQL: Something went wrong while executing your query`) on a *large* sync PR (lopebooks consumer syncs are commonly 78K+ insertions across 155 files), retry the lopebooks side via:
    1. `git -C worktrees/<id>/lopebooks fetch origin main`
    2. `git -C worktrees/<id>/lopebooks reset --hard origin/main` (discards stale base; conflicts on consumer-syncs would be identical changes anyway since they all sync the same module)
    3. Re-run the `sync-module.ts --module @user/module --source <canonical> --target "worktrees/<id>/lopebooks/notebooks/*.html"` command from step 12
    4. Re-commit + `git push --force-with-lease`
    5. Retry `gh pr merge` — the fresh diff (only the post-rebase delta) is small enough for GitHub's merge endpoint to accept.

    The root cause is server-side: GitHub 5xx's the merge API when the squashed diff payload exceeds some internal limit. Rebasing onto fresh main shrinks the diff to just the genuinely new content. Verify with `gh pr view <num> --json state` — expect `MERGED`.

18. **Fast-forward the user's local submodule and verify the fix is on disk.** A merged PR only lives on GitHub — the user's primary `<submodule>/` working tree still points at the pre-fix `HEAD`, so when they re-open the notebook from disk the bug is still there. For each submodule touched by the fix:
    ```bash
    git -C <submodule> fetch origin
    git -C <submodule> merge --ff-only origin/main   # non-destructive: aborts on any conflict or untracked-overwrite
    ```
    - **`--ff-only` is safe to attempt unconditionally** — it only moves HEAD forward and git aborts (touching nothing) if a local commit diverges, a modified tracked file would be overwritten, or an incoming file would clobber an untracked one. So don't gate it behind a dirtiness check: uncommitted junk (`.DS_Store`) or unrelated untracked files (the user's in-flight notebooks) do **not** block a ff and must not stop you.
    - **If it succeeds:** done — the user's in-flight files are untouched.
    - **If it fails:** *now* surface it. Show `git -C <submodule> status --porcelain` + the error and ask how to proceed (rebase local commits, stash+pull+pop, discard, or pause). Only a genuine conflict reaches here.

    After the fast-forward, grep the on-disk canonical HTML for a string unique to the fix (a new identifier, a renamed function, the removed buggy call — whichever was the visible change in the PR diff). Confirm the post-fix code is present. If the grep returns the pre-fix code instead, jumpgate or sync-module silently missed the file; investigate before declaring done.

    **Parent-repo submodule pointer:** the parent (`lopecode-dev`) pins `lopebooks` / `lopecode` at a specific commit. After fast-forwarding the submodule, `git -C <parent> status` will show `modified: <submodule> (new commits)`. **Commit the pointer bump by default** — `git add <submodule>` stages only the gitlink (the submodule's checked-out commit SHA), never the parent's other modified/untracked files, so a targeted `git add <submodule1> <submodule2> && git commit -m "Bump submodules: <fix summary> (#<pr-num>)"` is surgical and safe even when the parent has unrelated in-flight work. (A dirty submodule showing "contains modified content" is fine — the gitlink records only the commit, not the untracked files inside.) The one case to pause and ask: the parent is mid-rebase/merge or on a shared branch where an extra commit would be unwelcome. Without this bump, anyone running `git submodule update` rolls the user back to the pre-fix commit.

19. **Update the issue comment** with confirmation that ObservableHQ + all consumers are synced and the PR is ready. **Issue-driven only — for description-driven fixes, skip this step (the PR description carries the same information).**

20. **`qa_close()`**.

## Cleanup (after merge)

```bash
cd <submodule>
git worktree remove worktrees/<id>/<submodule>
git fetch --prune origin   # also drops the merged remote branch reference
```

## Tips

- **Approval is the only gate between Phase 1 and Phase 2.** Do not run `lope-push-ws.js` (or any ObservableHQ-mutating action) until the user explicitly approves in chat. Pushing speculatively pollutes the canonical source and the regeneration round-trip will mask the real bug.
- **Always work in a worktree.** Never commit in the parent submodule's working tree — that's the user's. If you accidentally do, `git stash && git checkout -- .` and retry inside the worktree.
- **Use file-sync (default fakefs), not `export_notebook`.** The channel server wires fakefs by default to `~/.cache/lopecode-fakefs`. From there, every `define_cell` writes the changed module to disk as a `.js` file, and `Edit` on a `.js` flows back into the runtime — both directions, no OS dialogs, no human gestures. After arming "Sync enabled" in the file-sync panel and clicking "Disassemble to disk", the .js for your module lives at `~/.cache/lopecode-fakefs/<notebookId>/<moduleId>.js`. `export_notebook` is the fallback only if file-sync misbehaves; it dumps the whole HTML so you have to extract the one module via `sync-module.ts` and `git checkout` the noise.
- **Diffs are large but readable.** Regenerated `.html` files are 1–3 MB but uncompressed, so `git diff` works. Only the changed module's `<script>` block should differ — if other regions of the HTML moved, jumpgate produced a non-deterministic re-bundle and you should investigate before committing.
- **`Fixes #N` only auto-closes same-repo issues** (issue-driven mode only — description-driven PRs have no issue to close). Use `Fixes <owner>/<repo>#<N>` for cross-repo. Either way, leave the close to the human.
- **Don't push to Observable for a fix you can't reproduce.** Speculative fixes pollute the canonical source. This applies equally to issue-driven and description-driven fixes — vague descriptions are the most common path into a speculative fix.
- **Adversarial inputs from `qa/general.md` criterion #10 are over-kill for targeted regression.** Stick to the failure modes the changed cell could plausibly produce — full adversarial passes belong in `qa-notebook`.
- **One browser, one notebook.** Don't navigate the QA browser to a different URL mid-session; close and re-open. The pairing breaks on navigation.
- **If `sync-module.ts` reports the consumer doesn't have the module's `<script>` block, that consumer doesn't actually bundle it** (false-positive grep match — e.g. the module name appears only in a comment). Skip it.
- **Very large PRs may fail to merge via the API/UI** (GitHub times out on > 20K-line diffs). If the user asks you to merge, fall back to local merge + push: `git fetch origin && git checkout main && git pull && git merge --no-ff <branch> && git push origin main`. The PR auto-closes when its HEAD is reachable from `main`.
