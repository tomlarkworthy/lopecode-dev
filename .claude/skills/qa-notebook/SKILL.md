---
name: qa-notebook
description: Use when the user asks to "QA a notebook", "find issues in this notebook", "/qa-notebook", "smoke-test this notebook", or wants Claude to autonomously open a lopecode notebook in a browser, explore it, and report bugs. Drives the qa_* tools (Playwright Chromium) plus the existing lopecode introspection tools (list_cells, get_variable, watch_variable) to cross-check what the user sees against what the runtime thinks is happening. Anchors evaluation on qa/general.md and per-notebook guidance in qa/per-notebook/<slug>.md.
version: 0.2.0
---

# QA a Lopecode Notebook

A QA pass: open the notebook in a Playwright-driven Chromium, evaluate it against the criteria in `qa/general.md` plus any prior knowledge in `qa/per-notebook/<slug>.md`, and write a structured report. The QA browser pairs back to the channel via `cc=TOKEN`, so the same window is both the visible viewport (for `qa_screenshot` / `qa_click`) and the introspection target (for `list_cells` / `get_variable`).

## When to use

User asks to QA, smoke-test, exercise, or hunt bugs in a specific notebook HTML file. **Run multiple QA passes in parallel by spawning separate Claude Code sessions** (each with its own channel + browser). Don't try to QA two notebooks from one session — the channel is single-page.

## Before you start: load the criteria

1. **Read `qa/general.md`** — universal criteria every notebook is scored against. Re-read each pass; do not rely on memory.
2. **Check `qa/per-notebook/<slug>.md`** — where `<slug>` is the notebook's basename (e.g. `editor-5` for `@tomlarkworthy_editor-5.html`). If it exists, read it: it captures known issues, important interactions, and behavioral quirks from prior passes. If it doesn't exist, you'll create it at the end of the pass.
3. **Read the notebook's `bootconf.json`** sibling file to learn the intended hash layout. Reuse it (with `cc=TOKEN` appended) so you see what the user sees.

## The loop

1. **Get pairing token** — `get_pairing_token` returns `LOPE-PORT-XXXX`.
2. **Build the URL** — use the layout from `bootconf.json` if available, else default to:
   ```
   file:///absolute/path/to/@user_name.html#view=R100(@user/name)&open=@user/name&cc=TOKEN
   ```
   Always append `&cc=TOKEN` so the page pairs.
3. **Open it** — `qa_open_notebook(url)`. Default `headless: false` so the user can follow along. Wait until the call returns.
4. **Enumerate features.** Before running any criteria, take stock of what the notebook actually offers as a *user*:
   - Read the prose for every claim ("can edit any cell", "works offline", "supports auto-save").
   - List every interactive control: toolbar buttons, checkboxes, viewof inputs, drag handles, keyboard shortcuts, embedded forms.
   - List every named export (from `list_cells` / documented `import {…}` lines).
   - List any persisted state (mutables, file attachments, `local-change-history`, IndexedDB).
   - Cross-reference against `qa/per-notebook/<slug>.md` so you don't miss controls a prior pass already mapped out.

   The output of this step is a **feature inventory** — a flat list of testable surfaces. Don't skip controls because the per-notebook guidance is silent on them; that's how bugs hide. Per `qa/general.md` criterion #4, every control must be either exercised or explicitly skipped with a reason.

   **Diff the inventory against the documentation in both directions:**
   - *Documented but not implemented* — a claim in the prose with no corresponding control/export. Counts against criterion #3.
   - *Implemented but not documented* — a control or export that exists in the runtime but is never mentioned in the prose. Counts against criterion #5 as an *undocumented feature*. Flag each one in the report so a future pass either gets it documented or gets it removed. (Common offenders: toolbar buttons added without docstrings, keyboard shortcuts bound but never advertised, named exports that survived a refactor but were dropped from the README.)
