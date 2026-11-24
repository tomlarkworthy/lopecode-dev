// freeze-attack13 target 1: void. (A) the result of an Action call is typed void and holds what the action's function
// returned; (E) a callback with an optional parameter past the intrinsic's declared ones gets the run time's extra
// argument (the receiver, the index, a Map); (H) rows expected to hold.
import { tyRow, callRow, isNum, isStr, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const C0 = `const c = (): StateCell<number> => state(0);\nconst g = (c: number) => c;\n`;
const CS = `const c = (): StateCell<string> => state("");\nconst g = (c: string) => c;\n`;
// A: the void result of an Action call, inside another action's body (the only place an Action may be called)
const A = (name: string, a: string, b: string, ok = isNum, pre = C0) => R.push(callRow(`v-act-${name}`, `${pre}const a = ${a};\nconst b = ${b};`, "b", [], ok));
A("str-nullish", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const r = a(); c.set(r ?? 7); })`);
A("str-or", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const r = a(); c.set(r || 7); })`);
A("str-plus", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { c.set((a() ?? 7) + 1); })`);
A("fn", `() => action(() => (n: number) => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const f = a() ?? ((n: number) => n); c.set(f(2)); })`);
A("arr", `() => action(() => ["x"])`, `(a: Action<[]>, c: State<number>) => action(() => { const xs = a() ?? [1]; c.set(xs[0] ?? 0); })`);
A("rec", `() => action(() => ({ n: "s" }))`, `(a: Action<[]>, c: State<number>) => action(() => { const o = a() ?? { n: 1 }; c.set(o.n); })`);
A("action", `(d: Action<[]>) => action(() => d)`, `(a: Action<[]>, c: State<number>) => action(() => { const f = a() ?? (() => 3); c.set(f()); })`, isNum, C0 + `const d = () => action(() => {});\n`);
A("arg-echo", `() => action((n: number) => String(n))`, `(a: Action<[number]>, c: State<number>) => action(() => { c.set(a(4) ?? 7); })`);
A("tuple", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const t = [a()]; c.set(t[0] ?? 7); })`);
A("map-site", `() => action((n: number) => "s")`, `(a: Action<[number]>, c: State<number>) => action(() => { const xs = [1].map((x) => a(x)); c.set(xs[0] ?? 7); })`);
A("narrow-never", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const r = a(); c.set(r === undefined ? 0 : r); })`);
A("typeof-held", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const r = a(); c.set(typeof r === "number" ? r : 0); })`);
A("string-state", `() => action(() => 5)`, `(a: Action<[]>, c: State<string>) => action(() => { c.set(a() ?? "x"); })`, isStr, CS);
A("bool", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { c.set(a() ?? false ? 1 : 2); })`);
A("update", `() => action(() => "s")`, `(a: Action<[]>, c: State<number>) => action(() => { const r = a(); c.update((x) => r ?? x); })`);
A("mut-arr", `() => action(() => { const xs = [1]; xs.push(2); return xs; })`, `(a: Action<[]>, c: State<number>) => action(() => { const xs = a() ?? [5]; c.set(xs.length); })`);
// A, leaving the action: an Action, a State handle or a Mut array laundered into state under a plain type
R.push(callRow("v-act-launder-action-state", `const c = (): StateCell<number> => state(0);\nconst d = (c: State<number>) => action(() => c.set(1));\nconst a = (d: Action<[]>) => action(() => d);\nconst s = (): StateCell<readonly (() => number)[]> => state([]);\nconst b = (a: Action<[]>, s: State<readonly (() => number)[]>) => action(() => { const f = a() ?? (() => 1); s.set([f]); });\nconst g = (s: readonly (() => number)[]) => s.length;`, "b", [], (v) => v === 1));
R.push(callRow("v-act-launder-handle", `const c = (): StateCell<number> => state(0);\nconst k = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c);\nconst b = (a: Action<[]>, k: State<number>) => action(() => { k.set(a() ?? 0); });\nconst g = (k: number) => k + 1;`, "b", [], isNum));
R.push(callRow("v-act-launder-mut", `const c = (): StateCell<number> => state(0);\nconst g = (c: number) => c;\nconst a = () => action(() => new Map([[1, "s"]]));\nconst b = (a: Action<[]>, c: State<number>) => action(() => { const m = a() ?? new Map([[1, 2]]); c.set(m.get(1) ?? 0); });`, "b", [], isNum));
R.push(callRow("v-act-chain", `${C0}const a0 = () => action(() => "s");\nconst a = (a0: Action<[]>) => action(() => a0());\nconst b = (a: Action<[]>, c: State<number>) => action(() => { c.set(a() ?? 7); });`, "b", [], isNum));
R.push(callRow("v-act-forEach", `${C0}const a = () => action((n: number) => "s");\nconst b = (a: Action<[number]>, c: State<number>) => action(() => { let t = 0; [1].forEach((x) => { t = a(x) ?? t; }); c.set(t); });`, "b", [], isNum));
R.push(callRow("v-act-array-from", `${C0}const a = () => action((n: number) => "s");\nconst b = (a: Action<[number]>, c: State<number>) => action(() => { const xs = Array.from([1], (x) => a(x)); c.set(xs[0] ?? 7); });`, "b", [], isNum));
R.push(callRow("v-act-reduce", `${C0}const a = () => action((n: number) => "s");\nconst b = (a: Action<[number]>, c: State<number>) => action(() => { c.set([1].reduce((acc, x) => a(x) ?? acc, 0)); });`, "b", [], isNum));
R.push(callRow("v-act-sort", `${C0}const a = () => action((n: number) => "s");\nconst b = (a: Action<[number]>, c: State<number>) => action(() => { const r = a(1); c.set([r ?? 1].toSorted((x, y) => x - y)[0] ?? 0); });`, "b", [], isNum));
R.push(callRow("v-act-generic", `${C0}const a = () => action(() => "s");\nconst b = (a: Action<[]>, c: State<number>) => action(() => { const or = <T,>(x: T | undefined, y: T): T => x ?? y; c.set(or(a(), 7)); });`, "b", [], isNum));
R.push(callRow("v-act-record", `${C0}const a = () => action(() => "s");\nconst b = (a: Action<[]>, c: State<number>) => action(() => { const o = { r: a() }; c.set(o.r ?? 7); });`, "b", [], isNum));
R.push(callRow("v-act-listener", `${C0}const t = function* () { yield 1; };\nconst a = () => action((n: number) => "s");\nconst b = (a: Action<[number]>, c: State<number>) => action((n: number) => { c.set(a(n) ?? 7); });\nconst l = (t: Events<number>, b: Action<[number]>) => on(t, b);`, "a", [1], isNum));
// control: the same detector, checker skipped, with the state written a string directly
R.push(callRow("v-ctl-act-direct", `${C0}const b = (c: State<number>) => action(() => { c.set("s"); });`, "b", [], isNum, "g", true));
R.push(callRow("v-ctl-act-void-annot", `${C0}const a = () => action((): number => "s");\nconst b = (a: Action<[]>, c: State<number>) => action(() => { c.set(a() ?? 7); });`, "b", [], isNum, "g", true));
// H: other void positions (expected to hold)
const H = (name: string, src: string, ok: (v: unknown) => boolean) => R.push(tyRow(`v-held-${name}`, src, ok));
H("void-union", `const g = () => { const f: () => void | number = () => undefined; return f() ?? 3; };`, isNum);
H("void-union-num", `const g = () => { const f: () => void | number = () => 2; return f() ?? 3; };`, isNum);
H("void-expr", `const g = () => { const f: () => void = () => void 5; return f() ?? 3; };`, isNum);
H("undef-ret", `const g = () => { const f: () => undefined = () => undefined; return f() ?? 3; };`, isNum);
H("block-assign", `const g = () => { let x = 0; const f: () => void = () => { x = 2; }; return f() ?? x; };`, isNum);
H("gen-return", `function* g(): Generator<number, void> { yield 1; return; }`, isNum);
H("gen-return-val", `function* g(): Generator<number, void> { yield 1; return 5; }`, isNum);
H("promise-void", `const g = async () => { const f: () => Promise<void> = async () => {}; return (await f()) ?? 3; };`, isNum);
H("promise-void-ret", `const g = async () => { const f: () => Promise<void> = async () => { return; }; return (await f()) ?? 3; };`, isNum);
H("then-void", `const g = () => Promise.resolve().then((x) => x ?? 4);`, isNum);
H("foreach-set-fn", `const g = () => { new Set([1]).forEach((x) => () => x); return 1; };`, isNum);
H("foreach-map-res", `const g = async (fetch: Fetch) => { const r = await fetch("u"); new Map([[1, 2]]).forEach(() => r); return 1; };`, isNum);
H("foreach-arr-res", `const g = async (fetch: Fetch) => { const r = await fetch("u"); [1].forEach(() => r); return 1; };`, isNum);
H("log-fn", `const g = (log: Log) => { log(() => 1); return 1; };`, isNum);
H("log-res", `const g = async (log: Log, fetch: Fetch) => { const r = await fetch("u"); log(r); return 1; };`, isNum);
H("rec-void-member", `const g = () => { const o: { readonly v: void } = { v: undefined }; return o.v ?? 2; };`, isNum);
H("cs-void-member", `interface F { (x: number): void }\nconst g = () => { const f: F = (x: number) => { [x].push(1); }; return f(1) ?? 2; };`, isNum);
H("memo-void", `const g = () => { const m = memo((x: number): void => {}); return m(1) ?? 2; };`, isNum);
H("events-return", `function* t(): Generator<number, void> { yield 1; }\nconst c = (): StateCell<number> => state(0);\nconst d = (c: State<number>) => action((n: number) => c.set(n));\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);\nconst g = (c: number) => c;`, isNum);
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
