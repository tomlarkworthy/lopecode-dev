// a3: Mut in a function's parameter, across cells (S4.4 keeps it; S5.8 does not walk it). Producer a publishes data d
// and functions with Mut-typed callback or data parameters; consumers pass writers or values. The harness's CHANGED
// check covers every cell value observed before the consumers ran. Rows ending -P publish mid-call in an action.
import { C } from "../freeze-attack3/harness.ts";
import { act } from "./t0.ts";
const D = "d: [1, 2]";
const R = "\nconst r = (a: { readonly d: readonly number[] }) => () => a.d.length;";
const out: ReturnType<typeof C>[] = [];
const add = (n: string, s: string, x: any = {}) => out.push(C(`a3-${n}`, s, x));
add("fresh-cb", `const a = () => ({ ${D}, run: (cb: (x: Mut<number[]>) => void) => { const xs = [0]; cb(xs); return xs.length; } });\nconst b = (a: { readonly run: (cb: (x: Mut<number[]>) => void) => number }) => a.run((x) => { x.push(1); });` + R);
add("fresh-cb-unann", `const a = () => ({ ${D}, run: (cb: (x: Mut<number[]>) => void) => { const xs = [0]; cb(xs); return xs.length; } });\nconst b = (a) => a.run((x) => { x.push(1); });` + R);
add("fresh-cb-kept-reader", `const a = () => ({ ${D}, run: (cb: (x: Mut<number[]>) => void) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; cb(xs); return f; } });\nconst b = (a) => a.run((x) => { x.push(1); });` + R);
add("own-param-cb", `const a = () => ({ ${D}, run: (xs: Mut<number[]>, cb: (x: Mut<number[]>) => void) => { cb(xs); return xs.length; } });\nconst b = (a) => { const m = [0]; a.run(m, (x) => { x.push(1); }); return m.length; };` + R);
add("own-param-cb-d", `const a = () => ({ ${D}, run: (xs: Mut<number[]>, cb: (x: Mut<number[]>) => void) => { cb(xs); return xs.length; } });\nconst b = (a) => a.run(a.d, (x) => { x.push(1); });` + R);
add("own-param-cb-snapshot", `const a = () => ({ ${D}, run: (xs: Mut<number[]>, cb: (x: Mut<number[]>) => void) => { cb(xs); return xs.length; } });\nconst b = (a) => a.run(snapshot(a.d), (x) => { x.push(1); });` + R);
add("consumer-writer-into-producer", `const w = () => (x: Mut<number[]>) => { x.push(1); };\nconst a = (w: (x: Mut<number[]>) => void) => { const xs = [0]; w(xs); return { d: xs }; };` + R);
add("consumer-writer-kept", `const w = () => (x: Mut<number[]>) => { x.push(1); };\nconst a = (w: (x: Mut<number[]>) => void) => ({ d: [1], f: () => { const xs = [0]; w(xs); return xs.length; } });` + R);
add("consumer-writer-on-alias", `const w = () => (x: Mut<number[]>) => { x.push(1); };\nconst a = (w: (x: Mut<number[]>) => void) => { const xs = [0]; const c: readonly number[] = xs; return { d: c, f: () => { w(c); return c.length; } }; };` + R);
add("consumer-writer-on-input", `const w = () => (x: Mut<number[]>) => { x.push(1); };\nconst a = () => ({ ${D} });\nconst b = (w: (x: Mut<number[]>) => void, a: { readonly d: readonly number[] }) => { w(a.d); return 0; };` + R);
add("consumer-writer-unann-input", `const w = () => (x: Mut<number[]>) => { x.push(1); };\nconst a = () => ({ ${D} });\nconst b = (w, a) => { w(a.d); return 0; };` + R);
add("method-cb", `const a = () => ({ ${D}, run: (o: { f(x: Mut<number[]>): void }) => { const xs = [0]; o.f(xs); return xs.length; } });\nconst b = (a) => a.run({ f(x: Mut<number[]>) { x.push(1); } });` + R);
add("method-cb-d", `const a = () => ({ ${D}, run: (o: { f(x: Mut<number[]>): void }) => { o.f(a0()); return 0; } });\nconst a0 = () => [0];` + R);
add("rest-cb", `const a = () => ({ ${D}, run: (...cbs: ((x: Mut<number[]>) => void)[]) => { const xs = [0]; for (const cb of cbs) cb(xs); return xs.length; } });\nconst b = (a) => a.run((x) => { x.push(1); }, (x) => { x.push(2); });` + R);
add("default-cb", `const a = () => ({ ${D}, run: (cb: (x: Mut<number[]>) => void = (x) => { x.push(9); }) => { const xs = [0]; cb(xs); return xs.length; } });\nconst b = (a) => a.run();` + R);
add("default-cb-captures-d", `const a = () => { const d = [1, 2]; const c: readonly number[] = d; return { d: c, run: (y: readonly number[] = c, cb: (x: Mut<number[]>) => void = (x) => { x.push(9); }) => { const xs = [...y]; cb(xs); return xs.length; } }; };\nconst b = (a) => a.run();` + R);
add("destructured-cb", `const a = () => ({ ${D}, run: ({ cb }: { readonly cb: (x: Mut<number[]>) => void }) => { const xs = [0]; cb(xs); return xs.length; } });\nconst b = (a) => a.run({ cb: (x) => { x.push(1); } });` + R);
add("generic-v-cb", `const a = () => ({ ${D}, run: <T,>(v: T, cb: (x: T) => void) => { cb(v); return 0; } });\nconst b = (a) => { const m = [0]; a.run(m, (x) => { x.push(1); }); return m.length; };` + R);
add("generic-v-cb-d", `const a = () => ({ ${D}, run: <T,>(v: T, cb: (x: T) => void) => { cb(v); return 0; } });\nconst b = (a) => a.run(a.d, (x) => { x.push(1); });` + R);
add("generic-v-cb-d-ann", `const a = () => ({ ${D}, run: <T,>(v: T, cb: (x: T) => void) => { cb(v); return 0; } });\nconst b = (a) => a.run(a.d, (x: Mut<number[]>) => { x.push(1); });` + R);
add("generic-fn-T", `const a = () => ({ ${D}, id: <T,>(f: T) => f });\nconst b = (a) => { const w = a.id((x: Mut<number[]>) => { x.push(1); }); const m = [0]; w(m); return m.length; };` + R);
add("generic-fn-T-d", `const a = () => ({ ${D}, id: <T,>(f: T) => f });\nconst b = (a) => { const w = a.id((x: Mut<number[]>) => { x.push(1); }); w(a.d); return 0; };` + R);
add("returns-writer", `const a = () => ({ ${D}, mk: () => (x: Mut<number[]>) => { x.push(1); } });\nconst b = (a) => { const w = a.mk(); w(a.d); return 0; };` + R);
add("returns-writer-own", `const a = () => ({ ${D}, mk: () => (x: Mut<number[]>) => { x.push(1); } });\nconst b = (a) => { const w = a.mk(); const m = [0]; w(m); return m.length; };` + R);
add("take-returns-reader", `const a = () => ({ ${D}, take: (x: Mut<number[]>) => { const c: readonly number[] = x; return () => c.length; } });\nconst b = (a) => { const m = [0]; const f = a.take(m); m.push(1); return f; };` + R);
add("take-returns-reader-kept", `const a = () => ({ ${D}, take: (x: Mut<number[]>) => { const c: readonly number[] = x; return () => c.length; } });\nconst b = (a) => () => { const m = [0]; const f = a.take(m); const k = f(); m.push(1); return [k, f()] as const; };` + R);
add("take-returns-mut", `const a = () => ({ ${D}, take: (x: Mut<number[]>) => x });\nconst b = (a) => { const m = [0]; const y = a.take(m); y.push(1); return m.length; };` + R);
add("take-returns-mut-d", `const a = () => ({ ${D}, take: (x: Mut<number[]>) => x });\nconst b = (a) => { const y = a.take(snapshot(a.d)); y.push(1); return y.length; };` + R);
add("this-in-method", `const a = () => ({ ${D}, run() { return this.d.length; } });` + R);
add("arguments-cb", `const a = () => ({ ${D}, run: function (cb: (x: Mut<number[]>) => void) { cb(arguments[1]); return 0; } });` + R);
add("state-holds-writer", `const s = () => state<(x: Mut<number[]>) => void>((x) => { x.push(1); });\nconst u = (s: (x: Mut<number[]>) => void) => { const m = [0]; s(m); return m.length; };` + R.replace("a: {", "a0: {").replace("a.d", "a0.d") + "\nconst a0 = () => ({ d: [1] });");
add("state-holds-writer-d", `const s = () => state<(x: Mut<number[]>) => void>((x) => { x.push(1); });\nconst a = () => ({ ${D} });\nconst u = (s: (x: Mut<number[]>) => void, a: { readonly d: readonly number[] }) => { s(a.d); return 0; };` + R);
add("action-cb-param", `const a = () => ({ ${D} });\nconst s = () => state(0);\nconst g = (s: State<number>) => action((cb: (x: Mut<number[]>) => void) => { const xs = [0]; cb(xs); s.set(xs.length); });\nconst b = (g: Action<[(x: Mut<number[]>) => void]>) => ({ go: action(() => { g((x) => { x.push(1); }); }) });` + R, { drive: async (p: any) => { p.value("b").go(); return "called"; } });
// -P: the producer is an action; it publishes a reader of its fresh local, then the consumer's callback writes it
const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
add("cb-P", ST + "const g = (s: State<() => number>, lg: State<number>) => action((cb: (x: Mut<number[]>) => void) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); cb(xs); });\nconst put = (g: Action<[(x: Mut<number[]>) => void]>) => ({ go: action(() => { g((x) => { x.push(1); }); }) });", act());
add("cb-P-writer-cell", ST + "const wr = () => (x: Mut<number[]>) => { x.push(1); };\nconst g = (s: State<() => number>, lg: State<number>, wr: (x: Mut<number[]>) => void) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); wr(xs); }) });", act("g"));
add("cb-P-take-reader", ST + "const a = () => ({ take: (x: Mut<number[]>) => { const c: readonly number[] = x; return () => c.length; } });\nconst put = (a: { readonly take: (x: Mut<number[]>) => () => number }, s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = [0]; const f = a.take(m); s.set(f); lg.set(f()); m.push(1); }) });", act());
add("cb-P-state-writer", "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\nconst wr = () => state<(x: Mut<number[]>) => void>((x) => { x.push(1); });\nconst put = (s: State<() => number>, lg: State<number>, wr: (x: Mut<number[]>) => void) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); wr(xs); }) });", act());
add("cb-P-memo-writer", ST + "const wr = () => memo((n: number) => (x: Mut<number[]>) => { x.push(n); });\nconst put = (s: State<() => number>, lg: State<number>, wr: (n: number) => (x: Mut<number[]>) => void) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); wr(1)(xs); }) });", act());
// a generic parameter instantiated with a function type that takes a Mut
add("generic-box-fn", "const a = () => { const box = <T,>(v: T) => ({ v }); return box((x: Mut<number[]>) => { x.push(1); }); };\nconst d0 = () => [1];\nconst b = (a, d0: readonly number[]) => { a.v(d0); return 0; };\nconst r = (d0: readonly number[]) => () => d0.length;");
add("generic-box-fn-own", "const a = () => { const box = <T,>(v: T) => ({ v }); return box((x: Mut<number[]>) => { x.push(1); }); };\nconst b = (a) => { const m = [0]; a.v(m); return m.length; };");
// controls (checker skipped)
add("ctl-cb-on-d", `const a = () => ({ ${D}, run: (cb: (x: Mut<number[]>) => void) => { cb(a0); return 0; } });\nconst a0 = () => 0;\nconst q = () => { const xs = [0]; const c: readonly number[] = xs; return { f: () => c.length, w: (cb: (x: Mut<number[]>) => void) => cb(xs) }; };\nconst b = (q) => { q.w((x) => { x.push(1); }); return 0; };`, { ctl: true });
add("ctl-cb-P-let", ST + "const g = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { let n = 1; const f = () => n; s.set(f); lg.set(f()); n = 3; }) });", { ...act("g"), ctl: true });
export const cands = out;
