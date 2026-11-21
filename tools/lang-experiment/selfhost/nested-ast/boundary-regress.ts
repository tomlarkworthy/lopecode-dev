// Does the rewritten copy (rec/, recdisp/) change today's boundary on non-recursive types? (1) the flat corpus value
// (../flat-ast/ast-a.ss.ts Parse, no recursion) crossed by orig, rec and recdisp: copies compared as JSON; (2) small
// non-recursive types with bad values: the TypeError text from each. (3) the four deep source shapes of
// probe-depth.ts through recdisp with its depth limit on: the limit message or a RangeError.
// Run: bun boundary-regress.ts
import { corpus } from "./corpus.ts";
import { parse } from "./orig/lite/parse.ts";
import { flatParse } from "./flat-adapter.ts";
import { nestParse } from "./adapter.ts";
import { SHAPE } from "./diff.ts";
const D = import.meta.dir + "/";
const B: Record<string, any> = {};
for (const c of ["orig", "rec", "recdisp"]) B[c] = await import(`${D}${c}/lite/boundary.ts`);
const shapeOf = async (types: string, ann: string) => {
  const { checkSources } = await import(`${D}orig/lite/core.ts`);
  const r = checkSources({ cells: `${types}\nexport const take = (p: ${ann}): number => 1;`, tsx: false, outside: [{ name: "p" }] });
  return r.facts.get("take").params[0].boundary.shape;
};
const res = (c: string, v: unknown, s: unknown, path: string) => { try { return "ok " + JSON.stringify(B[c].cross(v, s, path)); } catch (e: any) { return `${e.constructor.name}: ${e.message}`; } };
// (1)
const shapeF = await shapeOf(await Bun.file(D + "../flat-ast/ast-a.ss.ts").text(), "Parse");
const inputs = corpus().filter((c) => { try { parse(c.src, { jsx: c.tsx }); return true; } catch { return false; } });
let same = [0, 0], differ: string[] = [];
inputs.forEach((c, i) => { const v = flatParse(c.src, c.tsx); const o = res("orig", v, shapeF, `a${i}.p`); for (const [k, x] of [["rec", 0], ["recdisp", 1]] as const) { const r = res(k, v, shapeF, `b${k}${i}.p`); if (r === o) same[x]++; else differ.push(`${c.id} ${k}`); } });
console.log(`(1) flat corpus, ${inputs.length} inputs: rec equal to orig ${same[0]}, recdisp equal to orig ${same[1]}; differ ${differ.length} ${differ.slice(0, 3).join(", ")}`);
// (2)
const T = `type P = { name: string; n: number; tags: string[]; kind: "a" | "b"; opt?: number; pair: [number, string]; any: unknown; u: { k: "x"; x: number } | { k: "y"; y: string } | null };`;
const sP = await shapeOf(T, "P");
const good = () => ({ name: "s", n: 1, tags: ["t"], kind: "a", pair: [1, "s"], any: { z: [1] }, u: { k: "x", x: 1 } });
class K { v = 1; }
const bads: [string, (o: any) => void][] = [
  ["well-formed", () => {}], ["missing field", (o) => delete o.n], ["wrong primitive", (o) => (o.n = "1")], ["function", (o) => (o.any = () => 1)],
  ["class instance", (o) => (o.any = new K())], ["extra property", (o) => (o.extra = 1)], ["bad literal", (o) => (o.kind = "c")],
  ["tuple too short", (o) => (o.pair = [1])], ["union member wrong", (o) => (o.u = { k: "x", x: "1" })], ["union unknown tag", (o) => (o.u = { k: "z" })],
  ["array element", (o) => (o.tags = ["t", 2])], ["optional wrong", (o) => (o.opt = "1")], ["not an object", () => {}],
];
console.log(`(2) non-recursive type P, the result from each copy (same: all three agree)`);
for (const [label, f] of bads) {
  const v: any = label === "not an object" ? 5 : good(); if (label !== "not an object") f(v);
  const rs = ["orig", "rec", "recdisp"].map((c) => res(c, v, sP, "f.p"));
  console.log(`  ${label}: ${rs[0] === rs[1] && rs[1] === rs[2] ? "same: " + rs[0].slice(0, 120) : rs.map((r, i) => `${["orig", "rec", "recdisp"][i]} ${r.slice(0, 110)}`).join(" | ")}`);
}
// (3)
console.log(`(3) deep source shapes, recdisp with LIMITS.depth = ${B.recdisp.LIMITS.depth}`);
const shapes: [string, (n: number) => string][] = [
  ["parens", (n) => `const x = ${"(".repeat(n)}1${")".repeat(n)};`], ["arrays", (n) => `const x = ${"[".repeat(n)}${"]".repeat(n)};`],
  ["a+a+…", (n) => `const x = ${Array(n).fill("a").join("+")};`], ["nested arrows", (n) => `const x = ${"() => ".repeat(n)}1;`],
];
for (const [name, mk] of shapes) for (const n of [500, 1000, 2000, 2200, 5000]) {
  let p: any; try { p = nestParse(mk(n), false); } catch (e: any) { console.log(`  ${name} n=${n}: nestParse ${e.constructor.name}`); continue; }
  if (!p.ok) { console.log(`  ${name} n=${n}: does not parse (${p.message.slice(0, 50)})`); continue; }
  const r = res("recdisp", p, SHAPE, "d.nestedParse");
  console.log(`  ${name} n=${n}: ${r.startsWith("ok") ? "crosses" : r.slice(0, 40) + (r.includes("deeper") ? " … nested deeper than " + B.recdisp.LIMITS.depth : "")}`);
}
