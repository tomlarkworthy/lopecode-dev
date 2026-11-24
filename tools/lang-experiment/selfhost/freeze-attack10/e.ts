// E: a narrowing kept after a write it does not see. g's checked type says a number; the write makes the read
// undefined or a throw. Run: bun lite/infer/attack/drive-run.ts selfhost/freeze-attack10/e.ts (and rt10.ts)
import { ty } from "./f.ts";
const num = (v: unknown) => typeof v === "number";
const R: any[] = [];
const NUL = "let r: { readonly n: number } | null = { n: 1 };";
const G = (b: string) => `const g = () => { ${b} };`;
const AG = (b: string) => `const g = async () => { ${b} };`;
// write forms in a nested function other than =
R.push(ty("e-nested-nullish-assign", G(`let r: number | undefined = 1; const bad = () => { r = undefined; r ??= undefined; }; if (r !== undefined) { bad(); return r + 1; } return 0;`), num));
R.push(ty("e-nested-or-assign", G(`let r: number | null = 1; const bad = () => { r ||= null; }; if (r !== null) { bad(); return r + 1; } return 0;`), num));
R.push(ty("e-nested-and-assign", G(`let r: number | null = 1; const bad = () => { r &&= null; }; if (r !== null) { bad(); return r + 1; } return 0;`), num));
R.push(ty("e-nested-destr-arr", G(`${NUL} const bad = () => { [r] = [null]; }; if (r !== null) { bad(); return r.n; } return 0;`), num));
R.push(ty("e-nested-destr-obj", G(`${NUL} const bad = () => { ({ r } = { r: null }); }; if (r !== null) { bad(); return r.n; } return 0;`), num));
R.push(ty("e-nested-for-of", G(`${NUL} const bad = () => { for (r of [null]) {} }; if (r !== null) { bad(); return r.n; } return 0;`), num));
R.push(ty("e-default-param", G(`${NUL} const bad = (x = (r = null)) => x; if (r !== null) { bad(); return r.n; } return 0;`), num));
R.push(ty("e-iife", G(`${NUL} if (r !== null) { (() => { r = null; })(); return r.n; } return 0;`), num));
R.push(ty("e-foreach-cb", G(`${NUL} if (r !== null) { [1].forEach(() => { r = null; }); return r.n; } return 0;`), num));
R.push(ty("e-map-cb", G(`${NUL} if (r !== null) { [1].map(() => { r = null; return 1; }); return r.n; } return 0;`), num));
R.push(ty("e-sort-cb", G(`${NUL} if (r !== null) { [2, 1].toSorted((a, b) => { r = null; return a - b; }); return r.n; } return 0;`), num));
R.push(ty("e-generator-body", G(`${NUL} const gen = function* () { r = null; yield 1; }; if (r !== null) { gen().next(); return r.n; } return 0;`), num));
R.push(ty("e-object-method-shorthand", G(`${NUL} const o = { m: () => { r = null; } }; if (r !== null) { o.m(); return r.n; } return 0;`), num));
R.push(ty("e-captured-narrow-in-nested", G(`${NUL} const set = () => { r = null; }; const get = () => { if (r !== null) { set(); return r.n; } return 0; }; return get();`), num));
// a nested function narrows a captured let; the declaring function writes it directly, across an await
R.push(ty("e-await-outer-write", AG(`${NUL} const get = async () => { if (r !== null) { await null; return r.n; } return 0; }; const p = get(); r = null; return await p;`), num));
R.push(ty("e-await-outer-write-typeof", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p;`), num));
R.push(ty("e-await-outer-write-tag", `type U = { readonly ok: true; readonly v: number } | { readonly ok: false };\n` + AG(`let r: U = { ok: true, v: 1 }; const get = async () => { if (r.ok) { await null; return r.v; } return 0; }; const p = get(); r = { ok: false }; return await p;`), num));
R.push(ty("e-await-outer-write-truthy", AG(`let r: { readonly n: number } | undefined = { n: 1 }; const get = async () => { if (r) { await null; return r.n; } return 0; }; const p = get(); r = undefined; return await p;`), num));
R.push(ty("e-await-param-outer", AG(`const f = async (r: { readonly n: number } | null) => { const get = async () => { if (r !== null) { await null; return r.n; } return 0; }; const p = get(); r = null; return await p; }; return await f({ n: 1 });`), num));
R.push(ty("e-gen-outer-write", G(`${NUL} const gen = function* () { if (r !== null) { yield 0; return r.n; } return 0; }; const it = gen(); it.next(); r = null; const x = it.next(); return typeof x.value === "number" ? x.value : -1;`), num));
// the same in the declaring function itself across an await, with a nested async function writing (rule's own case)
R.push(ty("e-await-nested-write", AG(`${NUL} const bad = async () => { await null; r = null; }; if (r !== null) { const p = bad(); await p; return r.n; } return 0;`), num));
// members and elements, written by a helper
R.push(ty("e-member-helper", G(`const o: Mut<{ v: { readonly n: number } | null }> = { v: { n: 1 } }; const bad = () => { o.v = null; }; if (o.v !== null) { bad(); return o.v.n; } return 0;`), num));
R.push(ty("e-member-helper-param", G(`const o: Mut<{ v: { readonly n: number } | null }> = { v: { n: 1 } }; const bad = (p: Mut<{ v: { readonly n: number } | null }>) => { p.v = null; }; if (o.v !== null) { bad(o); return o.v.n; } return 0;`), num));
R.push(ty("e-member-typeof", G(`const o: Mut<{ v: number | string }> = { v: 1 }; const bad = () => { o.v = "s"; }; if (typeof o.v === "number") { bad(); return o.v + 1; } return 0;`), num));
R.push(ty("e-member-tag", `type U = { readonly ok: true; readonly v: number } | { readonly ok: false };\n` + G(`const o: Mut<{ u: U }> = { u: { ok: true, v: 1 } }; const bad = () => { o.u = { ok: false }; }; if (o.u.ok) { bad(); return o.u.v; } return 0;`), num));
R.push(ty("e-member-await", AG(`const o: Mut<{ v: { readonly n: number } | null }> = { v: { n: 1 } }; const bad = async () => { await null; o.v = null; }; if (o.v !== null) { const p = bad(); await p; return o.v.n; } return 0;`), num));
R.push(ty("e-member-nested-narrow", G(`const o: Mut<{ v: number | null }> = { v: 1 }; const get = () => { if (o.v !== null) { o.v = null; return 0; } return 1; }; if (o.v !== null) { get(); return o.v + 1; } return 0;`), num));
R.push(ty("e-element-helper", G(`const xs: Mut<(number | null)[]> = [1]; const bad = () => { xs[0] = null; }; const x0 = xs[0]; if (x0 !== null && x0 !== undefined) { bad(); return x0 + 1; } return 0;`), num));
R.push(ty("e-element-direct", G(`const xs: Mut<(number | null)[]> = [1]; const bad = () => { xs[0] = null; }; if (xs[0] !== null && xs[0] !== undefined) { bad(); return xs[0] + 1; } return 0;`), num));
R.push(ty("e-in-narrow", G(`let r: { readonly a: number } | { readonly b: string } = { a: 1 }; const bad = () => { r = { b: "s" }; }; if ("a" in r) { bad(); return r.a; } return 0;`), num));
R.push(ty("e-isarray", G(`let r: number[] | number = [1]; const bad = () => { r = 5; }; if (Array.isArray(r)) { bad(); return r.length; } return 0;`), num));
R.push(ty("e-kept-fn-later", `const k = () => { let r: { readonly n: number } | null = { n: 1 }; const kill = () => { r = null; }; return { kill: action(() => kill()), get: () => (r !== null ? r.n : 0) }; };\nconst g = (k: { readonly get: () => number }) => k.get();`, num));
R.push(ty("e-x-await-param-prim", AG(`const f = async (r: number | string) => { const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p; }; return await f(1);`), num));
R.push(ty("e-x-await-null-prim", AG(`let r: string | null = "a"; const get = async () => { if (r !== null) { await null; return r.length; } return 0; }; const p = get(); r = null; return await p;`), num));
R.push(ty("e-x-gen-outer-prim", G(`let r: number | string = 1; const gen = function* () { if (typeof r === "number") { yield 0; return r + 1; } return 0; }; const it = gen(); it.next(); r = "s"; const x = it.next(); return x.value;`), num));
R.push(ty("e-x-await-then-cb", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r * 2; } return 0; }; const p = get(); r = "s"; return await p;`), num));
R.push(ty("e-x-await-loop", AG(`let r: number | string = 1; const get = async () => { let t = 0; if (typeof r === "number") { for (let i = 0; i < 2; i++) { await null; t = t + r; } } return t; }; const p = get(); r = "s"; return await p;`), num));
R.push(ty("e-x-two-nested", AG(`let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const flip = () => 1; const p = get(); r = "s"; flip(); return await p;`), num));
R.push({ ...ty("e-ctl-member-helper", G(`const o: Mut<{ v: { readonly n: number } | null }> = { v: { n: 1 } }; const bad = () => { o.v = null; }; if (o.v !== null) { bad(); return o.v === null ? "null" : 1; } return 0;`), num), ctl: true });
R.push({ ...ty("e-ctl-await-outer", AG(`let r: { readonly n: number } | null = { n: 1 }; const get = async () => { if (r !== null) { await null; return r === null ? "null" : r.n; } return 0; }; const p = get(); r = null; return await p;`), num), ctl: true });
export const cands = R;
