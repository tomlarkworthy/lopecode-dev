// Headless smoke test of the belief-state-geometry module's computational cells.
import { importNotebookModule } from "../notebook-import";

const m = await importNotebookModule("modules/@tomlarkworthy/belief-state-geometry.js", {
  overrides: {
    processChoice: "mess3",
    mess3x: 0.05,
    mess3alpha: 0.85,
  },
});

const beliefKit = await m.value("beliefKit");
const process = await m.value("process");
const trainCfg = await m.value("trainCfg");
const evalSet = await m.value("evalSet");
const gptKit = await m.value("gptKit");
const probeKit = await m.value("probeKit");
const workerSource = await m.value("workerSource");

console.log("process:", process.name, "V", process.V, "states", process.nStates, "params", JSON.stringify(process.params));
console.log("stationary:", Array.from(process.stationary, (v: number) => v.toFixed(3)).join(","));
console.log("trainCfg:", JSON.stringify(trainCfg));
console.log("evalSet: optimal", evalSet.optimalLoss.toFixed(4), "iid", evalSet.iidLoss.toFixed(4), "seqs", evalSet.seqs.length);

// train a few steps on main thread using the module's own GPT
const model = new gptKit.GPT(trainCfg, beliefKit.mulberry32(7));
const rng = beliefKit.mulberry32(1);
const tokens = new Int32Array(trainCfg.B * trainCfg.T);
const targets = new Int32Array(trainCfg.B * trainCfg.T);
let last = 0;
for (let s = 0; s < 60; s++) {
  for (let b = 0; b < trainCfg.B; b++) {
    const seq = beliefKit.sampleSeq(process, trainCfg.T + 1, rng).tokens;
    for (let t = 0; t < trainCfg.T; t++) { tokens[b * trainCfg.T + t] = seq[t]; targets[b * trainCfg.T + t] = seq[t + 1]; }
  }
  model.zeroGrads();
  last = model.forward(tokens, targets);
  model.backward(tokens, targets);
  model.adam(1e-3);
}
console.log("60 steps trained, loss", last.toFixed(4), "(iid", evalSet.iidLoss.toFixed(4) + ")");
if (!(last < evalSet.iidLoss + 0.02)) throw new Error("training not descending");

// probe path
const { X, Y, N, D, K } = probeKit.collect(model, trainCfg, evalSet.seqs, 64, trainCfg.L);
const W = probeKit.solveRidge(X, Y, N, D, K, 1e-4);
const R2 = probeKit.r2(Y, probeKit.predict(X, W, N, D, K), N, K);
console.log("probe R2 after 60 steps:", R2.map((r: number) => r.toFixed(3)).join(","), "(low is expected, just checking plumbing)");

// EM one step
const seqs = Array.from({ length: 50 }, () => beliefKit.sampleSeq(process, 16, rng).tokens);
const em = beliefKit.emStep(process.T, seqs, process.nStates, process.V);
console.log("EM logLik at truth:", em.logLik.toFixed(1));
const aligned = beliefKit.alignToTruth(em.T, process.T, process.nStates, process.V);
console.log("EM alignToTruth ok, T[0][0][0]:", aligned[0][0][0].toFixed(3));

// worker source sanity: syntactically valid + contains both factories
new Function(workerSource);
console.log("workerSource compiles,", (workerSource.length / 1024).toFixed(0), "KB");

// rrxor + z1r variants
for (const name of ["z1r", "rrxor"]) {
  const p = beliefKit.make(name, 0, 0);
  const s = beliefKit.sampleSeq(p, 12, rng);
  const bt = beliefKit.beliefTrajectory(p, s.tokens);
  const sum = bt.beliefs[11].reduce((a: number, b: number) => a + b, 0);
  console.log(name, "belief sums to", sum.toFixed(6));
}

// §11 zoo + meta-Bayes
const worlds = beliefKit.zooWorlds();
console.log("zoo:", worlds.map((w: any) => w.name).join(", "));
const zooEval = await m.value("zooEval");
console.log("zooEval: floor", zooEval.floorLoss.toFixed(4), "iid", zooEval.iidLoss.toFixed(4), "seqs", zooEval.seqs.length);
if (!(zooEval.floorLoss < zooEval.iidLoss)) throw new Error("meta floor should beat iid");
// posterior on a cycle3 stream should concentrate on cycle3 (index 1)
{
  const w = beliefKit.metaInit(worlds);
  const { tokens: ct } = beliefKit.sampleSeq(worlds[1], 32, rng);
  for (const k of ct) beliefKit.metaUpdate(worlds, w, k);
  const marg = beliefKit.worldMarginal(w);
  console.log("cycle3 stream posterior:", Array.from(marg, (v: number) => v.toFixed(3)).join(","));
  if (marg[1] < 0.8) throw new Error("meta posterior failed to identify cycle3");
  const sumW = Array.from(marg).reduce((a: number, b: number) => a + b, 0);
  if (Math.abs(sumW - 1) > 1e-9) throw new Error("meta posterior not normalized");
}
// zoo cfg + a few zoo-mixture training steps with the module's own GPT
const zooCfg = await m.value("zooCfg");
{
  const zm = new gptKit.GPT(zooCfg, beliefKit.mulberry32(7));
  const tokens = new Int32Array(zooCfg.B * zooCfg.T);
  const targets = new Int32Array(zooCfg.B * zooCfg.T);
  let zl = 0;
  for (let s = 0; s < 5; s++) {
    for (let b = 0; b < zooCfg.B; b++) {
      const p = worlds[Math.floor(rng() * worlds.length)];
      const seq = beliefKit.sampleSeq(p, zooCfg.T + 1, rng).tokens;
      for (let t = 0; t < zooCfg.T; t++) { tokens[b * zooCfg.T + t] = seq[t]; targets[b * zooCfg.T + t] = seq[t + 1]; }
    }
    zm.zeroGrads();
    zl = zm.forward(tokens, targets);
    zm.backward(tokens, targets);
    zm.adam(1e-3);
  }
  console.log("zoo model 5 steps, loss", zl.toFixed(4));
}
// worker source handles zoo init (compile-only check already done; check the branch exists)
if (!workerSource.includes("zooWorlds")) throw new Error("workerSource lacks zoo branch");
console.log("HEADLESS CHECK PASSED");
m.dispose();
process.exit ? null : null;
