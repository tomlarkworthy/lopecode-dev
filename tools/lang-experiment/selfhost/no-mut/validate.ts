// bun selfhost/no-mut/validate.ts: the counter on hand-written cells with known answers.
// Per cell: writes as group(+f when captured), sorted; passes as callee:argGroup; explicit Mut positions; status.
// A cell absent from want must report nothing in each field. Outside-cell explicit Mut and aliases are checked per case.
import { analyzeSource, type CellRep } from "./analyze.ts";

type Want = { w?: string[]; p?: string[]; x?: string[]; ok?: boolean; aliasIs?: string[] };
type Case = { name: string; src: string; want: Record<string, Want>; outside?: string[]; aliasIs?: string[] };
const sumW = (c: CellRep) => c.writes.map((w) => `${w.group}${w.captured ? "+f" : ""}`).sort();
const sumP = (c: CellRep) => c.passes.map((p) => `${p.callee}:${p.argGroup}`).sort();
const sumX = (c: CellRep) => c.explicit.map((x) => x.pos).sort();

const cases: Case[] = [
  { name: "a: literal, own name", src: `const c = () => {\n  const xs = [1];\n  xs.push(2);\n  xs[0] = 3;\n  return xs.length;\n};`, want: { c: { w: ["a", "a"] } } },
  { name: "a: new with a primitive argument; delete on a literal record", src: `const c = () => {\n  const t = new Float32Array(4);\n  t[0] = 1;\n  return t[0];\n};`, want: { c: { w: ["a"] } } },
  { name: "negative a: reads only, let reassignment is not a write", src: `const c = () => {\n  const xs = [1, 2];\n  let n = 0;\n  n = n + xs.length;\n  return n;\n};`, want: {} },
  { name: "b: second name bound directly", src: `const c = () => {\n  const xs = [1];\n  const ys = xs;\n  ys.push(2);\n  return xs.length;\n};`, want: { c: { w: ["b"] } } },
  { name: "b2: alias of an alias", src: `const c = () => {\n  const a = [1];\n  const f = a;\n  const b = f;\n  b[0] = 2;\n  return b.length;\n};`, want: { c: { w: ["b2"] } } },
  { name: "c: helper takes a Mut parameter; the pass is counted apart", src: `const c = () => {\n  const add = (m: Mut<number[]>, v: number): void => {\n    m.push(v);\n  };\n  const xs = [0];\n  add(xs, 1);\n  return xs.length;\n};`, want: { c: { w: ["c"], p: ["add:a"], x: ["param-nested"] } } },
  { name: "negative c: helper takes a plain parameter and reads it", src: `const c = () => {\n  const len = (m: readonly number[]): number => m.length;\n  const xs = [0];\n  return len(xs);\n};`, want: {} },
  { name: "d: a user function returning Mut, bound and direct", src: `const c = () => {\n  const mk = (): Mut<number[]> => [1];\n  const xs = mk();\n  xs.push(2);\n  mk().push(3);\n  return xs.length;\n};`, want: { c: { w: ["d", "d"], x: ["return"] } } },
  { name: "e: nested Mut field, for-of element, Map element via get", src: `const c = () => {\n  const m: Mut<{ xs: Mut<number[]> }> = { xs: [1] };\n  m.xs.push(2);\n  const rows: Mut<Mut<number[]>[]> = [[1]];\n  for (const row of rows) row.push(1);\n  const g = new Map<string, Mut<number[]>>();\n  g.set("a", [1]);\n  const v = g.get("a");\n  if (v !== undefined) v.push(2);\n  return m.xs.length + rows.length + g.size;\n};`, want: { c: { w: ["a", "e", "e", "e"], x: ["field", "local", "local", "type-arg", "type-arg"] } } },
  { name: "f: captured write from a forEach callback and from a local helper", src: `const c = () => {\n  const out = [0];\n  [1, 2].forEach((v) => {\n    out.push(v);\n  });\n  const add = (v: number): void => {\n    out.push(v);\n  };\n  add(3);\n  return out.length;\n};`, want: { c: { w: ["a+f", "a+f"] } } },
  { name: "g: fresh intrinsic result, spread copy, copy constructor", src: `const xs = () => [1, 2];\nconst c = (xs) => {\n  const ys = xs.slice();\n  ys.push(1);\n  const zs = [...xs];\n  zs.push(2);\n  const m = new Map<string, number>();\n  m.set("k", 1);\n  const m2 = new Map(m);\n  m2.set("j", 2);\n  return ys.length + zs.length + m2.size;\n};`, want: { xs: {}, c: { w: ["a", "g-copy", "g-copy", "g-fresh"] } } },
  { name: "explicit Mut by position; alias body, alias field, outside cells", src: `type B = Mut<number[]>;\ntype Box = { readonly v: Mut<number[]> };\nconst c = () => {\n  const f = (b: B): number => b.length;\n  const g = (x: Box): number => x.v.length;\n  const h = (p: (m: Mut<number[]>) => void): number => 1;\n  return f([1]) + g({ v: [1] }) + h(() => {});\n};`, want: { c: { x: ["in-function-type"], p: ["f:a"], aliasIs: ["B"] } }, outside: ["alias-body", "field"], aliasIs: ["B"] },
  { name: "c via alias: a parameter typed by an alias of Mut (no Mut in the cell's text)", src: `type Buf = Mut<number[]>;\nconst c = () => {\n  const fill = (b: Buf): void => {\n    b[0] = 1;\n  };\n  const xs = [0];\n  fill(xs);\n  return xs[0];\n};`, want: { c: { w: ["c"], p: ["fill:a"], aliasIs: ["Buf"] } }, outside: ["alias-body"], aliasIs: ["Buf"] },
  { name: "c captured: a helper writes its encloser's Mut parameter", src: `const c = () => {\n  const outer = (m: Mut<number[]>): void => {\n    const inner = (): void => {\n      m.push(1);\n    };\n    inner();\n  };\n  const xs = [0];\n  outer(xs);\n  return xs.length;\n};`, want: { c: { w: ["c+f"], p: ["outer:a"], x: ["param-nested"] } } },
  { name: "a: delete on a literal record", src: `const c = () => {\n  const r = { a: 1, b: 2 };\n  delete r.a;\n  return r.b;\n};`, want: { c: { w: ["a"] } } },
  { name: "g-ret: a write through the receiver an intrinsic returns (sort(), set()); today's checker types the result plain and rejects", src: `const c = () => {\n  const xs = [3, 1];\n  xs.sort().push(0);\n  const m = new Map<string, number>();\n  m.set("a", 1).set("b", 2);\n  return xs.length + m.size;\n};`, want: { c: { w: ["a", "a", "g-ret", "g-ret"], ok: false } } },
  { name: "e: element by an intrinsic (Map.get) of a Map of Mut arrays, written directly (today rejected: an optional-chain call result is not Mut)", src: `const c = () => {\n  const g = new Map<string, Mut<number[]>>();\n  g.set("a", [1]);\n  g.get("a")?.push(2);\n  return g.size;\n};`, want: { c: { w: ["a", "e"], x: ["type-arg"], ok: false } } },
  { name: "cell parameter typed Mut: explicit param-cell (rejected, mut-cell)", src: `const a = () => null;\nconst b = (a: Mut<number[]> | null) => (a === null ? 0 : a.length);`, want: { a: {}, b: { x: ["param-cell"], ok: false } } },
];

