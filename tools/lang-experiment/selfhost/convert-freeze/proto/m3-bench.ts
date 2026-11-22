// M3: 100k records {i, xs: [i, i+1]} built in a loop and returned; best of 5 per treatment (same shape as holes5/b7-bench.ts)
import { deepFreeze, ss_f } from "./tree/lite/freeze.ts";
import { PROTO } from "./tree/lite/proto-flags.ts";
const make = () => { const a: { i: number; xs: number[] }[] = []; for (let i = 0; i < 100000; i++) a.push({ i, xs: [i, i + 1] }); return a; };
const best = (f: (v: unknown) => unknown) => { const ts: number[] = []; for (let k = 0; k < 5; k++) { const v = make(); const t = performance.now(); f(v); ts.push(performance.now() - t); } return Math.min(...ts).toFixed(2); };
PROTO.boundary = true;
console.log(`main deepFreeze (out path, boundary): best ${best(deepFreeze)} ms`);
console.log(`ss_f (one conversion at return): best ${best(ss_f)} ms`);
console.log(`ss_f on an already frozen value: best ${best((v) => { ss_f(v); const t = performance.now(); ss_f(v); return performance.now() - t; })} ms (includes the first freeze)`);
const v = make(); ss_f(v); const t = performance.now(); for (let k = 0; k < 1000; k++) ss_f(v); console.log(`ss_f re-conversion of a frozen 100k value: ${((performance.now() - t) / 1000 * 1000).toFixed(1)} us each`);
console.log(`plain Object.freeze per node (lower bound): best ${best((v) => { for (const r of v as any[]) { Object.freeze(r.xs); Object.freeze(r); } Object.freeze(v); })} ms`);
