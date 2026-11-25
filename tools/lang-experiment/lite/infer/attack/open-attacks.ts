// open part 1 (2026-11-25): a function value with more parameters than the function type it is given (subtype.ss.ts
// fnSubWith) is [arity]. JavaScript intrinsics pass more arguments than the checker's signatures declare (map passes
// the value, the index and the array), so such a parameter got a value of another type. Rows: attack 13's extra.ts
// (open-a13-*), the forms that hand the function on before it reaches the intrinsic (open-l-*), rest and default
// parameters (open-p-*). open-ok-* rows are legal (fewer parameters than declared, or as many) and must be accepted
// and run clean; every other row that is not a control must be rejected [arity]. Controls (checker skipped, counted
// as open-controls) show the extra argument reaches the callback at run time. live.test.ts asserts this;
// run-sets.ts --sets open [--rt].
import { tyRow, strs, nums, isStr, isNum, type Cand } from "../../../selfhost/freeze-attack13/lib13.ts";
import { cands as EXTRA } from "../../../selfhost/freeze-attack13/extra.ts";
import { cands as TUP } from "../../../selfhost/freeze-attack14/tup.ts";
import { cands as OPTP } from "../../../selfhost/freeze-attack14/optp.ts";
import { cands as REST } from "../../../selfhost/freeze-attack14/rest.ts";
import { cands as LIT } from "../../../selfhost/freeze-attack14/lit.ts";
import { cands as RET } from "../../../selfhost/freeze-attack14/ret.ts";
import { cands as GEN } from "../../../selfhost/freeze-attack14/gen.ts";
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
// part 5 (RP): a rejects the call f() that the rest type allows, so this row moved from open-ok-* to [arity]
L("open-p-rest-target-required", `const f: (...xs: number[]) => number = (a: number, b?: number) => a + (b ?? 0); return f(1, 2);`, (v) => v === 3);
L("open-ok-rest-target", `const f: (...xs: number[]) => number = (a?: number, b?: number) => (a ?? 0) + (b ?? 0); return f(1, 2);`, (v) => v === 3);
L("open-ok-optional-declared", `const f: (x: number, y?: number) => number = (x: number, y?: number) => x + (y ?? 0); return f(1);`, (v) => v === 1);
// controls, checker skipped: map's third argument reaches a parameter the type leaves out
L("open-ctl-map", `return [5].map(${F3});`, strs, true);
L("open-ctl-annot", `const f: (x: number) => string = ${F3}; return [5].map(f);`, strs, true);
// part 2 (2026-11-25, S6.9): an action made in a callback that a built-in calls before it returns may use the callback's
// parameter when what the built-in passes it (the receiver, the other arguments, and for an accumulator the callback's
// own results) does not depend on state. open-ok-act-*: accepted; the drive calls the last action made and reads c.
// open-act-*: rejected [action-capture]. Sources from lite/soundscript/.scratch/open/p2.ts
const S2 = "const c = (): StateCell<number> => state(0);\nconst k = (): StateCell<readonly number[]> => state([1, 2]);\n";
const actDrive = (want: number) => async (p: any) => {
  const v = p.value("mk"), acts = Array.isArray(v) ? v.flat() : [], last = acts[acts.length - 1];
  if (typeof last !== "function") return `DIFF mk is not a list of actions: ${p.status("mk")} ${String(p.error("mk") ?? "").slice(0, 100)}`;
  let thrown = "";
  try { last(); } catch (e) { thrown = ` (call threw: ${(e as Error).message.slice(0, 100)})`; }
  await p.settle();
  const c = p.value("c");
  return c === want && !thrown ? `same: c=${c}` : `DIFF c is ${c}, want ${want}${thrown}`;
};
const A = (name: string, head: string, body: string, want: number | null) => R.push({ name, src: `${S2}const mk = ${head} => ${body};`, show: ["mk", "c"], ...(want === null ? {} : { drive: actDrive(want) }) });
const H = "(c: State<number>)", HK = "(c: State<number>, k: readonly number[])";
A("open-ok-act-forof", H, `{ const out: Action<[]>[] = []; for (const n of [1, 2]) out.push(action(() => { c.set(n); })); return out; }`, 2);
A("open-ok-act-map", H, `[1, 2].map((n) => action(() => { c.set(n); }))`, 2);
A("open-ok-act-forEach", H, `{ const out: Action<[]>[] = []; [1, 2].forEach((n) => { out.push(action(() => { c.set(n); })); }); return out; }`, 2);
A("open-ok-act-flatMap", H, `[1, 2].flatMap((n) => [action(() => { c.set(n); })])`, 2);
A("open-ok-act-filter", H, `{ const out: Action<[]>[] = []; [1, 2].filter((n) => { out.push(action(() => { c.set(n); })); return true; }); return out; }`, 2);
A("open-ok-act-reduce", H, `{ const init: readonly Action<[]>[] = []; return [1, 2].reduce((acc: readonly Action<[]>[], n) => [...acc, action(() => { c.set(n); })], init); }`, 2);
A("open-ok-act-readonly-local", H, `{ const xs: readonly number[] = [1, 2].map((x) => x * 2); return xs.map((n) => action(() => { c.set(n); })); }`, 4);
A("open-ok-act-array-from", H, `Array.from([1, 2], (n) => action(() => { c.set(n); }))`, 2);
A("open-ok-act-nested", H, `[[1], [2]].map((xs) => xs.map((n) => action(() => { c.set(n); })))`, 2);
A("open-ok-act-index", H, `["a", "b"].map((s, i) => action(() => { c.set(i); }))`, 1);
A("open-act-map-state", HK, `k.map((n) => action(() => { c.set(n); }))`, null);
A("open-act-forEach-state", HK, `{ const out: Action<[]>[] = []; k.forEach((n) => { out.push(action(() => { c.set(n); })); }); return out; }`, null);
A("open-act-flatMap-state", HK, `k.flatMap((n) => [action(() => { c.set(n); })])`, null);
A("open-act-filter-state", HK, `{ const out: Action<[]>[] = []; k.filter((n) => { out.push(action(() => { c.set(n); })); return true; }); return out; }`, null);
A("open-act-reduce-state", HK, `{ const init: readonly Action<[]>[] = []; return k.reduce((acc: readonly Action<[]>[], n) => [...acc, action(() => { c.set(n); })], init); }`, null);
A("open-act-forof-state", HK, `{ const out: Action<[]>[] = []; for (const n of k) out.push(action(() => { c.set(n); })); return out; }`, null);
A("open-act-clock", "(c: State<number>, now: Clock)", `{ const ys: readonly number[] = [now()]; return ys.map((n) => action(() => { c.set(n); })); }`, null);
A("open-act-mut-local", H, `{ const xs = [1, 2].map((x) => x * 2); return xs.map((n) => action(() => { c.set(n); })); }`, null);
A("open-act-helper", H, `{ const one = (n: number) => action(() => { c.set(n); }); return [1, 2].map((n) => one(n)); }`, null);
A("open-act-stored-callback", H, `{ const f = (n: number) => action(() => { c.set(n); }); return [1, 2].map(f); }`, null);
A("open-act-then", H, `Promise.resolve(1).then((n) => action(() => { c.set(n); }))`, null);
A("open-act-update", H, `action(() => { c.update((v) => { const a = action(() => { c.set(v); }); return v; }); })`, null);
A("open-act-array-from-state", HK, `Array.from(k, (n) => action(() => { c.set(n); }))`, null);
A("open-act-nested-state", HK, `[k].map((xs) => xs.map((n) => action(() => { c.set(n); })))`, null);
A("open-act-reduce-init-state", HK, `{ const out: Action<[]>[] = []; [1, 2].reduce((acc: number, n) => { out.push(action(() => { c.set(acc); })); return acc + n; }, k[0] ?? 0); return out; }`, null);
A("open-act-reduce-acc-result", HK, `{ const init: readonly number[] = []; return [1, 2].reduce((acc: readonly number[], n) => { const a = action(() => { c.set(acc[0] ?? 0); }); return k; }, init); }`, null);
R.push({ name: "open-act-module-fn", src: `${S2}const each = () => (xs: readonly number[], g: (n: number) => Action<[]>) => xs.map(g);\nconst mk = (c: State<number>, each: (xs: readonly number[], g: (n: number) => Action<[]>) => Action<[]>[]) => each([1, 2], (n) => action(() => { c.set(n); }));`, show: ["mk"] });
// part 3 (2026-11-25, S2.6): a const function read before its declaration, inside the body of a function bound to a
// const before it that nothing uses before the declaration (ixFwdSafe). open-ok-fwd-*: accepted, and cell g's value is
// checked at run time (a wrong accept is a ReferenceError there). open-fwd-*: rejected [free-name]. open-fwdr-*: each
// helper-use rule with the helper before its caller, after it as a function declaration and after it as a const read
// forward, all rejected by the rule FWD_RULES names. open-ctl-fwd-*: controls, checker skipped, that throw the
// "before initialization" ReferenceError the rule prevents. Sources from lite/soundscript/.scratch/open/p3.ts and p3d.ts
const FW = (name: string, body: string, want: unknown, ctl = false) => R.push(tyRow(name, `const g = () => { ${body} };`, (v) => JSON.stringify(v) === JSON.stringify(want), ctl));
FW("open-ok-fwd-const", `const p = () => q(); const q = () => 1; return p();`, 1);
FW("open-ok-fwd-function-expr", `const p = function () { return q(); }; const q = function () { return 5; }; return p();`, 5);
FW("open-ok-fwd-chain", `const p = () => q(); const q = () => r() + 1; const r = () => 3; return p();`, 4);
FW("open-ok-fwd-mutual", `const ev = (n: number): boolean => (n === 0 ? true : od(n - 1)); const od = (n: number): boolean => (n === 0 ? false : ev(n - 1)); return [ev(4), od(3), ev(3)];`, [true, true, false]);
FW("open-ok-fwd-mutual-one-type", `const ev = (n: number) => (n === 0 ? true : od(n - 1)); const od = (n: number): boolean => (n === 0 ? false : ev(n - 1)); return ev(4);`, true);
FW("open-ok-fwd-recursive", `const p = () => q(3); const q = (n: number): number => (n <= 0 ? 0 : n + q(n - 1)); return p();`, 6);
FW("open-ok-fwd-callback", `const p = () => [1, 2].map((x) => q(x)); const q = (x: number) => x * 2; return p();`, [2, 4]);
FW("open-ok-fwd-value", `const p = () => [1, 2].map(q); const q = (x: number) => x + 1; return p();`, [2, 3]);
FW("open-ok-fwd-default-param", `const p = (n: number = q()) => n + 1; const q = () => 4; return p();`, 5);
FW("open-ok-fwd-used-after", `const p = () => q() + 1; const q = () => 1; const x = p(); const r = [p]; return [x, r.length, [0].map(() => p())[0]];`, [2, 1, 2]);
FW("open-ok-fwd-nested-block", `const p = () => q(); const q = () => 7; { const x = p(); return x; }`, 7);
FW("open-ok-fwd-inner-block", `if (1 > 0) { const p = () => q(); const q = () => 2; return p(); } return 0;`, 2);
FW("open-fwd-early", `const p = () => q(); const x = p(); const q = () => 1; return x;`, 1);
FW("open-fwd-same-statement", `const p = () => q(), x = p(), q = () => 1; return x;`, 1);
FW("open-fwd-earlier-caller", `const e = () => p(); const p = () => q(); const x = e(); const q = () => 1; return x;`, 1);
FW("open-fwd-hoisted-caller", `const p = () => q(); const x = h(); const q = () => 1; function h() { return p(); } return x;`, 1);
FW("open-fwd-callback-use", `const p = () => q(); const xs = [1].map(() => p()); const q = () => 1; return xs[0] ?? 0;`, 1);
FW("open-fwd-in-literal", `const p = () => q(); const r = [p]; const q = () => 1; return r.length;`, 1);
FW("open-fwd-in-object", `const p = () => q(); const o = { p }; const q = () => 1; return o.p();`, 1);
FW("open-fwd-passed", `const p = () => q(); const id = <T,>(t: T): T => t; const r = id(p); const q = () => 1; return r();`, 1);
FW("open-fwd-member", `const p = () => q(); const n = p.length; const q = () => 1; return n + p();`, 1);
FW("open-fwd-direct", `const x = q(); const q = () => 1; return x;`, 1);
FW("open-fwd-value-early", `const x = q; const q = () => 1; return x();`, 1);
FW("open-fwd-in-declaration", `function h() { return q(); } const q = () => 1; return h();`, 1);
FW("open-fwd-let", `let p = () => q(); const q = () => 1; return p();`, 1);
FW("open-fwd-name-typed", `const p = () => q(); const q: () => number = () => 1; return p();`, 1);
FW("open-fwd-memo", `const p = () => q(1); const q = memo((n: number): number => n); return p();`, 1);
FW("open-fwd-not-function", `const p = () => k; const k = 1; return p();`, 1);
// review (2026-11-25): a body checked at a read inside an overloaded call (Array.from, then) was kept as checked while
// the failed try's diagnostics were dropped, so its errors were lost; open-fwdo-*: rejected [free-name] for the body's
// own free name, in the const and the function declaration form (IxCtl.tries)
const OB = "(v: number) => { const d = Date.now(); return v + d; }", OF = "function q(v: number) { const d = Date.now(); return v + d; }";
FW("open-ok-fwd-overload", `const p = () => Array.from({ length: 2 }, (_, i) => q(i)); const q = (v: number) => v * 2; return p();`, [0, 2]);
FW("open-fwdo-from-const", `const p = () => Array.from({ length: 2 }, (_, i) => q(i)); const q = ${OB}; return p().length;`, 2);
FW("open-fwdo-from-function", `const p = () => Array.from({ length: 2 }, (_, i) => q(i)); ${OF} return p().length;`, 2);
FW("open-fwdo-then-const", `const p = () => Promise.resolve(1).then((v) => q(v)); const q = ${OB}; p(); return 1;`, 1);
FW("open-fwdo-then-function", `const p = () => Promise.resolve(1).then((v) => q(v)); ${OF} p(); return 1;`, 1);
// review (2026-11-25): a JSX tag naming f is a use of f (ixFwdUses)
R.push(tyRow("open-ok-fwd-jsx", `const g = () => { const P = (p: {}) => <Q />; const Q = (p: {}) => <div>x</div>; return <P />; };`, () => true));
FW("open-fwd-jsx-early", `const P = (p: {}) => <Q />; const el = <P />; const Q = (p: {}) => <div>x</div>; return 1;`, 1);
const TDZ = (p: any) => (p.status("g") === "rejected" && String(p.error("g")).includes("before initialization") ? `DIFF g threw ReferenceError: ${String(p.error("g")).slice(0, 100)}` : `same: g ${p.status("g")}`);
R.push({ name: "open-ctl-fwd-early", src: "const g = () => { const p = () => q(); const x = p(); const q = () => 1; return x; };", show: ["g"], ctl: true, drive: TDZ });
R.push({ name: "open-ctl-fwd-jsx-early", src: "const g = () => { const P = (p: {}) => <Q />; const el = <P />; const Q = (p: {}) => <div>x</div>; return 1; };", show: ["g"], ctl: true, drive: TDZ });
R.push({ name: "open-ctl-fwd-hoisted-caller", src: "const g = () => { const p = () => q(); const x = h(); const q = () => 1; function h() { return p(); } return x; };", show: ["g"], ctl: true, drive: TDZ });
const S3 = "const s = (): StateCell<number> => state(0);\n", F3S = "const fs = (): StateCell<() => number> => state<() => number>(() => 0);\n";
// [case, rule, head, helper as a const, helper as a function declaration, its caller, tail]
const PAIRS: readonly (readonly [string, string, string, string, string, string, string])[] = [
  ["s311-let", "let-capture", "const a = () => { let n = 0; ", "const inc = () => { n++; }; ", "function inc() { n++; } ", "const run = () => inc(); ", "return run; };"],
  ["s311-narrow", "possibly-undefined", "const a = () => { let r: number | null = 1; ", "const clear = () => { r = null; }; ", "function clear() { r = null; } ", "const run = () => clear(); ", "if (r !== null) { run(); return r + 1; } return 0; };"],
  ["s410-mut", "mut-capture", "const a = () => { const out = [0]; ", "const get = () => out.length; ", "function get() { return out.length; } ", "const run = () => get(); ", "return run; };"],
  ["s410-let", "let-capture", "const a = () => { let n = 1; ", "const get = () => n; ", "function get() { return n; } ", "const run = () => get(); ", "return run; };"],
  ["s411", "mutating-method", S3 + "const put = (s: State<number>) => action(() => { const xs = [0]; ", "const pub = () => s.set(xs.length); ", "function pub() { s.set(xs.length); } ", "const run = () => pub(); ", "run(); xs.push(1); });"],
  ["s412", "fn-publish", F3S + "const put = (fs: State<() => number>) => action(() => { const xs = [0]; const c: readonly number[] = xs; ", "const pub = () => fs.set(() => c.length); ", "function pub() { fs.set(() => c.length); } ", "const run = () => pub(); ", "run(); });"],
  ["s56", "mut-yield", "const g = function* () { const xs = [1]; ", "const add = () => xs.push(2); ", "function add() { xs.push(2); } ", "const run = () => add(); ", "yield 1; run(); };"],
  ["s57", "mut-await", "const a = () => { const xs = [0]; ", "const h = async () => { await 0; xs.push(1); }; ", "async function h() { await 0; xs.push(1); } ", "const run = () => h(); ", "run(); return 1; };"],
  ["s65", "state-write", S3 + "const w = (s: State<number>) => { ", "const wr = () => s.set(1); ", "function wr() { s.set(1); } ", "const run = () => wr(); ", "run(); return 1; };"],
  ["s619", "state-write", S3 + "const a = (s: State<number>) => action(() => { ", "const later = () => s.set(2); ", "function later() { s.set(2); } ", "const run = () => later(); ", "return run; });"],
  ["s69", "action-capture", S3 + "const t = (s: State<number>, now: Clock) => { ", "const g = () => now(); ", "function g() { return now(); } ", "const run = () => g(); ", "return action(() => s.set(run())); };"],
  ["s319", "iterator-capture", "const a = () => { const it = [1, 2, 3].values(); ", "const sum = () => { let t = 0; for (const x of it) t += x; return t; }; ", "function sum() { let t = 0; for (const x of it) t += x; return t; } ", "const run = () => sum(); ", "return run; };"],
];
export const FWD_RULES = new Map<string, string>();
for (const [n, rule, h, hc, hf, run, t] of PAIRS) for (const [form, src] of [["before", h + hc + run + t], ["fn-after", h + run + hf + t], ["const-after", h + run + hc + t]] as const) {
  FWD_RULES.set(`open-fwdr-${n}-${form}`, rule);
  R.push({ name: `open-fwdr-${n}-${form}`, src, show: [] });
}
// part 5 (2026-11-25): attack 14's breaks with a compile rule (selfhost/freeze-attack14/RESULTS.md). open-a14-* are
// its rows, each rejected by the rule A14_RULES names for its family: TP a mutating method on a tuple, OP/RP a required
// parameter its type lets a caller leave out, LI ++/--, SG split by a RegExp, AR an async function's ending return, LE
// a loose ==, FM flatMap of a type parameter. Left out: HO, SW and PA (not fixed), the controls, and s-split-group-upper
// and s-split-forof, whose split result is now (string | undefined)[] and whose detectors read the old type.
// open-ok-p5-* are legal neighbours, accepted and run (lite/soundscript/.scratch/open5/*.ts)
export const A14_RULES = new Map<string, string[]>();
const A14: [Cand[], RegExp, string[]][] = [
  [TUP, /^t-/, ["mutating-method"]], [OPTP, /^o-/, ["arity", "inject-type"]], [REST, /^r-/, ["arity", "inject-type"]],
  [LIT, /^(l-|s-split-(group|join|regexp-ctor|limit|cell-reader)$)/, ["type"]], [RET, /^a-/, ["type"]], [GEN, /^(e-|f-flatmap)/, ["type", "no-member"]],
];
// two of its rows hold no break (a literal never written, a branch == does not narrow): legal, accepted and run
const A14_OK = new Set(["l-bool-lit", "e-switch-after"]);
for (const [cs, re, rules] of A14) for (const c of cs) if (!c.ctl && re.test(c.name)) {
  if (A14_OK.has(c.name)) { R.push({ ...c, name: `open-ok-a14-${c.name}` }); continue; }
  A14_RULES.set(`open-a14-${c.name}`, rules);
  R.push({ ...c, name: `open-a14-${c.name}` });
}
// e-neq-str-method: v is not narrowed by != 1, so v.toFixed on "1" | 1 is an unsupported member
A14_RULES.set("open-a14-e-neq-str-method", ["unsupported"]);
// two holes a review found in the part 5 rules: split on a record's own split method, an optional parameter before a required one
const P5 = (name: string, body: string, ok: (v: unknown) => boolean, rules: string[]) => { A14_RULES.set(`open-a14-p5-${name}`, rules); R.push(tyRow(`open-a14-p5-${name}`, `const g = () => { ${body} };`, ok)); };
P5("split-record", `const r = { split: (re: RegExp): number[] => [1] }; const s: readonly string[] = r.split(/a/); return s;`, strs, ["type"]);
P5("opt-before-req", `const f: (x: number, y?: string) => string = (a = 1, b: string) => b; return f(1);`, isStr, ["arity"]);
const P6 = (name: string, body: string, ok: (v: unknown) => boolean, rules: string[]) => { A14_RULES.set(`open-a14-p6-${name}`, rules); R.push(tyRow(`open-a14-p6-${name}`, `const g = () => { ${body} };`, ok)); };
const K6 = (name: string, body: string, ok: (v: unknown) => boolean) => R.push(tyRow(`open-ok-p6-${name}`, `const g = () => { ${body} };`, ok));
const K5 = (name: string, body: string, ok: (v: unknown) => boolean) => R.push(tyRow(`open-ok-p5-${name}`, `const g = () => { ${body} };`, ok));
K5("opt-param", `const f: (x?: number) => number = (x?: number) => x ?? 0; return f();`, isNum);
K5("default-param", `const f: (x?: number) => number = (x = 1) => x; return f();`, isNum);
K5("rest-rest", `const f: (...xs: number[]) => number = (...ys: number[]) => ys.length; return f();`, isNum);
K5("rest-lead", `const f: (a: number, ...xs: number[]) => number = (a: number) => a; return f(1);`, isNum);
K5("fewer", `const f: (x: number, y: number) => number = (x: number) => x; return f(1, 2);`, isNum);
K5("inc", `let n = 0; n++; ++n; n--; n += 2; return n;`, isNum);
K5("async-return", `const f = async (): Promise<number> => { if (Math.abs(1) > 2) return 2; return 1; }; return 1;`, isNum);
K5("async-void", `const f = async (): Promise<void> => { }; return 1;`, isNum);
K5("loose-null", `const v: number | null = 1; if (v == null) return 0; return v + 1;`, isNum);
K5("strict-lit", `const v: number | "1" = "1"; return v === "1" ? v : "x";`, isStr);
K5("split-str", `return "a,b".split(",");`, strs);
K5("split-nogroup", `return "a b".split(/\s+/);`, strs);
K5("split-noncap", `return "a b".split(/(?:\s)+/);`, strs);
K5("split-group-fallback", `return "ab".split(/(x)?/).map((x) => x ?? "");`, strs);
K5("tuple-same-reverse", `const t: [number, number] = [1, 2]; t.reverse(); return t[0];`, isNum);
K5("tuple-same-sort", `const t: [number, number] = [2, 1]; t.sort((a, b) => a - b); return t[0];`, isNum);
K5("tuple-index", `const t: [number, string] = [9, "1"]; t[0] = 3; return t[0];`, isNum);
K5("tuple-toReversed", `const t: [number, string] = [9, "1"]; return t.toReversed().length;`, isNum);
K5("array-push", `const xs = [1]; xs.push(2); xs.reverse(); return xs.length;`, isNum);
K5("flatmap-wrap", `const fm = <T,>(xs: readonly T[]): readonly T[] => xs.flatMap((x) => [x]); return fm([[1], [2]]).length;`, isNum);
K5("flatmap-arr", `return [[1], [2]].flatMap((x) => x);`, nums);
K5("flatmap-el", `return [1, 2].flatMap((x) => (x > 1 ? x : []));`, nums);
K5("memo-map", `const ms = [1, 2].map((n) => memo((k: number): number => k + n)); const a = ms[0], b = ms[1]; return a === undefined || b === undefined ? [] : [a(10), b(10)];`, (v) => Array.isArray(v) && v[0] === 11 && v[1] === 12);
// part 6 (2026-11-25, SW): a spread of a value whose type is not exact, after a member its type does not declare, is
// [forgets] (ix-lit.ss.ts ixObjSpread). Attack 14's ret.ts w-spread-* rows; open-ok-p6-* legal spreads, run
for (const c of RET) if (!c.ctl && c.name.startsWith("w-")) {
  A14_RULES.set(`open-a14-${c.name}`, c.name === "w-spread-union" || c.name === "w-spread-generic" ? ["unsupported"] : ["forgets"]);
  R.push({ ...c, name: `open-a14-${c.name}` });
}
const HID = `const full = { a: 1, b: "s" }; const r: { readonly a: number } = full;`;
const isNumOrStr = (v: unknown) => typeof v === "number" || typeof v === "string";
P6("sw-prop-before", `${HID} return { b: 5, ...r }.b;`, isNum, ["forgets"]);
P6("sw-spread-spread", `${HID} return { ...{ b: 5 }, ...r }.b;`, isNum, ["forgets"]);
P6("sw-rest", `${HID} const { a, ...rest } = r; return { b: 5, ...rest }.b + a;`, isNum, ["forgets"]);
P6("sw-defaults-options", `const full = { b: 2, a: "s" }; const options: { readonly b?: number } = full; const defaults = { a: 1, b: 2 }; return { ...defaults, ...options }.a;`, isNum, ["forgets"]);
K6("spread-after", `${HID} return { ...r, b: 5 }.b;`, isNum);
K6("exact-local", `const r = { a: 1 }; return { b: 5, ...r }.b;`, isNum);
K6("declared", `const r: { readonly a: number; readonly b: number } = { a: 1, b: 2 }; return { b: 5, ...r }.b;`, isNum);
K6("literal", `return { b: 5, ...{ a: 1 } }.b;`, isNum);
K6("defaults-declared", `const options: { readonly a?: number; readonly b?: number } = { b: 3 }; const defaults = { a: 1, b: 2 }; const o = { ...defaults, ...options }; return o.a + o.b;`, (v) => v === 4);
K6("optional-keeps-earlier", `const r: { readonly a?: number } = {}; const o = { a: "s", ...r }; return o.a;`, isNumOrStr);
K6("array-of-records", `return [{ b: 5 }, ...[{ a: 1 }]].length;`, isNum);
K6("call-record", `${HID} const f = (x: { readonly a: number }) => x.a; return f(r);`, isNum);
// part 6 (2026-11-25, HO, S3.21): an index or length write on a plain array that would leave a hole or add a property
// throws a RangeError at run time (freeze.ts holeWrites, tc-reg.ss.ts tcHoleEdit). open-ho-* are accepted, and g is in
// error with that RangeError (hoDrive; any other result is DIFF). Attack 14's tup.ts h-* rows and new ones. Under
// SS_MEASURE_HOLES=0 each one is silent (live.test.ts). open-ok-p6-ho-* are legal writes, accepted and run
const hoDrive = (p: any) => {
  const m = p.status("g") === "rejected" ? String(p.error?.("g")?.message ?? p.error?.("g") ?? "") : "";
  return /^(index|length) \S+ on an array of length \d+: /.test(m) ? `same: g threw ${m.slice(0, 100)}` : `DIFF g is ${p.status("g")}, not in error with the hole RangeError: ${(m || JSON.stringify(p.value?.("g")) || "").slice(0, 100)}`;
};
for (const c of TUP) if (!c.ctl && c.name.startsWith("h-")) R.push({ ...c, name: `open-ho-a14-${c.name}`, drive: hoDrive });
const HO = (name: string, src: string) => R.push({ name: `open-ho-${name}`, src, show: ["g"], drive: hoDrive });
const HB = (name: string, body: string) => HO(name, `const g = () => { ${body} };`);
HB("past", "const xs = [0]; xs[3] = 5; return xs.length;");
HB("neg", "const xs = [0]; xs[-1] = 5; return xs.length;");
HB("frac", "const xs = [0]; xs[0.5] = 5; return xs.length;");
HB("nan", "const xs = [0]; xs[0 / 0] = 5; return xs.length;");
HB("compound", "const xs = [0]; xs[3] += 5; return xs.length;");
HB("inc", "const xs = [0]; xs[2]++; return xs.length;");
HB("dec-prefix", "const xs = [0]; --xs[2]; return xs.length;");
HB("len", "const xs = [0]; xs.length = 4; return xs.length;");
HB("len-compound", "const xs = [0]; xs.length += 3; return xs.length;");
HB("len-inc", "const xs = [0]; xs.length++; return xs.length;");
HB("len-lit", "const xs = [0]; xs['length'] = 3; return xs.length;");
HB("off-by-one", "const xs: number[] = []; for (let i = 1; i < 5; i++) xs[i] = i; return xs.length;");
HB("shrink-rhs", "const xs = [0, 1, 2]; const f = (a: Mut<number[]>) => { a.length = 0; return 7; }; xs[2] = f(xs); return xs.length;");
HB("shrink-rhs-op", "const xs = [0, 1, 2]; const f = (a: Mut<number[]>) => { a.length = 0; return 7; }; xs[2] += f(xs); return xs.length;");
HB("mut-param", "const f = (a: Mut<number[]>) => { a[3] = 1; }; const xs = [0]; f(xs); return xs.length;");
HB("generic", "const f = <T,>(a: Mut<T[]>, v: T) => { a[3] = v; }; const xs = [0]; f(xs, 1); return xs.length;");
HB("paren-recv", "const xs = [0]; (xs)[3] = 2; return xs.length;");
// part 7: a parenthesized target compiles to the checked write
HB("paren-target", "const xs = [0]; (xs[3]) = 2; return xs.length;");
HB("paren-target-op", "const xs = [0]; ((xs[3])) += 2; return xs.length;");
HB("paren-target-len", "const xs = [0]; (xs.length)++; return xs.length;");
HB("value", "const xs = [0]; const v = (xs[3] = 7); return v;");
HB("nested", "const xs = [0]; const ys = [0]; xs[1] = ys[3] = 3; return xs.length;");
HO("async", "const g = async () => { const xs = [1]; xs[await Promise.resolve(3)] += 2; return xs.length; };");
const K6H = (name: string, body: string, want: unknown) => K6(`ho-${name}`, body, (v) => JSON.stringify(v) === JSON.stringify(want));
K6H("append", "const xs = [0]; xs[1] = 5; return xs;", [0, 5]);
K6H("replace", "const xs = [0, 1]; xs[0] = 5; return xs;", [5, 1]);
K6H("loop", "const xs: number[] = []; for (let i = 0; i < 5; i++) xs[i] = i * i; return xs;", [0, 1, 4, 9, 16]);
K6H("compound", "const xs = [1, 2]; xs[1] += 5; xs[0] **= 3; xs[1] -= 1; return xs;", [1, 6]);
K6H("compound-str", "const xs = ['a']; xs[0] += 'b'; return xs;", ["ab"]);
K6H("inc", "const xs = [1]; const a = xs[0]++; const b = ++xs[0]; const c = xs[0]--; return [a, b, c, xs[0] ?? -1];", [1, 3, 3, 2]);
K6H("len-shrink", "const xs = [0, 1, 2]; xs.length = 1; xs.length += 0; return xs;", [0]);
K6H("len-dec", "const xs = [0, 1]; const a = xs.length--; return [a, xs.length];", [2, 1]);
K6H("len-same", "const xs = [0, 1]; xs['length'] = 2; xs.length = xs.length; return xs;", [0, 1]);
K6H("old-before-rhs", "const xs = [1]; const f = (a: Mut<number[]>) => { a[0] = 10; return 1; }; xs[0] += f(xs); return xs;", [2]);
K6H("typed-past", "const xs = new Float64Array(2); xs[5] = 1; xs[-1] = 1; return [...xs];", [0, 0]);
K6H("typed", "const xs = new Float64Array(2); xs[1] = 3; xs[1] += 1; xs[0]++; return [...xs];", [1, 4]);
K6H("value", "const xs = [0]; const v = (xs[1] = 7); return [v, xs.length];", [7, 2]);
K6H("nested", "const xs = [0]; const ys = [0]; xs[1] = ys[1] = 3; return [xs, ys];", [[0, 3], [0, 3]]);
K6H("paren-target", "const xs = [0]; (xs[1]) = 2; ((xs[0])) += 3; ++(xs[0]); (xs.length) = 2; return xs;", [4, 2]);
K6H("record", "const r: Mut<Record<string, number>> = {}; r['a'] = 1; r['b'] = 2; return Object.keys(r).length;", 2);
export const attacks = R;
