// Finite-difference gradient check on a tiny config.
import { GPT, type Cfg } from "./gpt";
import { mulberry32 } from "./processes";

const cfg: Cfg = { V: 3, T: 4, C: 8, H: 2, L: 2, F: 16, B: 2 };
const rng = mulberry32(42);
const model = new GPT(cfg, rng);

const N = cfg.B * cfg.T;
const tokens = new Int32Array(N);
const targets = new Int32Array(N);
for (let i = 0; i < N; i++) { tokens[i] = Math.floor(rng() * cfg.V); targets[i] = Math.floor(rng() * cfg.V); }

model.zeroGrads();
model.forward(tokens, targets);
model.backward(tokens, targets);

let worst = 0, worstDesc = "";
let checked = 0;
for (const p of model.order) {
  // check a few indices per param tensor
  const idxs = new Set<number>();
  for (let k = 0; k < 4; k++) idxs.add(Math.floor(rng() * p.w.length));
  for (const i of idxs) {
    const orig = p.w[i];
    const h = 1e-5;
    p.w[i] = orig + h;
    const lp = model.forward(tokens, targets);
    p.w[i] = orig - h;
    const lm = model.forward(tokens, targets);
    p.w[i] = orig;
    const num = (lp - lm) / (2 * h);
    const ana = p.g[i];
    // finite-difference absolute noise floor ~1e-10 (loss O(1), h=1e-5)
    if (Math.abs(num - ana) < 1e-9) { checked++; continue; }
    const rel = Math.abs(num - ana) / Math.max(1e-8, Math.abs(num) + Math.abs(ana));
    checked++;
    if (rel > worst) {
      worst = rel;
      worstDesc = `${p.name}[${i}] num=${num.toExponential(4)} ana=${ana.toExponential(4)}`;
    }
  }
}
console.log(`checked ${checked} params, worst rel err ${worst.toExponential(3)}`);
console.log(`worst: ${worstDesc}`);
if (worst > 1e-4) { console.error("GRADCHECK FAILED"); process.exit(1); }
console.log("GRADCHECK PASSED");
