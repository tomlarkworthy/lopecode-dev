// p1 (2026-11-23): P of selfhost/freeze-attack6. A body publishes a function before it ends (a state write, an action
// called with arguments, a memoised call), then writes a Mut local that a read-only const the function captures names
// (S4.10 allows the capture). With closure registration on the write throws; with SS_MEASURE_REG=0 it lands. The value
// changes between its publish and the first read by another cell, which observe.ts's end-of-run reading cannot see, so
// each program has a drive (from freeze-attack6/t0.ts) that compares what the function gave when it was published
// (recorded by the program in a state cell lg, or in a cell's value) with what its holder gives after the run, and says
// DIFF when they differ; observe.ts also reads each value the tap (prelude.runtime.ts publishTap) saw published. By
// prefix: p1-s step 1 (two cells disagree); p1-a the action channels; p1-h holders; p1-l writes in a loop, a helper or
// a callback; p1-m memo, read from another cell through a hit; p1-w a publish through a value of plain function type;
// p1-d data (frozen in place, throws in both modes). p1-ctl are controls, run without the checker: p1-ctl-let fires in
// both modes, the others with SS_MEASURE_REG=0 only (P programs kept here so the instrument is shown to see P after
// the checker rejects them); p1-ctl-P-memo-hit fired before S2.13's run-time change (2026-11-23, a miss whose arguments
// reach a function stores nothing) and fires in neither mode since.
type A = { name: string; src: string; ctl?: boolean; drive?: (p: any) => unknown };
const act = (cell = "put", key = "go", holder = "v", given = "w", call = (h: any) => (typeof h === "function" ? h() : h.f ? h.f() : h[0]())) => async (p: any) => {
  const a = p.value(cell), g = typeof a === "function" ? a : a[key];
  try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
  await p.settle(400);
  const h = p.value(holder), w = p.value(given);
  let now: unknown;
  try { now = call(h); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
};
// two cells: v = what s's function gives now, w = what t recorded from s after the publish
const two = async (p: any) => {
  try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 100)}`; }
  await p.settle(400);
  const v = p.value("v"), w = p.value("w");
  return `${v !== w ? "DIFF" : "same"} v = ${v}, w = ${w}`;
};
// memo: cell a calls sq(r) (f wraps its argument), records r.f(), writes; cell b calls sq(a.r). Only a hit (b is the
// result a's call stored) holds what a gave; a miss means nothing was stored, and b's r is a's own published value
const hit = async (p: any) => {
  const a = p.value("a"), b = p.value("b");
  if (!a || !b) return "no value";
  if (b !== a.got) return "same: a miss, nothing was stored";
  let now: unknown;
  try { now = b.o.f(); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${a.before !== now ? "DIFF" : "same"} stored when r.f() was ${a.before}, holds ${now}`;
};
const P = (name: string, src: string, drive: A["drive"], ctl = false): A => ({ name, src, drive, ...(ctl ? { ctl } : {}) });
const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const S2 = "const s = () => state<() => number>(() => -1);\nconst t = () => state(-1);\nconst v = (s: () => number) => s();\nconst w = (t: number) => t;\n";
const body = (b: string) => `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const T = "(o: { readonly n: number }) => { readonly o: { readonly n: number } }";
const AT = "{ readonly before: number; readonly r: { readonly n: number }; readonly got: { readonly o: { readonly n: number } } }";
const SQ = "const sq = () => memo((o: { readonly n: number }) => ({ o }));\n";
const memoP = (setup: string, read: string, write: string) => `${SQ}const a = (sq: ${T}) => { ${setup} const r = { n: 1, f: () => ${read} }; const got = sq(r); const before = r.f(); ${write} return { before, r, got }; };\nconst b = (sq: ${T}, a: ${AT}) => sq(a.r);`;
const H: [string, string, string, string][] = [
  ["arr", "const xs = [0]; const c: readonly number[] = xs;", "c.length", "xs.push(1);"],
  ["arr-index", "const xs = [0]; const c: readonly number[] = xs;", "c[0] ?? -1", "xs[0] = 5;"],
  ["map", "const m = new Map<string, number>(); const c: Map<string, number> = m;", "c.size", "m.set('k', 1);"],
  ["set", "const st = new Set<number>(); const c: Set<number> = st;", "c.size", "st.add(1);"],
  ["rec", "const o = { n: 1 }; const c: { readonly n: number } = o;", "c.n", "o.n = 7;"],
  ["err", "const e = new Error('x'); const c: Error = e;", "c.message.length", "e.message = 'longer';"],
  ["nest", "const xs = [0]; const r0 = { t: xs }; const c: { readonly t: readonly number[] } = r0;", "c.t.length", "xs.push(1);"],
];

export const attacks: A[] = [
  // 1. step 1: an inner action, an update and an action's argument each record f() after the publish; then the write
  P("p1-s-inner-action", S2 + "const snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });\nconst put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { " + SP + " s.set(f); snap(); xs.push(1); }) });", two),
  P("p1-s-update-reads", S2 + "const put = (s: State<() => number>, t: State<number>) => ({ go: action(() => { " + SP + " s.set(f); t.update(() => read(s)()); xs.push(1); }) });", two),
  P("p1-s-inner-arg", S2 + "const rec = (s: State<() => number>, t: State<number>) => action((g: () => number) => { s.set(g); t.set(g()); });\nconst put = (rec: Action<[() => number]>) => ({ go: action(() => { " + SP + " rec(f); xs.push(1); }) });", two),
  // 2. holders, through s.set
  ...H.map(([id, setup, read, write]) => P(`p1-h-${id}`, ST + body(`${setup} const f = () => ${read}; s.set(f); lg.set(f()); ${write}`), act())),
  // 3. channels
  P("p1-a-update", ST + body(`${SP} s.update(() => f); lg.set(f()); xs.push(1);`), act()),
  P("p1-a-record", "const s = () => state<{ readonly f: () => number }>({ f: () => -1 });\nconst lg = () => state(-1);\nconst v = (s: { readonly f: () => number }) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { " + SP + " s.set({ f }); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-a-width", "const s = () => state<{ readonly n: number }>({ n: 0 });\nconst lg = () => state(-1);\nconst v = (s: { readonly n: number }) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<{ readonly n: number }>, lg: State<number>) => ({ go: action(() => { " + SP + " const r = { n: 0, f }; s.set(r); lg.set(f()); xs.push(1); }) });", act("put", "go", "v", "w", (x: any) => x.f())),
  P("p1-a-decl", ST + body("const xs = [0]; const c: readonly number[] = xs; function f() { return c.length; } s.set(f); lg.set(f()); xs.push(1);"), act()),
  P("p1-a-wrap", ST + body(`${SP} const g = () => f() + 0; s.set(g); lg.set(g()); xs.push(1);`), act()),
  P("p1-a-actarg", ST + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { " + SP + " put0(f); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-a-actarg-rec", ST + "const put0 = (s: State<() => number>) => action((r: { readonly f: () => number }) => { s.set(r.f); });\nconst put = (put0: Action<[{ readonly f: () => number }]>, lg: State<number>) => ({ go: action(() => { " + SP + " put0({ f }); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-a-listener", "const tick = function* () { yield 1; };\n" + ST + "const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const xs = [k]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(k); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);",
    async (p: any) => { await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; }),
  P("p1-a-jsx", ST + "const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { " + SP + " s.set(f); lg.set(f()); xs.push(1); })}>x</button>;",
    async (p: any) => { try { p.value("el").props.onClick(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; }),
  // 4. where the write is: a helper, forEach, the next turn of a loop, a nested function, a Mut parameter, a callback
  P("p1-l-helper", ST + body(`${SP} const wr = () => { xs.push(1); }; s.set(f); lg.set(f()); wr();`), act()),
  P("p1-l-foreach", ST + body(`${SP} s.set(f); lg.set(f()); [1].forEach(() => { xs.push(1); });`), act()),
  P("p1-l-loop-next", ST + body(`${SP} for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { xs.push(1); } }`), act()),
  P("p1-l-loop-before", ST + body(`${SP} for (let i = 0; i < 2; i++) { if (i === 1) { xs.push(1); } if (i === 0) { s.set(f); lg.set(f()); } }`), act()),
  P("p1-l-nested-fn", ST + body(`const mk = () => { ${SP} s.set(f); lg.set(f()); xs.push(1); }; mk();`), act()),
  P("p1-l-helper-publishes", ST + body(`${SP} const pub = () => { s.set(f); lg.set(f()); }; pub(); xs.push(1);`), act()),
  P("p1-l-mutparam", ST + body("const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]);"), act()),
  P("p1-l-callback", ST + "const g = (s: State<() => number>, lg: State<number>) => action((cb: (x: Mut<number[]>) => void) => { " + SP + " s.set(f); lg.set(f()); cb(xs); });\nconst put = (g: Action<[(x: Mut<number[]>) => void]>) => ({ go: action(() => { g((x) => { x.push(1); }); }) });", act()),
  P("p1-l-writer-cell", ST + "const wr = () => (x: Mut<number[]>) => { x.push(1); };\nconst g = (s: State<() => number>, lg: State<number>, wr: (x: Mut<number[]>) => void) => ({ go: action(() => { " + SP + " s.set(f); lg.set(f()); wr(xs); }) });", act("g")),
  P("p1-l-take-reader", ST + "const a = () => ({ take: (x: Mut<number[]>) => { const c: readonly number[] = x; return () => c.length; } });\nconst put = (a: { readonly take: (x: Mut<number[]>) => () => number }, s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = [0]; const f = a.take(m); s.set(f); lg.set(f()); m.push(1); }) });", act()),
  // 5. memo: a function rides in the argument by width; another cell's call with the same key gets r from the store
  ...H.filter((h) => ["arr", "map", "rec"].includes(h[0])).map(([id, setup, read, write]) => P(`p1-m-hit-${id}`, memoP(setup, read, write), hit)),
  P("p1-m-local", "const a = () => { const sq = memo((o: { readonly n: number }) => ({ o })); " + SP + " const r = { n: 1, f }; const got = sq(r); const before = r.f(); xs.push(1); return { before, r, got, sq }; };\nconst b = (a: { readonly r: { readonly n: number }; readonly sq: " + T + " }) => a.sq(a.r);", hit),
  P("p1-m-async", SQ + "const a = async (sq: " + T + ") => { " + SP + " const r = { n: 1, f }; const got = sq(r); const before = r.f(); await null; xs.push(1); return { before, r, got }; };\nconst b = (sq: " + T + ", a: " + AT + ") => sq(a.r);", hit),
  // r frozen by a first memoised call before the second takes it (the second walk meets a value frozen earlier)
  P("p1-m-prefrozen", SQ + "const n0 = () => memo((o: { readonly n: number }) => o.n);\nconst a = (sq: " + T + ", n0: (o: { readonly n: number }) => number) => { " + SP + " const r = { n: 1, f }; n0(r); const got = sq(r); const before = r.f(); xs.push(1); return { before, r, got }; };\nconst b = (sq: " + T + ", a: " + AT + ") => sq(a.r);", hit),
  // 6. a publish through a value of plain function type: an action, a state's set, a memoised function
  P("p1-w-action-as-fn", ST + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: (g: () => number) => void, lg: State<number>) => ({ go: action(() => { " + SP + " put0(f); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-w-set-as-fn", ST + "const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { " + SP + " const st = s.set; st(f); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-w-set-cell", ST + "const setter = (s: State<() => number>) => ({ put: (g: () => number) => s.set(g) });\nconst put = (setter: { readonly put: (g: () => number) => void }, lg: State<number>) => ({ go: action(() => { " + SP + " setter.put(f); lg.set(f()); xs.push(1); }) });", act()),
  P("p1-w-memo-input", SQ + "const a = (sq: " + T + ") => { const run = (q: " + T + ") => { " + SP + " const r = { n: 1, f }; const got = q(r); const before = r.f(); xs.push(1); return { before, r, got }; }; return run(sq); };\nconst b = (sq: " + T + ", a: " + AT + ") => sq(a.r);", hit),
  // 7. data, not a function: frozen in place at the publish, the write throws in both modes (not silent)
  P("p1-d-set", "const s = () => state<readonly number[]>([]);\nconst lg = () => state(-1);\nconst v = (s: readonly number[]) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<readonly number[]>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; s.set(c); lg.set(c.length); xs.push(1); }) });", act("put", "go", "v", "w", (x: any) => x.length)),
  // controls (checker skipped)
  P("p1-ctl-let", ST + body("let n = 1; const f = () => n; s.set(f); lg.set(f()); n = 2;"), act(), true),
  P("p1-ctl-P-action", ST + body(`${SP} s.set(f); lg.set(f()); xs.push(1);`), act(), true),
  P("p1-ctl-P-inner-arg", S2 + "const rec = (s: State<() => number>, t: State<number>) => action((g: () => number) => { s.set(g); t.set(g()); });\nconst put = (rec: Action<[() => number]>) => ({ go: action(() => { " + SP + " rec(f); xs.push(1); }) });", two, true),
  P("p1-ctl-P-memo-hit", memoP("const xs = [0]; const c: readonly number[] = xs;", "c.length", "xs.push(1);"), hit, true),
  P("p1-ctl-P-loop", ST + body(`${SP} for (let i = 0; i < 2; i++) { if (i === 1) { xs.push(1); } if (i === 0) { s.set(f); lg.set(f()); } }`), act(), true),
];