5. **Build the test matrix as a task list.** For each feature in the inventory, create **two `TaskCreate` tasks**:
   - **Happy path** — does the feature do what it documents on a clean, well-formed input? (Click button, observe expected effect; type valid input, observe valid output; check the rendered DOM matches `get_variable`.)
   - **Adversarial** — try to make it fail. Pick the techniques that fit the surface:
     - *Repeat invocation* — click the same control twice fast on identical state (the #144 lesson — distinct invocations must produce distinguishable runtime entities, not collide).
     - *Empty / boundary input* — empty string, 0, very long string, special characters, non-ASCII.
     - *Out-of-order sequence* — A then B then A; undo-redo-undo; mutate then revert mid-operation.
     - *Concurrent firing* — two events in the same tick (rapid double-click, two viewof changes back-to-back).
     - *Persistence round-trip* — mutate, reload, verify state survived (or didn't, when it shouldn't have).
     - *Boundary-of-defined-domain* — invalid module name, missing dependency, deleted reference.

   Persist the matrix as real tasks (`TaskCreate`), not a mental list. Mark each `in_progress` when you start it, `completed` when done — that gives both the user and a future pass an audit trail of coverage.
6. **Execute the matrix.** Walk the tasks in order. For each:
   - Run the interaction.
   - Drain `qa_console_logs`.
   - Capture the evidence the report will cite (`get_variable` snapshot, screenshot region, channel `history` event, etc.).
   - Mark the task `completed` immediately — don't batch.

   Adversarial tasks *will* leave the notebook in messy state (errors, weird values). That's expected — but do them after the happy-path tasks for the same feature so the happy-path baseline is clean.
7. **Score `qa/general.md` criteria 1–11 from the collected evidence.** The matrix execution will already have produced most of what you need; criteria 1–3, 5–7 may need a quick fresh look at the cleanly-loaded notebook (re-open if your adversarial steps broke things badly).
   - Drain `qa_console_logs` for criterion #11.
   - Score **pass / partial / fail**, cite evidence.
8. **Apply per-notebook guidance** — re-verify "known issues" listed in `qa/per-notebook/<slug>.md` to detect regression-by-fix. (The matrix may have already covered most of this; this is the gap-fill.)
9. **Cross-check rendered vs. runtime** — if `get_variable` value disagrees with what's screenshotted, that's a reactivity bug → criterion #4 evidence.
10. **Write the report** to `qa/reports/<slug>-<YYYY-MM-DD>.md` (template below). Include the feature inventory and the happy/adversarial matrix as part of the "Things checked and OK" / "Issues found" sections — coverage proof matters as much as the bugs.
11. **Update `qa/per-notebook/<slug>.md`** — if you learned something durable (a new failure mode, a tricky interaction, a quirk that's intentional, a *new feature surface that wasn't documented*), append it. Do NOT dump report contents wholesale; distill the *general lesson* future passes need. Create the file fresh if it didn't exist.
12. **`qa_close()`**.

## Report template

```markdown
# QA report: <slug>

**Date:** YYYY-MM-DD
**Notebook:** path/to/file.html
**URL hash:** <hash you used>
**Browser:** Playwright Chromium (headed, viewport WxH)

## Summary
<1-3 sentences: overall health, count of fails/partials, severity of worst issue>

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass / partial / fail | … |
| 2 | Explanation | pass / partial / fail | … |
| 3 | Doc matches impl | pass / partial / fail | … |
| 4 | Does what it says | pass / partial / fail | … |
| 5 | Feature list | pass / partial / fail | … |
| 6 | Lean code | pass / partial / fail | … |
| 7 | Scoped domain | pass / partial / fail | … |
| 8 | Claims tested | pass / partial / fail | … |
| 9 | Serialization | pass / partial / fail | … |
| 10 | Adversarial / try to break | pass / partial / fail | … |
| 11 | Clean console logs | pass / partial / fail | … |

## Issues found

### 1. <Short title> — severity: high | medium | low — criterion: #N
- **What:** <observed behavior>
- **Where:** <module>.<cell name>, screenshot region (x,y,w,h)
- **Evidence:** <console error excerpt, get_variable output, or "see screenshot below">
- **Hypothesis:** <likely cause if obvious; "unknown" if not>

### 2. ...

## Per-notebook guidance applied
- <which items from qa/per-notebook/<slug>.md you re-verified, and what you found>

## Things checked and OK
- <list of areas exercised that worked correctly — proves coverage>

## Notes for follow-up
- <anything the QA pass couldn't determine, or follow-ups that need a different setup>
```

## Tips

- **Cheap signal first**: `qa_console_logs` is fast and catches a lot. Drain it after every interaction.
- **Zoomed screenshots are cheaper**: pass `clip: {x,y,width,height}` instead of `full_page: true` when investigating one widget.
- **JPEG quality 60 is fine**: `qa_screenshot` defaults to it. Bump to 80 only if you need to read tiny text.
- **Don't dump every screenshot into the report**: reference regions in prose; embed an image only if it's load-bearing evidence.
- **One browser, one notebook**: don't try to navigate the QA browser to a different URL mid-session — close and re-open. (The pairing also breaks if you navigate away.)
- **Headless is fine for batch runs**: pass `headless: true` if the user isn't watching.
- **Don't mutate the live HTML during QA** unless explicitly testing serialization (criterion #9). Edits stay in-memory and revert on reload, but `export_notebook` writes to disk.
- **Append to per-notebook/<slug>.md sparingly**. Two QA passes that learn the same thing should converge to one entry, not duplicate. If a prior entry is wrong, *update* it; don't pile on.

## Silent-hang signature: rule out `debugger;` BEFORE filing a runtime bug

If the page freezes mid-interaction with this signature — `qa_screenshot` and `eval_code` time out at 30 s, channel emits `disconnected`, **`qa_console_logs` returns `errors: []` and `console: []`** (no thrown error, no rejected promise, no log) — the most likely cause is a `debugger;` statement on the path you just exercised, **not** a runtime bug. Normal Chromium treats `debugger;` as a no-op without DevTools attached, but Playwright launches Chromium with the CDP `Debugger` domain enabled, so the runtime really does pause at every `debugger;`. The user can't repro in their everyday browser; you can.

**Diagnose before filing:**
1. `grep -nE '(^|[^/])debugger\s*;' path/to/notebook.html | head -20` — count occurrences and read the contexts. Many lopecode modules have legacy `debugger;` calls behind `try/catch` rescue blocks (benign — they only fire on errors) and conditional traces (e.g. `if (variable._name === TRACE_CELL) debugger;` — also benign). The dangerous ones are *unconditional* `debugger;` on hot paths (cell creation, hotbar attach, recompile).
2. Match the unconditional ones against the interaction you just ran. A cell-create freeze probably traces to a `_makeCell`-shaped helper; a recompile freeze to the runtime-walk helpers.
3. If the freeze is debugger-baited, **don't file a runtime hang issue.** Either file a "remove `debugger;` from hot path X" issue, or comment on an existing issue with the diagnosis.
4. The 30 s symptom is also a *false positive* for "the runtime is buggy" against criterion #4. Don't penalise the notebook on its score until you've confirmed the hang isn't the debugger-statement artefact.

This ate two QA passes in 2026-05 — one against editor-5's `_makeCell:2252` + `_24:5062` ([lopecode#158](https://github.com/tomlarkworthy/lopecode/issues/158)). Add this check to the standard playbook for any silent-hang the user can't reproduce.
