// Unit tests for cross() on unions (boundary.ts): a union of records tagged by a literal property takes the member its
// tag names; the result is that of trying the members in order, and a member alone able to take the value gives the
// message when it fails below the union. Holes. Then recursive types: the shape
// shapeOf gives through the checker, and what cross() does with trees, cycles, shared objects and deep values. Then a
// function from another language: the checker's verdicts and the wrapper the cell is given.
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
const failed = 'TypeError: p: expected an object { type: "a", x: number } or an object { type: "b", y: string }, found';
const cases: [string, unknown, string][] = [
  ["the member the tag names", { type: "b", y: "s", z: 1 }, 'ok {"type":"b","y":"s"}'],
  ["an unknown tag: the union's message", { type: "c" }, `${failed} an object`],
  ["a missing tag", { x: 1 }, `${failed} an object`],
  ["the right tag and a wrong field: the member's message, at the field", { type: "b", y: 1 }, "TypeError: p.y: expected string, found number 1"],
  ["the right tag and a missing field: the member's message", { type: "a" }, "TypeError: p.x: expected number, found nothing"],
  ["a tag inherited from a prototype", Object.create({ type: "a", x: 1 }), `${failed} an object whose prototype is not Object.prototype`],
  ["a number", 3, `${failed} number 3`],
  ["an array", ["a"], `${failed} an array of 1`],
  ["null", null, `${failed} null`],
];
for (const [label, v, want] of cases) { const r = res(v, two); ok(label, r === want, r); }
{
  const zeros: Shape = { k: "union", ts: [rec(["t", lit(0)]), rec(["t", lit(1)], ["y", { k: "str" }])] };
  ok("a tag -0 is not the literal 0", res({ t: -0 }, zeros) === "TypeError: p.t: expected 0, found number -0", res({ t: -0 }, zeros));
  const shared: Shape = { k: "union", ts: [rec(["type", lit("a")], ["x", { k: "num" }]), rec(["type", lit("a")], ["y", { k: "str" }])] };
  ok("two members with one tag: tried in order", res({ type: "a", x: 1 }, shared) === 'ok {"type":"a","x":1}' && res({ type: "a", y: "s" }, shared) === 'ok {"type":"a","y":"s"}');
  const mixed: Shape = { k: "union", ts: [...(two as { ts: Shape[] }).ts, { k: "null" }, { k: "num" }, { k: "arr", el: { k: "str" } }] };
  ok("a union with null, a number and an array: tried in order", [null, 3, ["s"], { type: "b", y: "s" }].map((v) => res(v, mixed)).join(" | ") === 'ok null | ok 3 | ok ["s"] | ok {"type":"b","y":"s"}');
  // a mismatch is reported where it is when one member alone could take the value; else, and at the union's own place, the union's
  const sole: [string, unknown, Shape, string][] = [
    ["the only array member, an element wrong", ["s", 1], mixed, "TypeError: p[1]: expected string, found number 1"],
    ["the only record member, untagged", { a: "x" }, { k: "union", ts: [rec(["a", { k: "num" }]), { k: "null" }] }, 'TypeError: p.a: expected number, found string "x"'],
    ["two record members, untagged", { a: true }, { k: "union", ts: [rec(["a", { k: "num" }]), rec(["a", { k: "str" }])] }, "TypeError: p: expected an object { a: number } or an object { a: string }, found an object"],
    ["a record member and unknown", { a: () => 1 }, { k: "union", ts: [rec(["a", { k: "num" }]), { k: "unknown" }] }, "TypeError: p: expected an object { a: number } or data, found an object"],
    ["a primitive at the union's place", "s", { k: "union", ts: [{ k: "num" }, rec(["a", { k: "num" }])] }, 'TypeError: p: expected number or an object { a: number }, found string "s"'],
    ["a tuple of the wrong length at the union's place", [1], { k: "union", ts: [{ k: "tup", els: [{ k: "num" }, { k: "num" }] }, { k: "null" }] }, "TypeError: p: expected an array of 2 or null, found an array of 1"],
    ["a union inside a union", { a: { b: 1 } }, { k: "union", ts: [{ k: "union", ts: [rec(["a", { k: "union", ts: [rec(["b", { k: "str" }]), { k: "null" }] }]), { k: "num" }] }, { k: "null" }] }, "TypeError: p.a.b: expected string, found number 1"],
  ];
  for (const [label, v, s, want] of sole) { const r = res(v, s); ok(label, r === want, r); }
}
{
  // the tag is read to choose the member and again by its check, so a tag that changes is refused, never copied as another member
  let n = 0;
  const v = { get type() { return n++ ? "b" : "a"; }, x: 1 };
  const r = res(v, two);
  ok("a tag that changes between reads is refused", r === 'TypeError: p.type: expected "a", found string "b"', r);
}
{
  // a hole is checked and copied as an undefined at that index would be
  const N: Shape = { k: "num" }, NU: Shape = { k: "union", ts: [N, { k: "undef" }] };
  const holes: [string, unknown, Shape, string][] = [
    ["a hole under number[]", [1, , 3], { k: "arr", el: N }, "TypeError: p[1]: expected number, found undefined"],
    ["a hole under a tuple of numbers", [1, , 3], { k: "tup", els: [N, N, N] }, "TypeError: p[1]: expected number, found undefined"],
    ["a trailing hole under a tuple of numbers", [1, ,], { k: "tup", els: [N, N] }, "TypeError: p[1]: expected number, found undefined"],
  ];
  for (const [label, v, sh, want] of holes) { const r = res(v, sh); ok(label, r === want, r); }
  const filled = (c: unknown) => Array.isArray(c) && c.length === 3 && 1 in c && c[1] === undefined && Object.isFrozen(c);
  for (const sh of [{ k: "arr", el: NU }, { k: "tup", els: [N, { k: "undef" }, N] }, { k: "unknown" }] as Shape[])
    ok(`a hole under ${sh.k === "arr" ? "(number | undefined)[]" : sh.k === "tup" ? "[number, undefined, number]" : "unknown"} crosses as an undefined, not a hole`, filled(cross([1, , 3], sh, `h${k++}.p`)));
  const a = cross([1], { k: "arr", el: NU }, "h.p"), b = cross([1, ,], { k: "arr", el: NU }, "h.p") as unknown[];
  ok("[1] and then [1, <hole>] on one path: the second is a copy of its own, of length 2", a !== b && b.length === 2 && 1 in b);
}