let bad = 0;
for (const c of cases) {
  const r = analyzeSource({ cells: c.src, tsx: true, outside: [] } as any);
  const errs: string[] = [];
  for (const cell of r.cells) {
    const w = c.want[cell.name] ?? {};
    const okWant = w.ok ?? true;
    if ((cell.status === "ok") !== okWant) errs.push(`${cell.name} status ${cell.status} [${cell.rules.join(",")}]`);
    if (!cell.reached) errs.push(`${cell.name} not reached`);
    const eq = (a: string[], b: string[] | undefined, what: string) => { const bb = [...(b ?? [])].sort(); if (JSON.stringify(a) !== JSON.stringify(bb)) errs.push(`${cell.name} ${what}: got ${JSON.stringify(a)} want ${JSON.stringify(bb)}`); };
    eq(sumW(cell), w.w, "writes"); eq(sumP(cell), w.p, "passes"); eq(sumX(cell), w.x, "explicit"); eq([...cell.aliasIs].sort(), w.aliasIs, "aliasIs");
  }
  const o = r.outside.map((x) => x.pos).sort();
  if (JSON.stringify(o) !== JSON.stringify([...(c.outside ?? [])].sort())) errs.push(`outside: got ${JSON.stringify(o)}`);
  if (JSON.stringify([...r.aliasIs].sort()) !== JSON.stringify([...(c.aliasIs ?? [])].sort())) errs.push(`aliasIs: got ${JSON.stringify(r.aliasIs)}`);
  const st = r.cells.map((x) => `${x.name}:${x.status}${x.rules.length ? "[" + x.rules.join(",") + "]" : ""}`).join(" ");
  console.log(`${errs.length ? "FAIL" : "ok  "} ${c.name}  (checker: ${st})`);
  for (const e of errs) console.log("     " + e);
  if (errs.length) bad++;
}
console.log(`${cases.length - bad}/${cases.length} cases right`);
process.exit(bad ? 1 : 0);
