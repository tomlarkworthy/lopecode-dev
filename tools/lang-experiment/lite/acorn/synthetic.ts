// Sources for the census (census.ts) holding node types and fields the corpus does not produce, so that the census
// sees them. Not SoundScript: most of these are rejected. SYNTHETIC from selfhost/flat-ast/synthetic.ts; MORE from
// selfhost/ss-acorn/gen/synthetic.ts (one construct per node type acorn + acorn-typescript can produce that the
// corpus does not; ParenthesizedExpression needs preserveParens, which parse.ts does not set, and WithStatement is a
// syntax error in a module).
export const SYNTHETIC: { id: string; src: string; tsx: boolean }[] = [
  {
    id: "synthetic.ts", tsx: false, src: [
      `import { a } from "m";`,
      `import type { T } from "m";`,
      `declare function f(x: number): string;`,
      `declare const d: number;`,
      `let s = (1, 2);`,
      `do { s++; } while (s < 3);`,
      `;`,
      `for (const k in {}) {}`,
      `outer: for (;;) { break outer; }`,
      `class C { static { } x = 1; m() {} constructor(public p: number) { } }`,
      `const e = { a } satisfies object;`,
      `type Q = typeof s;`,
      `type K = { new (x: number): Q; (y: string): K; [k: string]: number; m(): void; readonly p?: string };`,
      `const t = tag\`a\${1}b\`;`,
      `const c = <number>s;`,
      `enum E { A, B = 2 }`,
      `namespace N { export const z = 1; }`,
      `const big = 10n, re = /a(b)/g, im = import("m"), th = this;`,
      `let o = { get g() { return 1; }, set g(v) {}, ...e, [s]: 2 };`,
      `function* gen<T extends string = "a">(...r: T[]): Generator<T> { yield* r; }`,
      `const u: unknown = null, nv = (x: never) => x, sy: symbol = Symbol(), ob: object = {}, an: any = 1, bi: bigint = big;`,
      `type Tup = [a: number, b?: string, ...c: boolean[]];`,
      `type Opt = [number?, ...string[]]; type QN = N.z; type Fn = <T>(x: T) => T; type Ctor = new () => object;`,
      `type Ix = Tup[0]; type Kq = keyof Tup; type Un = string & number | undefined | void;`,
      `export default 1;`,
      `export * from "m";`,
      `export { a as b };`,
      `try { throw 1; } catch { } finally { }`,
      `switch (s) { case 1: break; default: }`,
      `function nt() { return new.target; }`,
      `const q = a?.b?.[1]?.();`,
      `const w = async () => { for await (const x of []) {} await 1; };`,
      `label: { break label; }`,
      `while (false) continue;`,
      `if (s) {} else if (!s) {} else {}`,
      `x ||= 1; x &&= 2; x ??= 3;`,
      `class D extends C { #p = 1; get [Symbol.iterator]() { return super.m; } }`,
      `abstract class A2 { abstract m(): void; }`,
      `const fe = function named() {};`,
      `const de = ({ a: [b, c = 1], ...rest }: any) => b;`,
      `const [, hole] = [1, , 2];`,
    ].join("\n"),
  },
  { id: "synthetic.tsx", tsx: true, src: `const j = <div a="1" b={2} {...{c: 3}}>{/* empty */}text<><x.y /></></div>;\nconst k = <ns:a />;` },

  {
    // cells for the visitors: reserved names in each position, arguments, casts, and captures through labels and keys
    id: "synthetic-cells.ts", tsx: false, src: [
      `var top = 1;`,
      `export const reserved = (o: { viewof: number }) => o.viewof + o["mutable"] + ({ mutable: 1 }).mutable + o[viewof] + ({ [mutable]: 2 })[0] + ({ $1: 3 }).$1;`,
      `export const argsUse = () => (o: any) => arguments.length + o.arguments + ({ arguments: 1 }).arguments + ({ [arguments]: 1 }) + o[arguments];`,
      `export const casts = (x: unknown) => [x as number, x as const, <string>x, x!, this];`,
      `export const typed = (x: viewof) => (y: Map<mutable, $0>): mutable => y;`,
      `export const taken = (p, q) => { const r = p + 1; function g() { return q; } return action((s) => { p: for (;;) { break p; } q: while (r) continue q; return { p: 1, q }.p + g() + s; }); };`,
      `export const keys = (p) => action(() => ({ p: 1 })[p] + ({ p }).p + p.p);`,
      `export const shadow = (p) => action((p) => { const q = p; return q; });`,
      `export const nested = (p) => action(() => action(() => p));`,
      `export const params = (p) => action((a = p, { b } = p) => a + b);`,
      `export let notFn = 1, alsoFn = () => 2;`,
      `export const [destr] = [() => 1];`,
      `export type Map = number;`,
      `export interface Set { a: number }`,
      `export const dup = () => 1;`,
      `export function dup2() { return 1; }`,
      `class K {}`,
      `enum E2 { A }`,
      `namespace N2 { }`,
      `declare const dd: number;`,
      `/** pure */ export const commented = () => 1;`,
      `// a comment\n/* another */\nexport const two = () => 2;`,
    ].join("\n"),
  },
];

export const MORE: { id: string; src: string; tsx: boolean }[] = [
  { id: "more.ts", tsx: false, src: [
    `import x from "a";`, `import * as ns from "a";`, `import j from "a" with { type: "json" };`,
    `import fs = require("fs");`, `import Q = ns.inner;`, `export = x;`, `debugger;`,
    `@dec class D { @dec m() {} }`,
    `type C<T> = T extends string ? 1 : 2;`, `type I<T> = T extends Array<infer E> ? E : never;`,
    `interface A extends B<number> { f(): this }`, `class K implements B<number> {}`,
    `type IT = import("a").B<number>;`, `const g = f<number>;`, `type Up<S extends string> = intrinsic;`,
    `type M<T> = { -readonly [P in keyof T]-?: T[P] }; type M2<T> = { [P in keyof T as P]: 1 };`,
    `function isS(v: unknown): v is string { return true; }`,
    // added after why-other.ts found these as Other nodes (out/why-other-before-more.txt)
    `declare function g2<T>(x: T): T;`, `class K2 implements B {}`, `interface A2 extends B {}`, `function as1(v: unknown): asserts v is string {}`, `function as2(v: unknown): asserts v {}`,
    // added when the census of the live corpus no longer met these (lite/acorn/census.ts)
    `class O extends D { override m() {} override x = 1; }`, `type IT2 = import("a").B; type IT3 = import("a");`,
    // the two typed-tree gaps of lite/infer/repro: a function expression with type parameters
    `const fe = function <T>(x: T): T { return x; };`,
  ].join("\n") },
  { id: "more-ns.d.ts", tsx: false, src: `export as namespace Foo;` },
  { id: "more.tsx", tsx: true, src: `const e = <a>{...xs}</a>;\nconst bare = <input disabled />;` },
];
