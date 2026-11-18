// Which SoundScript intrinsics, capability and prelude names the OJS parser treats as globals (no input),
// and where a comment survives OJS compile then decompile.
import { loadOjs } from "./ojs.ts";
const o = await loadOjs();
const intr = "Object Array Math JSON Number String Boolean BigInt Symbol Map Set Error TypeError RangeError RegExp Promise Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array BigInt64Array BigUint64Array ArrayBuffer DataView TextEncoder TextDecoder Infinity NaN undefined isNaN isFinite parseInt parseFloat encodeURIComponent decodeURIComponent encodeURI decodeURI atob btoa structuredClone URL URLSearchParams fetch now random log invalidation this".split(" ");
const r = o.compile(`x = [${intr.filter((n) => n !== "this").join(", ")}]`)[0];
console.log("intrinsics that become inputs:", JSON.stringify(r._inputs));
const cases: [string, string][] = [
  ["leading, expression cell", "x = /*C*/f(1)"],
  ["inside call parens", "x = f(/*C*/1)"],
  ["before =>", "x = (a) /*C*/ => a"],
  ["inside parameter list", "x = (a /*C*/, b) => a"],
  ["after `return` in block", "x = { return /*C*/ f(1); }"],
  ["multi-line block comment after return", "x = { return /*C\n*/ f(1); }"],
  ["trailing after expression", "x = f(1) /*C*/"],
  ["void operand", "x = void /*C*/ 0"],
  ["anonymous call arg", "f(/*C*/1)"],
];
for (const [label, src] of cases) {
  const v = o.compile(src);
  const def = v[0]._definition;
  const back = await o.decompile(v.map((x: any) => x));
  const again = o.compile(back)[0]._definition;
  let ran: string;
  try { const fn = (0, eval)(`(${def})`); ran = String(fn.call(undefined, (n: number) => n + 1)); } catch (e) { ran = `throws ${(e as Error).message}`; }
  console.log(`| ${label} | compile keeps: ${def.includes("/*C") ? "yes" : "NO"} | decompile keeps: ${back.includes("/*C") ? "yes" : "NO"} | fixpoint: ${again === def ? "yes" : "no"} | value ${ran} | ${JSON.stringify(back)}`);
}
for (const n of ["$ss$type$Line", "type_Line", "$ss$", "$0x"]) {
  const v = o.compile(`${n} = 1`);
  console.log(`name ${n}:`, JSON.stringify(v.map((x: any) => [x._name, x._inputs])), /_sourceExpression/.test(v[0]._definition) ? "SYNTAX" : "");
}
console.log("ref to $ss$:", JSON.stringify(o.compile("x = $ss$.cell(1)")[0]._inputs));
console.log("two cells count + viewof count: names", JSON.stringify([...o.compile("viewof count = 1"), ...o.compile("count = 2")].map((x: any) => x._name)));
// state option B: the handle as an ordinary cell, the value a cell over it (no viewof)
const B = ["count$ref = { const {state} = ss; return ss.cell(/*{lang:\"ss\"}*/() => state(0), [], {kind: \"ref\", prev: this}); }", "count = ss.refValues(/*{lang:\"ss\"}*//*ss@ref*/count$ref)"];
for (const t of B) { const v = o.compile(t); const back = await o.decompile(v); console.log("option B:", back === t ? "fixpoint" : "CHANGED", JSON.stringify(v.map((x: any) => [x._name, x._inputs]))); }
// a free global the parser does not know becomes an input; does the runtime still resolve it?
const { Runtime } = await import("@observablehq/runtime");
const rt = new Runtime();
const got = await new Promise((res) => rt.module().variable({ fulfilled: res, rejected: (e: any) => res(`rejected ${e.message}`) }).define("x", ["structuredClone"], (sc: any) => typeof sc));
console.log("input structuredClone with no such variable resolves to:", got);
o.dispose();
process.exit(0);
