# @tomlarkworthy/lopeyard — Reactive CI Workbench for the Lopecode Repo

## 1. Vision

`@tomlarkworthy/lopeyard` is a single lopecode notebook that is the operational centerpiece of the repo: a live, reactive CI/test/dependency console mounted on the repo it watches via the File System Access API. There is no pipeline, no YAML, no scheduler — the Observable runtime IS the CI engine. The repo-on-disk is the topmost reactive cell; every downstream artifact (file list, parsed specs, cross-notebook dependency graph, per-notebook checks, aggregated CTRF report, regression deltas) is a cell that recomputes incrementally when an upstream cell actually changes. Checks are pluggable objects pushed into a reactive registry, so the system grows by adding one cell, never by editing a monolith. The differentiating move: a finding is not a dead-end report row — it carries its own remediation, fired by the exact existing tool that fixes it (`sync-module`, `lope-jumpgate`, `update_cell`) or by an embedded agent, with the human or Claude Code approving fixes over the same channel/MCP surface. Detection and remediation live in one reactive dataflow. It dogfoods every property it checks because it is itself a lopecode notebook in the repo it scans.

## 2. Architecture

All cells live in `@tomlarkworthy/lopeyard` unless noted. Dataflow is a strict downstream spine; nothing is orchestrated — the runtime wires it.

**Source layer**
- `viewof directory` — `Inputs.button` → `showDirectoryPicker()` rooted at `lopecode-dev/` (native Chrome) or the channel's `FakeDirectoryHandle` (headless agent). The single root reactive source.
- `fsClock` — `Generators` tick every `pollMs` (default 2000), gated on `directory` so it restarts cleanly on remount (the `fileSyncLastSeen` idiom).
- `fileTree = function(directory, fsClock){…}` — recursive walk via `for await (const [name, handle] of dir)` lifted verbatim from `scanDiskModules` (`file-sync-module.js`). Returns `Map<path,{handle,mtime,size}>` for `*.html`, `*.json`, `*.js`, `*.md` under `lopecode/notebooks`, `lopebooks/notebooks`, `tools`, `tests`, `qa`, `specs`. `stat().mtime` fast-path before read; returns the **same Map reference** when nothing changed so downstream cells don't recompute (the "propagates on recompute not value-change" freeze).

