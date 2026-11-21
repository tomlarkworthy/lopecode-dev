// Unit tests for cross() on unions (boundary.ts): a union of records tagged by a literal property takes the member its
// tag names; the result and the message are those of trying the members in order. Then recursive types: the shape
// shapeOf gives through the checker, and what cross() does with trees, cycles, shared objects and deep values.
// Run: bun lite/boundary.test.ts
import { cross, checkShape } from "./boundary.ts";
import { checkSources } from "./core.ts";
import type { Shape } from "./runtime-ss.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
let k = 0;
const res = (v: unknown, s: Shape): string => { try { return "ok " + JSON.stringify(cross(v, s, `t${k++}.p`)); } catch (e) { return `${(e as Error).constructor.name}: ${(e as Error).message}`; } };
const lit = (v: string | number | boolean): Shape => ({ k: "lit", v });
const rec = (...props: [string, Shape, boolean?][]): Shape => ({ k: "rec", props: props.map(([n, s, o]) => [n, s, !!o]) });

// 100 records tagged by type, each with one field of its own
const many: Shape = { k: "union", ts: Array.from({ length: 100 }, (_, i) => rec(["type", lit(`T${i}`)], [`f${i}`, { k: "num" }])) };
{
  let reads = 0;
  const v = new Proxy({ type: "T99", f99: 1 }, { get: (o, p, r) => { reads++; return Reflect.get(o, p, r); } });
  const r = res(v, many);
  ok(`the last of 100 tagged members: ${reads} property reads (at most 4)`, r === 'ok {"type":"T99","f99":1}' && reads <= 4, { r, reads });
}
const two: Shape = { k: "union", ts: [rec(["type", lit("a")], ["x", { k: "num" }]), rec(["type", lit("b")], ["y", { k: "str" }])] };
const failed = "TypeError: p: expected an object or an object, found";
const cases: [string, unknown, string][] = [
  ["the member the tag names", { type: "b", y: "s", z: 1 }, 'ok {"type":"b","y":"s"}'],
  ["an unknown tag: the union's message", { type: "c" }, `${failed} an object`],
  ["a missing tag", { x: 1 }, `${failed} an object`],
  ["the right tag and a wrong field: the union's message, not the member's", { type: "b", y: 1 }, `${failed} an object`],
  ["a tag inherited from a prototype", Object.create({ type: "a", x: 1 }), `${failed} a Object object`],
  ["a number", 3, `${failed} number 3`],
  ["an array", ["a"], `${failed} an array of 1`],
  ["null", null, `${failed} null`],
];
for (const [label, v, want] of cases) { const r = res(v, two); ok(label, r === want, r); }
{
  const zeros: Shape = { k: "union", ts: [rec(["t", lit(0)]), rec(["t", lit(1)], ["y", { k: "str" }])] };
  ok("a tag -0 is not the literal 0", res({ t: -0 }, zeros).startsWith("TypeError: p: expected"), res({ t: -0 }, zeros));
  const shared: Shape = { k: "union", ts: [rec(["type", lit("a")], ["x", { k: "num" }]), rec(["type", lit("a")], ["y", { k: "str" }])] };
  ok("two members with one tag: tried in order", res({ type: "a", x: 1 }, shared) === 'ok {"type":"a","x":1}' && res({ type: "a", y: "s" }, shared) === 'ok {"type":"a","y":"s"}');
  const mixed: Shape = { k: "union", ts: [...(two as { ts: Shape[] }).ts, { k: "null" }, { k: "num" }, { k: "arr", el: { k: "str" } }] };
  ok("a union with null, a number and an array: tried in order", [null, 3, ["s"], { type: "b", y: "s" }].map((v) => res(v, mixed)).join(" | ") === 'ok null | ok 3 | ok ["s"] | ok {"type":"b","y":"s"}');
}
{
  // the tag is read to choose the member and again by its check, so a tag that changes is refused, never copied as another member
  let n = 0;
  const v = { get type() { return n++ ? "b" : "a"; }, x: 1 };
  ok("a tag that changes between reads is refused", res(v, two) === `${failed} an object`, res(v, two));
}


