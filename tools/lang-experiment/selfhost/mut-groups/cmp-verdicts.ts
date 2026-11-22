// bun cmp-verdicts.ts <a> <b>: the jobs of out/verdicts.<a>.json and out/verdicts.<b>.json whose result differs, with
// each differing cell (status, rules, messages, lines)
import { readFileSync } from "node:fs";
import { join } from "node:path";
const load = (n: string) => JSON.parse(readFileSync(join(import.meta.dir, `out/verdicts.${n}.json`), "utf8"));
const [a, b] = [load(process.argv[2]!), load(process.argv[3]!)];
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
let diff = 0, cellsA = 0, cellsDiff = 0;
for (const k of keys) {
  const x = a[k], y = b[k];
  cellsA += x?.cells?.length ?? 0;
  if (JSON.stringify(x) === JSON.stringify(y)) continue;
  diff++;
  console.log(`DIFF ${k}`);
  if (!x || !y || !x.cells || !y.cells) { console.log(`  a ${JSON.stringify(x)?.slice(0, 300)}\n  b ${JSON.stringify(y)?.slice(0, 300)}`); continue; }
  if (JSON.stringify(x.module) !== JSON.stringify(y.module)) console.log(`  module a ${JSON.stringify(x.module)} b ${JSON.stringify(y.module)}`);
  const by = new Map(y.cells.map((c: any) => [c.name, c]));
  for (const c of x.cells) { const d = by.get(c.name); if (JSON.stringify(c) !== JSON.stringify(d)) { cellsDiff++; console.log(`  ${c.name}\n    a ${JSON.stringify(c).slice(0, 400)}\n    b ${JSON.stringify(d).slice(0, 400)}`); } }
}
console.log(`${keys.length} jobs, ${cellsA} cells in ${process.argv[2]}: jobs that differ ${diff}, cells that differ ${cellsDiff}`);
