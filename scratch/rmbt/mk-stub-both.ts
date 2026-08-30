import { readFileSync, writeFileSync } from "fs";
let h = readFileSync("scratch/rmbt/after.html", "utf8");
const subs: [string, string][] = [
  [`main.define("hexFrameBank", ["module @tomlarkworthy/coded-landmark-tracking-data", "@variable"], (_, v) => v.import("hexFrameBank", _));`,
   `main.define("hexFrameBank", [], () => new Map()); // STUB`],
  [`main.define("module @tomlarkworthy/coded-landmark-tracking-data", async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default));`,
   `// STUB: data module import removed`],
  [`main.define("toolchain", ["module @tomlarkworthy/assembly-script", "@variable"], (_, v) => v.import("toolchain", _));`,
   `main.define("toolchain", [], () => null); // STUB`],
];
for (const [a, b] of subs) { if (!h.includes(a)) throw new Error("not found: " + a.slice(0, 60)); h = h.replace(a, b); }
const modRe = /main\.define\("module @tomlarkworthy\/assembly-script", async \(\) => runtime\.module\(\(await import\("[^"]+"\)\)\.default\)\);/;
if (!modRe.test(h)) throw new Error("assembly-script module define not found");
h = h.replace(modRe, `// STUB: assembly-script module import removed`);
writeFileSync("scratch/rmbt/exp-stub-both.html", h);
console.log("ok");
