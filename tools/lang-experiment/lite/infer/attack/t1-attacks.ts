// t1 (2026-11-24): selfhost/freeze-attack10's six breaks (A-1, B-1, E-1, F-1, F-2, F-3) and near variants. A row named
// t1-ok-* must be accepted and behave; every other row must be rejected (live.test.ts asserts both, in both checkers).
// A row with ctl runs with the checker skipped and must show the break (counted apart as t1-controls); one whose name
// holds "-rt-" fires only when run compiled (run-sets.ts --rt), as F-1 and F-2 do. Every row is run by both runners:
// run-sets.ts --sets t1 (runCells) and --sets t1 --rt (compiled, drive-rt.ts). tyRow (lib9) reads cell g and says
// DIFF when g holds a value outside its checked type.
import { tyRow, type Cand } from "../../../selfhost/freeze-attack9/lib9.ts";
type A = Cand;
const R: A[] = [];
const num = (v: unknown) => typeof v === "number";
const str = (v: unknown) => typeof v === "string";
const any = () => true;
const ctl = (a: A): A => ({ ...a, ctl: true });

// A-1: a response given a type that takes any object. RESP: a value of a listed cell holds a Response
const U = `"https://x.test/"`;
const holds = async (v: unknown, d = 0, seen = new Set<unknown>()): Promise<boolean> => {
  if (d > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return false;
  seen.add(v);
  if (v instanceof Response) return true;
  if (v instanceof Promise) { try { return await holds(await v, d + 1, seen); } catch { return false; } }
  try {
    if (typeof v === "function") return v.length === 0 && !("go" in v) ? await holds((v as () => unknown)(), d + 1, seen) : false;
    if (v instanceof Map) { for (const [a, b] of v) if (await holds(a, d + 1, seen) || await holds(b, d + 1, seen)) return true; return false; }
    if (v instanceof Set) { for (const a of v) if (await holds(a, d + 1, seen)) return true; return false; }
    for (const k of Object.keys(v)) if (await holds((v as Record<string, unknown>)[k], d + 1, seen)) return true;
  } catch {}
  return false;
};
const resp = (name: string, src: string): A => ({ name, src, fetchBody: "body", show: ["r"],
  drive: async (p: any) => (await holds(p.value("r")) ? "DIFF RESP r holds a Response" : `same: r ${p.status("r")} ${String(p.error("r") ?? "").slice(0, 100)}`) });
const P = (b: string) => `const r = async (fetch: Fetch) => { const res = await fetch(${U}); ${b} };`;
R.push(resp("t1-a-empty-direct", P(`const c: {} = res; return c;`)));
R.push(resp("t1-a-empty-record", P(`const c: {} = res; return { c };`)));
R.push(resp("t1-a-empty-array", P(`const c: {} = res; return [c];`)));
R.push(resp("t1-a-empty-map", P(`const c: {} = res; return new Map([["k", c]]);`)));
R.push(resp("t1-a-empty-kept", P(`const c: {} = res; return () => c;`)));
R.push(resp("t1-a-iface-empty", `interface E {}\n` + P(`const c: E = res; return c;`)));
R.push(resp("t1-a-alias-empty", `type E = { };\n` + P(`const c: E = res; return { c };`)));
R.push(resp("t1-a-generic-empty", P(`const id = <T,>(x: T): T => x; return id<{}>(res);`)));
R.push(resp("t1-a-union-empty", P(`const c: {} | undefined = res; return c;`)));
R.push(resp("t1-a-union-num-empty", P(`const c: number | {} = res; return { c };`)));
R.push(resp("t1-a-optional-only", P(`const c: { readonly a?: number } = res; return c;`)));
R.push(resp("t1-a-optional-only-alias", `type O = { readonly a?: number; readonly b?: string };\n` + P(`const c: O = res; return [c];`)));
R.push(resp("t1-a-empty-elements", P(`const cs: {}[] = [res]; return cs;`)));
R.push(resp("t1-a-empty-param", P(`const keep = (x: {}) => [x]; return keep(res);`)));
R.push(resp("t1-a-empty-promise", P(`return Promise.resolve<{}>(res);`)));
R.push(resp("t1-a-empty-ternary", P(`const c: {} = res.ok ? res : 1; return { c };`)));
R.push(resp("t1-a-empty-then", `const r = (fetch: Fetch) => fetch(${U}).then((res): {} => res);`));
R.push(resp("t1-ok-a-status", P(`const c = res.status; return { c };`)));
R.push(resp("t1-ok-a-text", P(`return await res.text();`)));
R.push(tyRow("t1-ok-a-empty-number", `const g = () => { const c: {} = 1; return [c]; };`, any));
R.push(tyRow("t1-ok-a-empty-array-of-mut", `const g = () => { const xs = [1]; const c: {} = xs; xs.push(2); return { c, n: xs.length }; };`, (v: any) => v?.n === 2));
R.push(tyRow("t1-ok-a-optional-record", `const g = () => { const o = { a: 1 }; const c: { readonly a?: number } = o; return c.a ?? 0; };`, num));
R.push(tyRow("t1-a-empty-array-kept-writer", `const g = () => { const xs = [1]; const c: {} = xs; return { c, f: () => xs.push(2) }; };`, any));
// A-1 narrowed: such a type keeps the members it declares (an Action there is accepted) and hides the others
const ACT1 = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
R.push(tyRow("t1-ok-a-declared-optional-action", ACT1 + `const g = (a: Action<[]>) => { const o: { readonly go?: Action<[]> } = { go: a }; return o.go === undefined ? 0 : 1; };`, num));
R.push(tyRow("t1-a-undeclared-action", ACT1 + `const g = (a: Action<[]>) => { const r = { go: a, n: 1 }; const o: { readonly n?: number } = r; return o.n ?? 0; };`, num));
// A-1 first walked each record type for one that takes any object, expanding an alias at every member: on this wide recursive union one check took 39.6 s
// (2026-11-24, and it did not return on acorn-kids.ss.ts); it must return, and be accepted
const WIDE = Array.from({ length: 30 }, (_, i) => `{ readonly k: "v${i}"; readonly a${i}: N | null; readonly b${i}: N | null; readonly c${i}: readonly N[] }`).join(" | ");
R.push(tyRow("t1-ok-a-wide-recursive-union", `type N = ${WIDE};\nconst g = () => { const f = (n: N): number => (n.k === "v0" ? 1 : 2); const v: N = { k: "v0", a0: null, b0: null, c0: [] }; return f(v); };`, num));
R.push(ctl(resp("t1-a-ctl-empty", P(`const c: {} = res; return c;`))));

// B-1: an optional member named after an Object.prototype member reads the inherited member
const tof = (v: unknown) => v === "undefined" || v === "number";
R.push(tyRow("t1-b-plain-optional-toString", `const g = () => { const v: { readonly toString?: number } = {}; return typeof v.toString; };`, tof));
R.push(tyRow("t1-b-plain-optional-constructor", `const g = () => { const v: { readonly constructor?: number } = {}; return typeof v.constructor; };`, tof));
R.push(tyRow("t1-b-plain-optional-valueOf-num", `const g = () => { const v: { readonly valueOf?: number } = {}; return (v.valueOf ?? 0) + 1; };`, num));
R.push(tyRow("t1-b-widen-optional-toString", `const g = () => { const m: { [k: string]: number } = { x: 1 }; const v: { readonly toString?: number } = m; return typeof v.toString; };`, tof));
R.push(tyRow("t1-b-optional-proto", `const g = () => { const v: { readonly __proto__?: number } = {}; return typeof v.__proto__; };`, tof));
R.push(tyRow("t1-b-optional-hasOwnProperty", `const g = () => { const v: { readonly hasOwnProperty?: string } = {}; return typeof v.hasOwnProperty; };`, (v) => v === "undefined" || v === "string"));
R.push(tyRow("t1-b-iface-optional", `interface T { readonly valueOf?: number }\nconst g = () => { const v: T = {}; return typeof v.valueOf; };`, tof));
R.push(tyRow("t1-b-alias-optional", `type T = { readonly isPrototypeOf?: number };\nconst g = () => { const v: T = {}; return typeof v.isPrototypeOf; };`, tof));
R.push(tyRow("t1-b-nested-optional", `const g = () => { const v: { readonly o: { readonly toLocaleString?: number } } = { o: {} }; return typeof v.o.toLocaleString; };`, tof));
R.push(tyRow("t1-b-param-optional", `const h2 = () => (v: { readonly toString?: number }) => typeof v.toString;\nconst g = (h2: (v: { readonly toString?: number }) => string) => h2({});`, tof));
R.push(tyRow("t1-b-cell-param-optional", `const m = () => ({ x: 1 });\nconst g = (m: { readonly valueOf?: number }) => typeof m.valueOf;`, tof));
R.push(tyRow("t1-b-required-proto", `const g = () => { const v: { readonly __proto__: number } = { __proto__: 1 }; return typeof v.__proto__; };`, num));
R.push(tyRow("t1-b-proto-lookup-getter", `const g = () => { const v: { readonly __lookupGetter__?: number } = {}; return typeof v.__lookupGetter__; };`, tof));
R.push(tyRow("t1-ok-b-optional-other", `const g = () => { const v: { readonly a?: number } = {}; return typeof v.a; };`, tof));
R.push(tyRow("t1-ok-b-required-own", `const g = () => { const v: { readonly toString: number } = { toString: 1 }; return typeof v.toString; };`, (v) => v === "number"));
R.push(tyRow("t1-ok-b-member-key", `const g = () => { const v = { valueOf: 2 }; return v.valueOf + 1; };`, num));
R.push(ctl(tyRow("t1-b-ctl-plain-optional", `const g = () => { const v: { readonly toString?: number } = {}; return typeof v.toString; };`, tof)));

// E-1: a nested function narrows a captured let or parameter that the declaring function assigns
const G = (b: string) => `const g = () => { ${b} };`;
const AG = (b: string) => `const g = async () => { ${b} };`;
R.push(tyRow("t1-e-await-outer-write-typeof", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p;`), num));
R.push(tyRow("t1-e-await-param-prim", AG(`const f = async (r: number | string) => { const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p; }; return await f(1);`), num));
R.push(tyRow("t1-e-await-loop", AG(`let r: number | string = 1; const get = async () => { let t = 0; if (typeof r === "number") { for (let i = 0; i < 2; i++) { await null; t = t + r; } } return t; }; const p = get(); r = "s"; return await p;`), num));
R.push(tyRow("t1-e-two-nested", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const flip = () => 1; const p = get(); r = "s"; flip(); return await p;`), num));
R.push(tyRow("t1-e-await-null-prim", AG(`let r: string | null = "a"; const get = async () => { if (r !== null) { await null; return r.length; } return 0; }; const p = get(); r = null; return await p;`), num));
R.push(tyRow("t1-e-await-param-object", AG(`const f = async (r: { readonly n: number } | null) => { const get = async () => { if (r !== null) { await null; return r.n; } return 0; }; const p = get(); r = null; return await p; }; return await f({ n: 1 });`), num));
R.push(tyRow("t1-e-outer-narrow-kept-read", G(`let r: number | string = 1; if (typeof r === "number") { const f = () => r + 1; r = "s"; return f(); } return 0;`), num));
R.push(tyRow("t1-e-outer-narrow-param-read", `const f = (r: number | string) => { if (typeof r === "number") { const k = () => r * 2; r = "s"; return k(); } return 0; };\nconst g = (f: (r: number | string) => number) => f(1);`, num));
R.push(tyRow("t1-e-update-captured", G(`let r: number | undefined = 1; const get = () => (r !== undefined ? r + 1 : 0); r = undefined; return get();`), num));
R.push(tyRow("t1-e-gen-outer-prim", G(`let r: number | string = 1; const gen = function* () { if (typeof r === "number") { yield 0; return r + 1; } return 0; }; const it = gen(); it.next(); r = "s"; const x = it.next(); return typeof x.value === "number" ? x.value : -1;`), num));
R.push(tyRow("t1-ok-e-captured-never-assigned", G(`let r: number | string = 1; const get = () => (typeof r === "number" ? r + 1 : 0); return get();`), num));
R.push(tyRow("t1-ok-e-assigned-not-captured", G(`let r: number | string = 1; r = 2; if (typeof r === "number") return r + 1; return 0;`), num));
R.push(tyRow("t1-ok-e-const-copy", AG(`let r: number | string = 1; const y = r; const get = async () => { if (typeof y === "number") { await null; return y + 1; } return 0; }; const p = get(); r = "s"; return await p;`), num));
R.push(ctl(tyRow("t1-e-ctl-await-outer", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p;`), num)));

// F-1, F-2, F-3: names the compiled module binds by name
for (const cap of ["now", "random", "fetch", "log", "compile", "pool"]) {
  R.push(tyRow(`t1-f-cap-${cap}`, `const ${cap} = () => 1;\nconst g = (${cap}: number) => ${cap} + 1;`, num));
  R.push(tyRow(`t1-f-cap-${cap}-rec`, `const ${cap} = () => ({ n: 2 });\nconst g = (${cap}: { readonly n: number }) => ${cap}.n;`, num));
}
R.push(tyRow("t1-f-esc-now", `const n\\u006fw = () => 1;\nconst g = (now: number) => now + 1;`, num));
R.push(tyRow("t1-f-sc-replace", `const structuredClone = () => (x: unknown) => "s";\nconst g = () => structuredClone([1, 2]).length;`, (v) => v === 2));
R.push(tyRow("t1-f-sc-type", `const structuredClone = () => (x: unknown) => "abc";\nconst g = () => structuredClone([1, 2]);`, (v) => Array.isArray(v)));
R.push(tyRow("t1-f-usp-replace", `const URLSearchParams = () => 7;\nconst g = () => new URLSearchParams("a=1").get("a") ?? "none";`, str));
for (const gl of ["Map", "Set", "URL", "JSON", "Math", "Object", "parseInt"]) R.push(tyRow(`t1-f-global-${gl}`, `const ${gl} = () => 1;\nconst g = () => 1;`, num));
R.push(tyRow("t1-f-local-h-jsx", `const g = () => { const h = (t: string) => 7; return <div>x</div>; };`, (v) => typeof v === "object"));
R.push(tyRow("t1-f-param-h-jsx", `const g = () => { const f = (h: number) => <div>{h}</div>; return f(1); };`, (v) => typeof v === "object" && v !== null));
R.push(tyRow("t1-f-comp-h", `const g = () => { const C = (p: {}) => <div>m</div>; const h = 3; return h + (typeof <C /> === "object" ? 1 : 0); };`, (v) => v === 4));
R.push(tyRow("t1-f-destructured-h-jsx", `const g = () => { const { h } = { h: 1 }; return <div>{h}</div>; };`, (v) => typeof v === "object"));
R.push(tyRow("t1-f-catch-h-jsx", `const g = () => { try { return <div>a</div>; } catch (h) { return <div>b</div>; } };`, (v) => typeof v === "object" && v !== null));
R.push(tyRow("t1-f-dollar-ref", `const x = () => state(1);\nconst x$ref = () => 5;\nconst g = (x$ref: number) => x$ref + 1;`, (v) => v === 6));
R.push(tyRow("t1-f-dollar-name", `const $x = () => 1;\nconst g = ($x: number) => $x + 1;`, num));
R.push(tyRow("t1-ok-f-cap-param", `const g = (now: Clock) => typeof now();`, (v) => v === "number"));
R.push(tyRow("t1-ok-f-name-near-cap", `const nowish = () => 1;\nconst g = (nowish: number) => nowish + 1;`, num));
R.push(tyRow("t1-ok-f-h-param-no-jsx", `const g = () => { const h = (n: number) => n + 1; return h(1); };`, num));
R.push(tyRow("t1-ok-f-jsx", `const g = () => { const k = 1; return <div>{k}</div>; };`, (v) => typeof v === "object"));
R.push(tyRow("t1-ok-f-global-use", `const g = () => structuredClone([1, 2]).length + new Map([[1, 2]]).size;`, (v) => v === 3));
R.push(ctl(tyRow("t1-f-rt-ctl-cap-now", `const now = () => 1;\nconst g = (now: number) => now + 1;`, num)));
R.push(ctl(tyRow("t1-f-rt-ctl-sc", `const structuredClone = () => (x: unknown) => "abc";\nconst g = () => structuredClone([1, 2]);`, (v) => Array.isArray(v))));
R.push(ctl(tyRow("t1-f-ctl-local-h-jsx", `const g = () => { const h = (t: string) => 7; return <div>x</div>; };`, (v) => typeof v === "object")));
export const attacks = R;
