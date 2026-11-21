// bun lite/toolchain/translate.test.ts — Observable JavaScript cells as SoundScript text (fromObservableVariables),
// and the round trips the editor's language picker makes. The variables are as the standard compiler
// (@tomlarkworthy/observablejs-toolchain compile) gives them, recorded from it.
import { fromObservableVariables, compileCell, compileCellText, decompileVariable, langOf, contextFromCheck } from "./ss-toolchain.ts";
import { checkCells } from "../stdlib/runtime.ts";

let fail = 0, n = 0;
const expect = (ok: boolean, what: string) => { n++; if (!ok) { fail++; console.log("FAIL " + what); } };
type V = { name: string | null; inputs: string[]; definition: string };
const v = (name: string | null, inputs: string[], definition: string): V => ({ name, inputs, definition });
const text = (vars: V[], opts = {}) => { const r = fromObservableVariables(vars, opts); return "text" in r ? r.text : null; };
const reason = (vars: V[], opts = {}) => { const r = fromObservableVariables(vars, opts); return "reason" in r ? r.reason : null; };

// x = 1 + y
expect(text([v("x", ["y"], "function _x(y) {return (1 + y);}")]) === "const x = (y) => 1 + y;", "expression");
// x = ({a: 1}): an object literal keeps its parentheses
expect(text([v("x", [], "function _x() {return ({a: 1});}")]) === "const x = () => ({a: 1});", "object literal expression");
// x = { return 1 }
expect(text([v("x", [], "function _x() { return 1 }")]) === "const x = () => { return 1 };", "block");
// x = { return (a); }: the definition reads as an expression cell's; the parser's body type says it is a block
expect(text([v("x", ["a"], "function _x(a) { return (a); }")], { expression: false }) === "const x = (a) => { return (a); };", "block of one parenthesised return, with the parser's word");
expect(text([v("x", ["a"], "function _x(a) { return (a); }")]) === "const x = (a) => a;", "the same definition with no word is an expression");
// x = { await y; return 2 }
expect(text([v("x", ["y"], "async function _x(y) { await y; return 2 }")]) === "const x = async (y) => { await y; return 2 };", "async");
// x = { yield 1 }
expect(text([v("x", [], "function* _x() { yield 1 }")]) === "const x = function* () { yield 1 };", "generator");
expect(text([v("x", ["a"], "async function* _x(a) { yield await a }")]) === "const x = async function* (a) { yield await a };", "async generator");
// a comment in an expression cell is kept, and a line comment does not swallow the ;
expect(text([v("x", ["y"], "function _x(y) {return (y // half\n/ 2);}")]) === "const x = (y) => y // half\n/ 2;", "comments kept");
// a nested function's own this is not the cell's
expect(text([v("x", [], "function _x() {return (function () { return this; });}")]) === "const x = () => function () { return this; };", "this of a nested function");

// refused
expect(/viewof/.test(reason([v("viewof x", [], "function _x() {return (1);}"), v("x", ["Generators", "viewof x"], "(G, _) => G.input(_)")]) ?? ""), "viewof refused");
expect(/mutable/.test(reason([v("initial x", [], "function _x() {return (1);}"), v("mutable x", ["Mutable", "initial x"], "(M, _) => new M(_)"), v("x", ["mutable x"], "_ => _.generator")]) ?? ""), "mutable refused");
expect(/this/.test(reason([v("x", [], "function _x() {return (this);}")]) ?? ""), "this refused");
expect(/arguments/.test(reason([v("x", [], "function _x() {return (arguments.length);}")]) ?? ""), "arguments refused");
expect(/anonymous/.test(reason([v(null, [], "function _anonymous() {return (1+2);}")]) ?? ""), "anonymous refused");
expect(/import/.test(reason([v("module @x/y", [], 'async () => runtime.module((await import("/@x/y.js?v=4")).default)'), v("a", ["module @x/y", "@variable"], '(_, v) => v.import("a", _)')]) ?? ""), "import refused");
expect(/viewof x/.test(reason([v("y", ["viewof x"], "function _y($0) {return ($0.value);}")]) ?? ""), "an input that is not an identifier refused");
expect(/capability/.test(reason([v("y", ["now"], "function _y(now) {return (now);}")]) ?? ""), "an input named after a capability refused");
expect(text([v("y", ["invalidation"], "function _y(invalidation) {return (invalidation);}")]) === "const y = (invalidation) => invalidation;", "invalidation is the runtime's own either way");

// a translated cell compiles, and its compiled form decompiles to it
for (const t of ["const x = (y) => 1 + y;", "const x = () => ({a: 1});", "const x = async (y) => { await y; return 2 };", "const x = function* () { yield 1 };"]) {
  const vs = compileCell(t, true);
  expect(vs.map((d) => decompileVariable(d.definition)).filter((s) => s !== null).join() === t, `translated ${t} round trips through compileCell`);
}

// the tagged round trips, as the picker makes them with a module context: SoundScript -> Observable
// JavaScript (compileCellText) -> SoundScript (decompileVariable of the standard compile, which
// compileCell's definitions are) gives the text again, and so does the Observable JavaScript text
const texts = ["// the count\nconst count = () => 1;", "const twice = (count: number) => count * 2;", "const bad = (count: number) => count.nope;"];
const ctx = contextFromCheck(checkCells(texts).result);
for (const [i, t] of texts.entries()) {
  const ojs = compileCellText(t, true, ctx, null);
  const defs = compileCell(t, true, ctx, null);
  const tagged = defs.find((d) => langOf(d.definition) === "ss")!;
  const back = decompileVariable(tagged.definition);
  expect(back === t, `SoundScript -> Observable JavaScript -> SoundScript keeps cell ${i} (${back})`);
  expect(compileCellText(back!, true, ctx, null) === ojs, `Observable JavaScript (tagged) -> SoundScript -> Observable JavaScript keeps cell ${i}`);
  // tagged variables are not translated as plain ones: the editor reads their source instead
  expect(langOf(tagged.definition) === "ss", `cell ${i} carries the tag`);
}

console.log(`${n - fail} of ${n} pass`);
if (fail) process.exit(1);
