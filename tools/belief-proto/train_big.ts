// Multi-core Mess3 training via local SGD (federated averaging) over Web Workers.
// Low coordination: one weights message per worker per K-step round, no SharedArrayBuffer
// (browser SAB needs cross-origin isolation; single-file notebooks won't have it).
// usage: bun train_parallel.ts [workers] [rounds] [K]
import { cpus } from "node:os";
import { mess3 } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { mulberry32 } from "./processes";
import { makeEvalSet, evalLoss, probeAndRender } from "./eval_utils";

const NWORKERS = parseInt(process.argv[2] || "5", 10);
const ROUNDS = parseInt(process.argv[3] || "60", 10);
const KSTEPS = parseInt(process.argv[4] || "50", 10);
const cfg: Cfg = { V: 3, T: parseInt(process.argv[7] || "10", 10), C: parseInt(process.argv[5] || "32", 10), H: 4, L: 2, F: parseInt(process.argv[6] || "128", 10), B: 32 };
const PROC_ARGS: [number, number] = [0.05, 0.85];
const outDir = new URL("./out/", import.meta.url).pathname;

const proc = mess3(...PROC_ARGS);
const evalModel = new GPT(cfg, mulberry32(7)); // same init seed as baseline
const ev = makeEvalSet(proc, cfg, 1000);
console.log(`workers=${NWORKERS} rounds=${ROUNDS} K=${KSTEPS} | per-worker steps ${ROUNDS * KSTEPS}, aggregate batches ${NWORKERS * ROUNDS * KSTEPS}`);
console.log(`optimal loss ${ev.optimalLoss.toFixed(4)} nats`);

const nW = evalModel.weightCount();
let weights = evalModel.getWeights();

type Handle = { worker: Worker; next: () => Promise<any> };
const handles: Handle[] = [];
for (let i = 0; i < NWORKERS; i++) {
  const worker = new Worker(new URL("./worker_train.ts", import.meta.url).href);
  const queue: ((v: any) => void)[] = [];
  const backlog: any[] = [];
  worker.onmessage = (e: MessageEvent) => {
    const resolve = queue.shift();
    if (resolve) resolve(e.data); else backlog.push(e.data);
  };
  const next = () =>
    backlog.length ? Promise.resolve(backlog.shift()) : new Promise<any>((res) => queue.push(res));
  handles.push({ worker, next });
  worker.postMessage({
    type: "init", cfg, procName: "mess3", procArgs: PROC_ARGS,
    seed: 1000 + i * 7919, weights: weights.buffer.slice(0),
  });
}
await Promise.all(handles.map((h) => h.next())); // all ready

const TOTAL = ROUNDS * KSTEPS;
const lrAt = (step: number) => {
  const warm = Math.min(1, step / 100);
  const decay = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, step / TOTAL)));
  return 1e-3 * warm * (0.1 + 0.9 * decay);
};

const t0 = performance.now();
for (let round = 1; round <= ROUNDS; round++) {
  const lr = lrAt((round - 1) * KSTEPS + KSTEPS / 2);
  for (const h of handles) {
    const copy = weights.buffer.slice(0);
    h.worker.postMessage({ type: "round", weights: copy, steps: KSTEPS, lr }, [copy]);
  }
  const results = await Promise.all(handles.map((h) => h.next()));
  // average
  weights = new Float64Array(nW);
  for (const r of results) {
    const w = new Float64Array(r.weights);
    for (let i = 0; i < nW; i++) weights[i] += w[i];
  }
  for (let i = 0; i < nW; i++) weights[i] /= results.length;

  if (round % 10 === 0 || round === 1 || round === ROUNDS) {
    evalModel.setWeights(weights);
    const el = evalLoss(evalModel, cfg, ev);
    const wall = (performance.now() - t0) / 1000;
    const aggSps = (round * KSTEPS * NWORKERS) / wall;
    const emaMean = results.reduce((a, r) => a + r.emaLoss, 0) / results.length;
    let r2s = "";
    if (round % 20 === 0 || round === ROUNDS) {
      const scores = probeAndRender(evalModel, cfg, ev, null);
      r2s = ` R2 ${(scores.reduce((a, b) => a + b) / 3).toFixed(4)}`;
    }
    console.log(`round ${round} (${(round * KSTEPS)} steps/worker) wall ${wall.toFixed(1)}s | worker-ema ${emaMean.toFixed(4)} eval ${el.toFixed(4)} optimal ${ev.optimalLoss.toFixed(4)}${r2s} | ${aggSps.toFixed(0)} agg steps/s`);
  }
}

evalModel.setWeights(weights);
const wall = (performance.now() - t0) / 1000;
const scores = probeAndRender(evalModel, cfg, ev, `${outDir}probe_big_C${cfg.C}_T${cfg.T}.png`);
const shuffled = probeAndRender(evalModel, cfg, ev, null, true);
console.log(`FINAL wall ${wall.toFixed(1)}s | eval ${evalLoss(evalModel, cfg, ev).toFixed(4)} vs optimal ${ev.optimalLoss.toFixed(4)}`);
console.log(`probe R^2 ${scores.map((s) => s.toFixed(4)).join(", ")} | shuffled ${shuffled.map((s) => s.toFixed(4)).join(", ")}`);
console.log(`wrote ${outDir}probe_parallel.png`);
await Bun.write(`${outDir}model_big_C${cfg.C}_T${cfg.T}_${ROUNDS * KSTEPS}.json`, evalModel.serialize());
for (const h of handles) h.worker.terminate();
