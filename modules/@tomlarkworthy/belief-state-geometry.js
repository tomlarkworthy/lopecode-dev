// @tomlarkworthy/belief-state-geometry
// Live reconstruction of "Transformers Represent Belief State Geometry in their
// Residual Stream" (Shai et al., alignmentforum.org/posts/gTZ2SxesbHckJ3CkF).
// Prose is bullet-point placeholders; computation and figures are complete.
// Validated against tools/belief-proto/ (Bun prototype).

// ---------------------------------------------------------------- prose + narrative

const _title = function _title(md){return(
md`# Transformers Represent Belief State Geometry — live`
)};

const _intro = function _intro(md){return(
md`*(prose bullets — to be authored)*
- opening homage (draft): "LessWrong spectacularly crystallizes exactly what makes transformers special… expand with live computational models of the dividing line between Hidden Markov Models and Transformers"
- contract with the reader: everything below runs in this file; every figure is live; sliders re-run the same mathematics the paper ran
- paired forced march: same data, same colors, HMM vs transformer at every stage`
)};

const _s1 = function _s1(md){return(
md`## We will follow three distributions
- three toy worlds with hidden state; the reader (and both models) only ever see emitted tokens
- **z1r**: 0-1-random loop; finite belief geometry, followable by eye
- **mess3** (x, α live sliders): infinite fractal belief geometry — the headline
- **rrxor**: two random bits then their XOR; belief states with *identical* next-token predictions — ammunition for the finale
- question of the notebook: what must you build inside yourself to predict the token stream well?`
)};

const _v_processChoice = function _v_processChoice(Inputs){return(
Inputs.radio(["mess3", "z1r", "rrxor"], {value: "mess3", label: "process"})
)};
const _processChoice = (G, _) => G.input(_);

const _v_mess3x = function _v_mess3x(Inputs){return(
Inputs.range([0.01, 0.25], {value: 0.05, step: 0.005, label: "mess3 x"})
)};
const _mess3x = (G, _) => G.input(_);

const _v_mess3alpha = function _v_mess3alpha(Inputs){return(
Inputs.range([0.4, 0.99], {value: 0.85, step: 0.01, label: "mess3 α"})
)};
const _mess3alpha = (G, _) => G.input(_);

const _v_resample = function _v_resample(Inputs){return(
Inputs.button("resample sequences")
)};
const _resample = (G, _) => G.input(_);

const _worldFigure = function _worldFigure(htl, process, beliefKit, renderKit, resample, invalidation)
{
  const rng = beliefKit.mulberry32(1000 + resample * 7919 + process.name.length);
  const rows = [];
  const LEN = 28;
  for (let r = 0; r < 3; r++) rows.push(beliefKit.sampleSeq(process, LEN, rng));
  const diagram = renderKit.transitionSVG(process);
  const rowEls = rows.map(() => htl.html`<div style="font-family:ui-monospace,monospace;font-size:15px;letter-spacing:2px;min-height:20px;"></div>`);
  const fig = htl.html`<div class="bsg-fig">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
      <div>${diagram}</div>
      <div style="flex:1;min-width:260px;">
        <div style="font-size:11px;color:#888;">sampled token streams (color = hidden emitting state)</div>
        ${rowEls}
      </div>
    </div>
  </div>`;
  // typewriter reveal, torn down via invalidation
  let stop = false;
  invalidation.then(() => { stop = true; });
  const t0 = (window.performance || Date).now();
  const tick = () => {
    if (stop) return;
    const n = Math.min(LEN, Math.floor(((window.performance || Date).now() - t0) / 45));
    rowEls.forEach((el, r) => {
      const { tokens, states } = rows[r];
      el.replaceChildren(...Array.from({ length: n }, (_, t) => {
        const span = htl.html`<span>${process.alphabet[tokens[t]]}</span>`;
        span.style.color = renderKit.stateColor(process, states[t]);
        return span;
      }));
    });
    if (n < LEN) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
  return fig;
}
;

const _s2 = function _s2(md){return(
md`## How the HMM learns
- Baum–Welch EM on 200 sampled sequences: hill-climbing on *explanations*
- the HMM is told the shape of the answer (n hidden states) and fills in the numbers
- learned matrices (aligned by best state permutation) morph toward ground truth; log-likelihood climbs
- deliberately slowed to one EM iteration per frame so learning is visible`
)};

const _v_hmmGo = function _v_hmmGo(Inputs){return(
Inputs.button("train HMM (Baum-Welch EM)")
)};
const _hmmGo = (G, _) => G.input(_);

const _hmmFigure = function _hmmFigure(htl, hmmRun, process, renderKit)
{
  if (!hmmRun) return htl.html`<div class="bsg-fig" style="color:#888;">press the button to run EM</div>`;
  const { it, logLik, aligned, hist } = hmmRun;
  return htl.html`<div class="bsg-fig">
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;color:#888;">learned T̂[token][from][to] (iteration ${it}, aligned)</div>
        ${renderKit.heatmaps(aligned, process)}
      </div>
      <div>
        <div style="font-size:11px;color:#888;">ground truth</div>
        ${renderKit.heatmaps(process.T, process)}
      </div>
      <div style="min-width:220px;">
        <div style="font-size:11px;color:#888;">log-likelihood</div>
        ${renderKit.lineChart(hist.map((h, i) => [i, h]), {width: 220, height: 120})}
        <div style="font-size:12px;">${logLik.toFixed(1)} nats</div>
      </div>
    </div>
  </div>`;
}
;

const _s3 = function _s3(md, gptKit, trainCfg){return(
md`## How the Transformer learns
- literate GPT (cells below: \`gptFactory\`): pre-LN, causal multi-head attention, GELU MLP, hand-written backprop — nobody told it there are hidden states
- **${gptKit.countParams(trainCfg).toLocaleString("en-US")} learnable parameters** at the current config (${trainCfg.L} layers · ${trainCfg.H} heads · width ${trainCfg.C} · context ${trainCfg.T}) — every one of them drawn in the architecture map below
- graded on exactly one thing: probability assigned to the next token
- multi-core: local SGD / federated averaging over Web Workers — K=50 steps per worker between weight averages, one postMessage per worker per round, no SharedArrayBuffer
- loss floor line = entropy rate of the process (computed from ground truth); watching loss land on the floor is the first small epiphany
- the fusion figure below the loss curve shows the parallelism live: each dot is one worker's full weight vector projected to 2D — they drift apart on private batches, the average pulls them back to one consensus
- switch the process radio above to train on a different world (state is kept per process)`
)};

const _v_training = function _v_training(Inputs){return(
Inputs.toggle({label: "train transformer", value: false})
)};
const _training = (G, _) => G.input(_);

const _v_nWorkers = function _v_nWorkers(Inputs){return(
Inputs.range([1, 8], {value: Math.min(8, Math.max(1, (window.navigator.hardwareConcurrency || 8) - 2)), step: 1, label: "workers"})
)};
const _nWorkers = (G, _) => G.input(_);

const _lossFigure = function _lossFigure(htl, trainSnapshot, evalSet, renderKit, gptKit, trainCfg)
{
  const st = trainSnapshot.st;
  const hist = st.lossHist;
  const lines = [
    {y: evalSet.optimalLoss, color: "#009e73", label: `optimal ${evalSet.optimalLoss.toFixed(3)}`},
    {y: evalSet.iidLoss, color: "#999", label: `iid ${evalSet.iidLoss.toFixed(3)}`}
  ];
  return htl.html`<div class="bsg-fig">
    <div style="font-size:12px;">${gptKit.countParams(trainCfg).toLocaleString("en-US")}-param GPT · step <b>${st.step}</b> ${trainSnapshot.running ? "· training…" : "· idle"} · worker-ema loss ${hist.length ? hist[hist.length - 1][1].toFixed(4) : "—"} nats · checkpoints ${st.ckpts.length}</div>
    ${renderKit.lineChart(hist, {width: 560, height: 180, hlines: lines, ymin: evalSet.optimalLoss - 0.02})}
  </div>`;
}
;

const _s45 = function _s45(md){return(
md`## How the HMM predicts / How the Transformer predicts
- the HMM predicts by *filtering*: one belief vector, updated by Bayes, marched left to right — purest recurrence
- the transformer re-derives its prediction for every position from the whole prefix at once
- the bars match → two completely different mechanisms, indistinguishable outputs; hold that thought
- **§8/9 payoff in the same figure**: the HMM has one dot *now*; the transformer holds every prefix's belief simultaneously — the constellation lights up all at once (probe dots appear once the probe below has data)
- scrub the playhead; resample the sequence`
)};

const _v_replay = function _v_replay(Inputs){return(
Inputs.button("new sequence")
)};
const _replay = (G, _) => G.input(_);

const _v_playhead = function _v_playhead(Inputs, trainCfg){return(
Inputs.range([1, trainCfg.T], {value: 1, step: 1, label: "tokens seen"})
)};
const _playhead = (G, _) => G.input(_);

const _racetrackFigure = function _racetrackFigure(htl, process, beliefKit, renderKit, trainCfg, trainedModel, probeData, playhead, replay)
{
  const rng = beliefKit.mulberry32(4000 + replay * 104729 + process.name.length);
  const { tokens } = beliefKit.sampleSeq(process, trainCfg.T, rng);
  const { beliefs } = beliefKit.beliefTrajectory(process, tokens);
  const n = Math.min(playhead, trainCfg.T);
  const eta = beliefs[n - 1];
  const opt = beliefKit.nextTokenDist(process, eta);
  let modelDist = null;
  let residEtas = null;
  if (trainedModel) {
    const toks = new Int32Array(trainCfg.B * trainCfg.T);
    toks.set(tokens.subarray(0, trainCfg.T));
    trainedModel.forward(toks, null);
    modelDist = Array.from(trainedModel.act.probs.subarray((n - 1) * trainCfg.V, n * trainCfg.V));
    if (probeData && probeData.finalWs) {
      const res = trainedModel.act["l" + (trainCfg.L - 1) + ".res3"];
      residEtas = [];
      for (let t = 0; t < trainCfg.T; t++) {
        const off = t * trainCfg.C;
        const Wt = probeData.finalWs[t];
        residEtas.push([0, 1, 2].map((k) => {
          let a = Wt[trainCfg.C * 3 + k];
          for (let c = 0; c < trainCfg.C; c++) a += res[off + c] * Wt[c * 3 + k];
          return a;
        }));
      }
    }
  }
  // HMM pane: trail up to playhead
  const hmmPts = beliefs.slice(0, n).map((e, i) => ({eta: e, color: renderKit.beliefColor(e), r: i === n - 1 ? 6 : 2.5}));
  const hmmCanvas = renderKit.simplexCanvas(process, hmmPts, {width: 260, height: 230});
  // transformer pane: ALL positions at once (constellation)
  const tfPts = residEtas
    ? residEtas.map((e, i) => ({eta: e, color: renderKit.beliefColor(beliefs[i]), r: i === n - 1 ? 6 : 3.5, ring: true}))
    : [];
  const tfCanvas = renderKit.simplexCanvas(process, tfPts, {width: 260, height: 230});
  return htl.html`<div class="bsg-fig">
    <div style="font-family:ui-monospace,monospace;font-size:16px;letter-spacing:3px;">${Array.from(tokens, (k, t) =>
      htl.html`<span style="opacity:${t < n ? 1 : 0.25};border-bottom:${t === n - 1 ? "2px solid #333" : "none"}">${process.alphabet[k]}</span>`)}</div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;">
      <div>
        <div style="font-size:11px;color:#888;">HMM: one belief, walking (Bayes filter)</div>
        ${hmmCanvas}
        ${renderKit.bars(process, opt, opt, "optimal (= HMM prediction)")}
      </div>
      <div>
        <div style="font-size:11px;color:#888;">transformer: every position's belief at once ${residEtas ? "" : "(train + probe to populate)"}</div>
        ${tfCanvas}
        ${modelDist ? renderKit.bars(process, modelDist, opt, "model vs optimal (ghost)") : htl.html`<div style="color:#888;font-size:12px;">no trained model yet</div>`}
      </div>
    </div>
  </div>`;
}
;

const _sMachine = function _sMachine(md){return(
md`## The prediction machine — drive it yourself
- click or press keys (A/B/C… or 0/1) to feed a token — you are now the world, and the machine is inferring you
- **the machine is glass**: every intermediate step of the computation for the *next-token* prediction is drawn live
  - token + position embedding: 32 numbers (a colored stripe; red +, blue −)
  - attention, per layer and per head: which *earlier tokens* the current position reads, square opacity = attention weight
  - residual stream after each attention and each MLP: the same 32 numbers, transformed
  - unembedding: raw logits per token, then softmax → the buttons; button fill = probability, notch = optimal Bayes prediction
- right pane, the payoff: the residual stream at *each stage* read through a linear belief probe — watch the belief **crystallize through depth** (× = embedding guess, dots sharpen per block, ○ = true Bayesian belief)
- the natural adversarial game: type the *unlikely* token and watch attention, residuals and belief snap sideways, then re-converge
- past the context window the transformer forgets (window slides); the HMM's belief summarizes unbounded history`
)};

const _machineState = function _machineState(){return(
Object.assign(new window.EventTarget(), { tokens: [] })
)};

const _machineFigure = function _machineFigure(htl, process, beliefKit, renderKit, gptKit, trainCfg, modelBox, machineState, invalidation)
{
  const V = process.V;
  const C = trainCfg.C, T = trainCfg.T, H = trainCfg.H, L = trainCfg.L;
  let tokens = [];
  let built = null, builtStep = -1;
  const getModel = () => {
    if (!modelBox.payload || modelBox.payload.cfg.V !== V) return null;
    if (builtStep !== modelBox.payload.step) {
      built = new gptKit.GPT({...modelBox.payload.cfg, B: 1}, beliefKit.mulberry32(0));
      built.setWeights(modelBox.payload.weights);
      builtStep = modelBox.payload.step;
    }
    return built;
  };
  // ---------- pipeline drawing helpers
  const CELL = 4, STRIPH = 12;
  const stripCanvas = () => {
    const c = htl.html`<canvas width=${C * CELL} height=${STRIPH} style="border:1px solid #4443;border-radius:2px;">`;
    c.getContext("2d");
    return c;
  };
  const drawStrip = (canvas, vec, off) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, C * CELL, STRIPH);
    let m = 1e-9;
    for (let c = 0; c < C; c++) m = Math.max(m, Math.abs(vec[off + c]));
    for (let c = 0; c < C; c++) {
      const v = vec[off + c] / m;
      ctx.fillStyle = v >= 0 ? "rgba(228,87,61," + Math.abs(v).toFixed(3) + ")" : "rgba(78,121,167," + Math.abs(v).toFixed(3) + ")";
      ctx.fillRect(c * CELL, 0, CELL - 1, STRIPH);
    }
  };
  const SQ = 13;
  const attnCanvas = () => htl.html`<canvas width=${T * SQ} height=${SQ} style="image-rendering:pixelated;">`;
  const drawAttnRow = (canvas, att, h, n, win) => {
    // B=1: att[(h)*T*T + n*T + t2], squares colored by the ATTENDED token, opacity = weight
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, T * SQ, SQ);
    for (let t2 = 0; t2 <= n; t2++) {
      const w = att[h * T * T + n * T + t2];
      ctx.globalAlpha = 0.08 + 0.92 * w;
      ctx.fillStyle = renderKit.TOKEN_COLORS[win[t2] % 3];
      ctx.fillRect(t2 * SQ, 0, SQ - 2, SQ - 1);
      ctx.globalAlpha = 1;
      if (w > 0.25) {
        ctx.fillStyle = "#fff";
        ctx.font = "8px ui-monospace";
        ctx.fillText(process.alphabet[win[t2]], t2 * SQ + 3, SQ - 4);
      }
    }
    // marker under the current (query) position
    ctx.fillStyle = "#888";
    ctx.fillRect(n * SQ, SQ - 2, SQ - 2, 2);
  };
  const rowLabel = (txt) => htl.html`<div style="width:110px;flex:none;font-size:10px;color:#888;text-align:right;padding-right:8px;line-height:1.1;">${txt}</div>`;
  const row = (label, ...content) => htl.html`<div style="display:flex;align-items:center;gap:2px;">${rowLabel(label)}${content}</div>`;
  // ---------- skeleton (built once; canvases redrawn in place)
  const chips = htl.html`<div style="font-family:ui-monospace,monospace;font-size:15px;letter-spacing:1px;min-height:24px;display:flex;gap:2px;flex-wrap:wrap;"></div>`;
  const embedStrip = stripCanvas();
  const layerRows = [];
  const pipeRows = [row("token + position embedding", embedStrip)];
  for (let l = 0; l < L; l++) {
    const heads = Array.from({length: H}, () => attnCanvas());
    const attnRowEls = heads.map((cnv, h) => htl.html`<div style="display:flex;align-items:center;gap:3px;"><span style="width:14px;font-size:9px;color:#888;">h${h}</span>${cnv}</div>`);
    const res2Strip = stripCanvas();
    const res3Strip = stripCanvas();
    layerRows.push({ heads, res2Strip, res3Strip });
    pipeRows.push(row("attention, layer " + l + " (reads earlier tokens)", htl.html`<div style="display:flex;flex-direction:column;gap:1px;">${attnRowEls}</div>`));
    pipeRows.push(row("+ attention output", res2Strip));
    pipeRows.push(row("+ MLP", res3Strip));
  }
  const logitsRow = htl.html`<div style="display:flex;gap:10px;font-size:11px;font-family:ui-monospace,monospace;"></div>`;
  pipeRows.push(row("unembed → logits", logitsRow));
  const pipe = htl.html`<div style="display:flex;flex-direction:column;gap:4px;margin:6px 0;"></div>`;
  const pipeHint = htl.html`<div style="font-size:11px;color:#888;margin:6px 0;">train the transformer (toggle above) and feed a token to open the machine</div>`;
  const canvas = renderKit.simplexCanvas(process, [], {width: 250, height: 220});
  const status = htl.html`<div style="font-size:11px;color:#888;"></div>`;
  const btns = Array.from({length: V}, (_, k) => {
    const b = htl.html`<button class="bsg-tokbtn"><div class="bsg-fill"></div><div class="bsg-notch"></div><span class="bsg-lab"></span></button>`;
    b.onclick = () => feed(k);
    return b;
  });
  const reset = htl.html`<button style="font-size:12px;">⟲ reset</button>`;
  // ---------- compute + redraw
  const applyProbe = (W, vec, off) => [0, 1, 2].map((k) => {
    let a = W[C * 3 + k];
    for (let c = 0; c < C; c++) a += vec[off + c] * W[c * 3 + k];
    return a;
  });
  const redraw = () => {
    const win = tokens.slice(-T);
    const n = win.length - 1;
    const { beliefs } = beliefKit.beliefTrajectory(process, win);
    const eta = tokens.length ? beliefs[beliefs.length - 1] : Float64Array.from(process.stationary);
    const opt = beliefKit.nextTokenDist(process, eta);
    const model = getModel();
    let dist = null, stageEtas = null, act = null;
    if (model && win.length) {
      const padded = new Int32Array(T);
      padded.set(win);
      model.forward(padded, null);
      act = model.act;
      dist = Array.from(act.probs.subarray(n * V, n * V + V));
      if (modelBox.stageProbes)
        stageEtas = modelBox.stageProbes.map((s) => ({ key: s.key, eta: applyProbe(s.W, act[s.buf], n * C) }));
    }
    // chips
    chips.replaceChildren(...tokens.slice(-T).map((k, i) => {
      const cur = i === win.length - 1;
      return htl.html`<span style="padding:1px 5px;border-radius:3px;background:${renderKit.TOKEN_COLORS[k % 3]}${cur ? "" : "55"};color:#fff;${cur ? "outline:2px solid #888;" : ""}">${process.alphabet[k]}</span>`;
    }));
    // pipeline
    if (act) {
      pipe.style.display = "";
      pipeHint.style.display = "none";
      drawStrip(embedStrip, act.h0, n * C);
      layerRows.forEach((lr, l) => {
        lr.heads.forEach((cnv, h) => drawAttnRow(cnv, act["l" + l + ".att"], h, n, win));
        drawStrip(lr.res2Strip, act["l" + l + ".res2"], n * C);
        drawStrip(lr.res3Strip, act["l" + l + ".res3"], n * C);
      });
      const logits = Array.from(act.logits.subarray(n * V, n * V + V));
      const lmax = Math.max(...logits.map(Math.abs), 1e-9);
      logitsRow.replaceChildren(...logits.map((lg, k) => htl.html`<span style="display:flex;align-items:center;gap:3px;">
        <span style="color:${renderKit.TOKEN_COLORS[k % 3]};">${process.alphabet[k]}</span>
        <span style="display:inline-block;width:44px;height:9px;background:#4442;position:relative;border-radius:2px;">
          <span style="position:absolute;top:0;bottom:0;${lg >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(lg) / lmax * 50).toFixed(1)}%;background:${renderKit.TOKEN_COLORS[k % 3]};"></span>
        </span>
        <span style="color:#888;">${lg.toFixed(2)}</span>
      </span>`));
    } else {
      pipe.style.display = "none";
      pipeHint.style.display = "";
    }
    // buttons (softmax output)
    btns.forEach((b, k) => {
      const p = dist ? dist[k] : opt[k];
      b.querySelector(".bsg-fill").style.width = (p * 100).toFixed(1) + "%";
      b.querySelector(".bsg-notch").style.left = (opt[k] * 100).toFixed(1) + "%";
      b.querySelector(".bsg-lab").textContent = process.alphabet[k] + "  " + (p * 100).toFixed(1) + "%";
    });
    status.textContent = model
      ? (dist
          ? "model live (step " + modelBox.payload.step + ")" + (stageEtas ? " · stage probes on" : " · probes warming up")
          : "model ready (step " + modelBox.payload.step + ") — feed a token")
      : "no trained model for this process yet — buttons show the optimal predictor";
    // simplex: belief crystallizing through depth
    const pts = [];
    if (stageEtas) {
      stageEtas.forEach((s, i) => {
        const frac = (i + 1) / stageEtas.length;
        pts.push({ eta: s.eta, color: "rgba(120,120,120," + (0.35 + 0.3 * frac).toFixed(2) + ")", r: 2.5 + 2.5 * frac });
      });
      const last = stageEtas[stageEtas.length - 1];
      pts.push({ eta: last.eta, color: renderKit.beliefColor(eta), r: 5.5 });
    }
    pts.push({ eta, color: renderKit.beliefColor(eta), r: 7, ring: true });
    renderKit.simplexRedraw(canvas, process, pts);
  };
  const share = () => {
    machineState.tokens = tokens.slice();
    machineState.dispatchEvent(new window.Event("tokens"));
  };
  const feed = (k) => { tokens.push(k); redraw(); share(); };
  reset.onclick = () => { tokens = []; redraw(); share(); };
  pipe.replaceChildren(...pipeRows);
  const el = htl.html`<div class="bsg-fig" tabindex="0" style="outline:none;">
    <div style="display:flex;gap:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:340px;">
        ${chips}
        ${pipeHint}
        ${pipe}
        <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0;">${btns}</div>
        <div style="display:flex;gap:8px;align-items:center;">${reset}${status}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;max-width:250px;">belief through depth: small grey = embedding guess, growing dots = after each block, colored = final read, ○ = true Bayes</div>
        ${canvas}
      </div>
    </div>
  </div>`;
  el.addEventListener("keydown", (e) => {
    const idx = process.alphabet.indexOf(e.key.toUpperCase());
    const idx2 = process.alphabet.indexOf(e.key);
    const k = idx >= 0 ? idx : idx2;
    if (k >= 0) { feed(k); e.preventDefault(); }
  });
  const onUpdate = () => redraw();
  modelBox.addEventListener("update", onUpdate);
  invalidation.then(() => modelBox.removeEventListener("update", onUpdate));
  redraw();
  return el;
}
;

