// detector controls: run without the checker on paths the freeze does not cover
import { C, L, W } from "./harness.ts";
export const cands = [
  // a consumer writing its typed-array input (known class a, rules off)
  C("ctl-typed-input-write", "const t = () => new Uint8Array(2);\nconst a = (t: Uint8Array) => { const p = t.subarray(0); p[0] = 1; return 0; };\nconst b = (t: Uint8Array) => () => t[0];", { ctl: true }),
  // a captured let reassigned after its function is published (known class a, rules off)
  C("ctl-let-reassign", "const a = function* () { let n = 0; const f = () => n; yield f; n = 1; yield f; };", { ctl: true }),
  // a promise value: held promise of a typed array, written late (detects through the promise snapshot)
  C("ctl-promise-typed", "const a = () => { const t = new Uint8Array(2); const p = (async () => t)(); " + L("t[0] = 1;") + "return () => p; };", { ctl: true }),
  // twice detector: a consumer generator observing the same input twice, input a typed array written by another consumer
  C("ctl-twice", "const t = () => new Uint8Array(2);\nconst w = async (t: Uint8Array) => { " + W + "t[0] = 7; return 0; };\nconst obs = async function* (t: Uint8Array) { yield [t[0]]; " + W + W + "yield [t[0]]; };", { ctl: true, twice: ["obs"] }),
];
