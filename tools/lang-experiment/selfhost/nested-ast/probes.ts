// Adversarial probes of recursive crossing (point 1). Each probe gets its shape from a checker copy's checkSources (the
// parameter's boundary shape, as the compiled cell would get it) and runs that copy's cross(). orig has no recursive
// crossing, so each orig row crosses the same value as `x: unknown` (today's behaviour under S11.5) where the
// recursive type is refused. No timers: a probe that would not end is run at sizes that do, and the growth is shown.
// Run: bun probes.ts   (writes nothing; out/probes.txt is its output)
const D = import.meta.dir + "/";
type Copy = { name: string; checkSources: any; cross: any; LIMITS?: any };
const load = async (name: string): Promise<Copy> => ({ name, checkSources: (await import(`${D}${name}/lite/core.ts`)).checkSources, ...(await import(`${D}${name}/lite/boundary.ts`)) });
const orig = await load("orig"), rec = await load(process.argv[2] ?? "rec");
console.log(`copy under test ("rec" below): ${rec.name}`);
// the shape the checker gives parameter x of cell f, or its boundary-type message
const shapeIn = (c: Copy, types: string, ann: string) => {
  const r = c.checkSources({ cells: `${types}\nexport const f = (x: ${ann}): number => 1;`, tsx: false, outside: [{ name: "x" }] });
  const s = r.facts?.get("f")?.params[0]?.boundary?.shape;
  if (s) return { shape: s };
  const cell = r.cells.find((x: any) => x.name === "f");
  return { error: [...r.module, ...(cell?.errors ?? []), ...(cell?.unsupported ?? [])].map((e: any) => `[${e.rule}] ${e.msg}`).join("; ") };
};
const attempt = (c: Copy, v: unknown, shape: unknown, path = "f.x") => {
  const t0 = performance.now();
  try { const out = c.cross(v, shape, path); return { ok: true, out, ms: performance.now() - t0 }; }
  catch (e) { return { ok: false, msg: `${(e as Error).constructor.name}: ${(e as Error).message}`, ms: performance.now() - t0 }; }
};
const show = (r: any) => (r.ok ? `crosses (${r.ms.toFixed(1)} ms)` : `throws ${r.msg.slice(0, 160)} (${r.ms.toFixed(1)} ms)`);
const TREE = `type Tree = { v: number; kids: Tree[] };`;
const LIST = `type List = { v: number; next: List | null };`;
const sOrigU = shapeIn(orig, "", "unknown").shape;
console.log(`orig, Tree: ${shapeIn(orig, TREE, "Tree").error}`);
const sTree = shapeIn(rec, TREE, "Tree").shape, sList = shapeIn(rec, LIST, "List").shape;
console.log(`rec, Tree: shape ${JSON.stringify(sTree)}`);
console.log(`rec, List: shape ${JSON.stringify(sList)}`);

console.log(`\n# P1 a cyclic value`);
const cyc: any = { v: 1, kids: [] }; cyc.kids.push({ v: 2, kids: [cyc] });
console.log(`  orig, as unknown:  ${show(attempt(orig, cyc, sOrigU))}`);
console.log(`  rec, as Tree:      ${show(attempt(rec, cyc, sTree))}`);
const cycL: any = { v: 1, next: { v: 2, next: null } }; cycL.next.next = cycL;
console.log(`  rec, as List (the cycle sits under a union List | null): ${show(attempt(rec, cycL, sList))}`);
const sOrigListish = shapeIn(orig, `type L2 = { v: number; next: { v: number; next: unknown } | null };`, "L2").shape;
console.log(`  orig, cycle under a union ({ v; next: unknown } | null): ${show(attempt(orig, cycL, sOrigListish))}`);

console.log(`\n# P2 a value two paths share (a diamond chain: each level's kids are [c, c], one object)`);
const diamond = (n: number) => { let c: any = { v: 0, kids: [] }; for (let i = 1; i <= n; i++) c = { v: i, kids: [c, c] }; return c; };
const leaves = (x: any): number => (x.kids.length ? x.kids.reduce((s: number, k: any) => s + leaves(k), 0) : 1);
for (const n of [12, 16, 18, 20]) {
  const d = diamond(n);
  const ro = attempt(orig, d, sOrigU), rr = attempt(rec, d, sTree);
  rec.LIMITS.memo = false; const rn = attempt(rec, d, sTree); rec.LIMITS.memo = true;
  console.log(`  depth ${n} (${n + 1} objects, ${2 ** n} paths): orig unknown ${ro.ms.toFixed(1)} ms; rec Tree with memo ${rr.ms.toFixed(2)} ms; rec without memo ${rn.ms.toFixed(1)} ms`);
}
{
  const d = diamond(35), r = attempt(rec, d, sTree) as any;
  console.log(`  depth 35 (2^35 paths), rec with memo: ${show(r)}; copy shares: ${r.ok && r.out.kids[0] === r.out.kids[1]}; frozen: ${r.ok && Object.isFrozen(r.out.kids[0])}`);
}
// the shape decides the copy: one object seen by two paths with two different shapes is copied for each
{
  const shared = { v: 1, kids: [], extra: "x" };
  const s = shapeIn(rec, `type A = { v: number }; type B = { v: number; extra: string }; type P = { a: A; b: B };`, "P").shape;
  const r = attempt(rec, { a: shared, b: shared }, s) as any;
  console.log(`  one object under two shapes: a ${JSON.stringify(r.out?.a)}, b ${JSON.stringify(r.out?.b)}`);
}