const _sFlow = function _sFlow(md){return(
md`### The flow — one prediction, end to end, nothing hidden
- the whole network unrolled: every token lane runs left to right through BOTH layers, and every head of each layer is drawn — no picker, no "N more identical blocks"
- at each head, ribbons gather from every lane into the followed position — ribbon width IS that head's live attention weight
- click any token on the left to follow a different position; everything recomputes as you feed tokens above`
)};

const _flowFigure = function _flowFigure(htl, process, beliefKit, renderKit, gptKit, trainCfg, modelBox, machineState, invalidation)
{
  const C = trainCfg.C, H = trainCfg.H, T = trainCfg.T, V = trainCfg.V, L = trainCfg.L;
  const HCOL = ["#7c6bd6", "#c05fa0", "#4ea6b8", "#c78f2f", "#59a14f", "#b07aa1", "#f28e2b", "#76b7b2"];
  let qSel = -1; // -1 = follow latest position
  let built = null, builtStep = -2;
  const getModel = () => {
    const step = (modelBox.payload && modelBox.payload.cfg.V === V) ? modelBox.payload.step : -1;
    if (builtStep !== step) {
      if (!built) built = new gptKit.GPT({...trainCfg, B: 1}, beliefKit.mulberry32(7));
      if (step >= 0) built.setWeights(modelBox.payload.weights);
      built._step = step;
      builtStep = step;
    }
    return built;
  };
  // variable-width ribbon (the same cubic d3.linkHorizontal draws, with a belly)
  const rib = (x1, y1, x2, y2, w1, w2) => {
    const mx = (x1 + x2) / 2;
    return "M" + x1 + "," + (y1 - w1 / 2) +
      "C" + mx + "," + (y1 - w1 / 2) + " " + mx + "," + (y2 - w2 / 2) + " " + x2 + "," + (y2 - w2 / 2) +
      "L" + x2 + "," + (y2 + w2 / 2) +
      "C" + mx + "," + (y2 + w2 / 2) + " " + mx + "," + (y1 + w1 / 2) + " " + x1 + "," + (y1 + w1 / 2) + "Z";
  };
  const holder = htl.html`<div style="overflow-x:auto;"></div>`;
  const status = htl.html`<div style="font-size:10px;color:#888;"></div>`;
  const demo = Array.from(beliefKit.sampleSeq(process, 8, beliefKit.mulberry32(5)).tokens);
  const redraw = () => {
    const toks = machineState.tokens.length ? machineState.tokens : demo;
    const win = toks.slice(-T);
    const rows = win.length, n = rows - 1;
    const q = (qSel >= 0 && qSel <= n) ? qSel : n;
    const m = getModel();
    const padded = new Int32Array(T);
    padded.set(win);
    m.forward(padded, null);
    const aw = (l, h, kj) => m.act["l" + l + ".att"][h * T * T + q * T + kj];
    // geometry: token lanes run the full width; layers are unrolled side by side
    const rowH = rows > 12 ? 22 : 26;
    const y = (i) => 56 + i * rowH;
    const laneTop = y(0) - rowH / 2, laneBot = y(n) + rowH / 2;
    const xTok = 26, xEmb = 76;
    const headGap = 40, mlpW = 26, layerPad = 26;
    const layerW = layerPad + H * headGap + 26 + mlpW + 22;
    const xL = (l) => 116 + l * layerW;
    const xHead = (l, h) => xL(l) + layerPad + h * headGap + headGap / 2;
    const xMix = (l) => xL(l) + layerPad + H * headGap + 8;
    const xMlp = (l) => xMix(l) + 18;
    const xU = xL(L) + 8, xProb = xU + 74;
    const Wd = xProb + 128, Hd = Math.max(laneBot + 44, 220);
    const yb = (k) => y(q) - (V - 1) * 13 + k * 26;
    const parts = [];
    // layer frames first (background)
    for (let l = 0; l < L; l++) {
      parts.push(htl.svg`<rect x=${xL(l)} y=${laneTop - 22} width=${layerW - 14} height=${laneBot - laneTop + 40} rx="8" fill="#8880" stroke="#8883"/>`);
      parts.push(htl.svg`<text x=${xL(l) + 8} y=${laneTop - 28} font-size="10" fill="#aaa">layer ${l}</text>`);
      parts.push(htl.svg`<rect x=${xMlp(l)} y=${laneTop - 12} width=${mlpW} height=${laneBot - laneTop + 20} rx="5" fill="#8881" stroke="#8884"/>`);
      parts.push(htl.svg`<text x=${xMlp(l) + mlpW / 2} y=${laneTop - 16} font-size="8" text-anchor="middle" fill="#888">MLP</text>`);
    }
    // token lanes (residual highway per position, token-colored)
    for (let i = 0; i < rows; i++) {
      const tc = renderKit.TOKEN_COLORS[win[i] % 3];
      parts.push(htl.svg`<rect x=${xEmb + 12} y=${y(i) - 1.5} width=${xU - xEmb - 12} height="3" rx="1.5" fill=${tc} opacity=${i === q ? 0.45 : 0.1}/>`);
    }
    parts.push(htl.svg`<text x=${xEmb + 30} y=${laneBot + 26} font-size="9" fill="#666">every lane is one position's residual stream — heads gather across lanes, the MLP works within each lane</text>`);
    // chips + embed squares
    for (let i = 0; i < rows; i++) {
      const tc = renderKit.TOKEN_COLORS[win[i] % 3];
      const g = htl.svg`<g style="cursor:pointer;">
        <rect x=${xTok - 12} y=${y(i) - 9} width="20" height="18" rx="3" fill=${tc} opacity=${i === q ? 0.85 : 0.35}/>
        <text x=${xTok - 2} y=${y(i) + 4} font-size="11" font-family="ui-monospace,monospace" text-anchor="middle" fill=${i === q ? "#000" : "currentColor"}>${process.alphabet[win[i]]}</text>
      </g>`;
      g.onclick = () => { qSel = i; redraw(); };
      parts.push(g);
      parts.push(htl.svg`<path d=${rib(xTok + 10, y(i), xEmb, y(i), 8, 8)} fill=${tc} opacity="0.18"/>`);
      parts.push(htl.svg`<rect x=${xEmb} y=${y(i) - 6} width="12" height="12" rx="2" fill="#8886"/>`);
    }
    parts.push(htl.svg`<text x=${xTok} y=${laneTop - 28} font-size="9" text-anchor="middle" fill="#888">tokens</text>`);
    parts.push(htl.svg`<text x=${xEmb + 6} y=${laneTop - 28} font-size="9" text-anchor="middle" fill="#888">embed</text>`);
    // unrolled heads: each head is one gather point on the followed lane
    for (let l = 0; l < L; l++) {
      for (let h = 0; h < H; h++) {
        const hx = xHead(l, h), hc = HCOL[h % HCOL.length];
        parts.push(htl.svg`<text x=${hx} y=${laneTop - 8} font-size="8" text-anchor="middle" fill=${hc}>h${h}</text>`);
        let top1 = 0, top1w = -1;
        for (let kj = 0; kj <= q; kj++) {
          const w = aw(l, h, kj);
          if (w > top1w) { top1w = w; top1 = kj; }
          parts.push(htl.svg`<path d=${rib(hx - headGap / 2, y(kj), hx, y(q), Math.max(0.5, w * 11), Math.max(0.5, w * 11))} fill=${hc} opacity=${kj === q ? 0.3 : 0.6}/>`);
          parts.push(htl.svg`<circle cx=${hx - headGap / 2} cy=${y(kj)} r="1.8" fill=${hc} opacity="0.8"/>`);
        }
        parts.push(htl.svg`<circle cx=${hx} cy=${y(q)} r="4" fill=${hc}/>`);
        if (top1w > 0.3 && top1 !== q) parts.push(htl.svg`<text x=${hx} y=${(y(top1) + y(q)) / 2} font-size="8" text-anchor="middle" fill=${hc}>${(100 * top1w).toFixed(0)}%</text>`);
      }
      // heads concat+project, added back onto the lane
      parts.push(htl.svg`<circle cx=${xMix(l)} cy=${y(q)} r="6" fill="none" stroke="#aaa" stroke-width="1.2"/>`);
      parts.push(htl.svg`<text x=${xMix(l)} y=${y(q) + 3} font-size="9" text-anchor="middle" fill="#aaa">+</text>`);
      parts.push(htl.svg`<text x=${xMix(l)} y=${laneTop - 8} font-size="8" text-anchor="middle" fill="#888">⊕attn</text>`);
    }
    // unembed + probabilities for the followed position
    parts.push(htl.svg`<rect x=${xU} y=${Math.max(laneTop - 12, y(q) - 34)} width="54" height="68" rx="5" fill="#8881" stroke="#8883"/>`);
    parts.push(htl.svg`<text x=${xU + 27} y=${y(q) - 8} font-size="8" text-anchor="middle" fill="#888">final LN</text>`);
    parts.push(htl.svg`<text x=${xU + 27} y=${y(q) + 4} font-size="8" text-anchor="middle" fill="#888">unembed</text>`);
    parts.push(htl.svg`<text x=${xU + 27} y=${y(q) + 16} font-size="8" text-anchor="middle" fill="#888">softmax</text>`);
    for (let k = 0; k < V; k++) {
      const p = m.act.probs[q * V + k];
      const tc = renderKit.TOKEN_COLORS[k % 3];
      parts.push(htl.svg`<path d=${rib(xU + 54, y(q), xProb - 2, yb(k), Math.max(0.6, p * 18), Math.max(0.6, p * 16))} fill=${tc} opacity="0.4"/>`);
      parts.push(htl.svg`<rect x=${xProb} y=${yb(k) - 8} width="16" height="16" rx="3" fill=${tc} opacity="0.5"/>`);
      parts.push(htl.svg`<text x=${xProb + 8} y=${yb(k) + 4} font-size="10" font-family="ui-monospace,monospace" text-anchor="middle" fill="currentColor">${process.alphabet[k]}</text>`);
      parts.push(htl.svg`<rect x=${xProb + 22} y=${yb(k) - 4} width=${Math.max(1, p * 72)} height="8" rx="2" fill=${tc} opacity="0.9"/>`);
      parts.push(htl.svg`<text x=${xProb + 26 + Math.max(1, p * 72)} y=${yb(k) + 3} font-size="9" font-family="ui-monospace,monospace" fill="#888">${(100 * p).toFixed(1)}%</text>`);
    }
    parts.push(htl.svg`<text x=${xProb + 50} y=${laneTop - 28} font-size="9" text-anchor="middle" fill="#888">next token</text>`);
    holder.replaceChildren(htl.svg`<svg width=${Wd} height=${Hd} viewBox="0 0 ${Wd} ${Hd}" style="max-width:100%;font-family:sans-serif;color:#aaa;">${parts}</svg>`);
    status.textContent = (m._step >= 0 ? "weights from training step " + m._step : "untrained weights — attention is still near-uniform") +
      " · following position " + q + " of " + win.map((k) => process.alphabet[k]).join("") +
      " · all " + L + " layers × " + H + " heads unrolled (" + m.weightCount().toLocaleString("en-US") + " parameters), ribbon width = live attention weight" +
      (machineState.tokens.length ? "" : " · sample stream — feed the machine above");
  };
  let lastModel = 0;
  const onTokens = () => { qSel = -1; redraw(); };
  const onModel = () => {
    const now = window.performance.now();
    if (now - lastModel < 1000) return;
    lastModel = now;
    redraw();
  };
  machineState.addEventListener("tokens", onTokens);
  modelBox.addEventListener("update", onModel);
  invalidation.then(() => {
    machineState.removeEventListener("tokens", onTokens);
    modelBox.removeEventListener("update", onModel);
  });
  redraw();
  return htl.html`<div class="bsg-fig">${holder}${status}</div>`;
}
;

const _sArchitecture = function _sArchitecture(md){return(
md`### The whole machine, opened up
- every weight matrix of the GPT, drawn live: red = positive, blue = negative, brightness = magnitude
- untrained it is pure noise; toggle training above and watch structure appear — this IS what training builds
- the stage tags match the microscope below: this is the map, the microscope is the walk`
)};

