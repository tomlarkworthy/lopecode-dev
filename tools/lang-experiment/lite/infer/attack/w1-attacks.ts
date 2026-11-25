// w1 (2026-11-24): freeze-attack10 and 11's breaks for the w1 round, by step, and near variants. A row named w1-ok-* must
// be accepted and behave; every other row that is not a control must be rejected (live.test.ts asserts both, in both
// checkers). A row with ctl runs with the checker skipped (counted apart as w1-controls) and must show the break, except
// a w1-guard-* control: it calls an action while a cell computes, which the run-time guard must refuse under both
// runners, so it must not fire (before w1 the compiled runner let each run). The attack 11 rows are its candidates
// (selfhost/freeze-attack11) that were silent before w1, renamed w1-<step>-<name>; their drives are attack 11's.
// Every row is run by both runners: run-sets.ts --sets w1 and --sets w1 --rt.
import { tyRow, type Cand } from "../../../selfhost/freeze-attack9/lib9.ts";
import { cands as A11 } from "../../../selfhost/freeze-attack11/a.ts";
import { cands as B11 } from "../../../selfhost/freeze-attack11/b.ts";
import { cands as M11 } from "../../../selfhost/freeze-attack11/min.ts";
import { cands as S11 } from "../../../selfhost/freeze-attack11/s.ts";
type A = Cand;
const R: A[] = [];
const num = (v: unknown) => typeof v === "number";
const str = (v: unknown) => typeof v === "string";
const ctl = (a: A): A => ({ ...a, ctl: true });
const all11 = [...A11, ...B11, ...M11, ...S11];
const from11 = (step: string, names: string[]) => {
  for (const n of names) {
    const c = all11.find((x) => x.name === n);
    if (c === undefined) throw new Error(`w1: no attack 11 candidate ${n}`);
    R.push({ ...c, name: `w1-${step}-${n}` });
  }
};
const COUNT = `const count = () => state(0);\nconst bump = (count: State<number>) => action(() => count.update((c) => c + 1));\n`;

// Step 0a: the follower (freeze-attack3/harness.ts) calls a kept plain function but never an Action, so a cell that
// exposes an action leaves the state as it was. Before w1 the follower called bump and c read 1 or more
R.push(tyRow("w1-ok-0-exposed-action", COUNT + `const g = (bump: Action<[]>) => ({ bump });\nconst c = (count: number) => count;`, (v) => v === 0, false, "c"));
R.push(tyRow("w1-ok-0-exposed-action-arr", COUNT + `const g = (bump: Action<[]>) => [bump, bump];\nconst c = (count: number) => count;`, (v) => v === 0, false, "c"));
R.push(tyRow("w1-ok-0-exposed-action-nested", COUNT + `const g = (bump: Action<[]>) => ({ a: { b: bump } });\nconst c = (count: number) => count;`, (v) => v === 0, false, "c"));
R.push(tyRow("w1-ok-0-exposed-action-direct", COUNT + `const g = (bump: Action<[]>) => bump;\nconst c = (count: number) => count;`, (v) => v === 0, false, "c"));
R.push(tyRow("w1-ok-0-kept-plain-fn", `const g = () => () => 7;`, (v) => typeof v === "function"));
R.push(tyRow("w1-ok-0-count-plain", COUNT + `const c = (count: number) => count + 1;`, (v) => v === 1, false, "c"));
// Step 0b: an action called while a cell computes is refused by the run-time guard under both runners. Each control's
// g reads count 0, calls bump once, and returns count: without the guard g ends at 1 (DIFF), with it g fails (try: g
// catches the refusal and gives 0, and without the guard gives 11). A kept function cell that calls the action is not
// a guard row: the follower calls a kept plain function after the cells settle, as designed
const GUARD = (name: string, body: string) => R.push(ctl(tyRow(`w1-guard-${name}`, COUNT + body, (v) => v === 0)));
GUARD("plain", `const g = (bump: Action<[]>, count: number) => { if (count === 0) bump(); return count; };`);
GUARD("helper", `const g = (bump: Action<[]>, count: number) => { const k = () => bump(); if (count === 0) k(); return count; };`);
GUARD("map", `const g = (bump: Action<[]>, count: number) => { [1].map(() => (count === 0 ? bump() : 0)); return count; };`);
GUARD("generator-first", `function* g(bump: Action<[]>, count: number) { if (count === 0) bump(); yield count; }`);
GUARD("generator-later", `function* g(bump: Action<[]>, count: number) { yield count; if (count === 0) bump(); yield count; }`);
GUARD("async-before-await", `const g = async (bump: Action<[]>, count: number) => { if (count === 0) bump(); await null; return count; };`);
GUARD("ternary", `const g = (bump: Action<[]>, count: number) => (count === 0 ? (bump(), count) : count);`);
GUARD("try", `const g = (bump: Action<[]>, count: number) => { try { if (count === 0) bump(); } catch { return count; } return count + 10; };`);
GUARD("loop", `const g = (bump: Action<[]>, count: number) => { for (let i = 0; i < 1; i++) if (count === 0) bump(); return count; };`);
GUARD("record-method", `const g = (bump: Action<[]>, count: number) => { const o = { go: () => bump() }; if (count === 0) o.go(); return count; };`);
GUARD("iife", `const g = (bump: Action<[]>, count: number) => ((n: number) => { if (n === 0) bump(); return n; })(count);`);
R.push(ctl({ ...M11.find((c) => c.name === "min-ctl-action-call")!, name: "w1-guard-min-ctl-action-call" }));

