// bun ycheck.ts <i>: checks y.ts row i (the live checker, run-sets verdictOf) and prints the verdict and the time
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { srcs } from "./y.ts";
const [n, s] = srcs[Number(process.argv[2])]!;
const t0 = performance.now();
const v = verdictOf(s, null, false);
console.log(`${n}: ${v.text.slice(0, 200)} (${Math.round(performance.now() - t0)} ms)`);
process.exit(0);
