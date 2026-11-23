// b7: each cause found in b1/b4/b6, with the earlier reading held by other code. snap is an action of another cell
// (zero arguments, so not an S4.11 point) that copies read(s)() into the state t; put calls it between the publish and
// the write. v = s() and w = t are two further cells; the drive (p1-attacks two) compares them after the call commits.
// Also the minimal form of each cause, recording with lg.set(f()) called directly.
import { C, act } from "./lib.ts";
const S2 = "const s = () => state<() => number>(() => -1);\nconst t = () => state(-1);\nconst v = (s: () => number) => s();\nconst w = (t: number) => t;\nconst snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });\n";
const PUT = (b: string) => `const put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const two = async (p: any) => {
  try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 100)}`; }
  await p.settle(400);
  const v = p.value("v"), w = p.value("w");
  return `${v !== w ? "DIFF" : "same"} v = s() = ${v}, w = what snap read = ${w}`;
};
const T = (id: string, b: string, extra = {}) => C(`b7-${id}`, S2 + PUT(b), { drive: two, ...extra });
const K = "const k = 1;";
const out: ReturnType<typeof C>[] = [
  T("Q1-st-before", `const st = s.set; ${SP} st(f); snap(); xs.push(1);`),
  T("Q1-up-before", `const up = s.update; ${SP} up(() => f); snap(); xs.push(1);`),
  T("Q2-destr-set", `${SP} const { set } = s; set(f); snap(); xs.push(1);`),
  T("Q2-destr-update", `${SP} const { update } = s; update(() => f); snap(); xs.push(1);`),
  T("Q3-computed-set", `${SP} s['set'](f); snap(); xs.push(1);`),
  T("Q3-computed-update", `${SP} s['update'](() => f); snap(); xs.push(1);`),
  T("Q4-alias-after", `${SP} s.set(f); snap(); const ys = xs; ys.push(1);`),
  T("Q4-destr-after", `const xs = [0]; const r0 = { t: xs }; const c: readonly number[] = xs; const f = () => c.length; s.set(f); snap(); const { t } = r0; t.push(1);`),
  T("Q4-forof-after", `${SP} s.set(f); snap(); for (const y of [xs]) y.push(1);`),
  T("Q4-cbparam-after", `${SP} s.set(f); snap(); [xs].forEach((y) => { y.push(1); });`),
  T("Q4-catch-after", `${SP} s.set(f); snap(); try { throw 0; } catch { const ys = xs; ys.push(1); }`),
  T("Q5-getter", `${SP} const get = () => xs; s.set(f); snap(); get().push(1);`),
  T("Q6-cb-loop", `${SP} [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(f); snap(); } });`),
  // mode A: the method registration overwrite (R) with an S4.11 hole
  T("R-dupkey-st", `${K} const st = s.set; ${SP} const o = { m() { return k; }, m: f }; st(o.m); snap(); xs.push(1);`),
  T("R-spread-rec-st", `${K} const st = s.set; ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; st(o.m); snap(); xs.push(1);`),
  T("R-dupkey-alias-after", `${K} ${SP} const o = { m() { return k; }, m: f }; s.set(o.m); snap(); const ys = xs; ys.push(1);`),
  T("R-spread-getter", `${K} ${SP} const get = () => xs; const r = { m: f }; const o = { m() { return k; }, ...r }; s.set(o.m); snap(); get().push(1);`),
  T("R-spread-cb-loop", `${K} ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(o.m); snap(); } });`),
  // controls, checker skipped: direct P (B only), let (both)
  T("ctl-P", `${SP} s.set(f); snap(); xs.push(1);`, { ctl: true }),
  T("ctl-let", `let n = 1; const f = () => n; s.set(f); snap(); n = 2;`, { ctl: true }),
];
// minimal forms: lg.set(f()) called directly is a point before the write, accepted with these routes (q0)
const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const M = (id: string, b: string) => C(`b7-min-${id}`, ST + `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${b} }) });`, { drive: act() });
out.push(
  M("Q1", `const st = s.set; ${SP} st(f); lg.set(f()); xs.push(1);`),
  M("Q2", `${SP} const { set } = s; set(f); lg.set(f()); xs.push(1);`),
  M("Q3", `${SP} s['set'](f); lg.set(f()); xs.push(1);`),
  M("Q4", `${SP} s.set(f); lg.set(f()); const ys = xs; ys.push(1);`),
  M("Q5", `${SP} const get = () => xs; s.set(f); lg.set(f()); get().push(1);`),
  M("Q6", `${SP} [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(f); lg.set(f()); } });`),
  M("R", `const k = 1; ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; s.set(o.m); lg.set(o.m()); const ys = xs; ys.push(1);`),
);
export const cands = out;
