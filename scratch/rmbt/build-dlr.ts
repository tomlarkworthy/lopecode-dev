import { readFileSync, writeFileSync } from "fs";
const k = readFileSync("scratch/rmbt/kernel.js", "utf8").split("\n");
const start = k.findIndex((l) => l.startsWith("const detectLandmarkRow = "));
const bodyAt = k.findIndex((l, i) => i > start && l.trim() === "for (const c of picked) {");
const nmsAt = k.findIndex((l, i) => i > bodyAt && l.includes("non-maximum suppression by coverage"));
let end = nmsAt; while (k[end] !== "};") end++;
const patch = [
  readFileSync("scratch/rmbt/patches/prelude.js", "utf8").trimEnd(),
  ...k.slice(start, bodyAt),
  readFileSync("scratch/rmbt/patches/body-sweep.js", "utf8").trimEnd(),
  ...k.slice(nmsAt - 1, end + 1)
].join("\n");
writeFileSync("scratch/rmbt/patches/detectLandmarkRow.js", patch + "\n");
console.log("detectLandmarkRow patch:", patch.split("\n").length, "lines (head", bodyAt - start, "verbatim)");
