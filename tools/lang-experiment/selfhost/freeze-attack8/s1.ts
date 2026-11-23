// s1 (target 2): S4.12's run-time test (madeFnIn: a function or promise PUBLISHED by no finished body throws at set,
// update and an action call). Checker on. Outcomes: a throw (S4.12) where the function really was made in a running
// body is correct; a throw where a finished cell made it is an over-throw (fail-closed); a silent run is a break.
import { C } from "./lib.ts";
const S = (t: string, i: string) => `const s = () => state<${t}>(${i});\nconst lg = () => state(-1);\nconst v = (s: ${t}) => s;\nconst w = (lg: number) => lg;\n`;
const FT = "() => number";
const act = (cell = "put", key = "go") => async (p: any) => {
  const a = p.value(cell); const g = typeof a === "function" ? a : a?.[key];
  if (typeof g !== "function") return `no action (${p.status(cell)} ${String(p.error?.(cell) ?? "").slice(0, 120)})`;
  try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 160)}`; }
  await p.settle(300);
  const h = p.value("v"), w = p.value("w");
  let now: unknown; try { now = typeof h === "function" ? h() : h?.f ? h.f() : h; } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `stored: lg (a marker or a reading taken in the body) ${JSON.stringify(w)}, holder reads ${JSON.stringify(now)}`;
};
const P = (b: string, ins = "s: State<() => number>, lg: State<number>") => `const put = (${ins}) => ({ go: action(() => { ${b} }) });`;
export const cands = [
  // functions a finished cell made: allowed (no over-throw expected)
  C("s1-finished-arrow", S(FT, "() => -1") + "const a = () => { const xs = [0]; const c: readonly number[] = xs; return () => c.length; };\n" + P("s.set(a); lg.set(a());", "a: () => number, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-finished-record-fn", S(FT, "() => -1") + "const a = () => ({ f: () => 7 });\n" + P("s.set(a.f); lg.set(a.f());", "a: { readonly f: () => number }, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-finished-captured-fn", S(FT, "() => -1") + "const a = () => { const h = () => 3; return { f: () => h }; };\n" + P("const h = a.f(); s.set(h); lg.set(h());", "a: { readonly f: () => () => number }, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-finished-captured-fn-i-gap", S(FT, "() => -1") + "const a = () => { const i = () => 3; return { f: () => i }; };\n" + P("const h = a.f(); s.set(h); lg.set(h());", "a: { readonly f: () => () => number }, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-finished-captured-fn-sh-gap", S(FT, "() => -1") + "const a = () => { const ss_closure = <T,>(f: T, t: unknown): T => f; const h = () => 3; return { f: () => h }; };\n" + P("const h = a.f(); s.set(h); lg.set(h());", "a: { readonly f: () => () => number }, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-state-initial-fn", S(FT, "() => 4") + "const t = () => state<() => number>(() => -1);\n" + P("const g = read(s); t.set(g); lg.set(g());", "s: State<() => number>, t: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-async-cell-fn", S(FT, "() => -1") + "const a = async () => { await null; const xs = [0]; const c: readonly number[] = xs; return { f: () => c.length }; };\n" + P("s.set(a.f); lg.set(a.f());", "a: { readonly f: () => number }, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-action-input-stored", S("Action<[]>", "action(() => {})") + "const d = () => action(() => {});\n" + P("s.set(d); lg.set(1);", "d: Action<[]>, s: State<Action<[]>>, lg: State<number>"), { drive: act() }),
  C("s1-generator-yield-fn-listener", S(FT, "() => -1") + "const ev = function* (): Generator<() => number> { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; };\nconst put = (s: State<() => number>, lg: State<number>) => action((g: () => number) => { s.set(g); lg.set(g()); });\nconst l = (ev: Events<() => number>, put: Action<[() => number]>) => on(ev, put);", { drive: async (p: any) => { await p.settle(300); return `holder reads ${JSON.stringify(p.value("v")?.())} lg ${p.value("w")}`; } }),
  // memo results: made by a finished body, but never PUBLISHED (deepFreeze at the store, DONE, not walked again)
  C("s1-memo-result-fn-cell", S("{ readonly f: () => number }", "{ f: () => -1 }") + "const g = () => memo((n: number) => ({ f: () => n }));\nconst a = (g: (n: number) => { readonly f: () => number }) => g(1);\n" + P("s.set(a); lg.set(a.f());", "a: { readonly f: () => number }, s: State<{ readonly f: () => number }>, lg: State<number>"), { drive: act() }),
  C("s1-memo-in-cell-result", S("{ readonly f: () => number }", "{ f: () => -1 }") + "const a = () => { const g = memo((n: number) => ({ f: () => n })); return g(1); };\n" + P("s.set(a); lg.set(a.f());", "a: { readonly f: () => number }, s: State<{ readonly f: () => number }>, lg: State<number>"), { drive: act() }),
  C("s1-memo-in-action", S("{ readonly f: () => number }", "{ f: () => -1 }") + "const g = () => memo((n: number) => ({ f: () => n }));\n" + P("const r = g(2); s.set(r); lg.set(r.f());", "g: (n: number) => { readonly f: () => number }, s: State<{ readonly f: () => number }>, lg: State<number>"), { drive: act() }),
  C("s1-memo-result-data", S("{ readonly n: number }", "{ n: -1 }") + "const g = () => memo((n: number) => ({ n }));\n" + P("const r = g(2); s.set(r); lg.set(r.n);", "g: (n: number) => { readonly n: number }, s: State<{ readonly n: number }>, lg: State<number>"), { drive: act() }),
  // made in the running body: S4.12 should throw
  C("s1-body-arrow", S(FT, "() => -1") + P("const st = s.set; const xs = [0]; const c: readonly number[] = xs; st(() => c.length);"), { drive: act() }),
  C("s1-helper-made", S(FT, "() => -1") + "const mk = () => (n: number) => () => n;\n" + P("s.set(mk(3)); lg.set(1);", "mk: (n: number) => () => number, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-published-returns-fresh", S(FT, "() => -1") + "const mk = () => { const k = 1; return (n: number) => () => n + k; };\n" + P("const f = mk(3); s.set(f); lg.set(f());", "mk: (n: number) => () => number, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-inner-action-returns-fn", S(FT, "() => -1") + "const mk = () => action((): (() => number) => () => 5);\n" + P("const f = mk(); s.set(f); lg.set(f());", "mk: Action<[], () => number>, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-nested-action-arg", S(FT, "() => -1") + "const inner = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\n" + P("const xs = [0]; const c: readonly number[] = xs; const r = { g: () => c.length }; inner(r.g); lg.set(1);", "inner: Action<[() => number]>, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-nested-action-published-arg", S(FT, "() => -1") + "const a = () => () => 9;\nconst inner = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\n" + P("inner(a); lg.set(a());", "a: () => number, inner: Action<[() => number]>, s: State<() => number>, lg: State<number>"), { drive: act() }),
  C("s1-update-returns-fn", S(FT, "() => -1") + P("const up = s.update; const xs = [0]; const c: readonly number[] = xs; up(() => () => c.length);"), { drive: act() }),
  C("s1-update-returns-old", S(FT, "() => 6") + P("s.update((old) => old); lg.set(1);"), { drive: act() }),
  C("s1-fn-in-error-cause", S("Error", "new Error('x')") + P("const e = new Error('m', { cause: () => 1 }); s.set(e); lg.set(1);", "s: State<Error>, lg: State<number>"), { drive: act() }),
  C("s1-fn-in-map", S("Map<number, () => number>", "new Map()") + P("const m = new Map([[1, () => 2]]); s.set(m); lg.set(1);", "s: State<Map<number, () => number>>, lg: State<number>"), { drive: act() }),
  C("s1-fn-as-map-key", S("Map<() => number, number>", "new Map()") + P("const m = new Map([[() => 2, 1]]); s.set(m); lg.set(1);", "s: State<Map<() => number, number>>, lg: State<number>"), { drive: act() }),
  C("s1-fn-in-set", S("Set<() => number>", "new Set()") + P("s.set(new Set([() => 2])); lg.set(1);", "s: State<Set<() => number>>, lg: State<number>"), { drive: act() }),
  C("s1-fn-width-record", S("{ readonly n: number }", "{ n: -1 }") + P("const r = { n: 1, g: () => 2 }; s.set(r); lg.set(1);", "s: State<{ readonly n: number }>, lg: State<number>"), { drive: act() }),
  C("s1-promise-body", S("Promise<number>", "Promise.resolve(-1)") + P("s.set(Promise.resolve(1)); lg.set(1);", "s: State<Promise<number>>, lg: State<number>"), { drive: act() }),
  C("s1-promise-finished", S("Promise<number>", "Promise.resolve(-1)") + "const pa = () => ({ p: Promise.resolve(3) });\n" + P("s.set(pa.p); lg.set(1);", "pa: { readonly p: Promise<number> }, s: State<Promise<number>>, lg: State<number>"), { drive: act() }),
  C("s1-async-fn-result", S("Promise<number>", "Promise.resolve(-1)") + P("const h = async () => 1; s.set(h()); lg.set(1);", "s: State<Promise<number>>, lg: State<number>"), { drive: act() }),
  C("s1-thenable", S("{ readonly then: (r: (n: number) => void) => void }", "{ then: (r: (n: number) => void) => r(0) }") + P("s.set({ then: (r: (n: number) => void) => r(1) }); lg.set(1);", "s: State<{ readonly then: (r: (n: number) => void) => void }>, lg: State<number>"), { drive: act() }),
  // caught S4.12 throws: nothing half stored, the call still commits its other writes
  C("s1-caught-then-data", S("number", "-1") + "const f2 = () => state<() => number>(() => -1);\n" + P("const xs = [0]; const c: readonly number[] = xs; const st = f2.set; try { st(() => c.length); } catch { lg.set(5); } s.set(2);", "s: State<number>, f2: State<() => number>, lg: State<number>"), { drive: act(), show: ["f2", "s", "lg"] }),
  C("s1-caught-action-arg", S("number", "-1") + "const inner = (s: State<number>) => action((g: () => number) => { s.set(g()); });\n" + P("const xs = [7]; const c: readonly number[] = xs; const g = () => c.length; const r = { g }; try { inner(r.g); } catch { lg.set(5); }", "inner: Action<[() => number]>, s: State<number>, lg: State<number>"), { drive: act(), show: ["s", "lg"] }),
  C("s1-caught-update", S(FT, "() => -1") + P("const up = s.update; try { up(() => () => 3); } catch { lg.set(5); }"), { drive: act(), show: ["s", "lg"] }),
  C("s1-caught-in-update-fn", S("number", "-1") + "const f2 = () => state<() => number>(() => -1);\n" + P("s.update((n) => { const st = f2.set; try { st(() => 1); } catch { return 9; } return n; }); lg.set(1);", "s: State<number>, f2: State<() => number>, lg: State<number>"), { drive: act(), show: ["s", "f2"] }),
  // re-entrancy
  C("s1-action-in-memo", S("number", "-1") + "const inner = (s: State<number>) => action(() => { s.set(1); });\nconst g = (inner: Action<[]>) => memo((n: number) => { inner(); return n; });\n" + P("g(1); lg.set(1);", "g: (n: number) => number, lg: State<number>"), { drive: act() }),
  C("s1-read-in-memo", S("number", "3") + "const g = (s: State<number>) => memo((n: number) => n + read(s));\n" + P("lg.set(g(1));", "g: (n: number) => number, lg: State<number>"), { drive: act() }),
  // functions reading a state through read(): published by a finished cell, read differently once s changes
  C("s1-fn-reads-state", S(FT, "() => -1") + "const n0 = () => state(1);\nconst rd = (n0: State<number>) => () => read(n0);\n" + P("s.set(rd); lg.set(rd());", "rd: () => number, s: State<() => number>, lg: State<number>") + "\nconst bump = (n0: State<number>) => action(() => { n0.set(2); });", { drive: async (p: any) => { const r = await act()(p); try { p.value("bump")(); } catch (e) { return r + ` bump threw ${(e as Error).message.slice(0, 60)}`; } await p.settle(300); let now: unknown; try { now = p.value("v")(); } catch (e) { now = `v() throws ${(e as Error).message.slice(0, 80)}`; } return `${r}; after bump holder reads ${JSON.stringify(now)}`; } }),
];
// controls, checker skipped (lib2 A form): the direct write fires only with S4.12 and registration both off; the let
// fires whenever S4.12 is off
import { A, driveA } from "./lib2.ts";
cands.push(
  C("s1-ctl-A-c-direct", A("const xs = [0]; const c: readonly number[] = xs;", "const F = () => c.length;"), { drive: driveA, ctl: true }),
  C("s1-ctl-A-let", A("const xs = [0];", "let n = 1; const F = () => n + 0 * xs.length; n = 1;").replace("st(F); ls(F()); xs.push(1);", "st(F); ls(F()); n = 2;"), { drive: driveA, ctl: true }),
);