// recursive types
const shapeOf = (types: string, ann: string): Shape | string => {
  const r = checkSources({ cells: `${types}\nexport const take = (p: ${ann}): number => 1;`, tsx: false, outside: [{ name: "p" }] });
  return r.facts?.get("take")?.params[0]?.boundary?.shape ?? r.cells.find((c) => c.name === "take")!.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ");
};
// every module error and cell error of the program, in order
const allDiags = (types: string, ann: string): string => {
  const r = checkSources({ cells: `${types}\nexport const take = (p: ${ann}): number => 1;`, tsx: false, outside: [{ name: "p" }] });
  return [...r.module.map((m) => `module [${m.rule}] ${m.msg}`), ...r.cells.flatMap((c) => c.errors.map((e) => `${c.name} [${e.rule}] ${e.msg}`))].join("; ");
};
const USE = (n: string) => `take [unknown-type] type ${n} cannot be used: it is not loaded: it is defined by itself ([type-cycle]) or declares a member no type may declare ([banned-member])`;
const CYCLE = (n: string) => `module [type-cycle] type ${n} is defined by itself, with no object, array, tuple or function type between (as in type ${n} = ${n}); write out the type it stands for`;
const TREE = "type Tree = { v: number; kids: Tree[] };", LIST = "type List = { v: number; next: List | null };";
const tree = shapeOf(TREE, "Tree") as Shape, list = shapeOf(LIST, "List") as Shape;
ok("a recursive alias is a ref defined once", JSON.stringify(tree) === '{"k":"defs","defs":[["Tree",{"k":"rec","props":[["v",{"k":"num"},false],["kids",{"k":"arr","el":{"k":"ref","n":"Tree"}},false]]}]],"body":{"k":"ref","n":"Tree"}}', tree);
ok("an alias that is not recursive is expanded in place", JSON.stringify(shapeOf("type P = { x: number };", "P[]")) === '{"k":"arr","el":{"k":"rec","props":[["x",{"k":"num"},false]]}}');
const refusedAt = [
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
{
  const deep = (leaf: string, n: number) => "{ a: ".repeat(n) + leaf + " }".repeat(n);
  const dv = (leaf: unknown, n: number) => { let o: unknown = leaf; for (let i = 0; i < n; i++) o = { a: o }; return o; };
  const L = "type L<T> = { v: T; next: L<T> | null };";
  const l7 = shapeOf(L, `L<${deep("number", 7)}>`);
  ok("a recursive generic alias with an argument 7 deep crosses", typeof l7 !== "string" && res({ v: dv(1, 7), next: { v: dv(2, 7), next: null } }, l7) === "ok " + JSON.stringify({ v: dv(1, 7), next: { v: dv(2, 7), next: null } }), l7);
  const two = shapeOf(L, `{ x: L<${deep("number", 7)}>; y: L<${deep("string", 7)}> }`);
  const names = typeof two === "string" || two.k !== "defs" ? two : two.defs.map((d) => d[0]).join(" | ");
  ok("two deep arguments show prints alike: two definitions", names === "L<{ a: { a: { a: { a: { a: { a: … } } } } } }> | L<{ a: { a: { a: { a: { a: { a: … } } } } } }> (2)", names);
  ok("two deep arguments show prints alike: each checked as its own", typeof two !== "string" && res({ x: { v: dv(1, 7), next: null }, y: { v: dv(1, 7), next: null } }, two) === "TypeError: p.y.v.a.a.a.a.a.a.a: expected string, found number 1");
  const w = shapeOf("type W<T> = { w: T };", `{ x: W<${deep("number", 6)}>; y: W<${deep("string", 6)}> }`);
  ok("an alias that is not recursive, two deep arguments: each checked as its own", typeof w !== "string" && res({ x: { w: dv(1, 6) }, y: { w: dv("s", 6) } }, w).startsWith("ok") && res({ x: { w: dv(1, 6) }, y: { w: dv(1, 6) } }, w) === "TypeError: p.y.w.a.a.a.a.a.a: expected string, found number 1");
  const grows = shapeOf("type N<T> = { v: T; next: N<T[]> | null };", "N<number>");
  ok("a generic alias whose argument grows, the argument used: refused", typeof grows === "string" && grows.endsWith("a recursive type"), grows);
  const loop = allDiags("type A<T> = A<T> | number;", `A<${deep("number", 7)}>`);
  ok("A<T> = A<T> | number with a deep argument: [type-cycle] for the module, and the cell that uses A rejected", loop === `${CYCLE("A")}; ${USE("A")}`, loop);
}
// since e1 (2026-11-23) an alias that reaches itself with no object, array, tuple or function type between is
// [type-cycle] for the module and is not loaded; a cell that uses it is rejected and its message names the cycle
for (const [types, want] of [["type A = A | number;", `${CYCLE("A")}; ${USE("A")}`], ["type A = B | null; type B = A | string;", `${CYCLE("A")}; ${CYCLE("B")}; ${USE("A")}`]] as const) {
  const r = allDiags(types, "A"); ok(`an alias that names itself, and its use: ${types}`, r === want, r);
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
  let lv: unknown = { v: "bad", next: null };
  for (let i = 0; i < 50; i++) lv = { v: i, next: lv };
  ok("a List with a wrong v 51 nodes down: the place of v", res(lv, list) === `TypeError: p${".next".repeat(50)}.v: expected number, found string "bad"`, res(lv, list));
  for (let i = 0; i < 100; i++) lv = { v: i, next: lv };
  const lm = res(lv, list);
  ok(`a List with a wrong v 151 nodes down: the path keeps its two ends (${lm.length} chars)`, lm === `TypeError: p${".next".repeat(150)}.v`.slice(0, 91) + "…" + `${".next".repeat(150)}.v`.slice(-160) + ': expected number, found string "bad"', lm);
  ok(`a mismatch 5001 levels down: the path keeps its two ends (${m.length} chars)`, m.startsWith("TypeError: p[0][0]") && m.includes("…") && m.endsWith("[0][0]: expected an array, found a function") && m.length < 320, m);
}
{
  const bin = shapeOf('type Expr = Bin | Num; type Bin = { type: "bin"; l: Expr; r: Expr }; type Num = { type: "num"; v: number };', "Bin") as Shape;
  let reads = 0;
  const leaf = () => new Proxy({ type: "num", v: 1 }, { get: (o, p, r) => { reads++; return Reflect.get(o, p, r); } });
  const r = res({ type: "bin", l: leaf(), r: { type: "bin", l: leaf(), r: leaf() } }, bin);
  ok(`a union whose member is a ref takes the member its tag names: ${reads} reads on 3 leaves (at most 9)`, r.startsWith("ok") && reads <= 9, { r, reads });
  const expr = shapeOf('type Expr = Bin | Num; type Bin = { type: "bin"; l: Expr; r: Expr }; type Num = { type: "num"; v: number };', "Expr") as Shape;
  const er = res({ type: "bin", l: { type: "num", v: 1 }, r: { type: "bin", l: { type: "num", v: "x" }, r: { type: "num", v: 2 } } }, expr);
  ok("an Expr tree with a wrong leaf: the place of the leaf", er === 'TypeError: p.r.l.v: expected number, found string "x"', er);
  const bt = shapeOf("type T = { v: number; left: T | null; right: T | null };", "T") as Shape;
  const br = res({ v: 1, left: null, right: { v: 2, left: { v: "x", left: null, right: null }, right: null } }, bt);
  ok("a binary tree with a wrong v: the place of v", br === 'TypeError: p.right.left.v: expected number, found string "x"', br);
  ok("a ref the shape does not define is a TypeError", res({}, { k: "ref", n: "Nope" }) === "TypeError: p: the shape has no definition of Nope");
  ok("a write through State<Tree> is checked as a crossing", (() => { try { checkShape({ v: 1, kids: [{ v: 2, kids: [] }] }, tree, "s"); return true; } catch { return false; } })());
}

// A function from another language: the checker's verdicts, and the wrapper the cell is given, on a module compiled by
// the toolchain and run in a real Observable Runtime. Values are awaited with module.value; no timers
{
  const { Runtime } = await import("@observablehq/runtime");
  const T = await import("./toolchain/ss-toolchain.ts");
  const ss = await import("./stdlib/runtime.ts");
  const { input } = await import(new URL("../../../vendor/observable-stdlib/src/generators/input.js", import.meta.url).pathname as any);
  // shell: names of outside that the checker is given as shell cells instead
  const load = (src: string, outside: Record<string, [string[], (...a: any[]) => unknown]>, shell: string[] = [], module: string | null = null) => {
    const checked = checkSources({ cells: src, tsx: false, shell: shell.map((n) => `export const ${n} = 0;`).join("\n") || null, outside: Object.keys(outside).filter((n) => !n.startsWith("viewof ") && !shell.includes(n)).map((n) => ({ name: n, view: !!outside[`viewof ${n}`] })) });
    const m = new Runtime().module();
    m.define("Generators", [], () => ({ input }));
    for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n], [], () => (ss as any)[n]);
    for (const [n, [ins, f]] of Object.entries(outside)) m.define(n, ins, f);
    const ctx = { ...T.contextFromCheck(checked), module };
    for (const text of T.splitCells(src, false)) for (const d of T.compileCell(text, false, ctx)) m.variable(true).define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    const verdicts = checked.cells.map((c) => `${c.name}: ${c.status}${c.errors.map((e) => ` [${e.rule}] ${e.msg}`).join("")}`);
    const value = async (n: string): Promise<{ ok: true; v: any } | { ok: false; e: any }> => { try { return { ok: true, v: await m.value(n) }; } catch (e) { return { ok: false, e }; } };
    return { m, verdicts, value, seen: async (n: string) => { const r = await value(n); return r.ok ? `value ${JSON.stringify(r.v)}` : `${r.e?.constructor?.name}: ${r.e?.message}`; } };
  };
  const R = "type R = { n: number; tag: string };\n";
  const foreign = { foreign: true };
  const leaked = (r: { ok: boolean; e?: unknown }) => !r.ok && r.e === foreign;
  {
    let k = 0;
    const L = load(R + 'export const a = (f: (s: string) => R) => f("x");\nexport const both = (f: (s: string) => R) => [f("x").n, f("x").n];', { f: [[], () => (s: string) => ({ n: ++k, tag: s })] });
    ok("fn: a function that gives a different value each call: each call's result is its own copy", L.verdicts.join() === "a: ok,both: ok" && (await L.seen("both")) === "value [1,2]" && (await L.seen("a")) === 'value {"n":3,"tag":"x"}', [L.verdicts, await L.seen("both")]);
  }
  {
    let seen: any;
    const L = load('type Box = { xs: number[] };\nexport const box = (): Box => ({ xs: [1, 2] });\nexport const r = (f: (b: Box) => number, box: Box) => { let m = "none"; try { f(box); } catch (e) { m = typeof e === "object" && e !== null && "message" in e ? String(e.message) : "?"; } return m; };\nexport const after = (box: Box, r: string) => box.xs.length;', { f: [[], () => (b: any) => { seen = b; b.xs.push(9); return 1; }] });
    const r = await L.seen("r"), after = await L.seen("after");
    ok("fn: a function that mutates its argument: the argument is a frozen copy, the cell's value unchanged", r === 'value "f(...) threw: Attempted to assign to readonly property."' && after === "value 2" && Object.isFrozen(seen) && Object.isFrozen(seen.xs) && seen !== (await L.value("box") as any).v, [r, after]);
    let kept: any;
    const K = load("type Q = { q: number[] };\nexport const arg = (): Q => ({ q: [1] });\nexport const first = (f: (x: Q) => number, arg: Q) => f(arg);", { f: [[], () => (x: any) => { kept = x; return x.q.length; }] });
    await K.value("first");
    let m = "no error"; try { kept.q.push(2); } catch (e) { m = (e as Error).constructor.name; }
    ok("fn: a function that keeps its argument cannot change it later", m === "TypeError" && kept !== (await K.value("arg") as any).v, m);
  }
  {
    const throwers: [string, () => never, string][] = [
      ["an Error", () => { throw new Error("boom"); }, "f(...) threw: boom"],
      ["a string", () => { throw "plain"; }, 'f(...) threw: string "plain"'],
      ["a function", () => { throw () => 1; }, "f(...) threw: a function"],
      ["a Proxy whose getter throws", () => { throw new Proxy(new Error("x"), { get: () => { throw foreign; } }); }, "f(...) threw: a value that could not be read"],
      ["a live object", () => { throw foreign; }, "f(...) threw: an object"],
    ];
    for (const [what, t, want] of throwers) {
      const L = load('export const r = (f: (s: string) => number) => { try { return String(f("x")); } catch (e) { return typeof e === "object" && e !== null && "message" in e ? String(e.message) : typeof e; } };\nexport const raw = (f: (s: string) => number) => f("x");', { f: [[], () => () => t()] });
      const raw = await L.value("raw");
      ok(`fn: a throw of ${what} reaches the cell as a fresh TypeError`, (await L.seen("r")) === `value ${JSON.stringify(want)}` && !raw.ok && raw.e instanceof TypeError && raw.e.message === want, await L.seen("raw"));
    }
  }
  {
    const cyc: any = { n: 1, tag: "c" }; cyc.self = cyc;
    const results: [string, unknown, string][] = [
      ["a function", () => 1, "TypeError: f(...): expected an object { n: number, tag: string }, found a function"],
      ["a Promise, declared sync", Promise.resolve({ n: 1, tag: "p" }), "TypeError: f(...): expected an object { n: number, tag: string }, found a promise"],
      ["a class instance", new (class P { n = 1; tag = "k"; })(), "TypeError: f(...): expected an object { n: number, tag: string }, found a P object"],
      ["a wrong shape", { n: "1", tag: "t" }, 'TypeError: f(...).n: expected number, found string "1"'],
      ["extra keys", { n: 1, tag: "t", extra: [1] }, 'value {"n":1,"tag":"t"}'],
      ["a cycle under an undeclared key", cyc, 'value {"n":1,"tag":"c"}'],
    ];
    for (const [what, v, want] of results) {
      const L = load(R + 'export const r = (f: (s: string) => R) => f("x");', { f: [[], () => () => v] });
      const got = await L.seen("r");
      ok(`fn: a result that is ${what}: ${want}`, got === want, got);
    }
    const c2: any = { n: 1, kids: [] }; c2.kids.push(c2);
    const L = load('type T = { n: number; kids: T[] };\nexport const r = (f: (s: string) => T) => f("x").kids.length;', { f: [[], () => () => c2] });
    ok("fn: a result with a cycle of a recursive type is refused", (await L.seen("r")) === "TypeError: f(...).kids[0]: a cycle", await L.seen("r"));
    const N = load('export const r = (f: (s: string) => number) => f("a");', { f: [[], () => 3] });
    ok("fn: a value that is not a function is refused", (await N.seen("r")) === "TypeError: f: expected a function, found number 3", await N.seen("r"));
  }
  {
    const src = R + 'export const r = async (f: (s: string) => Promise<R>) => { const x = await f("x"); return x.n; };';
    const cases: [string, () => unknown, string][] = [
      ["resolves", async () => ({ n: 7, tag: "a" }), "value 7"],
      ["resolves to a wrong shape", async () => ({ n: "7" }), 'TypeError: f(...).n: expected number, found string "7"'],
      ["rejects", async () => { throw new Error("later"); }, "TypeError: f(...) threw: later"],
      ["returns R with no promise", () => ({ n: 8, tag: "s" }), "value 8"],
      ["returns a thenable whose then throws", () => ({ then() { throw foreign; } }), "TypeError: f(...) threw: an object"],
      ["returns a real promise whose own then throws", () => { const q = Promise.resolve({ n: 1, tag: "t" }); Object.defineProperty(q, "then", { value: () => { throw foreign; } }); return q; }, "TypeError: f(...) threw: an object"],
      ["returns a real promise whose constructor getter throws", () => { const q = Promise.resolve({ n: 1, tag: "t" }); Object.defineProperty(q, "constructor", { get() { throw foreign; } }); return q; }, "TypeError: f(...) threw: an object"],
    ];
    for (const [what, f, want] of cases) {
      const L = load(src, { f: [[], () => f] });
      const got = await L.seen("r");
      ok(`fn: async, ${what}: ${want}`, L.verdicts.join() === "r: ok" && got === want, [L.verdicts, got]);
    }
  }
  {
    // a result whose read throws: the check is under a try, so the cell gets the boundary's TypeError, never the object
    const src = 'type R = { n: number };\nexport const r = (f: (s: string) => R) => f("x").n;\nexport const a = async (g: (s: string) => Promise<R>) => (await g("x")).n;';
    const reads: [string, () => unknown, string, string][] = [
      ["a getter that throws", () => ({ get n() { throw foreign; } }), "f(...): reading the result threw: an object", "g(...): reading the result threw: an object"],
      ["a getter that throws a TypeError naming the function", () => ({ get n() { throw new TypeError("f(...) forged"); } }), "f(...): reading the result threw: f(...) forged", "g(...): reading the result threw: f(...) forged"],
      ["a proxy whose get trap throws", () => new Proxy({}, { get() { throw foreign; } }), "f(...): reading the result threw: an object", "g(...) threw: an object"],
      ["a proxy whose getPrototypeOf trap throws", () => new Proxy({ n: 1 }, { getPrototypeOf() { throw foreign; } }), "f(...): reading the result threw: an object", "g(...): reading the result threw: an object"],
    ];
    for (const [what, mk, wantS, wantA] of reads) {
      const L = load(src, { f: [[], () => () => mk()], g: [[], () => async () => mk()] });
      const r = await L.value("r"), a = await L.value("a");
      ok(`fn: a result whose read throws, ${what}: a fresh TypeError, sync and async`, !leaked(r) && !leaked(a) && !r.ok && !a.ok && r.e instanceof TypeError && a.e instanceof TypeError && r.e.message === wantS && a.e.message === wantA, [String((r as any).e), String((a as any).e)]);
    }
  }
  {
    let wrapper: any = null, depth = 0;
    const L = load("export const dbl = () => (n: number): number => n * 2;\nexport const exposed = (f: (n: number) => number) => f;\nexport const r = (f: (n: number) => number) => f(3);", {
      dbl2: [["dbl"], (dbl: any) => dbl],
      f: [["dbl2"], (dbl: any) => (n: number) => { depth++; const x = depth < 3 && wrapper ? wrapper(n) : dbl(n); depth--; return x; }],
    });
    const e = await L.value("exposed");
    wrapper = e.ok ? e.v : null;
    ok("fn: re-entrancy: the cell gets a frozen wrapper, not the raw function; it calls a checked function and itself", e.ok && e.v !== (await L.m.value("f")) && Object.isFrozen(wrapper) && (await L.seen("r")) === "value 6" && wrapper(5) === 10);
    let calls = 0, done: () => void = () => {};
    const stop = new Promise<void>((r) => (done = r));
    const A = load("export const count = () => state(0);\nexport const bump = (count: State<number>) => action(() => count.update((c) => c + 1));\nexport const use = (f: (s: string) => number, count: number) => f(\"a\") + count;", {
      f: [["bump"], (bump: any) => () => { calls++; if (calls < 20) bump(); else done(); return 0; }],
    });
    const u = await A.value("use");
    if (u.ok) await stop;
    // what the checker cannot see: an action called from inside the function. w1 (2026-11-24): a compiled cell's body runs
    // under the guard runCells puts around a cell, so the call is refused while use computes (it ran use again 19 times)
    ok("fn: re-entrancy: an action called from inside the function while the cell computes is refused (trusted, not checked)", A.verdicts.join() === "count: ok,bump: ok,use: ok" && calls === 1 && String(await A.seen("use")).includes("action called during a cell evaluation"), [A.verdicts, calls, await A.seen("use")]);
  }
  {
    const fixed = (s: string) => ({ n: s.length, tag: s });
    let fresh = false;
    const L = load(R + 'export const w = (f: (s: string) => R) => f;\nexport const kept = (w: (s: string) => R) => state(w("ab").n);', { tick: [[], () => 0], f: [["tick"], () => (fresh ? (s: string) => ({ n: 99, tag: s }) : fixed)] });
    const w1 = (await L.value("w") as any).v;
    L.m.redefine("tick", [], () => 1);
    const w2 = (await L.value("w") as any).v;
    fresh = true; L.m.redefine("tick", [], () => 2);
    const w3 = (await L.value("w") as any).v;
    ok("fn: the same raw function delivered again is the same wrapper; a new one is a new wrapper", w1 === w2 && w1 !== w3 && (await L.seen("kept")) === "value 99");
    const raw = (s: string) => ({ n: s.length, tag: s });
    const A = load(R + 'export const w = (f: (s: string) => R) => f("ab").n;', { f: [[], () => raw] });
    const B = load('type R = { n: string };\nexport const w = (f: (s: string) => R) => f("ab").n;', { f: [[], () => raw] });
    ok("fn: the same raw function to the same reader and parameter under another annotation: checked against the new one", (await A.seen("w")) === "value 2" && (await B.seen("w")) === "TypeError: f(...).n: expected string, found number 2", await B.seen("w"));    // two modules, a cell and parameter of the same names, each delivering its own function in turn
    const src = 'export const w = (f: () => number) => f;';
    const fa = () => 1, fb = () => 2;
    const M1 = load(src, { tick: [[], () => 0], f: [["tick"], () => fa] }, [], "@t/one"), M2 = load(src, { tick: [[], () => 0], f: [["tick"], () => fb] }, [], "@t/two");
    const a1 = (await M1.value("w") as any).v, b1 = (await M2.value("w") as any).v;
    M1.m.redefine("tick", [], () => 1);
    const a2 = (await M1.value("w") as any).v;
    M2.m.redefine("tick", [], () => 1);
    const b2 = (await M2.value("w") as any).v;
    ok("fn: two modules with a reader and parameter of the same names keep their own wrappers across alternating deliveries", a1 === a2 && b1 === b2 && a1 !== b1, [a1 === a2, b1 === b2]);
  }
  {
    const L = load('type T = { v: number; kids: T[] };\ntype F = (s: string) => number;\ntype G<X> = (x: X) => X;\nexport const r = (f: (t: number, x?: T) => number, h: F, g: G<number>) => [f(1), f(2, { v: 3, kids: [{ v: 4, kids: [] }] }), h("abc"), g(4)];', { f: [[], () => (t: number, x?: any) => (x ? t + x.v + x.kids[0].v : t)], h: [[], () => (s: string) => s.length], g: [[], () => (x: number) => x * 10] });
    ok("fn: an optional parameter of a recursive alias, an alias of a function type and a generic one", L.verdicts.join() === "r: ok" && (await L.seen("r")) === "value [1,9,3,40]", [L.verdicts, await L.seen("r")]);
  }
  {
    // a shell cell typed as a function gets the same wrapper: each result checked and copied
    const raw = (s: string) => ({ n: s.length, tag: s, extra: 1 });
    const L = load(R + 'export const a = (sh: (s: string) => R) => sh("abc");\nexport const b = (bad: (s: string) => R) => bad("x").n;\nexport const c = (sh: (s: string) => R) => sh;', { sh: [[], () => raw], bad: [[], () => () => ({ n: "1", tag: "t" })] }, ["sh", "bad"]);
    const w = (await L.value("c") as any).v, a = (await L.value("a") as any).v;
    ok("fn: a shell cell typed as a function is called through the wrapper: a frozen copy, a wrong shape is a TypeError", L.verdicts.join() === "a: ok,b: ok,c: ok" && (await L.seen("a")) === 'value {"n":3,"tag":"abc"}' && Object.isFrozen(a) && (await L.seen("b")) === 'TypeError: bad(...).n: expected number, found string "1"' && w !== raw && Object.isFrozen(w), [L.verdicts, await L.seen("a"), await L.seen("b")]);
  }
  // the checker: what is refused, with which message, and that an action may not use the function
  const verdictsOf = (src: string, outside: { name: string; view?: boolean }[]) => checkSources({ cells: src, tsx: false, outside }).cells.map((c) => `${c.name}: ${c.status}${c.errors.map((e) => ` [${e.rule}] ${e.msg}`).join("")}`);
  const refused: [string, string, { name: string; view?: boolean }[], string][] = [
    ["inside an object", "const c = (g: { run: (s: string) => number }) => 1;", [{ name: "g" }], "c: rejected [boundary-type] g: { run: (s: string) => number } cannot cross from another language: it is or holds run: a function"],
    ["inside an array", "const c = (g: (() => number)[]) => 1;", [{ name: "g" }], "c: rejected [boundary-type] g: (() => number)[] cannot cross from another language: it is or holds a function"],
    ["inside a union", "const c = (g: (() => number) | null) => 1;", [{ name: "g" }], "c: rejected [boundary-type] g: () => number | null cannot cross from another language: it is or holds a function"],
    ["under State", "const c = (h: State<(s: string) => number>) => 1;", [{ name: "h", view: true }], "c: rejected [boundary-type] h: (s: string) => number cannot cross from another language: it is or holds a function"],
    ["with type parameters", "const c = (k: <T>(x: T) => T) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: <T>(x: T) => T cannot cross from another language: it is or holds a function with type parameters or a rest parameter"],
    ["with a rest parameter", "const c = (k: (...xs: string[]) => number) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: (...r: string[]) => number cannot cross from another language: it is or holds a function with type parameters or a rest parameter"],
    ["taking a function", "const c = (k: (cb: (s: string) => number) => number) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: (cb: (s: string) => number) => number cannot cross from another language: it is or holds a function whose parameter cb is or holds a function"],
    ["giving a function", "const c = (k: (s: string) => () => number) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: (s: string) => () => number cannot cross from another language: it is or holds a function whose result is or holds a function"],
    ["giving a Promise inside an object", "const c = (k: () => { p: Promise<number> }) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: () => { p: Promise<number> } cannot cross from another language: it is or holds a function whose result is or holds p: a promise"],
    ["taking a Map", "const c = (k: (m: Map<string, number>) => number) => 1;", [{ name: "k" }], "c: rejected [boundary-type] k: (m: Map<string, number>) => number cannot cross from another language: it is or holds a function whose parameter m is or holds Map<string, number>, which the boundary does not check"],
  ];
  for (const [what, src, outside, want] of refused) { const got = verdictsOf(src, outside).join(" | "); ok(`fn: refused at check time, a function ${what}`, got === want, got); }
  const acts = verdictsOf('type R = { n: number };\nconst parse = (f: (s: string) => R) => (s: string): R => f(s);\nconst box = () => state(0);\nconst act1 = (f: (s: string) => R, box: State<number>) => action(() => box.set(f("x").n));\nconst act2 = (parse: (s: string) => R, box: State<number>) => action(() => box.set(parse("x").n));', [{ name: "f" }]);
  ok("fn: an action may not use the function, nor a checked cell that reads it ([action-capture])", acts.slice(0, 2).join() === "parse: ok,box: ok" && acts[2]!.startsWith("act1: rejected [action-capture] f depends on state (the value of f, a cell in another language)") && acts[3]!.startsWith("act2: rejected [action-capture] parse depends on state (parse reads f)"), acts);
  // a state cell or an events cell may not keep the function, or anything that may hold it, for an action (S11.9)
  const kept = verdictsOf("const box = (g: () => number) => state(g);\nconst n = () => state(0);\nconst run = (box: State<() => number>, n: State<number>) => action(() => n.set(read(box)()));", [{ name: "g" }]);
  ok("fn: a state cell made from the function is refused ([action-capture]); the action that reads it is not", kept.join(" | ") === "box: rejected [action-capture] a state cell holds () => number, which may be or hold a function from another language (box takes g, a function from another language); an action that reads the state cell could call it | n: ok | run: ok", kept);
  const routes: [string, string, string][] = [
    ["in a record", "const box = (g: () => number) => state({ f: g });", "box: rejected [action-capture]"],
    ["a closure over it", "const box = (g: () => number) => state(() => g());", "box: rejected [action-capture]"],
    ["through a checked cell that returns it", "const hk = (g: () => number) => ({ run: g });\nconst box = (hk: { run: () => number }) => state([hk]);", "hk: ok,box: rejected [action-capture]"],
    ["a checked function's result, the function made in another cell", "const mk = (g: () => number) => (k: number) => () => g() + k;\nconst box = (mk: (k: number) => () => number) => state(mk(1));", "mk: ok,box: rejected [action-capture]"],
    ["as object", "const box = (g: () => number): StateCell<object> => state(g);", "box: rejected [action-capture]"],
    ["yielded by an events cell", "function* ev(g: () => number) { yield { f: g }; }", "ev: rejected [action-capture]"],
    ["its result in state (data)", "const d = (g: () => number) => g();\nconst box = (d: number) => state(d);\nconst box2 = (g: () => number) => state(g());", "d: ok,box: ok,box2: ok"],
    ["its result yielded (data)", "function* ev(g: () => number) { yield g(); }", "ev: ok"],
    ["three cells away", "const hk = (g: () => number) => () => g();\nconst h2 = (hk: () => number) => () => hk();\nconst h3 = (h2: () => number) => () => h2();\nconst box = (h3: () => number) => state(h3);", "hk: ok,h2: ok,h3: ok,box: rejected [action-capture]"],
    ["as {}, which a function is assignable to", "const box = (g: () => number) => state<{}>(g);", "box: rejected [forgets]"],
    ["as a record of optional properties", "const box = (g: () => number): StateCell<{ a?: number }> => state(g);", "box: rejected [forgets]"],
    ["as an empty interface", "interface I {}\nconst box = (g: () => number) => state<I>(g);", "box: rejected [forgets]"],
    // w1: the forgetting rule refuses a function given a record type, before the capture rule
    ["yielded as {}", "function* ev(g: () => number): Generator<{}> { yield g; }", "ev: rejected [forgets]"],
    ["its result in a record with a required property (data)", "const box = (g: () => number) => state<{ n: number }>({ n: g() });", "box: ok"],
  ];
  for (const [what, src, want] of routes) { const got = verdictsOf(src, [{ name: "g" }]).map((v) => v.replace(/ \[(action-capture|forgets)\] .*/, " [$1]")).join(); ok(`fn: state or events, ${what}: ${want}`, got === want, got); }
  // a shell cell typed as a function crosses as one from another language; any other annotation is as before (S9.1)
  const shellOf = (src: string) => checkSources({ cells: src, tsx: false, shell: "export const sh = (s) => s.length;" }).cells.map((c) => `${c.name}: ${c.status}${c.errors.map((e) => ` [${e.rule}] ${e.msg}`).join("")}`).join(" | ");
  const shells: [string, string, string][] = [
    ["a function", "const f = (sh: (s: string) => number) => sh(\"a\");", "f: ok"],
    ["an alias of a function type", "type F = (s: string) => number;\nconst f = (sh: F) => sh(\"a\");", "f: ok"],
    ["a function that cannot cross", "const f = (sh: <T>(x: T) => T) => 1;", "f: rejected [boundary-type] sh: <T>(x: T) => T cannot cross from another language: it is or holds a function with type parameters or a rest parameter"],
    ["unknown, as before", "const f = (sh: unknown) => 1;", "f: ok"],
    ["number, as before", "const f = (sh: number) => sh;", "f: rejected [inject-type] sh: unknown is not assignable to number"],
    ["a function in a record, as before", "const f = (sh: { run: () => number }) => 1;", "f: rejected [inject-type] sh: unknown is not assignable to { run: () => number }"],
    ["in a state cell", "const box = (sh: () => number) => state(sh);", "box: rejected [action-capture] a state cell holds () => number, which may be or hold a function from another language (box takes sh, a function from another language); an action that reads the state cell could call it"],
    ["captured by an action", "const n = () => state(0);\nconst set = (n: State<number>, sh: () => number) => action(() => n.set(sh()));", "n: ok | set: rejected [action-capture] sh depends on state (a shell cell's value), so an action using it would act on the value from the cell's last run; read the state cell inside the action with read(...), or pass the value to the action when it is called"],
  ];
  for (const [what, src, want] of shells) { const got = shellOf(src); ok(`fn: a shell cell typed as ${what}: ${want.slice(0, 60)}`, got === want, got); }
  ok("fn: accepted: an optional parameter, an async result, no parameters", verdictsOf("const c = (k: (s: string, n?: number) => number, a: (s: string) => Promise<{ n: number }>, z: () => void) => 1;", ["k", "a", "z"].map((name) => ({ name }))).join() === "c: ok");
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
