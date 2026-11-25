// open part 1 (2026-11-25): a function value with more parameters than the function type it is given (subtype.ss.ts
// fnSubWith) is [arity]. JavaScript intrinsics pass more arguments than the checker's signatures declare (map passes
// the value, the index and the array), so such a parameter got a value of another type. Rows: attack 13's extra.ts
// (open-a13-*), the forms that hand the function on before it reaches the intrinsic (open-l-*), rest and default
// parameters (open-p-*). open-ok-* rows are legal (fewer parameters than declared, or as many) and must be accepted
// and run clean; every other row that is not a control must be rejected [arity]. Controls (checker skipped, counted
// as open-controls) show the extra argument reaches the callback at run time. live.test.ts asserts this;
// run-sets.ts --sets open [--rt].
import { tyRow, strs, nums, isStr, type Cand } from "../../../selfhost/freeze-attack13/lib13.ts";
import { cands as EXTRA } from "../../../selfhost/freeze-attack13/extra.ts";
const R: Cand[] = [];
// attack 13's rows that are legal: memo calls its function with the caller's arguments only, toSorted passes two
const A13_OK = new Set(["v-extra-memo-held", "v-extra-mut-alias-sort"]);
for (const c of EXTRA) R.push({ ...c, name: c.ctl ? `open-a13-ctl-${c.name}` : A13_OK.has(c.name) ? `open-ok-a13-${c.name}` : `open-a13-${c.name}` });
// F3: a string past map's two declared parameters; map's third argument (the array) is not a string
const F3 = `(x: number, i?: number, s?: string) => s ?? "none"`;
const L = (name: string, body: string, ok: (v: unknown) => boolean = strs, ctl = false) => R.push(tyRow(name, `const g = () => { ${body} };`, ok, ctl));
L("open-l-annot", `const f: (x: number) => string = ${F3}; return [5].map(f);`);
L("open-l-record", `const r: { readonly f: (x: number) => string } = { f: ${F3} }; return [5].map(r.f);`);
L("open-l-generic-id", `const id = <T,>(t: T): T => t; return [5].map(id(${F3}));`);
L("open-l-generic-id-explicit", `const id = <T,>(t: T): T => t; return [5].map(id<(x: number) => string>(${F3}));`);
L("open-l-generic-wrap", `const wrap = <A, B>(f: (a: A) => B): ((a: A) => B) => f; return [5].map(wrap(${F3}));`);
L("open-l-return-type", `const mk = (): ((x: number) => string) => ${F3}; return [5].map(mk());`);
L("open-l-array", `const fs: readonly ((x: number) => string)[] = [${F3}]; const f = fs[0]; return f === undefined ? [] : [5].map(f);`);
L("open-l-tuple", `const fs: readonly [(x: number) => string] = [${F3}]; return [5].map(fs[0]);`);
L("open-l-map-value", `const m = new Map<string, (x: number) => string>([["k", ${F3}]]); const f = m.get("k"); return f === undefined ? [] : [5].map(f);`);
L("open-l-union", `const f: ((x: number) => string) | number = ${F3}; return typeof f === "number" ? [] : [5].map(f);`);
L("open-l-callsig", `const r: { (x: number): string } = ${F3}; return [5].map(r);`);
L("open-l-callsig-rec", `const r: { readonly f: { (x: number): string } } = { f: ${F3} }; return [5].map(r.f);`);
L("open-l-memo", `const f: (x: number) => string = memo(${F3}); return [5].map(f);`);
L("open-l-reduce-annot", `const f: (acc: string, x: number, i: number) => string = (acc: string, x: number, i?: number, s?: string) => s ?? acc; return [5].reduce(f, "");`, isStr);
L("open-l-generic-fn-value", `const f = <T,>(x: T, i?: number, s?: string): string => s ?? "none"; return [5].map(f);`);
L("open-l-let-reassign", `let f = (x: number): string => "a"; f = ${F3}; return [5].map(f);`);
L("open-l-as", `return [5].map(${F3} as (x: number) => string);`);
R.push(tyRow("open-l-promise", `const g = async () => { const p: Promise<(x: number) => string> = Promise.resolve(${F3}); const f = await p; return [5].map(f); };`, strs));
R.push(tyRow("open-l-inject", `const f = () => ${F3};\nconst g = (f: (x: number) => string) => [5].map(f);`, strs));
// rest and default parameters past the declared ones
L("open-p-rest", `return [5].map((x: number, ...r: number[]) => r.reduce((a, y) => a + y, 0));`, nums);
L("open-p-rest-unknown", `return [5].map((x, ...r) => r.length);`, nums);
L("open-p-rest-annot", `const f: (x: number) => number = (x: number, ...r: number[]) => r.reduce((a, y) => a + y, 0); return [5].map(f);`, nums);
L("open-p-default", `return [5].map((x: number, i = 0, s = "none") => s);`);
L("open-p-default-annot", `const f: (x: number) => string = (x: number, i = 0, s = "none") => s; return [5].map(f);`);
// legal: fewer parameters than declared, or as many; a rest where the type has one
L("open-ok-fewer", `return [5].map((x: number) => String(x));`);
L("open-ok-index", `return [5].map((x: number, i: number) => String(x + i));`);
L("open-ok-none", `return [5].map(() => "a");`);
L("open-ok-annot-fewer", `const f: (x: number, i: number) => string = (x: number) => String(x); return [5].map(f);`);
L("open-ok-rest-both", `const f: (...xs: number[]) => number = (...ys: number[]) => ys.length; return f(1, 2);`, (v) => v === 2);
L("open-ok-rest-target", `const f: (...xs: number[]) => number = (a: number, b?: number) => a + (b ?? 0); return f(1, 2);`, (v) => v === 3);
L("open-ok-optional-declared", `const f: (x: number, y?: number) => number = (x: number, y?: number) => x + (y ?? 0); return f(1);`, (v) => v === 1);
// controls, checker skipped: map's third argument reaches a parameter the type leaves out
L("open-ctl-map", `return [5].map(${F3});`, strs, true);
L("open-ctl-annot", `const f: (x: number) => string = ${F3}; return [5].map(f);`, strs, true);
export const attacks = R;
