// One construct per node type acorn + acorn-typescript can produce (out/node-types.json) that the census corpus
// (the nested prototype's 361 inputs, ../flat-ast/synthetic.ts, the TypeScript of base/lite) does not. Not SoundScript.
// Types not here: ParenthesizedExpression (only with preserveParens, which parse.ts does not set), WithStatement (a
// syntax error in a module), TSTypeCastExpression (the plugin makes it while it reads an arrow's parameters and
// turns it into a parameter; see out/census.txt for whether any parse keeps one).
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
  ].join("\n") },
  { id: "more-ns.d.ts", tsx: false, src: `export as namespace Foo;` },
  { id: "more.tsx", tsx: true, src: `const e = <a>{...xs}</a>;` },
];
