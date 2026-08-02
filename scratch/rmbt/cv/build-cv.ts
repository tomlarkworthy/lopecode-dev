// emit variant files from cv/template.js + a config table
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const T = readFileSync(resolve("scratch/rmbt/cv/template.js"), "utf8");
const DEF = { footMode: "last", footK: 5, split: false, sepFrac: 1.0, seedMinVotes: 2, assignFrac: 0, lloyd: 0, dSplit: false, dValley: 0.45, dPeak: 0.75, dRise: 0.25 };
const configs: Record<string, any> = JSON.parse(readFileSync(resolve(process.argv[2]), "utf8"));
mkdirSync(resolve("scratch/rmbt/cv/out"), { recursive: true });
for (const [name, cfg] of Object.entries(configs)) {
  const full = { ...DEF, ...cfg };
  writeFileSync(resolve("scratch/rmbt/cv/out", name + ".js"), T.replace("__CFG__", JSON.stringify(full)));
  console.log(name, JSON.stringify(full));
}
