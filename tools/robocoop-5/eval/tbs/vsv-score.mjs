// Per-target score for variable-star-vetting: the verifier asserts on the first mismatch, so a
// FAIL says nothing about how close an arm was. Usage: node vsv-score.mjs [run ...]
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { TBS_ROOT } from "./tasks.mjs";
const GT = TBS_ROOT + "/tasks/physical-sciences/astronomy/variable-star-vetting/tests/gt.csv";
const parse = (t) => t.trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
const gt = new Map(parse(readFileSync(GT, "utf8")).map((r) => [r[0].trim(), { c: r[2].trim(), p: +r[3] }]));
const runs = process.argv.length > 2 ? process.argv.slice(2)
  : readdirSync("sandbox").filter((d) => d.endsWith("-variable-star-vetting")).map((d) => d.replace(/-variable-star-vetting$/, ""));
for (const run of runs) {
  const f = `sandbox/${run}-variable-star-vetting/variable-star-vetting/root/results/output.csv`;
  if (!existsSync(f)) continue;
  let n = 0, cls = 0, per = 0, cstT = 0, cstP = 0, varOK = 0;
  for (const r of parse(readFileSync(f, "utf8"))) {
    const g = gt.get(r[0].trim()); if (!g) continue;
    n++; const c = r[1].trim(), p = +r[2];
    if (g.c === "CST") cstT++; if (c === "CST") cstP++; if (c === g.c) cls++;
    const pok = g.p === 0 ? p === 0 : Math.abs(p - g.p) / g.p <= 0.02;
    if (pok) per++; if (g.c !== "CST" && c === g.c && pok) varOK++;
  }
  console.log(`${run.padEnd(24)} n=${n} class=${cls} period=${per} CST pred/true=${cstP}/${cstT} variables fully right=${varOK}/${n - cstT}`);
}