const _architectureFigure = function _architectureFigure(htl, process, beliefKit, renderKit, gptKit, trainCfg, modelBox, invalidation)
{
  const C = trainCfg.C, H = trainCfg.H, T = trainCfg.T, V = trainCfg.V, F = trainCfg.F, L = trainCfg.L, HS = C / H;
  let built = null, builtStep = -2;
  const getModel = () => {
    const step = (modelBox.payload && modelBox.payload.cfg.V === V) ? modelBox.payload.step : -1;
    if (builtStep !== step) {
      if (!built) built = new gptKit.GPT({...trainCfg, B: 1}, beliefKit.mulberry32(7));
      if (step >= 0) built.setWeights(modelBox.payload.weights);
      built._step = step;
      builtStep = step;
    }
    return built;
  };
  const painters = [];
  // heatmap: canvas at 1px/cell, CSS-scaled with pixelated rendering; painter repaints in place
  const heat = (name, rows, cols, cssW, cssH, post) => {
    const cnv = htl.html`<canvas width=${cols} height=${rows} style="width:${cssW}px;height:${cssH}px;image-rendering:pixelated;border:1px solid #4443;border-radius:2px;display:block;">`;
    const ctx = cnv.getContext("2d");
    const img = ctx.createImageData(cols, rows);
    painters.push((m) => {
      const w = m.params[name].w;
      let mx = 1e-9;
      for (let i = 0; i < w.length; i++) mx = Math.max(mx, Math.abs(w[i]));
      for (let i = 0; i < w.length; i++) {
        const v = w[i] / mx, o = i * 4;
        if (v >= 0) { img.data[o] = 228; img.data[o + 1] = 87; img.data[o + 2] = 61; }
        else { img.data[o] = 78; img.data[o + 1] = 121; img.data[o + 2] = 167; }
        img.data[o + 3] = Math.round(255 * Math.abs(v));
      }
      ctx.putImageData(img, 0, 0);
      if (post) post(ctx);
    });
    return cnv;
  };
  const cap = (text) => htl.html`<div style="font:9px ui-monospace,monospace;color:#888;margin-top:2px;">${text}</div>`;
  const tag = (n) => htl.html`<span style="font-size:9px;color:#888;border:1px solid #8884;border-radius:8px;padding:0 5px;margin-left:6px;">stage ${n}</span>`;
  const box = (label, stageN, ...kids) => htl.html`<div style="border:1px solid #8883;border-radius:6px;padding:8px 10px;margin:0;">
    <div style="font-size:11px;color:#aaa;margin-bottom:6px;">${label}${stageN != null ? tag(stageN) : ""}</div>
    <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">${kids}</div>
  </div>`;
  const cell = (cnv, caption) => htl.html`<div>${cnv}${cap(caption)}</div>`;
  const arrow = (label) => htl.html`<div style="font-size:10px;color:#888;padding:2px 0 2px 24px;">↓ ${label}</div>`;
  const addRow = () => htl.html`<div style="font-size:10px;color:#888;padding:2px 0 2px 24px;">⊕ added back onto the residual highway</div>`;
  const fmtN = (n) => n.toLocaleString("en-US");
  // Q|K|V thirds + head ticks drawn over the wqkv heatmap
  const qkvPost = (ctx) => {
    const cols3 = ["#b07aa1", "#76b7b2", "#f28e2b"];
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = cols3[s];
      ctx.fillRect(s * C, 0, C, 2);
      for (let h = 1; h < H; h++) { ctx.fillStyle = cols3[s] + "88"; ctx.fillRect(s * C + h * HS, 0, 1, 4); }
    }
    ctx.fillStyle = "#000a";
    ctx.fillRect(C - 1, 0, 2, 64);
    ctx.fillRect(2 * C - 1, 0, 2, 64);
  };
  const chips = htl.html`<div style="display:flex;gap:6px;">${Array.from({length: V}, (_, k) =>
    htl.html`<span style="width:20px;text-align:center;font:12px ui-monospace,monospace;background:${renderKit.TOKEN_COLORS[k % 3]}55;border-radius:3px;">${process.alphabet[k]}</span>`)}</div>`;
  const layerBlocks = [];
  for (let l = 0; l < L; l++) {
    layerBlocks.push(box("layer " + l + " · attention — " + H + " heads read " + HS + " dims each; the ONLY place positions exchange information", "2–6",
      cell(heat("l" + l + ".ln1g", 1, C, 128, 6), "LN scale γ · " + C),
      cell(heat("l" + l + ".wqkv", C, 3 * C, 288, 96, qkvPost), "wqkv · " + C + "×" + 3 * C + " · " + fmtN(C * 3 * C) + " params — Q | K | V, head ticks on top"),
      cell(heat("l" + l + ".wo", C, C, 96, 96), "wo · " + C + "×" + C + " · " + fmtN(C * C) + " — mix heads back together")));
    layerBlocks.push(addRow());
    layerBlocks.push(box("layer " + l + " · feed-forward — per-position computation (no cross-talk)", "7",
      cell(heat("l" + l + ".ln2g", 1, C, 128, 6), "LN scale γ · " + C),
      cell(heat("l" + l + ".wfc", C, F, 288, 72), "wfc · " + C + "×" + F + " · " + fmtN(C * F) + " — expand ×" + (F / C) + ", then GELU"),
      cell(heat("l" + l + ".wproj", F, C, 72, 96), "wproj · " + F + "×" + C + " · " + fmtN(F * C) + " — back to " + C)));
    layerBlocks.push(addRow());
    if (l < L - 1) layerBlocks.push(arrow("same " + C + "-dim highway, next layer"));
  }
  const status = htl.html`<div style="font-size:10px;color:#888;margin-top:6px;"></div>`;
  const root = htl.html`<div class="bsg-fig" style="display:flex;flex-direction:column;gap:6px;max-width:720px;">
    <div style="display:flex;gap:10px;align-items:center;">${chips}<span style="font-size:10px;color:#888;">V = ${V} tokens in, ${V} probabilities out — everything between is learned</span></div>
    ${box("embedding — every token and every position owns a learned " + C + "-dim row", 1,
      cell(heat("wte", V, C, 192, 18), "wte · " + V + "×" + C + " · " + fmtN(V * C) + " params (one row per token)"),
      cell(heat("wpe", T, C, 192, 48), "wpe · " + T + "×" + C + " · " + fmtN(T * C) + " (one row per position)"))}
    ${arrow("x = wte[token] + wpe[position] — " + T + " positions × " + C + " dims enter the residual highway")}
    ${layerBlocks}
    ${arrow("final vector, per position")}
    ${box("unembedding — dot with each token's output column, softmax", 8,
      cell(heat("lnfg", 1, C, 128, 6), "final LN scale γ · " + C),
      cell(heat("wu", C, V, 24, 96), "wu · " + C + "×" + V + " · " + fmtN(C * V) + " — one column per token"),
      htl.html`<div style="font-size:10px;color:#888;">→ ${V} logits → softmax → the machine's buttons</div>`)}
    ${status}
  </div>`;
  let lastPaint = 0;
  const repaint = () => {
    const m = getModel();
    for (const p of painters) p(m);
    let total = 0;
    for (const p of m.order) total += p.w.length;
    status.textContent = fmtN(total) + " parameters total · " +
      (m._step >= 0 ? "weights from training step " + m._step : "untrained — pure init noise; toggle training and watch structure emerge") +
      " · bias vectors and LN offsets not drawn";
  };
  const onModel = () => {
    const now = window.performance.now();
    if (now - lastPaint < 1000) return;
    lastPaint = now;
    repaint();
  };
  modelBox.addEventListener("update", onModel);
  invalidation.then(() => modelBox.removeEventListener("update", onModel));
  repaint();
  return root;
}
;

const _sMicroscope = function _sMicroscope(md){return(
md`### The microscope — how one prediction is computed
- pick a stage of the forward pass; every number is LIVE from the machine's current token stream (feed tokens above and watch them change)
- color code: activation values red = +, blue = −; **Q** purple, **K** teal, **V** orange; token colors as everywhere else
- works before training too — the *mechanism* is fixed weights-independent wiring; training only changes the numbers flowing through it`
)};

const _microscopeFigure = function _microscopeFigure(htl, process, beliefKit, renderKit, gptKit, trainCfg, modelBox, machineState, invalidation)
{
  const C = trainCfg.C, H = trainCfg.H, T = trainCfg.T, V = trainCfg.V, F = trainCfg.F, L = trainCfg.L, HS = C / H;
  let layer = 0, head = 0, stageIdx = 0;
  let built = null, builtStep = -2;
  const getModel = () => {
    const step = (modelBox.payload && modelBox.payload.cfg.V === V) ? modelBox.payload.step : -1;
    if (builtStep !== step) {
      built = new gptKit.GPT({...trainCfg, B: 1}, beliefKit.mulberry32(7));
      if (step >= 0) built.setWeights(modelBox.payload.weights);
      built._step = step;
      builtStep = step;
    }
    return built;
  };
  const fmt = (v) => (v >= 0 ? "+" : "") + v.toFixed(2);
  const strip = (vec, off, len, opts) => {
    opts = opts || {};
    const cw = opts.cw || Math.max(2, Math.min(5, Math.floor(300 / len)));
    const hh = opts.h || 14;
    const cnv = htl.html`<canvas width=${len * cw} height=${hh} style="border:1px solid ${opts.frame || "#4443"};border-radius:2px;flex:none;">`;
    const ctx = cnv.getContext("2d");
    let m = 1e-9;
    for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(vec[off + i]));
    for (let i = 0; i < len; i++) {
      const x = vec[off + i] / m;
      ctx.fillStyle = x >= 0
        ? "rgba(228,87,61," + Math.abs(x).toFixed(3) + ")"
        : "rgba(78,121,167," + Math.abs(x).toFixed(3) + ")";
      ctx.fillRect(i * cw, 0, cw - (cw > 2 ? 1 : 0), hh);
    }
    return cnv;
  };
  const nums = (vec, off, k) => htl.html`<span style="font:9px ui-monospace,monospace;color:#888;flex:none;">[${
    Array.from({length: k}, (_, i) => fmt(vec[off + i])).join(" ")} …]</span>`;
  const vrow = (label, vec, off, len, opts) => htl.html`<div style="display:flex;align-items:center;gap:8px;margin:3px 0;flex-wrap:wrap;">
    <span style="width:170px;flex:none;font-size:11px;color:#888;text-align:right;">${label}</span>
    ${strip(vec, off, len, opts)}${nums(vec, off, Math.min(5, len))}</div>`;
  const chip = (k) => htl.html`<span style="width:18px;flex:none;text-align:center;font:11px ui-monospace,monospace;background:${renderKit.TOKEN_COLORS[k % 3]}55;border-radius:2px;">${process.alphabet[k]}</span>`;
  const stages = [
    { key: "embed", explain: "the token picks one learned row, the position picks another; their sum is the starting vector.",
      render: (m, win, n) => {
        const P = m.params;
        return htl.html`<div>
          ${vrow("wte[" + process.alphabet[win[n]] + "]  (what)", P.wte.w, win[n] * C, C)}
          ${vrow("wpe[" + n + "]  (where)", P.wpe.w, n * C, C)}
          ${vrow("x = wte + wpe", m.act.h0, n * C, C)}
        </div>`;
      } },
    { key: "normalize", explain: "LayerNorm re-centers to mean 0 and rescales to spread 1 — the same ruler for every position, every step.",
      render: (m, win, n) => {
        const a = m.act;
        const inp = layer === 0 ? a.h0 : a["l" + (layer - 1) + ".res3"];
        return htl.html`<div>
          ${vrow("x  (into layer " + layer + ")", inp, n * C, C)}
          ${vrow("LayerNorm(x)", a["l" + layer + ".ln1out"], n * C, C)}
          <div style="font:10px ui-monospace,monospace;color:#888;margin-left:178px;">mean ${fmt(a["l" + layer + ".ln1mean"][n])} → 0 · scale ×${a["l" + layer + ".ln1rstd"][n].toFixed(2)}</div>
        </div>`;
      } },
    { key: "Q·K·V", explain: "three learned projections of the SAME vector: a query (what am I looking for?), a key (what do I contain?), a value (what do I offer?). Each head owns " + HS + " of the " + C + " dims.",
      render: (m, win, n) => {
        const qkv = m.act["l" + layer + ".qkv"];
        return htl.html`<div>
          ${vrow("q = Wq·LN(x)   head " + head, qkv, n * 3 * C + head * HS, HS, {frame: "#b07aa1", cw: 8})}
          ${vrow("k = Wk·LN(x)", qkv, n * 3 * C + C + head * HS, HS, {frame: "#76b7b2", cw: 8})}
          ${vrow("v = Wv·LN(x)", qkv, n * 3 * C + 2 * C + head * HS, HS, {frame: "#f28e2b", cw: 8})}
        </div>`;
      } },
    { key: "scores", explain: "the current query is dotted against EVERY earlier key; softmax turns scores into weights that sum to 1. This is the only place positions talk to each other.",
      render: (m, win, n) => {
        const qkv = m.act["l" + layer + ".qkv"];
        const att = m.act["l" + layer + ".att"];
        const rows = [];
        for (let t2 = 0; t2 <= n; t2++) {
          let s = 0;
          for (let i = 0; i < HS; i++) s += qkv[n * 3 * C + head * HS + i] * qkv[t2 * 3 * C + C + head * HS + i];
          s /= Math.sqrt(HS);
          const w = att[head * T * T + n * T + t2];
          rows.push(htl.html`<div style="display:flex;align-items:center;gap:6px;margin:1px 0;">
            ${chip(win[t2])}
            ${strip(qkv, t2 * 3 * C + C + head * HS, HS, {frame: "#76b7b2", cw: 5, h: 11})}
            <span style="font:10px ui-monospace,monospace;color:#888;width:86px;flex:none;">q·k/√d ${fmt(s)}</span>
            <span style="display:inline-block;width:70px;height:8px;background:#4442;border-radius:2px;position:relative;flex:none;">
              <span style="position:absolute;left:0;top:0;bottom:0;width:${(100 * w).toFixed(1)}%;background:${renderKit.TOKEN_COLORS[win[t2] % 3]};border-radius:2px;"></span>
            </span>
            <span style="font:10px ui-monospace,monospace;color:#aaa;width:44px;flex:none;">${(100 * w).toFixed(1)}%</span>
          </div>`);
        }
        return htl.html`<div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
            <span style="width:18px;flex:none;"></span>
            ${strip(qkv, n * 3 * C + head * HS, HS, {frame: "#b07aa1", cw: 5, h: 11})}
            <span style="font:10px ui-monospace,monospace;color:#b07aa1;">← q of the current position (head ${head}) · keys of earlier tokens below</span>
          </div>
          ${rows}
        </div>`;
      } },
    { key: "mix", explain: "the head's output is the weighted average of the value vectors — attention is a soft, differentiable lookup.",
      render: (m, win, n) => {
        const qkv = m.act["l" + layer + ".qkv"];
        const att = m.act["l" + layer + ".att"];
        const rows = [];
        for (let t2 = 0; t2 <= n; t2++) {
          const w = att[head * T * T + n * T + t2];
          const row = htl.html`<div style="display:flex;align-items:center;gap:6px;margin:1px 0;opacity:${(0.25 + 0.75 * w).toFixed(2)};">
            ${chip(win[t2])}
            ${strip(qkv, t2 * 3 * C + 2 * C + head * HS, HS, {frame: "#f28e2b", cw: 5, h: 11})}
            <span style="font:10px ui-monospace,monospace;color:#aaa;">× ${(100 * w).toFixed(1)}%</span>
          </div>`;
          rows.push(row);
        }
        return htl.html`<div>
          ${rows}
          ${vrow("Σ weight·v = head output", m.act["l" + layer + ".atty"], n * C + head * HS, HS, {frame: "#f28e2b", cw: 8})}
        </div>`;
      } },
    { key: "add", explain: "heads are concatenated, projected, and ADDED to the incoming vector — the block refines the running representation, it never replaces it (the residual highway).",
      render: (m, win, n) => {
        const a = m.act;
        const inp = layer === 0 ? a.h0 : a["l" + (layer - 1) + ".res3"];
        return htl.html`<div>
          ${vrow("all " + H + " heads, concatenated", a["l" + layer + ".atty"], n * C, C)}
          ${vrow("Wo · heads", a["l" + layer + ".attproj"], n * C, C)}
          ${vrow("x  (unchanged, riding the highway)", inp, n * C, C)}
          ${vrow("x + attention → res", a["l" + layer + ".res2"], n * C, C)}
        </div>`;
      } },
    { key: "MLP", explain: "per-position feed-forward: expand to " + F + " dims, GELU keeps roughly the positive part, project back, ADD again. This is where per-token computation happens; attention only moves information.",
      render: (m, win, n) => {
        const a = m.act;
        return htl.html`<div>
          ${vrow("LN(res)", a["l" + layer + ".ln2out"], n * C, C)}
          ${vrow("W1: expand to " + F, a["l" + layer + ".fc"], n * F, F, {cw: 2, h: 10})}
          ${vrow("GELU", a["l" + layer + ".gelu"], n * F, F, {cw: 2, h: 10})}
          ${vrow("W2: back to " + C, a["l" + layer + ".mlpproj"], n * C, C)}
          ${vrow("res + mlp → layer " + layer + " output", a["l" + layer + ".res3"], n * C, C)}
          <div style="font:10px ui-monospace,monospace;color:#888;margin-left:178px;">layer ${layer + 1 < L ? layer + 1 + " repeats the same machinery on this output (use the layer picker)" : "output goes to the unembedding"}</div>
        </div>`;
      } },
    { key: "unembed", explain: "the final vector is dotted with each token's output column — three numbers (logits), then softmax turns them into the probabilities on the machine's buttons.",
      render: (m, win, n) => {
        const a = m.act, P = m.params;
        const rows = [];
        for (let k = 0; k < V; k++) {
          const col = new Float64Array(C);
          for (let c = 0; c < C; c++) col[c] = P.wu.w[c * V + k];
          const lg = a.logits[n * V + k];
          const p = a.probs[n * V + k];
          rows.push(htl.html`<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            ${chip(k)}
            ${strip(col, 0, C, {cw: 3, h: 11})}
            <span style="font:10px ui-monospace,monospace;color:#888;width:86px;flex:none;">logit ${fmt(lg)}</span>
            <span style="display:inline-block;width:90px;height:9px;background:#4442;border-radius:2px;position:relative;flex:none;">
              <span style="position:absolute;left:0;top:0;bottom:0;width:${(100 * p).toFixed(1)}%;background:${renderKit.TOKEN_COLORS[k % 3]};border-radius:2px;"></span>
            </span>
            <span style="font:10px ui-monospace,monospace;color:#aaa;">${(100 * p).toFixed(1)}%</span>
          </div>`);
        }
        return htl.html`<div>
          ${vrow("final LayerNorm", a.lnfout, n * C, C)}
          <div style="font:10px ui-monospace,monospace;color:#888;margin:4px 0 2px 178px;">each token's output column, dotted with the vector above:</div>
          ${rows}
        </div>`;
      } }
  ];
  const pill = (label, active) => htl.html`<button style="font-size:10px;padding:2px 7px;border-radius:9px;border:1px solid #8884;background:${active ? "#8885" : "transparent"};cursor:pointer;">${label}</button>`;
  const stageBar = htl.html`<div style="display:flex;gap:4px;flex-wrap:wrap;"></div>`;
  const pickBar = htl.html`<div style="display:flex;gap:4px;align-items:center;margin:4px 0;"></div>`;
  const stageBox = htl.html`<div style="min-height:330px;margin-top:6px;"></div>`;
  const explain = htl.html`<div style="font-size:11px;color:#aaa;max-width:640px;margin:6px 0;"></div>`;
  const status = htl.html`<div style="font-size:10px;color:#888;"></div>`;
  const demo = Array.from(beliefKit.sampleSeq(process, 6, beliefKit.mulberry32(5)).tokens);
  let lastModelRedraw = 0;
  const redraw = () => {
    const toks = machineState.tokens.length ? machineState.tokens : demo;
    const win = toks.slice(-T);
    const n = win.length - 1;
    const m = getModel();
    const padded = new Int32Array(T);
    padded.set(win);
    m.forward(padded, null);
    stageBar.replaceChildren(...stages.map((s, i) => {
      const b = pill((i + 1) + " · " + s.key, i === stageIdx);
      b.onclick = () => { stageIdx = i; redraw(); };
      return b;
    }));
    const layerPills = Array.from({length: L}, (_, l) => {
      const b = pill("layer " + l, l === layer);
      b.onclick = () => { layer = l; redraw(); };
      return b;
    });
    const headPills = Array.from({length: H}, (_, h) => {
      const b = pill("head " + h, h === head);
      b.onclick = () => { head = h; redraw(); };
      return b;
    });
    pickBar.replaceChildren(...layerPills, htl.html`<span style="width:10px;"></span>`, ...headPills);
    explain.textContent = stages[stageIdx].explain;
    stageBox.replaceChildren(stages[stageIdx].render(m, win, n));
    status.textContent = (m._step >= 0 ? "weights from training step " + m._step : "untrained (random) weights — the wiring is the point") +
      " · computing position " + n + " of " + win.map((k) => process.alphabet[k]).join("") +
      (machineState.tokens.length ? "" : " (sample stream — feed tokens in the machine above to drive this)");
  };
  const onTokens = () => redraw();
  const onModel = () => {
    const now = window.performance.now();
    if (now - lastModelRedraw < 900) return;
    lastModelRedraw = now;
    redraw();
  };
  machineState.addEventListener("tokens", onTokens);
  modelBox.addEventListener("update", onModel);
  invalidation.then(() => {
    machineState.removeEventListener("tokens", onTokens);
    modelBox.removeEventListener("update", onModel);
  });
  redraw();
  return htl.html`<div class="bsg-fig">${stageBar}${pickBar}${explain}${stageBox}${status}</div>`;
}
;

const _sBackprop = function _sBackprop(md){return(
md`### How it learns — one step of backpropagation
- forward makes a prediction; the loss scores the surprise; backward runs the SAME wiring in reverse, assigning blame to every number that contributed
- gradients wear a different palette (green = push this value up, orange = push it down) — they are not activations
- this is far too slow to animate during real training, so here is one frozen step you can walk through; press the button to grab a fresh one`
)};

const _backpropFigure = function _backpropFigure(htl, process, beliefKit, renderKit, gptKit, trainCfg, modelBox, machineState, invalidation)
{
  const C = trainCfg.C, H = trainCfg.H, T = trainCfg.T, V = trainCfg.V, F = trainCfg.F, L = trainCfg.L;
  const fmt = (v) => (v >= 0 ? "+" : "") + v.toFixed(2);
  const strip = (vec, off, len, opts) => {
    opts = opts || {};
    const cw = opts.cw || Math.max(2, Math.min(5, Math.floor(300 / len)));
    const hh = opts.h || 14;
    const cnv = htl.html`<canvas width=${len * cw} height=${hh} style="border:1px solid #4443;border-radius:2px;flex:none;">`;
    const ctx = cnv.getContext("2d");
    let m = 1e-9;
    for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(vec[off + i]));
    for (let i = 0; i < len; i++) {
      const x = vec[off + i] / m;
      ctx.fillStyle = opts.grad
        ? (x >= 0 ? "rgba(89,161,79," + Math.abs(x).toFixed(3) + ")" : "rgba(242,142,43," + Math.abs(x).toFixed(3) + ")")
        : (x >= 0 ? "rgba(228,87,61," + Math.abs(x).toFixed(3) + ")" : "rgba(78,121,167," + Math.abs(x).toFixed(3) + ")");
      ctx.fillRect(i * cw, 0, cw - (cw > 2 ? 1 : 0), hh);
    }
    return cnv;
  };
  const vrow = (label, vec, off, len, opts) => htl.html`<div style="display:flex;align-items:center;gap:8px;margin:3px 0;flex-wrap:wrap;">
    <span style="width:190px;flex:none;font-size:11px;color:#888;text-align:right;">${label}</span>
    ${strip(vec, off, len, opts)}
    <span style="font:9px ui-monospace,monospace;color:#888;flex:none;">[${Array.from({length: Math.min(4, len)}, (_, i) => fmt(vec[off + i])).join(" ")} …]</span></div>`;
  const chip = (k) => htl.html`<span style="width:18px;flex:none;text-align:center;font:11px ui-monospace,monospace;background:${renderKit.TOKEN_COLORS[k % 3]}55;border-radius:2px;">${process.alphabet[k]}</span>`;
  let snap = null, stageIdx = 0;
  const compute = () => {
    const m = new gptKit.GPT({...trainCfg, B: 1}, beliefKit.mulberry32(7));
    let step = -1;
    if (modelBox.payload && modelBox.payload.cfg.V === V) {
      m.setWeights(modelBox.payload.weights);
      step = modelBox.payload.step;
    }
    // complete the machine's stream to a full window by sampling the true process
    // (padding with junk would pollute every gradient)
    const seq = machineState.tokens.slice(-T - 1);
    let eta;
    if (seq.length) {
      const bt = beliefKit.beliefTrajectory(process, seq);
      eta = bt.beliefs[bt.beliefs.length - 1];
    } else eta = Float64Array.from(process.stationary);
    const rng = beliefKit.mulberry32(Math.floor(window.performance.now()) % 100000);
    while (seq.length < T + 1) {
      const dist = beliefKit.nextTokenDist(process, eta);
      let r = rng(), k = V - 1, acc = 0;
      for (let i = 0; i < V; i++) { acc += dist[i]; if (r < acc) { k = i; break; } }
      seq.push(k);
      eta = beliefKit.beliefUpdate(process, eta, k)[0];
    }
    const tokens = new Int32Array(T), targets = new Int32Array(T);
    for (let t = 0; t < T; t++) { tokens[t] = seq[t]; targets[t] = seq[t + 1]; }
    m.zeroGrads();
    const loss = m.forward(tokens, targets);
    m.backward(tokens, targets);
    const losses = [];
    for (let t = 0; t < T; t++) losses.push(-Math.log(Math.max(m.act.probs[t * V + targets[t]], 1e-12)));
    let worst = 0;
    losses.forEach((l, t) => { if (l > losses[worst]) worst = t; });
    snap = { m, tokens, targets, losses, loss, step, worst };
  };
  const stages = [
    { key: "loss", explain: "one bar per position: how surprised was the model by the actual next token? The tallest bar teaches the most.",
      render: () => {
        const mx = Math.max(...snap.losses, 1e-9);
        return htl.html`<div>
          <div style="display:flex;align-items:flex-end;gap:3px;height:110px;">${snap.losses.map((l, t) =>
            htl.html`<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="width:20px;height:${Math.max(2, 100 * l / mx)}px;background:${renderKit.TOKEN_COLORS[snap.targets[t] % 3]}${t === snap.worst ? "" : "77"};border-radius:2px 2px 0 0;${t === snap.worst ? "outline:2px solid #fff5;" : ""}"></div>
              ${chip(snap.tokens[t])}
            </div>`)}</div>
          <div style="font:10px ui-monospace,monospace;color:#888;margin-top:4px;">mean loss ${snap.loss.toFixed(3)} nats · most surprising: position ${snap.worst} (target ${process.alphabet[snap.targets[snap.worst]]}, ${snap.losses[snap.worst].toFixed(2)} nats) — stages below follow that position</div>
        </div>`;
      } },
    { key: "the error signal", explain: "∂loss/∂logits = probabilities − one-hot(target). The gradient IS the miss: whatever probability you gave the wrong tokens, push down; the shortfall on the right token, push up.",
      render: () => {
        const p = snap.worst, a = snap.m.act;
        const rows = [];
        for (let k = 0; k < V; k++) {
          const prob = a.probs[p * V + k];
          const d = a["d.logits"][p * V + k] * T; // undo 1/N for readability
          rows.push(htl.html`<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            ${chip(k)}
            <span style="display:inline-block;width:110px;height:9px;background:#4442;border-radius:2px;position:relative;flex:none;">
              <span style="position:absolute;left:0;top:0;bottom:0;width:${(100 * prob).toFixed(1)}%;background:${renderKit.TOKEN_COLORS[k % 3]};border-radius:2px;"></span>
            </span>
            <span style="font:10px ui-monospace,monospace;color:#888;width:70px;flex:none;">p ${prob.toFixed(3)}</span>
            <span style="font:10px ui-monospace,monospace;color:${d >= 0 ? "#f28e2b" : "#59a14f"};">grad ${fmt(d)} ${k === snap.targets[p] ? "← the target: pushed UP" : "→ pushed down"}</span>
          </div>`);
        }
        return htl.html`<div>${rows}</div>`;
      } },
    { key: "into the vector", explain: "the unembedding runs backwards: the 3-number error becomes a 64-dim gradient on the final vector — which direction to move it so the right logit rises.",
      render: () => {
        const p = snap.worst, a = snap.m.act;
        return htl.html`<div>
          ${vrow("final vector (activation)", a.lnfout, p * C, C)}
          ${vrow("∂loss/∂(final vector)", a["d.lnfout"], p * C, C, {grad: true})}
        </div>`;
      } },
    { key: "back down the highway", explain: "the residual highway carries blame backwards through both blocks — each ADD in the forward pass becomes a SPLIT of gradient in the backward pass — until it reaches the embedding that started it all.",
      render: () => {
        const p = snap.worst, a = snap.m.act;
        const rows = [];
        for (let l = L - 1; l >= 0; l--) {
          rows.push(vrow("∂loss/∂res  after layer " + l, a["l" + l + ".d.res3"], p * C, C, {grad: true}));
          rows.push(vrow("∂loss/∂res  after attn " + l, a["l" + l + ".d.res2"], p * C, C, {grad: true}));
        }
        rows.push(vrow("∂loss/∂embedding  (arrives home)", a["d.h0"], p * C, C, {grad: true}));
        return htl.html`<div>${rows}</div>`;
      } },
    { key: "parameter pressure", explain: "every weight tensor accumulates gradient from ALL positions at once. RMS gradient per tensor = where this batch pushes hardest.",
      render: () => {
        const P = snap.m.params;
        const entries = Object.keys(P).map((name) => {
          const g = P[name].g;
          let s = 0;
          for (let i = 0; i < g.length; i++) s += g[i] * g[i];
          return { name, rms: Math.sqrt(s / g.length), n: g.length };
        }).sort((x, y) => y.rms - x.rms).slice(0, 12);
        const mx = entries[0].rms || 1e-9;
        return htl.html`<div>${entries.map((e) => htl.html`<div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
          <span style="width:120px;flex:none;font:10px ui-monospace,monospace;color:#888;text-align:right;">${e.name}</span>
          <span style="display:inline-block;width:${Math.max(2, 260 * e.rms / mx)}px;height:9px;background:#59a14f;border-radius:2px;"></span>
          <span style="font:9px ui-monospace,monospace;color:#888;">rms ${e.rms.toExponential(1)} · ${e.n} weights</span>
        </div>`)}</div>`;
      } },
    { key: "the nudge", explain: "the optimizer moves every weight a tiny step against its gradient (Adam rescales per-weight; shown here as plain SGD for clarity). Every weight in the architecture map gets one of these nudges, every training step; that is all learning is.",
      render: () => {
        const P = snap.m.params;
        const g = P.wte.g, w = P.wte.w;
        const top = [];
        for (let i = 0; i < g.length; i++) {
          top.push(i);
          top.sort((x, y) => Math.abs(g[y]) - Math.abs(g[x]));
          if (top.length > 6) top.pop();
        }
        const lr = 1e-3;
        return htl.html`<div style="font:11px ui-monospace,monospace;color:#aaa;">${top.map((i) => {
          const tok = Math.floor(i / C), dim = i % C;
          return htl.html`<div style="margin:2px 0;">wte[${process.alphabet[tok]}][dim ${dim}]:  w ${fmt(w[i])}  ·  g ${fmt(g[i])}  →  w′ = w − lr·g = ${fmt(w[i] - lr * g[i])}</div>`;
        })}
        <div style="color:#888;margin-top:6px;">(largest-gradient entries of the token embedding, lr = ${lr})</div></div>`;
      } }
  ];
  const pill = (label, active) => htl.html`<button style="font-size:10px;padding:2px 7px;border-radius:9px;border:1px solid #8884;background:${active ? "#8885" : "transparent"};cursor:pointer;">${label}</button>`;
  const runBtn = htl.html`<button style="font-size:12px;">⚡ run one training step on the machine's stream</button>`;
  const stageBar = htl.html`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;"></div>`;
  const explain = htl.html`<div style="font-size:11px;color:#aaa;max-width:640px;margin:6px 0;"></div>`;
  const stageBox = htl.html`<div style="min-height:220px;"></div>`;
  const status = htl.html`<div style="font-size:10px;color:#888;"></div>`;
  const redraw = () => {
    if (!snap) {
      stageBar.replaceChildren();
      explain.textContent = "";
      stageBox.replaceChildren(htl.html`<div style="color:#888;font-size:12px;padding:20px 0;">press the button — one forward pass, one loss, one backward pass, frozen for inspection</div>`);
      status.textContent = "";
      return;
    }
    stageBar.replaceChildren(...stages.map((s, i) => {
      const b = pill((i + 1) + " · " + s.key, i === stageIdx);
      b.onclick = () => { stageIdx = i; redraw(); };
      return b;
    }));
    explain.textContent = stages[stageIdx].explain;
    stageBox.replaceChildren(stages[stageIdx].render());
    status.textContent = (snap.step >= 0 ? "weights from training step " + snap.step : "untrained (random) weights") +
      " · stream " + Array.from(snap.tokens, (k) => process.alphabet[k]).join("") + " (machine tokens + sampled completion)";
  };
  runBtn.onclick = () => { compute(); stageIdx = 0; redraw(); };
  redraw();
  return htl.html`<div class="bsg-fig">${runBtn}${stageBar}${explain}${stageBox}${status}</div>`;
}
;

