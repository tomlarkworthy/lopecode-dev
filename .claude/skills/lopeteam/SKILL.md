---
name: lopeteam
description: Use when the user asks to "improve this notebook", "run the team on X", "/lopeteam <notebook>", or wants an autonomous self-improving development team to iteratively raise the quality of a lopecode notebook (and fix upstream modules when needed). Human-kicked, loop-until-dry. Fans out read-only critics across four axes (code quality, functional usefulness, visual aesthetics, performance), then applies and verifies improvements one at a time through the live pairing channel — on local files only, no ObservableHQ push. State lives in .claude/lopeteam/<slug>/; rubrics and reports are shared with qa-notebook. Aesthetic verdicts and reflector changes are human-gated.
version: 0.1.0
---

# Lopeteam — autonomous self-improving notebook team

A **human-kicked, loop-until-dry** improvement run on **one target notebook**. The team fans out read-only critics across four axes, the orchestrator (you) builds a prioritized backlog, then a single applier improves the notebook one change at a time through the **live pairing channel**, with a verifier grounding every change against runtime truth before it is accepted. All edits are **local files only** — `export_notebook` writes the HTML back to disk; **never push to ObservableHQ** for this work (this overrides the CLAUDE.md source-of-truth rule).

## Non-negotiable architecture

- **Fan-out is read-only.** The four axis critics and the upstream tracer only *read* (lope-reader on disk + read-only channel introspection). They emit backlog items; they never edit the notebook. Spawn them in parallel.
- **Apply + verify is single-threaded.** The pairing channel is one browser / one runtime. Apply one backlog item at a time, verify it, accept or revert, then move on. Never run two appliers at once.
- **Grounding beats self-report.** The verifier confirms improvements by reading the *runtime* (`list_variables`/`get_variable`/`watch_variable`, console logs, errored cells), code-metrics deltas, perf timings, and the test suite — **not** the applier's claim. A faked or regressing change is a hard reject + a logged lesson, never a retry.
- **Plausibility is not verification; the assessor is not the ground truth.** A well-structured, confident artifact (a report, an analysis, precise figures) can be entirely fabricated, and it will *look* correct to a reviewer who checks it against their own model knowledge — because that knowledge is the same ungrounded source. Never grade produced content by "does this match what I'd expect"; grade it by "is each claim traceable to an external source the work actually consulted (a fetch, a computation, a test, a citation)". Unsourced precision is a defect even when the numbers happen to be right — it lends credibility where none was earned and misleads the user. Judge the **strategy** too: asserting data that was reachable-and-fetchable is a grounding failure, not a shortcut. This applies to the team's *own* assessments as much as to the work under review.
- **Aesthetics is human-gated.** Visual "is this better?" verdicts are parked for the human, never auto-accepted. They do not block the other three axes.

## Quality bar — frontier-relative, constraint-bounded

The target is not "it works" — it is **"this is as good as is currently possible given the system's constraints."** Two halves held in tension:

- **Frontier-relative functionality.** Judge each capability against the **current state of the art of what's technically possible**, not against the notebook's own past or a low "it runs" bar. When the frontier isn't obvious, **research it** (WebSearch/WebFetch) before scoring — the best-known algorithm, the authoritative live data source, what comparable tools achieve today. A capability well below the achievable frontier is a functional finding even if it works. (And per the grounding principle: if real data/capability is reachable, the work must *use* it, not approximate it from memory.)
- **The constraints are the budget, not an afterthought.** Lopecode ships as a single browser-only file, so functionality is always traded against **small code size** and **high runtime performance**. The best work maximizes capability *per byte and per millisecond* — not capability in the abstract. A functional gain that bloats the bundle or janks the runtime must be weighed, not waved through; sometimes the higher-quality answer is the leaner one.

So the four axes are a **joint optimization**, not four independent checklists: when scoring/prioritizing a functional opportunity, the orchestrator weighs the capability gain against its code-size and performance cost, and prefers the option that pushes toward the frontier *within* the browser/size/perf envelope.

## State and rubrics

- **Team state** (this skill): `.claude/lopeteam/<slug>/` via `tools/lopeteam-state.ts` — `backlog.json`, `lessons.md`, `progress.md`. `<slug>` = notebook basename (e.g. `editor-5` for `@tomlarkworthy_editor-5.html`).
- **Rubrics + reports** (shared with qa-notebook): `.claude/skills/qa-notebook/qa/` — `general.md` (14 universal criteria), `per-notebook/<slug>.md`, `reports/`. Critics score against these.

Axis → criteria mapping: functional ← #1–5, #8, #9, #14, #16 · code-quality ← #6, #7, #15 · robustness (shared) ← #10, #11, #16 · aesthetics ← #12, #14 (role prompt for subjective polish) · performance ← #13, #14. (#14 = responsive, visible feedback — reactive/spatio-visual, no silent long ops, created artifacts surface in place. #15 = dataflow rerunnability — recomputing any cell/subset leaves the program consequentially-equivalent; out-of-model effects torn down via the invalidation promise. #16 = no errored cells, FORCE-COMPUTED — a passive `_error` scan false-passes because unobserved cells haven't run; observe every cell, or open every pane, before claiming zero errors.)

