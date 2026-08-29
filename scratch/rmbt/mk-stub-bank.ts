// Does the mount wait on the hexFrameBank VALUE, or just on the module block?
// Stub the import out entirely: if prose then mounts early with the data still
// last in the file, the handle design is the right fix.
import { readFileSync, writeFileSync } from "node:fs";
const h = readFileSync("scratch/rmbt/after.html", "utf8");
const OLD = `main.define("hexFrameBank", ["module @tomlarkworthy/coded-landmark-tracking-data", "@variable"], (_, v) => v.import("hexFrameBank", _));`;
if (h.split(OLD).length - 1 !== 1) throw new Error("import line not unique");
writeFileSync("scratch/rmbt/exp-stub-bank.html",
  h.replace(OLD, `main.define("hexFrameBank", [], () => new Map()); // STUB for measurement only`));
console.log("hexFrameBank stubbed");
