// target 2: cast<T>(v). Vehicle F: cell g casts what fetch's json() gives (fetchValue, any JavaScript value) to T and
// returns the Cast; driveF checks an ok result's value with a hand oracle for T (not the derived shape), that it is
// frozen and plain all the way down, and not the value fetch gave. Vehicle L: a cell casts a value SoundScript made and
// returns what its checked type says (typeof, a member), read by tyRow's oracle.
import { tyRow, isStr, isNum, type Cand } from "./lib9.ts";
const isObj = (v: unknown): v is Record<string, any> => v !== null && typeof v === "object";
const clean = (v: unknown, seen = new Set<unknown>()): string | null => {
  if (!isObj(v)) return typeof v === "function" ? "a function" : null;
  if (seen.has(v)) return null;
  seen.add(v);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== Array.prototype) return "a prototype that is not Object's or Array's";
  if (!Object.isFrozen(v)) return "not frozen";
  if (Object.getOwnPropertySymbols(v).length) return "a symbol key";
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
    if (!("value" in d)) return `a getter at ${k}`;
    const c = clean(d.value, seen);
    if (c) return `${k}: ${c}`;
  }
  return null;
};
const given = new Map<string, unknown>();
const F = (t: string, decls = "") => `${decls}const g = async (fetch: Fetch) => {\n  const res = await fetch("x");\n  return cast<${t}>(await res.json());\n};`;
const fRow = (name: string, t: string, value: () => unknown, oracle: (v: any) => boolean, decls = "", mustOk = false, ctl = false): Cand => ({
  name, ctl, src: ctl ? `${decls}const g = async (fetch: Fetch) => {\n  const res = await fetch("x");\n  return { ok: true, value: (await res.json()) as ${t} };\n};` : F(t, decls),
  fetchValue: () => { const v = value(); given.set(name, v); return v; },
  drive: async (p: any) => {
    const r = p.value("g");
    if (!isObj(r)) return `same: g not a value (${p.status("g")} ${String(p.error?.("g") ?? "").slice(0, 120)})`;
    if (r.ok !== true) return mustOk ? `DIFF refused a T: ${String(r.error).slice(0, 120)}` : `same: refused at ${String(r.path)}: ${String(r.error).slice(0, 120)}`;
    const v = r.value;
    if (isObj(v) && v === given.get(name)) return "DIFF the value fetch gave was handed out";
    const c = clean(v);
    if (c) return `DIFF the value is ${c}`;
    let s = ""; try { s = JSON.stringify(v)?.slice(0, 100) ?? String(v); } catch { s = "?"; }
    return oracle(v) ? `same: ok, a T: ${s}` : `DIFF ok, but not a T: ${s}`;
  },
});
const R: Cand[] = [];
// --- recursive, mutual, generic aliases
const isTree = (v: any, d = 0): boolean => isObj(v) && isNum(v.v) && Array.isArray(v.kids) && v.kids.every((k: any) => isTree(k, d + 1)) && Object.keys(v).every((k) => k === "v" || k === "kids");
R.push(fRow("tree-ok", "Tree", () => ({ v: 1, kids: [{ v: 2, kids: [] }] }), isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n", true));
R.push(fRow("tree-bad-deep", "Tree", () => ({ v: 1, kids: [{ v: 2, kids: [{ v: "x", kids: [] }] }] }), isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n"));
R.push(fRow("tree-shared-node", "Tree", () => { const k = { v: 2, kids: [] }; return { v: 1, kids: [k, k] }; }, isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n", true));
R.push(fRow("tree-dag-getter", "Tree", () => { let n = 0; const k = { get v() { return n++ === 0 ? 2 : "x"; }, kids: [] }; return { v: 1, kids: [k, k] }; }, isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n"));
R.push(fRow("tree-cycle", "Tree", () => { const t: any = { v: 1, kids: [] }; t.kids = [t]; return t; }, isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n"));
const isAB = (v: any): boolean => isObj(v) && isNum(v.a) && (v.b === null || (isObj(v.b) && isStr(v.b.s) && (v.b.a === null || isAB(v.b.a))));
R.push(fRow("mutual-ok", "A", () => ({ a: 1, b: { s: "x", a: { a: 2, b: null } } }), isAB, "type A = { readonly a: number; readonly b: B | null };\ntype B = { readonly s: string; readonly a: A | null };\n", true));
R.push(fRow("mutual-bad", "A", () => ({ a: 1, b: { s: "x", a: { a: "2", b: null } } }), isAB, "type A = { readonly a: number; readonly b: B | null };\ntype B = { readonly s: string; readonly a: A | null };\n"));
R.push(fRow("mutual-same-obj-two-types", "P", () => { const o: any = { a: 1, s: "x", b: null }; o.b = null; return { x: o, y: o }; }, (v) => isObj(v) && isNum(v.x?.a) && isStr(v.y?.s) && !("s" in v.x) && !("a" in v.y), "type X = { readonly a: number; readonly next: X | null };\ntype Y = { readonly s: string; readonly next: Y | null };\ntype P = { readonly x: { readonly a: number; readonly b: X | null }; readonly y: { readonly s: string; readonly b: Y | null } };\n"));
R.push(fRow("dag-two-shapes", "P", () => { const o: any = { a: 1, s: "x", next: null }; return { x: o, y: o }; }, (v) => isObj(v) && isObj(v.x) && isObj(v.y) && isNum(v.x.a) && isStr(v.y.s) && Object.keys(v.x).join() === "a,next" && Object.keys(v.y).join() === "s,next", "type X = { readonly a: number; readonly next: X | null };\ntype Y = { readonly s: string; readonly next: Y | null };\ntype P = { readonly x: X; readonly y: Y };\n", true));
R.push(fRow("generic-list-two", "P", () => ({ a: { v: 1, next: null }, b: { v: "s", next: null } }), (v) => isObj(v) && isNum(v.a?.v) && isStr(v.b?.v), "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype P = { readonly a: L<number>; readonly b: L<string> };\n", true));
R.push(fRow("generic-list-shared", "P", () => { const n = { v: 1, next: null }; return { a: n, b: n }; }, (v) => isObj(v) && isNum(v.a?.v) && isStr(v.b?.v), "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype P = { readonly a: L<number>; readonly b: L<string> };\n"));
R.push(fRow("generic-list-shared-deep", "P", () => { const n = { v: 1, next: null }; return { a: { v: 0, next: n }, b: { v: "s", next: n } }; }, (v) => isObj(v) && isNum(v.a?.next?.v) && isStr(v.b?.next?.v), "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype P = { readonly a: L<number>; readonly b: L<string> };\n"));
R.push(fRow("generic-nested-T-obj", "L<{ readonly n: number }>", () => ({ v: { n: 1 }, next: { v: { n: "x" }, next: null } }), (v) => isObj(v) && isNum(v.v?.n) && (v.next === null || isNum(v.next.v?.n)), "type L<T> = { readonly v: T; readonly next: L<T> | null };\n"));
R.push(fRow("generic-two-aliases-same-show", "P", () => ({ a: { v: [1], next: null }, b: { v: ["s"], next: null } }), (v) => isObj(v) && typeof v.a?.v?.[0] === "number" && typeof v.b?.v?.[0] === "string", "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype P = { readonly a: L<readonly number[]>; readonly b: L<readonly string[]> };\n", true));
R.push(fRow("deep-generic-args-show", "P", () => ({ a: { v: [[[[[[1]]]]]], next: null }, b: { v: [[[[[["s"]]]]]], next: null } }), (v) => isObj(v) && typeof v.a?.v?.[0]?.[0]?.[0]?.[0]?.[0]?.[0] === "number" && typeof v.b?.v?.[0]?.[0]?.[0]?.[0]?.[0]?.[0] === "string", "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype D1 = readonly (readonly (readonly (readonly (readonly (readonly number[])[])[])[])[])[];\ntype D2 = readonly (readonly (readonly (readonly (readonly (readonly string[])[])[])[])[])[];\ntype P = { readonly a: L<D1>; readonly b: L<D2> };\n", true));
R.push(fRow("deep-generic-args-swap", "P", () => ({ a: { v: [[[[[["s"]]]]]], next: null }, b: { v: [[[[[[1]]]]]], next: null } }), (v) => isObj(v) && typeof v.a?.v?.[0]?.[0]?.[0]?.[0]?.[0]?.[0] === "number" && typeof v.b?.v?.[0]?.[0]?.[0]?.[0]?.[0]?.[0] === "string", "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype D1 = readonly (readonly (readonly (readonly (readonly (readonly number[])[])[])[])[])[];\ntype D2 = readonly (readonly (readonly (readonly (readonly (readonly string[])[])[])[])[])[];\ntype P = { readonly a: L<D1>; readonly b: L<D2> };\n"));
R.push(fRow("rec-union-json", "J", () => [1, "a", [null, [true]]], (v) => JSON.stringify(v) === '[1,"a",[null,[true]]]', "type J = null | boolean | number | string | readonly J[];\n", true));
R.push(fRow("rec-union-json-bad", "J", () => [1, "a", [undefined]], (v) => !JSON.stringify(v).includes("null"), "type J = null | boolean | number | string | readonly J[];\n"));
R.push(fRow("rec-tuple", "T", () => [1, [2, [3, null]]], (v) => Array.isArray(v) && v.length === 2, "type T = readonly [number, T | null];\n", true));
R.push(fRow("rec-through-opt", "R", () => ({ n: 1, r: { n: "x" } }), (v) => isObj(v) && isNum(v.n) && (v.r === undefined || isNum(v.r.n)), "type R = { readonly n: number; readonly r?: R };\n"));
R.push(fRow("rec-three-ring", "A", () => ({ b: { c: { a: { b: null } } } }), (v) => isObj(v), "type A = { readonly b: B | null };\ntype B = { readonly c: C };\ntype C = { readonly a: A };\n", true));
R.push(fRow("rec-generic-growing", "N<number>", () => ({ next: null }), () => true, "type N<T> = { readonly next: N<readonly T[]> | null };\n"));
// --- unions
R.push(fRow("union-tag-dup", "{ readonly k: \"a\"; readonly n: number } | { readonly k: \"a\"; readonly s: string }", () => ({ k: "a", n: 1 }), (v) => isObj(v) && ((v.k === "a" && isNum(v.n)) || isStr(v.s))));
R.push(fRow("union-tag-getter", "{ readonly k: \"a\"; readonly n: number } | { readonly k: \"b\"; readonly s: string }", () => { let i = 0; return { get k() { return i++ === 0 ? "a" : "b"; }, n: 1, s: "x" }; }, (v) => isObj(v) && ((v.k === "a" && isNum(v.n)) || (v.k === "b" && isStr(v.s)))));
R.push(fRow("union-tag-getter-rev", "{ readonly k: \"a\"; readonly n: number } | { readonly k: \"b\"; readonly s: string }", () => { let i = 0; return { get k() { return i++ === 0 ? "b" : "a"; }, n: 1, s: "x" }; }, (v) => isObj(v) && ((v.k === "a" && isNum(v.n) && !("s" in v)) || (v.k === "b" && isStr(v.s) && !("n" in v)))));
R.push(fRow("union-untagged-getter", "{ readonly a: number; readonly b: number } | { readonly a: string; readonly c: string }", () => { let i = 0; return { get a() { return i++ === 0 ? 1 : "s"; }, c: "x" }; }, (v) => isObj(v) && ((isNum(v.a) && isNum(v.b)) || (isStr(v.a) && isStr(v.c)))));
R.push(fRow("union-tag-bool", "{ readonly t: true; readonly n: number } | { readonly t: false; readonly s: string }", () => ({ t: false, n: 1 }), (v) => isObj(v) && ((v.t === true && isNum(v.n)) || (v.t === false && isStr(v.s)))));
R.push(fRow("union-tag-numlit", "{ readonly t: 1; readonly n: number } | { readonly t: 2; readonly s: string }", () => ({ t: "1", n: 1 }), (v) => isObj(v) && ((v.t === 1 && isNum(v.n)) || (v.t === 2 && isStr(v.s)))));
R.push(fRow("union-tag-optional-second", "{ readonly k: \"a\"; readonly n: number } | { readonly k?: \"b\"; readonly s: string }", () => ({ s: "x" }), (v) => isObj(v) && ((v.k === "a" && isNum(v.n)) || ((v.k === undefined || v.k === "b") && isStr(v.s))), "", true));
R.push(fRow("union-arr-or-tuple", "readonly number[] | readonly [string]", () => ["s"], (v) => Array.isArray(v) && (v.every(isNum) || (v.length === 1 && isStr(v[0]))), "", true));
R.push(fRow("union-rec-or-unknown", "{ readonly n: number } | unknown", () => ({ n: "x", f: 1 }), () => true));
R.push(fRow("union-null-undef", "null | undefined", () => undefined, (v) => v === null || v === undefined, "", true));
R.push(fRow("union-proxy-tag", "{ readonly k: \"a\"; readonly n: number } | { readonly k: \"b\"; readonly s: string }", () => { let i = 0; return new Proxy({ k: "a", n: 1, s: "x" }, { get: (t: any, p) => (p === "k" ? (i++ === 0 ? "a" : "b") : t[p]) }); }, (v) => isObj(v) && ((v.k === "a" && isNum(v.n)) || (v.k === "b" && isStr(v.s)))));
// --- tuples and optional members
R.push(fRow("tuple-optional-el", "readonly [number, string?]", () => [1, undefined], (v) => Array.isArray(v) && isNum(v[0]) && (v[1] === undefined || isStr(v[1])) && v.length <= 2));
R.push(fRow("tuple-optional-el-num", "readonly [number, string?]", () => [1, 2], (v) => Array.isArray(v) && isNum(v[0]) && (v[1] === undefined || isStr(v[1]))));
R.push(fRow("tuple-optional-short", "readonly [number, string?]", () => [1], (v) => Array.isArray(v) && isNum(v[0]), "", true));
R.push(fRow("tuple-rest", "readonly [number, ...string[]]", () => [1, 2, 3], (v) => Array.isArray(v) && isNum(v[0]) && v.slice(1).every(isStr)));
R.push(fRow("tuple-rest-ok", "readonly [number, ...string[]]", () => [1, "a", "b"], (v) => Array.isArray(v) && isNum(v[0]) && v.slice(1).every(isStr), "", true));
R.push(fRow("tuple-named", "readonly [a: number, b: string]", () => [1, 2], (v) => Array.isArray(v) && isNum(v[0]) && isStr(v[1])));
R.push(fRow("tuple-proxy-len", "readonly [number, number]", () => { let i = 0; return new Proxy([1, 2], { get: (t: any, p) => (p === "length" ? (i++ === 0 ? 2 : 3) : t[p]) }); }, (v) => Array.isArray(v) && v.length === 2 && v.every(isNum)));
R.push(fRow("tuple-sparse", "readonly [number, number]", () => [1, , ], (v) => Array.isArray(v) && v.every(isNum)));
R.push(fRow("opt-undefined-explicit", "{ readonly a?: number | undefined }", () => ({ a: undefined }), (v) => isObj(v) && (v.a === undefined || isNum(v.a)), "", true));
R.push(fRow("opt-inherited", "{ readonly a?: number }", () => Object.create({ a: "x" }), (v) => isObj(v) && (v.a === undefined || isNum(v.a))));
R.push(fRow("opt-getter-undef-then-val", "{ readonly a?: number }", () => { let i = 0; return { get a() { return i++ === 0 ? undefined : "x"; } }; }, (v) => isObj(v) && (v.a === undefined || isNum(v.a))));
R.push(fRow("required-undef", "{ readonly a: number | undefined }", () => ({}), (v) => isObj(v) && "a" in v));
R.push(fRow("proxy-hasown-lies", "{ readonly a?: number }", () => new Proxy({}, { getOwnPropertyDescriptor: () => ({ value: 1, configurable: true, enumerable: true }), get: () => "x" }), (v) => isObj(v) && (v.a === undefined || isNum(v.a))));
// --- primitives and odd values
R.push(fRow("neg-zero-lit", "0", () => -0, (v) => Object.is(v, 0) || Object.is(v, -0)));
R.push(fRow("nan-for-lit", "1", () => NaN, (v) => v === 1));
R.push(fRow("string-object", "string", () => Object("s"), isStr));
R.push(fRow("symbol-value", "unknown", () => Symbol("s"), (v) => typeof v !== "symbol"));
R.push(fRow("bigint-under-unknown", "unknown", () => 1n, (v) => typeof v !== "bigint"));
R.push(fRow("bigint-in-arr-unknown", "unknown", () => [1n], (v) => Array.isArray(v) && typeof v[0] !== "bigint"));
R.push(fRow("symbol-in-unknown-obj", "unknown", () => ({ s: Symbol("x") }), (v) => isObj(v) && typeof v.s !== "symbol"));
R.push(fRow("date-under-unknown", "unknown", () => ({ d: new Date(0) }), (v) => isObj(v) && clean(v) === null));
R.push(fRow("map-under-unknown", "unknown", () => [new Map([[1, 2]])], (v) => clean(v) === null));
R.push(fRow("typed-under-unknown", "unknown", () => ({ t: new Uint8Array([1]) }), (v) => clean(v) === null));
R.push(fRow("arraylike-for-array", "readonly number[]", () => ({ length: 1, 0: 1 }), (v) => Array.isArray(v)));
R.push(fRow("arguments-object", "readonly number[]", () => (function (..._a: number[]) { return arguments; })(1, 2), (v) => Array.isArray(v)));
R.push(fRow("array-subclass", "readonly number[]", () => { class A extends Array<number> {} const a = new A(); a.push(1); return a; }, (v) => Array.isArray(v) && Object.getPrototypeOf(v) === Array.prototype));
R.push(fRow("array-own-proto-field", "unknown", () => JSON.parse('[{"__proto__": [1]}]'), (v) => Array.isArray(v) && Object.getPrototypeOf(v[0]) === Object.prototype, "", true));
R.push(fRow("constructor-key", "{ readonly constructor: number }", () => ({ constructor: 1 }), (v) => isObj(v) && isNum(v.constructor), "", true));
R.push(fRow("proto-key-declared", "{ readonly toString: string }", () => ({}), (v) => isObj(v) && isStr(v.toString)));
R.push(fRow("huge-array", "readonly number[]", () => { const a = new Array(200000).fill(1); return a; }, (v) => Array.isArray(v) && v.length === 200000, "", true));
R.push(fRow("huge-length-sparse", "readonly (number | undefined)[]", () => { const a: number[] = []; a.length = 2 ** 24; return a; }, (v) => Array.isArray(v)));
R.push(fRow("deep-unknown", "unknown", () => { let o: unknown = 1; for (let i = 0; i < 20000; i++) o = [o]; return o; }, () => true));
R.push(fRow("deep-rec-chain-arr", "C", () => { let o: unknown = null; for (let i = 0; i < 20000; i++) o = [o]; return o; }, () => true, "type C = readonly C[] | null;\n"));
R.push(fRow("revoked-proxy", "{ readonly n: number }", () => { const r = Proxy.revocable({ n: 1 }, {}); r.revoke(); return r.proxy; }, (v) => isObj(v) && isNum(v.n)));
R.push(fRow("proxy-ownkeys-dup", "unknown", () => new Proxy({ a: 1 }, { ownKeys: () => ["a", "a"] }), () => true));
R.push(fRow("frozen-input-same-identity", "readonly number[]", () => Object.freeze([1, 2]), (v) => Array.isArray(v), "", true));
// --- interfaces and prelude declarations
R.push(fRow("iface-extends", "B", () => ({ b: "x" }), (v) => isObj(v) && isNum(v.a) && isStr(v.b), "interface A { readonly a: number }\ninterface B extends A { readonly b: string }\n"));
R.push(fRow("intersection", "A & { readonly b: string }", () => ({ b: "x" }), (v) => isObj(v) && isNum(v.a) && isStr(v.b), "type A = { readonly a: number };\n"));
R.push(fRow("readonly-util", "Readonly<{ a: number }>", () => ({ a: "x" }), (v) => isObj(v) && isNum(v.a)));
R.push(fRow("partial-util", "Partial<{ readonly a: number }>", () => ({ a: "x" }), (v) => isObj(v) && (v.a === undefined || isNum(v.a))));
R.push(fRow("record-lit-keys", "Record<\"a\" | \"b\", number>", () => ({ a: 1 }), (v) => isObj(v) && isNum(v.a) && isNum(v.b)));
R.push(fRow("pick-util", "Pick<{ readonly a: number; readonly b: string }, \"a\">", () => ({ a: "x" }), (v) => isObj(v) && isNum(v.a)));
R.push(fRow("events-forged", "Events<number>", () => ({ events: "x" }), () => false));
R.push(fRow("listener-forged", "Listener", () => ({ listener: "x" }), () => false));
R.push(fRow("pool-forged", "Pool", () => ({ size: 3 }), () => false));
R.push(fRow("elem-forged", "Elem", () => ({ tag: "script", children: ["x"] }), () => false));
R.push(fRow("pointer-data", "PointerData", () => ({ x: 1, y: 2, t: 3, id: 4, buttons: 0 }), (v) => isObj(v) && isNum(v.x), "", true));
R.push(fRow("cast-of-cast", "Cast<number>", () => ({ ok: true, value: "x" }), (v) => isObj(v) && (v.ok === false || isNum(v.value))));
R.push(fRow("template-literal-type", "`a${string}`", () => "b", (v) => isStr(v) && v.startsWith("a")));
R.push(fRow("keyof-type", "keyof { readonly a: 1; readonly b: 2 }", () => "c", (v) => v === "a" || v === "b"));
R.push(fRow("indexed-access", "{ readonly a: number }[\"a\"]", () => "x", isNum));
R.push(fRow("typeof-const", "typeof k", () => "x", isNum));
R.push(fRow("empty-rec", "{}", () => 5, () => true));
R.push(fRow("void-type", "void", () => 1, (v) => v === undefined));
R.push(fRow("enum-like-union", "\"a\" | \"b\" | 1 | true", () => true, (v) => ["a", "b", 1, true].includes(v), "", true));
// controls: the vehicle sees an unchecked value
R.push(fRow("ctl-tree-bad", "Tree", () => ({ v: 1, kids: [{ v: "x", kids: [] }] }), isTree, "type Tree = { readonly v: number; readonly kids: readonly Tree[] };\n", false, true));
R.push(fRow("ctl-generic-shared", "P", () => { const n = { v: 1, next: null }; return { a: n, b: n }; }, (v) => isObj(v) && isNum(v.a?.v) && isStr(v.b?.v), "type L<T> = { readonly v: T; readonly next: L<T> | null };\ntype P = { readonly a: L<number>; readonly b: L<string> };\n", false, true));
export const cands = R;
