import { readFileSync, writeFileSync } from "node:fs";
const which = process.argv[2];
const tpl = readFileSync(`scratch/rmbt/tmp-adapt/${which}`, "utf8");
for (const a of process.argv.slice(3)) {
  const i = a.indexOf("=");
  const slug = a.slice(0, i);
  const full = { B: 48, qp: 0.5, beta: 0.45, LO: 10, HI: 26, minPeak: 4, minPeaks: 6, win: 1, ...JSON.parse(a.slice(i + 1)) };
  writeFileSync(`scratch/rmbt/tmp-adapt/${slug}.js`, tpl.replace("__CFG__", JSON.stringify(full)));
  console.log(slug, JSON.stringify(full));
}
