// s56 (target 1 with the checker on): a generator cell yields f, whose capture is a registration gap (local i), then
// writes the Mut by a route S5.6 might not count as a use. Accepted + silent shipped = a break.
import { C } from "./lib.ts";
import { driveG } from "./lib.ts";
const P = "const xs = [0]; const i: readonly number[] = xs; const F = () => i.length;";
const GEN = (pre: string, after: string) => `const g = function* () { ${P} ${pre} yield { f: F }; ${after} };\nconst w = (g: { readonly f: () => number }) => g.f();`;
const W: [string, string, string][] = [
  ["direct", "", "xs.push(1);"],
  ["alias-after", "", "const ys = xs; ys.push(1);"],
  ["helper-before", "const wr = () => { xs.push(1); };", "wr();"],
  ["helper-decl-after", "", "wr(); function wr() { xs.push(1); }"],
  ["getter-before", "const get = () => xs;", "get().push(1);"],
  ["mut-param-helper", "const add = (ys: Mut<number[]>) => { ys.push(1); };", "add(xs);"],
  ["mut-param-helper-curried", "const add = (ys: Mut<number[]>) => () => { ys.push(1); };", "add(xs)();"],
  ["record-before", "const r = { t: xs };", "r.t.push(1);"],
  ["closure-made-before-called-after", "const mk = (ys: Mut<number[]>) => { const run = () => { ys.push(1); }; return run; }; const run = mk(xs);", "run();"],
  ["callback-after", "", "[0].forEach(() => { xs.push(1); });"],
  ["finally", "", ""],
  ["yield-star-inner", "", ""],
  ["loop-decl-in-body", "", ""],
  ["try-finally-yield", "", ""],
];
export const cands = W.map(([id, pre, after]) => C(`s56-${id}`, GEN(pre, after), { drive: driveG }));
const ix = (id: string) => cands.findIndex((c) => c.name === `s56-${id}`);
cands[ix("finally")] = C("s56-finally", `const g = function* () { ${P} try { yield { f: F }; } finally { xs.push(1); } };\nconst w = (g: { readonly f: () => number }) => g.f();`, { drive: driveG });
cands[ix("yield-star-inner")] = C("s56-yield-star-inner", `const g = function* () { function* inner() { ${P} yield { f: F }; xs.push(1); } yield* inner(); };\nconst w = (g: { readonly f: () => number }) => g.f();`, { drive: driveG });
cands[ix("loop-decl-in-body")] = C("s56-loop-decl-in-body", `const g = function* () { for (const n of [0, 1]) { ${P} if (n === 0) yield { f: F }; xs.push(1); } };\nconst w = (g: { readonly f: () => number }) => g.f();`, { drive: driveG });
cands[ix("try-finally-yield")] = C("s56-try-finally-yield", `const g = function* () { ${P} const out = { f: F }; try { xs.push(0); } finally { yield out; } xs.push(1); };\nconst w = (g: { readonly f: () => number }) => g.f();`, { drive: driveG });
// control, checker skipped: the direct write with the alias named c (registration freezes it: fires with REG=0 only)
cands.push(C("s56-ctl-c-direct", "const g = function* () { const xs = [0]; const c: readonly number[] = xs; const F = () => c.length; yield { f: F }; xs.push(1); };\nconst w = (g: { readonly f: () => number }) => g.f();", { drive: driveG, ctl: true }));
cands.push(C("s56-ctl-i-direct", `const g = function* () { ${P} yield { f: F }; xs.push(1); };\nconst w = (g: { readonly f: () => number }) => g.f();`, { drive: driveG, ctl: true }));