// Step 1: the forgetting rule. A value given a type that does not declare a part of it: the part must be plain data; a
// value that is not a record is not given a record type
from11("1", ["a-r-extra", "a-r-extra-alias", "a-r-extra-arr", "a-r-extra-gen", "a-r-extra-iface", "a-r-extra-kept", "a-r-extra-map", "a-r-extra-name",
  "a-r-extra-nested", "a-r-extra-opt-union", "a-r-extra-param", "a-r-extra-promise", "a-r-extra-rest", "a-r-extra-set", "a-r-extra-spread", "a-r-extra-ternary",
  "a-r-extra-union", "a-r-extra-unknown", "a-o-extra-direct", "a-o-extra-spread", "a-o-extra-unknown", "a-m-extra-action", "a-m-extra-action-unknown",
  "a-g-unknown-arr-extra", "a-r-two-ss", "b-fn-alias", "b-fn-array", "b-fn-generic", "b-fn-iface", "b-fn-memo", "b-fn-param", "b-fn-union", "b-err-stack",
  "b-iter-next", "b-promise-catch", "b-u8-byteLength", "b-usp-size", "b-method-name", "min-fn-name", "min-resp-race", "min-action-hidden-json"]);
const G = (body: string) => `const g = () => { ${body} };`;
R.push(tyRow("w1-1-fn-to-empty", G(`const e: {} = () => 1; return 1;`), num));
R.push(tyRow("w1-1-fn-to-optional", G(`const e: { readonly a?: number } = () => 1; return 1;`), num));
R.push(tyRow("w1-1-array-to-empty", G(`const e: {} = [1]; return 1;`), num));
R.push(tyRow("w1-1-error-to-empty", G(`const e: {} = new Error("x"); return 1;`), num));
R.push(tyRow("w1-1-map-to-optional", G(`const e: { readonly size?: number } = new Map<string, number>(); return 1;`), num));
R.push(tyRow("w1-1-extra-fn", G(`const o = { n: 1, f: () => "s" }; const c: { readonly n: number } = o; return c.n;`), num));
R.push(tyRow("w1-1-extra-fn-arg", `const g = () => { const h = (c: { readonly n: number }) => c.n; return h({ n: 1, f: () => 2 }); };`, num));
R.push(tyRow("w1-1-extra-fn-return", `const g = (): { readonly n: number } => { const o = { n: 1, f: () => 2 }; return o; };`, (v) => typeof v === "object"));
R.push(tyRow("w1-1-extra-fn-element", G(`const xs: { readonly n: number }[] = [{ n: 1, f: () => 2 }]; return xs.length;`), num));
R.push(tyRow("w1-1-extra-fn-nested", G(`const o: { readonly a: { readonly n: number } } = { a: { n: 1, f: () => 2 } }; return o.a.n;`), num));
R.push(tyRow("w1-1-extra-fn-state", `const g = () => state<{ readonly n: number }>({ n: 1, f: () => 2 });`, (v) => typeof v === "object"));
R.push(tyRow("w1-1-extra-promise", G(`const o = { n: 1, p: Promise.resolve(1) }; const c: { readonly n: number } = o; return c.n;`), num));
R.push(tyRow("w1-1-extra-fn-generic", G(`const id = <T,>(x: T): T => x; const c: { readonly n: number } = id({ n: 1, f: () => 2 }); return c.n;`), num));
R.push(tyRow("w1-1-extra-fn-union-arm", G(`const c: { readonly n: number } | null = { n: 1, f: () => 2 }; return c === null ? 0 : c.n;`), num));
R.push(tyRow("w1-ok-1-extra-plain", G(`const o = { n: 1, s: "x" }; const c: { readonly n: number } = o; return c.n;`), num));
R.push(tyRow("w1-ok-1-extra-plain-nested", G(`const o = { n: 1, a: { b: [1, 2] } }; const c: { readonly n: number } = o; return c.n;`), num));
R.push(tyRow("w1-ok-1-declared-fn", G(`const o: { readonly n: number; readonly f: () => number } = { n: 1, f: () => 2 }; return o.f() + o.n;`), (v) => v === 3));
R.push(tyRow("w1-ok-1-fn-type", G(`const f: () => number = () => 1; return f();`), num));
R.push(tyRow("w1-ok-1-record-to-empty", G(`const o = { a: 1 }; const e: {} = o; return 1;`), num));
R.push(tyRow("w1-ok-1-optional-plain", G(`const o = { a: 1 }; const c: { readonly a?: number } = o; return c.a ?? 0;`), num));
R.push(tyRow("w1-ok-1-to-unknown-plain", G(`const o: { readonly n: number } = { n: 1 }; const u: unknown = o; return typeof u === "object" ? 1 : 0;`), num));
R.push(tyRow("w1-ok-1-wide-union", `type U = ${Array.from({ length: 80 }, (_, i) => `{ readonly k${i}?: U; readonly m${i}?: readonly U[] }`).join(" | ")};\nconst g = () => { const u: U = {}; const w: {} = u; return 1; };`, num));
for (const n of ["a-r-ctl-direct"]) R.push(ctl({ ...A11.find((c) => c.name === n)!, name: `w1-1-${n}` }));
R.push(ctl(tyRow("w1-1-ctl-extra-fn-kept", `const g = () => { const o = { n: 1, f: () => "s" }; const c: { readonly n: number } = o; const u: unknown = c; return typeof u === "object" && u !== null && "f" in u ? "leaked" : 1; };`, num)));

