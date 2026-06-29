# Verdict: is the thesis correct?

*Experiments run 2026-06-29. Raw data: `tools/robocoop-4/eval/live/results/ab_mimo/{before,after}.json` (mimo),
`results/AB-{before,after}*.json` (sonnet). Curated 21-eval editing subset; both adjacent builds; outcome-scored.*

## Short answer

**The strong form of the thesis — "adopting Claude-shaped Read/Write/Edit tools gives a massive benchmark
boost" — is NOT supported by the A/B.** Adding the tools (commit `01b31df`) produced no measurable gain over
bash/sed (commit `9f7b205`) on the editing subset:

| model | BEFORE (bash/sed) | AFTER (Claude tools) | Δ all-21 | in-place tier (6) Δ |
|-------|------------------:|---------------------:|---------:|--------------------:|
| MIMO (`xiaomi/mimo-v2.5-pro`) | 0.822 | 0.866 | **+0.044** | −0.095* |
| Sonnet (`anthropic/claude-sonnet-4`) | 0.941 | 0.914 | **−0.027** | 0.000 |

\* one AFTER run (`el-delete-prune`) was a driver flake (`ok:false`, steps=0); excluding it the in-place tier
is ≈ flat. The mimo +0.044 is **within single-run noise** — it's the net of offsetting 0↔1 flips
(`algo-roman` 0→1, `viz-revenue-bars` 0→1, but `algo-balanced-brackets` 1→0.25, `import-cross-module`
0.63→0.38), each from a single run per cell. Sonnet, which is more stable, went slightly **down**.

So on this benchmark, **bash+sed ≈ bash+Claude-tools.** Taken literally, the thesis fails here.

## Why the benchmark can't see the thesis (the important part)

Four reasons the A/B is the wrong instrument — and the fourth is decisive:

1. **The tasks are tiny.** Most evals build 1–3 cells or make one edit. The Claude-Edit advantage
   (incremental edits without rewriting the file) only bites on **large, multi-edit** builds. A one-write
   task is equally easy with sed or `write_file`.
2. **One run per cell → high variance.** Single 0↔1 flips dominate the means; you'd need N≥3 to denoise.
3. **Decomposition isn't scored.** None of the 21 evals measure cell-count / maintainability. The thesis's
   actual payoff — decomposed output — is invisible to these criteria.
4. **The AFTER-adjacent build has the tools but NOT the contract.** Verified in the pinned `01b31df` build:
   after every apply it runs `writeText(path, exportModuleJS(id).source)` — it **reformats the agent's own
   file on each edit** (and there is no `/src` stable tree). That is exactly the bug that breaks `edit_file`'s
   `old_string` precondition, which was only fixed later by the `/src` byte-stability cache (`0c8a33a`). So at
   `01b31df` the Claude tools degrade to rewrites on any multi-edit task — they behave like sed. The adjacent
   A/B therefore compares *sed* against *Claude-tools-with-a-broken-Edit-contract*. No wonder they tie.

## The refined thesis, which the evidence DOES support

It is not "use Claude-shaped tool signatures." It is: **honor the full tool contract — including file
byte-stability between read and edit — and the payoff shows up on large, multi-edit tasks, measured as
decomposition/editing reliability, not as small-task completion.**

Supporting evidence (the `/src` result, `0c8a33a`): the *same model* on the *same DAW prompt* went from a
**691-line monolith** (rewrite-the-world) to **42 decomposed cells via 25 `edit_file` : 1 `write_file`, 0
errored**. The flip came from the byte-stability fix, i.e. from completing the contract — adding the tool
signatures a few days earlier (`01b31df`) had not moved the benchmark at all.

## What would actually confirm/refute it (not yet run)

The A/B above is necessary housekeeping but not the right test. The decisive experiment:

- **Task:** a LARGE multi-edit build (DAW-class), not the small subset.
- **Arms:** bash-only (`9f7b205`) vs the **current** build (Claude tools **+** `/src` byte-stability) — not
  `01b31df`, which lacks the contract.
- **Metric:** decomposition (produced-module cell count / code-metrics MI) **and** correctness/zero-errored —
  not just a pass/fail completion aggregate.
- **Repeats:** N≥3 per arm to clear the single-run variance seen above.

Prediction under the refined thesis: completion ≈ similar, but decomposition and edit-success-rate jump
sharply for the tools+`/src` arm. If decomposition is also flat, the refined thesis is wrong too.

## Bottom line for the post

Lead with the honest result: **tool *signatures* alone bought nothing measurable; honoring the tool
*contract* (byte-stability) is what unlocked the behavior — and only on tasks big enough to need incremental
editing, measured on the right axis.** That's a sharper, more defensible, and more useful claim than "match
the shape and win," and the data backs the sharp version, not the broad one.