const _s6 = function _s6(md){return(
md`## What did the HMM learn?
- the learned machine *is* its explanation: T̂ ≈ T (see §2 heatmaps)
- the Mixed-State Presentation: run the belief walker over *every possible* prefix and keep all the dots
- chaos game below: the fractal self-assembles (it is an iterated function system)
- computational mechanics: an optimal predictor must live somewhere in this triangle
- drag mess3 x/α above and the fractal deforms live; z1r shows a finite constellation instead`
)};

const _mspFigure = function _mspFigure(htl, process, beliefKit, renderKit, invalidation)
{
  const N_PTS = 60000;
  const canvas = renderKit.simplexCanvas(process, [], {width: 640, height: 560});
  const counter = htl.html`<div style="font-size:11px;color:#888;">0 belief points</div>`;
  const el = htl.html`<div class="bsg-fig">${canvas}${counter}</div>`;
  const rng = beliefKit.mulberry32(31);
  let stop = false, total = 0;
  invalidation.then(() => { stop = true; });
  const pts = [];
  const step = () => {
    if (stop) return;
    for (let b = 0; b < 80 && total < N_PTS; b++) {
      const { tokens } = beliefKit.sampleSeq(process, 16, rng);
      const { beliefs } = beliefKit.beliefTrajectory(process, tokens);
      for (const eta of beliefs) { pts.push({eta, color: renderKit.beliefColor(eta), r: 2, a: 0.45}); total++; }
    }
    renderKit.simplexRedraw(canvas, process, pts);
    counter.textContent = total + " belief points (chaos game)";
    if (total < N_PTS) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
  return el;
}
;

const _s7 = function _s7(md){return(
md`## What did the Transformer learn?
- one linear map *per position* (closed-form ridge regression) from residual stream → belief simplex; not a decoder network, not a cherry-picked neuron
- points plotted at *predicted* belief, colored by *true* belief — the eye does the theorem
- shuffle control: refit on permuted labels → collapses to the center (the fractal is in the activations, not the regression's imagination)
- layer picker: geometry sharpens with depth
- emergence scrubber: sweep the training checkpoints you made yourself and watch the fractal condense out of noise`
)};

const _v_shuffleProbe = function _v_shuffleProbe(Inputs){return(
Inputs.toggle({label: "shuffle control", value: false})
)};
const _shuffleProbe = (G, _) => G.input(_);

const _v_probeLayer = function _v_probeLayer(Inputs){return(
Inputs.radio([1, 2], {value: 2, label: "probe layer"})
)};
const _probeLayer = (G, _) => G.input(_);

const _probeFigure = function _probeFigure(htl, probeData, renderKit, process)
{
  if (!probeData) return htl.html`<div class="bsg-fig" style="color:#888;">train the transformer to enable the probe</div>`;
  const pts = probeData.pts.map((p) => ({eta: p.etaHat, color: renderKit.beliefColor(p.etaTrue), r: 2.2, a: 0.55}));
  return htl.html`<div class="bsg-fig">
    <div style="font-size:12px;">probe R² = <b>${probeData.R2.map((r) => r.toFixed(4)).join(", ")}</b> (layer ${probeData.layer}${probeData.shuffled ? ", SHUFFLED CONTROL" : ""}, step ${probeData.step})</div>
    ${renderKit.simplexCanvas(process, pts, {width: 640, height: 560})}
  </div>`;
}
;

const _v_ckptIdx = function _v_ckptIdx(Inputs, trainSnapshot){return(
Inputs.range([0, Math.max(1, trainSnapshot.st.ckpts.length - 1)], {value: Math.max(1, trainSnapshot.st.ckpts.length - 1), step: 1, label: "checkpoint"})
)};
const _ckptIdx = (G, _) => G.input(_);

const _emergenceFigure = function _emergenceFigure(htl, trainSnapshot, ckptIdx, gptFactory, beliefKit, probeKit, evalSet, trainCfg, renderKit, process)
{
  const ckpts = trainSnapshot.st.ckpts;
  if (ckpts.length < 2) return htl.html`<div class="bsg-fig" style="color:#888;">train to accumulate checkpoints, then scrub emergence here</div>`;
  const ck = ckpts[Math.min(ckptIdx, ckpts.length - 1)];
  const model = new gptFactory.GPT(trainCfg, beliefKit.mulberry32(0));
  model.setWeights(ck.weights);
  const { X, Y, N, D } = probeKit.collect(model, trainCfg, evalSet.seqs, 192, trainCfg.L);
  // per-position ridge fits (rows are seq-major, pos = i % T) — same recipe as probeData
  const Yhat = new Float64Array(N * 3);
  for (let t = 0; t < trainCfg.T; t++) {
    const idx = [];
    for (let i = t; i < N; i += trainCfg.T) idx.push(i);
    const Np = idx.length;
    const Xp = new Float64Array(Np * D), Yp = new Float64Array(Np * 3);
    idx.forEach((i, j) => {
      Xp.set(X.subarray(i * D, (i + 1) * D), j * D);
      Yp.set(Y.subarray(i * 3, (i + 1) * 3), j * 3);
    });
    const Wp = probeKit.solveRidge(Xp, Yp, Np, D, 3, 1e-4);
    const Yhp = probeKit.predict(Xp, Wp, Np, D, 3);
    idx.forEach((i, j) => Yhat.set(Yhp.subarray(j * 3, (j + 1) * 3), i * 3));
  }
  const pts = [];
  for (let i = 0; i < N; i++)
    pts.push({eta: [Yhat[i * 3], Yhat[i * 3 + 1], Yhat[i * 3 + 2]],
              color: renderKit.beliefColor([Y[i * 3], Y[i * 3 + 1], Y[i * 3 + 2]]), r: 2.2, a: 0.55});
  return htl.html`<div class="bsg-fig">
    <div style="font-size:12px;">checkpoint at step <b>${ck.step}</b></div>
    ${renderKit.simplexCanvas(process, pts, {width: 640, height: 560})}
  </div>`;
}
;

const _s10 = function _s10(md){return(
md`## What the hell?!
- switch the process radio to **rrxor** and train (state per process is kept — mess3 progress is safe)
- rrxor has belief states S / "0" / "1" whose next-token predictions are *identical* (50/50) — no gradient ever needed them separated
- yet a linear readout of the residual stream separates them (prototype: 76% layer0 → 86% final → 94% concat, vs 50% chance)
- figure: linear readout simplex, colored by *true* belief state; model's own p(1) per class shown — uniform for all three
- the dividing line: the HMM is a model of the world; the transformer taught itself to be a model of *belief about the world*
- links: original post · epsilon-transformers · Marzen & Crutchfield`
)};

const _twinsFigure = function _twinsFigure(htl, trainState, trainSnapshot, gptFactory, beliefKit, probeKit, renderKit)
{
  void trainSnapshot; // recompute as training progresses
  const rrx = beliefKit.make("rrxor", 0, 0);
  const cfg = {V: 2, T: 12, C: 32, H: 4, L: 2, F: 128, B: 32};
  const key = "rrxor|" + JSON.stringify(cfg);
  const st = trainState.get(key);
  if (!st || !st.weights || st.step < 500)
    return htl.html`<div class="bsg-fig" style="color:#888;">no rrxor-trained transformer yet (or &lt;500 steps) — switch process to rrxor above and train</div>`;
  const model = new gptFactory.GPT(cfg, beliefKit.mulberry32(0));
  model.setWeights(st.weights);
  // collect twin rows: concat residuals of both layers at positions with pure S/"0"/"1" beliefs
  const rng = beliefKit.mulberry32(555);
  const rows = [];
  const toks = new Int32Array(cfg.B * cfg.T);
  for (let batch = 0; batch < 12; batch++) {
    const seqs = [];
    for (let b = 0; b < cfg.B; b++) {
      const s = beliefKit.sampleSeq(rrx, cfg.T, rng);
      seqs.push(s);
      toks.set(s.tokens, b * cfg.T);
    }
    model.forward(toks, null);
    const r0 = model.act["l0.res3"], r1 = model.act["l1.res3"], probs = model.act.probs;
    for (let b = 0; b < cfg.B; b++) {
      const { beliefs } = beliefKit.beliefTrajectory(rrx, seqs[b].tokens);
      for (let t = 0; t < cfg.T; t++) {
        const belief = beliefs[t];
        let amax = 0;
        for (let i = 1; i < 5; i++) if (belief[i] > belief[amax]) amax = i;
        if (belief[amax] < 0.99 || amax > 2) continue;
        const off = (b * cfg.T + t) * cfg.C;
        const x = new Float64Array(2 * cfg.C);
        x.set(r0.subarray(off, off + cfg.C));
        x.set(r1.subarray(off, off + cfg.C), cfg.C);
        rows.push({x, cls: amax, p1: probs[(b * cfg.T + t) * 2 + 1]});
      }
    }
  }
  if (rows.length < 60) return htl.html`<div class="bsg-fig" style="color:#888;">not enough synchronized positions collected</div>`;
  // train/test split, one-hot ridge
  const shuf = beliefKit.mulberry32(77);
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(shuf() * (i + 1)); const t = rows[i]; rows[i] = rows[j]; rows[j] = t; }
  const split = Math.floor(rows.length * 0.7);
  const D = 2 * cfg.C + 1;
  const X = new Float64Array(split * D), Y = new Float64Array(split * 3);
  for (let n = 0; n < split; n++) { X.set(rows[n].x, n * D); X[n * D + D - 1] = 1; Y[n * 3 + rows[n].cls] = 1; }
  const W = probeKit.solveRidge(X, Y, split, D, 3, 1e-3);
  let correct = 0, tested = 0;
  const classStats = [[], [], []];
  const V0 = [0.1, 0.88], V1 = [0.9, 0.88], V2 = [0.5, 0.14];
  const colors = ["#5a5a5a", "#dc2828", "#2850e6"];
  const pts = [];
  for (let n = split; n < rows.length; n++) {
    const r = rows[n];
    const s = [0, 1, 2].map((k) => {
      let a = W[(D - 1) * 3 + k];
      for (let i = 0; i < 2 * cfg.C; i++) a += r.x[i] * W[i * 3 + k];
      return Math.max(0, a);
    });
    const pred = s.indexOf(Math.max(...s));
    if (pred === r.cls) correct++;
    tested++;
    classStats[r.cls].push(r.p1);
    const sum = s[0] + s[1] + s[2] || 1;
    const p0 = s[0] / sum, p1 = s[1] / sum, p2 = s[2] / sum;
    pts.push({x: p0 * V0[0] + p1 * V1[0] + p2 * V2[0], y: p0 * V0[1] + p1 * V1[1] + p2 * V2[1], color: colors[r.cls]});
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = htl.html`<canvas width=${560 * dpr} height=${490 * dpr} style="max-width:100%;width:560px;">`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 560, 490);
  ctx.globalAlpha = 0.6;
  for (const p of pts) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x * 560, p.y * 490, 2.4, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  const mp = (xs) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : "—";
  return htl.html`<div class="bsg-fig">
    <div style="font-size:12px;">
      twin readout (held-out): <b>${(100 * correct / Math.max(1, tested)).toFixed(1)}%</b> vs 33–50% chance, n=${tested}, step ${st.step}<br/>
      model's own mean p(1): S=${mp(classStats[0])} · "0"=${mp(classStats[1])} · "1"=${mp(classStats[2])} — all ≈ 0.5, the logits cannot tell them apart
    </div>
    <div style="font-size:11px;color:#888;">linear readout simplex — <span style="color:#5a5a5a;">S</span> · <span style="color:#dc2828;">"0"</span> · <span style="color:#2850e6;">"1"</span></div>
    ${canvas}
  </div>`;
}
;

const _s11 = function _s11(md){return(
md`## One machine, many worlds
- concession: the HMM won §2 because we whispered the answer's shape to it (family + state count); the transformer was told nothing
- now raise the stakes: ONE transformer trained on a **mixture of five structurally different worlds** — the mess3 fractal, a noisy cycle, a never-repeat process, biased letters, pure iid
- the exact optimal predictor is a *meta-Bayesian*: a joint posterior over (which world, which state) — 15 numbers, computed exactly below
- honesty box: the mixture is secretly still a 15-state HMM (the block-diagonal union), and EM *nearly learns it too* given a generous state budget — measured held-out gaps to Bayes: EM-5 +0.090 (fails), EM-15 +0.010, EM-20 +0.006, transformer +0.006. Prediction loss alone crowns no winner
- the difference is *what was learned*: the HMM's belief filter **is** its mechanism, by construction; the transformer was never told there were worlds or states, yet its residual stream carries a calibrated copy of the meta-Bayesian's world-posterior — readable by one linear map (log-space, spread across both layers)
- the game: a **mystery world** is sampled in secret and streams tokens; belief starts uniform ("no idea") and contracts onto the truth
- right pane: all five belief geometries superimposed, each faded by its current posterior mass — the geometry **comes into focus** as evidence arrives
- train the transformer (toggle below) and the second bar row shows the *network's* world-belief contracting in lockstep with Bayes`
)};

const _v_zooTraining = function _v_zooTraining(Inputs){return(
Inputs.toggle({label: "train on the world zoo", value: false})
)};
const _zooTraining = (G, _) => G.input(_);

const _zooCfg = function _zooCfg(){return(
{ V: 3, T: 32, C: 48, H: 4, L: 2, F: 192, B: 32 }
)};

const _zooEval = function _zooEval(beliefKit, zooCfg)
{
  const worlds = beliefKit.zooWorlds();
  const K = worlds.length;
  const rng = beliefKit.mulberry32(4242);
  const seqs = [];
  let floorSum = 0, floorN = 0;
  for (let q = 0; q < 160; q++) {
    const wi = q % K;
    const { tokens } = beliefKit.sampleSeq(worlds[wi], zooCfg.T + 1, rng);
    const w = beliefKit.metaInit(worlds);
    const postTraj = new Float64Array(zooCfg.T * K);
    for (let t = 0; t < zooCfg.T; t++) {
      beliefKit.metaUpdate(worlds, w, tokens[t]);
      postTraj.set(beliefKit.worldMarginal(w), t * K);
      const pm = beliefKit.metaPredictive(worlds, w);
      floorSum += -Math.log(pm[tokens[t + 1]]);
      floorN++;
    }
    seqs.push({ world: wi, tokens, postTraj });
  }
  return { worlds, K, seqs, floorLoss: floorSum / floorN, iidLoss: Math.log(3) };
}
;

const _zooModelBox = function _zooModelBox(){return(
Object.assign(new window.EventTarget(), { payload: null, probeW: null })
)};

const _zooSnapshot = async function* _zooSnapshot(zooTraining, nWorkers, trainState, zooCfg, workerSource, gptKit, beliefKit, zooModelBox, invalidation)
{
  const key = "zoo|" + JSON.stringify(zooCfg);
  let st = trainState.get(key);
  if (!st) {
    st = { weights: null, step: 0, lossHist: [], ckpts: [], nextCkpt: 1e9 };
    trainState.set(key, st);
  }
  const publish = () => {
    if (st.weights) {
      zooModelBox.payload = { weights: st.weights, cfg: zooCfg, step: st.step };
      zooModelBox.dispatchEvent(new window.Event("update"));
    }
  };
  publish();
  if (!zooTraining) {
    yield { st, running: false };
    return;
  }
  if (!st.weights) {
    const m0 = new gptKit.GPT(zooCfg, beliefKit.mulberry32(7));
    st.weights = m0.getWeights();
  }
  const url = window.URL.createObjectURL(new window.Blob([workerSource], { type: "application/javascript" }));
  const workers = [];
  let stopped = false;
  invalidation.then(() => {
    stopped = true;
    workers.forEach((w) => w.worker.terminate());
    window.URL.revokeObjectURL(url);
  });
  for (let i = 0; i < nWorkers; i++) {
    const worker = new window.Worker(url);
    const queue = [], backlog = [];
    worker.onmessage = (e) => {
      const res = queue.shift();
      if (res) res(e.data); else backlog.push(e.data);
    };
    const next = () => backlog.length ? Promise.resolve(backlog.shift()) : new Promise((res) => queue.push(res));
    workers.push({ worker, next });
    worker.postMessage({
      type: "init", cfg: zooCfg, procName: "zoo", px: 0, pa: 0,
      seed: 5000 + i * 7919 + st.step, step: st.step,
      weights: st.weights.buffer.slice(0)
    });
  }
  await Promise.all(workers.map((w) => w.next()));
  yield { st, running: true };
  const K = 50;
  const nW = st.weights.length;
  let round = 0;
  while (!stopped && st.step < 60000) {
    round++;
    const decay = Math.max(0.1, 0.5 * (1 + Math.cos(Math.PI * Math.min(1, st.step / 12000))));
    const lr = 1e-3 * Math.min(1, (st.step + K) / 100) * decay;
    for (const w of workers) {
      const copy = st.weights.buffer.slice(0);
      w.worker.postMessage({ type: "round", weights: copy, steps: K, lr }, [copy]);
    }
    const results = await Promise.all(workers.map((w) => w.next()));
    if (stopped) return;
    const avg = new Float64Array(nW);
    for (const r of results) {
      const wv = new Float64Array(r.weights);
      for (let i = 0; i < nW; i++) avg[i] += wv[i];
    }
    for (let i = 0; i < nW; i++) avg[i] /= results.length;
    st.weights = avg;
    st.step += K;
    const ema = results.reduce((a, r) => a + r.ema, 0) / results.length;
    st.lossHist.push([st.step, ema]);
    if (st.lossHist.length > 600) st.lossHist.splice(0, st.lossHist.length - 600);
    publish();
    if (round % 3 === 0) yield { st, running: true };
  }
}
;