// Step 2: conversion hooks. No declared member and no object literal key may be named after an Object.prototype member
// or toJSON or then
from11("2", ["a-d-toString-_x", "a-d-toString-_x_", "a-d-toString-_x_join_", "a-d-toString-_x_toSorted_length", "a-d-toString-messageOf_x_", "a-d-valueOf-_x",
  "a-d-valueOf-x_", "a-h-then-action", "a-h-then-action-args", "a-h-then-action-async", "a-h-then-action-await", "a-h-then-action-rec", "a-h-then-action-resolve",
  "a-h-then-fn-async", "a-h-then-fn-await", "a-h-then-fn-param", "a-h-then-gen", "a-h-tojson-action", "a-h-tostring-join", "a-h-tostring-sort", "a-h-tostring-String",
  "a-h-tostring-template", "a-h-valueof-Number", "a-h2-then-array-ret", "a-h2-tojson-map-entries", "a-h2-tojson-nested", "a-h2-tostring-action-arg",
  "a-h2-tostring-direct-template", "a-h2-tostring-jsx-child", "a-h2-tostring-kept", "a-h2-tostring-messageOf", "a-h2-valueof-compare", "min-action-template", "min-then-async"]);
R.push(tyRow("w1-2-literal-toString", G(`const o = { toString: () => "x", n: 1 }; return o.n;`), num));
R.push(tyRow("w1-2-literal-toLocaleString", G(`const o = { toLocaleString: () => "x", n: 1 }; return \`\${o.n}\`;`), str));
R.push(tyRow("w1-2-literal-then-plain", G(`const o = { then: 1 }; return o.then;`), num));
R.push(tyRow("w1-2-literal-toJSON", G(`const o = { toJSON: () => 1, n: 2 }; return o.n;`), num));
R.push(tyRow("w1-2-literal-valueOf-string-key", G(`const o = { "valueOf": () => 1, n: 2 }; return o.n;`), num));
R.push(tyRow("w1-2-required-member", `type W = { readonly valueOf: () => number };\nconst g = () => 1;`, num));
R.push(tyRow("w1-2-interface-method", `interface I { toString(): string }\nconst g = () => 1;`, num));
R.push(tyRow("w1-2-inline-type", G(`const f = (w: { readonly then: number }) => w.then; return f({ then: 1 });`), num));
R.push(tyRow("w1-2-hasOwnProperty", G(`const o = { hasOwnProperty: 1 }; return o.hasOwnProperty;`), num));
R.push(tyRow("w1-ok-2-near-name", G(`const o = { toStr: () => "x", thenable: 1, json: 2 }; return o.thenable + o.json;`), (v) => v === 3));
R.push(tyRow("w1-ok-2-template-plain", G(`const o = { n: 1 }; return \`\${o.n}\`;`), str));
R.push(tyRow("w1-ok-2-method-call", G(`return (12).toString() + [1, 2].join(",");`), str));
R.push(ctl(tyRow("w1-2-ctl-toString-runs", G(`let n = 0; const o = { toString: () => { n++; return "x"; } }; const s = \`\${o}\`; return n === 0 ? s : 7;`), str)));

