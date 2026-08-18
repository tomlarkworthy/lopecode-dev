// One-off: reproduce the transpose "module is not defined" grading failure offline and decide
// whether it is a genuine candidate defect or another synthesis artifact.
import fs from "node:fs";
import { synthesizeCJS, gradeSolution } from "./grade.mjs";
const problems = JSON.parse(fs.readFileSync(new URL("./problems.json", import.meta.url), "utf8"));
const p = problems.find((x) => x.slug === "transpose");
const t = JSON.parse(fs.readFileSync(new URL("./results/trajectories-gate/transpose-2.json", import.meta.url), "utf8"));
const g = gradeSolution(p, t.candidate, { mode: "module" });
console.log("grade:", g.pass ? "PASS" : "FAIL");
console.log(String(g.output).slice(0, 500));
const cjs = synthesizeCJS(t.candidate, p);
console.log("--- occurrences of bare `module` in synthesized program ---");
cjs.split("\n").forEach((l, i) => { if (/\bmodule\b/.test(l)) console.log(i + 1, l.slice(0, 120)); });
