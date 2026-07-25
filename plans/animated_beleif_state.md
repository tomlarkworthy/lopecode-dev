# Belief State Geometry, Live — notebook design

A lopecode notebook reconstruction of [Transformers Represent Belief State Geometry in their Residual Stream](https://www.alignmentforum.org/posts/gTZ2SxesbHckJ3CkF/transformers-represent-belief-state-geometry-in-their) (Shai, Marzen, Riechers et al.), where every figure in the original post becomes a live computation the reader can perturb, retrain, and interrogate.

Target module: `@tomlarkworthy/belief-state-geometry` (working title). Single main module, linear narrative, every diagram carries its own controls.

---

## 1. The narrative arc

Opening paragraph (author's draft, spelling fixed, otherwise verbatim intent):

> LessWrong spectacularly crystallizes exactly what makes transformers *special*. It is an amazing piece of work. I want to expand on that with live computational models of the dividing line between Hidden Markov Models and Transformers.

The notebook is a **paired forced march**: at every stage we do the same thing to an HMM and to a transformer, side by side, on the same data, with the same colors. The reader should feel the two models converging toward each other step after step — same learned parameters, same predictions, same behavior — until the final section reveals the transformer has been quietly doing something *far stranger* than the HMM all along.

The epiphany, staged:

1. **Setup** — here are three toy worlds with hidden state. You can only see the tokens they emit.
2. **Symmetry** — HMM and transformer both learn the worlds. Both predict well. Losses match the theoretical entropy rate. Boring! They look equivalent.
3. **Interrogation** — we open both models up. The HMM's internals are exactly what we built: transition matrices and a single belief vector doing Bayes. The transformer's internals are 64 dimensions of soup... until we fit one linear regression, and the *entire fractal belief simplex* is sitting in its residual stream.
4. **The dividing line** — the HMM holds *one* belief and walks it forward recurrently. The transformer holds *every prefix's belief simultaneously*, one per token position, reconstructed in parallel — and (RRXOR) it keeps belief distinctions that make **zero difference to the next token**, the only thing it was ever trained on. It is not modelling the data. It is modelling *the process of coming to believe things about the data*. What the hell.

Prose rules (from `knowledge/what-makes-a-great-lopebook.md` + author brief): every paragraph earns its place by advancing the reader toward step 4. No paragraph describes UI ("click the button below") — the diagrams are self-evident. No paragraph states a result the reader hasn't just watched happen. Terse, factual, no hyperbole *except* the two sanctioned exclamations: the opening homage and the closing "What the hell?!".

---

## 2. The three distributions

All three are unifilar-enough HMMs specified as **token-labeled transition matrices** `T[k][i][j] = P(emit k, move i→j | state i)`. One shared datatype, one shared engine.

| # | Process | States | Vocab | MSP (belief geometry) | Narrative role |
|---|---------|--------|-------|----------------------|----------------|
| 1 | **Z1R** ("zero-one-random") | S0, S1, SR | {0,1} | **Finite** — a handful of discrete points in the 2-simplex | Warm-up. Belief updating you can follow by eye. The post uses it for exactly this. |
| 2 | **Mess3** (x=0.05, α=0.85) | 3 | {A,B,C} | **Infinite fractal** in the 2-simplex | The headline. The fractal the transformer will reproduce. Parameters x, α are live sliders — the fractal deforms continuously. |
| 3 | **RRXOR** (random-random-XOR) | 5 | {0,1} | Distinct belief states with **identical next-token predictions** | The twist ammunition for the finale. |

Z1R: `S0 --0--> S1 --1--> SR --(0|1, 50/50)--> S0`. Mess3 matrices: transcribe exactly from the authors' [epsilon-transformers](https://github.com/adamimos/epsilon-transformers) repo `mess3(x, a)` — do **not** re-derive from the prose. RRXOR: emit two fair bits then their XOR, as a 5-state HMM (also in that repo).

Each process is one data cell: `z1r`, `mess3(x, alpha)` (a function of the sliders), `rrxor`, all shaped `{name, states, vocab, T, start}`. A `viewof processChoice` radio selects the "followed" process; the whole notebook downstream is reactive to it. Sections that only make sense for one process (the fractal deep-dive → Mess3, the degeneracy finale → RRXOR) pin their process locally instead of following the selector.

---

## 3. Shared infrastructure (defined once, reused everywhere)

This is the author's "these cells are REUSED" requirement. Two mechanisms:

- **Pure renderer functions** — cells that are *functions* returning DOM (`renderTransitionDiagram(process, {beliefs})`, `renderSimplex(points, {colors, trails})`, `renderTicker(seq, pos)`, `renderMatrixHeatmap(T)`). Each section instantiates them; no DOM node is ever shared (Observable moves shared nodes — see `inspect() moves live DOM nodes`).
- **`Inputs.bind` control mirrors** — canonical `viewof` cells (`viewof seed`, `viewof mess3x`, `viewof mess3alpha`, `viewof seqLen`, `viewof processChoice`) defined once in §4's figure; every later figure that wants local control embeds `Inputs.bind(Inputs.range(...), viewof mess3x)` clones inside its own composite view. Same reactive state, controls physically next to every diagram — **no scrolling to interact**, which was an explicit brief requirement.

Core computation cells (all pure, all testable):

| Cell | Signature | Notes |
|------|-----------|-------|
| `sampleSeq` | `(process, len, rng) → {tokens, states}` | keeps hidden states for ground truth |
| `beliefUpdate` | `(process, η, token) → η′` | one Bayes step: `η′ ∝ η·T[token]`, normalized |
| `beliefTrajectory` | `(process, tokens) → η[0..len]` | forward algorithm, starts at stationary distribution |
| `mspPoints` | `(process, {depth or nSamples}) → [{η, prob, prefix}]` | fractal generator — chaos-game style (sample many sequences, collect belief points) rather than exhaustive tree; it's an IFS, so this converges fast and animates beautifully |
| `beliefColor` | `η → css color` | barycentric → RGB. **The single most important cell in the notebook**: the same coloring is applied to ground-truth simplices AND residual-stream projections. Color identity is how the reader's eye proves the correspondence. |
| `simplexProject` | `η (3-dim, or 5-dim for RRXOR via PCA) → [x,y]` | barycentric coordinates |

Rendering: canvas 2D for point clouds (up to ~60k points), SVG/htl for transition diagrams and tickers, Plot for loss curves. No external fonts, no CDN (self-contained rule).

Animation discipline (repo rubric #14/#15): every rAF loop is torn down via `invalidation`; paused animations freeze their source with `Generators.observe` rather than depending on `now`; every long computation streams visible progress (loss curve ticks, point-count counters) — nothing is ever silently busy.

---

## 4. Section-by-section design

### §0 — Title + opening paragraph

Prose only. The homage paragraph, then one paragraph stating the contract: *"Everything below runs in this file. Every figure is live. When you drag a slider you are re-running the same mathematics the paper ran."*

### §1 — "We will follow three distributions..."

**The master figure.** A composite view (`viewof world`), the notebook's persistent laboratory:

```
┌─────────────────────────────────────────────────────┐
│ (•) Z1R  ( ) Mess3  ( ) RRXOR      seed [🎲 resample]│
│ Mess3: x ────●─── 0.05   α ──────●─ 0.85            │
├──────────────────────┬──────────────────────────────┤
│  Transition diagram  │  Token timeseries            │
│  (SVG, nodes+arcs,   │  ▮▮▯▮▯▯▮ ABCABBA...          │
│   arc width = prob,  │  3 sample rows, hidden-state │
│   emission labels)   │  color underlay (toggleable) │
└──────────────────────┴──────────────────────────────┘
```

- Computation: `sampleSeq` × 3 rows.
- Interactivity: process radio, x/α sliders (Mess3), seed resample button. Everything downstream reacts.
- Motion: on resample, timeseries rows type themselves out left-to-right (~600ms rAF sweep) with the emitting state pulsing in the transition diagram — this *is* the mental model of an HMM generating, planted in the first 10 seconds.
- Prose beat: "You will only ever see the bottom half of this figure. So will both of our models. The question of this notebook is: what do you have to *build inside yourself* to predict the bottom half well?"

### §2 — How the HMM learns

- Computation: **Baum-Welch EM** from random init on ~200 sampled sequences. 3–5 states, converges in well under a second — so **slow it down on purpose**: an async generator cell `hmmTraining` yields one full snapshot `{iter, logLik, T̂}` per animation frame (cumulative snapshots, never deltas — runtime drops intermediate yields).
- Viz: learned `T̂` as per-token heatmap grid morphing over iterations, side by side with the frozen ground-truth heatmap; log-likelihood curve filling in beneath.
- Interactivity: `[Train HMM]` button (Inputs.button gates the generator), local bound seed control, `[re-init]`. State permutation note: align learned states to true states by best-permutation matching before displaying, or the heatmaps look wrong even when learning succeeded.
- Prose beat: EM is *hill-climbing on explanations*: "the HMM is told the shape of the answer — three hidden states, look for them — and fills in the numbers."

### §3 — How the Transformer learns

- Computation: hand-rolled minimal GPT in plain JS typed arrays — **the transformer's cells are part of the literate text** (`embed`, `attentionHead`, `mlpBlock`, `forward`, `backward`, `adamStep`). Default config: 2 layers, d_model=32, 4 heads, ctx=10, vocab≤3 — smaller than the paper's 4×64 but sufficient for visible geometry; a config object cell lets readers scale up to the paper's 4×64.
- Training: async generator `tfTraining` yielding `{step, loss, weights}` snapshots every N steps; batch of sampled sequences per step. Torn down via `invalidation` so retrains never leak loops.
- Viz: loss curve with a horizontal line at the **process entropy rate** (computable from the ground-truth HMM) — "the floor that perfect prediction cannot beat". Watching loss asymptote onto the theoretical line is itself a small epiphany.
- Interactivity: `[Train]` / `[Pause]` / `[Reset]`, steps-per-frame slider, local bound process controls. Plus `[Load pretrained]` — checkpoint weights shipped as file attachments (`.../mess3-4L64.json.gz` etc., one per process) so nobody is blocked behind a 1–2 minute train to see §6's crisp fractal.
- Prose beat: the contrast with §2 — "nobody told it there are hidden states. Nobody told it there are states at all. It is graded on exactly one thing: the probability it assigned to the very next token."

### §4 — How the HMM predicts / §5 — How the Transformer predicts

One shared **prediction racetrack** figure, instantiated twice (or as a single dual-row figure — decide during build; dual-row is stronger for comparison):

- A sampled sequence in a ticker with a draggable playhead (`viewof playhead` scrubber + play button).
- Row A (HMM): current belief `η_t` as a dot in the simplex **walking** as the playhead moves, leaving a fading trail; next-token bar chart from `η_t·T`.
- Row B (Transformer): same sequence through `forward`; next-token bar chart from the logits at position t.
- Both bar charts against the true conditional `P(x_{t+1} | hidden state)` as ghost bars.
- Computation: `beliefTrajectory` (row A), one `forward` pass (row B) — both instant, fully reactive to playhead drag. Scrubbing *is* the interaction; no buttons needed.
- Prose beats: §4 — "the HMM predicts by *filtering*: one belief vector, updated by Bayes, marched left to right. This is recurrence in its purest form." §5 — "the transformer has no marching vector — it re-derives its prediction for every position from the whole prefix at once. Yet the bars match. Two completely different mechanisms, indistinguishable outputs. Hold that thought."

### §5½ — The prediction machine (drive it yourself)

The racetrack replays recorded sequences; this figure hands the reader the keyboard. A **steppable next-token machine** built on a B=1 inference clone of whatever model §3 last trained (or the pretrained checkpoint):

```
┌──────────────────────────────────────────────────────┐
│  A A A A A A B A A _          [⟲ reset] [▶ auto] t°──│
│                                                      │
│   [ A  76.6% ]  [ B  11.6% ]  [ C  11.8% ]           │
│    big buttons = model's live probabilities;         │
│    click (or press key A/B/C) to FEED that token     │
│    ghost bars behind each = optimal Bayes prediction │
└──────────────────────────────────────────────────────┘
```

- Computation: one padded-prefix forward per keypress (**~0.2ms measured** — validated exact vs full-context by causal masking, `step_demo.ts`). Prefix beyond ctx slides the window.
- Interactivity: the *buttons are the visualization* — their sizes/fills are the model's probabilities, so choosing the next token and reading the prediction are the same gesture. Keyboard A/B/C for fast play; auto-play samples from the model at a temperature slider; reset reseeds.
- The reader's natural game is adversarial: "what if I type the *unlikely* token?" — which is precisely the Bayesian-surprise lesson. After a run of A's the model is confident (77/12/12); feed it a B and watch prediction and belief snap sideways and re-converge (measured: model tracks the optimal predictor at KL ≈ 1e-4 throughout, including the surprise step).
- Prose beat: "you are now the world, and the machine is inferring you."

**Reprise after §7 (full-geometry mode):** the same component gains a simplex pane — on every keypress, the *true* Bayesian belief (outline dot) and the transformer's probe-projected residual (filled dot) move together across the fractal (measured gap L1 ≈ 0.01–0.09). This is the notebook's unification figure: keystroke → parallel Bayes → geometry, one gesture. Build `predictionMachine(mode)` once as a factory cell with `mode: "bars" | "bars+geometry"`.

**Glass-machine upgrade (BUILT 2026-07-04):** the machine now lays out the transformer's *intermediate computation* per keypress, for readers who have never seen inside one:

```
A A B [A]                                ← token chips, current outlined
token+position embedding   ▌▌▌▌▌▌ (32-dim heat stripe, red + / blue −)
attention L0  h0..h3       □□■□  ← squares = prior tokens, opacity = weight
+ attention output         ▌▌▌▌▌▌
+ MLP                      ▌▌▌▌▌▌
attention L1  h0..h3       ...
+ attention output / + MLP ...
unembed → logits           A ▬ 1.12  B ▬ −0.27  C ▬ −0.68   (signed bars)
[ A 70.9% ][ B 17.5% ][ C 11.6% ]        ← softmax = the buttons
```

Right pane payoff: per-stage ridge probes (embedding, after each block; fit via `probeKit.collectStages` in one forward pass, shipped through `modelBox.stageProbes`) plot the belief estimate at each depth — **the belief visibly crystallizes through the network** toward the true-Bayes ring. Emergent pedagogy observed in QA: attention heads visibly lock onto the surprising token (feed A A B A and every L0 head lights on the B). Skeleton DOM is built once; canvases redraw in place, so training updates never reflow the figure.
- Footnote beat (dividing line, worth one aside): past the context window the transformer *forgets* — its window slides — while the HMM's belief is a sufficient statistic of unbounded history. Mess3's belief dynamics are contractive so you can barely tell; that near-invisibility is itself worth one sentence.

### §6 — What did the HMM learn? / §7 — What did the Transformer learn?

The centerpiece pair.

**§6 (HMM):** the learned machine *is* its explanation. Show `T̂ ≈ T`. Then introduce the Mixed-State Presentation properly: "run the belief walker over *every possible* prefix and keep all the dots." The `mspPoints` chaos-game animation: points rain into the simplex a few hundred per frame, and for Mess3 the fractal **self-assembles in front of the reader** (this is the Sierpinski chaos game, and it looks like one). Z1R shows a crisp finite constellation instead; the x/α bound sliders deform the fractal live. Points colored by `beliefColor`, sized by prefix probability.
- Prose beat: "this triangle is every belief it is possible to hold about this world. Computational mechanics says an optimal predictor must live somewhere in this picture."

**§7 (Transformer):** the probe.
- Computation: run ~2k sampled sequences through the trained net; collect final-layer residual activations at every position (N≈20k × d); ground-truth beliefs from `beliefTrajectory`; closed-form least squares `W = (XᵀX)⁻¹XᵀY` (d×d inverse — trivial in JS); project predicted beliefs to the simplex plane.
- Viz: the projected cloud, colored by **ground-truth** `beliefColor`, rendered with identical axes/size directly beside §6's theoretical fractal. The reader's eye does the theorem.
- Interactivity, in escalating order of devastation:
  1. `[shuffle labels]` toggle — the paper's control: regression on shuffled beliefs collapses everything to the simplex center. The fractal is *in the activations*, not in the regression's imagination.
  2. **Layer picker** — probe layer 0..L: geometry sharpens with depth (and sets up §10's RRXOR reversal).
  3. **Emergence scrubber** — checkpoints saved during §3's training (every N steps into a ring buffer); a slider sweeps training time and the fractal **condenses out of noise**, live. This is the post's most famous animation, except here the reader trained the model themselves and can scrub it by hand.
- Prose beat: "one linear map. Not a decoder network, not a cherry-picked neuron — a single matrix multiplication, and the entire belief simplex is sitting there. The transformer built the same triangle the mathematics demanded, out of gradient descent and next-token loss alone."

### §8 — How the HMM predicts after the first token / §9 — How the Transformer predicts after the first token

Zoom the racetrack into t=1, where the asymmetry becomes visible.

- Viz: prefix = one token. HMM: prior η₀ (stationary dot) jumps to η₁ — one dot, one hop, animated. Transformer: show the residual-stream point at position 1 landing on the corresponding point of the probed fractal — *and then extend the prefix*, and show the transformer's per-position residual points **all present simultaneously**, one glowing dot per position, tracing the belief path the HMM walked one step at a time. A `[step]`/`[play]` control grows the prefix token by token; HMM row shows one moving dot, transformer row accumulates a constellation.
- Computation: reuse `beliefTrajectory`, `forward` + probe from §7. Nothing new — payoff of the reuse architecture.
- Prose beat: "the HMM has a present tense: one belief, now. The transformer holds every moment of the belief walk at once, position by position, recomputed in parallel every time. It is not running the filter — it is *rendering the filter's entire history*."

### §10 — What the hell?!

Pin process = RRXOR. The finale.

- Setup viz: RRXOR's MSP with pairs of belief states highlighted that have **identical next-token predictions** — hover/tap a belief point and its "prediction twin" lights up, with both bar charts shown literally equal.
- The kill: probe the trained RRXOR transformer. Next-token loss cannot distinguish the twins — no gradient ever flowed that *needed* them separated. Show the residual geometry (per the paper, spread across layers for degenerate processes — probe the **concatenation of all layers**, and include a per-layer picker so readers see it's genuinely distributed): the twins are **separated anyway**. Toggle `[color by next-token prediction]` vs `[color by belief state]` — under the first coloring the twins merge; under the second, the transformer's geometry keeps them apart, matching belief, not prediction.
- Closing prose (the paragraph the whole notebook exists for): the transformer was optimized to predict the next token, and it learned distinctions that are *provably worthless* for predicting the next token — because they matter for predicting *futures beyond it*. It represents the geometry of an ideal reasoner's evolving uncertainty. That is the dividing line: the HMM is a model of the world; the transformer taught itself to be a model of *belief about the world*.
- End with pointers: the original post, epsilon-transformers repo, Marzen & Crutchfield.

### §11 — One machine, infinitely many worlds (PROPOSED 2026-07-04, revised: contraction story)

Honest problem with §2–§9 as built: the reader watches Baum-Welch nail Mess3 exactly and cheaply — because EM was handed the model family and the state count. The scoreboard reads "classical methods win." §11 exists to show the thing a transformer can *represent* that a fitted HMM cannot: a belief over **which world it is in**, held jointly with the belief over where it is inside that world, contracting live as evidence arrives.

**Setup (validated 2026-07-04, `meta_worlds.ts` / `meta_identifiability.ts`).** Train ONE transformer on a mixture over a **world zoo**: each training sequence draws one of K=5 structurally distinct V=3 processes uniformly — `mess3(0.05,0.85)` (the fractal), `cycle3` (noisy A→B→C), `norepeat3` (never the same token twice), `skew3` (iid, biased letter frequencies), `iid3` (uniform). The exact optimal predictor is a meta-Bayesian holding a joint posterior over (world, hidden state) — just **15 numbers**, updated exactly per token: ground truth, loss floor and probe targets all closed-form.

Measured contraction (uniform prior, exact Bayes): H(world) falls 2.32 → 0.93 bits by token 8 and 0.15 bits by token 31; every world reaches 0.90–1.00 posterior mass on the truth within a 24–32 token context. So **ctx 32** makes the story land inside one context window.

Why not a continuous parameter family: measured on a 16×16 θ-grid over Mess3 (x, α), even a wide uniform prior contracts only 8.0 → 6.3 bits in 128 tokens, with the 90% credible region still ~32% of the plane. The cause is intrinsic: an off-symbol can be an emission flip (x) or a state switch (α) — the parameters are confounded at the token level, so the posterior contracts along a ridge, √n-slowly. Worth one aside ("even the ideal reasoner cannot tell noise from stickiness in a short window — and the network's uncertainty inherits exactly that ridge"), but structural worlds carry the centerpiece: their likelihoods diverge exponentially fast.

**The centerpiece figure — belief contraction.** The visual story the section is built around: *start from total ignorance, watch the network's belief shrink onto the true world.*
- Left pane, world posterior: K bars (or a 5-cell strip) — frame 0 is uniform (the reader literally sees "no idea"), collapsing token by token onto the hidden true world. Two rows: exact Bayes above, the transformer's probed readout below, moving in lockstep. Probe target = the 5-dim world posterior itself (softmax readout, same closed-form ridge machinery as today).
- Right pane, simplex: **the geometry coming into focus.** Each world has a visually distinct MSP — mess3's fractal, cycle3's 3-point orbit, norepeat3's constellation, skew3/iid3's fixed points. Draw all five point clouds superimposed, each alpha-weighted by the current posterior mass (the new density rendering makes this readable): early context = a blur of five possible geometries; as tokens accumulate the superposition collapses into the single crisp geometry of the true world. "The machine is not uncertain about a point on the fractal — it is uncertain about *which geometry it lives in*, and both uncertainties shrink together."
- Controls: step / play / reset, hidden-world reveal, and a "new mystery world" button. Same component doubles as the glass-machine mystery mode (reader types tokens, watches the contraction respond — including feeding tokens that *no* world predicted and watching the posterior lurch).

**Supporting figure — the world chart.** Scatter the probe's world-posterior readout for held-out sequences, position by position, colored by true world — five clouds starting mixed at the center and migrating to their corners as position increases. In-context inference rendered as geometry.

- Prose beat: "the HMM learned Mess3. The transformer learned Bayes." One set of weights, a continuum of worlds.

**Prototype status (tools/belief-proto) — ALL VALIDATED, SECTION BUILT 2026-07-04:**
1. Identifiability: `meta_worlds.ts` (world zoo, fast contraction — the design above) and `meta_identifiability.ts` + variants (continuous θ — slow ridge, demoted to an aside).
2. Mixture training (`meta_train.ts`, 8 workers, ctx 32, C=48 F=192 ≈ 58k params): **eval 0.8601 vs meta-Bayes floor 0.8544** (0.006 nats gap) after 4000 steps (~7 min in Bun; ~10 st-steps/s in the pool — the zoo model is ~10× slower per step than the ctx-10 mess3 model).
3. Probe recipe (`meta_probe2.ts`): final-layer linear probe is mediocre (R² 0.51–0.87, L1 0.153). Winner = **concat l0+l1 residuals, fit log(posterior), read back through softmax**: R² 0.79–0.97, L1 0.034, argmax agrees with exact Bayes 93.2%, picks the true world 89.6% (Bayes ceiling 92.6%) at t≥16. Same lesson as the rrxor twins (spread across layers) + log-space encoding.
4. Notebook cells shipped in `belief-state-geometry.js`: zoo + meta-Bayes in beliefKitFactory (flows into workerSource automatically), `zooCfg/zooEval/zooModelBox/zooSnapshot/zooProbeData/zooProbeReport/zooLossFigure/contractionFigure`; trainState shared Map keyed `zoo|cfg`. Contraction figure = mystery-world game: play/step/new/reveal, Bayes bars + probe bars in lockstep, five geometry clouds alpha-weighted by the network's world-belief. Degrades gracefully: exact-Bayes contraction works with zero training.

**Can EM catch up? (`meta_em.ts`, 2026-07-04) — yes, mostly; the section must be honest about it.** The zoo mixture is secretly a 15-state HMM (block-diagonal union; truth-initialized union scores exactly the floor, 0.8572). Baum-Welch from random init, 3 restarts, held-out gaps to the floor: S=5 **+0.090** (capacity starvation, fails), S=10 +0.014, S=15 +0.010, S=20 **+0.006** ≈ transformer +0.006. No local-optima disaster. Consequences for the prose: (1) never claim "an HMM cannot represent the mixture" — representability arguments are weak, HMMs are dense in this space just like neural nets; (2) the state-count sensitivity IS the honest "whisper" point (EM-5 fails; the transformer self-allocates its 58k params); (3) the surviving distinction is *what was learned*: the fitted HMM's forward filter is Bayes **by construction** — its posterior is the algorithm we wrote; the transformer's world-posterior is **emergent** — SGD on next-token prediction reinvented Bayesian filtering and left a calibrated, linearly-readable copy of it in the residual stream. That is the paper's actual claim, and it is what the probe row + §7 fractal show. §11's bullets updated accordingly ("honesty box").

**Fractal crispness investigation (`probe_crispness.ts`, 2026-07-05) — user: probe figure "not compelling" vs ground truth; tf.js to train faster?** Diagnosis: the probe scatter's blur is representation-precision-bound, NOT training-time-bound. Per-position mean |η̂−η| (simplex units) is the blur radius; mess3 depth-3 sub-triangles are ~0.03–0.06 across so blur must be ≲0.008 to see recursion. Measured:
- C=32 @ 12k steps: blur 0.013–0.019 (late positions worst — finer fractal structure is encoded less precisely). **@ 40k steps: identical.** More training does nothing; R² flat at 0.9977 from step ~3k. So faster training (tf.js) would not help crispness at this width.
- Per-position probes (one ridge map per position instead of one pooled map that must ignore positional components): blur ↓ ~40% for free (t=9: 0.019→0.011 at C=32).
- C=64/T=16 (20k steps, ~28 min in Bun pool): pooled blur 0.013, **per-position blur 0.002–0.008** — at the crispness target; rendered scatter shows depth-2 clearly + depth-3 voids emerging.
- tf.js verdict: NOT adopted. Bundle +1.5–4MB into a 3.2MB single file, full rewrite of the hand-backprop GPT, and the measured bottleneck (encoding precision at given width) is unaffected by step rate. GPU wins only via giant batches at these tiny sizes (~5–15× sample throughput) — irrelevant given the above. Revisit only if we want paper-scale (4L×64d, millions of steps) live training.
- ADOPTED in module: mess3 trainCfg → {T:16, C:64, F:256} (in-browser ~7.5 st-steps/s, floor in ~5 min); per-position probes in probeData + emergenceFigure + racetrack (finalWs per position); probe refit throttled to every 250 steps (refit costs ~1.4s at C=64).

### Mechanism pedagogy upgrade (user request 2026-07-14): microscope, backprop stepper, fusion view

**STATUS: SHIPPED 2026-07-14 + browser-QA'd.** All three figures live in the module and synced to the notebook. Deviations from the design below: microscope is 8 stages (dropped "layer 1 = same machinery" as a stage — the layer picker covers it); backprop stage 3 shows the d.lnfout stripe (per-tensor wu pressure folded into stage 5). QA: all stages step cleanly, machine→microscope live link works, backprop uses machine tokens + sampled completion, fusion capture costs nothing measurable (9.5 agg steps/s with it, ~7.5 baseline), zero console errors.

**D. Architecture map (added same day, user request "visualization of the GPT architecture trained").** Placed between the machine and the microscope: the whole network as a block diagram with every weight matrix drawn as a live signed heatmap (ImageData 1px/cell, CSS pixelated scaling; red +, blue −, brightness = |w|/max per tensor). Embedding (wte, wpe) → per-layer attention block (LN γ, wqkv with Q|K|V color strips + head ticks, wo) → ⊕ → feed-forward block (LN γ, wfc, wproj) → ⊕ → final LN + wu. Per-tensor shape/param captions, stage tags cross-referencing the microscope, total param count (101,507 at mess3 C=64). Repaints in place on modelBox updates (1s throttle, zero throughput cost) — untrained it is visibly pure noise; under training wqkv develops row structure within ~500 steps, which is the point: "this IS what training builds."

**E. Flow figure (poloclub Transformer-Explainer-style, user request + refinement).** Between the machine and the architecture map: the network unrolled end to end in one SVG — per-token residual lanes run left to right through BOTH layer frames; inside each frame all H heads are drawn as successive gather points where variable-width Bézier ribbons (hand-rolled cubic, no d3 needed) converge from every lane onto the followed position, ribbon width = that head's live attention weight (top-1 % labeled when > 30%); then ⊕attn, the MLP box crossing all lanes, layer 1 identical, final LN/unembed box, probability ribbons + bars. Click a token chip to follow a different position; driven by machineState + modelBox like the microscope. First version had layer/head pickers + a T×T grid; user: unclear how heads/layers compose → unrolled everything, no pickers. Layer-1 weights read from the same real forward pass. Reference: https://github.com/poloclub/transformer-explainer (not embeddable: Svelte app + 600MB GPT-2; visual grammar rebuilt natively against the hand-rolled GPT).

User critique of the glass machine: it shows *that* intermediates exist, not *how* they are computed — "if you do not already know how a transformer computes, this visualization is useless." Three additions:

**A. The microscope (§5¾, below the machine).** A stage-by-stage walk through the forward pass for the CURRENT position of the machine's token stream (shared via a `machineState` EventTarget — the machine drives, the microscope explains). Stepper UI (prev/next + stage list), layer picker, head picker. Stages: (1) embedding: wte[token] + wpe[pos] = h0, stripes with numeric readouts; (2) LayerNorm with the actual mean/rstd; (3) Q/K/V: three learned projections of the same normalized vector, color-framed (Q purple, K teal, V orange), head slice (16 dims); (4) **scores — the money stage**: q·k/√d per prior token as numeric+bar rows, softmax → the weight squares the machine already shows; (5) mix: value stripes with opacity = weight summing into the head output — attention is a soft lookup; (6) project + residual ADD (the highway); (7) MLP expand→GELU→project (wide thin 256-dim strips); (8) layer 1 = same machinery again; (9) unembed: dot with each token's output column → logit bars → softmax. All values read live from the B=1 clone's `act` buffers (`qkv` layout: q at h·hs, k at C+h·hs, v at 2C+h·hs; ln1mean/rstd stored per position). Works with untrained weights (mechanism ≠ training), labeled as such.

**B. Backprop stepper (§5⅞, separate — too slow to animate live).** One button computes one full forward+backward on the machine's stream (auto-completed to a full window by sampling the true process so no padding pollutes gradients; B=1 clone, `d.*` buffers already exist in the hand-rolled GPT). Reverse-order stages: (1) per-position loss bars; (2) dlogits = probs − onehot — the error signal IS the difference; (3) gradient at the unembed + d.lnfout stripe; (4) the residual highway carries error backwards too: d.res3 → d.res2 → d.h0 stripes per layer; (5) parameter pressure: ‖g‖/√n bar per weight tensor — where learning pressure lands; (6) the nudge: top-|g| entries of wu shown as w → w−lr·g. Gradient stripes use a distinct ± palette (green/orange) to separate them visually from activations (red/blue).

**C. Fusion view (§3, beside the loss curve).** Local SGD made tangible in realtime: project each worker's full weight vector onto two FIXED seeded random directions (2 dots per worker per round ≈ 4M mults, negligible vs the round itself). Per round: worker dots scatter (each trained on private data for K=50 steps), then spokes collapse into the averaged consensus point; consensus path drawn over the last ~36 rounds; per-worker EMA-loss sparklines underneath in worker colors. Data captured inside trainSnapshot's existing averaging loop (`st.fusionHist`, cap 60), rendered in-place off modelBox "update" events so nothing reflows and training throughput is untouched. mess3 trainer only for now (zoo later).

**Remaining niceties:** ship pretrained weights as file attachments so crisp figures appear with zero wait (`out/model_big_C64_T16_20000.json` for mess3 §7, `out/model_zoo.json` for §11 — mind the exporter fileAttachments-map requirement); within-world state-belief overlay in the contraction simplex; optionally surface the EM-vs-states table as a small figure (emStep already handles arbitrary nStates).

**Rendering prerequisite (DONE 2026-07-04):** simplex plots upgraded for density readability — HiDPI canvases, alpha-accumulated circles (overlap = brightness = probability mass), chaos game 12k→60k points at 640×560, probe/emergence 2×–2.5× more samples. The superimposed-fractals blur in the centerpiece depends on this.

---

## 5. Cell placement map

Linear order in the module (names final-ish, `_` prefix per lopecode convention):

```
_title, _intro                              §0 prose
_processChoice (viewof), _seed (viewof),
_mess3x (viewof), _mess3alpha (viewof)      canonical controls (rendered inside _worldFigure)
_z1r, _mess3, _rrxor, _process              process defs + selected
_rng, _sampleSeq, _beliefUpdate,
_beliefTrajectory, _mspPoints,
_beliefColor, _simplexProject               engine (pure, tested)
_renderTransitionDiagram, _renderSimplex,
_renderTicker, _renderMatrixHeatmap,
_bindControls                               renderers + bind helper
_worldFigure (viewof)                       §1 master figure
_prose_hmmLearn, _hmmTrainBtn (viewof),
_hmmTraining (async gen), _hmmFigure        §2
_prose_tfLearn, _tfConfig, _embed ... _adamStep  (literate transformer)
_tfTrainBtn (viewof), _tfTraining (async gen),
_checkpoints (mutable ring buffer), _tfFigure    §3
_prose_predict, _playhead (viewof),
_racetrackFigure                            §4+§5 dual-row
_inferenceModel (B=1 clone of trained
weights), _probeW (fitted probe matrix),
_predictionMachine (factory, mode arg),
_machineFigure (viewof)                     §5½ steppable machine
_prose_hmmLearned, _mspFigure               §6
_probeData, _probeFit, _prose_tfLearned,
_probeFigure (layer picker, shuffle,
emergence scrubber)                         §7
_prose_firstToken, _firstTokenFigure        §8+§9
_rrxorPinned, _twinsFigure, _prose_wth      §10
_test_beliefSumsToOne, _test_mspZ1RFinite,
_test_gradientCheck, _test_probeR2          tests (reachable via tests module hash)
_attachments loader                         pretrained checkpoints
```

Composite views via `@tomlarkworthy/view` so each figure owns its bound controls. Pane heights: cap tall canvases with `vh` + overflow (lopepage panes don't bound cell height).

## 6. Feasibility & performance notes

- **Transformer training in-browser**: 2L×32d, ctx 10, vocab 3 ≈ 30k params; plain-JS typed-array backprop manages thousands of steps/min — coarse fractal in ~30–60s of visible training. The paper-scale 4L×64d crisp fractal ships as pretrained attachment checkpoints (JSON weights, gzipped via the DecompressionStream pattern — raw gzip bytes, not base64+gzip encoding on the attachment).
- **Gradient correctness**: `_test_gradientCheck` finite-difference test on a tiny config is non-negotiable before trusting any training curve.
- **Probe cost**: XᵀX at d≤64+1 is nothing; do it every emergence-scrubber tick.
- **Chaos-game MSP**: O(points) with tiny constants; stream ~500 points/frame under rAF with invalidation teardown.
- **RRXOR degeneracy**: the paper notes final-layer probes fail here; budget time to reproduce the concat-all-layers probe, and if the small in-browser net doesn't show clean twin separation, fall back to the pretrained checkpoint for §10 (this is the one section where a weak model kills the ending).
- **Determinism**: single seedable RNG cell; resample button bumps seed. Rerunnability invariant: no timers or listeners escape `invalidation`.

## 7. Risks — RESOLVED by prototype (2026-07-04, `tools/belief-proto/`)

Both load-bearing risks were validated end-to-end in Bun (`tools/belief-proto/`: hand-rolled Float64Array GPT with backprop, gradcheck to 5e-9, closed-form ridge probe, PNG renders in `out/`).

1. **2L×32d Mess3 fractal: YES.** 26k params, batch 32, ctx 10 → **14 ms/step in Bun; 12k steps ≈ 2.8 min**. Eval loss 0.811 vs theoretical optimum 0.800 nats. Final-layer probe **R² = 0.997**; the projected residual cloud visibly reproduces the MSP fractal (corner condensations + second-level sub-triangles; blurrier than truth, exactly as expected at this scale). Shuffle control collapses to a colorless blob at the simplex center, R² ≈ 0.003. Probe R² is already 0.96 at step 250 — the *emergence* animation must therefore start its checkpoint ring buffer very early and densely (log-spaced snapshots), or the interesting transition is missed.
2. **RRXOR twins: YES, and the paper's layer story reproduces.** Same arch on RRXOR (ctx 12), loss 0.569 vs optimal 0.566. At positions where true belief is pure S/"0"/"1", the model's own output is uniform (mean |p−0.5| ≈ 0.03 for all three classes) — yet a held-out linear classifier on residuals separates them at **layer0 76% → final 86% → concat-of-layers 94%** (majority-chance 50%), matching the paper's claim that degenerate-belief geometry spreads across layers. "0" vs "1" are essentially never confused with each other; residual errors are only twin-vs-S (partially synchronized beliefs).
3. **Figure lesson for §10 (important):** raw 2D projections of RRXOR residuals are dominated by positional-embedding variance — both a centroid-plane projection and per-position mean-centering produced mush. What works is plotting the **linear readout itself**: each point at the barycentric position of its classifier scores on an S/"0"/"1" simplex, colored by true class → three clean corners. Same move as the Mess3 figure (predicted geometry, ground-truth color). Design §10's kill-shot this way, not as a PCA scatter.
4. **Mess3/RRXOR matrices** transcribed verbatim from epsilon-transformers (fetched 2026-07-04); ground-truth MSP render matches the paper's fractal. Keep the row-sum + stationary tests.
5. **One racetrack figure or two?** Still open (§4/§5); prototype didn't touch it. Recommend single dual-row figure.

Browser feasibility: Bun and browser JS JITs are comparable; even at 2–3× slowdown, live training is ~1 step/frame at 60fps with headroom, and the full crisp run is minutes, not hours. Pretrained checkpoints remain worth shipping for instant §7/§10 (model JSON is ~2.5MB raw for 26k params — gzip to ~1MB attachment, or store Float32 to halve it).

**Multi-core training (validated, `train_parallel.ts` + `worker_train.ts`):** local SGD / federated averaging over Web Workers — each worker trains independently for K=50 steps on its own sampled sequences, main thread averages weights once per round. Coordination is one ~200KB `postMessage` per worker per round; deliberately **no SharedArrayBuffer** (browser SAB needs cross-origin isolation headers a single-file notebook won't have; postMessage transferables run everywhere, workers built from a cell-text Blob URL). Measured on 8 workers: **526 aggregate steps/s, 92% scaling efficiency**; matches the 168s single-thread run's quality in **~15s** and surpasses it by 46s (R² 0.9976). Averaging at K=50 costs nothing in convergence — it behaves like variance reduction. This puts even the paper-scale 4L×64d model at roughly 3–4 min of live in-notebook training, and makes §3's training UX genuinely interactive: the emergence scrubber fills in near-real-time. Keep the single-worker path as the no-Worker fallback and for the literate exposition; the worker pool is a performance cell, not the pedagogy.
