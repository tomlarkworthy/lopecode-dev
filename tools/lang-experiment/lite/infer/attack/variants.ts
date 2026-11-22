// The attack variants written for each hole (lite/infer/attack/live.test.ts checks every one is rejected). rule: a
// rule the verdict must contain. The programs that need the owner are in owner.ts.
export type Program = { name: string; hole: string; src: string; rule?: string; foreign?: string };

const X = "const x = () => [1, 2];\n";
const h1 = (name: string, rule: string, body: string, pre = X): Program => ({ name, hole: "1-prelude-value", rule, src: pre + body });
export const VARIANTS: Program[] = [
  // 1. mut, freeze and the other prelude functions as values, shadowed, and a Mut from anything but mut(...)
  h1("alias of mut called", "prelude-value", "const y = (x: number[]) => { const mk = mut; const a = mk(x); a.push(3); return a.length; };"),
  h1("mut through an identity function", "prelude-value", "const y = (x: number[]) => { const id = <T,>(v: T) => v; const a = id(mut)(x); a.push(3); return 1; };"),
  h1("mut given to a function-typed parameter", "prelude-value", "const y = (x: number[]) => { const g = (mk: <T>(v: T) => Mut<T>) => { const a = mk(x); a.push(3); return 1; }; return g(mut); };"),
  h1("mut as a default parameter value", "prelude-value", "const y = (x: number[]) => { const g = (mk = mut) => mk(x); return g(); };"),
  h1("mut in a conditional callee", "prelude-value", "const y = (x: number[], c: boolean) => { const a = (c ? mut : mut)(x); a.push(3); return 1; };", "const x = () => [1, 2];\nconst c = () => true;\n"),
  h1("mut parenthesized as callee (the typed tree drops the parentheses: a prelude call)", "mut-not-fresh", "const y = (x: number[]) => { const a = (mut)(x); a.push(3); return 1; };"),
  h1("mut.call", "prelude-value", "const y = (x: number[]) => { const a = mut.call(null, x); return 1; };"),
  h1("mut in a shorthand property", "prelude-value", "const y = (x: number[]) => { const o = { mut }; const a = o.mut(x); a.push(3); return 1; };"),
  h1("mut passed to map", "prelude-value", "const y = (x: number[]) => [x].map(mut).length;"),
  h1("mut returned from an IIFE", "prelude-value", "const y = (x: number[]) => { const mk = (() => mut)(); const a = mk(x); a.push(3); return 1; };"),
  h1("mut yielded by a generator cell", "prelude-value", "const g = function* () { yield mut; };"),
  h1("mut as a cell's value", "prelude-value", "const mk = () => mut;"),
  h1("freeze aliased, Mut written after", "prelude-value", "const a = () => { const fz: <T>(m: Mut<T>) => T = freeze; const m = mut([1]); const r = fz(m); m.push(2); return r.length; };"),
  h1("freeze passed to a higher-order helper", "prelude-value", "const a = () => { const ap = (f: (m: Mut<number[]>) => number[], m: Mut<number[]>) => f(m); const m = mut([1]); const r = ap(freeze, m); m.push(2); return r.length; };"),
  h1("freeze in a conditional callee", "prelude-value", "const a = (c: boolean) => { const m = mut([1]); const r = (c ? freeze : freeze)(m); m.push(2); return r.length; };", "const c = () => true;\n"),
  h1("freeze through a generic identity in a generator", "prelude-value", "const g = function* () { const id = <T,>(v: T) => v; const m = mut([1]); yield id(freeze)(m); m.push(2); };"),
  h1("borrow as a value", "prelude-value", "const g = function* () { const b = borrow; const m = mut([1]); yield b(m); };"),
  h1("snapshot as a value", "prelude-value", "const a = () => { const s = snapshot; return 1; };"),
  h1("state as a value", "prelude-value", "const s = () => { const st = state; return st(1); };"),
  h1("action as a value", "prelude-value", "const s = () => state(0);\nconst a = (s: State<number>) => { const ac = action; return ac(() => s.set(1)); };", ""),
  h1("equals as a value", "prelude-value", "const a = () => [[1], [1]].map((p) => p).filter(equals).length;", ""),
  h1("a parameter named mut", "prelude-shadow", "const y = (x: number[]) => { const g = (mut: <T>(v: T) => Mut<T>) => { const a = mut(x); a.push(3); return 1; }; return 1; };"),
  h1("a local named freeze", "prelude-shadow", "const a = () => { const freeze = (m: Mut<number[]>): number => m.length; const m = mut([1]); return freeze(m); };", ""),
  h1("a function declaration named borrow", "prelude-shadow", "const a = () => { function borrow(n: number): number { return n; } return borrow(1); };", ""),
  h1("a cell parameter named snapshot", "prelude-shadow", "const snapshot = () => 1;\nconst a = (snapshot: number) => snapshot;", ""),
  h1("a call typed Mut, from a function-typed parameter", "mut-source", "const a = () => { const g = (mk: () => Mut<number[]>) => { mk().push(1); return 1; }; return 1; };", ""),
  h1("a call typed Mut bound to a name", "mut-source", "const a = () => { const g = (mk: () => Mut<number[]>) => { const xs = mk(); xs.push(1); return xs.length; }; return 1; };", ""),
  h1("an await typed Mut", "mut-source", "const a = () => { const g = async (p: Promise<Mut<number[]>>) => { const xs = await p; xs.push(1); return 1; }; return 1; };", ""),
  h1("a Mut member bound to a second name", "mut-escape", "const a = () => { const g = (p: { readonly y: Mut<number[]> }) => { const ys = p.y; ys.push(1); return 1; }; return 1; };", ""),
  h1("a Mut member returned", "mut-escape", "const a = () => { const g = (p: { readonly y: Mut<number[]> }) => p.y; return 1; };", ""),
  h1("a Mut destructured from a record", "mut-source", "const a = () => { const g = (p: { readonly y: Mut<number[]> }) => { const { y } = p; y.push(1); return 1; }; return 1; };", ""),
  h1("a Mut from for...of over an array of Mut", "mut-source", "const a = () => { const g = (ps: readonly Mut<number[]>[]) => { for (const q of ps) q.push(1); return 1; }; return 1; };", ""),
  h1("typeof mut as a parameter's type", "prelude-value", "const y = (x: number[]) => { const g = (f: typeof mut) => f(x); return g(mut); };"),
  // 2. Mut in a cell's value or an input, at any depth, through aliases, generics and unions
  ...([
    ["a record field", "{ readonly y: Mut<number[]> }"], ["two levels", "{ readonly h: { readonly y: Mut<number[]> } }"],
    ["an alias", "H", "type H = { readonly y: Mut<number[]> };\n"], ["a generic alias", "Box<Mut<number[]>>", "type Box<T> = { readonly v: T };\n"],
    ["a union with null", "Mut<number[]> | null"], ["an array", "readonly Mut<number[]>[]"], ["a tuple", "readonly [Mut<number[]>]"],
    ["a Map value", "Map<string, Mut<number[]>>"], ["an interface", "I", "interface I { readonly y: Mut<number[]> }\n"],
    ["a recursive alias", "L", "type L = { readonly n: L | null; readonly y: Mut<number[]> };\n"], ["Mut itself", "Mut<number[]>"],
  ] as [string, string, string?][]).flatMap(([what, ty, pre = ""]): Program[] => [
    { name: `an input annotated with ${what}`, hole: "2-mut-cell", rule: "mut-cell", src: `${pre}const a = () => 1;\nconst b = (a: ${ty}) => 1;` },
    { name: `a foreign value typed with ${what}`, hole: "2-mut-cell", rule: "mut-cell", foreign: `${pre}declare const lib: ${ty};`, src: "const b = (lib) => 1;" },
  ]),
  { name: "a state handle of a Mut", hole: "2-mut-cell", rule: "mut-cell", src: "const s = () => state(0);\nconst b = (s: State<Mut<number[]>>) => 1;" },
  { name: "a foreign record with a Mut field returned as the cell's value", hole: "2-mut-cell", rule: "mut-cell", foreign: "declare const lib: { readonly y: Mut<number[]> };", src: "const b = (lib): { readonly y: Mut<number[]> } => lib;\nconst c = (b: { readonly y: Mut<number[]> }) => { b.y.push(1); return 1; };" },
  // 3. a named function expression capturing a Mut is a local helper only when also bound to a const and every name only called
  ...([
    ["passed to a keeper", "const keep = (k: () => number) => k; const f = function g(): number { m.push(2); return 0; }; const h = keep(f); return [freeze(m), h];"],
    ["in an array literal", "const fs = [function g(): number { m.push(2); return 0; }]; return [freeze(m), fs.length];"],
    ["returned", "return function g(): number { m.push(2); return 0; };"],
    ["its own name bound inside", "const f = function g(): number { const k = g; m.push(1); return k === undefined ? 0 : 1; }; return f();"],
    ["its own name returned from inside", "const f = function g(): () => number { m.push(1); return g; }; return f();"],
    ["bound to a let", "let f = function g(): number { m.push(1); return 0; }; return f();"],
    ["in an object literal", "const o = { k: function g(): number { m.push(2); return 0; } }; return [freeze(m), o];"],
    ["as a forEach callback", "[1].forEach(function g(): void { m.push(2); }); return freeze(m);"],
    ["called at once", "(function g(): void { m.push(2); })(); return freeze(m);"],
    ["a generator expression passed out", "const keep = (k: () => Generator<number>) => k; const f = function* g(): Generator<number> { m.push(1); yield 1; }; return [freeze(m), keep(f)];"],
    ["an async expression passed out", "const keep = (k: () => Promise<number>) => k; const f = async function g(): Promise<number> { m.push(1); return 1; }; return [freeze(m), keep(f)];"],
    ["assigned to a let later", "let k = (): number => 0; const f = function g(): number { m.push(2); return 0; }; k = f; return [freeze(m), k];"],
    ["in a conditional", "const h = m.length > 0 ? function g(): number { m.push(2); return 0; } : (): number => 0; return [freeze(m), h];"],
    ["called by an escaping arrow", "const keep = (k: () => number) => k; const f = function g(): number { m.push(1); return 0; }; const e = (): number => f(); return [freeze(m), keep(e)];"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `a named function expression ${what}`, hole: "3-named-fnexpr", rule: "mut-capture", src: `const a = () => { const m = mut([1]); ${body} };` })),
// 4. a g or y regexp keeps lastIndex: only where it is made
  ...([
    ["held in a local", "const re = /a/g; return [re.test(\"aa\"), re.test(\"aa\")];"],
    ["sticky, held", "const re = /a/y; return [re.test(\"aa\"), re.exec(\"aa\")];"],
    ["new RegExp with flags from a parameter", "const f = (fl: string) => new RegExp(\"a\", fl); return f(\"g\").test(\"a\");"],
    ["new RegExp with a g flag literal, held", "const re = new RegExp(\"a\", \"gi\"); return re.test(\"a\");"],
    ["returned by a helper", "const mk = () => /a/g; return mk().test(\"a\");"],
    ["in an array literal", "return [/a/g][0].test(\"a\");"],
    ["in an object literal", "const o = { re: /a/g }; return o.re.test(\"a\");"],
    ["in a conditional", "const c = \"a\".length > 0; return (c ? /a/g : /b/g).test(\"a\");"],
    ["given to a local function", "const f = (r: RegExp) => [r.test(\"aa\"), r.test(\"aa\")]; return f(/a/g);"],
    ["given to a record's method named replace", "const o = { replace: (r: RegExp): RegExp => r }; return o.replace(/a/g).test(\"a\");"],
    ["kept by Array.of", "return Array.of(/a/g)[0]?.test(\"a\");"],
    ["a default parameter", "const f = (re = /a/g) => [re.test(\"aa\"), re.test(\"aa\")]; return f();"],
    ["given to a callback", "return [\"aa\", \"aa\"].map(((re: RegExp) => (s: string) => re.test(s))(/a/g));"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `a g or y regexp ${what}`, hole: "4-regexp", rule: "regexp-state", src: `const a = () => { ${body} };` })),
  { name: "a g regexp yielded by a generator cell", hole: "4-regexp", rule: "regexp-state", src: "const g = function* () { yield /a/g; };" },
  { name: "a g regexp as a cell's value (B5)", hole: "4-regexp", rule: "regexp-state", src: "const x = () => /a/g;\nconst y = (x: RegExp) => [x.test(\"aa\"), x.test(\"aa\")];" },
// 4, routes outside a new RegExp
  ...([
    ["RegExp(/a/g) called without new", "const r = RegExp(/a/g); return [r.test(\"aa\"), r.test(\"aa\")];"],
    ["structuredClone(/a/g)", "const r = structuredClone(/a/g); return [r.test(\"aa\"), r.test(\"aa\")];"],
    ["new RegExp(/a/g)", "const r = new RegExp(/a/g); return [r.test(\"aa\"), r.test(\"aa\")];"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `a g regexp ${what}`, hole: "4-regexp", rule: "regexp-state", src: `const a = () => { ${body} };` })),
  // 5. a record type may have a member it does not list: it gives no optional member its type
  ...([
    ["widened, then given an optional member", "const r: T = q; return (r.a ?? 0) + 1;"],
    ["a let holding a literal, then reassigned", "let x = { b: 1 }; x = q; const r: T = x; return r.a;"],
    ["a generic pick of a literal and the record", "const pick = <X,>(u: X, v: X): X => v; const r: T = pick({ b: 1 }, q); return r.a;"],
    ["a conditional of a literal and the record", "const r: T = q.b > 0 ? { b: 1 } : q; return r.a;"],
    ["an array literal of both", "const xs = [{ b: 1 }, q]; const r: T | undefined = xs[1]; return r?.a;"],
    ["concat onto a literal array", "const xs = [{ b: 1 }].concat([q]); const r: T | undefined = xs[1]; return r?.a;"],
    ["pushed into a Mut of literals", "const m = mut([{ b: 1 }]); m.push(q); const xs = freeze(m); const r: T | undefined = xs[1]; return r?.a;"],
    ["through {}", "const o: {} = p; const r: T = o; return r.a;"],
    ["through object", "const o: object = p; const r: T = o; return r.a;"],
    ["through unknown", "const o: unknown = p; const r: T = o; return r.a;"],
    ["spread into a literal", "const r: T = { ...q }; return r.a;"],
    ["returned by a helper", "const f = () => q; const r: T = f(); return r.a;"],
    ["nested in a literal of a conditional", "const o = q.b > 0 ? { v: { b: 1 } } : { v: q }; const r: { v: T } = o; return r.v.a;"],
    ["in a union arm", "const u: { b: number } | null = q; const r: T | null = u; return r?.a;"],
    ["a rest of the widened record", "const w: { b: number; c: number } = { b: 1, c: 2 }; const { c, ...rest } = w; const r: T = rest; return [c, r.a];"],
    ["a parameter of a helper", "const f = (x: { b: number }): T => x; return f(q).a;"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `a record without a member ${what}`, hole: "5-width-optional", rule: "type", src: `type T = { b: number; a?: number };\nconst p = () => ({ b: 1, a: "x" });\nconst k = (p: { b: number; a: string }) => { const q: { b: number } = p; ${body} };` })),
// 6. a literal key naming a member of Object.prototype on a record with an index signature
  ...([
    ["computed __proto__", "(r: { [k: string]: number }) => r[\"__proto__\"]"],
    ["computed constructor", "(r: { [k: string]: number }) => (r[\"constructor\"] ?? 0) + 1"],
    ["dot toString", "(r: { [k: string]: number }) => r.toString"],
    ["optional dot valueOf", "(r: { [k: string]: number } | null) => r?.valueOf"],
    ["in toString", "(r: { [k: string]: number }) => \"toString\" in r"],
    ["a const key", "(r: { [k: string]: number }) => { const k = \"hasOwnProperty\"; return r[k]; }"],
    ["a literal union key", "(r: { [k: string]: number }) => { const k: \"a\" | \"constructor\" = \"constructor\"; return r[k]; }"],
    ["a Record alias", "(r: Record<string, number>) => r[\"isPrototypeOf\"]"],
    ["destructured", "(r: { [k: string]: number }) => { const { constructor } = r; return constructor; }"],
    ["destructured and renamed", "(r: { [k: string]: number }) => { const { toString: t } = r; return t; }"],
    ["a destructured parameter", "(r: { [k: string]: number }) => { const f = ({ valueOf }: { [k: string]: number }) => valueOf; return f(r); }"],
    ["a union with an index record", "(r: { [k: string]: number } | { b: number }) => \"constructor\" in r"],
    ["Object.fromEntries's result", "() => Object.fromEntries([[\"a\", 1]])[\"constructor\"]"],
    ["a nested index record", "(r: { m: { [k: string]: number } }) => r.m.__lookupGetter__"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `an index record's prototype member, ${what}`, hole: "6-index-proto", rule: "banned-member", src: `const r = (): { [k: string]: number } => ({ a: 1 });\nconst a = ${body};` })),
// 7. includes, indexOf, lastIndexOf compare by identity
  ...([
    ["includes of an array literal", "return [[1]].includes([1]);"],
    ["indexOf of a record", "const ps = [{ x: 1 }]; return ps.indexOf({ x: 1 });"],
    ["lastIndexOf of a record", "const ps = [{ x: 1 }]; return ps.lastIndexOf(ps[0] ?? { x: 0 });"],
    ["includes through a readonly array", "const ps: readonly { x: number }[] = [{ x: 1 }]; return ps.includes({ x: 1 });"],
    ["includes of a tuple", "const t: [number[], number[]] = [[1], [2]]; return t.includes([1]);"],
    ["includes with a union element", "const xs: (number | number[])[] = [1]; const y: number | number[] = [1]; return xs.includes(y);"],
    ["includes in a helper", "const has = (xs: number[][], y: number[]) => xs.includes(y); return has([[1]], [1]);"],
    ["includes of a generic element", "const has = <T,>(xs: T[], y: T): boolean => xs.includes(y); return has([1], 1);"],
    ["indexOf in a callback", "return [[1]].map((x) => [[1]].indexOf(x));"],
    ["includes on an optional chain", "const xs: number[][] | null = [[1]]; return xs?.includes([1]);"],
    ["includes of a Mut's elements", "const m = mut([[1]]); const r = m.includes([1]); m.push([2]); return [r, freeze(m)];"],
    ["includes of a function", "const f = () => 1; return [f].includes(f);"],
  ] as [string, string][]).map(([what, body]): Program => ({ name: `identity: ${what}`, hole: "7-identity", rule: "strict-eq-object", src: `const a = () => { ${body} };` })),
// 8. memo and dedupe keys that are show(), shortened past depth 6
  ...(((): Program[] => {
    const deep = (t: string, n: number): string => (n === 0 ? t : `{ a: ${deep(t, n - 1)} }`);
    const S = deep("string", 7), N = deep("number", 7);
    const forms: [string, string, string][] = [
      ["an alias's argument", "type Box<T> = { v: T };", `(x: Box<${S}>) => { const y: Box<${N}> = x; return y; }`],
      ["an alias of an alias", "type Box<T> = { v: T };", `(x: Box<Box<${S}>>) => { const y: Box<Box<${N}>> = x; return y; }`],
      ["an interface's argument", "interface Box<T> { v: T }", `(x: Box<${S}>) => { const y: Box<${N}> = x; return y; }`],
      ["two type parameters", "type P<A, B> = { a: A; b: B };", `(x: P<number, ${S}>) => { const y: P<number, ${N}> = x; return y; }`],
      ["an array of an alias", "type Box<T> = { v: T };", `(x: Box<${S}>[]) => { const y: Box<${N}>[] = x; return y; }`],
      ["a union of an alias", "type Box<T> = { v: T };", `(x: Box<${S}> | null) => { const y: Box<${N}> | null = x; return y; }`],
      ["a parameter's annotation", "type Box<T> = { v: T };", `(x: Box<${S}>) => { const f = (b: Box<${N}>) => b; return f(x); }`],
      ["a return type", "type Box<T> = { v: T };", `(x: Box<${S}>) => { const f = (): Box<${N}> => x; return f(); }`],
      ["a function type's parameter", "type Box<T> = { v: T };", `(x: (b: Box<${N}>) => number) => { const f: (b: Box<${S}>) => number = x; return f; }`],
      ["a tuple of an alias", "type Box<T> = { v: T };", `(x: [Box<${S}>]) => { const y: [Box<${N}>] = x; return y; }`],
      ["an alias read deep", "type Box<T> = { v: T };", `(x: Box<${S}>) => { const y: Box<${N}> = x; return y.v.a.a.a.a.a.a.a + 1; }`],
      ["an optional member's alias", "type Box<T> = { v?: T };", `(x: Box<${S}>) => { const y: Box<${N}> = x; return y; }`],
    ];
    return forms.map(([what, decl, body]): Program => ({ name: `a shortened key: ${what}`, hole: "8-memo-key", rule: "type", src: `${decl}\nconst x = () => 1;\nconst k = ${body};` }));
  })()),
// 6, amended: through Mut and Borrowed
  ...([
    ["a Mut's computed constructor", "const a = () => { const m = mut(Object.fromEntries([[\"a\", 1]])); const c = m[\"constructor\"]; return [c, freeze(m)]; };"],
    ["in on a Mut", "const a = () => { const m = mut(Object.fromEntries([[\"a\", 1]])); const h = \"toString\" in m; return [h, freeze(m)]; };"],
    ["a write of a Mut's __proto__", "const a = () => { const m = mut(Object.fromEntries([[\"a\", 1]])); m[\"__proto__\"] = 1; return freeze(m); };"],
    ["a Mut destructured", "const a = () => { const m = mut(Object.fromEntries([[\"a\", 1]])); const { valueOf } = m; return [valueOf, freeze(m)]; };"],
    ["a Borrowed's constructor", "const g = function* () { const m = mut(Object.fromEntries([[\"a\", 1]])); yield borrow(m); };\nconst a = (g: Borrowed<{ [k: string]: number }>) => g[\"constructor\"];"],
  ] as [string, string][]).map(([what, src]): Program => ({ name: `an index record's prototype member, ${what}`, hole: "6-index-proto", rule: "banned-member", src })),
// 9. a callable held by a record type with a required member, then taken as the record after typeof "function"
  ...(((): Program[] => {
    const D = "interface G { (): number; readonly n: number }\ntype N = { readonly n: number };\ntype H = N;\ninterface M { readonly n: number }\n";
    const U = "const use = (v: N | (() => N)): N => (typeof v === \"function\" ? v() : v); ";
    const forms: [string, string][] = [
      ["a const", "const x: N = g; return use(x);"],
      ["an array element", "const b: N[] = [g]; return use(b[0] ?? { n: 0 });"],
      ["a union arm", "const y: N | number = g; return typeof y === \"number\" ? y : use(y);"],
      ["a generic identity", "const id = <T,>(x: T): T => x; const y: N = id(g); return use(y);"],
      ["an argument", "const h = (r: N): N => use(r); return h(g);"],
      ["a return type", "const r = (): N => g; return use(r());"],
      ["a record member", "const b: { readonly p: N } = { p: g }; return use(b.p);"],
      ["a tuple", "const t: [N] = [g]; return use(t[0]);"],
      ["a default parameter", "const h = (r: N = g): N => use(r); return h();"],
      ["an alias of N", "const x: H = g; return use(x);"],
      ["an index record", "const x: { readonly [k: string]: number } = g; return x;"],
      ["a generic record-shaped parameter", "const h = <T,>(r: { readonly n: T }) => r; return use(h(g));"],
      ["an interface", "const x: M = g; return use(x);"],
    ];
    return forms.map(([what, body]): Program => ({ name: `a callable as a record, ${what}`, hole: "9-callable-record", rule: "type", src: `${D}const k = () => (g: G) => { ${U}${body} };` }));
  })()),
// 10. an open record reaches an index record: its other members are entries of the index's type
  ...(((): Program[] => {
    const forms: [string, string][] = [
      ["a width-widened record", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const r: { [k: string]: number } = q; return (r[\"a\"] ?? 0) + 1; };"],
      ["{} from a function, then called", "const k = () => (g: (s: string) => number) => { const x: {} = g; const r: { [k: string]: unknown } = x; const y: { [k: string]: unknown } | ((n: number) => string) = r; return typeof y === \"function\" ? y(3) : \"\"; };"],
      ["{} from a string, then narrowed", "const k = () => { const x: {} = \"b\"; const r: { [k: string]: unknown } = x; const y: { [k: string]: unknown } | \"a\" = r; if (typeof y !== \"string\") return \"\"; const z: \"a\" = y; return z; };"],
      ["an argument", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const f = (r: { [k: string]: number }) => r; return f(q); };"],
      ["a return type", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const f = (): { [k: string]: number } => q; return f(); };"],
      ["an array element", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const r: { [k: string]: number }[] = [q]; return r; };"],
      ["an interface", "interface B { readonly b: number }\nconst k = () => (p: { b: number; a: string }) => { const q: B = p; const r: { readonly [k: string]: number } = q; return r; };"],
      ["a union arm", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const r: { [k: string]: number } | null = q; return r; };"],
      ["a record member", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const r: { readonly m: { [k: string]: number } } = { m: q }; return r; };"],
      ["Object.values of the index", "const k = () => (p: { b: number; a: string }) => { const q: { b: number } = p; const r: { [k: string]: number } = q; return Object.values(r).reduce((s, v) => s + v, 0); };"],
    ];
    return forms.map(([what, src]): Program => ({ name: `an open record as an index record, ${what}`, hole: "10-open-index", rule: "type", src }));
  })()),
];
