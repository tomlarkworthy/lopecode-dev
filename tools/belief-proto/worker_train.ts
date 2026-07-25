// Local-SGD training worker. Web Worker API (postMessage/onmessage) so the same
// shape ports to a browser worker built from a blob URL inside the notebook.
// Protocol:
//   -> {type:"init", cfg, procName, procArgs, seed, weights}
//   -> {type:"round", weights, steps, lr}   (weights transferable; run `steps` local steps)
//   <- {type:"weights", weights, emaLoss, localStep}
import { mess3, rrxor, z1r, zooWorlds, sampleSeq, mulberry32, type Process } from "./processes";
import { GPT, type Cfg } from "./gpt";

let model: GPT;
let proc: Process;
let zoo: Process[] | null = null;
let cfg: Cfg;
let rng: () => number;
let ema = -1;

function makeBatch() {
  const tokens = new Int32Array(cfg.B * cfg.T);
  const targets = new Int32Array(cfg.B * cfg.T);
  for (let b = 0; b < cfg.B; b++) {
    const p = zoo ? zoo[Math.floor(rng() * zoo.length)] : proc;
    const { tokens: seq } = sampleSeq(p, cfg.T + 1, rng);
    for (let t = 0; t < cfg.T; t++) { tokens[b * cfg.T + t] = seq[t]; targets[b * cfg.T + t] = seq[t + 1]; }
  }
  return { tokens, targets };
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    cfg = msg.cfg;
    if (msg.procName === "zoo") zoo = zooWorlds();
    proc = msg.procName === "mess3" ? mess3(...(msg.procArgs as [number, number]))
      : msg.procName === "rrxor" ? rrxor() : z1r();
    rng = mulberry32(msg.seed);
    model = new GPT(cfg, mulberry32(0)); // weights overwritten below
    model.setWeights(new Float64Array(msg.weights));
    self.postMessage({ type: "ready" });
  } else if (msg.type === "round") {
    model.setWeights(new Float64Array(msg.weights));
    for (let s = 0; s < msg.steps; s++) {
      const { tokens, targets } = makeBatch();
      model.zeroGrads();
      const loss = model.forward(tokens, targets);
      model.backward(tokens, targets);
      model.adam(msg.lr);
      ema = ema < 0 ? loss : 0.98 * ema + 0.02 * loss;
    }
    const w = model.getWeights();
    self.postMessage({ type: "weights", weights: w.buffer, emaLoss: ema, localStep: model.step }, [w.buffer]);
  }
};
