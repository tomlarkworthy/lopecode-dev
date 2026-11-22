import { A } from "./common.ts";
const G = "function g(): number { try { return late.length; } catch { return -1; } }";
export const attacks = [
  // dead-zone exit, no write: a held function's answer changes when its capture is initialised
  A("tdz-exit-only", "const a = function* () { yield g; const late = [0]; yield 1; " + G + " };\nconst b = (a: (() => number) | number) => ({ v: a });"),
  A("tdz-exit-only-rec", "const a = function* () { const r = { g }; yield r; const late = [0]; yield 1; " + G + " };"),
  // the write lands before ss_tdz with no second publish of the function
  A("tdz-write-no-republish", "const a = function* () { yield g; const late = [0], z = yield 1, w = late.push(9); yield 2; " + G + " };\nconst b = (a: (() => number) | number) => ({ v: a });"),
];
