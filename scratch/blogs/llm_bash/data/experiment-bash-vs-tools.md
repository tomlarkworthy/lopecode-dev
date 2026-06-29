# A/B experiment: bash-only (sed) vs Claude-shaped Read/Write/Edit

The cleanest test of the thesis. Same agent, **adjacent commits one hour apart**, run on the same benchmark;
the only meaningful change is the file-editing tool surface.

## The two arms (both pinned in this folder)

| arm | commit | date | editing surface | pinned build |
|-----|--------|------|-----------------|--------------|
| **BEFORE** | `9f7b205` | 2026-06-24 07:05 | bash only — *"Use the bash tool for everything: ls, cat, grep, sed, awk… sed -i, a quoted heredoc"* | `robocoop-4_BEFORE_bash-only_9f7b205.html` (0 `old_string`) |
| **AFTER**  | `01b31df` | 2026-06-24 08:06 | bash **+** `read_file`/`write_file`/`edit_file`, Claude arg shapes, literal replacement, in-turn compile feedback — *"the agent no longer writes via sed"* | `robocoop-4_AFTER_claude-tools_01b31df.html` (10 `old_string`) |

Pivot commit: https://github.com/tomlarkworthy/lopecode-dev/commit/01b31df

### Running with MIMO (model-list injection)