// recursive types
const shapeOf = (types: string, ann: string): Shape | string => {
  const r = checkSources({ cells: `${types}\nexport const take = (p: ${ann}): number => 1;`, tsx: false, outside: [{ name: "p" }] });
  return r.facts?.get("take")?.params[0]?.boundary?.shape ?? r.cells.find((c) => c.name === "take")!.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ");
};
const TREE = "type Tree = { v: number; kids: Tree[] };", LIST = "type List = { v: number; next: List | null };";
const tree = shapeOf(TREE, "Tree") as Shape, list = shapeOf(LIST, "List") as Shape;
ok("a recursive alias is a ref defined once", JSON.stringify(tree) === '{"k":"defs","defs":[["Tree",{"k":"rec","props":[["v",{"k":"num"},false],["kids",{"k":"arr","el":{"k":"ref","n":"Tree"}},false]]}]],"body":{"k":"ref","n":"Tree"}}', tree);
ok("an alias that is not recursive is expanded in place", JSON.stringify(shapeOf("type P = { x: number };", "P[]")) === '{"k":"arr","el":{"k":"rec","props":[["x",{"k":"num"},false]]}}');
const refusedAt = [
  ["type A = A | number;", "A", "[boundary-type] p: A cannot cross from another language: it is or holds A, a recursive type with no object or array between it and itself"],
  ["type A = B | null; type B = A | string;", "A", "[boundary-type] p: A cannot cross from another language: it is or holds A, a recursive type with no object or array between it and itself"],
  ["type N<T> = { next: N<T[]> | null };", "N<number>", "[boundary-type] p: N<number> cannot cross from another language: it is or holds next: next: next: next: next: next: a recursive type"],
  ["type T = { next: T | null; f: () => void };", "T", "[boundary-type] p: T cannot cross from another language: it is or holds f: a function"],
  ["type T = { kids: T[]; s: State<number> };", "T", "[boundary-type] p: T cannot cross from another language: it is or holds s: State<number>, which the boundary does not check"],
] as const;
{
  const ring = Array.from({ length: 12 }, (_, i) => `type A${i} = { n: A${(i + 1) % 12} | null };`).join("\n");
  const r = shapeOf(ring, "A0");
  ok("a ring of 12 aliases crosses", typeof r !== "string" && r.k === "defs", r);
  const deep = shapeOf("type Tree = { v: number; kids: Tree[] };", "{ x: ".repeat(16) + "Tree" + " }".repeat(16));
  ok("a recursive alias first met 16 objects down crosses", typeof deep !== "string" && deep.k === "defs", deep);
  const plain17 = shapeOf("", "{ x: ".repeat(17) + "number" + " }".repeat(17));
  ok("a type nested 17 deep with no recursion is refused as before", typeof plain17 === "string" && plain17.endsWith("a recursive type"), plain17);
}
for (const [types, ann, want] of refusedAt) { const r = shapeOf(types, ann); ok(`refused at check time: ${types}`, r === want, r); }
{
  const src = { v: 1, extra: "x", kids: [{ v: 2, kids: [{ v: 3, kids: [] }] }] };
  const c = cross(src, tree, "rt1.p") as typeof src;
  src.kids[0]!.v = 9; src.kids.push({ v: 4, kids: [] });
  const frozen = [c, c.kids, c.kids[0], c.kids[0]!.kids, c.kids[0]!.kids[0]].every((x) => Object.isFrozen(x));
  ok("a tree crosses as a copy frozen at every depth, undeclared properties dropped, later changes not seen", frozen && !("extra" in c) && c.kids.length === 1 && c.kids[0]!.v === 2, c);
}
{
  const a: { v: number; kids: unknown[] } = { v: 1, kids: [] }; a.kids.push({ v: 2, kids: [a] });
  ok("a cycle is a mismatch", res(a, tree) === "TypeError: p.kids[0].kids[0]: a cycle", res(a, tree));
  const l: { v: number; next: unknown } = { v: 1, next: null }; l.next = { v: 2, next: l };
  ok("a cycle under a union is reported as the cycle", res(l, list) === "TypeError: p.next.next: a cycle", res(l, list));
  const alt = shapeOf("type R = { next: R } | { v: number };", "R") as Shape;
  const o: { v: number; next?: unknown } = { v: 1 }; o.next = o;
  ok("a cycle under one member, when another member fits: that member", res(o, alt) === 'ok {"v":1}', res(o, alt));
}
{
  type T = { v: number; kids: T[] };
  let c: T = { v: 0, kids: [] };
  for (let i = 1; i <= 30; i++) c = { v: i, kids: [c, c] };
  const t0 = performance.now();
  const a = cross(c, tree, "rt2.p") as T, b = cross(c, tree, "rt2.p") as T;
  const ms = performance.now() - t0;
  ok(`an object two paths share is copied once, and the copy shares it (2^30 paths, two deliveries: ${ms.toFixed(1)} ms)`, a.kids[0] === a.kids[1] && a.kids[0]!.kids[0] === a.kids[0]!.kids[1] && a === b, ms);
  const pt = shapeOf("type P = { v: number }; type T = { p: P; q: P; kids: T[] };", "T") as Shape;
  const o = { v: 1 };
  const c2 = cross({ p: o, q: o, kids: [] }, pt, "rt7.p") as { p: object; q: object };
  ok("an object at two fields of one alias that is not recursive, under a recursive type: copied once", c2.p === c2.q);
  const two = shapeOf("type S = { a: S | null; b: { v: number } | null; v: number };", "S") as Shape;
  const x = { v: 1, a: null, b: null };
  const y = cross({ v: 0, a: x, b: x }, two, "rt3.p") as { a: object; b: object };
  ok("one object under two shapes: a copy for each", JSON.stringify(y.a) === '{"a":null,"b":null,"v":1}' && JSON.stringify(y.b) === '{"v":1}', y);
}
{
  type L = { v: number; next: L | null };
  let l: L | null = null;
  for (let i = 0; i < 100000; i++) l = { v: i, next: l };
  const r1 = (() => { try { cross(l, list, "rt4.p"); cross(l, list, "rt4.p"); return "ok"; } catch (e) { return String(e); } })();
  ok("a List of 100000 nodes crosses, twice on one path", r1 === "ok", r1);
  const nest = shapeOf("type Nest = Nest[];", "Nest") as Shape;
  let a: unknown[] = [];
  for (let i = 0; i < 100000; i++) a = [a];
  const r2 = (() => { try { cross(a, nest, "rt5.p"); cross(a, nest, "rt5.p"); cross(a, { k: "unknown" }, "rt6.p"); cross(a, { k: "unknown" }, "rt6.p"); return "ok"; } catch (e) { return String(e); } })();
  ok("arrays nested 100000 deep cross as Nest and as unknown, twice on one path", r2 === "ok", r2);
  let bad: unknown = [() => 1];
  for (let i = 0; i < 5000; i++) bad = [bad];
  const m = res(bad, nest);
  ok(`a mismatch 5001 levels down: the path keeps its two ends (${m.length} chars)`, m.startsWith("TypeError: p[0][0]") && m.includes("…") && m.endsWith("[0][0]: expected an array, found a function") && m.length < 320, m);
}
{
  const bin = shapeOf('type Expr = Bin | Num; type Bin = { type: "bin"; l: Expr; r: Expr }; type Num = { type: "num"; v: number };', "Bin") as Shape;
  let reads = 0;
  const leaf = () => new Proxy({ type: "num", v: 1 }, { get: (o, p, r) => { reads++; return Reflect.get(o, p, r); } });
  const r = res({ type: "bin", l: leaf(), r: { type: "bin", l: leaf(), r: leaf() } }, bin);
  ok(`a union whose member is a ref takes the member its tag names: ${reads} reads on 3 leaves (at most 9)`, r.startsWith("ok") && reads <= 9, { r, reads });
  ok("a ref the shape does not define is a TypeError", res({}, { k: "ref", n: "Nope" }) === "TypeError: p: the shape has no definition of Nope");
  ok("a write through State<Tree> is checked as a crossing", (() => { try { checkShape({ v: 1, kids: [{ v: 2, kids: [] }] }, tree, "s"); return true; } catch { return false; } })());
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
