// 2. other roots. Prefixes: t- a type that is itself Mut, hidden from R-K (alias, generic, union, conditional);
// fr- a published FetchResponse whose body one reader uses up; cap- a kept function reading a capability;
// hk- toJSON/toString/valueOf hooks a consumer's intrinsic call runs; it- iterators and destructuring across cells;
// lp- closures over loop variables; lu- lets of union types across a yield; rr- reruns after an input changes (drive);
// ev- state, actions, listeners; er- errors; gn- generics and inference; so- sort comparators and reducers.
import { C, W } from "../freeze-attack3/harness.ts";
const CW = "\nconst c = (a: { m: () => Mut<number[]> }) => { a.m().push(1); return 0; };";

// drive: call an exported action of cell a (a top-level call from JavaScript), then let the program settle
const go = (cell: string, key: string, ...args: unknown[]) => ({ drive: async (p: any) => { const v = p.value(cell); (key ? v[key] : v)(...args); return `${cell}.${key}`; } });
export const cands = [
  // t-: a binding whose own type is Mut, spelled so a check of the name `Mut` may miss it
  C("t-alias", "type M = Mut<number[]>;\nconst a = () => { const r: M = [0]; return { m: (): M => r }; };" + CW),
  C("t-alias-generic", "type Id<T> = T;\nconst a = () => { const r: Id<Mut<number[]>> = [0]; return { m: (): Mut<number[]> => r }; };" + CW),
  C("t-union-cond", "const a = (now: Clock) => { const r: Mut<number[]> | null = now() >= 0 ? [0] : null; return { m: (): Mut<number[]> => r ?? [] }; };" + CW),
  C("t-union-undef", "const a = (now: Clock) => { const r: Mut<number[]> | undefined = now() >= 0 ? [0] : undefined; return { m: (): Mut<number[]> => r ?? [] }; };" + CW),
  C("t-union-num", "const a = (now: Clock) => { const r: Mut<number[]> | number = now() >= 0 ? [0] : 1; return { m: (): Mut<number[]> => (typeof r === \"number\" ? [] : r) }; };" + CW),
  C("t-param-alias", "type M = Mut<number[]>;\nconst a = () => { const mk = (p: M) => (): M => p; return { m: mk([0]) }; };" + CW),
  C("t-param-union", "const a = () => { const mk = (p: Mut<number[]> | null) => (): Mut<number[]> => p ?? []; return { m: mk([0]) }; };" + CW),
  C("t-param-optional", "const a = () => { const mk = (p?: Mut<number[]>) => (): Mut<number[]> => p ?? []; return { m: mk([0]) }; };" + CW),
  C("t-param-rest", "const a = () => { const mk = (...ps: Mut<number[]>[]) => (): Mut<number[]> => ps[0] ?? []; return { m: mk([0]) }; };" + CW),
  C("t-param-default", "const a = () => { const mk = (p: Mut<number[]> = [0]) => (): Mut<number[]> => p; return { m: mk() }; };" + CW),
  C("t-typeof", "const a = () => { const xs = [0]; const r: typeof xs = [0]; return { m: () => r }; };" + CW),
  C("t-generic-ext", "const a = () => { const mk = <T extends number[],>(x: T) => () => x; return { m: mk([0]) }; };" + CW),
  C("t-generic-ext-explicit", "const a = () => { const mk = <T extends number[],>(x: T) => () => x; const xs = [0]; return { m: mk<Mut<number[]>>(xs) }; };" + CW),
  C("t-generic-holder-fn", "const a = () => { const mk = <T,>(x: { readonly v: T }) => () => x.v; return { m: mk<Mut<number[]>>({ v: [0] }) }; };" + CW),
  C("t-generic-record", "const a = () => { const mk = <T extends object,>(x: T): { m: () => T } => ({ m: () => x }); return mk<Mut<number[]>>([0]); };" + CW),
  C("t-inferred-ret", "const a = () => { const mk = (p: Mut<number[]>) => () => p; return { m: mk([0]) }; };" + CW),
  C("t-ret-ann-fn", "const a = () => { const mk = (p: Mut<number[]>): (() => Mut<number[]>) => () => p; return { m: mk([0]) }; };" + CW),
  // fr-: FetchResponse is not plain data; it is published as is (freeze kind 0)
  C("fr-two-readers", "const r = async (fetch: Fetch) => fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => r.text();\nconst c2 = async function* (r: FetchResponse) { let s = \"\"; try { s = await r.text(); } catch (e) { s = \"used:\" + messageOf(e); } yield s; " + W + "let t = \"\"; try { t = await r.text(); } catch (e) { t = \"used\"; } yield s === \"\" ? t : \"seen\"; };", { fetchBody: "body", twice: ["c2"] }),
  C("fr-held-fn", "const r = async (fetch: Fetch) => fetch(\"https://x.test/\");\nconst g = (r: FetchResponse) => async () => { try { return await r.text(); } catch (e) { return \"used\"; } };\nconst h = async (g: () => Promise<string>) => { const a1 = await g(); const a2 = await g(); return [a1, a2]; };", { fetchBody: "body", show: ["h"] }),
  C("fr-in-record", "const r = async (fetch: Fetch) => ({ res: await fetch(\"https://x.test/\") });\nconst b = async (r: { res: FetchResponse }) => r.res.text();\nconst c3 = async (r: { res: FetchResponse }) => { " + W + W + "try { return await r.res.text(); } catch (e) { return \"used\"; } };", { fetchBody: "body", show: ["b", "c3"] }),
  C("fr-json-twice", "const r = async (fetch: Fetch) => fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => r.json();\nconst c3 = async (r: FetchResponse) => { " + W + W + "try { return await r.json(); } catch (e) { return \"used\"; } };", { fetchBody: "[1]", show: ["b", "c3"] }),
  C("fr-ab", "const r = async (fetch: Fetch) => fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => (await r.arrayBuffer()).byteLength;\nconst c3 = async (r: FetchResponse) => { " + W + W + "try { return (await r.arrayBuffer()).byteLength; } catch (e) { return -1; } };", { fetchBody: "abcd", show: ["b", "c3"] }),
  // cap-: a kept function that reads a capability gives a different result each call
  C("cap-now", "const a = (now: Clock) => () => now();"),
  C("cap-random", "const a = (random: Random) => () => random();"),
  C("cap-now-gen", "const a = function* (now: Clock) { yield () => now(); };"),
  // hk-: hooks a consumer's intrinsic call runs (the producer's kept functions)
  C("hk-tojson", "const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return { toJSON: () => { r.b.n++; return r.b.n; } }; };\nconst c = (a: { toJSON: () => number }) => JSON.stringify(a);"),
  C("hk-tostring", "const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return { toString: () => { r.b.n++; return String(r.b.n); } }; };\nconst c = (a: { toString: () => string }) => `${a}`;"),
  C("hk-valueof", "const a = () => ({ valueOf: () => 1 });\nconst c = (a: { valueOf: () => number }) => String(a);"),
  C("hk-tojson-plain", "const a = () => { const c0: readonly number[] = [0]; return { toJSON: () => c0.length }; };\nconst c = (a: { toJSON: () => number }) => JSON.stringify(a);"),
  // it-: iterators and destructuring across cells
  C("it-destr-input", "const a = () => [[0], [1]];\nconst b = (a: readonly (readonly number[])[]) => { const [x, y] = a; return () => [x, y]; };"),
  C("it-spread-input", "const a = () => new Map([[\"k\", [0]]]);\nconst b = (a: Map<string, readonly number[]>) => [...a.values()];"),
  C("it-for-of-input-map", "const a = () => new Map([[\"k\", 1]]);\nconst b = (a: Map<string, number>) => { const out = []; for (const [k, v] of a) out.push(k + v); return out; };"),
  C("it-values-kept", "const a = () => [1, 2];\nconst b = (a: readonly number[]) => () => [...a.values()];"),
  C("it-entries-input", "const a = () => new Set([1]);\nconst b = (a: Set<number>) => () => [...a];"),
  C("it-gen-values", "const a = function* () { for (const k of [0, 1]) yield [k]; };\nconst b = (a: readonly number[]) => () => a;"),
  // lp-: closures over loop variables
  C("lp-let-i", "const a = () => { const fs = []; for (let i = 0; i < 2; i++) fs.push(() => i); return fs; };"),
  C("lp-const-of", "const a = () => { const fs = []; for (const x of [1, 2]) fs.push(() => x); return fs; };"),
  C("lp-const-copy", "const a = () => { const fs = []; for (let i = 0; i < 2; i++) { const j = i; fs.push(() => j); } return fs; };"),
  C("lp-mut-elem", "const a = () => { const rows = [[0], [1]]; const fs = []; for (const row of rows) fs.push(() => row.length); return fs; };"),
  C("lp-while", "const a = () => { const fs = []; let i = 0; while (i < 2) { const j = i; fs.push(() => j); i++; } return fs; };"),
  // lu-: a let of a union type across a yield
  C("lu-num-null", "const a = function* () { let v: number | null = null; yield () => 1; v = 2; yield v; };"),
  C("lu-str-arr", "const a = function* () { let v: string | readonly number[] = \"x\"; yield v; v = [1]; yield v; };"),
  C("lu-prev-time", "const a = function* (now: Clock) { let t: number | undefined = undefined; for (let k = 0; k < 3; k++) { const d = t === undefined ? 0 : now() - t; t = now(); yield { d }; } };"),
  C("lu-let-record-copy", "const a = function* () { let v: { readonly n: number } = { n: 0 }; for (let k = 0; k < 3; k++) { v = { n: v.n + 1 }; yield v; } };"),
  C("lu-let-arr-replace", "const a = function* () { let v: readonly number[] = []; for (let k = 0; k < 3; k++) { v = [...v, k]; yield v; } };"),
  // rr-: reruns after an input changes; earlier values must stay
  C("rr-state-consumer", "const s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst b = (s: number) => { const xs = [s]; return { xs, f: () => xs.length }; };", go("bump", "")),
  C("rr-state-array", "const s = () => state<readonly number[]>([0]);\nconst bump = (s: State<readonly number[]>) => action(() => s.update((l) => [...l, 1]));\nconst b = (s: readonly number[]) => () => s;", go("bump", "")),
  C("rr-state-gen", "const s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst g = function* (s: number) { for (const k of [0, 1]) yield [s, k]; };", go("bump", "")),
  C("rr-state-set-same", "const s = () => state<readonly number[]>([0]);\nconst again = (s: State<readonly number[]>) => action((x: readonly number[]) => s.set(x));\nconst b = (s: readonly number[]) => () => s.length;", { drive: async (p: any) => { const v = p.value("s"); p.value("again")(v); return "again"; } }),
  C("rr-action-arg-array", "const s = () => state<readonly number[]>([0]);\nconst put = (s: State<readonly number[]>) => action((x: readonly number[]) => s.set(x));\nconst b = (s: readonly number[]) => () => s.length;", { drive: async (p: any) => { const xs = [1, 2]; p.value("put")(xs); try { xs.push(3); } catch (e) { return "push threw"; } return "pushed"; } }),
  // ev-: state, actions, listeners
  C("ev-listener", "const tick = function* () { for (const k of [1, 2, 3]) yield k; };\nconst s = () => state<readonly number[]>([]);\nconst add = (s: State<readonly number[]>) => action((k: number) => s.update((l) => [...l, k]));\nconst l = (tick: Events<number>, add: Action<[number]>) => on(tick, add);\nconst v = (s: readonly number[]) => () => s.length;"),
  C("ev-action-returns", "const s = () => state<readonly number[]>([0]);\nconst a = (s: State<readonly number[]>) => action(() => { const xs = [1]; s.set(xs); return xs.length; });\nconst v = (s: readonly number[]) => () => s;", go("a", "")),
  C("ev-update-identity", "const s = () => state<readonly number[]>([0]);\nconst a = (s: State<readonly number[]>) => action(() => s.update((l) => l));\nconst v = (s: readonly number[]) => () => s;", go("a", "")),
  C("ev-action-in-state", "const s = () => state(0);\nconst inc = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst h = () => state<readonly number[]>([]);\nconst v = (s: number) => () => s;", go("inc", "")),
  // er-: errors and causes
  C("er-rethrow", "const a = async () => { const e = new Error(\"x\"); throw e; };\nconst b = async (a: number) => a;"),
  C("er-caught-record", "const a = () => { try { throw new Error(\"x\"); } catch (e) { return { m: messageOf(e) }; } };"),
  C("er-throw-rec", "const a = () => { const xs = [0]; try { throw { xs }; } catch (e) { return 1; } };"),
  C("er-promise-rej", "const a = () => { const mk = async (): Promise<number> => { throw new Error(\"x\"); }; return { p: mk() }; };"),
  // gn-: inference; a fresh value whose type is not Mut but is shared
  C("gn-ternary-join", "const a = (now: Clock) => { const xs = [0]; const ys = now() > -1 ? xs : [1]; const c: readonly number[] = ys; xs.push(2); return () => c.length; };"),
  C("gn-array-from-shared", "const a = () => { const xs = [0]; const ys = Array.from([xs]); return () => ys; };"),
  C("gn-map-get", "const a = () => { const m = new Map([[\"k\", [0]]]); const v = m.get(\"k\"); return { f: () => v }; };"),
  C("gn-spread-shallow", "const a = () => { const inner = [0]; const o = { ...{ t: inner } }; return () => o.t.length; };"),
  C("gn-fromentries", "const a = () => { const t = [0]; const o = Object.fromEntries([[\"k\", t]]); return () => o; };"),
  C("gn-structured-clone-map", "const a = () => { const m = structuredClone(new Map<string, number>()); const c: Map<string, number> = m; return () => c.size; };"),
  // so-: sort comparators and reducers a consumer runs with the producer's function
  C("so-comparator", "const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return (p: number, q: number) => { r.b.n++; return p - q; }; };\nconst c = (a: (p: number, q: number) => number) => () => [3, 1, 2].toSorted(a);"),
  C("so-reducer", "const a = () => (p: number, q: number) => p + q;\nconst c = (a: (p: number, q: number) => number) => () => [1, 2].reduce(a, 0);"),
];
