import { readFileSync, writeFileSync } from "fs";
const h = readFileSync("scratch/rmbt/exp-stub-bank.html", "utf8");
const MOD = `main.define("module @tomlarkworthy/coded-landmark-tracking-data", async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default));`;
if (!h.includes(MOD)) throw new Error("module define line not found");
writeFileSync("scratch/rmbt/exp-stub-bank2.html", h.replace(MOD, `// STUB: data module import removed for measurement`));
console.log("ok");