// Step 3: S-1 (a block's later const or let is the binding a read before it names), A-4 (JSON.stringify of a value that
// may be undefined or a function), C-1 (mapped types are unsupported; never a throw), F-4 (a keyword bound as a name)
from11("3", ["s-Math", "s-JSON", "s-outer-local", "s-outer-local-str", "s-outer-let", "s-nested-fn",
  "s-param-block", "s-param-block-min", "s-cell-param-block", "s-for-body", "s-catch", "min-scope", "min-scope-action", "min-json-undefined", "a-h-json-undefined",
  "a-h-json-fn", "a-h-tojson-direct-undef"]);
R.push(tyRow("w1-3-s1-shadow-math", G(`const f = () => Math.max(1, 2); const Math = { max: (a: number, b: number) => "s" }; return f();`), num));
R.push(tyRow("w1-3-s1-tdz-read", G(`const y = h + 1; const h = 2; return y;`), num));
R.push(tyRow("w1-3-s1-tdz-destructured", G(`const y = a + 1; const { a } = { a: 2 }; return y;`), num));
R.push(tyRow("w1-3-s1-inner-block", `const g = (x: number) => { { const f = () => x + 1; const x = "s"; return f(); } };\nconst x = () => 1;`, num));
R.push(tyRow("w1-3-a4-undefined", G(`return JSON.stringify(undefined);`), str));
R.push(tyRow("w1-3-a4-fn", G(`return JSON.stringify(() => 1);`), str));
R.push(tyRow("w1-3-a4-maybe-undefined", G(`const xs = [1]; return JSON.stringify(xs[3]);`), str));
R.push(tyRow("w1-3-a4-unknown", G(`const u: unknown = undefined; return JSON.stringify(u);`), str));
R.push(tyRow("w1-3-c1-mapped-used", `type W = { readonly [K in "a"]: number };\nconst g = () => { const w: W = { a: 1 }; return w.a; };`, num));
R.push(tyRow("w1-3-c1-mapped-optional", G(`const w: { [K in "a"]?: number } = {}; return w.a ?? 0;`), num));
R.push(tyRow("w1-3-f4-cell-this", `const this = () => 1;\nconst g = () => 1;`, num));
R.push(tyRow("w1-3-f4-local-this", G(`const this = 1; return 1;`), num));
R.push(tyRow("w1-3-f4-pattern-this", G(`const { a: this } = { a: 1 }; return 1;`), num));
// open part 3 (2026-11-25): attack 11's s-Number, s-String, s-parseInt and s-structuredClone read a later local const
// function from inside an earlier const function used only after it; that read is now accepted and names the local,
// as JavaScript does. Their attack 11 oracles expect the global's type, so they are restated with the local's
R.push(tyRow("w1-ok-3-s1-local-Number", G(`const f = () => Number("3"); const Number = (s: string) => s; return f();`), (v) => v === "3"));
R.push(tyRow("w1-ok-3-s1-local-String", G(`const f = () => String(3); const String = (n: number) => n; return f();`), (v) => v === 3));
R.push(tyRow("w1-ok-3-s1-local-parseInt", G(`const f = () => parseInt("3"); const parseInt = (s: string) => s; return f();`), (v) => v === "3"));
R.push(tyRow("w1-ok-3-s1-local-structuredClone", G(`const f = () => structuredClone([1]); const structuredClone = (v: readonly number[]) => "s"; return f();`), (v) => v === "s"));
R.push(tyRow("w1-ok-3-s1-declared-first", G(`const h = 2; const f = () => h + 1; return f();`), (v) => v === 3));
R.push(tyRow("w1-ok-3-s1-outer-unshadowed", G(`const f = () => Math.max(1, 2); return f();`), (v) => v === 2));
R.push(tyRow("w1-ok-3-a4-record", G(`return JSON.stringify({ a: [1, null] });`), (v) => v === '{"a":[1,null]}'));
R.push(tyRow("w1-ok-3-a4-fallback", G(`const xs = [1]; return JSON.stringify(xs[3] ?? null);`), (v) => v === "null"));
R.push(tyRow("w1-ok-3-a4-array-of-unknown", G(`const u: unknown = 1; return JSON.stringify([u]);`), (v) => v === "[1]"));
R.push(tyRow("w1-ok-3-f4-contextual", `const async = () => 1;\nconst g = (async: number) => async + 1;`, (v) => v === 2));
R.push(tyRow("w1-ok-3-f4-keyword-key", G(`const o = { for: 1, this: 2 }; return o.for + o.this;`), (v) => v === 3));
for (const n of ["s-ctl-param-block"]) R.push(ctl({ ...S11.find((c) => c.name === n)!, name: `w1-3-${n}` }));
R.push(ctl(tyRow("w1-3-ctl-a4-undefined", G(`return JSON.stringify(undefined);`), str)));
R.push(ctl(tyRow("w1-3-ctl-s1-shadow-math", G(`const f = () => Math.max(1, 2); const Math = { max: (a: number, b: number) => "s" }; return f();`), num)));
export const attacks = R;
export const cands = R;
