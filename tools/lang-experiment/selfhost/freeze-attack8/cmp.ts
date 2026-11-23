// bun cmp.ts <a.txt> <b.txt> [c.txt]: rows of two or three mode runs side by side (mode files from run.ts)
import { readFileSync } from "node:fs";
const load = (f: string) => new Map(readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("ROW ")).map((l) => JSON.parse(l.slice(4))).map((r: any) => [r.name, r]));
const files = process.argv.slice(2);
const ms = files.map(load);
const o = (x: any) => (x === null ? "-" : `${x.silent ? "SILENT" : "quiet"}/${x.cls}`);
for (const [n, r] of ms[0]!) {
  const cols = ms.map((m) => { const x = m.get(n); return x ? `chk ${o(x.chk)} skip ${o(x.skip)}` : "missing"; });
  console.log(`${n}\tacc=${r.acc ? 1 : 0} base=${r.base === null ? "-" : r.base ? 1 : 0}${r.ctl ? " CTL" : ""}\t${cols.join("\t| ")}`);
}
