// One-off: why does the word-search candidate grade as "WordSearch is not a constructor"
// when the cell returns a class? Inspect the synthesized CJS export wiring.
import fs from "node:fs";
import { synthesizeCJS } from "./grade.mjs";
const problems = JSON.parse(fs.readFileSync(new URL("./problems.json", import.meta.url), "utf8"));
const p = problems.find((x) => x.slug === "word-search");
console.log("exports:", JSON.stringify(p.exports), "defaultExport:", JSON.stringify(p.defaultExport));
console.log("solutionFile:", p.solutionFile, "testFile:", p.testFile);
const t = JSON.parse(fs.readFileSync(new URL("./results/trajectories/word-search-1.json", import.meta.url), "utf8"));
const cjs = synthesizeCJS(t.candidate, p);
console.log("--- synthesized tail ---");
console.log(cjs.slice(-700));
console.log("--- spec import lines ---");
console.log(p.spec.split("\n").filter((l) => l.includes("import") || l.includes("require")).join("\n"));
