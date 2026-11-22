// holes6 (2026-11-22): attacks on the run-time guarantee after closure registration (cause A) and the value table
// (causes C, D). Each is run by run-sets.ts with the static rules on and off; a program the checker accepts must
// change nothing another cell holds, or throw. W: 300 awaits; D(): a 300-link then chain (the write lands after the
// runtime publishes the value).
const W = "for (let i = 0; i < 300; i++) await null; ";
const D = "const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; }; ";
const C = "\nconst c = (a: () => Mut<number[]>) => { a().push(1); return 0; };";
const callW = (p: any) => { p.value("w")(); };
type A = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown };
const A = (name: string, src: string, show: string[] = [], drive?: (p: any) => unknown): A => ({ name, src, show, drive });
export const attacks: A[] = [
  // cause A: what a published function reaches through its captures
  A("h6-alias-in-kept", "const a = () => { const xs = [0]; return () => { const r = xs; r.push(1); return xs.length; }; };"),
  A("h6-helper-returns", "const a = () => { const xs = [0]; const h = () => xs; return (): Mut<number[]> => h(); };" + C),
  A("h6-helper-two-levels", "const a = () => { const xs = [0]; const h = () => xs; const g = () => h(); return (): Mut<number[]> => g(); };" + C),
  A("h6-map-container", "const a = () => { const reg = new Map<string, Mut<number[]>>([[\"k\", [0]]]); return (): Mut<number[]> => reg.get(\"k\") ?? []; };" + C),
  A("h6-array-container", "const a = () => { const reg: Mut<number[]>[] = [[0]]; return (): Mut<number[]> => reg[0] ?? []; };" + C),
  A("h6-record-container", "const a = () => { const o = { xs: [0] }; return (): Mut<number[]> => o.xs; };" + C),
  A("h6-enclosing-param", "const a = () => { const mk = (p: Mut<number[]>) => (): Mut<number[]> => p; const xs = [0]; return mk(xs); };" + C),
  A("h6-method", "const a = () => { const xs = [0]; return { m(): Mut<number[]> { return xs; } }; };\nconst c = (a: { m: () => Mut<number[]> }) => { a.m().push(1); return 0; };"),
  A("h6-fn-decl", "const a = () => { const xs = [0]; function h(): Mut<number[]> { return xs; } return h; };" + C),
  A("h6-loop-closures", "const a = () => { const fs: (() => Mut<number[]>)[] = []; for (const x of [[0], [1]]) { const y: Mut<number[]> = [...x]; fs.push(() => y); } return fs; };\nconst c = (a: (() => Mut<number[]>)[]) => { const f = a[0]; if (f) f().push(9); return 0; };"),
  A("h6-default-param", "const a = () => { const xs = [0]; return (q: Mut<number[]> = xs): Mut<number[]> => q; };" + C),
  A("h6-iife-in-kept", "const a = () => { const xs = [0]; return (): Mut<number[]> => (() => xs)(); };" + C),
  A("h6-chain-3", "const a = () => { const xs = [0]; const f1 = () => xs; const f2 = () => f1; return () => f2; };\nconst c = (a: () => () => () => Mut<number[]>) => { a()()().push(1); return 0; };"),
  A("h6-captured-in-map-fn", "const a = () => { const xs = [0]; const m = new Map<string, () => Mut<number[]>>(); m.set(\"f\", () => xs); return () => m; };\nconst c = (a: () => Map<string, () => Mut<number[]>>) => { const f = a().get(\"f\"); if (f) f().push(1); return 0; };"),
  A("h6-async-helper-writes-captured", "const a = () => { const xs = [0]; const h = async () => { " + W + "const r = xs; r.push(1); }; h(); return () => xs.length; };"),
  A("h6-then-writes-captured", "const a = () => { " + D + "const xs = [0]; D().then(() => { const r = xs; r.push(1); }); return () => xs.length; };"),
  A("h6-gen-tdz", "const a = function* () { const f = (): number => late.length; yield f; const late = [0]; yield 1; late.push(1); yield 2; };"),
  A("h6-gen-tdz-helper", "const a = function* () { const f = (): number => g(); yield f; const late = [0]; const g = () => late.length; yield 1; late.push(1); yield 2; };"),
  A("h6-state-fn-tdz", "const s = () => state((): number => 0);\nconst w = (s: State<() => number>) => action(() => { const f = (): number => late.length; s.set(f); const late = [0]; const h = async () => { " + W + "late.push(1); }; h(); });\nconst b = (s: () => number) => ({ v: s });", ["b"], callW),
  A("h6-action-captures", "const w = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; return action(() => { h(); }); };\nconst b = (w: () => void) => ({ v: w });", [], callW),
  A("h6-jsx-handler", "const a = () => { const xs = [0]; return <button onclick={() => xs.length}>x</button>; };\nconst c = () => { const n = [0]; const k = async () => { " + W + "n.push(1); }; k(); return <i onclick={() => n.length}>y</i>; };"),
  A("h6-state-initial-fn", "const s = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return state(() => xs.length); };\nconst b = (s: () => number) => ({ v: s });"),
  A("h6-let-late", "const a = () => { let xs = [0]; const f = () => xs.length; const h = async () => { " + W + "xs = [0, 1]; }; h(); return f; };"),
  A("h6-let-loop", "const a = () => { const fs: (() => number)[] = []; for (let i = 0; i < 2; i++) fs.push(() => i); return fs; };"),
  A("h6-recursive", "const a = () => { const xs = [0]; const f = (n: number): Mut<number[]> => (n > 0 ? f(n - 1) : xs); return f; };\nconst c = (a: (n: number) => Mut<number[]>) => { a(2).push(1); return 0; };"),
  A("h6-method-in-method", "const a = () => { const xs = [0]; return { m() { return { n(): Mut<number[]> { return xs; } }; } }; };\nconst c = (a: { m: () => { n: () => Mut<number[]> } }) => { a.m().n().push(1); return 0; };"),
  A("h6-gen-fn-yield-alias", "const a = function* () { const xs = [0]; yield () => xs.length; const r = xs; r.push(1); yield 0; };"),
  A("h6-async-gen-fn", "const a = async function* () { const xs = [0]; yield () => xs.length; " + W + "xs.push(1); yield 0; };"),
  A("h6-captured-set", "const a = () => { const s = new Set([0]); const h = async () => { " + W + "s.add(1); }; h(); return () => s.size; };"),
  // causes C, D: the value table
  A("h6-error-late-write", "const a = () => { const e = new Error(\"x\"); const h = async () => { " + W + "e.message = \"y\"; }; h(); return e; };\nconst b = (a: Error) => ({ v: a });"),
  A("h6-error-name-yield", "const a = function* () { const e = new Error(\"x\"); yield { e }; e.name = \"Y\"; yield 1; };"),
  A("h6-error-in-map", "const a = () => { const e = new TypeError(\"x\"); const m = new Map([[\"k\", e]]); const h = async () => { " + W + "e.message = \"y\"; }; h(); return m; };"),
  A("h6-error-captured", "const a = () => { const e = new RangeError(\"x\"); const h = async () => { " + W + "e.message = \"y\"; }; h(); return () => e.message; };"),
  A("h6-regexp-g-published", "const a = () => /a/g;\nconst b = (a: RegExp) => { const m = a.exec(\"aa\"); return m ? m.index : -1; };"),
  A("h6-regexp-captured-exec", "const a = () => { const re = new RegExp(\"a\", \"g\"); return (s: string) => { const m = re.exec(s); return m ? m.index : -1; }; };\nconst b = (a: (s: string) => number) => [a(\"aa\"), a(\"aa\")];"),
  A("h6-typed-top-late", "const a = () => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 1; }; h(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("h6-typed-in-record-late", "const a = () => { const t = new Float64Array(2); const h = async () => { " + W + "t.fill(3); }; h(); return { t }; };"),
  A("h6-typed-in-map-late", "const a = () => { const t = new Int32Array(2); const m = new Map([[\"k\", t]]); const h = async () => { " + W + "t[1] = 7; }; h(); return m; };"),
  A("h6-typed-captured", "const a = () => { const t = new Uint8Array(2); return () => t[0]; };"),
  A("h6-typed-buffer", "const a = () => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 5; }; h(); return t.buffer; };"),
  A("h6-typed-yield-per-frame", "const a = function* () { const t = new Uint8Array(2); for (let i = 0; i < 3; i++) { t[0] = i; yield t; } };"),
  A("h6-typed-subarray", "const a = () => { const t = new Uint8Array(4); const v = t.subarray(1, 3); const h = async () => { " + W + "t[1] = 9; }; h(); return { v }; };"),
  A("h6-typed-same-twice", "const a = () => { const t = new Uint8Array(2); return { p: t, q: t }; };\nconst b = (a: { p: Uint8Array; q: Uint8Array }) => a.p === a.q;", ["b"]),
  A("h6-url-late", "const a = () => { const u = new URL(\"https://x.test/a\"); const h = async () => { " + W + "u.pathname = \"/b\"; }; h(); return u; };\nconst b = (a: URL) => ({ v: a });"),
  A("h6-url-in-record-yield", "const a = function* () { const u = new URL(\"https://x.test/a\"); yield { u }; u.hash = \"#z\"; yield 1; };"),
  A("h6-url-captured", "const a = () => { const u = new URL(\"https://x.test/a\"); const h = async () => { " + W + "u.search = \"?q\"; }; h(); return () => u.href; };"),
  A("h6-promise-in-record", "const a = () => { " + D + "const xs = [0]; D().then(() => { const r = xs; r.push(1); }); return { p: Promise.resolve(xs) }; };\nconst c = async (a: { p: Promise<number[]> }) => ({ v: await a.p });"),
  A("h6-promise-captured", "const a = () => { " + D + "const xs = [0]; const p = Promise.resolve(xs); D().then(() => { const r = xs; r.push(1); }); return () => p; };\nconst c = async (a: () => Promise<number[]>) => ({ v: await a() });"),
  A("h6-iterator-in-record", "const a = () => ({ it: [1, 2].values() });"),
  A("h6-typed-state-initial", "const s = () => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 1; }; h(); return state(t); };\nconst b = (s: Uint8Array) => ({ v: s });"),
  A("h6-typed-action-arg", "const s = () => state(new Uint8Array(2));\nconst w = (s: State<Uint8Array>) => action(() => { const t = new Uint8Array(2); s.set(t); const h = async () => { " + W + "t[0] = 9; }; h(); });\nconst b = (s: Uint8Array) => ({ v: s });", ["b"], callW),
  A("h6-error-action-state", "const s = () => state(new Error(\"a\"));\nconst w = (s: State<Error>) => action(() => { const e = new Error(\"x\"); s.set(e); const h = async () => { " + W + "e.message = \"y\"; }; h(); });\nconst b = (s: Error) => ({ v: s });", ["b"], callW),
  A("h6-jsx-typed-prop", "const a = () => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 1; }; h(); return <canvas data={t} />; };"),
  A("h6-events-typed-yield", "const g = function* () { const t = new Uint8Array(2); yield t; t[0] = 1; yield t; };\nconst s = () => state(0);\nconst add = (s: State<number>) => action((t: Uint8Array) => { s.update((v) => v + t[0]!); });\nconst l = (g: Events<Uint8Array>, add: Action<[Uint8Array]>) => on(g, add);", ["s"]),
];
