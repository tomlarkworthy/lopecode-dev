import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js", {
  overrides: { md: (s: any) => String(s), Inputs: {}, html: () => {}, Generators: {}, invalidation: new Promise(() => {}) }
});
const genRun: any = await m.value("genRun");
const tot: Record<string, number> = {};
for (let seed = 1; seed <= 200; seed++) {
  const run = genRun({ seed, galaxy: 2, jumps: 7 });
  for (const n of run.nodes) tot[n.kind] = (tot[n.kind] ?? 0) + 1;
}
const n = Object.values(tot).reduce((a, b) => a + b, 0);
console.log(Object.entries(tot).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${(100 * v / n).toFixed(1)}%`).join("  "), `(${n} nodes / 200 runs)`);
const r41 = genRun({ seed: 41, galaxy: 2, jumps: 7 });
console.log("seed 41:", r41.nodes.map((x: any) => x.kind).join(","));
