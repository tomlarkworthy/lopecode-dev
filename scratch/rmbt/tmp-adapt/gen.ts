// gen.ts '<slug>={json cfg}' ... -> writes scratch/rmbt/tmp-adapt/<slug>.js
import { readFileSync, writeFileSync } from "node:fs";
const tpl = readFileSync("scratch/rmbt/tmp-adapt/template.js", "utf8");
for (const a of process.argv.slice(2)) {
  const i = a.indexOf("=");
  const slug = a.slice(0, i);
  const cfg = JSON.parse(a.slice(i + 1));
  const full = { blockPx: 0, q: 0.9, K: 2.4, B: 0, LO: 6, HI: 30, smooth: false, ...cfg };
  writeFileSync(`scratch/rmbt/tmp-adapt/${slug}.js`, tpl.replace("__CFG__", JSON.stringify(full)));
  console.log(slug, JSON.stringify(full));
}
