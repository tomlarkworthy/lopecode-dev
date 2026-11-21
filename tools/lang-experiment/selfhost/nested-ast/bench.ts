// Point 3: what a parse costs per node on the nested route, against bare acorn and the flat route. Corpus inputs that
// parse (corpus.ts); every figure is the median of 7 rounds over all of them after a warm round, run twice, second
// reported. Crossing is timed three ways: checkShape (check, copy and freeze, nothing kept), cross() on a first
// delivery (a new reader path), and cross() re-delivering an equal value (copy, then deepEqual against the last copy,
// which is returned).
// Run: bun bench.ts
import * as acorn from "./orig/lite/node_modules/acorn/dist/acorn.mjs";
import { tsPlugin } from "./orig/lite/node_modules/@sveltejs/acorn-typescript/index.js";
import { parse } from "./orig/lite/parse.ts";
import { nestParse } from "./adapter.ts";
import { flatParse } from "./flat-adapter.ts";
import { corpus } from "./corpus.ts";
const D = import.meta.dir + "/";
const TS = acorn.Parser.extend(tsPlugin() as any), TSX = acorn.Parser.extend(tsPlugin({ jsx: true }) as any);
const bare = (src: string, jsx: boolean) => (jsx ? TSX : TS).parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: () => {} } as any);
const inputs = corpus().filter((c) => { try { parse(c.src, { jsx: c.tsx }); return true; } catch { return false; } });
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
const bench = (f: (c: (typeof inputs)[number], i: number) => unknown, rounds = 7) => { inputs.forEach(f); const ts: number[] = []; for (let r = 0; r < rounds; r++) { const t0 = performance.now(); inputs.forEach(f); ts.push(performance.now() - t0); } return median(ts); };
const shapeOfParam = async (copy: string, types: string, ann: string) => {
  const { checkSources } = await import(`${D}${copy}/lite/core.ts`);
  const r = checkSources({ cells: (await Bun.file(types).text()) + `\nexport const take = (p: ${ann}): number => 1;`, tsx: false, outside: [{ name: "p" }] });
  return r.facts.get("take").params[0].boundary.shape;
};
const lazy = await import(`${D}reclazy/lite/boundary.ts`);
const rec = await import(`${D}rec/lite/boundary.ts`), disp = await import(`${D}recdisp/lite/boundary.ts`), orig = await import(`${D}orig/lite/boundary.ts`);
const shapeN = await shapeOfParam("recfix", D + "ast-n.ss.ts", "NParse"), shapeF = await shapeOfParam("orig", D + "../flat-ast/ast-a.ss.ts", "Parse");
const nested = inputs.map((c) => nestParse(c.src, c.tsx)), flat = inputs.map((c) => flatParse(c.src, c.tsx));
const nodes = nested.reduce((s, p: any) => s + p.ast.count, 0);
const fnodes = flat.reduce((s, p: any) => s + p.ast.nodes.length, 0);
console.log(`corpus: ${inputs.length} inputs that parse, ${inputs.reduce((s, c) => s + c.src.length, 0)} chars, ${nodes} nodes (flat rows ${fnodes}); nested shape ${JSON.stringify(shapeN).length} chars of JSON, flat ${JSON.stringify(shapeF).length}`);
const per = (ms: number) => `${ms.toFixed(1).padStart(7)} ms  ${(ms * 1000 / nodes).toFixed(2).padStart(6)} µs/node`;
const realFreeze = Object.freeze;
let round = 0;
const rows: [string, () => number][] = [
  ["bare acorn + TS plugin", () => bench((c) => bare(c.src, c.tsx))],
  ["parse.ts", () => bench((c) => parse(c.src, { jsx: c.tsx }))],
  ["adapter: nestParse (parse + nest)", () => bench((c) => nestParse(c.src, c.tsx))],
  ["flat adapter: flatParse layout A", () => bench((c) => flatParse(c.src, c.tsx))],
  ["nested, rec: checkShape (copy+freeze, memo on)", () => bench((_, i) => rec.checkShape(nested[i], shapeN, "p"))],
  ["nested, rec: memo off", () => { rec.LIMITS.memo = false; try { return bench((_, i) => rec.checkShape(nested[i], shapeN, "p")); } finally { rec.LIMITS.memo = true; } }],
  ["nested, rec: memo on, no freeze", () => { (Object as any).freeze = (x: any) => x; try { return bench((_, i) => rec.checkShape(nested[i], shapeN, "p")); } finally { (Object as any).freeze = realFreeze; } }],
  ["nested, rec: cross() first delivery", () => bench((_, i) => rec.cross(nested[i], shapeN, `take${round++}.p`))],
  ["nested, rec: cross() re-delivery of an equal value", () => bench((_, i) => rec.cross(nested[i], shapeN, `again${i}.p`))],
  ["nested, reclazy (lazy message, no dispatch): checkShape", () => bench((_, i) => lazy.checkShape(nested[i], shapeN, "p"))],
  ["nested, recdisp (tag dispatch): checkShape", () => bench((_, i) => disp.checkShape(nested[i], shapeN, "p"))],
  ["nested, recdisp: cross() first delivery", () => bench((_, i) => disp.cross(nested[i], shapeN, `dtake${round++}.p`))],
  ["nested, recdisp: cross() re-delivery", () => bench((_, i) => disp.cross(nested[i], shapeN, `dagain${i}.p`))],
  ["flat, orig: cross() first delivery", () => bench((_, i) => orig.cross(flat[i], shapeF, `ftake${round++}.p`))],
  ["flat, recdisp: cross() first delivery", () => bench((_, i) => disp.cross(flat[i], shapeF, `fdtake${round++}.p`))],
];
// bun bench.ts <substring>: only the rows whose label holds it
const only = process.argv[2];
const chosen = only ? rows.filter(([l]) => l.includes(only)) : rows;
let out: string[] = [];
for (let pass = 0; pass < 2; pass++) { out = chosen.map(([label, f]) => `${label.padEnd(52)} ${per(f())}`); }
for (const l of out) console.log(l);
// the copies agree: recdisp's copy equals rec's on every input, and both keep every node
const { deepEqual } = await import(`${D}rec/lite/runtime-ss.ts`);
let same = 0; for (let i = 0; i < nested.length; i++) if (deepEqual(rec.checkShape(nested[i], shapeN, "p"), disp.checkShape(nested[i], shapeN, "p"))) same++;
console.log(`rec and recdisp copies equal on ${same} of ${nested.length} inputs`);
