import { readFileSync, writeFileSync } from "node:fs";
const tpl = readFileSync("scratch/rmbt/tmp-adapt/template3.js", "utf8");
for (const a of process.argv.slice(2)) {
  const i = a.indexOf("=");
  const full = { Q: 0.75, K: 3, HI: 26, mult: 1.7, samePaper: 0.8, strideMult: 1, minRows2: 0, minMargin2: 0, ...JSON.parse(a.slice(i + 1)) };
  writeFileSync(`scratch/rmbt/tmp-adapt/${a.slice(0, i)}.js`, tpl.replace("__CFG__", JSON.stringify(full)));
  console.log(a.slice(0, i), JSON.stringify(full));
}
