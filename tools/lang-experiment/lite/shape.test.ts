// Unit tests for the cells of shape.ss.ts, called with plain types and a fake registry; each control links a mutant of
// one cell and must fail at least one of the same checks. Then shape.ss.ts's TypeShape against runtime.ss.ts's Shape on
// the parse. Run: bun lite/shape.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { linkShape } from "./shape-ss.ts";
import { parse, type Node } from "./parse.ts";
import type { Ty } from "./types.ts";

const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);
const named = (n: string, args: Ty[] = []): Ty => ({ k: "named", n, args });
const rec = (ps: [string, Ty, boolean?][]): Ty => ({ k: "rec", props: new Map(ps.map(([n, t, o]) => [n, { t, opt: !!o }])) });
const NUM: Ty = { k: "num" }, STR: Ty = { k: "str" };
// each alias's expansion, given its arguments
const ALIASES: Record<string, (args: Ty[]) => Ty> = {
  A: () => ({ k: "arr", el: NUM }),
  R: () => rec([["v", NUM], ["next", { k: "union", ts: [named("R"), { k: "null" }] }]]),
  U: () => ({ k: "union", ts: [named("U"), NUM] }),
  X: () => rec([["y", named("Y")]]),
  Y: () => ({ k: "union", ts: [named("X"), STR] }),
  G: (args) => rec([["next", { k: "union", ts: [named("G", [{ k: "arr", el: args[0] ?? NUM }]), { k: "null" }] }]]),
};
const X = { expand: (t: Ty): Ty => (t.k === "named" && ALIASES[t.n] ? ALIASES[t.n]!(t.args) : t), isAlias: (n: string) => n in ALIASES };

function checks(S: ReturnType<typeof linkShape>): [string, boolean][] {
  const out: [string, boolean][] = [];
  const ok = (name: string, cond: boolean) => out.push([name, cond]);
  const at = (t: Ty) => S.shapeAt(t, X);
  ok("a number is num", eq(at(NUM), { k: "num" }));
  ok("true | false is boolean, after the other members", eq(at({ k: "union", ts: [{ k: "lit", v: true }, NUM, { k: "lit", v: false }] }), { k: "union", ts: [{ k: "num" }, { k: "bool" }] }));
  ok("a record keeps its optional flags", eq(at(rec([["a", NUM, true], ["b", STR]])), { k: "rec", props: [["a", { k: "num" }, true], ["b", { k: "str" }, false]] }));
  ok("an index signature is refused", eq(at({ k: "rec", props: new Map(), index: NUM }), { k: "error", error: "an index signature" }));
  ok("a property's refusal names the property", eq(at(rec([["f", { k: "fn", tps: [], ps: [], ret: NUM }]])), { k: "error", error: "f: a function" }));
  ok("a promise is refused", eq(at(named("Promise", [NUM])), { k: "error", error: "a promise" }));
  ok("Array<number> is an array", eq(at(named("Array", [NUM])), { k: "arr", el: { k: "num" } }));
  ok("an alias that is not recursive is expanded in place", eq(at(named("A")), { k: "arr", el: { k: "num" } }));
  const r = at(named("R"));
  ok("a recursive alias is a ref with its definition in defs", r.k === "defs" && eq(r.defs.map((d) => d[0]), ["R"]) && eq(r.body, { k: "ref", n: "R" }));
  const ring = at(named("X"));
  ok("a ring of two aliases entered at X: X is defined, Y expanded in place", ring.k === "defs" && eq(ring.defs.map((d) => d[0]), ["X"]) && eq(ring.defs[0]![1], { k: "rec", props: [["y", { k: "union", ts: [{ k: "ref", n: "X" }, { k: "str" }] }, false]] }));
  ok("an alias that reaches itself through unions alone is refused", eq(at(named("U")), { k: "error", error: "U, a recursive type with no object or array between it and itself" }));
  let deep: Ty = NUM;
  for (let i = 0; i < 17; i++) deep = rec([["x", deep]]);
  ok("a type nested 17 deep that is not recursive is refused", JSON.stringify(at(deep)).includes("a recursive type"));
  ok("a generic alias whose argument grows is refused", JSON.stringify(at(named("G", [NUM]))).includes("a recursive type"));
  const f = S.boundaryShapeAt({ k: "fn", tps: [], ps: [{ n: "x", t: NUM, opt: true }], ret: named("Promise", [STR]) }, X, true);
  ok("a function annotation: an optional parameter may be undefined, a Promise result is async", eq(f, { k: "fn", ps: [{ k: "union", ts: [{ k: "num" }, { k: "undef" }] }], ret: { k: "str" }, async: true }));
  ok("a function annotation under State is refused", eq(S.boundaryShapeAt({ k: "fn", tps: [], ps: [], ret: NUM }, X, false), { k: "error", error: "a function" }));
  ok("a function with type parameters is refused", S.boundaryShapeAt({ k: "fn", tps: ["T"], ps: [], ret: NUM }, X, true).k === "error");
  return out;
}

