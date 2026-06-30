# Verdict: is the thesis correct?

*Experiments run 2026-06-29/30. Pass-rate A/B: `tools/robocoop-4/eval/live/results/ab_mimo/` + `data/ab-results.csv`.
Efficiency ladder (the decisive test): `tools/robocoop-4/eval/live/results/strategy/` + `data/strategy-ladder-mimo.csv`.*

## Short answer

**Yes — on the right axis.** The thesis fails on pass-rate and succeeds on efficiency, and efficiency is what
matters because it converts to correctness at scale.

- **On pass-rate (wrong axis): no signal.** Adding Claude-shaped tools (`01b31df`) over bash/sed (`9f7b205`)
  produced no measurable change on the editing subset, for two models, within single-run noise. The tasks are
  ~1–10 cells; every surface completes them, so the metric is saturated.
- **On efficiency (right axis): a clean 2–3× ladder, reproduced on two models.** Same task, N=3 per arm,
  all 24 runs PASS 1.00, only step-count moves (mean steps; mimo = `xiaomi/mimo-v2.5-pro`, sonnet =
  `anthropic/claude-sonnet-4.6`):

  | arm | distribution / contract | mimo | sonnet-4.6 |
  |-----|-------------------------|-----:|-----------:|
  | Structured | off-distribution semantic API | **24.0** | **22.7** |
  | Bash | on-dist shell (sed/heredoc) | 22.7 | 16.3 |
  | Std Tools (broken contract) | Read/Write/Edit, reformat-on-apply | 19.3 | 18.0 |
  | Std Tools (aligned) | Read/Write/Edit + byte-stable `/src` | **10.3** | **8.0** |

  Aligned vs off-distribution is **2.3× (mimo, 24.0/10.3)** and **2.8× (sonnet, 22.7/8.0)** on the mean, and
  **3.4–3.9× on the hardest off-distribution runs** (`27/8`, `31/8`). The stronger model *widens* the relative
  gap rather than closing it — its aligned arm is dead-consistent at `8/8/8`. (Bash vs broken-contract Std
  Tools is a near-tie and reorders between models; the robust signal is the two endpoints.)

## Why pass-rate couldn't see it

1. **Tasks are tiny** — 1–10 cells; the incremental-edit advantage only bites on large multi-edit builds.
2. **Saturation** — when every arm scores ~1.0, a real cost difference is invisible.
3. **Wrong quantity** — completion is binary; the thesis is about *work to completion* (steps/tokens).
4. **One run per cell** — single 0↔1 flips dominate noisy means.

The fix was to stop scoring completion and start counting steps, N=3.

## Two boundaries the ladder reveals

- **Distribution.** sed is *on*-distribution (a shell). The truly off-distribution surface is a structured
  semantic API (`define_variable` & friends) — the most expensive arm (24.0), forced into 13 fine-grained
  calls plus heavy `eval_code` verification churn (4 → 25). The model even reaches for `write_file`/`eval_js`
  by reflex when handed only the structured tools — the on-distribution prior leaking through.
- **Contract inside the zone.** Right signatures but a file reformatted between read and edit costs ~2×
  (19.3 vs 10.3). Honouring byte-stability (one-line `/src` fix, `0c8a33a`) recovers it.

## Efficiency → correctness at scale (the load-bearing claim)

The ladder's 2× contract row is the same defect that, on a DAW-class build, turned the output from **42
decomposed cells** (contract honoured) into a **691-line monolith** (contract broken) — the model fell back to
full rewrites because its `edit_file` precondition kept breaking. Same model, same prompt; the only change was
byte-stability (`0c8a33a`). At small scale a broken contract is "slower"; at large scale it is "wrong." That
is why efficiency, not pass-rate, is the metric to design against.

## Bottom line for the post

Lead with the ladder: **same model, same task, same correctness, up to 3× fewer steps purely from harness
shape** — on-distribution beats off-distribution, and honouring the tool contract beats merely copying its
signatures. Then show the DAW: the small-task efficiency gap is the large-task correctness gap arriving early.
Title: *Harnessing the jagged frontier for 3× LLM efficiency gains.*
