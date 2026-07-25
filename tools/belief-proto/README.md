# belief-proto

Bun prototype for the belief-state-geometry notebook (`plans/animated_beleif_state.md`).
Validates that a small hand-rolled transformer reproduces the results of
"Transformers Represent Belief State Geometry in their Residual Stream" (Shai et al.).

## Files

- `processes.ts` — HMMs as token-labeled transition matrices (Mess3, RRXOR, Z1R, transcribed from epsilon-transformers), sampling, Bayesian belief updating.
- `gpt.ts` — GPT (pre-LN, causal MHA, GELU MLP) with hand-written backprop on Float64Arrays. ~26k params at the default 2L×32d config.
- `probe.ts` — closed-form ridge regression + R².
- `png.ts` — dependency-free PNG encoder + scatter rasterizer, barycentric simplex layout, belief→color map.
- `gradcheck.ts` — finite-difference check (`bun gradcheck.ts`; worst meaningful rel err ~5e-9).
- `msp_render.ts` — ground-truth Mess3 MSP fractal via chaos game → `out/msp_truth.png`.
- `train_probe.ts` — `bun train_probe.ts [steps]`: train on Mess3(0.05, 0.85), probe final-layer residuals → belief simplex, render probe/shuffle-control/emergence PNGs, save `out/model_mess3.json`.
- `rrxor_twins.ts` — `bun rrxor_twins.ts [steps] [--render-only]`: train on RRXOR, test whether residuals separate belief states with identical next-token predictions.

- `worker_train.ts` / `train_parallel.ts` — `bun train_parallel.ts [workers] [rounds] [K]`: multi-core local SGD (federated averaging). Workers train independently for K steps on their own sampled data; main thread averages weights once per round. postMessage + transferables only — no SharedArrayBuffer, so the same design runs in a browser without cross-origin isolation (notebook workers built from a cell-text blob URL).
- `eval_utils.ts` — shared eval-set/probe helpers used by the parallel trainer.
- `step_demo.ts` — steppable next-token machine: B=1 inference clone, padded-prefix prediction (verified exact vs full context), per-step model-vs-optimal KL and probe-belief-vs-true-belief tracking, scripted Bayesian-surprise step.

## Results (2026-07-04)

- Mess3, 12k steps (~2.8 min, 14 ms/step): eval 0.811 vs optimal 0.800 nats; probe R² 0.997; fractal visible in `out/probe_final.png`; shuffle control collapses (R² 0.003).
- Parallel (8 workers, K=50, M1-class 10 perf cores): **526 aggregate steps/s (92% scaling efficiency)**. Matches the 168s single-thread baseline quality in **~15s** (eval 0.8113, R² 0.995 at round 20) and beats it at 45.8s (eval 0.8108, R² 0.9976). Weight averaging acts as variance reduction — no convergence penalty at K=50.
- Stepping inference: 0.13–0.22 ms/step; model tracks the optimal Bayesian predictor at KL ≈ 1e-4 including immediately after forced low-probability tokens; probe-projected residual stays within L1 0.01–0.09 of the true belief.
- RRXOR: twin belief states (S / "0" / "1", all predicting 50/50) linearly separable from residuals at 76% (layer0) / 86% (final) / 94% (concat) vs 50% chance, while the model's own logits are uniform. Readout-simplex figure: `out/rrxor_twins.png`.

## §11: world-zoo mixture (one machine, many worlds)

- `meta_identifiability.ts` / `meta_ident_wide.ts` / `meta_ident_coarse.ts` — exact grid-Bayes posterior over continuous Mess3 θ=(x,α), uniform prior. Result: √n-slow contraction (8.0→6.3 bits over 128 tokens); x/α confounded (emission flip vs state switch) → posterior ridge. Demoted to an aside.
- `meta_worlds.ts` — posterior over 5 structurally distinct V=3 worlds {mess3, cycle3, norepeat3, skew3, iid3}: H(world) 2.32→0.15 bits within ctx 32, truth mass 0.90–1.00 by token 24. The §11 design.
- `meta_train.ts` — mixture training in the worker pool at ctx 32 (C=48 F=192, 58k params): eval 0.8601 vs meta-Bayes floor 0.8544 after 4000 steps. Saves `out/model_zoo.json`.
- `meta_probe2.ts` — probe experiments on the saved model. Winner: concat l0+l1 residuals, fit log(posterior), softmax readout → R² 0.79–0.97, L1 0.034, 93% argmax agreement with exact Bayes.
- `meta_em.ts` — can Baum-Welch learn the zoo mixture? Yes, mostly: the union is a 15-state HMM (truth-init scores the floor exactly); random-init EM held-out gaps: S=5 +0.090 (fails), S=10 +0.014, S=15 +0.010, S=20 +0.006 ≈ transformer +0.006. The honest distinction is emergent vs by-construction belief representation, not predictive loss.
- `probe_crispness.ts` — why the probe fractal is blurry: per-position blur |η̂−η|, presentation renders, per-position-probe experiment. Findings: blur is width-bound not step-bound (C=32 identical at 12k vs 40k steps); per-position probes cut blur ~40%; C=64/T=16 + per-position → 0.002–0.008 (crisp). tf.js rejected — faster steps don't lower the encoding floor.
- `train_big.ts` — train_parallel with C/F/T as argv; produced `out/model_big_C32_T10_40000.json`, `out/model_big_C64_T16_20000.json`.
