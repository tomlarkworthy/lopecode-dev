import { readFileSync, writeFileSync } from "fs";
let h = readFileSync("scratch/rmbt/after.html", "utf8");
const MOD = `main.define("module @tomlarkworthy/coded-landmark-tracking-data", async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default));`;
const IMP = `main.define("hexFrameBank", ["module @tomlarkworthy/coded-landmark-tracking-data", "@variable"], (_, v) => v.import("hexFrameBank", _));`;
for (const s of [MOD, IMP]) if (!h.includes(s)) throw new Error("not found: " + s.slice(0, 50));
h = h.replace(MOD, `// lazy: data module imported inside the hexFrameBank cell`);
h = h.replace(IMP, `main.define("hexFrameBank", [], async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default).value("hexFrameBank"));`);
writeFileSync("scratch/rmbt/exp-lazy-bank.html", h);
console.log("ok");
