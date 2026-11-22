import { A, W, D, B, callW } from "./common.ts";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
const T = "const t = new Uint8Array(2); ";
export const attacks = [
  // keys deepFreeze does not walk: Object.keys gives enumerable string keys only
  A("sym-key", "const a = () => { const k = Symbol(\"k\"); const xs = [0]; const o = { [k]: xs }; " + L("xs.push(1);") + "return { k, o }; };\nconst c = (a: unknown) => () => a;"),
  A("sym-iter-key", "const a = () => { const xs = [0]; const o = { [Symbol.iterator]: xs }; " + L("xs.push(1);") + "return o; };"),
  A("computed-str-key", "const a = () => { const xs = [0]; const o = { [\"z\"]: xs }; " + L("xs.push(1);") + "return o; };"),
  A("fn-prop", "const a = () => { const f = () => 0; const xs = [0]; f.xs = xs; " + L("xs.push(1);") + "return f; };"),
  // a promise among captures resolves to an unfrozen typed array (deepFreeze returns a copy and drops it)
  A("pc-typed-param", "const a = () => { " + T + "const g = async (q: Mut<Uint8Array>) => q; const p = g(t); " + L("t[0] = 1;") + "return () => p; };\nconst c = async (a: () => Promise<Uint8Array>) => { const v = await a(); return () => v; };"),
  A("pc-typed-ret", "const a = () => { " + T + "const g = async (q: Mut<Uint8Array>): Promise<Mut<Uint8Array>> => q; const p = g(t); " + L("t[0] = 1;") + "return { f: () => p }; };\nconst c = async (a: { f: () => Promise<Uint8Array> }) => { const v = await a.f(); return () => v; };"),
  A("pc-typed-all", "const a = () => { " + T + "const g = async (q: Mut<Uint8Array>) => q; const p = Promise.all([g(t)]); " + L("t[0] = 1;") + "return () => p; };\nconst c = async (a: () => Promise<Uint8Array[]>) => { const v = await a(); return () => v; };"),
  A("pc-typed-top", "const a = () => { " + T + "const g = async (q: Mut<Uint8Array>) => q; " + L("t[0] = 1;") + "return g(t); };\nconst c = (a: Uint8Array) => () => a;"),
  A("pc-typed-in-rec-yield", "const a = function* () { " + T + "const g = async (q: Mut<Uint8Array>) => q; const p = g(t); yield () => p; t[0] = 1; yield 0; };\nconst c = async (a: (() => Promise<Uint8Array>) | number) => { if (typeof a === \"number\") return () => null; const v = await a(); return () => v; };"),
  A("pc-url", "const a = () => { const u = new URL(\"https://x.test/a\"); const g = async (q: Mut<URL>) => q; const p = g(u); " + L("u.pathname = \"/b\";") + "return () => p; };\nconst c = async (a: () => Promise<URL>) => { const v = await a(); return () => v; };"),
  A("pc-usp", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); const g = async (q: URLSearchParams) => q; const p = g(u.searchParams); " + L("u.search = \"?q=2\";") + "return () => p; };\nconst c = async (a: () => Promise<URLSearchParams>) => { const v = await a(); return () => v; };"),
  // thenables, more routes
  A("th-in-record-field", "const a = () => ({ p: { then: (r: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "r(xs); } } });\nconst c = async (a: { p: { then: (r: (v: number[]) => void) => void } }) => { const v = await a.p; return () => v; };"),
  A("th-listener-events", "const g = function* () { yield { then: (r: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "r(xs); } }; };\nconst s = () => state(0);\nconst add = (s: State<number>) => action((x: { then: (r: (v: number[]) => void) => void }) => { s.update((v) => v + 1); });\nconst l = (g: Events<{ then: (r: (v: number[]) => void) => void }>, add: Action<[{ then: (r: (v: number[]) => void) => void }]>) => on(g, add);", ["s"]),
  A("th-action-set", "const s = () => state<unknown>(0);\nconst w = (s: State<unknown>) => action(() => { s.set({ then: (r: (v: number[]) => void) => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } }); });\nconst c = (s: unknown) => () => s;", ["s"], callW),
  A("th-copy-slot", "const a = () => ({ then: (r: (v: { t: Uint8Array }) => void) => { " + T + "const o = { t }; " + L("t[0] = 1;") + "r(o); } });\nconst c = (a: unknown) => () => a;"),
  A("th-nested-then", "const a = () => ({ then: (r: (v: { then: (q: (v: number[]) => void) => void }) => void) => { r({ then: (q: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "q(xs); } }); } });\nconst c = (a: unknown) => () => a;"),
  A("th-consumer-type-lie", "const a = () => ({ then: (r: (v: string) => void) => { r(\"str\"); }, n: 1 });\nconst b = (a: { n: number }) => a.n + 1;", ["a", "b"]),
  A("th-fn-cell", "const a = () => () => ({ then: (r: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "r(xs); } });\nconst c = async (a: () => { then: (r: (v: number[]) => void) => void }) => { const v = await a(); return () => v; };"),
  // state updater and action re-entrancy
  A("upd-keeps-old", "const s = () => state([0]);\nconst w = (s: State<number[]>) => action(() => { s.update((v) => { const n = [...v, 1]; return n; }); });\nconst c = (s: number[]) => () => s;", ["s"], callW),
  A("act-reenter", "const s = () => state({ n: [0] });\nconst w = (s: State<{ n: number[] }>) => action(() => { const xs = [0]; s.set({ n: xs }); });\nconst c = (s: { n: number[] }) => () => s;", ["s"], (p: any) => { p.value("w")(); p.value("w")(); }),
  A("state-arr-of-typed", "const s = () => { " + T + "const xs = [t]; " + L("const q = xs[0]; if (q) q[0] = 3;") + "return state(xs); };\nconst c = (s: Uint8Array[]) => () => s;"),
  A("usp-action-set", "const s = () => state<URLSearchParams | null>(null);\nconst w = (s: State<URLSearchParams | null>) => action(() => { const u = new URL(\"https://x.test/?q=1\"); s.set(u.searchParams); u.search = \"?q=2\"; });\nconst c = (s: URLSearchParams | null) => () => s;", ["s"], callW),
  A("usp-yield-fresh", "const a = function* () { const u = new URL(\"https://x.test/?q=1\"); const p = u.searchParams; yield { p }; u.search = \"?q=5\"; yield 1; };"),
  A("usp-yield-via-helper", "const a = function* () { const u = new URL(\"https://x.test/?q=1\"); const set = (x: Mut<URL>) => { x.search = \"?q=6\"; }; yield u.searchParams; set(u); yield 1; };"),
];
