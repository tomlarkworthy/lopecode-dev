// tools/triage/cellwise.ts, sameDef: a cell's `viewof`/`mutable` placeholders ($0, $1 …) are numbered by the compiler,
// and the two compilers number them in different orders. A cell is the same when each placeholder stands for the same
// input on both sides, whatever its number. Issue fb-batch-docs-and-tools, entry seen-cellwise-placeholder-numbers:
// `cellwise-diff.ts @tomlarkworthy/annotate lopebooks` printed DIFFER for a2Store after a push that made it the same.
//
//   bun test --timeout=30000 ./tests/tools/cellwise-placeholders.test.ts
// CELLWISE_TS=/another/cellwise.ts reads another copy of the tool (the file before the change).
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const { parseModule, sameDef, sameInputs, sig } = await import(process.env.CELLWISE_TS || resolve(root, "tools/triage/cellwise.ts"));

// A module of one cell `store`, as each compiler writes it: Observable a bare function, lopecode a `const` holder.
const observable = (params: string, body: string, inputs: string[]) =>
  `function _store(${params}){return(\n${body}\n)}\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer("store")).define("store", ${JSON.stringify(inputs)}, _store);\n  return main;\n}`;
const lopecode = (params: string, body: string, inputs: string[]) =>
  `const _1 = function _store(${params})\n{\n  return ${body};\n};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn);\n  $def("_1", "store", ${JSON.stringify(inputs)}, _1);\n  return main;\n}`;
const cell = (src: string) => parseModule(src).cells.get("store")!;
const known = () => true;

test("two cells that differ in the numbers of two viewof placeholders alone are the same", () => {
  const o = cell(observable("$0,$1,log", "{ self: $0.value, peer: $1.value, log }", ["viewof a2Self", "viewof a2Peer", "log"]));
  const l = cell(lopecode("$0, log, $1", "{ self: $1.value, peer: $0.value, log }", ["viewof a2Peer", "log", "viewof a2Self"]));
  expect(o.inputs).toEqual(["viewof a2Self", "viewof a2Peer", "log"]);
  expect(l.inputs).toEqual(["viewof a2Peer", "log", "viewof a2Self"]);
  expect(o.def).not.toBe(l.def);
  expect(sameDef(l, o)).toBe(true);
  expect(sameInputs(l, o, known)).toBe(true);
  // With no inputs given the numbers are names, as they were for every caller before this change.
  expect(sig(o.def)).not.toBe(sig(l.def));
});

test("two cells whose placeholders stand for different inputs differ, also when their text is one", () => {
  // One text, the inputs the other way round: `self` is a2Self on one side and a2Peer on the other.
  const o = cell(observable("$0,$1", "{ self: $0.value, peer: $1.value }", ["viewof a2Self", "viewof a2Peer"]));
  const swapped = cell(observable("$0,$1", "{ self: $0.value, peer: $1.value }", ["viewof a2Peer", "viewof a2Self"]));
  expect(o.def).toBe(swapped.def);
  expect(sameInputs(swapped, o, known)).toBe(true);
  expect(sameDef(swapped, o)).toBe(false);
  // Another input altogether.
  const other = cell(lopecode("$0, $1", "{ self: $0.value, peer: $1.value }", ["viewof a2Self", "viewof a2Other"]));
  expect(sameDef(other, o)).toBe(false);
  // The same numbers and the same inputs, in the two compilers' shapes: the same, as before.
  expect(sameDef(cell(lopecode("$0, $1", "{ self: $0.value, peer: $1.value }", ["viewof a2Self", "viewof a2Peer"])), o)).toBe(true);
});

test("a mutable placeholder is read the same way; a property spelled like one, a comment, and a cell with none are as written", () => {
  const o = cell(observable("$0,$1", "($0.value = 1, $1.value)", ["mutable count", "viewof pick"]));
  const l = cell(lopecode("$0, $1", "($1.value = 1, $0.value)", ["viewof pick", "mutable count"]));
  expect(sameDef(l, o)).toBe(true);
  // `box.$0` is a property of box, not the placeholder.
  const p = cell(observable("$0,$1,box", "box.$0 + $1.value", ["viewof a", "viewof b", "box"]));
  const q = cell(observable("$0,$1,box", "box.$1 + $1.value", ["viewof a", "viewof b", "box"]));
  expect(sameDef(p, q)).toBe(false);
  // A comment that names a number is prose: it is compared as written.
  const c0 = cell(observable("$0", "[$0.value /* $0 is the view */]", ["viewof a"]));
  const c1 = cell(observable("$0", "[$0.value /* $1 is the view */]", ["viewof a"]));
  expect(sameDef(c0, c1)).toBe(false);
  // No placeholder: the body decides, as before.
  const plain = (body: string) => cell(observable("x", body, ["x"]));
  expect([sameDef(plain("x + 1"), plain("x + 1")), sameDef(plain("x + 1"), plain("x + 2"))]).toEqual([true, false]);
  expect(sameDef(cell(lopecode("x", "x + 1", ["x"])), plain("x + 1"))).toBe(true);
});
