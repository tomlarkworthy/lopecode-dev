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

Headline, stated conservatively: **on this outcome suite, at n=1, bash+sed ≈ bash+Claude-tools for both
models.** The strong thesis ("adopt the Claude tool signatures → big benchmark boost") is *not* supported.
Sonnet was flat-to-slightly-down (−0.027); mimo nudged up (+0.075 after dropping the transient, +0.044 with
it) but that delta is **within single-run noise** — it is the net of a few offsetting 0↔1 eval flips
(`algo-roman` 0→1, `viz-revenue-bars` 0→1 vs `algo-balanced-brackets` 1→0.25, `import-cross-module`
0.63→0.38), each from one run per cell. Do not read it as a real model-dependent effect at n=1.

**The decisive confound (verified, not inferred).** The AFTER-adjacent build `01b31df` has the Claude tool
*signatures* (`read_file`/`write_file`/`edit_file`, 10 `old_string` occurrences) but its apply path is
`/^\/notebook/` with `exportModuleJS` **reformatting the file on every apply** — and it has **no byte-stable
`/src` editing tree** (that arrived in `0c8a33a`, this session; the only `/src/` strings in `01b31df` are
vendor CSS CDN URLs). So `edit_file`'s `old_string` precondition is broken there exactly as it was for the
monolith. The A/B therefore compares **"sed" vs "Claude-tools-with-a-broken-Edit-contract"** — and on tiny
1–3-cell tasks those are equivalent. The flat result is expected, and it does **not** test the real claim.

So four reasons the benchmark can't see the thesis: (1) tasks are tiny — the incremental-edit advantage only
bites on large multi-edit builds; (2) n=1 → single 0↔1 flips dominate; (3) decomposition (the actual payoff)
isn't scored by any of the 21 evals; (4) the AFTER build lacks the byte-stability contract, so its tools
degrade to rewrites anyway.

**The refined, defensible thesis.** It is not the tool *signatures* — it is honoring the full tool *contract*
(file byte-stability between read and edit), and the payoff appears only on tasks big enough to need
incremental editing, measured as **decomposition**. That version is backed by the `/src` result: same model,
same DAW prompt → 691-line monolith → 42 decomposed cells (25 `edit_file` : 1 `write_file`), commit
`0c8a33a`. Adding the bare tools days earlier (`01b31df`) moved the benchmark by zero; completing the
contract is what flipped it.

**What would settle it (not yet run; needs new infra).** A *large* build task (DAW-class), arms = bash-only
vs the **current** build (tools **+** `/src`, not `01b31df`), metric = **decomposition (cell count / MI)** +
zero-errored, **N≥3**. Prediction: completion ≈ similar, decomposition jumps hard. If decomposition is also
flat, the refined thesis is wrong too. See `../VERDICT.md` for the full write-up.

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
