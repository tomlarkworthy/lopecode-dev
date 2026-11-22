// bun m2-diff.ts a.json b.json: cells ok in a and not in b, grouped by b's first error rule; status counts
import { readFileSync } from "node:fs";
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, "utf8")).filter((x: any) => x.cell));
const key = (c: any) => `${c.unit}|${c.cell}`, A = new Map(a.map((c: any) => [key(c), c]));
const by = new Map<string, any[]>();
for (const c of b) { const o: any = A.get(key(c)); if (!o || o.status !== "ok" || c.status === "ok") continue; const r = c.errors.length ? c.errors[0].split(":")[0] : c.status; (by.get(r) ?? by.set(r, []).get(r)!).push(c); }
console.log(`ok ${a.filter((c: any) => c.status === "ok").length} -> ${b.filter((c: any) => c.status === "ok").length}`);
for (const [r, cs] of [...by].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`  ${r}: ${cs.length}`);
  for (const c of cs.slice(0, Number(process.env.EX ?? 3))) console.log(`     ${c.unit} ${c.cell}: ${c.errors[0] ?? c.status}`);
}