console.log(`\n# P3 depth (a List of n nodes)`);
const list = (n: number) => { let c: any = null; for (let i = 0; i < n; i++) c = { v: i, next: c }; return c; };
for (const n of [1000, 2000, 2001, 5000]) console.log(`  n=${n}: rec (limit ${rec.LIMITS.depth}) ${show(attempt(rec, list(n), sList))}`);
const was = rec.LIMITS.depth; rec.LIMITS.depth = 1e9;
let lo = 1000, hi = 400000, last = "";
while (lo < hi) { const m = (lo + hi + 1) >> 1; const r = attempt(rec, list(m), sList) as any; if (r.ok) lo = m; else { hi = m - 1; last = r.msg; } }
console.log(`  rec with no limit: the deepest List that crosses is ${lo} nodes; one deeper throws ${last.slice(0, 80)}`);
rec.LIMITS.depth = was;
lo = 1000; hi = 400000; last = "";
while (lo < hi) { const m = (lo + hi + 1) >> 1; const r = attempt(orig, list(m), sOrigU) as any; if (r.ok) lo = m; else { hi = m - 1; last = r.msg; } }
console.log(`  orig as unknown: the deepest List that crosses is ${lo} nodes; one deeper throws ${last.slice(0, 80)}`);

console.log(`\n# P4 recursion with nothing in between`);
for (const [label, types, ann] of [["type A = A | number", "type A = A | number;", "A"], ["type A = B | number; type B = A | string", "type A = B | number; type B = A | string;", "A"], ["type A = { a: A } | number (guarded)", "type A = { a: A } | number;", "A"]] as const) {
  const r = shapeIn(rec, types, ann);
  const o = shapeIn(orig, types, ann);
  const run = r.shape ? show(attempt(rec, 1, r.shape)) : "";
  console.log(`  ${label}: orig ${o.error ?? "shape " + JSON.stringify(o.shape)} | rec ${r.error ?? "shape " + JSON.stringify(r.shape) + "; 1 " + run}`);
}

console.log(`\n# P5 a getter whose value changes between reads, and a Proxy`);
{
  let reads = 0;
  const g = { v: 1, get kids() { reads++; return reads === 1 ? [] : "not an array"; } };
  const r = attempt(rec, g, sTree) as any;
  console.log(`  getter kids: ${show(r)}; kids read ${reads} time(s); copy kids ${JSON.stringify(r.out?.kids)}; copy has a getter: ${r.ok && !!Object.getOwnPropertyDescriptor(r.out, "kids")?.get}`);
  const trap: string[] = [];
  const p = new Proxy({ v: 1, kids: [] }, { get(t, k, rcv) { trap.push(String(k)); return Reflect.get(t, k, rcv); } });
  console.log(`  Proxy: ${show(attempt(rec, p, sTree))}; traps run: ${trap.join(",")}`);
  const thrower = { v: 1, get kids(): never { throw new Error("from the getter"); } };
  console.log(`  getter that throws: ${show(attempt(rec, thrower, sTree))}`);
}

console.log(`\n# P6 duplicate nids`);
{
  const { nestParse } = await import(`${D}adapter.ts`);
  const shapeN = shapeIn(rec, await Bun.file(`${D}ast-n.ss.ts`).text(), "NParse").shape;
  const p: any = nestParse("const a = 1, b = 2;", false);
  const decl = p.ast.program.body[0].declarations;
  decl[1].nid = decl[0].nid;
  const r = attempt(rec, p, shapeN) as any;
  console.log(`  two declarators with nid ${decl[0].nid}: ${show(r)}`);
}

console.log(`\n# P7 copy and freeze; trusted afterwards`);
{
  const src: any = { v: 1, kids: [{ v: 2, kids: [] }] };
  const r = attempt(rec, src, sTree) as any;
  src.kids[0].v = 99; src.kids.push({ v: 3, kids: [] });
  console.log(`  after crossing, the other language changes its value: copy ${JSON.stringify(r.out)}; copy frozen at depth 0/1/2: ${Object.isFrozen(r.out)}/${Object.isFrozen(r.out.kids)}/${Object.isFrozen(r.out.kids[0])}; source frozen: ${Object.isFrozen(src)}`);
  const extra = attempt(rec, { v: 1, kids: [], secret: "s" }, sTree) as any;
  console.log(`  a property the type does not declare: copy ${JSON.stringify(extra.out)}`);
}

console.log(`\n# P8 the message for a node of a type the union lacks, deep in the tree`);
{
  const { nestParse } = await import(`${D}adapter.ts`);
  const shapeN = shapeIn(rec, await Bun.file(`${D}ast-n.ss.ts`).text(), "NParse").shape;
  const p: any = nestParse("const f = (x) => x.y;", false);
  p.ast.program.body[0].declarations[0].init.body.property.type = "Bogus";
  console.log(`  rec: ${show(attempt(rec, p, shapeN))}`);
}
