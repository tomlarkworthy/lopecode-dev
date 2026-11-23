// cast (e1, 2026-11-23): cast<T>(v) (S9.8) checks a value from fetch against T at run time. Each row's json() gives a
// value made in JavaScript (fetchValue: a proxy, a getter, a prototype trick, a hole), and cell g casts it to the row's
// type and returns the result. driveG checks what g published, with an oracle written here by hand for the row's type
// (not the shape the checker derived): a result with ok true whose value is not a T, is not deep-frozen, has a getter, a
// prototype other than Object's or Array's, a property the type does not declare, or is the value fetch gave, says DIFF.
// A result with ok false is sound; rows named cast-ok-* must be ok (live.test.ts asserts it). Controls (ctl) skip the
// checker and skip cast: `v as T` hands the value over unchecked, so the oracle sees what a missing check lets through.
type A = { name: string; src: string; ctl?: boolean; drive?: (p: any) => unknown; fetchValue?: () => unknown };
type Oracle = (v: unknown) => boolean;
const G = (t: string) => `const g = async (fetch: Fetch) => {\n  const res = await fetch("x");\n  return cast<${t}>(await res.json());\n};`;
const CTL = (t: string) => `const g = async (fetch: Fetch) => {\n  const res = await fetch("x");\n  return { ok: true, value: (await res.json()) as ${t} };\n};`;
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object";
// plain, frozen, own data properties only, all the way down; keys: the members allowed at the top
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
const keysOnly = (v: unknown, ks: string[]) => isObj(v) && Object.keys(v).every((k) => ks.includes(k));
const driveG = (oracle: Oracle, given: () => unknown, mustOk = false) => async (p: any) => {
  const r = p.value("g");
  if (!isObj(r)) return `same: g not a value (${p.status("g")} ${String(p.error?.("g") ?? "").slice(0, 100)})`;
  if (r.ok !== true) return mustOk ? `DIFF: a ${typeof r.value} that is a T was refused: ${String(r.error).slice(0, 120)}` : `same: refused at ${String(r.path)}: ${String(r.error).slice(0, 120)}`;
  const v = r.value;
  if (isObj(v) && v === last.get(given)) return "DIFF the value fetch gave was handed out";
  const c = clean(v);
  if (c) return `DIFF the value is ${c}`;
  return oracle(v) ? "same: ok, and the value is a T" : `DIFF ok, but the value is not a T: ${JSON.stringify(v)?.slice(0, 100)}`;
};
// the value fetch gave, per row (driveG compares identity)
const last = new Map<() => unknown, unknown>();
const give = (f: () => unknown) => { const g = () => { const v = f(); last.set(g, v); return v; }; return g; };
const num = (x: unknown) => typeof x === "number";
const recN: Oracle = (v) => isObj(v) && num(v.n) && keysOnly(v, ["n"]);
let reads = 0;
type Row = [name: string, type: string, value: () => unknown, oracle: Oracle, mustOk?: boolean];
export const ROWS: Row[] = [
  ["wrong-member", "{ readonly n: number }", () => ({ n: "1" }), recN],
  ["getter-changes", "{ readonly n: number }", () => { reads = 0; return { get n() { return reads++ === 0 ? 1 : "x"; } }; }, recN],
  ["getter-throws", "{ readonly n: number }", () => ({ get n(): number { throw new Error("boom"); } }), recN],
  ["proxy-get-changes", "{ readonly n: number }", () => { let k = 0; return new Proxy({ n: 1 }, { get: () => (k++ === 0 ? 1 : "x") }); }, recN],
  ["proxy-has-lies", "{ readonly n: number }", () => new Proxy({}, { has: () => true, getOwnPropertyDescriptor: () => undefined, get: () => undefined }), recN],
  ["proxy-proto-trap-throws", "{ readonly n: number }", () => new Proxy({ n: 1 }, { getPrototypeOf: () => { throw new Error("trap"); } }), recN],
  ["proxy-ownkeys-unknown", "unknown", () => new Proxy({ a: 1 }, { ownKeys: () => ["a", "b"], getOwnPropertyDescriptor: (_t, k) => ({ value: k === "a" ? 1 : () => 0, enumerable: true, configurable: true }) }), (v) => clean(v) === null],
  ["inherited-member", "{ readonly n: number }", () => Object.create({ n: 1 }), recN],
  ["proto-key-under-unknown", "{ readonly a: unknown }", () => JSON.parse('{"a":{"__proto__":{"polluted":1}}}'), (v) => isObj(v) && isObj(v.a) && Object.getPrototypeOf(v.a) === Object.prototype, true],
  ["class-instance", "{ readonly n: number }", () => Object.assign(new Date(0), { n: 1 }), recN],
  ["map-for-record", "{ readonly n: number }", () => new Map([["n", 1]]), recN],
  ["extra-members", "{ readonly n: number }", () => ({ n: 1, extra: { f: () => 0 } }), recN, true],
  ["null-proto", "{ readonly n: number }", () => Object.assign(Object.create(null), { n: 1 }), recN, true],
  ["symbol-key", "{ readonly n: number }", () => ({ n: 1, [Symbol("s")]: 2 }), recN, true],
  ["nan", "{ readonly n: number }", () => ({ n: NaN }), (v) => isObj(v) && Number.isNaN(v.n), true],
  ["bigint", "{ readonly n: number }", () => ({ n: 1n }), recN],
  ["boxed-string", "{ readonly s: string }", () => ({ s: new String("a") }), (v) => isObj(v) && typeof v.s === "string"],
  ["string-for-boolean", "{ readonly b: boolean }", () => ({ b: "true" }), (v) => isObj(v) && typeof v.b === "boolean"],
  ["sparse-array", "readonly number[]", () => [1, , 3], (v) => Array.isArray(v) && v.length === 3 && v.every(num)],
  ["sparse-array-undef", "readonly (number | undefined)[]", () => [1, , 3], (v) => Array.isArray(v) && v.length === 3 && Object.keys(v).length === 3, true],
  ["array-extra-prop", "readonly number[]", () => Object.assign([1, 2], { foo: () => 0 }), (v) => Array.isArray(v) && Object.keys(v).join() === "0,1", true],
  ["array-proxy-length", "readonly number[]", () => { let k = 0; return new Proxy([1, 2], { get: (t, p) => (p === "length" ? (k++ === 0 ? 2 : 5) : Reflect.get(t, p)) }); }, (v) => Array.isArray(v) && v.every(num)],
  ["tuple-long", "readonly [number, number]", () => [1, 2, 3], (v) => Array.isArray(v) && v.length === 2],
  ["tuple-short", "readonly [number, number]", () => [1], (v) => Array.isArray(v) && v.length === 2 && v.every(num)],
  ["literal-union", "\"a\" | \"b\"", () => "c", (v) => v === "a" || v === "b"],
  ["tagged-union-mixed", "{ readonly k: \"a\"; readonly n: number } | { readonly k: \"b\"; readonly s: string }", () => ({ k: "a", s: "x" }), (v) => isObj(v) && ((v.k === "a" && num(v.n)) || (v.k === "b" && typeof v.s === "string"))],
  ["optional-null", "{ readonly s?: string }", () => ({ s: null }), (v) => isObj(v) && (v.s === undefined || typeof v.s === "string")],
  ["optional-absent", "{ readonly s?: string }", () => ({}), (v) => isObj(v) && !("s" in v), true],
  ["null-for-record", "{ readonly n: number }", () => null, recN],
  ["cycle", "{ readonly self?: R }", () => { const o: Record<string, unknown> = {}; o.self = o; return o; }, (v) => clean(v) === null],
  ["function-under-unknown", "unknown", () => ({ f: () => 0 }), (v) => clean(v) === null],
  ["thenable-under-unknown", "unknown", () => ({ then: (r: (x: number) => void) => r(1) }), (v) => clean(v) === null],
  ["deep-chain", "L", () => { let o: unknown = null; for (let i = 0; i < 5000; i++) o = { next: o }; return o; }, (v) => isObj(v), true],
];
// T for the rows whose type names an alias
const DECLS: Record<string, string> = { cycle: "type R = { readonly self?: R };\n", "deep-chain": "type L = { readonly next: L | null };\n" };
const typeOf = (r: Row) => (r[0] === "cycle" ? "R" : r[1]);
export const attacks: A[] = [
  ...ROWS.map((r): A => { const f = give(r[2]); return { name: `cast-${r[4] ? "ok-" : ""}${r[0]}`, src: (DECLS[r[0]] ?? "") + G(typeOf(r)), fetchValue: f, drive: driveG(r[3], f, r[4] ?? false) }; }),
  // the original changed after the cast: the copy does not change with it
  (() => { const o = { n: 1 }; const f = give(() => o); return { name: "cast-ok-original-changed-after", src: G("{ readonly n: number }"), fetchValue: f, drive: async (p: any) => { const r = p.value("g"); o.n = 2; return r?.ok && r.value.n === 1 ? await driveG(recN, f, true)(p) : `DIFF the copy follows the original: ${JSON.stringify(r)}`; } }; })(),
  ...(["wrong-member", "getter-changes", "inherited-member", "extra-members"] as const).map((id): A => {
    const r = ROWS.find((x) => x[0] === id)!, f = give(r[2]);
    return { name: `cast-ctl-${id}`, src: CTL(r[1]), ctl: true, fetchValue: f, drive: driveG(r[3], f) };
  }),
];
