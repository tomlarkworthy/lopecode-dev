// t1 (target 3): publishes other than set / update / an action call, checker on (and skipped). Each program has a
// second cell or a state holding the earlier reading; the gap forms use a capture named i (r2) so that registration
// cannot be what stops the write.
import { C } from "./lib.ts";
import { driveG } from "./lib.ts";
const S = (t: string, i: string) => `const s = () => state<${t}>(${i});\nconst lg = () => state(-1);\nconst v = (s: ${t}) => s;\nconst w = (lg: number) => lg;\n`;
const settle = (holder = "v", given = "w", cmp = true) => async (p: any) => {
  await p.settle(400);
  const h = p.value(holder), g = p.value(given);
  let now: unknown; try { now = typeof h === "function" ? h() : h?.f ? h.f() : h; } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${cmp && g !== undefined && g !== -1 && JSON.stringify(now) !== JSON.stringify(g) ? "DIFF" : "same"} ${given} ${JSON.stringify(g)} ${holder} reads ${JSON.stringify(now)} (${p.status(holder)}${p.status(holder) === "rejected" ? " " + String(p.error?.(holder)).slice(0, 80) : ""})`;
};
const call = (cell: string, key: string | null, then = settle()) => async (p: any) => {
  const a = p.value(cell); const g = key ? a?.[key] : a;
  if (typeof g !== "function") return `no action (${p.status(cell)} ${String(p.error?.(cell) ?? "").slice(0, 100)})`;
  let t = ""; try { g(); } catch (e) { t = `call threw: ${(e as Error).message.slice(0, 120)}; `; }
  return t + (await then(p));
};
const SPIN = "for (let n = 0; n < 300; n++) await null;";
export const cands = [
  // async cell: the only body that may use a Mut across an await; it publishes once, at its return
  C("t1-async-cell-write-before-return", "const a = async () => { const xs = [0]; const i: readonly number[] = xs; const out = { f: () => i.length }; " + SPIN + " xs.push(1); return out; };\nconst w = (a: { readonly f: () => number }) => a.f();", { drive: settle("a", "w") }),
  C("t1-async-cell-return-then-nothing", "const a = async () => { const xs = [0]; const i: readonly number[] = xs; " + SPIN + " return { f: () => i.length }; };\nconst w = (a: { readonly f: () => number }) => a.f();", { drive: settle("a", "w") }),
  C("t1-async-cell-memo-arg", "const g = () => memo((r: readonly number[]) => r.length);\nconst a = async (g: (r: readonly number[]) => number) => { const xs = [0]; const k = g(xs); " + SPIN + " xs.push(1); return k; };", { show: ["a"] }),
  C("t1-async-cell-memo-arg-alias", "const g = () => memo((r: readonly number[]) => r.length);\nconst a = async (g: (r: readonly number[]) => number) => { const xs = [0]; const k = g(xs); " + SPIN + " const ys = xs; ys.push(1); return k + g(xs); };\nconst b = (g: (r: readonly number[]) => number) => g([0]);", { show: ["a", "b"] }),
  // generator cells (Events) and listeners
  C("t1-gen-listener-fn", S("() => number", "() => -1") + "const ev = function* (): Generator<() => number> { const xs = [0]; const i: readonly number[] = xs; yield () => i.length; };\nconst put = (s: State<() => number>, lg: State<number>) => action((g: () => number) => { s.set(g); lg.set(g()); });\nconst l = (ev: Events<() => number>, put: Action<[() => number]>) => on(ev, put);", { drive: settle() }),
  C("t1-gen-listener-data", S("readonly number[]", "[]") + "const ev = function* (): Generator<readonly number[]> { while (true) { const xs = [0]; yield xs; } };\nconst put = (s: State<readonly number[]>, lg: State<number>) => action((g: readonly number[]) => { s.set(g); lg.set(g.length); });\nconst l = (ev: Events<readonly number[]>, put: Action<[readonly number[]]>) => on(ev, put);", { drive: async (p: any) => { await p.settle(400); return `v ${JSON.stringify(p.value("v"))} w ${p.value("w")}`; } }),
  C("t1-gen-plain-reader-i", "const g = function* () { const xs = [0]; const i: readonly number[] = xs; yield { f: () => i.length }; };\nconst w = (g: { readonly f: () => number }) => g.f();", { drive: driveG }),
  C("t1-gen-loop-i", "const g = function* () { for (const n of [0, 1]) { const xs = [n]; const i: readonly number[] = xs; xs.push(n); yield { f: () => i.length }; } };\nconst w = (g: { readonly f: () => number }) => g.f();", { drive: driveG, twice: ["g"] }),
  // state initial values
  C("t1-state-initial-i", "const s = () => { const xs = [0]; const i: readonly number[] = xs; return state<{ readonly f: () => number }>({ f: () => i.length }); };\nconst v = (s: { readonly f: () => number }) => s.f();", { show: ["s", "v"] }),
  C("t1-state-initial-read-set", S("{ readonly f: () => number }", "{ f: () => -1 }") + "const t = () => { const xs = [0]; const i: readonly number[] = xs; return state<{ readonly f: () => number }>({ f: () => i.length }); };\nconst put = (t: State<{ readonly f: () => number }>, s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const r = read(t); s.set(r); lg.set(r.f()); }) });", { drive: call("put", "go") }),
  // memo results and keys
  C("t1-memo-result-alias-arg", "const g = () => memo((r: readonly number[]) => ({ r }));\nconst a = (g: (r: readonly number[]) => { readonly r: readonly number[] }) => { const xs = [0]; const o = g(xs); const n = o.r.length; return { o, n }; };\nconst b = (g: (r: readonly number[]) => { readonly r: readonly number[] }, a: { readonly o: { readonly r: readonly number[] } }) => g(a.o.r).r.length;", { show: ["a", "b"] }),
  C("t1-memo-result-local-fn-i", "const g = () => memo((n: number) => { const xs = [n]; const i: readonly number[] = xs; return { f: () => i.length }; });\nconst a = (g: (n: number) => { readonly f: () => number }) => { const r = g(1); return { r, n: r.f() }; };\nconst b = (g: (n: number) => { readonly f: () => number }) => g(1).f();", { show: ["a", "b"] }),
  C("t1-memo-key-written-after-hit", "const g = () => memo((r: readonly number[]) => r.length);\nconst a = (g: (r: readonly number[]) => number) => { const xs = [0]; const k1 = g(xs); const ys = xs; let t = 'ok'; try { ys.push(1); } catch { t = 'threw'; } return { k1, k2: g(xs), t }; };", { show: ["a"] }),
  C("t1-memo-in-action-key-alias", S("number", "-1") + "const g = () => memo((r: readonly number[]) => r.length);\nconst put = (g: (r: readonly number[]) => number, s: State<number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; s.set(g(xs)); const ys = xs; ys.push(1); lg.set(g(xs)); }) });", { drive: call("put", "go", async (p: any) => { await p.settle(300); return `s ${p.value("v")} lg ${p.value("w")}`; }) }),
  // read() inside an action
  C("t1-read-after-set-then-alias-write", S("readonly number[]", "[]") + "const put = (s: State<readonly number[]>, lg: State<number>) => ({ go: action(() => { const xs = [0]; s.set(xs); const r = read(s); const ys = xs; ys.push(1); lg.set(r.length); }) });", { drive: call("put", "go") }),
  // thrown values: an inner action throws an Error carrying data, the outer catches and stores it
  C("t1-thrown-error-data", S("Error", "new Error('init')") + "const inner = () => action(() => { const xs = [0]; const e = new Error('x', { cause: xs }); throw e; });\nconst put = (inner: Action<[]>, s: State<Error>, lg: State<number>) => ({ go: action(() => { try { inner(); } catch (e) { if (e instanceof Error) { s.set(e); lg.set(1); } } }) });", { drive: call("put", "go", settle("v", "w", false)) }),
  C("t1-thrown-record-to-drive", "const inner = () => action(() => { const xs = [0]; throw { xs }; });", { drive: async (p: any) => { try { p.value("inner")(); } catch (e: any) { return `drive caught ${JSON.stringify(e)} frozen=${Object.isFrozen(e)} xs frozen=${Object.isFrozen(e?.xs)}`; } return "no throw"; } }),
  C("t1-action-return-to-drive", "const put = () => action(() => { const xs = [0]; const i: readonly number[] = xs; return { f: () => i.length, xs }; });", { drive: async (p: any) => { const r = p.value("put")(); return `drive got ${JSON.stringify({ n: r?.f?.() })} frozen=${Object.isFrozen(r)} xs frozen=${Object.isFrozen(r?.xs)}`; } }),
  // JSX element props: frozen shallowly by h at creation; data inside is frozen when the element is published
  C("t1-jsx-prop-data", "const a = () => { const xs = [0]; const el = <div title={String(xs.length)}>{xs.length}</div>; return el; };", { show: ["a"] }),
  C("t1-jsx-handler-i", "const go = () => action(() => {});\nconst a = (go: Action<[]>) => { const xs = [0]; const i: readonly number[] = xs; return { el: <button onClick={go}>{i.length}</button>, f: () => i.length }; };\nconst w = (a: { readonly f: () => number }) => a.f();", { drive: settle("a", "w") }),
  // islands (compile): arguments and results cross by copy
  C("t1-island-data", "const x = () => [1];\nconst y = (x: readonly number[]) => x.length;\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", { show: ["go"] }),
  C("t1-island-fn-out", "const x = () => [1];\nconst y = (x: readonly number[]) => () => x.length;\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", { show: ["go"] }),
  C("t1-island-fn-in", "const x = () => () => 1;\nconst y = (x: () => number) => x();\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", { show: ["go"] }),
  // a promise in a cell value: frozen when it settles (copy q = p.then(published))
  C("t1-promise-in-value-i", "const a = () => { const xs = [0]; const i: readonly number[] = xs; return { p: Promise.resolve({ f: () => i.length }) }; };", { show: ["a"] }),
  C("t1-promise-settles-after-write-async", "const a = async () => { const xs = [0]; const i: readonly number[] = xs; const p = Promise.resolve(0); " + SPIN + " return { p, f: () => i.length }; };", { show: ["a"] }),
  // functions that read a state when called (not a freeze route: reported as what it is)
  C("t1-fn-capability-clock", "const a = (now: Clock) => ({ f: () => now() });\nconst w = (a: { readonly f: () => number }) => a.f();", { drive: settle("a", "w") }),
  C("t1-fn-capability-random", "const a = (random: Random) => ({ f: () => random() });\nconst w = (a: { readonly f: () => number }) => a.f();", { drive: settle("a", "w") }),
];
// controls, checker skipped: a generator's direct write after the yield (fires with REG=0 only) and a let (every mode)
cands.push(
  C("t1-ctl-G-c-direct", "const g = function* () { const xs = [0]; const c: readonly number[] = xs; yield { f: () => c.length }; xs.push(1); };\nconst w = (g: { readonly f: () => number }) => g.f();", { drive: driveG, ctl: true }),
  C("t1-ctl-G-let", "const g = function* () { let n = 1; yield { f: () => n }; n = 2; };\nconst w = (g: { readonly f: () => number }) => g.f();", { drive: driveG, ctl: true }),
);
