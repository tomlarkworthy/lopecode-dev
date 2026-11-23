// b5 (item 5): publish points S4.11 may not list, and the channels of round 6 a5/a6 with the b1/b4 routes.
import { C, act, cmp, ST, body, SP } from "./lib.ts";
const TICK = "const tick = function* () { yield 1; };\n";
const LIS = (b: string) => TICK + ST() + `const put = (s: State<() => number>, lg: State<number>) => action((q: number) => { const ls = lg.set; ${b} });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);`;
const JSX = (b: string) => ST() + `const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { const ls = lg.set; ${b} })}>x</button>;`;
const click = async (p: any) => { try { p.value("el").props.onClick(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } return cmp()(p); };
const out: ReturnType<typeof C>[] = [
  // listeners: an action run by on(events, action) for each event value
  C("b5-lis-direct", LIS(`${SP} s.set(f); ls(f()); xs.push(q);`), { drive: cmp() }),
  C("b5-lis-st", LIS(`const st = s.set; ${SP} st(f); ls(f()); xs.push(q);`), { drive: cmp() }),
  C("b5-lis-destr", LIS(`${SP} const { set } = s; set(f); ls(f()); xs.push(q);`), { drive: cmp() }),
  C("b5-lis-alias-after", LIS(`${SP} s.set(f); ls(f()); const ys = xs; ys.push(q);`), { drive: cmp() }),
  C("b5-lis-getter", LIS(`${SP} const get = () => xs; s.set(f); ls(f()); get().push(q);`), { drive: cmp() }),
  C("b5-lis-foreach", LIS(`${SP} [0, 1].forEach((i) => { if (i === 1) xs.push(q); if (i === 0) { s.set(f); ls(f()); } });`), { drive: cmp() }),
  C("b5-lis-event-rec", TICK.replace("yield 1", "yield { n: 1 }").replace("function* ()", "function* (): Generator<{ readonly n: number }>") + ST() + "const put = (s: State<() => number>, lg: State<number>) => action((e: { readonly n: number }) => { const ls = lg.set; const st = s.set; const xs = [e.n]; const c: readonly number[] = xs; const f = () => c.length; st(f); ls(f()); xs.push(e.n); });\nconst l = (tick: Events<{ readonly n: number }>, put: Action<[{ readonly n: number }]>) => on(tick, put);", { drive: cmp() }),
  // an action made in a cell body that captures a read-only alias, given to on(), then the Mut written by alias
  C("b5-on-cell-alias-after", TICK + ST() + "const l = (tick: Events<number>, s: State<() => number>, lg: State<number>) => { " + SP + " const a = action((q: number) => { s.set(f); lg.set(f()); }); const r = on(tick, a); const ys = xs; ys.push(1); return r; };", { drive: cmp() }),
  C("b5-on-cell-direct", TICK + ST() + "const l = (tick: Events<number>, s: State<() => number>, lg: State<number>) => { " + SP + " const a = action((q: number) => { s.set(f); lg.set(f()); }); const r = on(tick, a); xs.push(1); return r; };", { drive: cmp() }),
  // JSX handlers
  C("b5-jsx-direct", JSX(`${SP} s.set(f); ls(f()); xs.push(1);`), { drive: click }),
  C("b5-jsx-st", JSX(`const st = s.set; ${SP} st(f); ls(f()); xs.push(1);`), { drive: click }),
  C("b5-jsx-alias-after", JSX(`${SP} s.set(f); ls(f()); const ys = xs; ys.push(1);`), { drive: click }),
  C("b5-jsx-getter", JSX(`${SP} const get = () => xs; s.set(f); ls(f()); get().push(1);`), { drive: click }),
  C("b5-jsx-computed", JSX(`${SP} s['set'](f); ls(f()); xs.push(1);`), { drive: click }),
  // update with an updater that captures, read back with read()
  C("b5-update-alias-after", ST() + body(`${SP} s.update((old) => f); ls(read(s)()); const ys = xs; ys.push(1);`), { drive: act() }),
  C("b5-update-old-alias", ST() + body(`${SP} s.update((old) => (old() > 99 ? old : f)); ls(f()); const ys = xs; ys.push(1);`), { drive: act() }),
  C("b5-read-after", ST() + body(`${SP} s.set(f); const g = read(s); ls(g()); const ys = xs; ys.push(1);`), { drive: act() }),
  // generator cells (S5.6): yield, then an alias, a getter or a callback loop
  C("b5-gen-alias-after", "const ev = function* (): Generator<number> { " + SP + " yield f(); const ys = xs; ys.push(1); yield f(); };\nconst t = () => state(-1);", {}),
  C("b5-gen-fn-alias-after", ST() + "const ev = function* (): Generator<() => number> { " + SP + " yield f; const ys = xs; ys.push(1); };\nconst put = (s: State<() => number>, lg: State<number>) => action((g: () => number) => { s.set(g); lg.set(g()); });\nconst l = (ev: Events<() => number>, put: Action<[() => number]>) => on(ev, put);", { drive: cmp() }),
  C("b5-gen-fn-getter", ST() + "const ev = function* (): Generator<() => number> { " + SP + " const get = () => xs; yield f; get().push(1); };\nconst put = (s: State<() => number>, lg: State<number>) => action((g: () => number) => { s.set(g); lg.set(g()); });\nconst l = (ev: Events<() => number>, put: Action<[() => number]>) => on(ev, put);", { drive: cmp() }),
  C("b5-gen-fn-forof", ST() + "const ev = function* (): Generator<() => number> { " + SP + " yield f; for (const y of [xs]) y.push(1); };\nconst put = (s: State<() => number>, lg: State<number>) => action((g: () => number) => { s.set(g); lg.set(g()); });\nconst l = (ev: Events<() => number>, put: Action<[() => number]>) => on(ev, put);", { drive: cmp() }),
  C("b5-gen-rec-alias-after", ST("{ readonly f: () => number }", "{ f: () => -1 }") + "const ev = function* (): Generator<{ readonly f: () => number }> { " + SP + " yield { f }; const ys = xs; ys.push(1); };\nconst put = (s: State<{ readonly f: () => number }>, lg: State<number>) => action((g: { readonly f: () => number }) => { s.set(g); lg.set(g.f()); });\nconst l = (ev: Events<{ readonly f: () => number }>, put: Action<[{ readonly f: () => number }]>) => on(ev, put);", { drive: cmp() }),
  // async cell body (S5.7): only its return publishes; writes after an await by alias
  C("b5-async-alias", "const a = async () => { " + SP + " await null; const ys = xs; ys.push(1); return f; };\nconst b = (a: () => number) => a();", { show: ["b"] }),
  C("b5-async-nested-alias", "const a = async () => { " + SP + " const g = async () => { await null; const ys = xs; ys.push(1); }; const p = g(); await p; return f; };\nconst b = (a: () => number) => a();", { show: ["b"] }),
  C("b5-async-memo-alias", "const sq = () => memo((o: { readonly n: number }) => ({ o }));\nconst a = async (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { " + SP + " const r = { n: 1, f }; const got = sq(r); const before = r.f(); await null; const ys = xs; ys.push(1); return { before, r, got }; };\nconst b = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }, a: { readonly before: number; readonly r: { readonly n: number }; readonly got: { readonly o: { readonly n: number } } }) => sq(a.r);", {
    drive: async (p: any) => { await p.settle(400); const a = p.value("a"), b = p.value("b"); if (!a || !b) return "no value"; return b !== a.got ? "same: a miss, nothing was stored" : `${a.before !== b.o.f() ? "DIFF" : "same"} hit`; } }),
  // a state's initial value: published at the state cell's return, after the writes
  C("b5-state-initial", "const s = () => { " + SP + " const st0 = state(f); const ys = xs; ys.push(1); return st0; };\nconst v = (s: () => number) => s();", { show: ["v"] }),
  // thrown values caught by the caller action
  C("b5-throw-caught", ST() + "const bad = () => action(() => { const xs = [0]; throw new Error(String(xs.length)); });\nconst put = (s: State<() => number>, lg: State<number>, bad: Action<[]>) => ({ go: action(() => { const ls = lg.set; " + SP + " try { bad(); } catch (e) { messageOf(e); } s.set(f); ls(f()); const ys = xs; ys.push(1); }) });", { drive: act() }),
  // an inner action given f by name with a recognised point, then an alias write
  C("b5-inner-action-alias", ST() + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; " + SP + " put0(f); ls(f()); const ys = xs; ys.push(1); }) });", { drive: act() }),
  C("b5-inner-action-getter", ST() + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; " + SP + " const get = () => xs; put0(f); ls(f()); get().push(1); }) });", { drive: act() }),
  C("b5-inner-action-foreach", ST() + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; " + SP + " [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { put0(f); ls(f()); } }); }) });", { drive: act() }),
  // a promise holding f given to a laundered setter
  C("b5-promise-state", ST("Promise<() => number>", "Promise.resolve(() => -1)") + body(`const st = s.set; ${SP} st(Promise.resolve(f)); ls(f()); xs.push(1);`, "Promise<() => number>"), { drive: async (p: any) => { const g = p.value("put").go; try { g(); } catch (e) { return `threw ${(e as Error).message}`; } await p.settle(400); const pr = p.value("v"); const h = await pr; return `${h() !== p.value("w") ? "DIFF" : "same"} given ${p.value("w")} holds ${h()}`; } }),
  // an island (compile) taking a function cell
  C("b5-island-fn", "const a = () => { " + SP + " return f; };\nconst isl = (a: () => number) => compile({ a }, 'const b = (a: () => number) => a();');", { show: ["isl"] }),
  C("b5-ctl-let-lis", LIS("const st = s.set; let n = 1; const f = () => n; st(f); ls(f()); n = 2;"), { drive: cmp(), ctl: true }),
  C("b5-ctl-P-lis", LIS(`${SP} s.set(f); ls(f()); xs.push(q);`), { drive: cmp(), ctl: true }),
];
export const cands = out;