**Parse layer (incremental, content-addressed)**
- `parsedNotebooks = function(fileTree){…}` — for each `*.html` whose mtime advanced, read bytes and run lope-reader's cheerio extraction (ported as a pure fn from `lope-reader.ts`) → `{title, bootconf, modules:{id:{hash,files,source}}, files}`. Memoized by md5; unchanged notebooks reuse the prior parse. This is the only expensive step and it is per-file incremental.
- `depGraph = function(parsedNotebooks){…}` — repo-level transitive `dependsOn`/`dependedBy` closure across **all** notebooks (the cross-notebook graph lope-reader can't compute alone), plus `moduleHashes:{moduleId:{hash:[notebookPath]}}` to surface version skew. Cached to `.lopeyard/depgraph.json`, recomputed only for changed notebooks.

**Check layer (the plugins)**
- `viewof checkRegistry = Inputs.input([])` — the reactive plugin atom.
- `findings = function(checkRegistry, parsedNotebooks, depGraph, ctx){…}` — `checkRegistry.flatMap(c => c.scan(parsedNotebooks, depGraph, ctx))`. A check's `scan` is an async generator yielding **cumulative** `Finding[]` snapshots, so a 157-notebook validate streams into the board live. Recomputes only when a check, the manifest, or a threshold `viewof` changes; notebook-scope checks re-run only for notebooks whose hash advanced (free incrementality from the runtime).
- `ctrfReport = function(findings){…}` — folds every `Finding` into one canonical CTRF document (the lingua franca `lope-tests` already emits) with `extra.lopecode {notebookPath, checkId, scope, metrics}`. The single sink the existing tooling lacked.
- `baseline` (read from `.lopeyard/baseline.ctrf.json` via FSA) + `regressions = function(ctrfReport, baseline){…}` — diff vs last blessed run: newly-failing checks, metric drift (MI dropped >10, export size +20%, test count fell).

**Triage + fix layer**
- `viewof triageState = Inputs.input({})` — per-finding status (`open`/`muted`/`fixing`/`fixed`), persisted to `.lopeyard/triage.json`.
- `agent = createAgentLoop({client: openrouterClient, tools:[bashTool, jumpgateTool, syncModuleTool, openNotebookTool, runTestsTool, jsToolchainTool], runCommand})` — robocoop-4 loop whose `runCommand` is bound to a justbash shell over the FSA directory (browser) or `ctx.runCommand` (node). Each `Finding.fix` is either a deterministic thunk (a single `sync-module`/`jumpgate` invocation) or an agent goal string.
- `viewof fixQueue = Inputs.input([])` — serializes remediations so two fixes never race the same file. On resolve, a fix bumps the scan epoch for **only the affected notebooks** (incremental re-scan), and findings re-triage live.
- `onCodeChange` (runtime-sdk) is subscribed once: a local edit to a module marks its board column dirty (amber) without a full rescan.

The `board` cell renders `findings` grouped by check, filtered by `triageState`, each row generic over the `Finding` shape and exposing only the action buttons its `fixKind` enables.

## 3. The On-Disk Model & File System Access

Lopeyard treats the repo's **existing artifacts as canonical** and never invents a parallel store. Source of truth per notebook is the committed pair `@user_nb.html` + `@user_nb.json` (the lope-reader/jumpgate spec: `modules→{hash,files,dependsOn,dependedBy}`, `upstreams`, `observable_version`/`update_time`). The `manifest` cell is the union of all `.json` specs across both submodules; full `.html` bytes are read lazily only when a check or drill-down needs them.

**Reading the whole repo live.** `viewof directory = showDirectoryPicker()` yields the FSA root (native), or the channel's `FakeDirectoryHandle` after `enable_fakefs(/Users/tom.larkworthy/dev/lopecode-dev)` + `qa_open_notebook(fakefs_root=…)` (headless agent) — the same wiring file-sync and the QA harness already use; safehouse's `resolveSandbox` prefix check blocks escapes to `~` or `/tmp`. `fileTree`/`parsedNotebooks` walk via `dir.entries()` and read via `handle.getFile().text()/.arrayBuffer()`. The `stat().mtime` fast-path means the ~1s-per-directory FSA round-trip is paid only on first scan and on actual change; steady-state polling is cheap. This is the capability file-sync's module-only sync dir never had: a notebook reading **arbitrary** repo files (HTML, JSON specs, markdown, `tools/*.ts`).

**Writing back.** Fixes land on real disk through `handle.createWritable()`: byte-exact rewrite of a `<script id="@author/mod">` block (the `sync-module` algorithm ported into a cell), a regenerated HTML after a jumpgate, the blessed `.lopeyard/baseline.ctrf.json`, and append-only `qa/reports/lopeyard-<date>.ctrf.json` (git is the time-series store — no database). Every write is debounced and provenance-tagged `{source:'lopeyard'}` so a co-resident file-sync ignores the echo and no thrash loop forms.

**Taming the dependency mess.** The repo's silent killer is shared-module duplication: the same module embedded across dozens of notebooks at divergent hashes, with no cross-notebook view, drifting against ObservableHQ, synced by hand.
- **Version skew made first-class.** `moduleHashes` groups every `<moduleId, hash>` pair across all notebooks; `@tomlarkworthy/editor-5` appearing with two hashes is a detectable `sync-skew` row, not a guess.
- **Declarative sync state.** `.lopeyard/sync.json` declares "module X must be byte-identical across these consumers." A derived `expectedSync` cell compares each shared module's hash to its canonical notebook's hash and lists the exact stale targets — so the Re-sync action calls `sync-module --target` with that **computed consumer set** (grep -l semantics), never a blind `*.html` glob (the over-insert footgun).
- **Drift vs ObservableHQ.** The staleness check reuses `probe-staleness`'s concurrency-limited fetch (`runWithConcurrency`) against `api.observablehq.com`, but as a cell, so drift shows live and offers a re-jumpgate.
- **Blast radius.** `depGraph.usedBy[M]` answers "what depends on `@tomlarkworthy/bootloader`?" across the whole repo, powering smart test selection: when module M changes in its canonical notebook, only the notebook-scope checks for `usedBy[M]` recompute.

Boot-dependent checks (`test-cells`, `browser-validate`) that need a headless runtime for 200 *other* notebooks are **delegated** to the existing CLIs via MCP `eval`, with results folded back into `findings` — lopeyard is a controller for them, not a re-implementation. If the channel is absent, those checks degrade to `skip`, not crash.

## 4. The Plugin Model

A check is a plain object pushed into `viewof checkRegistry` (`Inputs.input([])` — the established reactive-array registry idiom, never a hand-rolled div):

```js
{ id, label, severity,
  scope: 'repo' | 'notebook' | 'module',
  scan(parsedNotebooks, depGraph, ctx) -> AsyncIterable<Finding>,
  fix?(finding, ctx) -> Promise | goalString,
  fixKind?: 'jumpgate'|'sync'|'agent'|'open'|'patch',
  params? }   // tunable viewof thresholds surfaced in the config pane
```

`Finding` is `{id, checkId, severity, notebook, module?, cell?, message, evidence, fix?, fixKind}`. Scopes auto-fan-out: `repo` runs once, `notebook` per `parsedNotebooks` entry, `module` per `depGraph` module. Because `findings` is a pure derivation of `checkRegistry × manifest`, **adding a check needs zero board changes** — the row UI is generic over the `Finding` shape. A check never calls another check; it declares the upstream cells it needs and the runtime wires it. `ctx` hands a check what it needs (`ctx.read(path)`, `ctx.mcp`, `ctx.knownErrors` reusing bulk-browser-validate's whitelist, `ctx.depGraph`) so checks stay decoupled from display.

New checks arrive three ways, none touching core: (a) a new cell in an imported plugin module that pushes its check; (b) a `.js` plugin dropped into the watched dir, picked up by the same file-sync poll (`probeDefine` → register); (c) MCP `define_cell` for an ephemeral one-off during a session.

Registering one plugin check (the entire extension API):

```js
registerConsoleHygiene = {
  const check = {
    id: 'console-hygiene', label: 'console.log residue', severity: 'warn',
    scope: 'notebook',
    async *scan(parsedNotebooks) {
      const out = [];
      for (const [path, nb] of parsedNotebooks) {
        for (const [mid, m] of Object.entries(nb.modules))
          if (/\bconsole\.log\(/.test(m.source))
            out.push({ id:`console:${path}:${mid}`, checkId:'console-hygiene',
                       severity:'warn', notebook:path, module:mid,
                       message:'console.log in cell source',
                       fixKind:'patch',
                       fix:`strip console.log from ${mid} in ${path}` });
        yield out;                       // cumulative snapshot, streams live
      }
    }
  };
  checkRegistry.value.push(check);
  viewof_checkRegistry.dispatchEvent(new Event('input'));
  return check.id;
}
```

Fixes register the same way: a check that knows how to remediate sets `fix`; `fixKind` selects the action button and which agent tool the loop reaches for.

## 5. Built-in Checks & Actions (v1)

| Check | What it detects | Action offered |
|---|---|---|
| `test-regression` | `test_*` cells failing/timed-out vs the per-notebook CTRF baseline in `.lopeyard/baselines/` (via `run_tests` MCP / `lope-tests` observation protocol) | **Run tests** (flip row live); **Re-baseline** |
| `browser-validate` | `.observablehq--error` DOM nodes + runtime `_variables[].error` on boot, filtered by bulk-browser-validate's known-error whitelist | **Open notebook**; **Ask agent to fix** |
| `broken-references` | Free idents satisfied by neither Observable stdlib, sibling cells, nor any `dependsOn` export (js-toolchain `findReferences` × `depGraph`) — static, no boot | **Jump to cell**; **Ask agent to fix** |
| `sync-skew` | A module in `sync.json` (or shared by >1 notebook) embedded at divergent md5 across notebooks | **Re-sync module** to the exact `expectedSync` target set |
| `stale-upstream` | Local `observable_version` behind ObservableHQ remote (`probe-staleness` fetch), ranked by drift days; flags 404/unknown | **Re-jumpgate** |
| `cell-error` | Notebooks that boot with error cells (live-page validation via `qa_open_notebook`) | **Open notebook**; **Ask agent to fix** |
| `export-bloat` | HTML size delta >20% vs last `metrics.jsonl` entry, or module count >50 (bulk-export-qc threshold) — bundler churn / bloat | **Re-jumpgate** (warns on noise diff) |
| `code-health` | Cells with MI<65 or CC≥10, and MI regressions >10pts vs baseline (code-metrics acorn extraction, static) | **Jump to cell**; **Ask agent to fix** |
| `orphan-attachment` | `FileAttachment('x')` with no embedded file, and embedded attachments referenced by no cell | **Ask agent to fix** |
| `blank-notebook` | `bootconf.json` with empty `mains[]`, or main module absent from embedded modules | **Ask agent to fix** (patch bootconf) |
| `qa-debt` | `.html` mtime newer than `qa/reports/<slug>-*.md` — changed since last QA pass | **Dispatch QA pass** (qa-notebook skill) |

Cross-cutting actions (all provenance-tagged `{source:'lopeyard'}`, serialized through `fixQueue`): **Open notebook** (`open_url` + hash + `cc=TOKEN`), **Bless current run** (write baseline), **Save run report** (append `qa/reports/lopeyard-<date>.ctrf.json`), **Mute/snooze** (write `triageState`), **Apply proposed patch** (write the agent's edit via `createWritable` / `update_cell`, approval-gated).

## 6. UI / Operator Experience

Lopepage hash-DSL drives a four-pane console, e.g.:

```
#view=R100(S55(@tomlarkworthy/lopeyard),S20(lopeyard-config),S25(lopeyard-agent-log))&cc=TOKEN
```

with an opened-notebook pane added on demand. Unknown hash params (`cc=TOKEN`, selected finding id, filter state) are preserved across layout changes, so a deep link to one finding is shareable and bookmarkable.

- **Board pane (55%).** Sticky header strip: severity counts + trend sparklines from `metrics.jsonl` + a single traffic light derived from `regressions` (green = no new failures vs baseline, amber = warns/dirty, red = regressions). Below it, findings grouped by check in collapsible sections; each row shows severity dot, notebook/module/cell, message, evidence, and the action buttons its `fixKind` enables. Rows stream in as async-gen checks yield (inline progress for the 157-notebook validators). Filter/scope inputs (built from `@tomlarkworthy/view`) sit above: by submodule, by severity, "regressions only". A scan-epoch indicator + **Scan repo** button re-walks the FSA dir.
- **Config pane (20%).** Per-check enable toggle + tunable `viewof` thresholds (MI floor, size-delta %, staleness days) that re-triage the board live, plus the `sync.json` editor. A collapsible registry listing makes the loose coupling self-documenting: every registered check, its scope, declared deps, last run time.
- **Agent-log pane (25%).** Live stream of the robocoop-4 loop's tool-calls and outputs for the currently-fixing finding (async-gen snapshots, not post-hoc).
- **On-demand notebook pane.** The offending notebook mounted inline (one click from any row) so the operator watches the fix land green without leaving the console.

The board is a stateless link: an operator bookmarks "regressions-only board" and shares it.

## 7. Agentic Loop

Detection and remediation use the **same primitives**, so the loop is short. The board is mirrored over the channel/MCP: a human clicking **Re-sync** and Claude Code calling the MCP tool walk identical code paths.

1. **Detect.** `findings` surfaces a typed `Finding` carrying its own `fix` thunk and `fixKind`.
2. **Triage.** Operator (human or Claude) filters to `regressions only`, picks a row.
3. **Remediate.** Deterministic fixes (`sync`, `jumpgate`, `open`) fire the exact existing tool with arguments computed from the dataflow (`expectedSync` target set, the stale notebook's path). Open-ended fixes (`agent`) hand the `Finding` to robocoop-4 with the repo toolset (bash over justbash-on-FSA, `jumpgate`, `sync-module`, `run_tests`, `js-toolchain`); its tool-calls stream into the agent-log pane.
4. **Approve, never auto-apply.** Every agent edit is **patch-proposed** for human/Claude approval before `createWritable`/`update_cell` writes it — the highest-trust surface, confined by the safehouse sandbox. A hallucinated `sync-module --target` could corrupt many notebooks at once, so writes are gated and provenance-tagged.
5. **Re-scan incrementally.** On resolve, the fix bumps the scan epoch for only the affected notebooks; their rows re-triage and flip green without a full run.

Claude pairs with lopeyard exactly as it does the repo today — `enable_fakefs` + `qa_open_notebook` to mount headlessly, `define_cell` to add an ephemeral check, `run_tests`/`update_cell` to remediate — because lopeyard is built from the same channel/MCP surface Claude already uses.

## 8. Build Plan

Phased, each milestone runnable; the skeleton reuses the most existing code.

**M0 — Walking skeleton (read-only board).** Create `@tomlarkworthy/lopeyard` via `create_module` (seed variable first). Implement `viewof directory` → `fileTree` by porting `scanDiskModules`'s `dir.entries()` walk verbatim, scoped to `lopecode/notebooks` + `lopebooks/notebooks`. `parsedNotebooks` reads each `.json` companion spec only (cheap). Ship **one** static check, `sync-skew`, derived purely from `moduleHashes`. Render a plain `<table>` board. Runnable end-to-end on the real repo via `enable_fakefs` + `qa_open_notebook` in one headless session — first milestone is a colored grid of every notebook × the skew check.

**M1 — Registry + CTRF + regressions.** Promote the check to `viewof checkRegistry = Inputs.input([])`; make `findings` generic over scope. Add `ctrfReport` fold and `baseline`/`regressions` reading `.lopeyard/baseline.ctrf.json`. Add the static checks needing only parse: `broken-references`, `orphan-attachment`, `blank-notebook`, `code-health`, `console-hygiene`. Compose under `@tomlarkworthy/lopepage` with the config pane.

**M2 — Boot-dependent checks as controllers.** Add `lopeyard-runtime` plugin: `test-regression` and `browser-validate` delegating to `run_tests`/`qa_open_notebook` MCP (live) or shelling `lope-tests`/`bulk-browser-validate` via MCP `eval` (batch), folding CTRF/JSONL back into `findings`. Add `lopeyard-upstream`: `stale-upstream` + `export-bloat` wrapping `probe-staleness` and bulk-export-qc as streaming checks.

**M3 — Deterministic actions + write-back.** `lopeyard-actions`: port `sync-module`'s byte-exact `<script>` rewrite into a cell (Re-sync to `expectedSync` set), Re-jumpgate, Open notebook, Bless/Save baseline. Add `viewof fixQueue` serialization, provenance tagging, debounced writes, `metrics.jsonl` time series via `lopeyard-metrics`.

**M4 — Agentic remediation.** `lopeyard-agent`: wrap robocoop-4 `createAgentLoop` with the repo toolset over justbash-on-FSA; `fixKind:'agent'` findings get an LLM remediator; agent-log pane streams tool-calls; every edit patch-proposed and approval-gated. Add `lopeyard-qa` bridging the qa-notebook skill (`qa-debt`).

**M5 — Self-host.** Round-trip lopeyard via `export_notebook`, commit to `lopecode/notebooks/`, point it at its own repo. It QAs itself.

## 9. Why This Is Astounding

It collapses the repo's entire scattered toolchain — `lope-reader`, `lope-tests` CTRF, `bulk-browser-validate`, `bulk-export-qc`, `probe-staleness`, `code-metrics`, `sync-module`, `lope-jumpgate`, the qa-notebook skill — and three sink formats (CTRF, JSONL, markdown) into one live reactive board where the repo on disk is the topmost cell and CI is just the recalculation. You point it at the directory once; it stays green or goes red as you edit, incrementally, because the Observable runtime already does dependency tracking and minimal recompute — the exact thing CI engines reinvent badly. CI stops being a thing you trigger and becomes a thing that is simply true of the repo, continuously and visibly. It does not merely *detect* every class of problem the codebase suffers — sync-skew, drift, regressions, bloat, blank-mains, orphans — it *closes the loop* by firing the exact existing tool that fixes each one, with an embedded robocoop-4 agent for the open-ended cases. The silent killer — the same shared module gone stale across dozens of embedded copies, invisible today — becomes a green-when-fixed row with the consumer set computed from the real dep graph. It is a lopecode notebook subjecting lopecode notebooks to CI, scanning and rewriting them through the same File System Access API and channel/MCP surface Claude Code already uses, so a human clicking **Re-sync** and Claude calling the MCP tool walk identical code paths. It is loosely coupled by construction — every check and fix is a plain object pushed into a registry — it grows by adding `{id, scan, fix}` triples, it keeps a git-diffable on-disk history sidecar, and it dogfoods every property it checks by living in the repo it watches.