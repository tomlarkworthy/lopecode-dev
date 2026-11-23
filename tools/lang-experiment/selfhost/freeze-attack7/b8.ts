// b8 (item 5, each candidate point alone): a value given at a place S4.11 does not list, then a plain write of the Mut.
// Accepted and silent = a point S4.11 misses; rejected = the rule that covers it.
import { C, act, cmp, ST, body, SP } from "./lib.ts";
const TICK = "const tick = function* () { yield 1; };\n";
const out: ReturnType<typeof C>[] = [
  // an action made in the body (zero arguments, so not a point) that publishes f
  C("b8-local-action", ST() + body(`${SP} const pub = action(() => { s.set(f); }); pub(); ls(f()); xs.push(1);`), { drive: act() }),
  C("b8-local-action-arg", ST() + body(`${SP} const pub = action((g: () => number) => { s.set(g); }); pub(f); ls(f()); xs.push(1);`), { drive: act() }),
  // an action from another cell, zero arguments, that reads a state the body wrote with a recognised point first
  // (only the second publish of f): covered by b7 snap
  // on(...) and JSX made mid-body
  C("b8-on-in-action", TICK + ST() + "const put0 = (s: State<() => number>) => action((q: number) => { s.set(() => q); });\n" + `const put = (s: State<() => number>, lg: State<number>, tick: Events<number>, put0: Action<[number]>) => ({ go: action(() => { const ls = lg.set; ${SP} const l0 = on(tick, put0); ls(f()); xs.push(1); }) });`, { drive: act() }),
  C("b8-jsx-in-action", ST() + body(`${SP} const el = <b data={c}>x</b>; ls(f()); xs.push(1);`), { drive: act() }),
  C("b8-jsx-in-cell", "const a = () => { " + SP + " const el = <b data={c}>x</b>; xs.push(1); return el; };", { show: ["a"] }),
  C("b8-jsx-fn-in-cell", "const a = () => { " + SP + " const el = <b onClick={f}>x</b>; xs.push(1); return el; };", { show: ["a"] }),
  // a value thrown and caught in the same body
  C("b8-throw-caught", ST() + body(`${SP} try { throw new Error(String(f())); } catch (e) { ls(messageOf(e).length); } xs.push(1);`), { drive: act() }),
  // promises made mid-body
  C("b8-promise-resolve", ST() + body(`${SP} const p = Promise.resolve(f); ls(f()); xs.push(1);`), { drive: act() }),
  C("b8-promise-then", ST() + body(`${SP} Promise.resolve(1).then(() => 0); ls(f()); xs.push(1);`), { drive: act() }),
  C("b8-promise-cell", "const a = () => { " + SP + " const p = Promise.resolve(c); xs.push(1); return p; };\nconst b = async (a: Promise<readonly number[]>) => (await a).length;", { show: ["b"] }),
  C("b8-withresolvers", ST() + body(`${SP} const { promise, resolve } = Promise.withResolvers<() => number>(); resolve(f); ls(f()); xs.push(1);`), { drive: act() }),
  // read() after a recognised point: the read is not a give; the write after the point is the S4.11 case
  C("b8-read-only", ST() + body(`${SP} const g = read(s); ls(g()); xs.push(1);`), { drive: act() }),
  // a state's initial value from a state cell
  C("b8-state-initial", "const s = () => { const xs = [0]; const c: readonly number[] = xs; xs.push(1); return state(() => c.length); };\nconst v = (s: () => number) => s();", { show: ["v"] }),
  // freeze(x) and snapshot(x) mid-body
  C("b8-freeze-mid", ST() + body(`${SP} const fz = freeze(xs); ls(fz.length); xs.push(1);`), { drive: act() }),
  C("b8-snapshot-mid", ST() + body(`${SP} const sn = snapshot(xs); ls(sn.length); xs.push(1);`), { drive: act() }),
  // a memoised call inside an action: not a point by S4.11; its arguments reach f, so nothing is stored
  C("b8-memo-in-action", ST() + "const sq = () => memo((o: { readonly n: number }) => o.n);\n" + `const put = (s: State<() => number>, lg: State<number>, sq: (o: { readonly n: number }) => number) => ({ go: action(() => { const ls = lg.set; ${SP} const r = { n: 1, f }; sq(r); ls(f()); xs.push(1); }) });`, { drive: act() }),
  // islands (round 6 a5 forms): a data input and a function input
  C("b8-island-data", "const x = () => [1];\nconst y = (x: readonly number[]) => x.length;\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", { show: ["go"] }),
  C("b8-island-fn", "const x = () => { const xs = [0]; const c: readonly number[] = xs; xs.push(1); return () => c.length; };\nconst y = (x: () => number) => x();\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", { show: ["go"] }),
  // controls, checker skipped
  C("b8-ctl-local-action-P", ST() + body(`${SP} const pub = action(() => { s.set(f); }); pub(); ls(f()); xs.push(1);`), { drive: act(), ctl: true }),
  C("b8-ctl-let", ST() + body("const st = s.set; let n = 1; const f = () => n; st(f); ls(f()); n = 2;"), { drive: act(), ctl: true }),
];
// memo controls and result probes (advisor): a stored result that holds a function, read through a hit from cell b
const MK = (id: string, f: string, ctl = false) => C(`b8-memo-${id}`, `const mk = () => memo((n: number) => { ${f} });\nconst a = (mk: (n: number) => { readonly g: () => number; readonly bump: () => void }) => { const r = mk(1); const before = r.g(); r.bump(); return { before, r }; };\nconst b = (mk: (n: number) => { readonly g: () => number; readonly bump: () => void }) => mk(1);`, {
  drive: async (p: any) => { const a = p.value("a"), b = p.value("b"); if (!a || !b) return `no value (a ${p.status("a")} ${String(p.error?.("a") ?? "").slice(0, 70)})`; if (b !== a.r) return "same: a miss"; return `${b.g() !== a.before ? "DIFF" : "same"} hit: stored result read ${a.before}, now ${b.g()}`; }, ...(ctl ? { ctl } : {}) });
out.push(
  MK("ctl-let", "let k = n; return { g: () => k, bump: () => { k++; } };", true),
  MK("ctl-alias", "const xs = [n]; const c: readonly number[] = xs; return { g: () => c.length, bump: () => { xs.push(1); } };", true),
  MK("helper-c", "const xs = [n]; const c: readonly number[] = xs; const len = () => c.length; return { g: () => len(), bump: () => {} };"),
  MK("deep-holder", "const xs = [n]; const c: { readonly t: { readonly u: readonly number[] } } = { t: { u: xs } }; return { g: () => c.t.u.length, bump: () => {} };"),
  MK("bump-mutparam", "const xs = [n]; const c: readonly number[] = xs; const w = (ys: Mut<number[]>) => { ys.push(1); }; return { g: () => c.length, bump: () => w([0]) };"),
);
export const cands = out;