Both adjacent builds predate live-catalog/tool-only model support: their picker is a **hardcoded** 7-model
list (`anthropic/claude-sonnet-4`, …) with **no `xiaomi/mimo-v2.5-pro`**. The current eval driver gates
`send` on the picker resolving to the requested model, so mimo can't be driven on the pristine pins. Fix
(per the user's instruction): copy each build and inject mimo into the hardcoded list — `_mimo.html` copies,
pristine pins untouched:

- `robocoop-4_BEFORE_bash-only_9f7b205_mimo.html`
- `robocoop-4_AFTER_claude-tools_01b31df_mimo.html`

Injection = add `"xiaomi/mimo-v2.5-pro",` to the top of the `_openrouter_models` array in the embedded
`@tomlarkworthy/robocoop-4-engine` module. Only the *selectable model list* changes — the editing surface
(sed vs Claude tools) is untouched, so the A/B variable is preserved.

**Verified (2026-06-28):** both `_mimo` copies boot under the current driver with `--model
xiaomi/mimo-v2.5-pro --legacy-no-tool-gate` and pass `debug-average` 1.00 (4 steps each). So the mimo A/B is
runnable on the copies. NOTE: run it **without other concurrent eval processes** — multiple headless
Chromium instances cause the 30s session-readiness gate to time out (observed as spurious "session did not
initialize" / steps=0 failures on the BEFORE build during a contended run; the isolated smoke passed).

### Why adjacent commits, not old-build-vs-current

Tempting shortcut: run the current benchmark against the BEFORE build and compare to today's build. **Don't —
it confounds two variables.** Between `9f7b205` and today the *system prompt* also evolved substantially
(function-cell idioms, module skeletons, literate-decomposition guidance, etc.). A gap could be the tools or
the prompt. The `9f7b205`↔`01b31df` diff is essentially **only** the editing-tool section (plus a one-line
"prefer edit_file over sed" steer); the shared code-format / reactive-model prompt is identical in both — we
verified the AFTER build still carries the same code-format prompt text. So this pair isolates the editing-tool
variable. Run the SAME benchmark (the curated subset below) against BOTH pinned builds.

## What we already know (contemporaneous, same-version harness)

Both builds were scored by the eval harness that existed at the time:

- BEFORE (`9f7b205`): capability-gate **mean 0.94 / 27**.
- AFTER (`01b31df`): capability-gate **mean 0.95 / 27** ("best yet").

A 0.01 move — because those 27 evals scored task *completion*, not editing *quality* (0 evals for
incremental-editing or decomposition then). The benchmark was blind to the dimension the tools improve.

## The fair benchmark subset: generic editing ability only

For the re-run we must score **only evals that generically measure editing ability** — tasks of the form
"produce/modify code so a runtime value is correct," judged purely on **outcome** criteria. We exclude any
eval that:

- uses a **tool-presence** criterion (`tool_used` / `tool_not_used` / `tool_call_matches` / `bash_command_matches`
  / `no_tool_result_matches` / `tool_result_contains`) — circular: it rewards whichever build owns that tool;
- tests a **non-editing capability or a prompt-taught fact** (self-knowledge, hallucination/clarification,
  reading-comprehension Q&A, value-inspection via the `inspect_value` tool, network fetch, drive-UI via
  `eval_js`, build-a-tool self-extension, doc/prose writing scored by `min_words`/`answer_contains`).

Filter applied to all 44 current evals → **21 qualify** (`editing-eval-subset.json`, key `fair`):

```
algo-nth-prime algo-roman algo-balanced-brackets algo-word-count
data-parse-csv data-top-three dataflow-temperature
debug-average debug-off-by-one
edit-exporter-title
el-modify-live el-delete-prune el-import-into-existing el-viewof-live
import-cross-module import-esm-md5 import-esm-util
lib-d3-extent ui-people-table ui-slider-square viz-revenue-bars
```

**Sharpest sub-tier — editing in place (6 evals, key `inPlace`):** `debug-average`, `debug-off-by-one`,
`edit-exporter-title`, `el-modify-live`, `el-delete-prune`, `el-import-into-existing`. These modify EXISTING
code (the others mostly author a new file with a single write, where sed-vs-edit_file matters less). If the
editing-tool shape matters, the gap shows up most here. Report this sub-tier separately.

Excluded (22): all `self-knowledge`, `hallucination`, `comprehension`, `value-inspection`, `network`,
`drive-ui`, `build-tool`, `src-editing`, `doc-editing`. Borderline (1, excluded): `edit-add-doc-cell`
(scored by `min_words` — prose length, not code correctness).

## Run procedure

```bash
# OPENROUTER_API_KEY in tools/robocoop-4/.env. Score the SAME subset against BOTH pinned builds.
IDS="algo-nth-prime algo-roman algo-balanced-brackets algo-word-count data-parse-csv data-top-three \
dataflow-temperature debug-average debug-off-by-one edit-exporter-title el-modify-live el-delete-prune \
el-import-into-existing el-viewof-live import-cross-module import-esm-md5 import-esm-util lib-d3-extent \
ui-people-table ui-slider-square viz-revenue-bars"
for build in BEFORE_bash-only_9f7b205 AFTER_claude-tools_01b31df; do
  for id in $IDS; do
    bun tools/robocoop-4/eval/live/run.mjs \
      --notebook scratch/blogs/llm_bash/data/robocoop-4_${build}.html \
      --only "$id" --model xiaomi/mimo-v2.5-pro \
      --json tools/robocoop-4/eval/live/results/ab-${build}-${id}.json
  done
done
```

(`run.mjs` takes one `--only` at a time; the loop covers the subset. Or add a small `--ids a,b,c` flag.)

### Two caveats to keep it honest

1. **Driver gate.** The current `driver.mjs:187` waits for the `read_file` tool to register before sending.
   The BEFORE build has no such tool → it would time out. Relax the gate to "`session.send` exists" only
   (its pre-`read_file` behaviour, cf. commit `699be68`) for BOTH runs so the two arms are driven identically.
2. **Score outcome criteria only.** Even within the 21, ignore any non-outcome criterion if present; compare
   on `variable_equals` / `cell_evaluates` / `does_compile` / `no_runtime_errors` / `renders_*` / `variable_*`,
   and on a **decomposition** measure (produced-module cell count or code-metrics MI) for the build tasks.

## Falsifiable prediction

Completion correctness on the 21-eval subset is **similar** across the two arms (consistent with the recorded
0.94 vs 0.95); the in-place sub-tier and decomposition show the **larger** Claude-tool advantage. I.e. the
boost is real but concentrated in editing reliability and output structure — the dimension the original gate
didn't measure. If the subset scores come out flat across *both* tiers, the strong form of the thesis is
weakened and the post should say so.
