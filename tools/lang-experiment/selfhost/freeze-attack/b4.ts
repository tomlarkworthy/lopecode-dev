import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show: string[] = [], drive?: (p: any) => unknown): Attack => ({ name, src, show, drive });
const D = "const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; }; ";
const W = "for (let i = 0; i < 300; i++) await null; ";
export const attacks: Attack[] = [
  // a kept function writing through an alias, triggered by another cell; a third cell holds the value
  A("kc-alias-write-by-cell", "const a = () => { const xs = [0]; return { get: (): number[] => xs, bump: () => { const r = xs; r.push(1); return 0; } }; };\nconst d = (a: { get: () => number[] }) => ({ v: a.get() });\nconst c = (a: { bump: () => number }, d: { v: number[] }) => a.bump();", ["d"]),
  A("kc-flow-helper-by-cell", "const a = () => { const xs = [0]; const h = () => xs; return () => h(); };\nconst d = (a: () => number[]) => ({ v: a() });\nconst c = (a: () => Mut<number[]>, d: { v: number[] }) => { a().push(1); return 0; };", ["d"]),
  A("kc-flow-alias-typed", "const a = () => { const t = new Uint8Array(2); return (): Mut<Uint8Array> => { const r = t; return r; }; };\nconst d = (a: () => Uint8Array) => ({ v: a() });\nconst c = (a: () => Mut<Uint8Array>, d: { v: Uint8Array }) => { a()[0] = 7; return 0; };", ["d"]),
  // state: values written are deepFrozen; unfreezable values are not
  A("st-error-async-writer", "const s = () => state(0);\nconst w = (s: State<number>) => { const e = new Error(\"x\"); const h = async () => { " + W + "e.message = \"y\"; }; h(); return e; };\nconst b = (w: Error) => ({ v: w });"),
  A("st-typed-initial-async", "const s = () => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 1; }; h(); return state(t); };\nconst b = (s: Uint8Array) => ({ v: s });"),
  A("st-array-initial-async", "const s = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return state(xs); };\nconst b = (s: number[]) => ({ v: s });"),
  A("st-array-initial-then", "const s = () => { " + D + "const xs = [0]; D().then(() => { const r = xs; r.push(1); }); return state(xs); };\nconst b = (s: number[]) => ({ v: s });"),
  A("st-set-typed-action", "const s = () => state(new Uint8Array(2));\nconst w = (s: State<Uint8Array>) => action(() => { const t = new Uint8Array(2); s.set(t); const h = async () => { " + W + "t[0] = 9; }; h(); });\nconst b = (s: Uint8Array) => ({ v: s });", ["b"], (p) => { p.value("w")(); }),
  A("st-set-array-action-then", "const s = () => state([0]);\nconst w = (s: State<number[]>) => action(() => { " + D + "const xs = [0]; s.set(xs); D().then(() => { const r = xs; r.push(1); }); });\nconst b = (s: number[]) => ({ v: s });", ["b"], (p) => { p.value("w")(); }),
  A("st-action-arg-typed-kept", "const s = () => state(0);\nconst w = (s: State<number>) => action((t: Uint8Array) => { s.set(t.length); });\nconst t = () => new Uint8Array(2);\nconst c = (w: Action<[Uint8Array]>, t: Uint8Array) => { w(t); return 0; };"),
  // events: a generator yielding an Error then writing it
  A("ev-error-yield", "const g = function* () { const e = new Error(\"x\"); yield e; e.message = \"y\"; yield new Error(\"z\"); };\nconst l = (g: Events<Error>) => on(g, action((e: Error) => { }));"),
  // a Promise inside a record: deepFreeze stops at it; resolved value written later
  A("pr-in-record-then", "const a = () => { " + D + "const xs = [0]; D().then(() => { const r = xs; r.push(1); }); return { p: Promise.resolve(xs) }; };\nconst c = async (a: { p: Promise<number[]> }) => ({ v: await a.p });"),
  A("pr-in-record-async-helper", "const a = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return { p: Promise.resolve(xs) }; };\nconst c = async (a: { p: Promise<number[]> }) => ({ v: await a.p });"),
  A("pr-in-array", "const a = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return [Promise.resolve(xs)]; };\nconst c = async (a: Promise<number[]>[]) => ({ v: await a[0] });"),
  A("pr-returned-direct", "const a = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return Promise.resolve(xs); };\nconst c = (a: number[]) => ({ v: a });"),
  A("pr-async-cell-record", "const a = async () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return { p: Promise.resolve(xs) }; };\nconst c = async (a: { p: Promise<number[]> }) => ({ v: await a.p });"),
  A("pr-in-record-all", "const a = () => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return { p: Promise.all([Promise.resolve(xs)]) }; };\nconst c = async (a: { p: Promise<number[][]> }) => ({ v: await a.p });"),
  // duck-typed generator: a record with next and return
  A("dk-record-next", "const a = () => { const xs = [0]; return { next: () => ({ done: false, value: xs }), return: () => ({ done: true, value: xs }) }; };"),
  A("dk-record-next-mut", "const a = () => ({ next: () => ({ done: false, value: [0] }), return: () => ({ done: true, value: 0 }) });\nconst b = (a: number[]) => ({ v: a });"),
  // globals without declarations
  A("gl-dataview", "const a = () => { const d = new DataView(new ArrayBuffer(2)); return d; };"),
  A("gl-textdecoder", "const a = () => new TextDecoder();"),
  A("gl-textencoder", "const a = () => new TextEncoder().encode(\"ab\");"),
  A("gl-weakmap", "const a = () => new WeakMap();"),
  A("gl-date", "const a = () => new Date(0);"),
  A("gl-symbol", "const a = () => Symbol(\"x\");"),
  A("gl-object-assign", "const o = () => ({ n: 0 });\nconst a = (o: { n: number }) => { Object.assign(o, { n: 1 }); return 0; };"),
  A("gl-object-freeze", "const a = () => Object.freeze([0]);"),
  A("gl-error-cause", "const a = () => new Error(\"x\", { cause: [0] });"),
  A("gl-intl", "const a = () => new Intl.NumberFormat();"),
  A("gl-json-parse-write", "const s = () => \"[0]\";\nconst a = (s: string) => { const v = JSON.parse(s) as Mut<number[]>; v.push(1); return v; };"),
  // Error more
  A("er-input-cast", "const e = () => new Error(\"x\");\nconst a = (e: Error) => { const m = e as Mut<Error>; m.message = \"y\"; return 0; };"),
  A("er-input-member-write", "const e = () => new Error(\"x\");\nconst a = (e: Error) => { e.message = \"y\"; return 0; };"),
  A("er-in-yield-record-gen", "const g = function* () { const e = new Error(\"x\"); const o = { list: [e] }; yield o; e.message = \"y\"; yield { list: [] }; };\nconst b = (g: { list: Error[] }) => ({ v: g });"),
  A("er-captured-gen", "const g = function* () { const e = new Error(\"x\"); const f = () => e.message; yield f; e.message = \"y\"; yield f; };"),
  A("er-kept-fn-name", "const a = function* () { const e = new TypeError(\"x\"); yield e; e.message = \"y\"; yield 0; };\nconst b = (a: Error | number) => ({ v: a });"),
  A("er-range", "const a = function* () { const e = new RangeError(\"x\"); yield { e }; e.message = \"q\"; yield { e }; };"),
  A("er-name-write", "const a = function* () { const e = new Error(\"x\"); yield e; e.name = \"Boom\"; yield 0; };\nconst b = (a: Error | number) => ({ v: a });"),
  A("er-url-searchparams-gen", "const a = function* () { const u = new URLSearchParams(\"a=1\"); yield u; yield 0; };"),
  A("er-async-cell-promise", "const a = async () => { const e = new Error(\"x\"); const h = async () => { " + W + "e.message = \"y\"; }; h(); return e; };\nconst b = (a: Error) => ({ v: a });"),
];
