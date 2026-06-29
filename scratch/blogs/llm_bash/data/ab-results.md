# A/B results: bash-only (sed) vs Claude-shaped Read/Write/Edit

Measured 2026-06-28. Adjacent commits, one hour apart, same code-format prompt; the only difference is the
file-editing tool surface. Run against the **21-eval fair subset** (outcome-scored; no tool-presence or
prompt-fact criteria). Driver: `--legacy-no-tool-gate` (the bash-only build has no `read_file` to wait on);
`<select>` option-injection so each build's old picker can hold the chosen model.

- BEFORE = `9f7b205` (bash-only; prompt: "use sed -i, a quoted heredoc, …"; 0 `old_string` in the build).
- AFTER  = `01b31df` (adds `read_file`/`write_file`/`edit_file`, literal replacement, in-turn compile feedback).

**n = 1 run per arm** — single-run variance is real; treat ±1 eval (~±0.05 overall) as noise. One MIMO AFTER
eval (`el-delete-prune`) hit a driver-level transient ("Failed to fetch" ×3, `ok:false`) and is **excluded**
from both arms (paired) so it doesn't fabricate a delta. The SONNET arms had zero transients.

## Numbers

| arm | scope | BEFORE (sed) | AFTER (tools) | Δ |
|-----|-------|--------------|---------------|---|
| **SONNET** (claude-sonnet-4) | overall (21) | **0.941** | **0.914** | −0.027 |
| | in-place edits (6) | 0.857 | 0.857 | 0.000 |
| | authoring (15) | 0.975 | 0.937 | −0.038 |
| **MIMO** (xiaomi/mimo-v2.5-pro) | overall (20)¹ | **0.835** | **0.910** | **+0.075** |
| | in-place edits (5)¹ | 0.914 | 0.914 | 0.000 |
| | authoring (15) | 0.808 | **0.908** | **+0.100** |

¹ MIMO excludes the transient-failed `el-delete-prune` from both arms.

Median steps: SONNET 10→11, MIMO 9→8 (flat).

## What it says — and what it doesn't

1. **The tool-shape effect is model-dependent.** On the capable model (sonnet) the editing surface makes ~no
   difference to outcomes (flat, within noise). On the weaker model (mimo) the Claude-shaped tools materially
   improve completion: **+0.075 overall, +0.10 on authoring**. This is the mechanism behind the original
   dramatic MIMO finding — weaker models lean harder on matching the RL-overfit tool shape; a strong model
   edits fine with sed too. The honest framing is therefore *conditional*, not universal.

2. **In-place-edit OUTCOMES are flat for both models** (0.857=0.857 sonnet; 0.914=0.914 mimo). The
   prediction that the in-place tier would improve most is **not** supported by outcome scoring. These small
   edits (`step = 2` → `5`, delete one cell) complete via sed too; the sed→`edit_file` win is in editing
   *process* — reliability (old_string matches first try), in-turn compile feedback, no whole-file rewrites —
   which this outcome suite does not measure. The load-bearing process result remains the qualitative DAW
   build (691-line monolith → 42 decomposed cells, commit `0c8a33a`), which is not in this suite.

3. **The benchmark-overfitting thread, demonstrated on ourselves.** The clean A/B confirms the suite is
   largely blind to the dimension the tools actually improve (process/decomposition). A completion-only
   benchmark would conclude "the tools barely matter" — the same trap one level up: rewarding a measurable
   proxy, not the thing that matters.

## Caveats / to strengthen

- n=1. To convert these into headline numbers, run 3× per arm and report means ± spread (the harness is
  re-runnable: `--ids "$(jq -r '.fair|join(",")' editing-eval-subset.json)"`).
- MIMO's +0.075 is driven substantially by `algo-roman` (0→1) and `viz-revenue-bars` (0→1) — both genuine
  (the bash-only arm hit the 21-step cap mid-task), but a 2-eval swing at n=1; a 3× run would confirm.
- Add a decomposition metric (cell count / code-metrics MI of the produced module) to make the *process*
  gain measurable rather than anecdotal — that is the eval the current suite is missing.

## Files

Slim, transcript-stripped scored results (id / aggregate / per-criterion pass) committed alongside this doc:
- `ab-sonnet-before.json`, `ab-sonnet-after.json` (sonnet arm).
- `ab-mimo-before.json`, `ab-mimo-after.json` (mimo arm).
- Builds: `robocoop-4_{BEFORE_bash-only_9f7b205,AFTER_claude-tools_01b31df}.html` (+ `_mimo` model-injected copies).

(Full transcripts live in the gitignored `tools/robocoop-4/eval/live/results/` from the run; re-runnable
via the commands in `experiment-bash-vs-tools.md`.)