const _zooLossFigure = function _zooLossFigure(htl, zooSnapshot, zooEval, renderKit, gptKit, zooCfg)
{
  const st = zooSnapshot.st;
  const hist = st.lossHist;
  const lines = [
    {y: zooEval.floorLoss, color: "#009e73", label: `meta-Bayes floor ${zooEval.floorLoss.toFixed(3)}`},
    {y: zooEval.iidLoss, color: "#999", label: `iid ${zooEval.iidLoss.toFixed(3)}`}
  ];
  return htl.html`<div class="bsg-fig">
    <div style="font-size:12px;">zoo model (${gptKit.countParams(zooCfg).toLocaleString("en-US")} params) · step <b>${st.step}</b> ${zooSnapshot.running ? "· training…" : "· idle"} · worker-ema loss ${hist.length ? hist[hist.length - 1][1].toFixed(4) : "—"} nats</div>
    ${renderKit.lineChart(hist, {width: 560, height: 180, hlines: lines, ymin: zooEval.floorLoss - 0.02})}
  </div>`;
}
;

const _zooProbeData = function _zooProbeData(zooSnapshot, zooCfg, zooEval, gptKit, beliefKit, probeKit, zooModelBox)
{
  const st = zooSnapshot.st;
  if (!st.weights || st.step < 100) return null;
  const model = new gptKit.GPT(zooCfg, beliefKit.mulberry32(0));
  model.setWeights(st.weights);
  // best readout found by prototype (meta_probe2.ts): CONCAT both layers'
  // residuals, fit in log space, read back through softmax — the world posterior
  // is spread across layers (the rrxor-twins lesson) and encoded as log-probability
  const K = zooEval.K, C = zooCfg.C, D = 2 * C + 1;
  const nSeq = Math.floor(zooEval.seqs.length / zooCfg.B) * zooCfg.B;
  const N = nSeq * zooCfg.T;
  const X = new Float64Array(N * D);
  const Y = new Float64Array(N * K);
  const pos = new Int32Array(N);
  const world = new Int32Array(N);
  const tokens = new Int32Array(zooCfg.B * zooCfg.T);
  let n = 0;
  for (let s = 0; s + zooCfg.B <= nSeq; s += zooCfg.B) {
    for (let b = 0; b < zooCfg.B; b++) tokens.set(zooEval.seqs[s + b].tokens.subarray(0, zooCfg.T), b * zooCfg.T);
    model.forward(tokens, null);
    const res0 = model.act["l0.res3"];
    const res1 = model.act["l" + (zooCfg.L - 1) + ".res3"];
    for (let b = 0; b < zooCfg.B; b++)
      for (let t = 0; t < zooCfg.T; t++) {
        const ro = (b * zooCfg.T + t) * C;
        for (let c = 0; c < C; c++) { X[n * D + c] = res0[ro + c]; X[n * D + C + c] = res1[ro + c]; }
        X[n * D + 2 * C] = 1;
        for (let k = 0; k < K; k++) Y[n * K + k] = zooEval.seqs[s + b].postTraj[t * K + k];
        pos[n] = t; world[n] = zooEval.seqs[s + b].world;
        n++;
      }
  }
  const Ylog = Float64Array.from(Y, (v) => Math.log(v + 1e-4));
  const W = probeKit.solveRidge(X, Ylog, n, D, K, 1e-4);
  const raw = probeKit.predict(X, W, n, D, K);
  const Yhat = new Float64Array(n * K);
  for (let i = 0; i < n; i++) {
    let mx = -Infinity;
    for (let k = 0; k < K; k++) mx = Math.max(mx, raw[i * K + k]);
    let z = 0;
    for (let k = 0; k < K; k++) z += Math.exp(raw[i * K + k] - mx);
    for (let k = 0; k < K; k++) Yhat[i * K + k] = Math.exp(raw[i * K + k] - mx) / z;
  }
  const R2 = probeKit.r2(Y, Yhat, n, K);
  // argmax accuracy vs exact Bayes, late positions (t >= 16)
  let agree = 0, correct = 0, bayesCorrect = 0, late = 0;
  for (let i = 0; i < n; i++) {
    if (pos[i] < 16) continue;
    let am = 0, ab = 0;
    for (let k = 0; k < K; k++) {
      if (Yhat[i * K + k] > Yhat[i * K + am]) am = k;
      if (Y[i * K + k] > Y[i * K + ab]) ab = k;
    }
    if (am === ab) agree++;
    if (am === world[i]) correct++;
    if (ab === world[i]) bayesCorrect++;
    late++;
  }
  zooModelBox.probeW = W;
  return { W, R2, agree: agree / late, correct: correct / late, bayesCorrect: bayesCorrect / late, step: st.step };
}
;

const _zooProbeReport = function _zooProbeReport(htl, zooProbeData, zooEval)
{
  if (!zooProbeData) return htl.html`<div class="bsg-fig" style="color:#888;">train the zoo model to fit the world-posterior probe</div>`;
  const d = zooProbeData;
  return htl.html`<div class="bsg-fig" style="font-size:12px;">
    world-posterior probe (residual → 5 worlds, one linear map, step ${d.step}):
    R² per world = <b>${Array.from(d.R2, (r) => r.toFixed(3)).join(", ")}</b>
    (${zooEval.worlds.map((w) => w.name).join(" · ")})<br/>
    late positions (t≥16): probe picks the true world <b>${(100 * d.correct).toFixed(1)}%</b>
    · exact Bayes ${(100 * d.bayesCorrect).toFixed(1)}%
    · probe agrees with Bayes ${(100 * d.agree).toFixed(1)}%
  </div>`;
}
;

const _contractionFigure = function _contractionFigure(htl, beliefKit, renderKit, gptKit, zooCfg, zooModelBox, invalidation)
{
  const worlds = beliefKit.zooWorlds();
  const K = worlds.length;
  const WCOLORS = ["#e15759", "#4e79a7", "#f28e2b", "#59a14f", "#b07aa1"];
  // precompute each world's belief-geometry cloud once (chaos game, 3-simplex)
  const clouds = worlds.map((proc) => {
    const rng = beliefKit.mulberry32(7 + proc.name.length);
    const etas = [];
    for (let s = 0; s < 220; s++) {
      const { tokens } = beliefKit.sampleSeq(proc, 12, rng);
      const { beliefs } = beliefKit.beliefTrajectory(proc, tokens);
      for (const eta of beliefs) etas.push(eta);
    }
    return etas;
  });
  // mystery state
  let hidden = 0, trueState = 0, tokens = [], w = beliefKit.metaInit(worlds), revealed = false, timer = null;
  const rand = beliefKit.mulberry32(Math.floor(window.performance.now()) % 100000);
  let built = null, builtStep = -1;
  const getModel = () => {
    if (!zooModelBox.payload) return null;
    if (builtStep !== zooModelBox.payload.step) {
      built = new gptKit.GPT({...zooCfg, B: 1}, beliefKit.mulberry32(0));
      built.setWeights(zooModelBox.payload.weights);
      builtStep = zooModelBox.payload.step;
    }
    return built;
  };
  const probePosterior = () => {
    const model = getModel();
    if (!model || !zooModelBox.probeW || !tokens.length) return null;
    const win = tokens.slice(-zooCfg.T);
    const padded = new Int32Array(zooCfg.T);
    padded.set(win);
    model.forward(padded, null);
    const C = zooCfg.C;
    const res0 = model.act["l0.res3"];
    const res1 = model.act["l" + (zooCfg.L - 1) + ".res3"];
    const n = win.length - 1;
    const W = zooModelBox.probeW; // log-space readout over concat(l0,l1) + bias
    const raw = [];
    for (let k = 0; k < K; k++) {
      let a = W[2 * C * K + k];
      for (let c = 0; c < C; c++) a += res0[n * C + c] * W[c * K + k] + res1[n * C + c] * W[(C + c) * K + k];
      raw.push(a);
    }
    const mx = Math.max(...raw);
    const ex = raw.map((v) => Math.exp(v - mx));
    const z = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / z);
  };
  // ---- skeleton
  const chips = htl.html`<div style="font-family:ui-monospace,monospace;font-size:14px;min-height:22px;display:flex;gap:2px;flex-wrap:wrap;"></div>`;
  const rows = worlds.map((proc, c) => {
    const bayesBar = htl.html`<div style="height:10px;background:${WCOLORS[c]};width:20%;border-radius:2px;"></div>`;
    const probeBar = htl.html`<div style="height:10px;background:${WCOLORS[c]}88;width:0%;border-radius:2px;"></div>`;
    const label = htl.html`<div style="width:110px;flex:none;font-size:12px;color:${WCOLORS[c]};">${proc.name}</div>`;
    const pct = htl.html`<div style="width:46px;flex:none;font-size:11px;color:#888;text-align:right;"></div>`;
    const el = htl.html`<div style="display:flex;align-items:center;gap:8px;padding:1px 4px;border-radius:4px;">
      ${label}
      <div style="flex:1;display:flex;flex-direction:column;gap:2px;">${bayesBar}${probeBar}</div>
      ${pct}
    </div>`;
    return { el, bayesBar, probeBar, pct, label };
  });
  const canvas = renderKit.simplexCanvas(worlds[0], [], {width: 460, height: 400});
  const status = htl.html`<div style="font-size:11px;color:#888;"></div>`;
  const btnPlay = htl.html`<button style="font-size:12px;">▶ play</button>`;
  const btnStep = htl.html`<button style="font-size:12px;">step 1 token</button>`;
  const btnNew = htl.html`<button style="font-size:12px;">🎲 new mystery world</button>`;
  const btnReveal = htl.html`<button style="font-size:12px;">reveal</button>`;
  const redraw = () => {
    const bayes = beliefKit.worldMarginal(w);
    const probe = probePosterior();
    chips.replaceChildren(...tokens.slice(-zooCfg.T).map((k) =>
      htl.html`<span style="padding:0 4px;border-radius:3px;background:${renderKit.TOKEN_COLORS[k % 3]}66;">${worlds[0].alphabet[k]}</span>`));
    rows.forEach((r, c) => {
      r.bayesBar.style.width = (100 * bayes[c]).toFixed(1) + "%";
      r.probeBar.style.width = probe ? (100 * probe[c]).toFixed(1) + "%" : "0%";
      r.pct.textContent = (100 * bayes[c]).toFixed(0) + "%";
      r.el.style.outline = revealed && c === hidden ? "2px solid " + WCOLORS[c] : "none";
      r.label.textContent = revealed && c === hidden ? worlds[c].name + " ✓" : worlds[c].name;
    });
    // geometry comes into focus: each world's cloud faded by its (probe > bayes) mass
    const post = probe || Array.from(bayes);
    const pts = [];
    for (let c = 0; c < K; c++) {
      const a = 0.04 + 0.55 * post[c];
      for (const eta of clouds[c]) pts.push({ eta, color: WCOLORS[c], r: 2, a });
    }
    renderKit.simplexRedraw(canvas, worlds[0], pts);
    status.textContent = tokens.length + " tokens · " +
      (probe ? "clouds faded by the NETWORK's world-belief (bars: solid = exact Bayes, faded = probe)" :
        "clouds faded by exact Bayes (train the zoo model to add the network's readout)");
  };
  const stepToken = () => {
    const proc = worlds[hidden];
    let r = rand(), acc = 0, k = 0, ns = trueState, done = false;
    for (let kk = 0; kk < proc.V && !done; kk++)
      for (let j = 0; j < proc.nStates && !done; j++) {
        acc += proc.T[kk][trueState][j];
        if (r < acc) { k = kk; ns = j; done = true; }
      }
    trueState = ns;
    tokens.push(k);
    beliefKit.metaUpdate(worlds, w, k);
    redraw();
  };
  const newWorld = () => {
    hidden = Math.floor(rand() * K);
    const proc = worlds[hidden];
    let r = rand(), acc = 0;
    trueState = 0;
    for (let i = 0; i < proc.nStates; i++) { acc += proc.stationary[i]; if (r < acc) { trueState = i; break; } }
    tokens = [];
    w = beliefKit.metaInit(worlds);
    revealed = false;
    redraw();
  };
  const stopPlay = () => { if (timer) { window.clearTimeout(timer); timer = null; btnPlay.textContent = "▶ play"; } };
  btnPlay.onclick = () => {
    if (timer) { stopPlay(); return; }
    btnPlay.textContent = "⏸ pause";
    const tick = () => { stepToken(); if (tokens.length < 200) timer = window.setTimeout(tick, 280); else stopPlay(); };
    tick();
  };
  btnStep.onclick = () => { stopPlay(); stepToken(); };
  btnNew.onclick = () => { stopPlay(); newWorld(); };
  btnReveal.onclick = () => { revealed = true; redraw(); };
  const onUpdate = () => redraw();
  zooModelBox.addEventListener("update", onUpdate);
  invalidation.then(() => { stopPlay(); zooModelBox.removeEventListener("update", onUpdate); });
  newWorld();
  return htl.html`<div class="bsg-fig">
    <div style="display:flex;gap:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:320px;">
        <div style="display:flex;gap:6px;margin-bottom:6px;">${btnPlay}${btnStep}${btnNew}${btnReveal}</div>
        ${chips}
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:8px;">${rows.map((r) => r.el)}</div>
        <div style="margin-top:6px;">${status}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;max-width:460px;">five possible geometries, superimposed — belief mass = visibility</div>
        ${canvas}
      </div>
    </div>
  </div>`;
}
;

const _footer = function _footer(md){return(
md`---
- source: [Transformers Represent Belief State Geometry in their Residual Stream](https://www.alignmentforum.org/posts/gTZ2SxesbHckJ3CkF/transformers-represent-belief-state-geometry-in-their)
- processes transcribed from [epsilon-transformers](https://github.com/adamimos/epsilon-transformers); prototype: \`tools/belief-proto/\` in lopecode-dev
- machinery cells below: belief engine, GPT with hand-written backprop, ridge probe, renderers, worker-pool trainer`
)};

// ---------------------------------------------------------------- machinery

const _styles = function _styles(htl){return(
htl.html`<style>
.bsg-fig { margin: 8px 0; max-height: 78vh; overflow: auto; }
.bsg-tokbtn { position: relative; height: 42px; text-align: left; font-size: 15px;
  font-family: ui-monospace, monospace; border: 1px solid #bbb; border-radius: 6px;
  background: #fafafa; cursor: pointer; overflow: hidden; }
.bsg-tokbtn:hover { border-color: #666; }
.bsg-fill { position: absolute; left: 0; top: 0; bottom: 0; background: #cfe3ff; transition: width 120ms; }
.bsg-notch { position: absolute; top: 0; bottom: 0; width: 2px; background: #00000055; }
.bsg-lab { position: relative; padding-left: 10px; }
</style>`
)};

