// Shared invertability corpus for js-toolchain — the round-trip spec, used by both the
// bun suite (tools/js-toolchain/roundtrip.test.js) and the Node suite
// (tests/notebooks/js-toolchain.test.js). Keeping the cases here means the spec has one
// home regardless of which runner executes it.
//
// Sourcemap.trim() strips a single leading and trailing newline; the recovered source is
// the input modulo that trim, so comparisons mirror it.
export const trimNL = (s) => s.replace(/^\n/, "").replace(/\n$/, "");

export const expressionCells = [
  `1 + 1`,
  `x + y`,
  `Math.sqrt(2)`,
  `({a: 1, b: 2})`,            // object literal — must keep its parens
  `[1, 2, 3]`,
  `foo.bar(baz)`,
  `(a) => a + 1`,
  `cond ? a : b`,
  "`hi ${name} there`",
  `"a string with return {x} inside"`,
  `/return \\{/g`,             // regex literal containing return-brace
  `(\n  1\n)`,                 // source whose trimmed form ends with )
  `await fetch(url)`           // top-level await -> async expression
];

export const programCellsSingle = [
  `const x = 1`,
  `let y = 2`,
  `var z = 3`,
  `function f() { return 1; }`,
  `class C { method() {} }`,
  `const {a, b} = obj`,        // destructuring -> outputs a, b
  `const [p, q] = arr`
];

export const programCellsMulti = [
  `const a = 1;\nconst b = 2`,
  `const a = 1; const b = a + 1; const c = b * 2`,
  `const a = 1;\nfunction g() { return a; }`,
  `const x = await f();\nconst y = x + 1`
];

export const sideEffectCells = [
  `if (cond) { doThing(); }`,
  `for (const item of items) consume(item);`,
  `emit(\n  payload\n)`        // ends with ) but is a statement, not an expression
];

export const commentCells = [
  `const x = 1; // trailing line comment`,
  `// leading comment\nconst x = 1`,
  `const a = 1; /* block */ const b = 2`
];

export const adversarial = [
  `{a: 1, b: 2}`,                       // bare object literal (block-vs-expression footgun)
  `{ a }`,                              // object shorthand vs block ambiguity
  `for await (const x of gen) use(x);`, // for-await -> async, no output
  `(exports) => exports["x"]`,          // SOURCE that mimics a projection cell body
  `const exports = whatever`,           // output literally named "exports"
  `a + a + b`,                          // duplicate free reference (input dedup)
  `"line1\\nreturn {x};\\n}"`,          // string containing the program wrapper tail
  `const f = () => { return {z: 1}; }`  // inner return-object inside a declaration
];

export const importsIdentity = [
  `import {a} from "npm:d3"`,
  `import {a, b} from "npm:d3"`,
  `import {a as x, b} from "npm:d3"`,
  `import d from "npm:d3"`,
  `import d, {a, b as c} from "npm:d3"`,
  `import "npm:d3/dist/d3.css"`,
  `import {scaleLinear} from "npm:d3-scale"\nconst s = scaleLinear()` // import + body
];

// Reactive Observable imports (kind B). compile->decompile identity only (these do not go
// through the kind-A transpile wrapper); they become lopecode `module X` + `@variable`/v.import
// cells. `viewof$x`/`mutable$x` dedollar to `viewof x`/`mutable x` and back.
export const observableImports = [
  `import {foo} from "observable:@user/nb"`,
  `import {foo, bar} from "observable:@user/nb"`,
  `import {foo as baz} from "observable:@user/nb"`,
  `import {viewof$chart} from "observable:@user/nb"`,
  `import {mutable$state, foo} from "observable:@user/nb"`,
  `import {a} from "observable:@alice/one"\nimport {b, c as d} from "observable:@bob/two"`,
  `import {x} from "observable:d/0123456789abcdef@408"`
];