let fail = 0;
const real = checks(linkShape());
for (const [name, cond] of real) { console.log(`${cond ? "pass" : "FAIL"} ${name}`); if (!cond) fail++; }
const mutants: [string, Record<string, (...inputs: never[]) => unknown>][] = [
  ["boolUnion keeps true | false", { boolUnion: () => (ts: readonly unknown[]) => ({ k: "union", ts: [...ts] }) }],
  ["unproductive is never true", { unproductive: () => () => false }],
  ["tyKey gives every type one key", { tyKey: () => () => "k" }],
];
for (const [name, over] of mutants) {
  const failed = checks(linkShape(over)).filter(([, c]) => !c).length;
  console.log(`${failed ? "pass" : "FAIL"} control (${name}): ${failed} of ${real.length} checks fail`);
  if (!failed) fail++;
}

// TypeShape is Shape under another name: the two declarations' types are the same tree
const declOf = (file: string, name: string): Node => {
  const P = parse(readFileSync(join(import.meta.dir, file), "utf8"));
  for (const s of P.program.body as Node[]) { const d = s.type === "ExportNamedDeclaration" ? s.declaration : s; if (d?.type === "TSTypeAliasDeclaration" && d.id.name === name) return d.typeAnnotation; }
  throw new Error(`${file} declares no type ${name}`);
};
const tree = (n: unknown, rename: string): unknown => {
  if (Array.isArray(n)) return n.map((x) => tree(x, rename));
  if (!n || typeof n !== "object") return n;
  const o = n as Record<string, unknown>;
  if (o.type === "Identifier" && o.name === rename) return { type: "Identifier", name: "Shape" };
  return Object.fromEntries(Object.entries(o).filter(([k]) => !["start", "end", "loc", "range", "leadingComments", "trailingComments", "innerComments"].includes(k)).map(([k, v]) => [k, tree(v, rename)]));
};
const shape = tree(declOf("runtime.ss.ts", "Shape"), "Shape"), typeShape = tree(declOf("shape.ss.ts", "TypeShape"), "TypeShape");
const same = JSON.stringify(shape) === JSON.stringify(typeShape);
console.log(`${same ? "pass" : "FAIL"} shape.ss.ts TypeShape is runtime.ss.ts Shape, renamed`);
if (!same) fail++;
const fewer = tree({ ...(declOf("shape.ss.ts", "TypeShape") as any), types: (declOf("shape.ss.ts", "TypeShape") as any).types.slice(1) }, "TypeShape");
const caught = JSON.stringify(shape) !== JSON.stringify(fewer);
console.log(`${caught ? "pass" : "FAIL"} control: TypeShape without its first member differs from Shape`);
if (!caught) fail++;
const total = real.length + mutants.length + 2;
console.log(`${total - fail} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