const _beliefKitFactory = function _beliefKitFactory()
{
  function beliefKitFactory() {
    function mulberry32(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function stationaryOf(T, nStates) {
      const M = [];
      for (let i = 0; i < nStates; i++) {
        M.push(new Array(nStates).fill(0));
        for (const Tk of T) for (let j = 0; j < nStates; j++) M[i][j] += Tk[i][j];
      }
      let pi = new Float64Array(nStates).fill(1 / nStates);
      for (let it = 0; it < 1000; it++) {
        const next = new Float64Array(nStates);
        for (let i = 0; i < nStates; i++) for (let j = 0; j < nStates; j++) next[j] += pi[i] * M[i][j];
        let s = 0;
        for (let j = 0; j < nStates; j++) s += next[j];
        for (let j = 0; j < nStates; j++) next[j] /= s;
        pi = next;
      }
      return pi;
    }
    function finish(name, nStates, V, T, alphabet, stateNames, params) {
      return { name, nStates, V, T, alphabet, stateNames, params: params || {}, stationary: stationaryOf(T, nStates) };
    }
    function mess3(x, a) {
      const b = (1 - a) / 2, y = 1 - 2 * x;
      const ay = a * y, bx = b * x, by = b * y, ax = a * x;
      const T = [
        [[ay, bx, bx], [ax, by, bx], [ax, bx, by]],
        [[by, ax, bx], [bx, ay, bx], [bx, ax, by]],
        [[by, bx, ax], [bx, by, ax], [bx, bx, ay]]
      ];
      return finish("mess3", 3, 3, T, ["A", "B", "C"], ["S0", "S1", "S2"], { x, a });
    }
    function z1r() {
      const T = [0, 1].map(() => [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
      T[0][0][1] = 1; T[1][1][2] = 1; T[0][2][0] = 0.5; T[1][2][0] = 0.5;
      return finish("z1r", 3, 2, T, ["0", "1"], ["S0", "S1", "SR"]);
    }
    function rrxor() {
      const T = [0, 1].map(() => Array.from({length: 5}, () => new Array(5).fill(0)));
      T[0][0][1] = 0.5; T[1][0][2] = 0.5;
      T[0][1][4] = 0.5; T[1][1][3] = 0.5;
      T[0][2][3] = 0.5; T[1][2][4] = 0.5;
      T[1][3][0] = 1; T[0][4][0] = 1;
      return finish("rrxor", 5, 2, T, ["0", "1"], ["S", "0", "1", "T", "F"]);
    }
    function make(name, x, a) {
      return name === "mess3" ? mess3(x, a) : name === "z1r" ? z1r() : rrxor();
    }
    function sampleSeq(proc, len, rng) {
      const tokens = new Int32Array(len);
      const states = new Int32Array(len + 1);
      let s = 0;
      {
        let r = rng(), acc = 0;
        for (let i = 0; i < proc.nStates; i++) { acc += proc.stationary[i]; if (r < acc) { s = i; break; } }
      }
      states[0] = s;
      for (let t = 0; t < len; t++) {
        let r = rng(), acc = 0, done = false;
        for (let k = 0; k < proc.V && !done; k++)
          for (let j = 0; j < proc.nStates && !done; j++) {
            acc += proc.T[k][s][j];
            if (r < acc) { tokens[t] = k; s = j; done = true; }
          }
        if (!done) tokens[t] = proc.V - 1;
        states[t + 1] = s;
      }
      return { tokens, states };
    }
    function beliefUpdate(proc, eta, k) {
      const n = proc.nStates;
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const ei = eta[i];
        if (ei === 0) continue;
        const row = proc.T[k][i];
        for (let j = 0; j < n; j++) out[j] += ei * row[j];
      }
      let s = 0;
      for (let j = 0; j < n; j++) s += out[j];
      if (s > 0) for (let j = 0; j < n; j++) out[j] /= s;
      return [out, s];
    }
    function beliefTrajectory(proc, tokens) {
      let eta = Float64Array.from(proc.stationary);
      const out = [], probs = [];
      for (let t = 0; t < tokens.length; t++) {
        const r = beliefUpdate(proc, eta, tokens[t]);
        out.push(r[0]); probs.push(r[1]); eta = r[0];
      }
      return { beliefs: out, tokenProbs: probs };
    }
    function nextTokenDist(proc, eta) {
      const out = new Float64Array(proc.V);
      for (let k = 0; k < proc.V; k++) {
        let p = 0;
        for (let i = 0; i < proc.nStates; i++) {
          let row = 0;
          for (let j = 0; j < proc.nStates; j++) row += proc.T[k][i][j];
          p += eta[i] * row;
        }
        out[k] = p;
      }
      return out;
    }
    function emStep(Tc, seqs, nStates, V) {
      const counts = Array.from({length: V}, () => Array.from({length: nStates}, () => new Array(nStates).fill(0)));
      const pi = stationaryOf(Tc, nStates);
      let ll = 0;
      for (const seq of seqs) {
        const L = seq.length;
        const alpha = [Float64Array.from(pi)];
        for (let t = 0; t < L; t++) {
          const a = alpha[t], next = new Float64Array(nStates);
          for (let i = 0; i < nStates; i++) {
            if (a[i] === 0) continue;
            const row = Tc[seq[t]][i];
            for (let j = 0; j < nStates; j++) next[j] += a[i] * row[j];
          }
          alpha.push(next);
        }
        let P = 0;
        for (let i = 0; i < nStates; i++) P += alpha[L][i];
        if (P <= 0) continue;
        ll += Math.log(P);
        const beta = new Array(L + 1);
        beta[L] = new Float64Array(nStates).fill(1);
        for (let t = L - 1; t >= 0; t--) {
          const b = new Float64Array(nStates);
          for (let i = 0; i < nStates; i++) {
            let acc = 0;
            const row = Tc[seq[t]][i];
            for (let j = 0; j < nStates; j++) acc += row[j] * beta[t + 1][j];
            b[i] = acc;
          }
          beta[t] = b;
        }
        for (let t = 0; t < L; t++)
          for (let i = 0; i < nStates; i++) {
            const ai = alpha[t][i];
            if (ai === 0) continue;
            const row = Tc[seq[t]][i];
            for (let j = 0; j < nStates; j++)
              counts[seq[t]][i][j] += (ai * row[j] * beta[t + 1][j]) / P;
          }
      }
      const Tn = Array.from({length: V}, () => Array.from({length: nStates}, () => new Array(nStates).fill(0)));
      for (let i = 0; i < nStates; i++) {
        let rowSum = 0;
        for (let k = 0; k < V; k++) for (let j = 0; j < nStates; j++) rowSum += counts[k][i][j];
        for (let k = 0; k < V; k++)
          for (let j = 0; j < nStates; j++)
            Tn[k][i][j] = rowSum > 0 ? counts[k][i][j] / rowSum : 1 / (V * nStates);
      }
      return { T: Tn, logLik: ll };
    }
    function alignToTruth(Tl, Tt, nStates, V) {
      const perms = (xs) => xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
        perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
      let best = null, bestErr = Infinity;
      for (const p of perms(Array.from({length: nStates}, (_, i) => i))) {
        let err = 0;
        for (let k = 0; k < V; k++)
          for (let i = 0; i < nStates; i++)
            for (let j = 0; j < nStates; j++) err += Math.abs(Tl[k][p[i]][p[j]] - Tt[k][i][j]);
        if (err < bestErr) { bestErr = err; best = p; }
      }
      return Array.from({length: V}, (_, k) =>
        Array.from({length: nStates}, (_, i) =>
          Array.from({length: nStates}, (_, j) => Tl[k][best[i]][best[j]])));
    }
    // ---- §11 world zoo: 5 structurally distinct V=3 processes
    function cycle3(e) {
      const T = Array.from({length: 3}, (_, k) =>
        Array.from({length: 3}, (_, i) =>
          Array.from({length: 3}, (_, j) => (j === (i + 1) % 3 ? (k === j ? 1 - 2 * e : e) : 0))));
      return finish("cycle3", 3, 3, T, ["A", "B", "C"], ["S0", "S1", "S2"]);
    }
    function norepeat3(e) {
      const T = Array.from({length: 3}, (_, k) =>
        Array.from({length: 3}, (_, i) =>
          Array.from({length: 3}, (_, j) => (j === k ? (k === i ? 2 * e : (1 - 2 * e) / 2) : 0))));
      return finish("norepeat3", 3, 3, T, ["A", "B", "C"], ["S0", "S1", "S2"]);
    }
    function skew3(p, name) {
      const T = Array.from({length: 3}, (_, k) =>
        Array.from({length: 3}, () => Array.from({length: 3}, () => p[k] / 3)));
      return finish(name || "skew3", 3, 3, T, ["A", "B", "C"], ["S0", "S1", "S2"]);
    }
    function zooWorlds() {
      return [mess3(0.05, 0.85), cycle3(0.05), norepeat3(0.04), skew3([0.7, 0.2, 0.1]), skew3([1 / 3, 1 / 3, 1 / 3], "iid3")];
    }
    // ---- exact meta-Bayes: joint posterior P(world, state | tokens)
    function metaInit(worlds) {
      return worlds.map((p) => Float64Array.from(p.stationary, (v) => v / worlds.length));
    }
    function metaPredictive(worlds, w) {
      const V = worlds[0].V;
      const out = new Float64Array(V);
      for (let c = 0; c < worlds.length; c++) {
        const proc = worlds[c];
        for (let i = 0; i < proc.nStates; i++) {
          const wi = w[c][i];
          if (wi === 0) continue;
          for (let k = 0; k < V; k++) {
            const row = proc.T[k][i];
            let s = 0;
            for (let j = 0; j < proc.nStates; j++) s += row[j];
            out[k] += wi * s;
          }
        }
      }
      return out;
    }
    function metaUpdate(worlds, w, k) {
      let z = 0;
      for (let c = 0; c < worlds.length; c++) {
        const proc = worlds[c];
        const n = proc.nStates;
        const prev = Float64Array.from(w[c]);
        for (let j = 0; j < n; j++) {
          let nv = 0;
          for (let i = 0; i < n; i++) nv += prev[i] * proc.T[k][i][j];
          w[c][j] = nv;
          z += nv;
        }
      }
      if (z > 0) for (const wc of w) for (let j = 0; j < wc.length; j++) wc[j] /= z;
      return z;
    }
    function worldMarginal(w) {
      return Float64Array.from(w, (wc) => wc.reduce((a, b) => a + b, 0));
    }
    return { mulberry32, stationaryOf, make, sampleSeq, beliefUpdate, beliefTrajectory, nextTokenDist, emStep, alignToTruth,
             zooWorlds, metaInit, metaUpdate, metaPredictive, worldMarginal };
  }
  return beliefKitFactory;
}
;

const _beliefKit = function _beliefKit(beliefKitFactory){return(
beliefKitFactory()
)};

const _gptFactory = function _gptFactory()
{
  function gptFactory() {
    const GELU_K = Math.sqrt(2 / Math.PI);
    function geluFwd(out, inp, n) {
      for (let i = 0; i < n; i++) {
        const x = inp[i];
        out[i] = 0.5 * x * (1 + Math.tanh(GELU_K * (x + 0.044715 * x * x * x)));
      }
    }
    function geluBwd(dinp, inp, dout, n) {
      for (let i = 0; i < n; i++) {
        const x = inp[i];
        const u = GELU_K * (x + 0.044715 * x * x * x);
        const th = Math.tanh(u);
        const sech2 = 1 - th * th;
        dinp[i] += dout[i] * (0.5 * (1 + th) + 0.5 * x * sech2 * GELU_K * (1 + 3 * 0.044715 * x * x));
      }
    }
    function matmulFwd(out, inp, w, b, N, I, O) {
      for (let n = 0; n < N; n++) {
        const io = n * I, oo = n * O;
        for (let o = 0; o < O; o++) out[oo + o] = b ? b[o] : 0;
        for (let i = 0; i < I; i++) {
          const x = inp[io + i];
          if (x === 0) continue;
          const wo = i * O;
          for (let o = 0; o < O; o++) out[oo + o] += x * w[wo + o];
        }
      }
    }
    function matmulBwd(dinp, dw, db, dout, inp, w, N, I, O) {
      for (let n = 0; n < N; n++) {
        const io = n * I, oo = n * O;
        if (db) for (let o = 0; o < O; o++) db[o] += dout[oo + o];
        for (let i = 0; i < I; i++) {
          const wo = i * O;
          const x = inp[io + i];
          let acc = 0;
          for (let o = 0; o < O; o++) {
            const d = dout[oo + o];
            dw[wo + o] += x * d;
            acc += d * w[wo + o];
          }
          if (dinp) dinp[io + i] += acc;
        }
      }
    }
    function lnFwd(out, mean, rstd, inp, g, bsh, N, C) {
      for (let n = 0; n < N; n++) {
        const o = n * C;
        let mu = 0;
        for (let c = 0; c < C; c++) mu += inp[o + c];
        mu /= C;
        let vs = 0;
        for (let c = 0; c < C; c++) { const d = inp[o + c] - mu; vs += d * d; }
        const rs = 1 / Math.sqrt(vs / C + 1e-5);
        mean[n] = mu; rstd[n] = rs;
        for (let c = 0; c < C; c++) out[o + c] = g[c] * ((inp[o + c] - mu) * rs) + bsh[c];
      }
    }
    function lnBwd(dinp, dg, db, dout, inp, mean, rstd, g, N, C) {
      for (let n = 0; n < N; n++) {
        const o = n * C, mu = mean[n], rs = rstd[n];
        let dnm = 0, dnnm = 0;
        for (let c = 0; c < C; c++) {
          const xhat = (inp[o + c] - mu) * rs;
          const dnorm = dout[o + c] * g[c];
          dnm += dnorm;
          dnnm += dnorm * xhat;
          dg[c] += dout[o + c] * xhat;
          db[c] += dout[o + c];
        }
        dnm /= C; dnnm /= C;
        for (let c = 0; c < C; c++) {
          const xhat = (inp[o + c] - mu) * rs;
          const dnorm = dout[o + c] * g[c];
          dinp[o + c] += rs * (dnorm - dnm - xhat * dnnm);
        }
      }
    }
    function attnFwd(atty, att, qkv, B, T, C, H) {
      const hs = C / H, scale = 1 / Math.sqrt(hs);
      for (let b = 0; b < B; b++)
        for (let h = 0; h < H; h++) {
          const attBase = (b * H + h) * T * T;
          for (let t = 0; t < T; t++) {
            const qo = (b * T + t) * 3 * C + h * hs;
            let maxv = -Infinity;
            const row = attBase + t * T;
            for (let t2 = 0; t2 <= t; t2++) {
              const ko = (b * T + t2) * 3 * C + C + h * hs;
              let s = 0;
              for (let i = 0; i < hs; i++) s += qkv[qo + i] * qkv[ko + i];
              s *= scale;
              att[row + t2] = s;
              if (s > maxv) maxv = s;
            }
            let sum = 0;
            for (let t2 = 0; t2 <= t; t2++) { const e = Math.exp(att[row + t2] - maxv); att[row + t2] = e; sum += e; }
            for (let t2 = 0; t2 <= t; t2++) att[row + t2] /= sum;
            for (let t2 = t + 1; t2 < T; t2++) att[row + t2] = 0;
            const yo = (b * T + t) * C + h * hs;
            for (let i = 0; i < hs; i++) atty[yo + i] = 0;
            for (let t2 = 0; t2 <= t; t2++) {
              const a = att[row + t2];
              if (a === 0) continue;
              const vo = (b * T + t2) * 3 * C + 2 * C + h * hs;
              for (let i = 0; i < hs; i++) atty[yo + i] += a * qkv[vo + i];
            }
          }
        }
    }
    function attnBwd(dqkv, datty, att, qkv, B, T, C, H) {
      const hs = C / H, scale = 1 / Math.sqrt(hs);
      const datt = new Float64Array(T);
      for (let b = 0; b < B; b++)
        for (let h = 0; h < H; h++) {
          const attBase = (b * H + h) * T * T;
          for (let t = 0; t < T; t++) {
            const row = attBase + t * T;
            const yo = (b * T + t) * C + h * hs;
            for (let t2 = 0; t2 <= t; t2++) {
              const vo = (b * T + t2) * 3 * C + 2 * C + h * hs;
              let da = 0;
              const a = att[row + t2];
              for (let i = 0; i < hs; i++) {
                da += datty[yo + i] * qkv[vo + i];
                dqkv[vo + i] += a * datty[yo + i];
              }
              datt[t2] = da;
            }
            let dot = 0;
            for (let t2 = 0; t2 <= t; t2++) dot += att[row + t2] * datt[t2];
            const qo = (b * T + t) * 3 * C + h * hs;
            for (let t2 = 0; t2 <= t; t2++) {
              const ds = att[row + t2] * (datt[t2] - dot) * scale;
              if (ds === 0) continue;
              const ko = (b * T + t2) * 3 * C + C + h * hs;
              for (let i = 0; i < hs; i++) {
                dqkv[qo + i] += ds * qkv[ko + i];
                dqkv[ko + i] += ds * qkv[qo + i];
              }
            }
          }
        }
    }
    class GPT {
      constructor(cfg, rng) {
        this.cfg = cfg;
        this.params = {};
        this.order = [];
        this.act = {};
        this.step = 0;
        const { V, T, C, L, F } = cfg;
        const init = (name, size, std) => {
          const p = { name, w: new Float64Array(size), g: new Float64Array(size), m: new Float64Array(size), v: new Float64Array(size) };
          if (std > 0)
            for (let i = 0; i < size; i++) {
              const u1 = Math.max(rng(), 1e-12), u2 = rng();
              p.w[i] = std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            }
          this.params[name] = p;
          this.order.push(p);
          return p;
        };
        const ones = (name, size) => { const p = init(name, size, 0); p.w.fill(1); return p; };
        init("wte", V * C, 0.02);
        init("wpe", T * C, 0.02);
        for (let l = 0; l < L; l++) {
          ones("l" + l + ".ln1g", C); init("l" + l + ".ln1b", C, 0);
          init("l" + l + ".wqkv", C * 3 * C, 0.02); init("l" + l + ".bqkv", 3 * C, 0);
          init("l" + l + ".wo", C * C, 0.02 / Math.sqrt(2 * L)); init("l" + l + ".bo", C, 0);
          ones("l" + l + ".ln2g", C); init("l" + l + ".ln2b", C, 0);
          init("l" + l + ".wfc", C * F, 0.02); init("l" + l + ".bfc", F, 0);
          init("l" + l + ".wproj", F * C, 0.02 / Math.sqrt(2 * L)); init("l" + l + ".bproj", C, 0);
        }
        ones("lnfg", C); init("lnfb", C, 0);
        init("wu", C * V, 0.02); init("bu", V, 0);
        this.allocActs();
      }
      allocActs() {
        const { V, T, C, L, F, B, H } = this.cfg;
        const N = B * T;
        const a = this.act;
        const mk = (name, size) => (a[name] = new Float64Array(size));
        mk("h0", N * C);
        for (let l = 0; l < L; l++) {
          mk("l" + l + ".ln1out", N * C); mk("l" + l + ".ln1mean", N); mk("l" + l + ".ln1rstd", N);
          mk("l" + l + ".qkv", N * 3 * C); mk("l" + l + ".att", B * H * T * T); mk("l" + l + ".atty", N * C);
          mk("l" + l + ".attproj", N * C); mk("l" + l + ".res2", N * C);
          mk("l" + l + ".ln2out", N * C); mk("l" + l + ".ln2mean", N); mk("l" + l + ".ln2rstd", N);
          mk("l" + l + ".fc", N * F); mk("l" + l + ".gelu", N * F); mk("l" + l + ".mlpproj", N * C);
          mk("l" + l + ".res3", N * C);
          mk("l" + l + ".d.ln1out", N * C); mk("l" + l + ".d.qkv", N * 3 * C); mk("l" + l + ".d.atty", N * C);
          mk("l" + l + ".d.attproj", N * C); mk("l" + l + ".d.res2", N * C);
          mk("l" + l + ".d.ln2out", N * C); mk("l" + l + ".d.fc", N * F); mk("l" + l + ".d.gelu", N * F);
          mk("l" + l + ".d.mlpproj", N * C); mk("l" + l + ".d.res3", N * C);
        }
        mk("lnfout", N * C); mk("lnfmean", N); mk("lnfrstd", N);
        mk("logits", N * V); mk("probs", N * V);
        mk("d.h0", N * C); mk("d.lnfout", N * C); mk("d.logits", N * V);
      }
      resIn(l) { return l === 0 ? this.act.h0 : this.act["l" + (l - 1) + ".res3"]; }
      forward(tokens, targets) {
        const { V, T, C, L, F, B, H } = this.cfg;
        const N = B * T;
        const a = this.act, P = this.params;
        for (let b = 0; b < B; b++)
          for (let t = 0; t < T; t++) {
            const o = (b * T + t) * C, tok = tokens[b * T + t];
            for (let c = 0; c < C; c++) a.h0[o + c] = P.wte.w[tok * C + c] + P.wpe.w[t * C + c];
          }
        for (let l = 0; l < L; l++) {
          const inp = this.resIn(l);
          lnFwd(a["l" + l + ".ln1out"], a["l" + l + ".ln1mean"], a["l" + l + ".ln1rstd"], inp, P["l" + l + ".ln1g"].w, P["l" + l + ".ln1b"].w, N, C);
          matmulFwd(a["l" + l + ".qkv"], a["l" + l + ".ln1out"], P["l" + l + ".wqkv"].w, P["l" + l + ".bqkv"].w, N, C, 3 * C);
          attnFwd(a["l" + l + ".atty"], a["l" + l + ".att"], a["l" + l + ".qkv"], B, T, C, H);
          matmulFwd(a["l" + l + ".attproj"], a["l" + l + ".atty"], P["l" + l + ".wo"].w, P["l" + l + ".bo"].w, N, C, C);
          const res2 = a["l" + l + ".res2"];
          for (let i = 0; i < N * C; i++) res2[i] = inp[i] + a["l" + l + ".attproj"][i];
          lnFwd(a["l" + l + ".ln2out"], a["l" + l + ".ln2mean"], a["l" + l + ".ln2rstd"], res2, P["l" + l + ".ln2g"].w, P["l" + l + ".ln2b"].w, N, C);
          matmulFwd(a["l" + l + ".fc"], a["l" + l + ".ln2out"], P["l" + l + ".wfc"].w, P["l" + l + ".bfc"].w, N, C, F);
          geluFwd(a["l" + l + ".gelu"], a["l" + l + ".fc"], N * F);
          matmulFwd(a["l" + l + ".mlpproj"], a["l" + l + ".gelu"], P["l" + l + ".wproj"].w, P["l" + l + ".bproj"].w, N, F, C);
          const res3 = a["l" + l + ".res3"];
          for (let i = 0; i < N * C; i++) res3[i] = res2[i] + a["l" + l + ".mlpproj"][i];
        }
        const resFinal = a["l" + (L - 1) + ".res3"];
        lnFwd(a.lnfout, a.lnfmean, a.lnfrstd, resFinal, P.lnfg.w, P.lnfb.w, N, C);
        matmulFwd(a.logits, a.lnfout, P.wu.w, P.bu.w, N, C, V);
        let loss = 0;
        for (let n = 0; n < N; n++) {
          const o = n * V;
          let maxv = -Infinity;
          for (let v = 0; v < V; v++) if (a.logits[o + v] > maxv) maxv = a.logits[o + v];
          let sum = 0;
          for (let v = 0; v < V; v++) { const e = Math.exp(a.logits[o + v] - maxv); a.probs[o + v] = e; sum += e; }
          for (let v = 0; v < V; v++) a.probs[o + v] /= sum;
          if (targets) loss += -Math.log(Math.max(a.probs[o + targets[n]], 1e-12));
        }
        return targets ? loss / N : 0;
      }
      zeroGrads() {
        for (const p of this.order) p.g.fill(0);
        const a = this.act;
        for (const k of Object.keys(a)) if (k.includes("d.")) a[k].fill(0);
      }
      backward(tokens, targets) {
        const { V, T, C, L, F, B, H } = this.cfg;
        const N = B * T;
        const a = this.act, P = this.params;
        for (let n = 0; n < N; n++) {
          const o = n * V, tgt = targets[n];
          for (let v = 0; v < V; v++) a["d.logits"][o + v] = (a.probs[o + v] - (v === tgt ? 1 : 0)) / N;
        }
        matmulBwd(a["d.lnfout"], P.wu.g, P.bu.g, a["d.logits"], a.lnfout, P.wu.w, N, C, V);
        const resFinal = a["l" + (L - 1) + ".res3"];
        const dResFinal = a["l" + (L - 1) + ".d.res3"];
        lnBwd(dResFinal, P.lnfg.g, P.lnfb.g, a["d.lnfout"], resFinal, a.lnfmean, a.lnfrstd, P.lnfg.w, N, C);
        for (let l = L - 1; l >= 0; l--) {
          const inp = this.resIn(l);
          const dinp = l === 0 ? a["d.h0"] : a["l" + (l - 1) + ".d.res3"];
          const dres3 = a["l" + l + ".d.res3"];
          const dres2 = a["l" + l + ".d.res2"];
          for (let i = 0; i < N * C; i++) { dres2[i] += dres3[i]; a["l" + l + ".d.mlpproj"][i] += dres3[i]; }
          matmulBwd(a["l" + l + ".d.gelu"], P["l" + l + ".wproj"].g, P["l" + l + ".bproj"].g, a["l" + l + ".d.mlpproj"], a["l" + l + ".gelu"], P["l" + l + ".wproj"].w, N, F, C);
          geluBwd(a["l" + l + ".d.fc"], a["l" + l + ".fc"], a["l" + l + ".d.gelu"], N * F);
          matmulBwd(a["l" + l + ".d.ln2out"], P["l" + l + ".wfc"].g, P["l" + l + ".bfc"].g, a["l" + l + ".d.fc"], a["l" + l + ".ln2out"], P["l" + l + ".wfc"].w, N, C, F);
          lnBwd(dres2, P["l" + l + ".ln2g"].g, P["l" + l + ".ln2b"].g, a["l" + l + ".d.ln2out"], a["l" + l + ".res2"], a["l" + l + ".ln2mean"], a["l" + l + ".ln2rstd"], P["l" + l + ".ln2g"].w, N, C);
          for (let i = 0; i < N * C; i++) { dinp[i] += dres2[i]; a["l" + l + ".d.attproj"][i] += dres2[i]; }
          matmulBwd(a["l" + l + ".d.atty"], P["l" + l + ".wo"].g, P["l" + l + ".bo"].g, a["l" + l + ".d.attproj"], a["l" + l + ".atty"], P["l" + l + ".wo"].w, N, C, C);
          attnBwd(a["l" + l + ".d.qkv"], a["l" + l + ".d.atty"], a["l" + l + ".att"], a["l" + l + ".qkv"], B, T, C, H);
          matmulBwd(a["l" + l + ".d.ln1out"], P["l" + l + ".wqkv"].g, P["l" + l + ".bqkv"].g, a["l" + l + ".d.qkv"], a["l" + l + ".ln1out"], P["l" + l + ".wqkv"].w, N, C, 3 * C);
          lnBwd(dinp, P["l" + l + ".ln1g"].g, P["l" + l + ".ln1b"].g, a["l" + l + ".d.ln1out"], inp, a["l" + l + ".ln1mean"], a["l" + l + ".ln1rstd"], P["l" + l + ".ln1g"].w, N, C);
        }
        for (let b = 0; b < B; b++)
          for (let t = 0; t < T; t++) {
            const o = (b * T + t) * C, tok = tokens[b * T + t];
            for (let c = 0; c < C; c++) {
              P.wte.g[tok * C + c] += a["d.h0"][o + c];
              P.wpe.g[t * C + c] += a["d.h0"][o + c];
            }
          }
      }
      adam(lr, beta1, beta2, eps) {
        beta1 = beta1 === undefined ? 0.9 : beta1;
        beta2 = beta2 === undefined ? 0.999 : beta2;
        eps = eps === undefined ? 1e-8 : eps;
        this.step++;
        const bc1 = 1 - Math.pow(beta1, this.step);
        const bc2 = 1 - Math.pow(beta2, this.step);
        for (const p of this.order) {
          const { w, g, m, v } = p;
          for (let i = 0; i < w.length; i++) {
            m[i] = beta1 * m[i] + (1 - beta1) * g[i];
            v[i] = beta2 * v[i] + (1 - beta2) * g[i] * g[i];
            w[i] -= lr * ((m[i] / bc1) / (Math.sqrt(v[i] / bc2) + eps));
          }
        }
      }
      weightCount() { return this.order.reduce((a2, p) => a2 + p.w.length, 0); }
      getWeights(out) {
        const flat = out || new Float64Array(this.weightCount());
        let off = 0;
        for (const p of this.order) { flat.set(p.w, off); off += p.w.length; }
        return flat;
      }
      setWeights(flat) {
        let off = 0;
        for (const p of this.order) { p.w.set(flat.subarray(off, off + p.w.length)); off += p.w.length; }
      }
    }
    // total learnable parameters for a config, without building a model
    const countParams = ({ V, T, C, L, F }) =>
      V * C + T * C +
      L * (2 * C + C * 3 * C + 3 * C + C * C + C + 2 * C + C * F + F + F * C + C) +
      2 * C + C * V + V;
    return { GPT, countParams };
  }
  return gptFactory;
}
;

const _gptKit = function _gptKit(gptFactory){return(
gptFactory()
)};

const _probeKit = function _probeKit()
{
  function solveRidge(X, Y, N, D, K, lambda) {
    lambda = lambda === undefined ? 1e-6 : lambda;
    const A = new Float64Array(D * D);
    const B = new Float64Array(D * K);
    for (let n = 0; n < N; n++) {
      const xo = n * D, yo = n * K;
      for (let i = 0; i < D; i++) {
        const xi = X[xo + i];
        if (xi === 0) continue;
        for (let j = i; j < D; j++) A[i * D + j] += xi * X[xo + j];
        for (let k = 0; k < K; k++) B[i * K + k] += xi * Y[yo + k];
      }
    }
    for (let i = 0; i < D; i++) {
      A[i * D + i] += lambda;
      for (let j = 0; j < i; j++) A[i * D + j] = A[j * D + i];
    }
    const idx = Array.from({length: D}, (_, i) => i);
    for (let col = 0; col < D; col++) {
      let piv = col;
      for (let r = col + 1; r < D; r++) if (Math.abs(A[idx[r] * D + col]) > Math.abs(A[idx[piv] * D + col])) piv = r;
      const tmp = idx[col]; idx[col] = idx[piv]; idx[piv] = tmp;
      const prow = idx[col];
      const pval = A[prow * D + col];
      for (let r = col + 1; r < D; r++) {
        const row = idx[r];
        const f = A[row * D + col] / pval;
        if (f === 0) continue;
        for (let j = col; j < D; j++) A[row * D + j] -= f * A[prow * D + j];
        for (let k = 0; k < K; k++) B[row * K + k] -= f * B[prow * K + k];
      }
    }
    const W = new Float64Array(D * K);
    for (let col = D - 1; col >= 0; col--) {
      const row = idx[col];
      for (let k = 0; k < K; k++) {
        let acc = B[row * K + k];
        for (let j = col + 1; j < D; j++) acc -= A[row * D + j] * W[j * K + k];
        W[col * K + k] = acc / A[row * D + col];
      }
    }
    return W;
  }
  function predict(X, W, N, D, K) {
    const out = new Float64Array(N * K);
    for (let n = 0; n < N; n++)
      for (let i = 0; i < D; i++) {
        const xi = X[n * D + i];
        if (xi === 0) continue;
        for (let k = 0; k < K; k++) out[n * K + k] += xi * W[i * K + k];
      }
    return out;
  }
  function r2(Y, Yhat, N, K) {
    const out = [];
    for (let k = 0; k < K; k++) {
      let mean = 0;
      for (let n = 0; n < N; n++) mean += Y[n * K + k];
      mean /= N;
      let ssRes = 0, ssTot = 0;
      for (let n = 0; n < N; n++) {
        const d = Y[n * K + k] - Yhat[n * K + k];
        ssRes += d * d;
        const e = Y[n * K + k] - mean;
        ssTot += e * e;
      }
      out.push(1 - ssRes / Math.max(ssTot, 1e-12));
    }
    return out;
  }
  // collect residual activations + true beliefs. layer: 1..L (res3 of block layer-1)
  function collect(model, cfg, seqs, nSeq, layer) {
    const D = cfg.C + 1, K = 3;
    const X = new Float64Array(nSeq * cfg.T * D);
    const Y = new Float64Array(nSeq * cfg.T * K);
    const tokens = new Int32Array(cfg.B * cfg.T);
    let n = 0;
    const res = model.act["l" + (layer - 1) + ".res3"];
    for (let s = 0; s + cfg.B <= nSeq; s += cfg.B) {
      for (let b = 0; b < cfg.B; b++) tokens.set(seqs[s + b].tokens.subarray(0, cfg.T), b * cfg.T);
      model.forward(tokens, null);
      for (let b = 0; b < cfg.B; b++) {
        const beliefs = seqs[s + b].beliefs;
        for (let t = 0; t < cfg.T; t++) {
          const ro = (b * cfg.T + t) * cfg.C;
          for (let c = 0; c < cfg.C; c++) X[n * D + c] = res[ro + c];
          X[n * D + cfg.C] = 1;
          for (let k = 0; k < K; k++) Y[n * K + k] = beliefs[t][k] || 0;
          n++;
        }
      }
    }
    return { X, Y, N: n, D, K };
  }
  // one forward pass, residuals gathered from SEVERAL activation buffers at once
  function collectStages(model, cfg, seqs, nSeq, bufs) {
    const D = cfg.C + 1, K = 3;
    const Xs = {};
    for (const b of bufs) Xs[b] = new Float64Array(nSeq * cfg.T * D);
    const Y = new Float64Array(nSeq * cfg.T * K);
    const tokens = new Int32Array(cfg.B * cfg.T);
    let n = 0;
    for (let s = 0; s + cfg.B <= nSeq; s += cfg.B) {
      for (let b = 0; b < cfg.B; b++) tokens.set(seqs[s + b].tokens.subarray(0, cfg.T), b * cfg.T);
      model.forward(tokens, null);
      for (let b = 0; b < cfg.B; b++) {
        const beliefs = seqs[s + b].beliefs;
        for (let t = 0; t < cfg.T; t++) {
          const ro = (b * cfg.T + t) * cfg.C;
          for (const buf of bufs) {
            const src = model.act[buf];
            for (let c = 0; c < cfg.C; c++) Xs[buf][n * D + c] = src[ro + c];
            Xs[buf][n * D + cfg.C] = 1;
          }
          for (let k = 0; k < K; k++) Y[n * K + k] = beliefs[t][k] || 0;
          n++;
        }
      }
    }
    return { Xs, Y, N: n, D, K };
  }
  return { solveRidge, predict, r2, collect, collectStages };
}
;

const _renderKit = function _renderKit(htl)
{
  const TOKEN_COLORS = ["#e69f00", "#56b4e9", "#009e73"];
  const beliefColor = (eta) => {
    const c = (p) => Math.round(30 + 215 * Math.min(1, Math.max(0, p)));
    return "rgb(" + c(eta[0]) + "," + c(eta[1] || 0) + "," + c(eta[2] || 0) + ")";
  };
  const stateColor = (proc, i) => {
    const eta = new Array(proc.nStates).fill(0);
    eta[i] = 1;
    if (proc.nStates <= 3) return beliefColor(eta);
    const palette = ["#5a5a5a", "#dc2828", "#2850e6", "#e69f00", "#009e73"];
    return palette[i % 5];
  };
  // barycentric for <=3 states; fixed seeded projection otherwise
  const projCache = new Map();
  const projectEta = (proc, eta) => {
    if (proc.nStates <= 3) {
      const V0 = [0.08, 0.90], V1 = [0.92, 0.90], V2 = [0.50, 0.9 - 0.84 * Math.sin(Math.PI / 3)];
      const p0 = eta[0], p1 = eta[1] || 0, p2 = eta[2] || 0;
      return [p0 * V0[0] + p1 * V1[0] + p2 * V2[0], p0 * V0[1] + p1 * V1[1] + p2 * V2[1]];
    }
    let uv = projCache.get(proc.nStates);
    if (!uv) {
      let s = 12345;
      const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
      const u = Array.from({length: proc.nStates}, rand);
      const v = Array.from({length: proc.nStates}, rand);
      const norm = (a) => { const m = Math.sqrt(a.reduce((x, y) => x + y * y, 0)); return a.map((y) => y / m); };
      const un = norm(u);
      const d = v.reduce((a, y, i) => a + y * un[i], 0);
      const vn = norm(v.map((y, i) => y - d * un[i]));
      uv = { u: un, v: vn };
      projCache.set(proc.nStates, uv);
    }
    let x = 0, y = 0;
    for (let i = 0; i < proc.nStates; i++) { x += (eta[i] || 0) * uv.u[i]; y += (eta[i] || 0) * uv.v[i]; }
    return [0.5 + x * 0.8, 0.5 + y * 0.8];
  };
  const simplexRedraw = (canvas, proc, pts) => {
    const ctx = canvas.getContext("2d");
    const dpr = canvas._dpr || 1;
    const w = canvas._cssW || canvas.width, h = canvas._cssH || canvas.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (proc.nStates <= 3) {
      ctx.strokeStyle = "#ddd";
      ctx.beginPath();
      const corners = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]];
      corners.forEach((c, i) => {
        const [x, y] = projectEta(proc, c);
        if (i === 0) ctx.moveTo(x * w, y * h); else ctx.lineTo(x * w, y * h);
      });
      ctx.stroke();
    }
    for (const p of pts) {
      const [x, y] = p.eta ? projectEta(proc, p.eta) : [p.x, p.y];
      ctx.globalAlpha = p.a || 1;
      ctx.beginPath();
      ctx.arc(x * w, y * h, p.r || 2, 0, 7);
      if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = p.color; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };
  const simplexCanvas = (proc, pts, opts) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = htl.html`<canvas width=${opts.width * dpr} height=${opts.height * dpr} style="max-width:100%;width:${opts.width}px;border:1px solid #eee;border-radius:4px;">`;
    canvas._dpr = dpr; canvas._cssW = opts.width; canvas._cssH = opts.height;
    simplexRedraw(canvas, proc, pts);
    return canvas;
  };
  const transitionSVG = (proc) => {
    const n = proc.nStates, R = 70, cx = 100, cy = 95;
    const pos = Array.from({length: n}, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    const edges = [];
    for (let k = 0; k < proc.V; k++)
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const p = proc.T[k][i][j];
          if (p < 0.02) continue;
          const [x1, y1] = pos[i], [x2, y2] = pos[j];
          const col = TOKEN_COLORS[k % 3];
          if (i === j) {
            edges.push(htl.svg`<circle cx=${x1 + (x1 - cx) * 0.28} cy=${y1 + (y1 - cy) * 0.28} r="12" fill="none" stroke=${col} stroke-width=${1 + 4 * p} opacity="0.75"/>`);
          } else {
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18, my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
            edges.push(htl.svg`<path d=${"M" + x1 + " " + y1 + " Q" + mx + " " + my + " " + x2 + " " + y2} fill="none" stroke=${col} stroke-width=${1 + 4 * p} opacity="0.75" marker-end="url(#bsg-arrow)"/>`);
          }
        }
    const nodes = pos.map(([x, y], i) => htl.svg`<g>
      <circle cx=${x} cy=${y} r="14" fill=${stateColor(proc, i)} stroke="#666"/>
      <text x=${x} y=${y + 4} text-anchor="middle" font-size="10" fill="#fff">${proc.stateNames[i]}</text>
    </g>`);
    const legend = Array.from({length: proc.V}, (_, k) => htl.svg`<g transform=${"translate(" + (8 + k * 46) + ",190)"}>
      <rect width="10" height="10" fill=${TOKEN_COLORS[k % 3]}/>
      <text x="14" y="9" font-size="10" fill="#888">${proc.alphabet[k]}</text>
    </g>`);
    return htl.svg`<svg width="205" height="205" viewBox="0 0 205 205" style="overflow:visible;">
      <defs><marker id="bsg-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#888"/></marker></defs>
      ${edges}${nodes}${legend}
    </svg>`;
  };
  const heatmaps = (T, proc) => {
    return htl.html`<div style="display:flex;gap:8px;">${T.map((Tk, k) => htl.html`<div>
      <div style="font-size:10px;text-align:center;color:${TOKEN_COLORS[k % 3]};">emit ${proc.alphabet[k]}</div>
      <table style="border-collapse:collapse;">${Tk.map((row) => htl.html`<tr>${row.map((v) => {
        const bg = "rgba(33,110,243," + Math.min(1, v).toFixed(3) + ")";
        return htl.html`<td style="width:26px;height:22px;font-size:9px;text-align:center;background:${bg};color:${v > 0.5 ? "#fff" : "#333"};border:1px solid #eee;">${v.toFixed(2)}</td>`;
      })}</tr>`)}</table>
    </div>`)}</div>`;
  };
  const lineChart = (xy, opts) => {
    const w = opts.width, h = opts.height;
    const canvas = htl.html`<canvas width=${w} height=${h} style="max-width:100%;border:1px solid #eee;border-radius:4px;">`;
    const ctx = canvas.getContext("2d");
    if (!xy.length) return canvas;
    const xs = xy.map((d) => d[0]), ys = xy.map((d) => d[1]);
    const hys = (opts.hlines || []).map((l) => l.y);
    const xmin = Math.min(...xs), xmax = Math.max(...xs, xmin + 1);
    const ymin = opts.ymin !== undefined ? opts.ymin : Math.min(...ys, ...hys);
    const ymax = Math.max(...ys, ...hys) + 0.02;
    const X = (x) => 4 + (w - 8) * (x - xmin) / (xmax - xmin);
    const Y = (y) => h - 4 - (h - 8) * (y - ymin) / (ymax - ymin);
    for (const l of opts.hlines || []) {
      ctx.strokeStyle = l.color;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(4, Y(l.y)); ctx.lineTo(w - 4, Y(l.y)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = l.color;
      ctx.font = "10px sans-serif";
      ctx.fillText(l.label, 8, Y(l.y) - 3);
    }
    ctx.strokeStyle = "#e4573d";
    ctx.beginPath();
    xy.forEach((d, i) => { if (i === 0) ctx.moveTo(X(d[0]), Y(d[1])); else ctx.lineTo(X(d[0]), Y(d[1])); });
    ctx.stroke();
    return canvas;
  };
  const bars = (proc, dist, ghost, label) => {
    return htl.html`<div style="width:250px;">
      <div style="font-size:10px;color:#888;">${label}</div>
      ${Array.from({length: proc.V}, (_, k) => htl.html`<div style="display:flex;align-items:center;gap:4px;font-size:11px;">
        <span style="width:14px;font-family:ui-monospace,monospace;">${proc.alphabet[k]}</span>
        <div style="flex:1;height:13px;background:#f2f2f2;position:relative;border-radius:2px;">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${(dist[k] * 100).toFixed(1)}%;background:${TOKEN_COLORS[k % 3]};border-radius:2px;"></div>
          <div style="position:absolute;top:-1px;bottom:-1px;left:${(ghost[k] * 100).toFixed(1)}%;width:2px;background:#00000088;"></div>
        </div>
        <span style="width:38px;text-align:right;">${(dist[k] * 100).toFixed(1)}%</span>
      </div>`)}
    </div>`;
  };
  return { TOKEN_COLORS, beliefColor, stateColor, projectEta, simplexCanvas, simplexRedraw, transitionSVG, heatmaps, lineChart, bars };
}
;

const _process = function _process(beliefKit, processChoice, mess3x, mess3alpha){return(
beliefKit.make(processChoice, mess3x, mess3alpha)
)};

const _trainCfg = function _trainCfg(process){return(
// mess3 gets the wide config: C=64 halves the probe blur (fractal crispness is
// representation-precision-bound, not training-time-bound — see probe_crispness.ts)
process.V === 3
  ? {V: 3, T: 16, C: 64, H: 4, L: 2, F: 256, B: 32}
  : {V: process.V, T: 12, C: 32, H: 4, L: 2, F: 128, B: 32}
)};

const _evalSet = function _evalSet(beliefKit, process, trainCfg)
{
  const rng = beliefKit.mulberry32(999);
  const seqs = [];
  let optimalLoss = 0, count = 0;
  for (let s = 0; s < 384; s++) {
    const { tokens } = beliefKit.sampleSeq(process, trainCfg.T + 1, rng);
    const { beliefs } = beliefKit.beliefTrajectory(process, tokens.subarray(0, trainCfg.T));
    seqs.push({ tokens, beliefs });
    for (let t = 0; t < trainCfg.T; t++) {
      const p = beliefKit.nextTokenDist(process, beliefs[t])[tokens[t + 1]];
      optimalLoss += -Math.log(Math.max(p, 1e-12));
      count++;
    }
  }
  let iidLoss = 0;
  const d = beliefKit.nextTokenDist(process, Float64Array.from(process.stationary));
  for (const p of d) if (p > 0) iidLoss += -p * Math.log(p);
  return { seqs, optimalLoss: optimalLoss / count, iidLoss };
}
;

// per-(process,cfg) training state; survives toggling but not page reload
const _trainState = function _trainState(){return(
new Map()
)};

const _modelBox = function _modelBox(){return(
Object.assign(new window.EventTarget(), { payload: null, probeW: null })
)};

const _workerSource = function _workerSource(beliefKitFactory, gptFactory)
{
  const main = function () {
    const kit = beliefKitFactory();
    const gpt = gptFactory();
    let model = null, proc = null, zoo = null, cfg = null, rng = null, ema = -1;
    self.onmessage = (e) => {
      const m = e.data;
      if (m.type === "init") {
        cfg = m.cfg;
        if (m.procName === "zoo") zoo = kit.zooWorlds();
        else proc = kit.make(m.procName, m.px, m.pa);
        rng = kit.mulberry32(m.seed);
        model = new gpt.GPT(cfg, kit.mulberry32(0));
        model.setWeights(new Float64Array(m.weights));
        model.step = m.step || 0;
        self.postMessage({ type: "ready" });
      } else if (m.type === "round") {
        model.setWeights(new Float64Array(m.weights));
        const tokens = new Int32Array(cfg.B * cfg.T);
        const targets = new Int32Array(cfg.B * cfg.T);
        for (let s = 0; s < m.steps; s++) {
          for (let b = 0; b < cfg.B; b++) {
            const p = zoo ? zoo[Math.floor(rng() * zoo.length)] : proc;
            const seq = kit.sampleSeq(p, cfg.T + 1, rng).tokens;
            for (let t = 0; t < cfg.T; t++) {
              tokens[b * cfg.T + t] = seq[t];
              targets[b * cfg.T + t] = seq[t + 1];
            }
          }
          model.zeroGrads();
          const loss = model.forward(tokens, targets);
          model.backward(tokens, targets);
          model.adam(m.lr);
          ema = ema < 0 ? loss : 0.98 * ema + 0.02 * loss;
        }
        const w = model.getWeights();
        self.postMessage({ type: "weights", weights: w.buffer, ema }, [w.buffer]);
      }
    };
  };
  return beliefKitFactory.toString() + "\n" + gptFactory.toString() + "\n(" + main.toString() + ")();";
}
;

const _trainSnapshot = async function* _trainSnapshot(training, nWorkers, trainState, process, trainCfg, workerSource, gptKit, beliefKit, modelBox, invalidation)
{
  const key = process.name + "|" + JSON.stringify(trainCfg);
  let st = trainState.get(key);
  if (!st) {
    st = { weights: null, step: 0, lossHist: [], ckpts: [], nextCkpt: 50 };
    trainState.set(key, st);
  }
  const publish = () => {
    if (st.weights) {
      modelBox.payload = { weights: st.weights, cfg: trainCfg, step: st.step };
      modelBox.dispatchEvent(new window.Event("update"));
    }
  };
  publish();
  if (!training) {
    yield { st, running: false };
    return;
  }
  // seed weights
  if (!st.weights) {
    const m0 = new gptKit.GPT(trainCfg, beliefKit.mulberry32(7));
    st.weights = m0.getWeights();
  }
  // spawn workers from a blob of the factory sources (postMessage only; no SAB)
  const url = window.URL.createObjectURL(new window.Blob([workerSource], { type: "application/javascript" }));
  const workers = [];
  let stopped = false;
  invalidation.then(() => {
    stopped = true;
    workers.forEach((w) => w.worker.terminate());
    window.URL.revokeObjectURL(url);
  });
  for (let i = 0; i < nWorkers; i++) {
    const worker = new window.Worker(url);
    const queue = [], backlog = [];
    worker.onmessage = (e) => {
      const res = queue.shift();
      if (res) res(e.data); else backlog.push(e.data);
    };
    const next = () => backlog.length ? Promise.resolve(backlog.shift()) : new Promise((res) => queue.push(res));
    workers.push({ worker, next });
    worker.postMessage({
      type: "init", cfg: trainCfg, procName: process.name,
      px: process.params.x || 0, pa: process.params.a || 0,
      seed: 1000 + i * 7919 + st.step, step: st.step,
      weights: st.weights.buffer.slice(0)
    });
  }
  await Promise.all(workers.map((w) => w.next()));
  yield { st, running: true };
  const K = 50;
  const nW = st.weights.length;
  // fixed seeded 2D projection of weight space for the fusion figure (~2nW mults
  // per worker per round — negligible next to K training steps)
  const rpr = beliefKit.mulberry32(31337);
  const ru = new Float64Array(nW), rv = new Float64Array(nW);
  for (let i = 0; i < nW; i++) { ru[i] = rpr() - 0.5; rv[i] = rpr() - 0.5; }
  if (!st.fusionHist) st.fusionHist = [];
  let round = 0;
  while (!stopped && st.step < 60000) {
    round++;
    const decay = Math.max(0.1, 0.5 * (1 + Math.cos(Math.PI * Math.min(1, st.step / 12000))));
    const lr = 1e-3 * Math.min(1, (st.step + K) / 100) * decay;
    for (const w of workers) {
      const copy = st.weights.buffer.slice(0);
      w.worker.postMessage({ type: "round", weights: copy, steps: K, lr }, [copy]);
    }
    const results = await Promise.all(workers.map((w) => w.next()));
    if (stopped) return;
    const avg = new Float64Array(nW);
    const projPts = [];
    for (const r of results) {
      const wv = new Float64Array(r.weights);
      let px = 0, py = 0;
      for (let i = 0; i < nW; i++) { avg[i] += wv[i]; px += wv[i] * ru[i]; py += wv[i] * rv[i]; }
      projPts.push([px, py]);
    }
    for (let i = 0; i < nW; i++) avg[i] /= results.length;
    st.weights = avg;
    st.step += K;
    const ema = results.reduce((a, r) => a + r.ema, 0) / results.length;
    st.lossHist.push([st.step, ema]);
    if (st.lossHist.length > 600) st.lossHist.splice(0, st.lossHist.length - 600);
    let ax = 0, ay = 0;
    for (const p of projPts) { ax += p[0]; ay += p[1]; }
    st.fusionHist.push({ step: st.step, pts: projPts, avg: [ax / projPts.length, ay / projPts.length], emas: results.map((r) => r.ema) });
    if (st.fusionHist.length > 60) st.fusionHist.splice(0, st.fusionHist.length - 60);
    if (st.step >= st.nextCkpt && st.ckpts.length < 48) {
      st.ckpts.push({ step: st.step, weights: Float64Array.from(avg) });
      st.nextCkpt = Math.max(st.nextCkpt + 50, Math.round(st.nextCkpt * 1.4));
    }
    publish();
    // throttle reactive yields to every 3rd round: full figure re-renders are
    // expensive and reflow the page; the machine gets per-round updates via modelBox
    if (round % 3 === 0) yield { st, running: true };
  }
}
;

const _fusionFigure = function _fusionFigure(htl, trainState, process, trainCfg, modelBox, invalidation)
{
  // deliberately does NOT depend on trainSnapshot: canvases are built once and
  // redrawn in place on modelBox "update" (per round), no reactive re-render
  const key = process.name + "|" + JSON.stringify(trainCfg);
  let st = trainState.get(key);
  if (!st) {
    st = { weights: null, step: 0, lossHist: [], ckpts: [], nextCkpt: 50 };
    trainState.set(key, st);
  }
  const WCOL = ["#e15759", "#4e79a7", "#f28e2b", "#59a14f", "#b07aa1", "#76b7b2", "#edc948", "#ff9da7"];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = 560, Hc = 250, Hs = 64;
  const mkCanvas = (h) => {
    const c = htl.html`<canvas width=${Math.round(W * dpr)} height=${Math.round(h * dpr)} style="width:${W}px;height:${h}px;border:1px solid #4443;border-radius:4px;display:block;">`;
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  };
  const cnv = mkCanvas(Hc);
  const spark = mkCanvas(Hs);
  const title = htl.html`<div style="font-size:11px;color:#888;margin-bottom:2px;">weight space, 2D random projection — one dot per worker, ring = fused average</div>`;
  const status = htl.html`<div style="font-size:10px;color:#888;margin-top:2px;">toggle training to watch the workers explore apart and fuse back together</div>`;
  const redraw = () => {
    const hist = st.fusionHist || [];
    if (!hist.length) return;
    const recent = hist.slice(-36);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const e of recent) {
      for (const p of e.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      x0 = Math.min(x0, e.avg[0]); x1 = Math.max(x1, e.avg[0]); y0 = Math.min(y0, e.avg[1]); y1 = Math.max(y1, e.avg[1]);
    }
    const padx = (x1 - x0 || 1) * 0.08, pady = (y1 - y0 || 1) * 0.08;
    x0 -= padx; x1 += padx; y0 -= pady; y1 += pady;
    const mx = (x) => (x - x0) / (x1 - x0) * (W - 16) + 8;
    const my = (y) => (1 - (y - y0) / (y1 - y0)) * (Hc - 16) + 8;
    const ctx = cnv.getContext("2d");
    ctx.clearRect(0, 0, W, Hc);
    // consensus path
    ctx.strokeStyle = "#8887";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    recent.forEach((e, i) => { const x = mx(e.avg[0]), y = my(e.avg[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    // worker dots, fading in from history to now
    recent.forEach((e, i) => {
      const a = 0.12 + 0.88 * (i / Math.max(1, recent.length - 1));
      e.pts.forEach((p, w) => {
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = WCOL[w % WCOL.length];
        ctx.beginPath();
        ctx.arc(mx(p[0]), my(p[1]), 2.2, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
    // last round: spokes from previous consensus out to each worker, back to the new average
    const last = recent[recent.length - 1];
    const prev = recent.length > 1 ? recent[recent.length - 2] : null;
    ctx.globalAlpha = 1;
    last.pts.forEach((p, w) => {
      ctx.strokeStyle = WCOL[w % WCOL.length] + "88";
      ctx.lineWidth = 1;
      if (prev) {
        ctx.beginPath();
        ctx.moveTo(mx(prev.avg[0]), my(prev.avg[1]));
        ctx.lineTo(mx(p[0]), my(p[1]));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(mx(p[0]), my(p[1]));
      ctx.lineTo(mx(last.avg[0]), my(last.avg[1]));
      ctx.stroke();
      ctx.fillStyle = WCOL[w % WCOL.length];
      ctx.beginPath();
      ctx.arc(mx(p[0]), my(p[1]), 3.5, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx(last.avg[0]), my(last.avg[1]), 5.5, 0, 2 * Math.PI);
    ctx.stroke();
    // sparklines: each worker's private loss EMA over the recent rounds
    const sctx = spark.getContext("2d");
    sctx.clearRect(0, 0, W, Hs);
    let l0 = Infinity, l1 = -Infinity;
    for (const e of recent) for (const v of e.emas) { l0 = Math.min(l0, v); l1 = Math.max(l1, v); }
    if (l1 > l0) {
      const nWk = Math.max(...recent.map((e) => e.emas.length));
      for (let w = 0; w < nWk; w++) {
        sctx.strokeStyle = WCOL[w % WCOL.length] + "cc";
        sctx.lineWidth = 1;
        sctx.beginPath();
        let started = false;
        recent.forEach((e, i) => {
          if (w >= e.emas.length) return;
          const x = 8 + (W - 16) * (i / Math.max(1, recent.length - 1));
          const y = 6 + (Hs - 12) * (1 - (e.emas[w] - l0) / (l1 - l0));
          if (started) sctx.lineTo(x, y); else { sctx.moveTo(x, y); started = true; }
        });
        sctx.stroke();
      }
      sctx.fillStyle = "#888";
      sctx.font = "9px ui-monospace, monospace";
      sctx.fillText("per-worker loss (private batches — noisy, but they agree)", 10, 12);
    }
    status.textContent = "step " + last.step + " · " + last.pts.length + " workers averaged every 50 steps · " + hist.length + " rounds shown — the spread is exploration, the merge is fusion";
  };
  const onU = () => redraw();
  modelBox.addEventListener("update", onU);
  invalidation.then(() => modelBox.removeEventListener("update", onU));
  redraw();
  return htl.html`<div class="bsg-fig">${title}${cnv}${spark}${status}</div>`;
}
;

const _trainedModel = function _trainedModel(trainSnapshot, gptKit, beliefKit, trainCfg)
{
  const st = trainSnapshot.st;
  if (!st.weights) return null;
  const model = new gptKit.GPT(trainCfg, beliefKit.mulberry32(0));
  model.setWeights(st.weights);
  return model;
}
;

const _probeData = function _probeData(trainedModel, trainSnapshot, trainCfg, evalSet, probeKit, shuffleProbe, probeLayer, beliefKit, modelBox)
{
  if (!trainedModel) return null;
  // refit is expensive at C=64 — throttle to every 250 steps (cache lives on modelBox)
  const step = trainSnapshot.st.step;
  const cacheKey = probeLayer + "|" + shuffleProbe + "|" + trainCfg.C;
  if (modelBox.probeCache && modelBox.probeCache.key === cacheKey && step - modelBox.probeCache.data.step < 250)
    return modelBox.probeCache.data;
  // probe target = first 3 belief components (full simplex for 3-state processes;
  // S/"0"/"1" coordinates for rrxor — the twin coordinates)
  const nSeq = 256;
  const { X, Y, N, D, K } = probeKit.collect(trainedModel, trainCfg, evalSet.seqs, nSeq, probeLayer);
  let Yfit = Y;
  if (shuffleProbe) {
    Yfit = new Float64Array(Y);
    const r = beliefKit.mulberry32(4242);
    for (let n = N - 1; n > 0; n--) {
      const j = Math.floor(r() * (n + 1));
      for (let k = 0; k < K; k++) {
        const a = Yfit[n * K + k]; Yfit[n * K + k] = Yfit[j * K + k]; Yfit[j * K + k] = a;
      }
    }
  }
  // one ridge fit PER POSITION (rows are seq-major so pos = n % T): a pooled map
  // must ignore positional components of the residual; per-position maps cut the
  // belief blur ~40% at zero training cost (probe_crispness.ts)
  const T = trainCfg.T;
  const fitPerPos = (Xa, Ya, Na) => {
    const Ws = [];
    const Yhat = new Float64Array(Na * K);
    for (let t = 0; t < T; t++) {
      const idx = [];
      for (let i = t; i < Na; i += T) idx.push(i);
      const Np = idx.length;
      const Xp = new Float64Array(Np * D), Yp = new Float64Array(Np * K);
      idx.forEach((i, j) => {
        Xp.set(Xa.subarray(i * D, (i + 1) * D), j * D);
        Yp.set(Ya.subarray(i * K, (i + 1) * K), j * K);
      });
      const Wp = probeKit.solveRidge(Xp, Yp, Np, D, K, 1e-4);
      const Yhp = probeKit.predict(Xp, Wp, Np, D, K);
      idx.forEach((i, j) => Yhat.set(Yhp.subarray(j * K, (j + 1) * K), i * K));
      Ws.push(Wp);
    }
    return { Ws, Yhat };
  };
  const fit = fitPerPos(X, Yfit, N);
  const Yhat = fit.Yhat;
  const R2 = probeKit.r2(Yfit, Yhat, N, K);
  const pts = [];
  for (let n = 0; n < N; n++)
    pts.push({ etaHat: [Yhat[n * K], Yhat[n * K + 1], Yhat[n * K + 2]], etaTrue: [Y[n * K], Y[n * K + 1], Y[n * K + 2]] });
  // final-layer unshuffled per-position probes for machine overlay + racetrack constellation
  let finalWs = fit.Ws;
  if (shuffleProbe || probeLayer !== trainCfg.L) {
    const c2 = probeKit.collect(trainedModel, trainCfg, evalSet.seqs, nSeq, trainCfg.L);
    finalWs = fitPerPos(c2.X, c2.Y, c2.N).Ws;
  }
  modelBox.probeWs = finalWs;
  modelBox.probeW = finalWs[finalWs.length - 1];
  // per-stage probes (embedding, after each block) for the glass machine's
  // belief-crystallization view: one forward pass, one small ridge fit per stage
  const stages = [{ key: "embedding", buf: "h0" }];
  for (let l = 0; l < trainCfg.L; l++) stages.push({ key: "after block " + l, buf: "l" + l + ".res3" });
  const sc = probeKit.collectStages(trainedModel, trainCfg, evalSet.seqs, 96, stages.map((s) => s.buf));
  modelBox.stageProbes = stages.map((s) => ({
    key: s.key, buf: s.buf,
    W: probeKit.solveRidge(sc.Xs[s.buf], sc.Y, sc.N, sc.D, 3, 1e-4)
  }));
  const data = { Ws: fit.Ws, finalWs, R2, pts, layer: probeLayer, shuffled: shuffleProbe, step };
  modelBox.probeCache = { key: cacheKey, data };
  return data;
}
;

const _hmmRun = async function* _hmmRun(hmmGo, process, beliefKit, invalidation)
{
  if (!hmmGo) { yield null; return; }
  const rng = beliefKit.mulberry32(500 + hmmGo);
  const seqs = [];
  for (let s = 0; s < 200; s++) seqs.push(beliefKit.sampleSeq(process, 16, rng).tokens);
  const irng = beliefKit.mulberry32(9 + hmmGo);
  let T = Array.from({length: process.V}, () =>
    Array.from({length: process.nStates}, () => Array.from({length: process.nStates}, () => 0.1 + irng())));
  for (let i = 0; i < process.nStates; i++) {
    let s = 0;
    for (let k = 0; k < process.V; k++) for (let j = 0; j < process.nStates; j++) s += T[k][i][j];
    for (let k = 0; k < process.V; k++) for (let j = 0; j < process.nStates; j++) T[k][i][j] /= s;
  }
  let stop = false;
  invalidation.then(() => { stop = true; });
  const hist = [];
  for (let it = 1; it <= 150 && !stop; it++) {
    const r = beliefKit.emStep(T, seqs, process.nStates, process.V);
    T = r.T;
    hist.push(r.logLik);
    const aligned = beliefKit.alignToTruth(T, process.T, process.nStates, process.V);
    yield { it, logLik: r.logLik, T, aligned, hist: hist.slice() };
    await new Promise((res) => window.requestAnimationFrame(res));
  }
}
;

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // narrative
  $def("bsg-title", null, ["md"], _title);
  $def("bsg-intro", null, ["md"], _intro);
  $def("bsg-s1", null, ["md"], _s1);
  $def("bsg-v-proc", "viewof processChoice", ["Inputs"], _v_processChoice);
  $def("bsg-proc", "processChoice", ["Generators", "viewof processChoice"], _processChoice);
  $def("bsg-v-m3x", "viewof mess3x", ["Inputs"], _v_mess3x);
  $def("bsg-m3x", "mess3x", ["Generators", "viewof mess3x"], _mess3x);
  $def("bsg-v-m3a", "viewof mess3alpha", ["Inputs"], _v_mess3alpha);
  $def("bsg-m3a", "mess3alpha", ["Generators", "viewof mess3alpha"], _mess3alpha);
  $def("bsg-v-res", "viewof resample", ["Inputs"], _v_resample);
  $def("bsg-res", "resample", ["Generators", "viewof resample"], _resample);
  $def("bsg-world", "worldFigure", ["htl", "process", "beliefKit", "renderKit", "resample", "invalidation"], _worldFigure);
  $def("bsg-s2", null, ["md"], _s2);
  $def("bsg-v-hmmgo", "viewof hmmGo", ["Inputs"], _v_hmmGo);
  $def("bsg-hmmgo", "hmmGo", ["Generators", "viewof hmmGo"], _hmmGo);
  $def("bsg-hmmfig", "hmmFigure", ["htl", "hmmRun", "process", "renderKit"], _hmmFigure);
  $def("bsg-s3", null, ["md", "gptKit", "trainCfg"], _s3);
  $def("bsg-v-train", "viewof training", ["Inputs"], _v_training);
  $def("bsg-train", "training", ["Generators", "viewof training"], _training);
  $def("bsg-v-nw", "viewof nWorkers", ["Inputs"], _v_nWorkers);
  $def("bsg-nw", "nWorkers", ["Generators", "viewof nWorkers"], _nWorkers);
  $def("bsg-lossfig", "lossFigure", ["htl", "trainSnapshot", "evalSet", "renderKit", "gptKit", "trainCfg"], _lossFigure);
  $def("bsg-fusion", "fusionFigure", ["htl", "trainState", "process", "trainCfg", "modelBox", "invalidation"], _fusionFigure);
  $def("bsg-s45", null, ["md"], _s45);
  $def("bsg-v-replay", "viewof replay", ["Inputs"], _v_replay);
  $def("bsg-replay", "replay", ["Generators", "viewof replay"], _replay);
  $def("bsg-v-ph", "viewof playhead", ["Inputs", "trainCfg"], _v_playhead);
  $def("bsg-ph", "playhead", ["Generators", "viewof playhead"], _playhead);
  $def("bsg-race", "racetrackFigure", ["htl", "process", "beliefKit", "renderKit", "trainCfg", "trainedModel", "probeData", "playhead", "replay"], _racetrackFigure);
  $def("bsg-smach", null, ["md"], _sMachine);
  $def("bsg-machine", "machineFigure", ["htl", "process", "beliefKit", "renderKit", "gptKit", "trainCfg", "modelBox", "machineState", "invalidation"], _machineFigure);
  $def("bsg-sflow", null, ["md"], _sFlow);
  $def("bsg-flow", "flowFigure", ["htl", "process", "beliefKit", "renderKit", "gptKit", "trainCfg", "modelBox", "machineState", "invalidation"], _flowFigure);
  $def("bsg-sarch", null, ["md"], _sArchitecture);
  $def("bsg-arch", "architectureFigure", ["htl", "process", "beliefKit", "renderKit", "gptKit", "trainCfg", "modelBox", "invalidation"], _architectureFigure);
  $def("bsg-smicro", null, ["md"], _sMicroscope);
  $def("bsg-micro", "microscopeFigure", ["htl", "process", "beliefKit", "renderKit", "gptKit", "trainCfg", "modelBox", "machineState", "invalidation"], _microscopeFigure);
  $def("bsg-sbackprop", null, ["md"], _sBackprop);
  $def("bsg-backprop", "backpropFigure", ["htl", "process", "beliefKit", "renderKit", "gptKit", "trainCfg", "modelBox", "machineState", "invalidation"], _backpropFigure);
  $def("bsg-s6", null, ["md"], _s6);
  $def("bsg-msp", "mspFigure", ["htl", "process", "beliefKit", "renderKit", "invalidation"], _mspFigure);
  $def("bsg-s7", null, ["md"], _s7);
  $def("bsg-v-shuf", "viewof shuffleProbe", ["Inputs"], _v_shuffleProbe);
  $def("bsg-shuf", "shuffleProbe", ["Generators", "viewof shuffleProbe"], _shuffleProbe);
  $def("bsg-v-pl", "viewof probeLayer", ["Inputs"], _v_probeLayer);
  $def("bsg-pl", "probeLayer", ["Generators", "viewof probeLayer"], _probeLayer);
  $def("bsg-probefig", "probeFigure", ["htl", "probeData", "renderKit", "process"], _probeFigure);
  $def("bsg-v-ckpt", "viewof ckptIdx", ["Inputs", "trainSnapshot"], _v_ckptIdx);
  $def("bsg-ckpt", "ckptIdx", ["Generators", "viewof ckptIdx"], _ckptIdx);
  $def("bsg-emerge", "emergenceFigure", ["htl", "trainSnapshot", "ckptIdx", "gptKit", "beliefKit", "probeKit", "evalSet", "trainCfg", "renderKit", "process"], _emergenceFigure);
  $def("bsg-s10", null, ["md"], _s10);
  $def("bsg-twins", "twinsFigure", ["htl", "trainState", "trainSnapshot", "gptKit", "beliefKit", "probeKit", "renderKit"], _twinsFigure);
  $def("bsg-s11", null, ["md"], _s11);
  $def("bsg-v-zootrain", "viewof zooTraining", ["Inputs"], _v_zooTraining);
  $def("bsg-zootrain", "zooTraining", ["Generators", "viewof zooTraining"], _zooTraining);
  $def("bsg-contraction", "contractionFigure", ["htl", "beliefKit", "renderKit", "gptKit", "zooCfg", "zooModelBox", "invalidation"], _contractionFigure);
  $def("bsg-zooloss", "zooLossFigure", ["htl", "zooSnapshot", "zooEval", "renderKit", "gptKit", "zooCfg"], _zooLossFigure);
  $def("bsg-zooprobereport", "zooProbeReport", ["htl", "zooProbeData", "zooEval"], _zooProbeReport);
  $def("bsg-footer", null, ["md"], _footer);
  // machinery
  $def("bsg-styles", "styles", ["htl"], _styles);
  $def("bsg-bkf", "beliefKitFactory", [], _beliefKitFactory);
  $def("bsg-bk", "beliefKit", ["beliefKitFactory"], _beliefKit);
  $def("bsg-gptf", "gptFactory", [], _gptFactory);
  $def("bsg-gptk", "gptKit", ["gptFactory"], _gptKit);
  $def("bsg-probek", "probeKit", [], _probeKit);
  $def("bsg-renderk", "renderKit", ["htl"], _renderKit);
  $def("bsg-process", "process", ["beliefKit", "processChoice", "mess3x", "mess3alpha"], _process);
  $def("bsg-traincfg", "trainCfg", ["process"], _trainCfg);
  $def("bsg-evalset", "evalSet", ["beliefKit", "process", "trainCfg"], _evalSet);
  $def("bsg-trainstate", "trainState", [], _trainState);
  $def("bsg-modelbox", "modelBox", [], _modelBox);
  $def("bsg-machinestate", "machineState", [], _machineState);
  $def("bsg-worksrc", "workerSource", ["beliefKitFactory", "gptFactory"], _workerSource);
  $def("bsg-trainsnap", "trainSnapshot", ["training", "nWorkers", "trainState", "process", "trainCfg", "workerSource", "gptKit", "beliefKit", "modelBox", "invalidation"], _trainSnapshot);
  $def("bsg-trainedmodel", "trainedModel", ["trainSnapshot", "gptKit", "beliefKit", "trainCfg"], _trainedModel);
  $def("bsg-probedata", "probeData", ["trainedModel", "trainSnapshot", "trainCfg", "evalSet", "probeKit", "shuffleProbe", "probeLayer", "beliefKit", "modelBox"], _probeData);
  $def("bsg-hmmrun", "hmmRun", ["hmmGo", "process", "beliefKit", "invalidation"], _hmmRun);
  $def("bsg-zoocfg", "zooCfg", [], _zooCfg);
  $def("bsg-zooeval", "zooEval", ["beliefKit", "zooCfg"], _zooEval);
  $def("bsg-zoomodelbox", "zooModelBox", [], _zooModelBox);
  $def("bsg-zoosnap", "zooSnapshot", ["zooTraining", "nWorkers", "trainState", "zooCfg", "workerSource", "gptKit", "beliefKit", "zooModelBox", "invalidation"], _zooSnapshot);
  $def("bsg-zooprobedata", "zooProbeData", ["zooSnapshot", "zooCfg", "zooEval", "gptKit", "beliefKit", "probeKit", "zooModelBox"], _zooProbeData);
  return main;
}