## Procedure

### 0. Set up

1. Resolve the target HTML path and `<slug>`. Read its sibling `bootconf.json` for the intended hash layout.
2. `bun tools/lopeteam-state.ts init <slug>`.
3. Read existing state so you don't redo work: `lopeteam-state.ts lessons <slug>`, `list <slug>`, and `.claude/skills/qa-notebook/qa/per-notebook/<slug>.md` if present.
4. **Read the rubric**: `.claude/skills/qa-notebook/qa/general.md`. Re-read every run; do not trust memory.
5. Get a pairing token (`get_pairing_token`), build the `file://` URL from `bootconf.json` with `&cc=TOKEN` appended, `open_url` it, wait for connected, `reply` a one-line hello.

### 1. Round loop (repeat until dry)

Each **round**:

1. **Fan out the five read-only scouts in parallel** (one message, five `Agent` calls), each handed the target path, slug, the live token, and its role prompt from `.claude/skills/lopeteam/agents/`:
   - `code-quality.md`, `functional.md`, `aesthetic.md`, `performance.md`, `upstream.md`.
   Each returns a short list of `{axis, title, files, value 1-5, evidence}` opportunities, already checked against `lessons.md` and the open backlog.
2. **Merge into the backlog.** For each returned opportunity: `lopeteam-state.ts add <slug> --axis … --title … --files … --value … --evidence …` (the tool dedupes same-axis/same-title items automatically). Re-prioritize is implicit: `list --status open` returns highest-value first.
3. **Apply the top items one at a time** (single-threaded, through the channel). For each open item, in value order, skipping aesthetics (those go to the human queue):
   - Spawn the **applier+verifier** (`agents/applier-verifier.md`) with the one item. It makes the change live (`define_cell`/`update_cell`/`eval_code`), `export_notebook` to disk, then **verifies against runtime truth + the item's grounding signal**:
     - code-quality → `@tomlarkworthy/code-metrics` MI / cell-size / dead-var delta must improve or hold
     - functional → relevant `test_*` cells green via `run_tests`, headline flow works, no new errored cells
     - performance → measured recompute/boot timing reduced, no regression
     - all → no new `console.error`/`pageerror`, no newly-errored variables (regression gate)
   - **Accept** → `git add -A && git commit` the on-disk HTML (and any synced consumers); `set <id> --status accepted`.
   - **Reject** → revert the cell live, `set <id> --status rejected --note …`, and `lesson <slug> --text …` so it is never re-proposed.
   - **Upstream item** (touches a module many notebooks import): the applier edits the module `.js`, then propagates on disk with `bun tools/channel/sync-module.ts --module @name --source file.js --target "<consumers>"`, and the verifier spot-checks one consumer still boots clean. Large blast radius → still on-disk, but note it prominently in the report.
4. **Close the round**: `lopeteam-state.ts round <slug> --accepted <count> --note "<one line>"`. A round where a top item just repeats a prior edit signature counts as **0 accepted** (stall → feeds the dry counter).

### 2. Termination — dry

After each round, `bun tools/lopeteam-state.ts dry <slug>` (exit 0 = dry/stop, exit 2 = continue; threshold 2 = two consecutive 0-accepted rounds, backlog-empty counts as 0-accepted). When dry, stop the loop. A bare safety cap also applies: if you somehow exceed ~12 rounds, stop and report regardless — the dry signal should fire long before that.

### 3. Wrap up

1. Write/append a report to `.claude/skills/qa-notebook/qa/reports/<slug>-<date>.md`: accepted changes (with grounding evidence), parked items, and the **aesthetic queue** for the human.
2. Update `per-notebook/<slug>.md` with anything durable a future run should know.
3. Summarize to the user: what improved (with before/after numbers), the aesthetic verdicts awaiting them, and any reflector signal (critics that missed or over-claimed) — that feeds `/lopeteam-reflect`.
4. Leave commits on the branch; do **not** push to ObservableHQ.

## Reflector (between runs)

Improving the *agents themselves* is a separate, human-gated step: `/lopeteam-reflect <slug>`. Do not silently edit the role prompts or rubric mid-run.

## Notes

- One notebook per run — the workflow's state dir, reports, and HTML rewrites are scoped to one target. (The QA browser itself is no longer a constraint: `qa_*` tools take a `session` name for parallel independent browsers.)
- Close any QA browser before a `sync-module` rewrite of the same file (avoids the connect/disconnect thrash).
- Keep critic output terse and evidence-backed; cap the backlog so the team doesn't manufacture low-value busywork (value < 2 items are noted in the report, not worked).
